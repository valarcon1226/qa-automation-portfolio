import base64
import glob
import os
import subprocess
import tempfile
import sys
import json
import time
import re
import textwrap
from enum import Enum
from pathlib import Path
from typing import List, Optional

import yt_dlp
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from tools import (
    extract_video_id,
    fetch_transcript,
    get_full_metadata,
    search_youtube,
    looks_like_youtube_url
)

# Force UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# ─── Configuration ───────────────────────────────────────────────────────────
RESULTS_DIR = "Results"
CACHE_DIR = ".cache"
MAX_CHARS_PER_CHUNK = 800000  # Leave room for prompts in 1M token window
# Phase 1 skips content when given a long transcript at once; ~5 min of speech per call keeps extraction complete
EXTRACT_CHUNK_CHARS = 20000

token_usage = {"input": 0, "output": 0, "calls": 0}

# ─── Pydantic Schemas ────────────────────────────────────────────────────────
class Fact(BaseModel):
    category: str = Field(description="Category of the fact (e.g., 'concept', 'tool', 'data', 'opinion')")
    content: str = Field(description="The actual factual statement or information")
    urls_or_commands: List[str] = Field(description="Any URLs, paths, or code commands mentioned in this fact", default_factory=list)

class ExtractedFacts(BaseModel):
    facts: List[Fact] = Field(description="List of all extracted facts")

# Each value is also the folder name inside Results/. Add or rename categories here.
class Category(str, Enum):
    GITHUB = "Herramientas de GitHub"
    SIDE_HUSTLES = "Side Hustles con IA"
    AGENTS = "Agentes y Automatizacion IA"
    LOCAL_AI = "IA Local y Gratis"
    APPS = "Apps y Software"
    LEARNING = "Aprendizaje y Productividad"
    BUSINESS = "Negocios y Emprendimiento"
    LIFESTYLE = "Estilo de Vida"
    OTHER = "Otros"

class Classification(BaseModel):
    category: Category = Field(description="The single category that best describes the video's main content")

class ValidatedFact(BaseModel):
    original_fact: str = Field(description="The factual sentence as written in the generated document")
    is_hallucinated: bool = Field(description="True if the fact is completely missing from the transcript or factually incorrect based on the transcript")
    correction: Optional[str] = Field(None, description="Corrected fact if it was hallucinated, or null")

class ValidationReport(BaseModel):
    validated_facts: List[ValidatedFact]

# ─── Utility Functions ───────────────────────────────────────────────────────
def sanitize_filename(name: str) -> str:
    return re.sub(r'[\\/*?:"<>|]', "", name).strip()

def detect_language(text: str) -> str:
    text = text.lower()
    es_words = {" el ", " la ", " los ", " en ", " un ", " una ", " que ", " es "}
    en_words = {" the ", " in ", " a ", " an ", " is ", " that ", " for ", " on "}
    es_count = sum(text.count(w) for w in es_words)
    en_count = sum(text.count(w) for w in en_words)
    return "español" if es_count > en_count * 1.5 else "inglés" if en_count > es_count * 1.5 else "mixto (español/inglés)"

# ─── LLM: jobHunter's shared provider chain ─────────────────────────────────
# Same Gemini -> Groq -> OpenRouter chain as jobHunter, with its 24h rolling budget kept in jobHunter's
# jobs.db. Both projects use the same API keys, so sharing that db stops either one from burning the
# quota the other is counting on. Set JOBHUNTER_DIR if jobHunter isn't a sibling folder.
JOBHUNTER_DIR = os.environ.get("JOBHUNTER_DIR") or next(
    (d for d in (os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", n) for n in ("jobHunter", "jobhunter"))
     if os.path.isdir(d)), "")
if not os.path.isfile(os.path.join(JOBHUNTER_DIR, "llm_chain.py")):
    raise SystemExit("[ERROR] No se encontro jobHunter/llm_chain.py. Define JOBHUNTER_DIR con su ruta.")
# Ollama is left out on purpose: its 4096-token context would silently cut ~5k-token transcript chunks.
# Must be set before importing llm_chain (its load_dotenv doesn't override existing variables).
os.environ["OLLAMA_MODEL"] = ""
# Transcripts are public, so NVIDIA (logs prompts) and Mistral free (trains on them) are fine here
os.environ["LLM_ALLOW_LOGGED_PROVIDERS"] = "1"
sys.path.insert(0, JOBHUNTER_DIR)
import llm_chain  # noqa: E402

SYSTEM_PROMPT = "Eres un asistente preciso que procesa transcripciones de video. Nunca inventas informacion."

def call_llm(prompt: str, *, response_schema=None):
    # The prompt goes in as a variable: transcripts may contain { } that a template would choke on
    variables = {"prompt": prompt}
    failures_with_budget = 0
    while True:
        try:
            if response_schema:
                result = llm_chain.invoke_structured(SYSTEM_PROMPT, "{prompt}", variables, response_schema, allow_local=False)
            else:
                result = llm_chain.invoke_text(SYSTEM_PROMPT, "{prompt}", variables, temperature=0.1)
        except llm_chain.AllProvidersExhausted as e:
            budget_wait = llm_chain.seconds_until_any_slot()
            if budget_wait == 0:
                # Budget says there is quota, yet every provider failed: a real error, not just quota
                failures_with_budget += 1
                if failures_with_budget >= 6:
                    raise
            # Wait for quota instead of failing; at least 10 min so real 429s get time to clear
            wait = max(budget_wait, 600)
            print(f"       [ESPERA] Ningun proveedor disponible, reintentando en {wait / 60:.0f} min ({str(e)[:100]})")
            time.sleep(wait)
            continue

        # ponytail: a text answer cut by the output limit isn't detectable through llm_chain; docs run ~5-15KB, far below it
        if not result:  # empty text, or a structured parse that came back as None (e.g. truncated JSON)
            raise ValueError("Respuesta vacia o JSON incompleto del modelo")
        token_usage["calls"] += 1
        token_usage["input"] += len(prompt) // 4
        token_usage["output"] += len(str(result)) // 4
        return result

# ─── Watching the video: frames + vision model, Whisper when there are no captions ──
# Same idea as the /watch skill (claude-video): download the video, cut frames with ffmpeg and have a
# vision model read them, so the report also gets what is on screen but never said aloud (code,
# commands, URLs, slides, diagrams). Written here instead of calling the plugin: its ffmpeg call
# uses -vsync, which ffmpeg 9 removed, and the project shouldn't depend on Claude's plugin folder.
MAX_FRAMES = 80  # per video; near-identical frames are dropped first (mpdecimate)
# (budget name in llm_chain, provider, model, frames per call). Gemini takes 40 images per request
# (75 in one timed out; 20 requests/day per model); OpenRouter's free vision model ~10 in 20 s.
VISION_MODELS = [
    ("Gemini", "gemini", "gemini-3.6-flash", 40),
    ("Gemini-3.8", "gemini", "gemini-3.8-flash", 40),
    ("Gemini-3.7", "gemini", "gemini-3.7-flash", 40),
    ("Gemini-3.5", "gemini", "gemini-3.5-flash", 40),
    ("OpenRouter", "openrouter", "nvidia/nemotron-3.5-super-vl:free", 10),
]

VISUAL_PROMPT = """Estas imagenes son fotogramas de un video, cada una precedida por su minuto [mm:ss].
Anota SOLO lo que se lee o se ve en pantalla y aporta informacion: codigo, comandos, URLs, nombres de
herramientas o menus en la interfaz, texto de diapositivas, diagramas, tablas y numeros de graficos.
Una linea por elemento: [mm:ss] descripcion, usando el minuto exacto de la imagen.
Copia el texto de pantalla tal cual (codigo y URLs exactos). No repitas una pantalla que no cambio,
no describas personas ni el fondo, y no inventes nada que no se lea en la imagen.
Si en ninguna imagen hay nada util, responde exactamente: SIN CONTENIDO VISUAL"""


def download_video(video_id: str, work: Path) -> Path:
    # 480p is enough to read on-screen code at the 768 px the frames are cut to
    opts = {"quiet": True, "no_warnings": True, "outtmpl": str(work / "video.%(ext)s"),
            "format": "bv*[height<=480]+ba/b[height<=480]/b", "merge_output_format": "mp4"}
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([f"https://www.youtube.com/watch?v={video_id}"])
    return next(work.glob("video.*"))


def extract_frames(video: Path, work: Path, duration: int) -> list:
    """[(second, jpg)]: one frame every `every` seconds, minus the ones identical to the previous."""
    every = max(3, round(duration / MAX_FRAMES)) if duration else 5
    # fps=1/every gives frame number n the timestamp n*every; -frame_pts names each file by that number
    subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(video),
                    "-vf", f"fps=1/{every},mpdecimate,scale=768:-2", "-fps_mode", "vfr",
                    "-frame_pts", "1", "-q:v", "5", str(work / "%d.jpg")], check=True)
    return sorted((int(p.stem) * every, p) for p in work.glob("*.jpg"))


def whisper_transcript(video: Path, work: Path) -> str:
    """Spoken text via Groq Whisper (free, GROQ_API_KEY). Audio is public video audio sent to Groq."""
    from groq import Groq
    # 32 kbps mono: Groq's 25 MB limit is ~100 min, so 20-min pieces stay well under it
    subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(video), "-vn", "-ac", "1", "-ar", "16000",
                    "-b:a", "32k", "-f", "segment", "-segment_time", "1200", str(work / "audio%03d.mp3")],
                   check=True)
    client = Groq()
    return " ".join(client.audio.transcriptions.create(file=(p.name, p.read_bytes()),
                                                       model="whisper-large-v3-turbo").text
                    for p in sorted(work.glob("audio*.mp3")))


def _vision_llm(provider: str, model: str):
    if provider == "gemini":
        llm = llm_chain._gemini(model)
        if llm:
            llm.timeout = 180  # llm_chain's 45 s is for text; 80 images take longer
        return llm
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    return ChatOpenAI(model=model, base_url="https://openrouter.ai/api/v1", api_key=key,
                      temperature=0.1, timeout=180) if key else None


def describe_frames(frames: list) -> str | None:
    """On-screen notes; "" if nothing useful is on screen, None if no vision model had quota."""
    for budget_name, provider, model, per_call in VISION_MODELS:
        if not llm_chain._budget_available(budget_name):
            continue
        llm = _vision_llm(provider, model)
        if llm is None:
            continue
        notes, failed = [], False
        for i in range(0, len(frames), per_call):
            parts = [{"type": "text", "text": VISUAL_PROMPT}]
            for sec, path in frames[i:i + per_call]:
                parts.append({"type": "text", "text": f"[{sec // 60:02d}:{sec % 60:02d}]"})
                parts.append({"type": "image_url", "image_url": {
                    "url": "data:image/jpeg;base64," + base64.b64encode(path.read_bytes()).decode()}})
            llm_chain._pace(budget_name)
            try:
                res = llm.invoke([HumanMessage(content=parts)])
            except Exception as e:
                msg = f"{type(e).__name__}: {str(e)[:160]}"
                if llm_chain._is_quota_error(e) or re.search(r"deadline|timed out|unavailable|50[34]", str(e).lower()):
                    # Out of quota or overloaded: same 15-min cooldown as llm_chain, next model starts over
                    llm_chain._cooldown_until[budget_name] = time.time() + llm_chain.QUOTA_COOLDOWN_SECONDS
                    print(f"       [FALLBACK] {model} sin cupo o saturado ({msg})")
                    failed = True
                    break
                # One rejected group (e.g. NVIDIA's content-safety filter) only loses those frames
                print(f"       [SKIP] {model} rechazo los fotogramas {i + 1}-{i + per_call} ({msg})")
                continue
            llm_chain._record_usage(budget_name, tokens=(res.usage_metadata or {}).get("total_tokens", 0))
            token_usage["calls"] += 1
            notes.append(llm_chain._content_to_text(res.content).strip())
        if failed:
            continue
        text = "\n".join(n for n in notes if "SIN CONTENIDO VISUAL" not in n)
        print(f"       [OK] {model}: {len(text.splitlines())} notas de pantalla")
        return text
    print("       [WARN] Ningun modelo de vision con cupo: se sigue solo con la transcripcion")
    return None


def watch_video(video_id: str, duration: int, need_transcript: bool) -> tuple:
    """(on-screen notes or None, Whisper transcript or ""). Video and frames live in a temp dir."""
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        video = download_video(video_id, work)
        spoken = ""
        if need_transcript:
            print("       Transcribiendo el audio con Whisper (Groq)...")
            spoken = whisper_transcript(video, work)
        frames = extract_frames(video, work, duration)
        print(f"       {len(frames)} fotogramas distintos")
        return describe_frames(frames), spoken


# ─── Phases ──────────────────────────────────────────────────────────────────
def phase1_extract(transcript: str, title: str) -> ExtractedFacts:
    prompt = f"""
Eres un extractor de información factual de alta precisión.
Tu tarea es extraer TODOS los hechos, conceptos, herramientas y datos del siguiente fragmento de video.
Recorre el fragmento de principio a fin, sin saltarte ninguna parte:
- Cada herramienta, repositorio, app, producto o recurso mencionado es un hecho propio, con su proposito.
- Cada idea, paso, dato concreto (numeros, precios, metricas) y opinion del autor es un hecho propio.
- No agrupes varias herramientas o ideas en un solo hecho, y no resumas.
NO inventes información. Si hay URLs, rutas o comandos, cópialos exactamente.

VIDEO TITLE: {title}
TRANSCRIPT:
{transcript}
"""
    return call_llm(prompt, response_schema=ExtractedFacts)

def phase2_deduplicate(facts: List[Fact]) -> List[Fact]:
    prompt = "Deduplica la siguiente lista de hechos y devuélvelos consolidados en JSON.\n\n"
    prompt += "\n".join(f"- [{f.category}] {f.content} (URLs/cmds: {f.urls_or_commands})" for f in facts)
    res = call_llm(prompt, response_schema=ExtractedFacts)
    return res.facts if hasattr(res, 'facts') else facts

def phase3_synthesize(facts: List[Fact], title: str, channel: str, duration: int, lang: str) -> str:
    facts_text = "\n".join(f"- [{f.category}] {f.content} (URLs/cmds: {f.urls_or_commands})" for f in facts)
    dur_str = f"{duration // 60}:{duration % 60:02d}"
    prompt = f"""
Escribe un documento Markdown denso y estructurado resumiendo el video.
El idioma del documento DEBE SER: {lang}

Title: {title}
Channel: {channel}
Duration: {dur_str}

Use ONLY the following facts. DO NOT add outside information.
{facts_text}

STRUCTURE REQUIRED:
# {title}
> Source: YouTube | Channel: {channel} | Duration: {dur_str}

## TL;DR
(A dense 1-2 paragraph summary)

(Then dynamically include these sections ONLY if there are facts for them:)
## Key Concepts
## Tools & Technologies (use a table with Name, Purpose, URL)
## Workflow / Steps
## Commands & Code
## Concrete Data
## Author's Opinions
## Mentioned Resources
"""
    return call_llm(prompt)

def phase4_validate(document: str, transcript: str) -> str:
    urls = re.findall(r'(https?://[^\s)\]]+)', document)
    cmds = re.findall(r'`([^`]+)`', document)
    
    suspicious = []
    for url in urls:
        if url.lower() not in transcript.lower():
            suspicious.append(f"URL no encontrada en transcript: {url}")
            
    for cmd in cmds:
        if len(cmd) > 5 and cmd.lower() not in transcript.lower() and "```" not in cmd:
            suspicious.append(f"Codigo/Comando sospechoso: `{cmd}`")

    # The header (title, channel, duration) comes from YouTube metadata, not the transcript: keep it out of the audit
    lines = document.split('\n')
    n_header = 0
    while n_header < len(lines) and (lines[n_header].startswith(('# ', '> ')) or not lines[n_header].strip()):
        n_header += 1
    header, body = '\n'.join(lines[:n_header]), '\n'.join(lines[n_header:])

    prompt = f"""
Revisa el siguiente documento generado a partir del transcript.
Identifica si hay alguna "alucinación" (afirmaciones, datos, herramientas o URLs que NO están en el transcript).
Devuelve un reporte en JSON.

TRANSCRIPT:
{transcript[:MAX_CHARS_PER_CHUNK]}

DOCUMENTO A REVISAR:
{body}
"""
    try:
        report = call_llm(prompt, response_schema=ValidationReport)

        final_body = body
        hallucinations_found = False
        if hasattr(report, 'validated_facts'):
            for vf in report.validated_facts:
                # Very short fragments would match (and delete) unrelated lines
                if vf.is_hallucinated and len(vf.original_fact.strip()) >= 10 and vf.original_fact in final_body:
                    hallucinations_found = True
                    if vf.correction:
                        print(f"       [FIX] '{vf.original_fact[:80]}' -> '{vf.correction[:80]}'")
                        final_body = final_body.replace(vf.original_fact, vf.correction)
                    else:
                        print(f"       [DEL] '{vf.original_fact[:80]}'")
                        final_body = '\n'.join(l for l in final_body.split('\n') if vf.original_fact not in l)
        final_doc = f"{header}\n{final_body}" if header else final_body
        
        if suspicious:
            print(f"       [WARN] Regex Safety Net activado: {len(suspicious)} elementos no encontrados en transcript original.")
            for s in suspicious:
                print(f"              - {s}")
                
        if hallucinations_found:
            print("       [OK] Documento corregido mediante LLM Audit (se eliminaron alucinaciones).")
        else:
            print("       [OK] Cero alucinaciones detectadas por LLM.")
            
        return final_doc

    except Exception as e:
        print(f"       [ERROR] Error en validacion: {e}")
        return document

def classify(title: str, document: str) -> Category:
    prompt = f"""
Clasifica este video en UNA categoria segun su contenido principal.
Si es una lista de repositorios o proyectos de GitHub, usa "{Category.GITHUB.value}".
Si ninguna categoria encaja bien, usa "{Category.OTHER.value}".

VIDEO TITLE: {title}
RESUMEN:
{document[:6000]}
"""
    try:
        return call_llm(prompt, response_schema=Classification).category
    except Exception as e:
        # Classification is a convenience: never lose the document over it
        print(f"       [WARN] No se pudo clasificar ({e}), usando '{Category.OTHER.value}'")
        return Category.OTHER

# ─── Caching ─────────────────────────────────────────────────────────────────
def get_cache(video_id: str) -> dict | None:
    path = os.path.join(CACHE_DIR, f"{video_id}.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None

def save_cache(video_id: str, data: dict):
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = os.path.join(CACHE_DIR, f"{video_id}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ─── Main ────────────────────────────────────────────────────────────────────
def main():
    print("=" * 65)
    print("  YouTube Knowledge Extractor v2.1")
    print("  Powered by Gemini - Transferencia de Conocimiento a IA")
    print("=" * 65)

    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        print(f"\nEntrada CLI: {query}")
    else:
        query = input("\nURL del video de YouTube o termino de busqueda: ").strip()

    if not query:
        print("[ERROR] Entrada no valida.")
        return

    if looks_like_youtube_url(query):
        video_id = extract_video_id.invoke(query)
        url = query
    else:
        print(f"\n[INFO] Buscando en YouTube: '{query}'...")
        results = search_youtube.invoke(query)
        if not results or "error" in results[0]:
            print("[ERROR] No se encontraron resultados o hubo un error en la busqueda.")
            return
        url = results[0]["url"]
        print(f"       Mejor coincidencia: {results[0]['title']}")
        print(f"       URL: {url}")
        video_id = extract_video_id.invoke(url)

    if "Error" in video_id:
        print(f"[ERROR] {video_id}")
        return

    cached_data = get_cache(video_id) or {}
    if cached_data:
        print("\n[INFO] Usando datos en cache para este video...")
        metadata = cached_data["metadata"]
        transcript = cached_data["transcript"]
    else:
        print("\n[INFO] Obteniendo informacion del video...")
        metadata = get_full_metadata.invoke(url)
        if "error" in metadata:
            print(f"[ERROR] Error obteniendo metadata: {metadata['error']}")
            return

        print("\n[INFO] Obteniendo transcripcion...")
        transcript = fetch_transcript.invoke({"video_id": video_id})
        if "Error" in transcript:
            print(f"       {transcript} Se transcribira el audio con Whisper.")
            transcript = ""

    title = metadata.get("title", f"Video_{video_id}")
    channel = metadata.get("channel", "Unknown")
    duration = metadata.get("duration", 0)

    # The notes are cached once seen ("" = nothing on screen); None (no vision quota) is retried next run
    visual = cached_data.get("visual")
    if visual is None or not transcript:
        print("\n[INFO] Viendo el video (fotogramas + modelo de vision)...")
        try:
            seen, spoken = watch_video(video_id, duration, need_transcript=not transcript)
        except Exception as e:  # download/ffmpeg/Whisper failure: keep going with what we have
            print(f"       [WARN] No se pudo ver el video: {type(e).__name__}: {str(e)[:200]}")
            seen, spoken = None, ""
        visual = seen if visual is None else visual
        transcript = transcript or spoken
    if not transcript:
        print("[ERROR] El video no tiene subtitulos y no se pudo transcribir el audio.")
        return
    save_cache(video_id, {"metadata": metadata, "transcript": transcript,
                          **({"visual": visual} if visual is not None else {})})
    visual = visual or ""

    print(f"       Titulo: {title}")
    print(f"       Canal: {channel}")
    if duration:
        print(f"       Duracion: {duration // 60}:{duration % 60:02d}")

    lang = detect_language(transcript)
    print(f"       Idioma: {lang}")
    print(f"       Caracteres: {len(transcript):,}")

    t0 = time.time()

    print("\n[INFO] Conectando con Gemini...")

    chunks = textwrap.wrap(transcript, EXTRACT_CHUNK_CHARS, break_long_words=False, break_on_hyphens=False) or [transcript]
    if len(chunks) > 1:
        print(f"       Transcript dividido en {len(chunks)} partes para no omitir contenido")
    # On-screen notes go through the same extraction as one more chunk; phase 4 checks against both sources
    source = transcript
    if visual:
        chunks.append(f"NOTAS VISUALES (lo que aparece en pantalla, con su minuto):\n{visual}")
        source = f"{transcript}\n\nNOTAS VISUALES (en pantalla):\n{visual}"

    print("\n--- FASE 1/4: Extraccion Factual (JSON) ---")
    all_facts = []
    for i, chunk in enumerate(chunks):
        if len(chunks) > 1:
            print(f"       Procesando chunk {i+1}/{len(chunks)}...")
        res = phase1_extract(chunk, title)
        if hasattr(res, 'facts'):
            all_facts.extend(res.facts)
        elif isinstance(res, dict) and 'facts' in res:
             all_facts.extend([Fact(**f) for f in res['facts']])
    
    print(f"       [OK] Extraidos {len(all_facts)} hechos/conceptos atomicos.")

    if len(chunks) > 1:
        print("\n--- FASE 2/4: Deduplicacion ---")
        all_facts = phase2_deduplicate(all_facts)
        print(f"       [OK] Quedan {len(all_facts)} hechos tras deduplicar.")
    else:
        print("\n--- FASE 2/4: Deduplicacion ---")
        print("       Un solo bloque - saltando deduplicacion")

    print("\n--- FASE 3/4: Sintesis Estructurada ---")
    document = phase3_synthesize(all_facts, title, channel, duration, lang)

    print("\n--- FASE 4/4: Validacion Anti-Alucinacion (LLM + Regex) ---")
    final_doc = phase4_validate(document, source)

    print("\n--- Clasificacion de contenido ---")
    category = classify(title, final_doc)
    print(f"       [OK] Categoria: {category.value}")
    final_doc = f"---\ncategory: {category.value}\nvideo_id: {video_id}\n---\n\n{final_doc}"

    elapsed = time.time() - t0

    safe_title = sanitize_filename(title)
    out_dir = os.path.join(RESULTS_DIR, category.value)
    os.makedirs(out_dir, exist_ok=True)

    # Remove copies of this video elsewhere in Results (old flat layout, or a previous category)
    for name in (f"{safe_title}.md", f"{safe_title}_transcript.txt"):
        for old in Path(RESULTS_DIR).rglob(glob.escape(name)):
            if old.parent != Path(out_dir):
                old.unlink()

    doc_path = os.path.join(out_dir, f"{safe_title}.md")
    with open(doc_path, "w", encoding="utf-8") as f:
        f.write(final_doc)

    transcript_path = os.path.join(out_dir, f"{safe_title}_transcript.txt")
    with open(transcript_path, "w", encoding="utf-8") as f:
        f.write(source)

    print(f"\n{'=' * 65}")
    print(f"  [OK] Documento de conocimiento v2.1 generado")
    print(f"  Documento:     {doc_path}")
    print(f"  Transcripcion: {transcript_path}")
    print(f"  Tiempo:        {elapsed:.0f}s ({elapsed / 60:.1f} min)")
    total_tokens = token_usage['input'] + token_usage['output']
    print(f"  Tokens aprox.: {total_tokens:,} total ({token_usage['input']:,} in / {token_usage['output']:,} out)")
    print(f"  Llamadas API:  {token_usage['calls']} (proveedores gratis, cupo compartido con jobHunter)")
    print(f"{'=' * 65}")

if __name__ == "__main__":
    main()
