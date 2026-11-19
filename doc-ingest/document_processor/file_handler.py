"""
DocumentProcessor: parseo, chunking y caché de documentos.
Basado en el lab DocChat (file_handler.py) de IBM Skills Network.
Adaptado para uso standalone sin dependencias de WatsonX.
Soporta documentos académicos de 1500+ páginas (hasta 1 GB).
"""
import hashlib
import logging
import os
import pickle
from datetime import datetime, timedelta
from pathlib import Path
from typing import List

from langchain_core.documents import Document
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter

from config.constants import (
    ALLOWED_EXTENSIONS,
    CHUNK_OVERLAP,
    MAX_CHUNK_SIZE,
    MAX_SINGLE_FILE_SIZE,
)
from config.settings import CACHE_DIR, CACHE_EXPIRE_DAYS

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """
    Procesa documentos en tres pasos:
      1. Validación de archivos
      2. Conversión / extracción preservando metadatos de página
      3. Chunking estructurado
    Incluye caché por hash SHA-256 para evitar reprocesar documentos ya vistos.
    """

    def __init__(self, cache_dir: str | None = None):
        self.headers = [("# ", "Header 1"), ("## ", "Header 2"), ("### ", "Header 3")]
        self.cache_dir = Path(cache_dir or CACHE_DIR)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"DocumentProcessor inicializado. Caché en: {self.cache_dir}")

    def validate_file(self, file_path: str) -> bool:
        """Valida extensión y tamaño de un archivo individual."""
        path = Path(file_path)
        if path.suffix.lower() not in ALLOWED_EXTENSIONS:
            logger.warning(f"Tipo no soportado: {path.suffix} → {file_path}")
            return False
        size_bytes = os.path.getsize(file_path)
        size_mb = size_bytes / (1024 * 1024)
        if size_bytes > MAX_SINGLE_FILE_SIZE:
            logger.warning(f"Archivo demasiado grande ({size_mb:.1f} MB > 500 MB): {file_path}")
            return False
        logger.info(f"Archivo válido: {path.name} ({size_mb:.1f} MB)")
        return True

    def process(self, file_paths: List[str]) -> List[Document]:
        """
        Procesa una lista de rutas de archivos.
        Retorna una lista de chunks (LangChain Documents) únicos con metadata de página.
        """
        all_chunks = []
        seen_hashes = set()

        for file_path in file_paths:
            if not self.validate_file(file_path):
                continue
            try:
                with open(file_path, "rb") as f:
                    file_hash = self._generate_hash(f.read())

                cache_path = self.cache_dir / f"{file_hash}.pkl"

                if self._is_cache_valid(cache_path):
                    logger.info(f"Cargando desde caché: {file_path}")
                    chunks = self._load_from_cache(cache_path)
                else:
                    logger.info(f"Procesando documento: {file_path}")
                    chunks = self._process_file(file_path)
                    if chunks:
                        self._save_to_cache(chunks, cache_path)

                # Deduplicar chunks
                for chunk in chunks:
                    chunk_hash = self._generate_hash(chunk.page_content.encode())
                    if chunk_hash not in seen_hashes:
                        all_chunks.append(chunk)
                        seen_hashes.add(chunk_hash)

            except Exception as e:
                logger.error(f"Error procesando {file_path}: {e}")
                continue

        logger.info(f"Total chunks únicos procesados: {len(all_chunks)}")
        return all_chunks

    def process_single(self, file_path: str) -> List[Document]:
        """Procesa un único archivo. Útil para el watcher."""
        return self.process([file_path])

    def _process_file(self, file_path: str) -> List[Document]:
        """Convierte el documento y lo divide en chunks preservando el número de página."""
        path = Path(file_path)
        ext = path.suffix.lower()

        try:
            size_mb = os.path.getsize(file_path) / (1024 * 1024)
            logger.info(f"Procesando {path.name} ({size_mb:.1f} MB)...")

            if ext == ".pdf":
                chunks = self._process_pdf(file_path)
            elif ext in (".txt", ".md"):
                chunks = self._process_text_or_md(file_path)
            else:
                chunks = self._process_with_docling(file_path)

            now_iso = datetime.now().isoformat()
            for chunk in chunks:
                chunk.metadata.setdefault("source", file_path)
                chunk.metadata.setdefault("file_name", path.name)
                chunk.metadata.setdefault("page", 1)
                chunk.metadata["ingested_at"] = now_iso

            logger.info(f"Total chunks generados de {path.name}: {len(chunks)}")
            return chunks

        except Exception as e:
            logger.error(f"Error procesando {file_path}: {e}")
            return []

    def _process_pdf(self, file_path: str) -> List[Document]:
        """Extrae texto página por página de un PDF preservando el número de página exacto."""
        from pypdf import PdfReader

        chunks = []
        fallback_splitter = RecursiveCharacterTextSplitter(
            chunk_size=MAX_CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

        try:
            reader = PdfReader(file_path)
            for page_num, page in enumerate(reader.pages, start=1):
                text = (page.extract_text() or "").strip()
                if not text:
                    continue

                if len(text) > MAX_CHUNK_SIZE:
                    sub_docs = fallback_splitter.create_documents([text])
                    for sub_doc in sub_docs:
                        sub_doc.metadata["page"] = page_num
                        chunks.append(sub_doc)
                else:
                    chunks.append(Document(page_content=text, metadata={"page": page_num}))
        except Exception as e:
            logger.warning(f"Error con PdfReader en {file_path}: {e}")

        # Si no se extrajo texto (e.g. PDF escaneado), intentar con Docling
        if not chunks:
            chunks = self._process_with_docling(file_path)

        return chunks

    def _process_text_or_md(self, file_path: str) -> List[Document]:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=self.headers,
            strip_headers=False,
        )
        chunks = splitter.split_text(content)
        if not chunks:
            chunks = [Document(page_content=content)]

        oversized = [c for c in chunks if len(c.page_content) > MAX_CHUNK_SIZE]
        if oversized:
            fallback_splitter = RecursiveCharacterTextSplitter(
                chunk_size=MAX_CHUNK_SIZE,
                chunk_overlap=CHUNK_OVERLAP,
                separators=["\n\n", "\n", ". ", " ", ""],
            )
            refined = []
            for c in chunks:
                if len(c.page_content) > MAX_CHUNK_SIZE:
                    refined.extend(
                        fallback_splitter.create_documents(
                            [c.page_content], metadatas=[c.metadata]
                        )
                    )
                else:
                    refined.append(c)
            chunks = refined

        for c in chunks:
            c.metadata["page"] = 1

        return chunks

    def _process_with_docling(self, file_path: str) -> List[Document]:
        try:
            from docling.document_converter import DocumentConverter

            converter = DocumentConverter()
            result = converter.convert(file_path)

            page_texts = {}
            for item, _ in result.document.iterate_items():
                text = getattr(item, "text", "") or ""
                text = text.strip()
                if not text:
                    continue
                prov = getattr(item, "prov", None)
                page_no = (
                    prov[0].page_no
                    if (prov and len(prov) > 0 and hasattr(prov[0], "page_no"))
                    else 1
                )
                page_texts.setdefault(page_no, []).append(text)

            chunks = []
            fallback_splitter = RecursiveCharacterTextSplitter(
                chunk_size=MAX_CHUNK_SIZE,
                chunk_overlap=CHUNK_OVERLAP,
                separators=["\n\n", "\n", ". ", " ", ""],
            )

            if page_texts:
                for page_no, text_items in page_texts.items():
                    page_text = "\n\n".join(text_items)
                    if len(page_text) > MAX_CHUNK_SIZE:
                        for sub in fallback_splitter.create_documents([page_text]):
                            sub.metadata["page"] = page_no
                            chunks.append(sub)
                    else:
                        chunks.append(Document(page_content=page_text, metadata={"page": page_no}))
            else:
                markdown_content = result.document.export_to_markdown()
                splitter = MarkdownHeaderTextSplitter(
                    headers_to_split_on=self.headers,
                    strip_headers=False,
                )
                chunks = splitter.split_text(markdown_content)
                for c in chunks:
                    c.metadata["page"] = 1

            return chunks
        except Exception as e:
            logger.error(f"Error en Docling al procesar {file_path}: {e}")
            return []

    def _generate_hash(self, content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()

    def _save_to_cache(self, chunks: List, cache_path: Path):
        with open(cache_path, "wb") as f:
            pickle.dump({
                "timestamp": datetime.now().timestamp(),
                "chunks": chunks,
            }, f)
        logger.debug(f"Caché guardado: {cache_path}")

    def _load_from_cache(self, cache_path: Path) -> List:
        with open(cache_path, "rb") as f:
            data = pickle.load(f)
        return data["chunks"]

    def _is_cache_valid(self, cache_path: Path) -> bool:
        if not cache_path.exists():
            return False
        cache_age = datetime.now() - datetime.fromtimestamp(cache_path.stat().st_mtime)
        return cache_age < timedelta(days=CACHE_EXPIRE_DAYS)
