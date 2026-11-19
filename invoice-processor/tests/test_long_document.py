"""Unit tests for long document processing (50+ pages) with page provenance verification."""

import io
from decimal import Decimal

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from app.core.ocr_engine import ocr_engine
from app.services.extractor import extractor


def generate_synthetic_50plus_page_pdf(total_pages: int = 52) -> bytes:
    """Generates a synthetic PDF with 52 pages, spreading key fields across specific pages."""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    for page_num in range(1, total_pages + 1):
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, height - 50, f"DOCUMENTO LARGO DE PRUEBA - PAGINA {page_num}")

        c.setFont("Helvetica", 10)
        # Page 1: Cover / Intro
        if page_num == 1:
            c.drawString(50, height - 100, "CONTRATO MARCO Y ANEXOS COMERCIALES")
            c.drawString(
                50, height - 120, "Este documento contiene cláusulas, anexos y liquidaciones."
            )

        # Page 8: Issuer Name & NIT
        elif page_num == 8:
            c.setFont("Helvetica-Bold", 12)
            c.drawString(50, height - 100, "DATOS DEL EMISOR:")
            c.setFont("Helvetica", 10)
            c.drawString(50, height - 120, "SOLUCIONES INDUSTRIALES DEL SUR S.A.S.")
            c.drawString(50, height - 140, "NIT: 900.123.456-8")
            c.drawString(50, height - 160, "Dirección: Carrera 15 # 80-20, Medellín, Colombia")

        # Page 21: Invoice Number & Date
        elif page_num == 21:
            c.setFont("Helvetica-Bold", 12)
            c.drawString(50, height - 100, "FACTURA ELECTRONICA DE VENTA")
            c.setFont("Helvetica", 10)
            c.drawString(50, height - 120, "Factura No: FEV-9050")
            c.drawString(50, height - 140, "Fecha de Emisión: 2026-11-01")
            c.drawString(50, height - 160, "Fecha de Vencimiento: 2026-11-30")

        # Page 37: Subtotal & Tax
        elif page_num == 37:
            c.setFont("Helvetica-Bold", 12)
            c.drawString(50, height - 100, "LIQUIDACION PARCIAL:")
            c.setFont("Helvetica", 10)
            c.drawString(50, height - 120, "Subtotal: $ 5,000,000")
            c.drawString(50, height - 140, "IVA (19%): $ 950,000")

        # Page 51: Grand Total
        elif page_num == 51:
            c.setFont("Helvetica-Bold", 14)
            c.drawString(50, height - 100, "LIQUIDACION FINAL Y CIERRE:")
            c.drawString(50, height - 130, "Total a Pagar: $ 5,950,000")

        else:
            # Generic filler terms on other pages
            for y_pos in range(int(height) - 100, 100, -40):
                c.drawString(
                    50,
                    y_pos,
                    f"Cláusula {page_num}.{y_pos}: Términos generales de ejecución contractual"
                    " y cumplimiento normativo.",
                )

        c.showPage()

    c.save()
    return buffer.getvalue()


def test_long_document_extraction_page_accuracy():
    """Validates that a 52-page PDF is extracted with exact page provenance for every field."""
    pdf_bytes = generate_synthetic_50plus_page_pdf(total_pages=52)

    page_count = ocr_engine.count_pages(pdf_bytes, "long_document.pdf")
    assert page_count == 52

    raw_text, pages_processed = ocr_engine.process_file(pdf_bytes, "long_document.pdf")
    assert pages_processed == 52

    extracted = extractor.extract(raw_text)

    # Validate extracted values
    assert extracted.issuer_name == "SOLUCIONES INDUSTRIALES DEL SUR S.A.S."
    assert extracted.issuer_vat == "900.123.456-8"
    assert extracted.invoice_number == "FEV-9050"
    assert str(extracted.invoice_date) == "2026-11-01"
    assert extracted.subtotal == Decimal("5000000")
    assert extracted.tax_amount == Decimal("950000")
    assert extracted.total == Decimal("5950000")

    # Validate exact page numbers in field_sources
    assert extracted.field_sources["issuer_name"].page == 8
    assert "SOLUCIONES INDUSTRIALES" in extracted.field_sources["issuer_name"].text_snippet

    assert extracted.field_sources["issuer_vat"].page == 8
    assert "900.123.456-8" in extracted.field_sources["issuer_vat"].text_snippet

    assert extracted.field_sources["invoice_number"].page == 21
    assert "FEV-9050" in extracted.field_sources["invoice_number"].text_snippet

    assert extracted.field_sources["invoice_date"].page == 21
    assert "2026-11-01" in extracted.field_sources["invoice_date"].text_snippet

    assert extracted.field_sources["subtotal"].page == 37
    assert "5,000,000" in extracted.field_sources["subtotal"].text_snippet

    assert extracted.field_sources["total"].page == 51
    assert "5,950,000" in extracted.field_sources["total"].text_snippet
