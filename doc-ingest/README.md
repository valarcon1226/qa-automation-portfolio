# DocIngest — Continuous Document Ingestion Agent

A multi-agent RAG (Retrieval-Augmented Generation) system designed to run 100% locally with Ollama. It automatically ingests, processes, and vectorizes documents, providing a seamless QA experience over your local knowledge base.

## Features

- 📁 **Automated Watchdog**: Monitors a folder and automatically processes any new documents (PDF, DOCX, TXT, MD).
- 🔍 **Advanced Parsing**: Utilizes Docling for document parsing, including OCR for scanned PDFs.
- 🧩 **Semantic Chunking**: Intelligently chunks documents based on sections and headers.
- 📄 **Page-Level Provenance & Citations**: Tracks exact 1-indexed page numbers for every ingested fragment and automatically cites document name and page number in query responses.
- 🔢 **Local Vectorization**: Uses `nomic-embed-text` via Ollama for local embedding generation.
- 💾 **Persistent Storage**: Stores vectors persistently in ChromaDB.
- 🤖 **Multi-Agent QA**: Answers queries using a sophisticated multi-agent RAG pipeline (LangGraph + llama3.2).

## Prerequisites

1. **Ollama** installed and running locally with the following models:
   - `llama3.2` (Main LLM)
   - `nomic-embed-text` (Embeddings)
2. **Python 3.10+**

## Installation

1. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

### 1. Automated Watcher (Continuous Ingestion)
```bash
python watch.py
```
Place any document in the `watch_folder/` directory. The system will automatically parse it, extract summaries, vectorize it into ChromaDB, and prepare it for retrieval.

### 2. Manual Ingestion
```bash
# Ingest a single file
python ingest.py path/to/document.pdf

# Ingest an entire directory
python ingest.py ./my_documents/
```

### 3. Querying the Knowledge Base
```bash
# Direct question — triggers the multi-agent RAG pipeline
python query.py "What is the main hypothesis of the paper?"

# Interactive Mode
python query.py
```

Responses automatically cite the source document filename and page number:
```text
============================================================
 ANSWER:
------------------------------------------------------------
The telemetry system architecture relies on S-band communication transponders...

Sources / Citations:
- apollo_manual.pdf (Page 2)

------------------------------------------------------------
 SOURCES & CITATIONS:
- apollo_manual.pdf (Page 2)
============================================================
```

## Running Tests

Execute the automated test suite with pytest:
```bash
python -m pytest -q
```

The tests verify:
- **Chunking & Page Metadata**: Validates that multi-page documents are parsed with exact 1-indexed page numbers retained in chunk metadata.
- **Real Retrieval**: Validates hybrid retrieval (BM25 lexical search combined with vector similarity) over a synthetic test PDF using isolated in-memory storage without touching persistent production databases.
- **Citation Verification**: Simulates LLM inference to test end-to-end response assembly, confirming that the resulting answer incorporates correct document and page citations.

## Project Structure
```
doc_ingest/
├── agents/               # RelevanceChecker, ResearchAgent, VerificationAgent, Workflow
├── config/               # Configuration and constants
├── document_processor/   # Parsing, chunking, and caching logic
├── retriever/            # ChromaDB integration and hybrid retrieval (BM25)
├── watcher/              # Folder watchdog implementation
├── watch_folder/         # 📁 Target folder for continuous ingestion
├── chroma_db/            # 💾 Auto-generated persistent vector store
├── cache/                # 🗃️ Auto-generated chunk cache
├── watch.py              # Entrypoint for the automated watcher
├── ingest.py             # Entrypoint for manual ingestion
├── query.py              # Entrypoint for CLI queries
└── requirements.txt      # Project dependencies
```

