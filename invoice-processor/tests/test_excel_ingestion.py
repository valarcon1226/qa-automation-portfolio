"""Unit tests for Excel (.xlsx) file ingestion and extraction."""

import io
from decimal import Decimal

import openpyxl
from fastapi.testclient import TestClient

from app.core.ocr_engine import ocr_engine
from app.services.extractor import extractor


def create_invoice_xlsx(multisheet: bool = False) -> bytes:
    wb = openpyxl.Workbook()
    ws1 = wb.active
    ws1.title = "Factura"

    ws1.append(["SOLUCIONES ANDINAS S.A.S."])
    ws1.append(["NIT:", "900.123.456-8"])
    ws1.append(["Factura No:", "FEV-1001"])
    ws1.append(["Fecha de Emisión:", "2026-10-01"])
    ws1.append(["Cliente:", "COMERCIALIZADORA DEL CARIBE S.A."])
    ws1.append(["Descripción", "Cantidad", "Precio Unitario", "Total"])
    ws1.append(["Licencias Cloud", "10", "100000", "1000000"])

    if multisheet:
        ws2 = wb.create_sheet(title="Totales")
        ws2.append(["Subtotal:", "$ 1,000,000"])
        ws2.append(["IVA (19%):", "$ 190,000"])
        ws2.append(["Total a Pagar:", "$ 1,190,000"])
    else:
        ws1.append(["Subtotal:", "$ 1,000,000"])
        ws1.append(["IVA (19%):", "$ 190,000"])
        ws1.append(["Total a Pagar:", "$ 1,190,000"])

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_excel_page_count():
    single_sheet_bytes = create_invoice_xlsx(multisheet=False)
    assert ocr_engine.count_pages(single_sheet_bytes, "factura.xlsx") == 1

    multi_sheet_bytes = create_invoice_xlsx(multisheet=True)
    assert ocr_engine.count_pages(multi_sheet_bytes, "factura_multi.xlsx") == 2


def test_excel_processing_and_extraction():
    xlsx_bytes = create_invoice_xlsx(multisheet=False)
    raw_text, page_count = ocr_engine.process_file(xlsx_bytes, "factura.xlsx")

    assert page_count == 1
    assert "SOLUCIONES ANDINAS S.A.S." in raw_text
    assert "FEV-1001" in raw_text

    extracted = extractor.extract(raw_text)
    assert extracted.issuer_name == "SOLUCIONES ANDINAS S.A.S."
    assert extracted.issuer_vat == "900.123.456-8"
    assert extracted.invoice_number == "FEV-1001"
    assert extracted.total == Decimal("1190000")
    assert extracted.field_sources["issuer_name"].page == 1


def test_excel_multisheet_page_sources():
    multi_bytes = create_invoice_xlsx(multisheet=True)
    raw_text, page_count = ocr_engine.process_file(multi_bytes, "factura_multi.xlsx")

    assert page_count == 2
    assert "--- PAGE BREAK ---" in raw_text

    extracted = extractor.extract(raw_text)
    assert extracted.issuer_name == "SOLUCIONES ANDINAS S.A.S."
    assert extracted.field_sources["issuer_name"].page == 1
    # Totals were on Sheet 2 -> Page 2
    assert extracted.total == Decimal("1190000")
    assert extracted.field_sources["total"].page == 2


def test_excel_api_upload(client: TestClient, auth_headers: dict):
    xlsx_bytes = create_invoice_xlsx(multisheet=False)
    files = {
        "file": (
            "test_invoice.xlsx",
            xlsx_bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }

    response = client.post(
        "/api/v1/invoices/process",
        files=files,
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["issuer_name"] == "SOLUCIONES ANDINAS S.A.S."
    assert data["invoice_number"] == "FEV-1001"
    assert float(data["total"]) == 1190000.0
    assert data["field_sources"]["issuer_name"]["page"] == 1
