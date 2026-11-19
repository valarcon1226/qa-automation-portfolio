"""Text extraction service for invoices and insurance documents (ACORD 25).

Supports both rule-based (regex) and OpenAI-compatible LLM extraction routes,
with exact page-level source snippet provenance tracking and verification.
"""

import logging
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal

from app.models.schemas import (
    Acord25Certificate,
    CoverageLimit,
    FieldSource,
    InvoiceResponse,
    LineItemSchema,
)
from app.services.llm_client import llm_client

logger = logging.getLogger(__name__)


@dataclass
class ExtractedLineItem:
    description: str
    quantity: Decimal
    unit_price: Decimal
    line_total: Decimal


@dataclass
class ExtractedInvoice:
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
    currency: str | None = "COP"
    line_items: list[ExtractedLineItem] = field(default_factory=list)
    field_sources: dict[str, FieldSource] = field(default_factory=dict)
    document_type: str = "INVOICE"

    def to_invoice_response(self) -> InvoiceResponse:
        return InvoiceResponse(
            issuer_name=self.issuer_name,
            issuer_vat=self.issuer_vat,
            recipient_name=self.recipient_name,
            recipient_vat=self.recipient_vat,
            invoice_number=self.invoice_number,
            invoice_date=self.invoice_date,
            due_date=self.due_date,
            subtotal=self.subtotal,
            tax_rate=self.tax_rate,
            tax_amount=self.tax_amount,
            total=self.total,
            currency=self.currency,
            line_items=[
                LineItemSchema(
                    description=it.description,
                    quantity=it.quantity,
                    unit_price=it.unit_price,
                    line_total=it.line_total,
                )
                for it in self.line_items
            ],
            field_sources=self.field_sources,
            document_type=self.document_type,
        )


def clean_number_str(raw: str) -> str:
    """Removes currency symbols and extraneous whitespace."""
    s = re.sub(r"[^\d.,\-]", "", raw).strip()
    return s


def parse_decimal(raw: str | None) -> Decimal | None:
    """Parses numeric amount supporting both dot and comma decimal notations."""
    if not raw:
        return None
    cleaned = clean_number_str(raw)
    if not cleaned:
        return None

    try:
        # Both dot and comma present
        if "." in cleaned and "," in cleaned:
            if cleaned.rfind(",") > cleaned.rfind("."):
                # Format: 1.250.000,50
                normalized = cleaned.replace(".", "").replace(",", ".")
            else:
                # Format: 1,250,000.50
                normalized = cleaned.replace(",", "")
            return Decimal(normalized)

        # Only comma present
        if "," in cleaned:
            parts = cleaned.split(",")
            if len(parts[-1]) == 2:
                # Format: 1500,50
                normalized = cleaned.replace(",", ".")
            else:
                # Format: 1,500,000
                normalized = cleaned.replace(",", "")
            return Decimal(normalized)

        # Only dot present
        if "." in cleaned:
            parts = cleaned.split(".")
            # If last part is 3 digits and multiple dots exist, thousands separator
            if len(parts) > 2 or (len(parts) == 2 and len(parts[-1]) == 3 and int(parts[0]) > 0):
                normalized = cleaned.replace(".", "")
            else:
                normalized = cleaned
            return Decimal(normalized)

        return Decimal(cleaned)
    except Exception:
        return None


def parse_date(raw: str | None) -> date | None:
    """Parses date string into date object."""
    if not raw:
        return None
    cleaned = raw.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None


def detect_document_type(text: str) -> str:
    """Detects whether text corresponds to an ACORD 25 certificate or an invoice."""
    upper = text.upper()
    acord_score = 0
    invoice_score = 0

    if "ACORD 25" in upper or "CERTIFICATE OF LIABILITY INSURANCE" in upper:
        acord_score += 10
    if "CERTIFICATE DOES NOT AFFIRMATIVELY" in upper:
        acord_score += 5
    if "INSURER(S) AFFORDING COVERAGE" in upper:
        acord_score += 4
    if "GENERAL LIABILITY" in upper:
        acord_score += 3
    if "POLICY NUMBER" in upper and "COVERAGE" in upper:
        acord_score += 3
    if "CERTIFICADO DE SEGURO" in upper or "POLIZA DE SEGURO" in upper:
        acord_score += 4

    if "FACTURA" in upper or "INVOICE" in upper:
        invoice_score += 5
    if "NIT:" in upper or "RUT:" in upper or "VAT ID" in upper:
        invoice_score += 4
    if "FEV-" in upper or "FE-" in upper or "INV-" in upper:
        invoice_score += 3
    if "SUBTOTAL" in upper or "IVA (" in upper or "TOTAL A PAGAR" in upper:
        invoice_score += 4
    if "BILL TO" in upper or "DATOS DEL CLIENTE" in upper:
        invoice_score += 3

    if acord_score > invoice_score:
        return "ACORD_25"
    return "INVOICE"


def split_into_pages(text: str, pages: list[str] | None = None) -> list[str]:
    """Splits raw text into a list of per-page strings if not already provided."""
    if pages and len(pages) > 0:
        return pages
    # Split by standard page separators
    parts = re.split(r"(?:\f|--- PAGE BREAK ---|\n--- Page \d+ ---\n)", text)
    result = [p.strip() for p in parts if p.strip()]
    return result if result else [text]


def verify_llm_sources(
    field_sources: dict[str, FieldSource],
    pages: list[str],
) -> dict[str, FieldSource]:
    """Verifies that each text snippet extracted by LLM actually exists in that page text.

    If not found on that page, marks the field as without source (page=None, text_snippet=None).
    """
    verified: dict[str, FieldSource] = {}
    for name, src in field_sources.items():
        if src.page is not None and 1 <= src.page <= len(pages) and src.text_snippet:
            page_content = pages[src.page - 1]
            raw_snippet = src.text_snippet.strip()
            norm_snippet = re.sub(r"\s+", " ", raw_snippet).lower()
            norm_page = re.sub(r"\s+", " ", page_content).lower()

            if norm_snippet and norm_snippet in norm_page:
                verified[name] = FieldSource(page=src.page, text_snippet=raw_snippet)
                continue

        # If verification fails or source missing, mark as without source
        verified[name] = FieldSource(page=None, text_snippet=None)
    return verified


class InvoiceExtractor:
    """Extracts structured invoice or ACORD 25 information using regex or LLM."""

    def extract(
        self,
        text: str,
        method: str = "regex",
        doc_type: str | None = None,
        pages: list[str] | None = None,
    ) -> ExtractedInvoice | Acord25Certificate:
        """Main extraction entrypoint supporting 'regex' and 'llm' methods."""
        page_list = split_into_pages(text, pages)
        detected_type = doc_type or detect_document_type(text)

        if detected_type == "ACORD_25":
            if method.lower() == "llm":
                return self._extract_acord25_llm(text, page_list)
            return self._extract_acord25_regex(page_list)

        # Default to INVOICE
        if method.lower() == "llm":
            return self._extract_invoice_llm(text, page_list)
        return self._extract_invoice_regex(page_list)

    def _extract_invoice_regex(self, pages: list[str]) -> ExtractedInvoice:
        invoice = ExtractedInvoice()
        field_sources: dict[str, FieldSource] = {}

        # Build list of (page_num, line)
        indexed_lines: list[tuple[int, str]] = []
        for p_idx, p_text in enumerate(pages, start=1):
            for line_raw in p_text.splitlines():
                l_s = line_raw.strip()
                if l_s:
                    indexed_lines.append((p_idx, l_s))

        all_text = "\n".join(pages)

        # Determine currency
        if any(
            term in all_text for term in ("USD", "US $", "USA", "US-", "INVOICE", "Grand Total")
        ):
            invoice.currency = "USD"
        elif "EUR" in all_text or "€" in all_text:
            invoice.currency = "EUR"
        else:
            invoice.currency = "COP"

        # 1. Invoice Number
        inv_no_pattern = re.compile(
            r"(?:factura\s*(?:electr[oó]nica\s*)?(?:de\s*venta\s*)?(?:n[oó]\.?|n°|#)?|invoice\s*(?:n[oó]\.?|#)?)\s*[:|]?\s*([A-Za-z0-9\-]+)",
            re.IGNORECASE,
        )
        for p_num, line in indexed_lines:
            m = inv_no_pattern.search(line)
            if m:
                val = m.group(1).strip()
                if val.lower() not in ("de", "electrónica", "electronica", "venta", "no", "date"):
                    invoice.invoice_number = val
                    field_sources["invoice_number"] = FieldSource(page=p_num, text_snippet=line)
                    break

        # 2. Issuer VAT (NIT or VAT ID)
        nit_pattern = re.compile(
            r"(?:nit|vat(?:\s*id)?|rut|tax\s*id)\s*(?:emisor|proveedor)?\s*[:|]?\s*([0-9]{1,3}(?:\.[0-9]{3}){2}-[0-9]|[0-9]{9,10}-[0-9]|[0-9]{9,10}|[A-Z0-9\-]{7,15})",
            re.IGNORECASE,
        )
        for p_num, line in indexed_lines:
            m = nit_pattern.search(line)
            if m:
                invoice.issuer_vat = m.group(1).strip()
                field_sources["issuer_vat"] = FieldSource(page=p_num, text_snippet=line)
                break

        # 3. Issuer Name
        issuer_label_pattern = re.compile(
            r"(?:emisor|raz[oó]n\s*social|proveedor|company|issuer|datos\s*del\s*emisor)\s*[:|]?\s*([A-Za-z0-9ÁÉÍÓÚáéíóúñÑ\s.,&'-]*)",
            re.IGNORECASE,
        )
        for i, (p_num, line) in enumerate(indexed_lines):
            m = issuer_label_pattern.search(line)
            if m:
                name = m.group(1).strip()
                match_line = line
                if (not name or len(name) < 3) and i + 1 < len(indexed_lines):
                    next_p, next_l = indexed_lines[i + 1]
                    if len(next_l) > 3 and not re.search(
                        r"(nit|factura|invoice|tel|dir|cliente)", next_l, re.IGNORECASE
                    ):
                        name = next_l.strip()
                        p_num = next_p
                        match_line = next_l
                if len(name) > 3:
                    invoice.issuer_name = name
                    field_sources["issuer_name"] = FieldSource(page=p_num, text_snippet=match_line)
                    break

        if not invoice.issuer_name:
            for p_num, line in indexed_lines[:15]:
                cleaned = re.sub(
                    r"\s+\b(?:factura|invoice|de\s*venta|electr[oó]nica)\b.*$",
                    "",
                    line,
                    flags=re.IGNORECASE,
                ).strip()
                if (
                    not re.search(
                        r"\b(?:factura|invoice|nit|fecha|date|p[aá]gina|page|tel|direcci[oó]n|"
                        r"address|documento|ficticio|legal|validez|datos|cliente|adquirente|customer|"
                        r"contrato|manual|anexo|informe|cl[aá]usula)\b",
                        cleaned,
                        re.IGNORECASE,
                    )
                    and len(cleaned) > 3
                ):
                    invoice.issuer_name = cleaned
                    field_sources["issuer_name"] = FieldSource(page=p_num, text_snippet=line)
                    break

        # 4. Recipient Name & VAT
        recipient_name_pattern = re.compile(
            r"(?:se[nñ]or(?:es)?|cliente|adquirente|bill\s*to|customer|recipient)\s*:?\s*([A-Za-z0-9ÁÉÍÓÚáéíóúñÑ\s.,&'-]+)",
            re.IGNORECASE,
        )
        recipient_vat_pattern = re.compile(
            r"(?:nit|cc|c\.c\.|id|vat)\s*(?:cliente|adquirente|comprador|recipient)?\s*:?\s*([0-9]{1,3}(?:\.[0-9]{3}){2}-[0-9]|[0-9]{6,12}-[0-9]|[0-9]{6,12})",
            re.IGNORECASE,
        )
        for p_num, line in indexed_lines:
            if not invoice.recipient_name:
                m = recipient_name_pattern.search(line)
                if m:
                    r_name = m.group(1).strip()
                    if len(r_name) > 2 and not re.search(
                        r"^(nit|cc|fecha|date)", r_name, re.IGNORECASE
                    ):
                        invoice.recipient_name = r_name
                        field_sources["recipient_name"] = FieldSource(page=p_num, text_snippet=line)
            if not invoice.recipient_vat:
                if "emisor" not in line.lower() and (
                    not invoice.issuer_vat or invoice.issuer_vat not in line
                ):
                    m = recipient_vat_pattern.search(line)
                    if m and m.group(1).strip() != invoice.issuer_vat:
                        invoice.recipient_vat = m.group(1).strip()
                        field_sources["recipient_vat"] = FieldSource(page=p_num, text_snippet=line)

        # 5. Dates
        date_pattern = re.compile(
            r"(?:fecha\s*(?:de\s*emisi[oó]n)?|date|invoice\s*date)\s*:?\s*([0-9]{4}[-/][0-9]{2}[-/][0-9]{2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})",
            re.IGNORECASE,
        )
        due_date_pattern = re.compile(
            r"(?:fecha\s*(?:de\s*)?vencimiento|due\s*date)\s*:?\s*([0-9]{4}[-/][0-9]{2}[-/][0-9]{2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})",
            re.IGNORECASE,
        )
        for p_num, line in indexed_lines:
            if not invoice.invoice_date:
                m = date_pattern.search(line)
                if m and "vencimiento" not in line.lower() and "due" not in line.lower():
                    invoice.invoice_date = parse_date(m.group(1))
                    if invoice.invoice_date:
                        field_sources["invoice_date"] = FieldSource(page=p_num, text_snippet=line)
            if not invoice.due_date:
                m = due_date_pattern.search(line)
                if m:
                    invoice.due_date = parse_date(m.group(1))
                    if invoice.due_date:
                        field_sources["due_date"] = FieldSource(page=p_num, text_snippet=line)

        if not invoice.invoice_date:
            standalone_date = re.compile(
                r"\b([0-9]{4}[-/][0-9]{2}[-/][0-9]{2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})\b"
            )
            for p_num, line in indexed_lines:
                m = standalone_date.search(line)
                if m:
                    parsed = parse_date(m.group(1))
                    if parsed:
                        invoice.invoice_date = parsed
                        field_sources["invoice_date"] = FieldSource(page=p_num, text_snippet=line)
                        break

        # 6. Totals & Tax
        subtotal_pattern = re.compile(
            r"\b(?:subtotal|sub-total|sub\s*total)[\s:|$]*([0-9.,]+)",
            re.IGNORECASE,
        )
        tax_pattern = re.compile(
            r"\b(?:iva|tax|impuesto)(?:\s*\(\s*([0-9]+(?:\.[0-9]+)?)\s*%\s*\)|\s*([0-9]+(?:\.[0-9]+)?)\s*%)?[\s:|$]*([0-9.,]+)?",
            re.IGNORECASE,
        )
        total_pattern = re.compile(
            r"\b(?:total(?:\s*a\s*pagar)?|grand\s*total|importe\s*total)[\s:|$]*([0-9.,]+)",
            re.IGNORECASE,
        )

        for i, (p_num, line) in enumerate(indexed_lines):
            candidate = line
            if i + 1 < len(indexed_lines):
                candidate = f"{line} {indexed_lines[i + 1][1]}"

            if invoice.subtotal is None:
                m = subtotal_pattern.search(line)
                if m:
                    invoice.subtotal = parse_decimal(m.group(1))
                    if invoice.subtotal is not None:
                        field_sources["subtotal"] = FieldSource(page=p_num, text_snippet=line)
                else:
                    m = subtotal_pattern.search(candidate)
                    if m:
                        invoice.subtotal = parse_decimal(m.group(1))
                        if invoice.subtotal is not None:
                            field_sources["subtotal"] = FieldSource(
                                page=p_num, text_snippet=candidate
                            )

            if invoice.tax_amount is None or invoice.tax_rate is None:
                m = tax_pattern.search(line)
                matched_snippet = line
                if not m:
                    m = tax_pattern.search(candidate)
                    matched_snippet = candidate
                if m:
                    rate_val = m.group(1) or m.group(2)
                    amt_val = m.group(3)
                    if rate_val and invoice.tax_rate is None:
                        invoice.tax_rate = parse_decimal(rate_val)
                        if invoice.tax_rate is not None:
                            field_sources["tax_rate"] = FieldSource(
                                page=p_num, text_snippet=matched_snippet
                            )
                    if amt_val and invoice.tax_amount is None:
                        invoice.tax_amount = parse_decimal(amt_val)
                        if invoice.tax_amount is not None:
                            field_sources["tax_amount"] = FieldSource(
                                page=p_num, text_snippet=matched_snippet
                            )

            if invoice.total is None:
                if not re.search(r"\bsub[- ]?total\b", line, re.IGNORECASE):
                    m = total_pattern.search(line)
                    if m:
                        invoice.total = parse_decimal(m.group(1))
                        if invoice.total is not None:
                            field_sources["total"] = FieldSource(page=p_num, text_snippet=line)
                if invoice.total is None and not re.search(
                    r"\bsub[- ]?total\b", candidate, re.IGNORECASE
                ):
                    m = total_pattern.search(candidate)
                    if m:
                        invoice.total = parse_decimal(m.group(1))
                        if invoice.total is not None:
                            field_sources["total"] = FieldSource(page=p_num, text_snippet=candidate)

        # 7. Line Items
        item_table_pattern = re.compile(
            r"^([A-Za-z0-9ÁÉÍÓÚáéíóúñÑ\s\-_/&.]+?)\s+[|,]?\s*(\d+(?:\.\d+)?)\s+[|,]?\s*([0-9.,]+)\s+[|,]?\s*([0-9.,]+)$"
        )
        for _, line in indexed_lines:
            if re.search(
                r"(descripci[oó]n|cantidad|precio|total|subtotal|iva|tax|nit|fecha|date|se[nñ]or|cliente)",
                line,
                re.IGNORECASE,
            ):
                continue
            m = item_table_pattern.match(line)
            if m:
                desc = m.group(1).strip()
                qty = parse_decimal(m.group(2))
                unit = parse_decimal(m.group(3))
                ltotal = parse_decimal(m.group(4))
                if desc and qty and unit and ltotal and len(desc) > 2:
                    invoice.line_items.append(
                        ExtractedLineItem(
                            description=desc,
                            quantity=qty,
                            unit_price=unit,
                            line_total=ltotal,
                        )
                    )

        # Fill default sources for any missing fields
        expected_fields = [
            "issuer_name",
            "issuer_vat",
            "recipient_name",
            "recipient_vat",
            "invoice_number",
            "invoice_date",
            "due_date",
            "subtotal",
            "tax_rate",
            "tax_amount",
            "total",
            "currency",
        ]
        for f in expected_fields:
            if f not in field_sources:
                field_sources[f] = FieldSource(page=None, text_snippet=None)

        invoice.field_sources = field_sources
        return invoice

    def _extract_invoice_llm(self, text: str, pages: list[str]) -> ExtractedInvoice:
        """Extracts invoice via OpenAI-compatible LLM reusing InvoiceResponse schema."""
        formatted_prompt = self._build_document_prompt(pages)

        system_prompt = (
            "You are an expert document extraction model specializing in invoices. "
            "Extract all invoice fields and their provenance (page number and verbatim snippet). "
            "For each field, include its exact source in 'field_sources': "
            "field_sources.<fieldName> = {'page': <page_int>, 'text_snippet': '<exact text>'}. "
            "If missing, set value to null and source to {'page': null, 'text_snippet': null}."
        )

        response: InvoiceResponse = llm_client.extract_structured(
            prompt=formatted_prompt,
            schema_cls=InvoiceResponse,
            system_prompt=system_prompt,
            max_retries=1,
        )

        verified_sources = verify_llm_sources(response.field_sources, pages)

        # Ensure expected fields have an entry
        for f in [
            "issuer_name",
            "issuer_vat",
            "recipient_name",
            "recipient_vat",
            "invoice_number",
            "invoice_date",
            "due_date",
            "subtotal",
            "tax_rate",
            "tax_amount",
            "total",
            "currency",
        ]:
            if f not in verified_sources:
                verified_sources[f] = FieldSource(page=None, text_snippet=None)

        return ExtractedInvoice(
            issuer_name=response.issuer_name,
            issuer_vat=response.issuer_vat,
            recipient_name=response.recipient_name,
            recipient_vat=response.recipient_vat,
            invoice_number=response.invoice_number,
            invoice_date=response.invoice_date,
            due_date=response.due_date,
            subtotal=response.subtotal,
            tax_rate=response.tax_rate,
            tax_amount=response.tax_amount,
            total=response.total,
            currency=response.currency or "COP",
            line_items=[
                ExtractedLineItem(
                    description=li.description or "",
                    quantity=li.quantity or Decimal("1"),
                    unit_price=li.unit_price or Decimal("0"),
                    line_total=li.line_total or Decimal("0"),
                )
                for li in response.line_items
            ],
            field_sources=verified_sources,
            document_type="INVOICE",
        )

    def _extract_acord25_regex(self, pages: list[str]) -> Acord25Certificate:
        """Rule-based extraction for ACORD 25 Certificate of Liability Insurance."""
        cert = Acord25Certificate()
        field_sources: dict[str, FieldSource] = {}

        indexed_lines: list[tuple[int, str]] = []
        for p_idx, p_text in enumerate(pages, start=1):
            for line_raw in p_text.splitlines():
                l_s = line_raw.strip()
                if l_s:
                    indexed_lines.append((p_idx, l_s))

        # 1. Insured Name
        insured_pat = re.compile(
            r"(?:insured|asegurado)\s*:?\s*([A-Za-z0-9ÁÉÍÓÚáéíóúñÑ\s.,&'-]+)",
            re.IGNORECASE,
        )
        for i, (p_num, line) in enumerate(indexed_lines):
            # Check standalone INSURED header
            if re.match(r"^(?:insured|asegurado)\s*:?$", line, re.IGNORECASE):
                if i + 1 < len(indexed_lines):
                    next_line = indexed_lines[i + 1][1]
                    if len(next_line) > 3 and not re.search(
                        r"(certificate|producer|coverages|insurer)", next_line, re.IGNORECASE
                    ):
                        cert.insured_name = next_line
                        field_sources["insured_name"] = FieldSource(
                            page=indexed_lines[i + 1][0], text_snippet=next_line
                        )
                        break
            m = insured_pat.search(line)
            if m:
                val = m.group(1).strip()
                if len(val) > 3 and not re.search(
                    r"(certificate|producer|coverages|insurer)", val, re.IGNORECASE
                ):
                    cert.insured_name = val
                    field_sources["insured_name"] = FieldSource(page=p_num, text_snippet=line)
                    break

        # 2. Insurer Name
        insurer_pat = re.compile(
            r"(?:insurer\s*(?:[a-f]\b)?|aseguradora|compa[ñn][ií]a\s*aseguradora)\s*:?\s*([A-Za-z0-9ÁÉÍÓÚáéíóúñÑ\s.,&'-]+)",
            re.IGNORECASE,
        )
        for p_num, line in indexed_lines:
            m = insurer_pat.search(line)
            if m:
                val = m.group(1).strip()
                if len(val) > 3 and not re.search(
                    r"(affording\s*coverage|producer|naic)", val, re.IGNORECASE
                ):
                    cert.insurer_name = val
                    field_sources["insurer_name"] = FieldSource(page=p_num, text_snippet=line)
                    break

        # 3. Policy Number
        policy_pat = re.compile(
            r"(?:policy\s*(?:number|no\.?|#)|p[oó]liza\s*(?:n[oº]?|#)?)\s*:?\s*([A-Za-z0-9\-]+)",
            re.IGNORECASE,
        )
        for p_num, line in indexed_lines:
            m = policy_pat.search(line)
            if m:
                val = m.group(1).strip()
                if val.lower() not in ("eff", "exp", "type", "date"):
                    cert.policy_number = val
                    field_sources["policy_number"] = FieldSource(page=p_num, text_snippet=line)
                    break

        # 4. Dates
        eff_pat = re.compile(
            r"(?:policy\s*eff(?:ective)?(?:\s*\(mm/dd/yyyy\))?|eff(?:ective)?\s*date|vigencia\s*desde)\s*:?\s*([0-9]{4}[-/][0-9]{2}[-/][0-9]{2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})",
            re.IGNORECASE,
        )
        exp_pat = re.compile(
            r"(?:policy\s*exp(?:iration)?(?:\s*\(mm/dd/yyyy\))?|exp(?:iration)?\s*date|vigencia\s*hasta)\s*:?\s*([0-9]{4}[-/][0-9]{2}[-/][0-9]{2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})",
            re.IGNORECASE,
        )
        for p_num, line in indexed_lines:
            if not cert.effective_date:
                m = eff_pat.search(line)
                if m:
                    cert.effective_date = parse_date(m.group(1))
                    if cert.effective_date:
                        field_sources["effective_date"] = FieldSource(page=p_num, text_snippet=line)
            if not cert.expiration_date:
                m = exp_pat.search(line)
                if m:
                    cert.expiration_date = parse_date(m.group(1))
                    if cert.expiration_date:
                        field_sources["expiration_date"] = FieldSource(
                            page=p_num, text_snippet=line
                        )

        # 5. Coverage Limits
        limit_pat = re.compile(
            r"(each\s*occurrence|damage\s*to\s*rented\s*premises|med\s*exp|personal\s*&\s*adv\s*injury|general\s*aggregate|products\s*-\s*comp/op\s*agg|combined\s*single\s*limit|bodily\s*injury|property\s*damage|l[ií]mite\s*por\s*evento|l[ií]mite\s*agregado)[\s:$]*([0-9.,]+)",
            re.IGNORECASE,
        )
        limits_found: list[CoverageLimit] = []
        for p_num, line in indexed_lines:
            m = limit_pat.search(line)
            if m:
                cov_name = m.group(1).strip()
                amt = parse_decimal(m.group(2))
                if amt is not None:
                    limits_found.append(CoverageLimit(coverage_type=cov_name, limit_amount=amt))
                    key = f"limit_{cov_name.lower().replace(' ', '_')}"
                    field_sources[key] = FieldSource(page=p_num, text_snippet=line)

        cert.coverage_limits = limits_found
        for expected in [
            "insured_name",
            "insurer_name",
            "policy_number",
            "effective_date",
            "expiration_date",
        ]:
            if expected not in field_sources:
                field_sources[expected] = FieldSource(page=None, text_snippet=None)

        cert.field_sources = field_sources
        return cert

    def _extract_acord25_llm(self, text: str, pages: list[str]) -> Acord25Certificate:
        """Extracts ACORD 25 Certificate using LLM with Pydantic validation."""
        formatted_prompt = self._build_document_prompt(pages)

        system_prompt = (
            "You are an expert insurance document analyst. Extract certificate details: "
            "insured_name, insurer_name, policy_number, effective_date, expiration_date, "
            "and coverage_limits (list of {coverage_type, limit_amount}). "
            "For each field, include its exact provenance in 'field_sources': "
            "field_sources.<fieldName> = {'page': <page_int>, 'text_snippet': '<exact text>'}. "
            "If a field is missing, set value to null and "
            "source to {'page': null, 'text_snippet': null}."
        )

        cert: Acord25Certificate = llm_client.extract_structured(
            prompt=formatted_prompt,
            schema_cls=Acord25Certificate,
            system_prompt=system_prompt,
            max_retries=1,
        )

        verified = verify_llm_sources(cert.field_sources, pages)
        for expected in [
            "insured_name",
            "insurer_name",
            "policy_number",
            "effective_date",
            "expiration_date",
        ]:
            if expected not in verified:
                verified[expected] = FieldSource(page=None, text_snippet=None)

        cert.field_sources = verified
        return cert

    @staticmethod
    def _build_document_prompt(pages: list[str]) -> str:
        prompt_parts: list[str] = ["Here is the document text separated by page:"]
        for idx, page_content in enumerate(pages, start=1):
            prompt_parts.append(f"\n--- Page {idx} ---\n{page_content}")
        return "\n".join(prompt_parts)


extractor = InvoiceExtractor()
