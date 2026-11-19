import os
import re
import subprocess
import requests
from langchain_core.tools import tool
from .edge_fetchers import EDGE, StealthySession
from .markdown_utils import html_to_markdown

def _profile():
    # Para permitir autenticación manual (ej. Linkedin/Coursera), guardamos sesión en un perfil
    return os.path.join(os.getcwd(), "edge_profile")

def _session():
    # Edge con evasión anti-bot; reutiliza las cookies que dejó tool_handle_auth
    return StealthySession(user_data_dir=_profile())

def _collect_links(page, a_tags, links, seen):
    for a in a_tags:
        raw = a.attrib.get("href")
        if not raw:
            continue
        href = page.urljoin(str(raw))
        if href.startswith("http") and href not in seen:
            seen.add(href)
            links.append({"url": href, "title": a.get_all_text(strip=True)})

@tool
def tool_handle_auth(url: str) -> str:
    """
    Opens the provided URL in the browser and waits for the user to manually log in.
    Use this tool IF the user indicates the page requires authentication (e.g., Coursera, LinkedIn).
    """
    print(f"\n[Agent] Ejecutando tool_handle_auth en {url}...")
    if not url.startswith(("http://", "https://")):
        return "Error en la autenticación: la URL debe empezar con http:// o https://"
    try:
        # Edge normal (sin flags de automatización) para que Google no marque el login como 'no seguro'.
        # Mismo perfil, así que las sesiones automatizadas reutilizan sus cookies después.
        print(">>> POR FAVOR INICIA SESIÓN EN LA VENTANA DE EDGE y CIERRA esa ventana al terminar...")
        subprocess.run([EDGE, f"--user-data-dir={_profile()}", "--no-first-run", url])
        return "Autenticación exitosa. Las cookies han sido guardadas."
    except Exception as e:
        return f"Error en la autenticación: {e}"

@tool
def tool_analyze_structure(url: str) -> str:
    """
    Analyzes the structure of the webpage and returns the main headings and sections.
    Use this tool FIRST to understand what sections are available on the page.
    """
    print(f"\n[Agent] Ejecutando tool_analyze_structure en {url}...")
    try:
        with _session() as session:
            page = session.fetch(url, network_idle=True)

        structure = []
        for h in page.css("h1, h2, h3"):
            text = h.get_all_text(strip=True)
            if text:
                structure.append(f"- [{h.tag}] {text}")

        if not structure:
            return "No se encontraron encabezados claros. La página podría ser dinámica o requerir scroll."

        return "Estructura de la página encontrada:\n" + "\n".join(structure[:20]) # Limit to 20
    except Exception as e:
        return f"Error analizando la estructura: {e}"

@tool
def tool_scrape_content(url: str, sections_to_extract: str) -> str:
    """
    Scrapes links and content from specific sections of the webpage.
    Pass the exact names of the sections to extract (comma separated) in 'sections_to_extract'.
    If sections_to_extract is 'ALL', it will scrape all main links.
    """
    print(f"\n[Agent] Ejecutando tool_scrape_content en {url} para las secciones: {sections_to_extract}...")
    try:
        with _session() as session:
            page = session.fetch(url, network_idle=True)

            links = []
            seen = set()

            if sections_to_extract.strip().upper() == 'ALL':
                _collect_links(page, page.css("a"), links, seen)
            else:
                sections_list = [s.strip() for s in sections_to_extract.split(",")]
                for section in sections_list:
                    for el in page.find_by_text(section, first_match=False, partial=True, case_sensitive=False):
                        parents = el.xpath("./ancestor::div[1] | ./ancestor::section[1] | ./following-sibling::ul[1]")
                        if parents:
                            _collect_links(page, parents[0].css("a"), links, seen)

            if not links:
                return "No se encontraron enlaces en esas secciones."

            print(f"[Agent] Descargando {len(links)} enlaces encontrados...")

            output_dir = "raw_data"
            os.makedirs(output_dir, exist_ok=True)

            saved_files = []
            for idx, link in enumerate(links[:15]): # Límite de seguridad
                try:
                    page = session.fetch(link['url'], network_idle=True)

                    # --- INICIO DEL ALGORITMO EXPLORATORIO (DEEP-SCRAPE) ---
                    target_url = link['url']
                    action_keywords = ['view resource', 'download', 'access', 'open', 'go to', 'click here', 'pdf', 'descargar', 'ver', 'acceder', 'word', '.docx', 'doc', 'google docs', 'version', 'template']

                    # Buscamos CTA solo en el contenido principal para evitar menús de navegación
                    a_tags = []
                    for sel in ["main a", "article a", "#rendered-content a", ".content a", ".main-content a"]:
                        a_tags.extend(page.css(sel))

                    # Si no encuentra contenedores semánticos, usa un fallback al body pero excluyendo nav/header
                    if not a_tags:
                        a_tags = page.css("body a:not(nav a):not(header a)")

                    for a in a_tags:
                        text = a.get_all_text(strip=True).lower()
                        raw = a.attrib.get("href")

                        # Usar expresiones regulares para buscar palabras exactas y evitar que "ver" haga match con "discover"
                        found_kw = None
                        for kw in action_keywords:
                            # Para keywords con punto o espacios, usamos búsqueda normal
                            if '.' in kw or ' ' in kw:
                                if kw in text:
                                    found_kw = kw
                                    break
                            elif re.search(r'\b' + re.escape(kw) + r'\b', text):
                                found_kw = kw
                                break

                        if raw and found_kw:
                            target_url = page.urljoin(str(raw))
                            print(f"    [!] Encontrado botón CTA exploratorio ('{text}') -> Profundizando a: {target_url}")
                            # Si es un link de Google Docs, guardamos el enlace directamente
                            if "docs.google.com" in target_url:
                                print(f"    [+] Link de Google Docs detectado, guardando URL...")
                            break
                    # --- FIN DEL ALGORITMO EXPLORATORIO ---

                    safe_name = "".join([c if c.isalnum() else "_" for c in link['title']]).strip("_") or f"link_{idx}"

                    # Handle Document files directly
                    is_document = any(target_url.lower().endswith(ext) for ext in [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"])
                    if is_document:
                        ext = target_url.split('.')[-1]
                        print(f"    [+] Descargando documento .{ext} directamente...")
                        doc_path = os.path.join(output_dir, f"{safe_name}.{ext}")
                        response = requests.get(target_url, stream=True, timeout=60)
                        if response.status_code == 200:
                            with open(doc_path, 'wb') as f:
                                for chunk in response.iter_content(chunk_size=8192):
                                    f.write(chunk)
                            saved_files.append(doc_path)
                        continue

                    # Navigate to the target url if it's different (not a direct file download)
                    if target_url != link['url'] and "docs.google.com" not in target_url:
                        page = session.fetch(target_url, network_idle=True)

                    content_html = ""
                    for sel in ["article", "main", "#rendered-content", "body"]:
                        elems = page.css(sel)
                        if elems:
                            content_html = elems[0].html_content
                            break

                    md_text = html_to_markdown(content_html)
                    filepath = os.path.join(output_dir, f"{safe_name}.md")
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(f"# {link['title']}\n\n[Enlace Final Extraído]({target_url})\n\n{md_text}")
                    saved_files.append(filepath)
                except Exception as e:
                    print(f"    [x] Falló {link['url']}: {e}")

        return f"Scraping completado. Se guardaron {len(saved_files)} archivos en la carpeta {output_dir}."
    except Exception as e:
        return f"Error en el scraping: {e}"

@tool
def tool_consolidate_information(directory_path: str = "raw_data") -> str:
    """
    Reads all raw markdown files from the specified directory, removes duplicate information,
    and saves a consolidated Final_Report.md.
    """
    print(f"\n[Agent] Ejecutando tool_consolidate_information en {directory_path}...")
    import glob

    files = glob.glob(os.path.join(directory_path, "*.md"))
    if not files:
        return "No se encontraron archivos crudos para consolidar."

    combined_text = ""
    for f in files:
        if "Final_Report.md" not in f:
            with open(f, 'r', encoding='utf-8') as file:
                combined_text += f"\n--- Start of {os.path.basename(f)} ---\n{file.read()[:2000]}\n" # limit per file

    prompt = f"Act as a professional editor. Compile this raw data into a clean, deductive final report. Remove duplicates.\n\nRaw Data:\n{combined_text}"

    try:
        response = requests.post("http://localhost:11434/api/generate", json={
            "model": "llama3.2",
            "prompt": prompt,
            "stream": False
        })
        summary = response.json().get('response', '')

        with open("Final_Report.md", "w", encoding="utf-8") as out:
            out.write(summary)

        return "Consolidación exitosa. Reporte guardado como Final_Report.md."
    except Exception as e:
        return f"Error en la consolidación con Ollama: {e}"
