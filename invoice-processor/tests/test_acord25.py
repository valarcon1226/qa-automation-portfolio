"""Unit tests for ACORD 25 Certificate of Liability Insurance extraction."""

import json
from decimal import Decimal
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.models.schemas import Acord25Certificate
from app.services.extractor import detect_document_type, extractor
from app.services.llm_client import llm_client

ACORD_SAMPLE_TEXT = """
ACORD 25 (2016/03)
CERTIFICATE OF LIABILITY INSURANCE
PRODUCER: GLOBAL RISK BROKERS INC
INSURED: ANDES LOGISTICS GROUP LLC
100 Industrial Parkway, Miami, FL 33101

INSURER A : TRAVELERS CASUALTY AND SURETY COMPANY
INSURER B : HARTFORD FIRE INSURANCE CO

COVERAGES: COMMERCIAL GENERAL LIABILITY
POLICY NUMBER: GL-98765432-01
POLICY EFF (MM/DD/YYYY): 01/01/2026
POLICY EXP (MM/DD/YYYY): 01/01/2027

LIMITS:
EACH OCCURRENCE $ 1,000,000
DAMAGE TO RENTED PREMISES $ 100,000
MED EXP (Any one person) $ 10,000
PERSONAL & ADV INJURY $ 1,000,000
GENERAL AGGREGATE $ 2,000,000
PRODUCTS - COMP/OP AGG $ 2,000,000
"""


def test_detect_document_type():
    invoice_text = "FACTURA ELECTRONICA DE VENTA No FEV-1001 NIT: 900.123.456-8 Total: $ 500,000"
    assert detect_document_type(invoice_text) == "INVOICE"
    assert detect_document_type(ACORD_SAMPLE_TEXT) == "ACORD_25"


def test_acord25_regex_extraction():
    cert = extractor.extract(ACORD_SAMPLE_TEXT, method="regex")
    assert isinstance(cert, Acord25Certificate)
    assert cert.document_type == "ACORD_25"
    assert cert.insured_name == "ANDES LOGISTICS GROUP LLC"
    assert cert.insurer_name == "TRAVELERS CASUALTY AND SURETY COMPANY"
    assert cert.policy_number == "GL-98765432-01"
    assert str(cert.effective_date) == "2026-01-01"
    assert str(cert.expiration_date) == "2027-01-01"

    # Coverage limits
    limits_dict = {cov.coverage_type.upper(): cov.limit_amount for cov in cert.coverage_limits}
    assert limits_dict.get("EACH OCCURRENCE") == Decimal("1000000")
    assert limits_dict.get("GENERAL AGGREGATE") == Decimal("2000000")

    # Sources
    assert cert.field_sources["insured_name"].page == 1
    assert "ANDES LOGISTICS GROUP LLC" in cert.field_sources["insured_name"].text_snippet
    assert cert.field_sources["policy_number"].page == 1
    assert "GL-98765432-01" in cert.field_sources["policy_number"].text_snippet


def test_acord25_llm_extraction():
    mock_data = {
        "insured_name": "ANDES LOGISTICS GROUP LLC",
        "insurer_name": "TRAVELERS CASUALTY AND SURETY COMPANY",
        "policy_number": "GL-98765432-01",
        "effective_date": "2026-01-01",
        "expiration_date": "2027-01-01",
        "coverage_limits": [
            {"coverage_type": "Each Occurrence", "limit_amount": 1000000.0},
            {"coverage_type": "General Aggregate", "limit_amount": 2000000.0},
        ],
        "field_sources": {
            "insured_name": {"page": 1, "text_snippet": "INSURED: ANDES LOGISTICS GROUP LLC"},
            "policy_number": {"page": 1, "text_snippet": "POLICY NUMBER: GL-98765432-01"},
        },
    }

    with patch.object(llm_client, "chat_completion", return_value=json.dumps(mock_data)):
        cert = extractor.extract(ACORD_SAMPLE_TEXT, method="llm")
        assert isinstance(cert, Acord25Certificate)
        assert cert.insured_name == "ANDES LOGISTICS GROUP LLC"
        assert cert.policy_number == "GL-98765432-01"
        assert cert.field_sources["insured_name"].page == 1
        assert (
            cert.field_sources["insured_name"].text_snippet == "INSURED: ANDES LOGISTICS GROUP LLC"
        )


def test_insurance_api_endpoint(client: TestClient, auth_headers: dict):
    with patch("app.api.routes.ocr_engine.process_file", return_value=(ACORD_SAMPLE_TEXT, 1)):
        files = {"file": ("cert_acord25.pdf", b"%PDF-mock", "application/pdf")}
        response = client.post(
            "/api/v1/insurance/process",
            files=files,
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["document_type"] == "ACORD_25"
        assert data["insured_name"] == "ANDES LOGISTICS GROUP LLC"
        assert data["policy_number"] == "GL-98765432-01"
        assert len(data["coverage_limits"]) >= 2
