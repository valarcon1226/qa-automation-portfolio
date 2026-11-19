import re
import tempfile
from pathlib import Path
from unittest.mock import MagicMock

import chromadb
import pytest
from langchain_core.embeddings import FakeEmbeddings
from langchain_core.messages import AIMessage

from agents.workflow import AgentWorkflow
from document_processor.file_handler import DocumentProcessor
from retriever.builder import RetrieverBuilder


def make_synthetic_pdf(output_path: Path) -> Path:
    """Generates a clean 3-page synthetic PDF with deterministic test text."""
    pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 9 0 R >> >> >>\nendobj\n"
        b"4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 7 0 R /Resources << /Font << /F1 9 0 R >> >> >>\nendobj\n"
        b"5 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 8 0 R /Resources << /Font << /F1 9 0 R >> >> >>\nendobj\n"
        b"6 0 obj\n<< /Length 75 >>\nstream\nBT\n/F1 16 Tf\n50 720 Td\n(Page 1: Project Apollo Telemetry Architecture and Ground Station Network) Tj\nET\nendstream\nendobj\n"
        b"7 0 obj\n<< /Length 85 >>\nstream\nBT\n/F1 16 Tf\n50 720 Td\n(Page 2: Confidential Launch Authorization Codes: Protocol Delta-7 Security Clearance) Tj\nET\nendstream\nendobj\n"
        b"8 0 obj\n<< /Length 75 >>\nstream\nBT\n/F1 16 Tf\n50 720 Td\n(Page 3: Post-flight Ocean Recovery Procedures and Splashdown Operations) Tj\nET\nendstream\nendobj\n"
        b"9 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
    )
    matches = list(re.finditer(rb"(\d+) 0 obj", pdf_content))
    obj_offsets = {int(m.group(1)): m.start() for m in matches}
    xref = b"xref\n0 10\n0000000000 65535 f \n"
    for i in range(1, 10):
        xref += f"{obj_offsets[i]:010d} 00000 n \n".encode()
    trailer = f"trailer\n<< /Size 10 /Root 1 0 R >>\nstartxref\n{len(pdf_content)}\n%%EOF\n".encode()
    output_path.write_bytes(pdf_content + xref + trailer)
    return output_path


@pytest.fixture
def synthetic_pdf(tmp_path):
    pdf_path = tmp_path / "synthetic_apollo_manual.pdf"
    make_synthetic_pdf(pdf_path)
    return pdf_path


def test_chunking_and_page_metadata(synthetic_pdf, tmp_path):
    """Verifica que el procesamiento de PDF extrae trozos y asigna el metadato exacto de pagina."""
    processor = DocumentProcessor(cache_dir=str(tmp_path / "cache"))
    chunks = processor.process([str(synthetic_pdf)])

    assert len(chunks) == 3

    # Pagina 1
    chunk_p1 = next((c for c in chunks if "Telemetry Architecture" in c.page_content), None)
    assert chunk_p1 is not None
    assert chunk_p1.metadata["page"] == 1
    assert chunk_p1.metadata["file_name"] == synthetic_pdf.name

    # Pagina 2
    chunk_p2 = next((c for c in chunks if "Protocol Delta-7" in c.page_content), None)
    assert chunk_p2 is not None
    assert chunk_p2.metadata["page"] == 2
    assert chunk_p2.metadata["file_name"] == synthetic_pdf.name

    # Pagina 3
    chunk_p3 = next((c for c in chunks if "Ocean Recovery" in c.page_content), None)
    assert chunk_p3 is not None
    assert chunk_p3.metadata["page"] == 3
    assert chunk_p3.metadata["file_name"] == synthetic_pdf.name


def test_real_retrieval_on_synthetic_pdf(synthetic_pdf, tmp_path):
    """Verifica recuperacion real (BM25 + vectorstore aislado) sobre el PDF sintetico."""
    processor = DocumentProcessor(cache_dir=str(tmp_path / "cache"))
    chunks = processor.process([str(synthetic_pdf)])

    # Vector store y embeddings aislados en memoria para no tocar chroma_db de produccion
    ephemeral_client = chromadb.EphemeralClient()
    fake_embeddings = FakeEmbeddings(size=64)

    builder = RetrieverBuilder(chroma_client=ephemeral_client, embeddings=fake_embeddings)
    retriever = builder.build_hybrid_retriever(chunks)

    # Busqueda especifica para contenido de la pagina 2
    results = retriever.invoke("Protocol Delta-7 authorization codes")

    assert len(results) > 0
    top_hit = results[0]
    assert "Protocol Delta-7" in top_hit.page_content
    assert top_hit.metadata["page"] == 2
    assert top_hit.metadata["file_name"] == synthetic_pdf.name


def test_answer_formatting_includes_correct_citations(synthetic_pdf, tmp_path, monkeypatch):
    """
    Verifica que la respuesta final incluya la cita correcta de documento y pagina.
    El LLM se simula solo para el formateo de la respuesta, mientras la recuperacion se ejecuta de verdad.
    """
    processor = DocumentProcessor(cache_dir=str(tmp_path / "cache"))
    chunks = processor.process([str(synthetic_pdf)])

    ephemeral_client = chromadb.EphemeralClient()
    fake_embeddings = FakeEmbeddings(size=64)

    builder = RetrieverBuilder(chroma_client=ephemeral_client, embeddings=fake_embeddings)
    retriever = builder.build_hybrid_retriever(chunks)

    workflow = AgentWorkflow()

    # Simular unicamente los modelos de lenguaje locales (Ollama)
    monkeypatch.setattr(workflow.relevance_checker, "check", lambda question, retriever, k=20: "CAN_ANSWER")
    monkeypatch.setattr(
        workflow.researcher,
        "generate",
        lambda question, documents: {
            "draft_answer": "The authorization codes use Protocol Delta-7 with Top Secret clearance.",
            "context_used": "\n\n".join(d.page_content for d in documents),
        },
    )
    monkeypatch.setattr(
        workflow.verifier,
        "check",
        lambda answer, documents: {
            "verification_report": "Supported: YES\nUnsupported Claims: []\nContradictions: []\nRelevant: YES"
        },
    )

    # Ejecutar pipeline con recuperacion real
    result = workflow.full_pipeline("What is the launch code protocol?", retriever=retriever)

    # Validar respuesta
    assert "Protocol Delta-7" in result["draft_answer"]

    # Validar que incluya la cita de documento y pagina
    expected_citation = f"{synthetic_pdf.name} (Page 2)"
    assert expected_citation in result["draft_answer"]
    assert any(expected_citation in c for c in result["citations"])


def test_markdown_and_text_metadata(tmp_path):
    """Verifica que documentos de texto/markdown tengan pagina 1 por defecto."""
    txt_path = tmp_path / "notes.md"
    txt_path.write_text("# Security Guidelines\nAll systems must adhere to policy.", encoding="utf-8")

    processor = DocumentProcessor(cache_dir=str(tmp_path / "cache"))
    chunks = processor.process([str(txt_path)])

    assert len(chunks) >= 1
    assert chunks[0].metadata["page"] == 1
    assert chunks[0].metadata["file_name"] == "notes.md"
