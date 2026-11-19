# Invoice & Insurance Document Processor

A high-performance document extraction microservice that ingests financial invoices and ACORD 25 insurance certificates (PDF, XLSX, and images). It extracts structured data using dual extraction engines—deterministic regular expressions and OpenAI-compatible structured LLMs (e.g., local Ollama `qwen3:4b-instruct-2507-q4_K_M`)—with exact page-level text snippet provenance tracking and validation.

---

## 1. Overview & Capabilities

### Supported Document Types
1. **Commercial Invoices (Facturas)**
   - Extracts: Issuer Name, Issuer VAT/NIT, Recipient Name, Recipient VAT, Invoice Number, Issue Date, Due Date, Subtotal, Tax Rate, Tax Amount, Grand Total, Currency, and individual Line Items.
   - Supports Colombian DIAN formats (NIT with verification digit), US invoices (USD, EIN/Tax ID), and European invoices (EUR, VAT ID).
2. **ACORD 25 Certificate of Liability Insurance**
   - Extracts: Insured Name, Insurer Name (affording coverage), Policy Number, Effective Date, Expiration Date, and Coverage Limits (General Aggregate, Each Occurrence, Damage to Rented Premises, Med Exp, Personal & Adv Injury, Products - Comp/Op Agg).
   - Automatically detects document type (`INVOICE` vs `ACORD_25`) prior to extraction.

### Dual Extraction Architecture
- **Regex Route (`method="regex"`)**: Lightning-fast, zero-network, rule-based extraction with heuristic fallbacks and deterministic provenance.
- **LLM Route (`method="llm"`)**: OpenAI-compatible API endpoint (defaults to local Ollama `http://localhost:11434/v1` running `qwen3:4b-instruct-2507-q4_K_M`). Reuses existing Pydantic models for structured output, performs validation with automatic 1-turn correction retry, and handles failure gracefully.
- **Field-Level Provenance & Verification**: Every extracted field outputs its `page` number and exact `text_snippet`. In the LLM route, every snippet is strictly checked against the actual text of that page; hallucinated or relocated snippets are flagged as `without source` (`page=null, text_snippet=null`).
- **Flexible Ingestion**: Ingests **PDF**, **Excel (.xlsx)**, and **Images (PNG, JPG, TIFF)**. Digital PDFs use fast-path extraction via `pypdf`, Excel sheets map directly to page numbers via `openpyxl`, and scanned images fallback to Tesseract OCR.
- **Long Document Support**: Scales to multi-page documents (50+ pages), correctly isolating fields spread across distinct pages.

---

## 2. Benchmark Evaluation Results

The evaluation was performed against a labeled benchmark dataset of **40 synthetic documents** (20 Invoices and 20 ACORD 25 Certificates) across PDF and Excel formats, including single-page and multi-page layouts.

*Results copied directly from [evals/results.md](evals/results.md):*

### 2.1 Invoice Extraction Accuracy (20 Documents)

| Field Name | Samples | Regex Accuracy | LLM Accuracy | Status |
| :--- | :---: | :---: | :---: | :--- |
| `issuer_name` | 20 | 100.0% | 95.0% | Evaluated |
| `issuer_vat` | 20 | 100.0% | 95.0% | Evaluated |
| `invoice_number` | 20 | 100.0% | 95.0% | Evaluated |
| `invoice_date` | 20 | 100.0% | 95.0% | Evaluated |
| `subtotal` | 20 | 90.0% | 95.0% | Evaluated |
| `tax_amount` | 20 | 90.0% | 95.0% | Evaluated |
| `total` | 20 | 90.0% | 95.0% | Evaluated |
| `currency` | 20 | 100.0% | 20.0% | Evaluated |

### 2.2 ACORD 25 Certificate Extraction Accuracy (20 Documents)

| Field Name | Samples | Regex Accuracy | LLM Accuracy | Status |
| :--- | :---: | :---: | :---: | :--- |
| `insured_name` | 20 | 100.0% | 100.0% | Evaluated |
| `insurer_name` | 20 | 100.0% | 100.0% | Evaluated |
| `policy_number` | 20 | 100.0% | 100.0% | Evaluated |
| `effective_date` | 20 | 100.0% | 100.0% | Evaluated |
| `expiration_date` | 20 | 100.0% | 100.0% | Evaluated |
| `coverage_limits` | 20 | 100.0% | 100.0% | Evaluated |

> **Reading the LLM column**: run on 2026-11-19 with the local model `qwen3:4b-instruct-2507-q4_K_M` on CPU (Ollama). One of the 40 calls (`inv_14`) returned output that failed schema validation twice, so every field of that invoice counts as wrong: that is the 95.0%. `currency` is 20.0% because the model rarely returns the ISO code (`COP`) the labels use; a normalisation step after the model would fix it and is not done yet. The regex route misses `subtotal`, `tax_amount` and `total` on 2 invoices. The 40 documents are synthetic (generated with ReportLab and openpyxl), so these numbers say nothing yet about scanned or real client documents.

---

## 3. Architecture & Data Flow

```mermaid
flowchart TD
    Client[Client Application] -->|Upload PDF, XLSX, or Image| FastAPI[FastAPI Service]
    
    FastAPI --> DocDetect[Document Classifier: Invoice vs ACORD 25]
    DocDetect --> Ingestion[Document Text Ingestion: pypdf / openpyxl / Tesseract]
    
    Ingestion --> Router{Method Param}
    Router -->|method='regex'| RegexEngine[Regex & Heuristics Engine]
    Router -->|method='llm'| LLMEngine[OpenAI-Compatible LLM Client]
    
    LLMEngine --> PydanticVal[Pydantic Validation & Retry]
    LLMEngine --> SnippetVerifier[Page Text Snippet Verifier]
    
    RegexEngine --> Provenance[Field Provenance Tracker]
    SnippetVerifier --> Provenance
    
    Provenance --> Validator[Business Logic Validator]
    Validator --> DB[(PostgreSQL / SQLite)]
    Validator --> Storage[(MinIO / S3 Storage)]
    Storage --> Client
```

---

## 4. Environment Configuration

All variables can be configured via environment or `.env` file:

```ini
# Application Security
API_BEARER_TOKEN=change_me_bearer_token
MAX_SYNC_PAGES=5

# LLM Configuration (OpenAI-compatible / Ollama)
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=qwen3:4b-instruct-2507-q4_K_M
LLM_API_KEY=ollama

# Database & Cache
DATABASE_URL=postgresql://user:change_me_db_password@postgres:5432/invoices
REDIS_URL=redis://redis:6379/0

# Object Storage (MinIO / S3)
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=change_me_minio_password
MINIO_BUCKET=invoices-bucket
MINIO_SECURE=false

# OCR Engine
TESSERACT_CMD=tesseract
```

---

## 5. API Reference

### 5.1 POST `/api/v1/invoices/process` (Synchronous)
Processes a commercial invoice synchronously. Accepts `file` and optional query parameter `method=regex|llm`.

```bash
curl -X POST "http://127.0.0.1:8005/api/v1/invoices/process?method=regex" \
  -H "Authorization: Bearer change_me_bearer_token" \
  -F "file=@factura.xlsx"
```

**Response:**
```json
{
  "invoice_id": "7b8e1f2a-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
  "document_type": "INVOICE",
  "issuer_name": "SOLUCIONES ANDINAS S.A.S.",
  "issuer_vat": "900.123.456-8",
  "invoice_number": "FEV-1001",
  "invoice_date": "2026-10-01",
  "subtotal": 1000000.0,
  "tax_amount": 190000.0,
  "total": 1190000.0,
  "currency": "COP",
  "is_valid": true,
  "field_sources": {
    "issuer_name": {"page": 1, "text_snippet": "SOLUCIONES ANDINAS S.A.S."},
    "invoice_number": {"page": 1, "text_snippet": "Factura No: FEV-1001"},
    "total": {"page": 1, "text_snippet": "Total a Pagar: $ 1,190,000"}
  }
}
```

### 5.2 POST `/api/v1/insurance/process` (Synchronous)
Processes an ACORD 25 Certificate of Liability Insurance.

```bash
curl -X POST "http://127.0.0.1:8005/api/v1/insurance/process?method=regex" \
  -H "Authorization: Bearer change_me_bearer_token" \
  -F "file=@certificate_acord25.pdf"
```

**Response:**
```json
{
  "document_type": "ACORD_25",
  "insured_name": "ANDES LOGISTICS GROUP LLC",
  "insurer_name": "TRAVELERS CASUALTY AND SURETY COMPANY",
  "policy_number": "GL-98765432-01",
  "effective_date": "2026-01-01",
  "expiration_date": "2027-01-01",
  "coverage_limits": [
    {"coverage_type": "EACH OCCURRENCE", "limit_amount": 1000000.0},
    {"coverage_type": "GENERAL AGGREGATE", "limit_amount": 2000000.0}
  ],
  "is_valid": true,
  "field_sources": {
    "insured_name": {"page": 1, "text_snippet": "INSURED: ANDES LOGISTICS GROUP LLC"},
    "policy_number": {"page": 1, "text_snippet": "POLICY NUMBER: GL-98765432-01"}
  }
}
```

---

## 6. Known Limitations

1. **Scanned Low-Resolution Documents**: Heavily skewed or low-DPI scans (< 150 DPI) without OCR text layers depend on Tesseract OCR quality; OCR errors in numbers (e.g. `8` misrecognized as `B` or `0` as `O`) can lead to regex misses.
2. **Unstructured Mixed Spreadsheets**: Excel files where key labels and values are merged into arbitrary non-tabular layouts may require LLM extraction rather than rule-based pattern matching.
3. **Offline LLM Graceful Fallback**: When `method=llm` is explicitly requested and the LLM endpoint is unreachable, an `LLMConnectionError` is raised. The pipeline does not silently fallback to regex unless configured by the caller.
4. **Handwritten Annotations**: The current OCR and regex engines do not transcribe handwritten notes on ACORD forms or invoices.

---

## 7. Running Tests & Evaluations

```bash
# Activate virtual environment
source .venv/bin/activate  # Or on Windows: .\.venv\Scripts\Activate.ps1

# Run fast unit test suite
python -m pytest -q

# Run benchmark generation and evaluation
python scripts/generar_dataset_evaluacion.py
python scripts/evaluar.py
```
