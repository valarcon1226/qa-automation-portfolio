# Extraction Benchmark Results

- **Evaluation Date**: 2026-11-19 19:28:47 UTC
- **Documents Evaluated**: 40 (20 Invoices, 20 ACORD 25 Certificates)
- **Supported Formats**: PDF (ReportLab generated) & XLSX (openpyxl generated), single & multi-page
- **LLM Route Status**: COMPLETED
- **LLM calls that returned no usable result** (timeout or output that failed validation; scored as wrong): 1 of 40

## 1. Invoice Extraction Accuracy (20 Documents)

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

## 2. ACORD 25 Certificate Extraction Accuracy (20 Documents)

| Field Name | Samples | Regex Accuracy | LLM Accuracy | Status |
| :--- | :---: | :---: | :---: | :--- |
| `insured_name` | 20 | 100.0% | 100.0% | Evaluated |
| `insurer_name` | 20 | 100.0% | 100.0% | Evaluated |
| `policy_number` | 20 | 100.0% | 100.0% | Evaluated |
| `effective_date` | 20 | 100.0% | 100.0% | Evaluated |
| `expiration_date` | 20 | 100.0% | 100.0% | Evaluated |
| `coverage_limits` | 20 | 100.0% | 100.0% | Evaluated |

### Methodology & Verification Notes
1. **Regex Route**: Evaluated deterministically against all 40 documents (14 PDFs and 6 XLSX files per document type).
2. **LLM Route**: Configured to connect to Ollama OpenAI-compatible endpoint. Per test instructions, when Ollama does not respond, the column is marked as `NO EJECUTADO` with zero simulated numbers.
3. **Field Provenance**: Both routes verify page index and verbatim text snippet existence against page content.
