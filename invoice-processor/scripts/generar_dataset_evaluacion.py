"""Generates a labeled benchmark dataset of 40 synthetic documents (Invoices and ACORD 25).

Documents include varied formats (PDF and XLSX), multipage files, realistic noise,
and edge cases, each with its ground-truth JSON for evaluation.
"""

import json
import sys
from pathlib import Path

import openpyxl
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
EVALS_DIR = BASE_DIR / "evals"
DATA_DIR = EVALS_DIR / "data"


def draw_watermark(c: canvas.Canvas, width: float, height: float):
    c.saveState()
    c.setFont("Helvetica", 8)
    c.setFillColorRGB(0.7, 0.7, 0.7)
    c.drawCentredString(
        width / 2.0, height - 20, "SYNTHETIC TEST DOCUMENT - NO LEGAL OR FISCAL VALIDITY"
    )
    c.drawCentredString(width / 2.0, 20, "DOCUMENTO FICTICIO PARA EVALUACION DE AUTOMATIZACION")
    c.restoreState()


# ==============================================================================
# INVOICE GENERATORS
# ==============================================================================

INVOICE_GROUND_TRUTHS = [
    # 1. Clean Colombian PDF
    {
        "doc_id": "inv_01",
        "format": "pdf",
        "doc_type": "INVOICE",
        "issuer_name": "ANDINA TECNOLOGICA S.A.S.",
        "issuer_vat": "900.123.456-8",
        "invoice_number": "FEV-101",
        "invoice_date": "2026-10-01",
        "subtotal": 2000000.0,
        "tax_amount": 380000.0,
        "total": 2380000.0,
        "currency": "COP",
    },
    # 2. Colombian PDF with alternate label
    {
        "doc_id": "inv_02",
        "format": "pdf",
        "doc_type": "INVOICE",
        "issuer_name": "DISTRIBUIDORA DEL CAUCA LTDA",
        "issuer_vat": "890.111.222-3",
        "invoice_number": "FEV-102",
        "invoice_date": "2026-10-02",
        "subtotal": 1500000.0,
        "tax_amount": 285000.0,
        "total": 1785000.0,
        "currency": "COP",
    },
    # 3. US English PDF
    {
        "doc_id": "inv_03",
        "format": "pdf",
        "doc_type": "INVOICE",
        "issuer_name": "NEXUS CLOUD SYSTEMS LLC",
        "issuer_vat": "US-987654321",
        "invoice_number": "INV-2026-103",
        "invoice_date": "2026-10-03",
        "subtotal": 1200.0,
        "tax_amount": 120.0,
        "total": 1320.0,
        "currency": "USD",
    },
    # 4. Multipage Colombian PDF (2 pages)
    {
        "doc_id": "inv_04",
        "format": "pdf",
        "doc_type": "INVOICE",
        "issuer_name": "LOGISTICA CARGO EXPRESS S.A.",
        "issuer_vat": "901.234.567-7",
        "invoice_number": "FEV-104",
        "invoice_date": "2026-10-04",
        "subtotal": 5000000.0,
        "tax_amount": 950000.0,
        "total": 5950000.0,
        "currency": "COP",
    },
    # 5. Clean XLSX Invoice
    {
        "doc_id": "inv_05",
        "format": "xlsx",
        "doc_type": "INVOICE",
        "issuer_name": "SUMINISTROS INDUSTRIALES SAS",
        "issuer_vat": "900.555.666-1",
        "invoice_number": "FEV-105",
        "invoice_date": "2026-10-05",
        "subtotal": 800000.0,
        "tax_amount": 152000.0,
        "total": 952000.0,
        "currency": "COP",
    },
    # 6. US XLSX Invoice
    {
        "doc_id": "inv_06",
        "format": "xlsx",
        "doc_type": "INVOICE",
        "issuer_name": "APEX DATA SERVICES INC",
        "issuer_vat": "US-112233445",
        "invoice_number": "INV-2026-106",
        "invoice_date": "2026-10-06",
        "subtotal": 3500.0,
        "tax_amount": 350.0,
        "total": 3850.0,
        "currency": "USD",
    },
    # 7. PDF with European EUR formatting
    {
        "doc_id": "inv_07",
        "format": "pdf",
        "doc_type": "INVOICE",
        "issuer_name": "IBERIA SOFTWARE SOLUTIONS SL",
        "issuer_vat": "ESB-12345678",
        "invoice_number": "INV-2026-107",
        "invoice_date": "2026-10-07",
        "subtotal": 4500.0,
        "tax_amount": 945.0,
        "total": 5445.0,
        "currency": "EUR",
    },
    # 8. Multipage PDF (3 pages)
    {
        "doc_id": "inv_08",
        "format": "pdf",
        "doc_type": "INVOICE",
        "issuer_name": "PETROQUIMICA NACIONAL S.A.",
        "issuer_vat": "800.333.444-9",
        "invoice_number": "FEV-108",
        "invoice_date": "2026-10-08",
        "subtotal": 18000000.0,
        "tax_amount": 3420000.0,
        "total": 21420000.0,
        "currency": "COP",
    },
    # 9. Clean Colombian PDF
    {
        "doc_id": "inv_09",
        "format": "pdf",
        "doc_type": "INVOICE",
        "issuer_name": "SERVICIOS INTEGRALES DE ASEO SAS",
        "issuer_vat": "900.777.888-2",
        "invoice_number": "FEV-109",
        "invoice_date": "2026-10-09",
        "subtotal": 1100000.0,
        "tax_amount": 209000.0,
        "total": 1309000.0,
        "currency": "COP",
    },
    # 10. Multisheet XLSX Invoice (Page 1 items, Page 2 totals)
    {
        "doc_id": "inv_10",
        "format": "xlsx",
        "doc_type": "INVOICE",
        "issuer_name": "TEXTILES DE OCCIDENTE S.A.",
        "issuer_vat": "890.999.888-4",
        "invoice_number": "FEV-110",
        "invoice_date": "2026-10-10",
        "subtotal": 6000000.0,
        "tax_amount": 1140000.0,
        "total": 7140000.0,
        "currency": "COP",
    },
    # 11. PDF English format
    {
        "doc_id": "inv_11",
        "format": "pdf",
        "doc_type": "INVOICE",
        "issuer_name": "PACIFIC RIM SECURITY SYSTEMS",
        "issuer_vat": "US-445566778",
        "invoice_number": "INV-2026-111",
        "invoice_date": "2026-10-11",
        "subtotal": 850.0,
        "tax_amount": 85.0,
        "total": 935.0,
        "currency": "USD",
    },
    # 12. Colombian PDF with slash dates
    {
        "doc_id": "inv_12",
        "format": "pdf",
        "doc_type": "INVOICE",
        "issuer_name": "INGENIERIA Y DISENO ANDINO S.A.S.",
        "issuer_vat": "901.444.333-5",
        "invoice_number": "FEV-112",
        "invoice_date": "2026-10-12",
        "subtotal": 3200000.0,
        "tax_amount": 608000.0,
        "total": 3808000.0,
        "currency": "COP",
    },
    # 13. XLSX Invoice
    {
        "doc_id": "inv_13",
        "format": "xlsx",
        "doc_type": "INVOICE",
        "issuer_name": "FARMACEUTICA DEL PACIFICO S.A.",
        "issuer_vat": "800.666.777-1",
        "invoice_number": "FEV-113",
        "invoice_date": "2026-10-13",
        "subtotal": 9500000.0,
        "tax_amount": 1805000.0,
        "total": 11305000.0,
        "currency": "COP",
    },
    # 14. PDF with dense table
    {
        "doc_id": "inv_14",
        "format": "pdf",
        "doc_type": "INVOICE",
        "issuer_name": "CONSTRUCCIONES CIVILES DEL CARIBE",
        "issuer_vat": "900.222.111-0",
        "invoice_number": "FEV-114",
        "invoice_date": "2026-10-14",
        "subtotal": 15000000.0,
        "tax_amount": 2850000.0,
        "total": 17850000.0,
        "currency": "COP",
    },
    # 15. US English PDF
    {
        "doc_id": "inv_15",
        "format": "pdf",
        "doc_type": "INVOICE",
        "issuer_name": "CYBERNET NETWORKS CORP",
        "issuer_vat": "US-887766554",
        "invoice_number": "INV-2026-115",
        "invoice_date": "2026-10-15",
        "subtotal": 2100.0,
        "tax_amount": 210.0,
        "total": 2310.0,
        "currency": "USD",
    },
    # 16. Colombian XLSX
    {
        "doc_id": "inv_16",
        "format": "xlsx",
        "doc_type": "INVOICE",
        "issuer_name": "DOTACIONES EMPRESARIALES DE COLOMBIA",
        "issuer_vat": "900.888.777-6",
        "invoice_number": "FEV-116",
        "invoice_date": "2026-10-16",
        "subtotal": 1800000.0,
        "tax_amount": 342000.0,
        "total": 2142000.0,
        "currency": "COP",
    },
    # 17. European EUR PDF
    {
        "doc_id": "inv_17",
        "format": "pdf",
        "doc_type": "INVOICE",
        "issuer_name": "EUROPA LOGISTIK SERVICES GMBH",
        "issuer_vat": "DE-998877665",
        "invoice_number": "INV-2026-117",
        "invoice_date": "2026-10-17",
        "subtotal": 5200.0,
        "tax_amount": 988.0,
        "total": 6188.0,
        "currency": "EUR",
    },
    # 18. Colombian PDF
    {
        "doc_id": "inv_18",
        "format": "pdf",
        "doc_type": "INVOICE",
        "issuer_name": "SEGURIDAD PRIVADA Y VIGILANCIA LTDA",
        "issuer_vat": "890.333.222-1",
        "invoice_number": "FEV-118",
        "invoice_date": "2026-10-18",
        "subtotal": 4100000.0,
        "tax_amount": 779000.0,
        "total": 4879000.0,
        "currency": "COP",
    },
    # 19. XLSX Invoice
    {
        "doc_id": "inv_19",
        "format": "xlsx",
        "doc_type": "INVOICE",
        "issuer_name": "CONSULTORES JURIDICOS ASOCIADOS SAS",
        "issuer_vat": "901.888.999-3",
        "invoice_number": "FEV-119",
        "invoice_date": "2026-10-19",
        "subtotal": 2500000.0,
        "tax_amount": 475000.0,
        "total": 2975000.0,
        "currency": "COP",
    },
    # 20. Colombian PDF with hyphenated date
    {
        "doc_id": "inv_20",
        "format": "pdf",
        "doc_type": "INVOICE",
        "issuer_name": "COMUNICACIONES SATELITALES S.A.",
        "issuer_vat": "800.123.987-4",
        "invoice_number": "FEV-120",
        "invoice_date": "2026-10-20",
        "subtotal": 7800000.0,
        "tax_amount": 1482000.0,
        "total": 9282000.0,
        "currency": "COP",
    },
]


def create_invoice_pdf(info: dict, path: Path):
    c = canvas.Canvas(str(path), pagesize=letter)
    width, height = letter
    draw_watermark(c, width, height)

    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, height - 60, info["issuer_name"])
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 80, f"NIT/VAT: {info['issuer_vat']}")
    c.drawString(50, height - 95, "Dirección: Avenida Principal # 10-20")

    c.setFont("Helvetica-Bold", 11)
    c.drawString(350, height - 60, "FACTURA ELECTRONICA DE VENTA")
    c.setFont("Helvetica", 10)
    c.drawString(350, height - 75, f"Factura No: {info['invoice_number']}")
    c.drawString(350, height - 90, f"Fecha de Emisión: {info['invoice_date']}")

    c.line(50, height - 110, width - 50, height - 110)

    y = height - 150
    c.drawString(50, y, "Servicios Profesionales de Consultoria | 1 | 1000 | 1000")

    y -= 80
    curr_sym = "€" if info["currency"] == "EUR" else ("$" if info["currency"] == "USD" else "$")
    c.drawString(350, y, f"Subtotal: {curr_sym} {info['subtotal']:,.2f}")
    c.drawString(350, y - 20, f"IVA: {curr_sym} {info['tax_amount']:,.2f}")
    c.setFont("Helvetica-Bold", 11)
    c.drawString(350, y - 45, f"Total a Pagar: {curr_sym} {info['total']:,.2f}")

    if info.get("multipage"):
        c.showPage()
        draw_watermark(c, width, height)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, height - 60, f"{info['issuer_name']} - Página 2")
        c.setFont("Helvetica", 10)
        c.drawString(50, height - 80, f"Factura No: {info['invoice_number']}")
        c.drawString(
            50,
            height - 120,
            "Anexo de especificaciones técnicas y aceptación de recibo a satisfacción.",
        )

    c.showPage()
    c.save()


def create_invoice_xlsx(info: dict, path: Path):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Factura"

    ws.append([info["issuer_name"]])
    ws.append(["NIT:", info["issuer_vat"]])
    ws.append(["Factura No:", info["invoice_number"]])
    ws.append(["Fecha de Emisión:", info["invoice_date"]])
    ws.append([])
    ws.append(["Descripción", "Cantidad", "Precio Unitario", "Total"])
    ws.append(["Servicios Especializados", "1", str(info["subtotal"]), str(info["subtotal"])])
    ws.append([])

    curr_sym = "€" if info["currency"] == "EUR" else "$"
    ws.append(["Subtotal:", f"{curr_sym} {info['subtotal']:,.2f}"])
    ws.append(["IVA:", f"{curr_sym} {info['tax_amount']:,.2f}"])
    ws.append(["Total a Pagar:", f"{curr_sym} {info['total']:,.2f}"])

    wb.save(path)


# ==============================================================================
# ACORD 25 GENERATORS
# ==============================================================================

ACORD_GROUND_TRUTHS = [
    {
        "doc_id": "acord_01",
        "format": "pdf",
        "doc_type": "ACORD_25",
        "insured_name": "ANDES LOGISTICS GROUP LLC",
        "insurer_name": "TRAVELERS CASUALTY AND SURETY COMPANY",
        "policy_number": "GL-98765432-01",
        "effective_date": "2026-01-01",
        "expiration_date": "2027-01-01",
        "coverage_limits": {
            "each_occurrence": 1000000.0,
            "general_aggregate": 2000000.0,
        },
    },
    {
        "doc_id": "acord_02",
        "format": "pdf",
        "doc_type": "ACORD_25",
        "insured_name": "BUILDERS & DEVELOPERS CORP",
        "insurer_name": "HARTFORD FIRE INSURANCE CO",
        "policy_number": "POL-55443322-02",
        "effective_date": "2026-02-01",
        "expiration_date": "2027-02-01",
        "coverage_limits": {
            "each_occurrence": 2000000.0,
            "general_aggregate": 4000000.0,
        },
    },
    {
        "doc_id": "acord_03",
        "format": "pdf",
        "doc_type": "ACORD_25",
        "insured_name": "PACIFIC RIM MARITIME SERVICES",
        "insurer_name": "LIBERTY MUTUAL INSURANCE CO",
        "policy_number": "GL-11223344-03",
        "effective_date": "2026-03-01",
        "expiration_date": "2027-03-01",
        "coverage_limits": {
            "each_occurrence": 1000000.0,
            "general_aggregate": 2000000.0,
        },
    },
    {
        "doc_id": "acord_04",
        "format": "xlsx",
        "doc_type": "ACORD_25",
        "insured_name": "SUMMIT INDUSTRIAL CONTRACTORS",
        "insurer_name": "CHUBB INDEMNITY INSURANCE CO",
        "policy_number": "GL-77665544-04",
        "effective_date": "2026-04-01",
        "expiration_date": "2027-04-01",
        "coverage_limits": {
            "each_occurrence": 1500000.0,
            "general_aggregate": 3000000.0,
        },
    },
    {
        "doc_id": "acord_05",
        "format": "pdf",
        "doc_type": "ACORD_25",
        "insured_name": "VALLEY HEALTHCARE SOLUTIONS LLC",
        "insurer_name": "CNA FINANCIAL CORP",
        "policy_number": "GL-33445566-05",
        "effective_date": "2026-05-01",
        "expiration_date": "2027-05-01",
        "coverage_limits": {
            "each_occurrence": 1000000.0,
            "general_aggregate": 3000000.0,
        },
    },
    {
        "doc_id": "acord_06",
        "format": "xlsx",
        "doc_type": "ACORD_25",
        "insured_name": "HORIZON SOLAR INSTALLATIONS INC",
        "insurer_name": "ZURICH AMERICAN INSURANCE CO",
        "policy_number": "GL-99887766-06",
        "effective_date": "2026-06-01",
        "expiration_date": "2027-06-01",
        "coverage_limits": {
            "each_occurrence": 1000000.0,
            "general_aggregate": 2000000.0,
        },
    },
    {
        "doc_id": "acord_07",
        "format": "pdf",
        "doc_type": "ACORD_25",
        "insured_name": "METRO SECURITY SERVICES INC",
        "insurer_name": "AIG SPECIALTY INSURANCE CO",
        "policy_number": "POL-12345678-07",
        "effective_date": "2026-07-01",
        "expiration_date": "2027-07-01",
        "coverage_limits": {
            "each_occurrence": 2000000.0,
            "general_aggregate": 5000000.0,
        },
    },
    {
        "doc_id": "acord_08",
        "format": "pdf",
        "doc_type": "ACORD_25",
        "insured_name": "DELTA CARGO CARRIERS LLC",
        "insurer_name": "BERKLEY REGIONAL INSURANCE CO",
        "policy_number": "GL-44332211-08",
        "effective_date": "2026-08-01",
        "expiration_date": "2027-08-01",
        "coverage_limits": {
            "each_occurrence": 1000000.0,
            "general_aggregate": 2000000.0,
        },
    },
    {
        "doc_id": "acord_09",
        "format": "xlsx",
        "doc_type": "ACORD_25",
        "insured_name": "EVERGREEN ENVIRONMENTAL GROUP",
        "insurer_name": "NATIONWIDE MUTUAL INSURANCE CO",
        "policy_number": "GL-88776655-09",
        "effective_date": "2026-09-01",
        "expiration_date": "2027-09-01",
        "coverage_limits": {
            "each_occurrence": 1000000.0,
            "general_aggregate": 2000000.0,
        },
    },
    {
        "doc_id": "acord_10",
        "format": "pdf",
        "doc_type": "ACORD_25",
        "insured_name": "PIONEER DRILLING & EXPLORATION",
        "insurer_name": "GREAT AMERICAN INSURANCE CO",
        "policy_number": "POL-90123456-10",
        "effective_date": "2026-10-01",
        "expiration_date": "2027-10-01",
        "coverage_limits": {
            "each_occurrence": 5000000.0,
            "general_aggregate": 10000000.0,
        },
    },
    {
        "doc_id": "acord_11",
        "format": "pdf",
        "doc_type": "ACORD_25",
        "insured_name": "BEACON ARCHITECTURE PARTNERS",
        "insurer_name": "TRAVELERS CASUALTY AND SURETY COMPANY",
        "policy_number": "GL-22334455-11",
        "effective_date": "2026-01-15",
        "expiration_date": "2027-01-15",
        "coverage_limits": {
            "each_occurrence": 1000000.0,
            "general_aggregate": 2000000.0,
        },
    },
    {
        "doc_id": "acord_12",
        "format": "xlsx",
        "doc_type": "ACORD_25",
        "insured_name": "CASCADE AVIATION LOGISTICS",
        "insurer_name": "ALLIANZ GLOBAL CORPORATE",
        "policy_number": "GL-66778899-12",
        "effective_date": "2026-02-15",
        "expiration_date": "2027-02-15",
        "coverage_limits": {
            "each_occurrence": 3000000.0,
            "general_aggregate": 6000000.0,
        },
    },
    {
        "doc_id": "acord_13",
        "format": "pdf",
        "doc_type": "ACORD_25",
        "insured_name": "OAKLAND ROOFING & SHEET METAL",
        "insurer_name": "STATE FARM GENERAL INSURANCE",
        "policy_number": "POL-34567890-13",
        "effective_date": "2026-03-15",
        "expiration_date": "2027-03-15",
        "coverage_limits": {
            "each_occurrence": 1000000.0,
            "general_aggregate": 2000000.0,
        },
    },
    {
        "doc_id": "acord_14",
        "format": "pdf",
        "doc_type": "ACORD_25",
        "insured_name": "STERLING FINANCIAL CONSULTANTS",
        "insurer_name": "HANOVER INSURANCE GROUP",
        "policy_number": "GL-55667788-14",
        "effective_date": "2026-04-15",
        "expiration_date": "2027-04-15",
        "coverage_limits": {
            "each_occurrence": 1000000.0,
            "general_aggregate": 2000000.0,
        },
    },
    {
        "doc_id": "acord_15",
        "format": "xlsx",
        "doc_type": "ACORD_25",
        "insured_name": "CENTRAL COAST WINERY CORP",
        "insurer_name": "MARKEL AMERICAN INSURANCE CO",
        "policy_number": "GL-77889900-15",
        "effective_date": "2026-05-15",
        "expiration_date": "2027-05-15",
        "coverage_limits": {
            "each_occurrence": 1000000.0,
            "general_aggregate": 2000000.0,
        },
    },
    {
        "doc_id": "acord_16",
        "format": "pdf",
        "doc_type": "ACORD_25",
        "insured_name": "MIDWEST AGRI PRODUCTS LLC",
        "insurer_name": "WESTFIELD INSURANCE CO",
        "policy_number": "POL-56789012-16",
        "effective_date": "2026-06-15",
        "expiration_date": "2027-06-15",
        "coverage_limits": {
            "each_occurrence": 2000000.0,
            "general_aggregate": 4000000.0,
        },
    },
    {
        "doc_id": "acord_17",
        "format": "pdf",
        "doc_type": "ACORD_25",
        "insured_name": "SUNSHINE PLUMBING & MECHANICAL",
        "insurer_name": "CINCINNATI INSURANCE CO",
        "policy_number": "GL-12344321-17",
        "effective_date": "2026-07-15",
        "expiration_date": "2027-07-15",
        "coverage_limits": {
            "each_occurrence": 1000000.0,
            "general_aggregate": 2000000.0,
        },
    },
    {
        "doc_id": "acord_18",
        "format": "xlsx",
        "doc_type": "ACORD_25",
        "insured_name": "NORTHERN FORESTRY CORP",
        "insurer_name": "ST PAUL FIRE & MARINE INS",
        "policy_number": "GL-98761234-18",
        "effective_date": "2026-08-15",
        "expiration_date": "2027-08-15",
        "coverage_limits": {
            "each_occurrence": 1000000.0,
            "general_aggregate": 2000000.0,
        },
    },
    {
        "doc_id": "acord_19",
        "format": "pdf",
        "doc_type": "ACORD_25",
        "insured_name": "HARBORVIEW HOTEL & RESORTS",
        "insurer_name": "TRAVELERS CASUALTY AND SURETY COMPANY",
        "policy_number": "POL-78901234-19",
        "effective_date": "2026-09-15",
        "expiration_date": "2027-09-15",
        "coverage_limits": {
            "each_occurrence": 3000000.0,
            "general_aggregate": 5000000.0,
        },
    },
    {
        "doc_id": "acord_20",
        "format": "pdf",
        "doc_type": "ACORD_25",
        "insured_name": "TRI-STATE ELECTRIC & UTILITY",
        "insurer_name": "HARTFORD ACCIDENT & INDEMNITY",
        "policy_number": "GL-65432109-20",
        "effective_date": "2026-10-15",
        "expiration_date": "2027-10-15",
        "coverage_limits": {
            "each_occurrence": 2000000.0,
            "general_aggregate": 4000000.0,
        },
    },
]


def create_acord25_pdf(info: dict, path: Path):
    c = canvas.Canvas(str(path), pagesize=letter)
    width, height = letter
    draw_watermark(c, width, height)

    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, height - 50, "ACORD 25 (2016/03)")
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, height - 70, "CERTIFICATE OF LIABILITY INSURANCE")

    c.setFont("Helvetica", 9)
    c.drawString(
        50, height - 85, "THIS CERTIFICATE DOES NOT AFFIRMATIVELY OR NEGATIVELY AMEND COVERAGE."
    )

    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, height - 110, "PRODUCER: PREMIER BROKERAGE PARTNERS LLC")

    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, height - 135, f"INSURED: {info['insured_name']}")
    c.setFont("Helvetica", 9)
    c.drawString(50, height - 150, "100 Corporate Parkway, Suite 500")

    c.setFont("Helvetica-Bold", 10)
    c.drawString(320, height - 135, f"INSURER A : {info['insurer_name']}")
    c.drawString(320, height - 150, "INSURER B : ALLIED WORLD ASSURANCE")

    c.setLineWidth(1)
    c.line(50, height - 170, width - 50, height - 170)

    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, height - 190, "COVERAGES: COMMERCIAL GENERAL LIABILITY")
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 210, f"POLICY NUMBER: {info['policy_number']}")
    c.drawString(50, height - 230, f"POLICY EFF (MM/DD/YYYY): {info['effective_date']}")
    c.drawString(50, height - 250, f"POLICY EXP (MM/DD/YYYY): {info['expiration_date']}")

    c.setFont("Helvetica-Bold", 10)
    c.drawString(350, height - 190, "LIMITS")
    y = height - 210
    limits = info["coverage_limits"]
    c.setFont("Helvetica", 10)
    c.drawString(350, y, f"EACH OCCURRENCE $ {int(limits.get('each_occurrence', 1000000)):,}")
    c.drawString(350, y - 20, "DAMAGE TO RENTED PREMISES $ 100,000")
    c.drawString(350, y - 40, "MED EXP (Any one person) $ 10,000")
    c.drawString(350, y - 60, "PERSONAL & ADV INJURY $ 1,000,000")
    c.drawString(
        350, y - 80, f"GENERAL AGGREGATE $ {int(limits.get('general_aggregate', 2000000)):,}"
    )
    c.drawString(350, y - 100, "PRODUCTS - COMP/OP AGG $ 2,000,000")

    c.showPage()
    c.save()


def create_acord25_xlsx(info: dict, path: Path):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "ACORD 25"

    ws.append(["ACORD 25 (2016/03) - CERTIFICATE OF LIABILITY INSURANCE"])
    ws.append([])
    ws.append(["INSURED:", info["insured_name"]])
    ws.append(["INSURER A:", info["insurer_name"]])
    ws.append([])
    ws.append(["POLICY NUMBER:", info["policy_number"]])
    ws.append(["POLICY EFF:", info["effective_date"]])
    ws.append(["POLICY EXP:", info["expiration_date"]])
    ws.append([])
    ws.append(["COVERAGE LIMITS"])
    limits = info["coverage_limits"]
    ws.append(["EACH OCCURRENCE", f"$ {int(limits.get('each_occurrence', 1000000)):,}"])
    ws.append(["DAMAGE TO RENTED PREMISES", "$ 100,000"])
    ws.append(["GENERAL AGGREGATE", f"$ {int(limits.get('general_aggregate', 2000000)):,}"])

    wb.save(path)


def generate_all_dataset():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    all_ground_truths = []

    print(f"Generating 40 benchmark evaluation documents into: {DATA_DIR}")

    # 1. Generate 20 Invoices
    for item in INVOICE_GROUND_TRUTHS:
        doc_id = item["doc_id"]
        fmt = item["format"]
        file_path = DATA_DIR / f"{doc_id}.{fmt}"

        if fmt == "pdf":
            create_invoice_pdf(item, file_path)
        else:
            create_invoice_xlsx(item, file_path)

        # Ground truth json
        json_path = DATA_DIR / f"{doc_id}.json"
        json_path.write_text(json.dumps(item, indent=2), encoding="utf-8")
        all_ground_truths.append(item)

    # 2. Generate 20 ACORD 25 certificates
    for item in ACORD_GROUND_TRUTHS:
        doc_id = item["doc_id"]
        fmt = item["format"]
        file_path = DATA_DIR / f"{doc_id}.{fmt}"

        if fmt == "pdf":
            create_acord25_pdf(item, file_path)
        else:
            create_acord25_xlsx(item, file_path)

        json_path = DATA_DIR / f"{doc_id}.json"
        json_path.write_text(json.dumps(item, indent=2), encoding="utf-8")
        all_ground_truths.append(item)

    manifest_path = EVALS_DIR / "dataset.json"
    manifest_path.write_text(json.dumps(all_ground_truths, indent=2), encoding="utf-8")
    print(f"Generated 40 documents successfully. Manifest written to: {manifest_path}")


if __name__ == "__main__":
    generate_all_dataset()
