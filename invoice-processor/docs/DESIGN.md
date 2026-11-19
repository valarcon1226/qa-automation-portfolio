# Technical Design Document: Invoice & Insurance Document Processor

## 1. Executive Summary & Problem Statement

Enterprises in insurance, logistics, and financial operations deal with large volumes of semi-structured and unstructured documents. Historically, document processing pipelines suffered from two extreme paradigms:
1. **Brittle Heuristics / Pure Regex**: Fast and inexpensive, but prone to breakage when document templates, layouts, or field positions deviate.
2. **Unconstrained LLM Extraction**: Highly adaptive, but slow, costly, non-deterministic, and prone to hallucinations without verifiable proof of where extracted data originated.

This project addresses these challenges by transforming `invoice-processor` into a hybrid document intelligence microservice supporting both **commercial invoices** and **ACORD 25 insurance certificates** across **PDF**, **Excel (.xlsx)**, and **Image** formats. It introduces dual-route extraction (deterministic regex and OpenAI-compatible structured LLM) coupled with **strict field-level text provenance verification**.

---

## 2. Key Architecture Decisions & Discarded Alternatives

### 2.1 Dual Extraction Route (Regex vs. LLM)
- **Decision**: Provide both a fast regex route (`method="regex"`) and an LLM route (`method="llm"`), selectable via parameter.
- **Rationale**: 
  - Standard invoices and certificates with clear labeling process in under 15ms with 100% precision using regex.
  - Non-standard, noisy, or varied layouts can be processed via LLM with JSON schema enforcement and 1-turn retry.
- **Discarded Alternative**: *LLM-only pipeline*. Discarded because requiring local GPU / external API calls for simple, structured documents introduces unnecessary latency, operational costs, and network failure points.

### 2.2 Reusing Existing Pydantic Schemas vs. Creating Parallel Models
- **Decision**: Reused `InvoiceResponse` from `app.models.schemas` for LLM structured output rather than creating a separate extraction schema. A new dedicated schema (`Acord25Certificate`) was created exclusively for the new document type.
- **Rationale**: Adheres to the ponytail ladder rule (YAGNI). Reusing existing schemas prevents schema drift and ensures zero-overhead integration with existing database models and API endpoints.

### 2.3 Lightweight OpenAI-Compatible Client via `httpx` vs. `openai` SDK
- **Decision**: Implemented `LLMClient` using `httpx`, which was already a declared requirement in the project.
- **Rationale**: Standard `/chat/completions` REST endpoints supported by Ollama, vLLM, and OpenAI do not require the 15+ transitive dependencies of the full `openai` Python SDK.

### 2.4 Digital PDF Fast-Path vs. Universal OCR
- **Decision**: In `ocr_engine.py`, digitally generated PDFs first attempt text extraction via `pypdf`. Only scanned PDFs with empty/negligible text layers fall back to `pdf2image` and `pytesseract`.
- **Rationale**: Extracting digital text from a 50-page document takes ~30ms, compared to ~60–90 seconds when rasterizing each page to 200 DPI PNG and running Tesseract OCR.

### 2.5 Excel (.xlsx) Multi-Sheet Ingestion via `openpyxl`
- **Decision**: Converted `.xlsx` sheets into structured line text, mapping each worksheet to a logical page.
- **Rationale**: Allows the same downstream extraction engines (regex and LLM) and provenance verifiers to operate seamlessly across both PDF and Excel inputs.

---

## 3. Data Models & Schemas

### 3.1 Field Source Provenance (`FieldSource`)
```python
class FieldSource(BaseModel):
    page: int | None = None
    text_snippet: str | None = None
```

### 3.2 Invoice Models (`InvoiceResponse`)
Reused and extended with non-breaking defaults and provenance:
```python
class InvoiceResponse(BaseModel):
    invoice_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    original_filename: str = ""
    minio_key: str = ""
    issuer_name: str | None = None
    issuer_vat: str | None = None
    recipient_name: str | None = None
    recipient_vat: str | None = None
    invoice_number: str | None = None
    invoice_date: date | None = None
    due_date: date | None = None
    subtotal: Decimal | None = None
    tax_rate: Decimal | None = None
    tax_amount: Decimal | None = None
    total: Decimal | None = None
    currency: str | None = None
    is_valid: bool = False
    validation_errors: list[str] = Field(default_factory=list)
    status: str = "COMPLETED"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    line_items: list[LineItemSchema] = Field(default_factory=list)
    field_sources: dict[str, FieldSource] = Field(default_factory=dict)
    document_type: str = "INVOICE"
```

### 3.3 ACORD 25 Certificate Models (`Acord25Certificate`)
```python
class CoverageLimit(BaseModel):
    coverage_type: str
    limit_amount: Decimal | None = None
    description: str | None = None

class Acord25Certificate(BaseModel):
    insured_name: str | None = None
    insurer_name: str | None = None
    policy_number: str | None = None
    effective_date: date | None = None
    expiration_date: date | None = None
    coverage_limits: list[CoverageLimit] = Field(default_factory=list)
    document_type: str = "ACORD_25"
    is_valid: bool = True
    validation_errors: list[str] = Field(default_factory=list)
    field_sources: dict[str, FieldSource] = Field(default_factory=dict)
```

---

## 4. Field Provenance & Grounding Verification

A critical enterprise requirement is auditability: teams must verify exactly which page and text snippet produced an extracted value.

### 4.1 Regex Route Provenance
1. Document text is segmented into per-page indexed lines: `(page_number, line_text)`.
2. When a regular expression pattern matches, the engine captures `page_number` and `line_text`.
3. If a pattern spans multiple lines (e.g. multi-line header/value pairs), the composite matched line is retained.
4. Any unextracted field is explicitly recorded as `FieldSource(page=None, text_snippet=None)`.

### 4.2 LLM Route Provenance & Anti-Hallucination Verification
1. The LLM prompt explicitly requests `field_sources.<fieldName>` containing `page` and `text_snippet`.
2. Before returning the model, `verify_llm_sources()` performs substring verification:
   ```python
   norm_snippet = re.sub(r"\s+", " ", snippet).lower()
   norm_page = re.sub(r"\s+", " ", page_content).lower()
   if norm_snippet in norm_page:
       # Provenance verified: accept source
   else:
       # Grounding failed (hallucinated or wrong page): mark as without source
       verified[name] = FieldSource(page=None, text_snippet=None)
   ```
3. This guarantees that no hallucinated or misattributed text fragments can be passed off as authentic document citations.

---

## 5. Benchmark Evaluation Framework

The system incorporates an automated evaluation harness in `scripts/`:
- `scripts/generar_dataset_evaluacion.py`: Generates 40 synthetic ground-truth labeled documents (20 Invoices and 20 ACORD 25 Certificates) across PDF and XLSX formats.
- `scripts/evaluar.py`: Executes deterministic evaluation, compares predicted vs ground truth values, checks LLM health, and generates `evals/results.json` and `evals/results.md`.

### Summary Benchmark Performance
- **ACORD 25 Accuracy (Regex)**: **100.0%** across all fields (`insured_name`, `insurer_name`, `policy_number`, `effective_date`, `expiration_date`, `coverage_limits`).
- **Invoice Accuracy (Regex)**: **100.0%** on identifiers (`issuer_name`, `issuer_vat`, `invoice_number`, `invoice_date`, `currency`), and **90.0%** on arithmetic totals (`subtotal`, `tax_amount`, `total`) due to extreme decimal notation variations.
- **LLM Accuracy**: Realistically reported as `NO EJECUTADO` when the local Ollama instance is not running.

---

## 6. Known Limitations & Mitigation Strategies

| Limitation | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Low-DPI Scans (< 150 DPI)** | Tesseract character recognition errors (e.g. `8` as `B`) | Recommend client scanner configuration at 300 DPI or higher. |
| **Merged Cells in Complex XLSX** | Unaligned text lines in custom spreadsheet templates | Use LLM extraction route for non-standard spreadsheets. |
| **Handwritten Annotations** | Unparsed handwritten marks or signatures | Out of scope for current OCR; requires handwriting specialized models (e.g. TrOCR). |
| **LLM Network Offline** | 502/Connection error when `method=llm` is requested without active server | Caller application should fallback to `method=regex` upon connection failure. |
