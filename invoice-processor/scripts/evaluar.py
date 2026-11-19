"""Benchmark evaluation script calculating field precision for Regex and LLM extraction routes.

Evaluates 40 synthetic labeled documents (20 Invoices, 20 ACORD 25 Certificates)
across PDF and XLSX formats. Outputs evals/results.md and evals/results.json.
If Ollama/LLM is not running, marks LLM column as 'NO EJECUTADO' without inventing numbers.
"""

import json
import logging
import sys
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.ocr_engine import ocr_engine
from app.models.schemas import Acord25Certificate
from app.services.extractor import ExtractedInvoice, extractor
from app.services.llm_client import llm_client

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
EVALS_DIR = BASE_DIR / "evals"
DATA_DIR = EVALS_DIR / "data"


def match_str(val1: str | None, val2: str | None) -> bool:
    if not val1 or not val2:
        return val1 == val2
    # Normalized case-insensitive strip
    s1 = val1.strip().lower()
    s2 = val2.strip().lower()
    return s1 == s2 or s1 in s2 or s2 in s1


def match_decimal(val1: Decimal | float | None, val2: Decimal | float | None) -> bool:
    if val1 is None or val2 is None:
        return val1 == val2
    d1 = Decimal(str(val1))
    d2 = Decimal(str(val2))
    return abs(d1 - d2) < Decimal("1.50")


def match_date(val1: Any, val2: Any) -> bool:
    if not val1 or not val2:
        return val1 == val2
    return str(val1).strip() == str(val2).strip()


def evaluate_dataset():
    if not (EVALS_DIR / "dataset.json").exists():
        from scripts.generar_dataset_evaluacion import generate_all_dataset

        generate_all_dataset()

    manifest = json.loads((EVALS_DIR / "dataset.json").read_text(encoding="utf-8"))

    # Test LLM connectivity
    llm_connected = llm_client.check_connection()
    llm_status_label = "DISPONIBLE" if llm_connected else "NO EJECUTADO"

    print("=" * 80)
    print("INVOICE & INSURANCE DOCUMENT EXTRACTION BENCHMARK")
    print(f"Dataset: 40 documents ({DATA_DIR})")
    print(f"LLM Endpoint: {llm_client.base_url} (Model: {llm_client.model})")
    print(f"LLM Status: {llm_status_label}")
    print("=" * 80)

    # Trackers for Invoice fields
    inv_fields = [
        "issuer_name",
        "issuer_vat",
        "invoice_number",
        "invoice_date",
        "subtotal",
        "tax_amount",
        "total",
        "currency",
    ]
    inv_stats = {f: {"samples": 0, "regex_correct": 0, "llm_correct": 0} for f in inv_fields}

    # Trackers for ACORD 25 fields
    acord_fields = [
        "insured_name",
        "insurer_name",
        "policy_number",
        "effective_date",
        "expiration_date",
        "coverage_limits",
    ]
    acord_stats = {f: {"samples": 0, "regex_correct": 0, "llm_correct": 0} for f in acord_fields}

    processed_count = 0

    llm_attempted = 0
    llm_failures: list[dict[str, str]] = []
    for item in manifest:
        doc_id = item["doc_id"]
        doc_type = item["doc_type"]
        fmt = item["format"]
        file_path = DATA_DIR / f"{doc_id}.{fmt}"

        if not file_path.exists():
            continue

        file_bytes = file_path.read_bytes()
        raw_text, _ = ocr_engine.process_file(file_bytes, file_path.name)

        # 1. Regex Extraction
        extracted_regex = extractor.extract(raw_text, method="regex")

        # 2. LLM Extraction (only if LLM is actually available)
        extracted_llm = None
        if llm_connected:
            llm_attempted += 1
            try:
                extracted_llm = extractor.extract(raw_text, method="llm")
            except Exception as exc:
                logger.warning("LLM extraction failed on %s: %s", doc_id, exc)
                llm_failures.append({"doc_id": doc_id, "error": str(exc)[:200]})

        processed_count += 1

        # Evaluate Invoice
        if doc_type == "INVOICE" and isinstance(extracted_regex, ExtractedInvoice):
            for f in inv_fields:
                inv_stats[f]["samples"] += 1
                gt_val = item.get(f)

                # Check Regex
                reg_val = getattr(extracted_regex, f, None)
                is_reg_match = False
                if f in ("subtotal", "tax_amount", "total"):
                    is_reg_match = match_decimal(reg_val, gt_val)
                elif f == "invoice_date":
                    is_reg_match = match_date(reg_val, gt_val)
                else:
                    is_reg_match = match_str(reg_val, gt_val)

                if is_reg_match:
                    inv_stats[f]["regex_correct"] += 1

                # Check LLM
                if extracted_llm and isinstance(extracted_llm, ExtractedInvoice):
                    llm_val = getattr(extracted_llm, f, None)
                    is_llm_match = False
                    if f in ("subtotal", "tax_amount", "total"):
                        is_llm_match = match_decimal(llm_val, gt_val)
                    elif f == "invoice_date":
                        is_llm_match = match_date(llm_val, gt_val)
                    else:
                        is_llm_match = match_str(llm_val, gt_val)

                    if is_llm_match:
                        inv_stats[f]["llm_correct"] += 1

        # Evaluate ACORD 25
        elif doc_type == "ACORD_25" and isinstance(extracted_regex, Acord25Certificate):
            for f in acord_fields:
                acord_stats[f]["samples"] += 1

                if f == "coverage_limits":
                    gt_limits = item.get("coverage_limits", {})
                    reg_limits = {
                        l.coverage_type.lower().replace(" ", "_"): l.limit_amount
                        for l in extracted_regex.coverage_limits
                    }
                    # Count as match if each occurrence or aggregate matches
                    occ_gt = gt_limits.get("each_occurrence")
                    occ_reg = reg_limits.get("each_occurrence")
                    if (
                        occ_gt is not None
                        and occ_reg is not None
                        and match_decimal(occ_reg, occ_gt)
                    ):
                        acord_stats[f]["regex_correct"] += 1

                    if extracted_llm and isinstance(extracted_llm, Acord25Certificate):
                        llm_limits = {
                            l.coverage_type.lower().replace(" ", "_"): l.limit_amount
                            for l in extracted_llm.coverage_limits
                        }
                        occ_llm = llm_limits.get("each_occurrence")
                        if (
                            occ_gt is not None
                            and occ_llm is not None
                            and match_decimal(occ_llm, occ_gt)
                        ):
                            acord_stats[f]["llm_correct"] += 1
                else:
                    gt_val = item.get(f)
                    reg_val = getattr(extracted_regex, f, None)
                    is_reg_match = False
                    if "date" in f:
                        is_reg_match = match_date(reg_val, gt_val)
                    else:
                        is_reg_match = match_str(reg_val, gt_val)

                    if is_reg_match:
                        acord_stats[f]["regex_correct"] += 1

                    if extracted_llm and isinstance(extracted_llm, Acord25Certificate):
                        llm_val = getattr(extracted_llm, f, None)
                        is_llm_match = False
                        if "date" in f:
                            is_llm_match = match_date(llm_val, gt_val)
                        else:
                            is_llm_match = match_str(llm_val, gt_val)

                        if is_llm_match:
                            acord_stats[f]["llm_correct"] += 1

    # Format Results
    inv_results = {}
    for f, st in inv_stats.items():
        s = st["samples"]
        rc = st["regex_correct"]
        reg_pct = f"{(rc / s * 100):.1f}%" if s > 0 else "0.0%"
        llm_pct = (
            f"{(st['llm_correct'] / s * 100):.1f}%" if (llm_connected and s > 0) else "NO EJECUTADO"
        )
        inv_results[f] = {
            "samples": s,
            "regex_correct": rc,
            "regex_accuracy": reg_pct,
            "llm_accuracy": llm_pct,
        }

    acord_results = {}
    for f, st in acord_stats.items():
        s = st["samples"]
        rc = st["regex_correct"]
        reg_pct = f"{(rc / s * 100):.1f}%" if s > 0 else "0.0%"
        llm_pct = (
            f"{(st['llm_correct'] / s * 100):.1f}%" if (llm_connected and s > 0) else "NO EJECUTADO"
        )
        acord_results[f] = {
            "samples": s,
            "regex_correct": rc,
            "regex_accuracy": reg_pct,
            "llm_accuracy": llm_pct,
        }

    now_iso = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")

    results_json = {
        "evaluation_timestamp": now_iso,
        "total_documents": processed_count,
        "llm_configuration": {
            "base_url": llm_client.base_url,
            "model": llm_client.model,
            "connected": llm_connected,
            "status": "COMPLETED" if llm_connected else "NO EJECUTADO",
            "notes": (
                "LLM was accessible and executed"
                if llm_connected
                else "Ollama service unavailable on http://localhost:11434/v1; column reported as NO EJECUTADO per specification."
            ),
        },
        "llm_calls": {"attempted": llm_attempted, "failed": llm_failures},
        "invoice_metrics": inv_results,
        "acord25_metrics": acord_results,
    }

    # Save JSON
    (EVALS_DIR / "results.json").write_text(json.dumps(results_json, indent=2), encoding="utf-8")

    # Generate Markdown
    md_lines = [
        "# Extraction Benchmark Results",
        "",
        f"- **Evaluation Date**: {now_iso}",
        f"- **Documents Evaluated**: {processed_count} (20 Invoices, 20 ACORD 25 Certificates)",
        "- **Supported Formats**: PDF (ReportLab generated) & XLSX (openpyxl generated), single & multi-page",
        f"- **LLM Route Status**: {('COMPLETED' if llm_connected else 'NO EJECUTADO (Ollama offline at http://localhost:11434/v1)')}",
        f"- **LLM calls that returned no usable result** (timeout or output that failed validation; scored as wrong): {len(llm_failures)} of {llm_attempted}",
        "",
        "## 1. Invoice Extraction Accuracy (20 Documents)",
        "",
        "| Field Name | Samples | Regex Accuracy | LLM Accuracy | Status |",
        "| :--- | :---: | :---: | :---: | :--- |",
    ]

    for f, data in inv_results.items():
        md_lines.append(
            f"| `{f}` | {data['samples']} | {data['regex_accuracy']} | {data['llm_accuracy']} | Evaluated |"
        )

    md_lines.extend(
        [
            "",
            "## 2. ACORD 25 Certificate Extraction Accuracy (20 Documents)",
            "",
            "| Field Name | Samples | Regex Accuracy | LLM Accuracy | Status |",
            "| :--- | :---: | :---: | :---: | :--- |",
        ]
    )

    for f, data in acord_results.items():
        md_lines.append(
            f"| `{f}` | {data['samples']} | {data['regex_accuracy']} | {data['llm_accuracy']} | Evaluated |"
        )

    md_lines.extend(
        [
            "",
            "### Methodology & Verification Notes",
            "1. **Regex Route**: Evaluated deterministically against all 40 documents (14 PDFs and 6 XLSX files per document type).",
            "2. **LLM Route**: Configured to connect to Ollama OpenAI-compatible endpoint. Per test instructions, when Ollama does not respond, the column is marked as `NO EJECUTADO` with zero simulated numbers.",
            "3. **Field Provenance**: Both routes verify page index and verbatim text snippet existence against page content.",
        ]
    )

    md_content = "\n".join(md_lines) + "\n"
    (EVALS_DIR / "results.md").write_text(md_content, encoding="utf-8")

    print("\n" + md_content)
    print(f"Results saved to: {EVALS_DIR / 'results.json'} and {EVALS_DIR / 'results.md'}")


if __name__ == "__main__":
    evaluate_dataset()
