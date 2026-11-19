# Automated SEO & AEO Client Audit Engine

Automated diagnostic and reporting tool built with Python (CLI + FastAPI). Analyzes **Technical SEO, On-Page factors, Core Web Vitals (via headless Lighthouse), and Answer Engine Optimization (AEO for ChatGPT, Perplexity, and Gemini)**, generating client-ready reports in HTML and PDF formats.

---

## Capabilities & Audit Scope

### 1. On-Page SEO Checks
- **Title Tag (`<title>`)**: Checks presence, optimal length (30–60 characters), and detects duplicate titles.
- **Meta Description**: Checks presence, optimal length (70–160 characters), and content completeness.
- **Heading Tag (`<h1>`)**: Validates exactly one H1 per page (flags missing or multiple H1 tags).
- **Heading Hierarchy**: Enforces sequential heading progression (prevents arbitrary skips such as H1 to H3 or H4).
- **Canonical URL (`rel="canonical"`)**: Verifies absolute URLs to prevent duplicate content indexing.
- **Language Declaration (`<html lang="...">`)**: Checks language code declaration for search engine accessibility.
- **Open Graph Metadata**: Validates `og:title`, `og:description`, `og:image`, and `og:url` for social and chat previews.
- **Images**: Flags images lacking `alt` attributes and identifies heavy assets (> 200 KB).
- **Internal Links**: Extracts same-domain internal links and detects broken links (HTTP 404 / 500).
- **Structured Data (JSON-LD)**: Validates JSON syntax and extracts schema types (`LocalBusiness`, `Restaurant`, `FAQPage`, `HowTo`, etc.).

### 2. Site-Wide Technical SEO Checks
- **`sitemap.xml`**: Verifies existence at root, validates XML format, and counts listed URLs.
- **`robots.txt`**: Verifies existence, crawl directives, and sitemap reference.
- **`llms.txt`**: Checks for the emerging machine-readable standard for LLM crawler indexing.
- **HTTPS Enforcement**: Verifies active SSL/TLS certificates and automatic HTTPS redirects.
- **Orphan Page Detection**: Identifies URLs declared in `sitemap.xml` that lack internal links.

### 3. AEO (Answer Engine Optimization) Score (0 to 100)
Evaluates site readiness for conversational AI agents and answer engines:
1. **Questions as Headings (25 pts)**: Identifies headings formatted as common customer questions.
2. **Concise Direct Answers (25 pts)**: Checks for immediate, concise answer paragraphs (< 300 characters) under question headings.
3. **Structured Schema Data (25 pts)**: Verifies `FAQPage`, `HowTo`, or `LocalBusiness` JSON-LD schemas to ground AI summaries.
4. **Plaintext Contact & Hours (25 pts)**: Ensures phone numbers, email addresses, physical locations, and business hours are rendered as plaintext in the HTML body rather than trapped in images.

### 4. Core Web Vitals (Headless Lighthouse)
- Runs headless `npx lighthouse` against the target landing page.
- Extracts official scores across 4 categories: **Performance, Accessibility, Best Practices, and SEO**.
- Includes a graceful fallback if Lighthouse or Chrome/Edge is unavailable in the execution environment.

### 5. Multi-Format Reporting (HTML & PDF)
- **Responsive HTML**: High-contrast, responsive report with visual scorecards, AEO breakdown, detected strengths, and prioritized issue tables with remediation advice.
- **Executive Summary**: Generates a dynamic, prioritized executive summary (with local LLM integration via Ollama if available, falling back to deterministic template-driven synthesis).
- **Headless PDF Export**: Direct PDF generation using Microsoft Edge / Chromium headless printing.

---

## Installation & Setup

### Prerequisites
- Python 3.12+ (or `uv`)
- Node.js and npm (optional, required only for Lighthouse)
- Microsoft Edge or Google Chrome (installed on the host system)

### Virtual Environment Setup:
```powershell
cd seo-aeo-audit
uv venv .venv
uv pip install -p .venv\Scripts\python.exe -r requirements-dev.txt
```

---

## Usage Guide

### 1. Command-Line Interface (CLI)

Audit a public website:
```powershell
.venv\Scripts\python.exe -m app.cli https://ejemplo.com --max-pages 10 --output samples/informe.html --pdf samples/informe.pdf
```

Audit a local development server (bypassing SSRF localhost protection):
```powershell
.venv\Scripts\python.exe -m app.cli http://localhost:8016 --allow-local --max-pages 5 --output samples/informe-local.html
```

#### CLI Parameters:
- `url`: Target website URL to audit (`http://` or `https://`).
- `--max-pages`: Maximum pages to crawl within the same domain (default: `10`).
- `--allow-local`: Allows auditing `localhost` and private RFC-1918 IP addresses for development.
- `--skip-lighthouse`: Bypasses Lighthouse analysis for fast runs.
- `--lang`: Report output language (`es` or `en`, default: `es`).
- `-o, --output`: Output path for the generated HTML report.
- `--pdf`: Output path for the exported PDF report.

---

### 2. REST API (FastAPI)

Start the API server:
```powershell
.venv\Scripts\python.exe -m uvicorn app.api:app --host 0.0.0.0 --port 8021 --reload
```

Interactive OpenAPI documentation is available at: `http://localhost:8021/docs`

#### Main Endpoints:
- `GET /health`: Service health check.
- `POST /audit`: Returns full structured audit results as JSON.
- `POST /audit/html`: Returns the rendered HTML audit report.
- `POST /audit/pdf`: Generates and downloads the audit report as a PDF.

Sample `curl` request:
```bash
curl -X POST http://localhost:8021/audit \
  -H "Content-Type: application/json" \
  -d '{"url": "https://ejemplo.com", "max_pages": 5, "lang": "es"}'
```

---

## Automated Tests & Code Quality

The test suite includes 28 unit and integration tests covering crawl logic, check validators, schema parsing, and API endpoints:

```powershell
# Run test suite
.venv\Scripts\python.exe -m pytest -q

# Code formatting and linting
.venv\Scripts\ruff.exe check .
```

---

## Project Structure

```text
seo-aeo-audit/
├── app/
│   ├── config.py             # Constants, scoring weights, and thresholds
│   ├── validators.py         # URL validation and SSRF protection
│   ├── crawler.py            # Asynchronous crawler respecting robots.txt
│   ├── checks/
│   │   ├── seo_page.py       # Title, meta, H1, hierarchy, canonical, OG, images, links, JSON-LD
│   │   ├── seo_site.py       # Sitemap.xml, robots.txt, llms.txt, HTTPS, orphan pages
│   │   └── aeo.py            # Questions, concise answers, schema, plaintext contact (0-100)
│   ├── lighthouse.py         # Headless Lighthouse runner with fallback
│   ├── reporting/
│   │   ├── generator.py      # Unified audit model, executive summaries, translations
│   │   ├── pdf.py            # Headless PDF export via Edge/Chromium
│   │   └── templates/
│   │       └── report.html   # Client-facing responsive HTML template
│   ├── api.py                # FastAPI endpoints
│   └── cli.py                # CLI entrypoint
├── docs/
│   ├── DEMO-SCRIPT.md        # Walkthrough demo guide
│   └── WEBFLOW-GUIA.md       # Step-by-step Webflow implementation reference
├── samples/                  # Pre-generated sample reports
├── tests/                    # 28 pytest unit and integration tests
├── pyproject.toml            # Ruff and pytest configuration
├── requirements.txt          # Production dependencies
└── requirements-dev.txt      # Development dependencies
```
