# Client Implementation & Deployment Guide

This guide provides end-to-end instructions for deploying, configuring, operating, and extending the `invoice-processor` service on client infrastructure.

---

## 1. System Requirements & Prerequisites

### 1.1 Hardware Specifications
- **Minimal (Sync API & Regex-only)**: 2 vCPU, 4 GB RAM, 20 GB Disk.
- **Production (Async Celery Workers + OCR)**: 4 vCPU, 8 GB RAM, 50 GB Disk.
- **Local LLM Inference (Optional - Ollama)**: 8+ vCPU or 1x NVIDIA GPU (8GB+ VRAM), 16 GB RAM.

### 1.2 System Packages (Linux / Ubuntu / Debian)
```bash
sudo apt-get update && sudo apt-get install -y \
    python3.12 \
    python3.12-venv \
    tesseract-ocr \
    tesseract-ocr-spa \
    tesseract-ocr-eng \
    poppler-utils \
    curl
```

*(On Windows, install Tesseract OCR and Poppler binaries and ensure their `bin` directories are added to the system `PATH`.)*

### 1.3 Local Virtual Environment Setup
```bash
# Clone the repository and navigate to the project directory
cd invoice-processor

# Create Python 3.12 virtual environment
python3.12 -m venv .venv
source .venv/bin/activate  # Windows: .\.venv\Scripts\Activate.ps1

# Install required dependencies
pip install -r requirements.txt
```

---

## 2. Configuration & Environment Variables

Copy `.env.example` to `.env` and adjust the variables for the target client environment:

```ini
# Security & Authentication
API_BEARER_TOKEN=client_production_secret_token_change_me
MAX_SYNC_PAGES=5

# LLM Engine (OpenAI-compatible)
# Option A: Local Ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=qwen3:4b-instruct-2507-q4_K_M
LLM_API_KEY=ollama

# Option B: Managed OpenAI or vLLM
# LLM_BASE_URL=https://api.openai.com/v1
# LLM_MODEL=gpt-4o-mini
# LLM_API_KEY=sk-proj-...

# Database Configuration (PostgreSQL)
DATABASE_URL=postgresql://user:secure_password@postgres:5432/invoices

# Asynchronous Task Queue (Redis)
REDIS_URL=redis://redis:6379/0

# Object Storage (MinIO or AWS S3)
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=secure_minio_password
MINIO_BUCKET=invoices-bucket
MINIO_SECURE=false

# OCR Engine Path
TESSERACT_CMD=tesseract
```

---

## 3. How to Add a New Document Type

Follow this 5-step tutorial to introduce a new document type (e.g. **Bill of Lading / Guía de Transporte**).

### Step 1: Define the Pydantic Schema
In `app/models/schemas.py`, define the new document schema including `field_sources`:

```python
class BillOfLading(BaseModel):
    bol_number: str | None = None
    carrier_name: str | None = None
    shipper_name: str | None = None
    consignee_name: str | None = None
    ship_date: date | None = None
    total_weight_kg: Decimal | None = None
    document_type: str = "BILL_OF_LADING"
    is_valid: bool = True
    validation_errors: list[str] = Field(default_factory=list)
    field_sources: dict[str, FieldSource] = Field(default_factory=dict)
```

### Step 2: Register Document Type Detection
In `app/services/extractor.py`, update `detect_document_type(text: str)`:

```python
def detect_document_type(text: str) -> str:
    upper = text.upper()
    if "BILL OF LADING" in upper or "GUIA DE TRANSPORTE" in upper or "CARRIER:" in upper:
        return "BILL_OF_LADING"
    if "ACORD 25" in upper or "CERTIFICATE OF LIABILITY INSURANCE" in upper:
        return "ACORD_25"
    return "INVOICE"
```

### Step 3: Implement Regex & LLM Extraction Methods
In `app/services/extractor.py`, add `_extract_bol_regex` and `_extract_bol_llm`:

```python
def _extract_bol_regex(self, pages: list[str]) -> BillOfLading:
    bol = BillOfLading()
    field_sources: dict[str, FieldSource] = {}
    # Parse indexed lines from pages
    # Apply regex patterns and populate bol fields and field_sources
    bol.field_sources = field_sources
    return bol

def _extract_bol_llm(self, text: str, pages: list[str]) -> BillOfLading:
    result: BillOfLading = llm_client.extract_structured(
        prompt=self._build_document_prompt(pages),
        schema_cls=BillOfLading,
        system_prompt="You are an expert shipping documents analyst...",
    )
    result.field_sources = verify_llm_sources(result.field_sources, pages)
    return result
```

Update `InvoiceExtractor.extract()` to route to the new handler when `detected_type == "BILL_OF_LADING"`.

### Step 4: Add HTTP Route
In `app/api/routes.py`, add the synchronous endpoint:

```python
@router.post(
    "/api/v1/logistics/bol/process",
    response_model=BillOfLading,
    dependencies=[Depends(verify_bearer_token)],
)
async def process_bol(
    file: UploadFile = File(...),
    method: str = Query("regex", description="'regex' or 'llm'"),
):
    filename, content = await _read_upload(file)
    raw_text, _ = ocr_engine.process_file(content, filename)
    return extractor.extract(raw_text, method=method, doc_type="BILL_OF_LADING")
```

### Step 5: Add Automated Unit Tests
Create `tests/test_bill_of_lading.py` verifying detection, regex extraction, provenance page mapping, and LLM retry validation.

---

## 4. Production Operations Runbook

### 4.1 Running with Docker Compose (Recommended)
```bash
# Build and start the stack in detached mode
docker compose up -d --build

# Verify container status
docker compose ps

# Check API health
curl http://localhost:8005/health
```

### 4.2 Running Standalone Services
```bash
# 1. Start FastAPI API Server
uvicorn app.main:app --host 0.0.0.0 --port 8005 --workers 4

# 2. Start Celery Worker for background multi-page documents
celery -A app.core.celery_app.celery_app worker --loglevel=info --concurrency=4
```

### 4.3 Health Check Monitoring
Send an unauthenticated request to `/health`:
```bash
curl -X GET http://127.0.0.1:8005/health
```
**Expected Response:**
```json
{
  "status": "ok",
  "service": "invoice-processor"
}
```

### 4.4 Data Maintenance & Retention
- **MinIO/S3**: Original documents and `.ocr.txt` sidecars are stored under `invoices/YYYY/MM/<uuid>_<filename>`. Establish lifecycle rules to archive objects older than 365 days if compliance policies require.
- **PostgreSQL**: Run automated daily logical dumps:
  ```bash
  pg_dump -U user -h localhost -d invoices -Fc > backup_invoices_$(date +%F).dump
  ```
