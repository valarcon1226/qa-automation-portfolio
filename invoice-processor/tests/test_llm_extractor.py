"""Unit tests for LLM-based structured extraction and source provenance verification."""

import json
from decimal import Decimal
from unittest.mock import patch

import pytest

from app.models.schemas import FieldSource
from app.services.extractor import extractor, verify_llm_sources
from app.services.llm_client import LLMValidationError, llm_client


def test_verify_llm_sources_valid_and_invalid():
    pages = [
        "First page with issuer SOLUCIONES ANDINAS S.A.S. and invoice FEV-1001",
        "Second page with Total a Pagar: $ 1,785,000",
    ]

    raw_sources = {
        # Valid source on page 1
        "issuer_name": FieldSource(page=1, text_snippet="SOLUCIONES ANDINAS S.A.S."),
        # Valid source on page 2
        "total": FieldSource(page=2, text_snippet="Total a Pagar: $ 1,785,000"),
        # Hallucinated snippet on page 1
        "recipient_name": FieldSource(page=1, text_snippet="NON_EXISTENT_COMPANY"),
        # Wrong page (snippet is on page 2, not page 1)
        "tax_amount": FieldSource(page=1, text_snippet="Total a Pagar: $ 1,785,000"),
        # Out of bounds page
        "due_date": FieldSource(page=99, text_snippet="2026-10-31"),
    }

    verified = verify_llm_sources(raw_sources, pages)

    assert verified["issuer_name"].page == 1
    assert verified["issuer_name"].text_snippet == "SOLUCIONES ANDINAS S.A.S."

    assert verified["total"].page == 2
    assert verified["total"].text_snippet == "Total a Pagar: $ 1,785,000"

    # Hallucinated or wrong page sources must be marked as without source
    assert verified["recipient_name"].page is None
    assert verified["recipient_name"].text_snippet is None

    assert verified["tax_amount"].page is None
    assert verified["tax_amount"].text_snippet is None

    assert verified["due_date"].page is None
    assert verified["due_date"].text_snippet is None


def test_llm_extraction_success():
    sample_text = "SOLUCIONES ANDINAS S.A.S.\nFactura No: FEV-1001\nTotal a Pagar: $ 1,785,000\n"

    mock_llm_json = {
        "issuer_name": "SOLUCIONES ANDINAS S.A.S.",
        "issuer_vat": "900.123.456-8",
        "invoice_number": "FEV-1001",
        "invoice_date": "2026-10-01",
        "total": 1785000.0,
        "currency": "COP",
        "line_items": [
            {
                "description": "Licencias Cloud",
                "quantity": 1,
                "unit_price": 1785000.0,
                "line_total": 1785000.0,
            }
        ],
        "field_sources": {
            "issuer_name": {"page": 1, "text_snippet": "SOLUCIONES ANDINAS S.A.S."},
            "invoice_number": {"page": 1, "text_snippet": "Factura No: FEV-1001"},
            "total": {"page": 1, "text_snippet": "Total a Pagar: $ 1,785,000"},
        },
    }

    with patch.object(llm_client, "chat_completion", return_value=json.dumps(mock_llm_json)):
        extracted = extractor.extract(sample_text, method="llm")

        assert extracted.issuer_name == "SOLUCIONES ANDINAS S.A.S."
        assert extracted.invoice_number == "FEV-1001"
        assert extracted.total == Decimal("1785000.0")
        assert len(extracted.line_items) == 1
        assert extracted.field_sources["issuer_name"].page == 1
        assert extracted.field_sources["total"].page == 1


def test_llm_extraction_retry_on_initial_validation_error():
    sample_text = "SOLUCIONES ANDINAS S.A.S. Factura No: FEV-1001 Total: 1000"

    # First attempt: invalid total (cannot parse string "one thousand" as Decimal)
    invalid_response = json.dumps({"issuer_name": "Test", "total": "not-a-number"})
    # Second attempt (after retry): valid response
    valid_response = json.dumps(
        {
            "issuer_name": "SOLUCIONES ANDINAS S.A.S.",
            "invoice_number": "FEV-1001",
            "total": 1000.0,
            "field_sources": {
                "issuer_name": {"page": 1, "text_snippet": "SOLUCIONES ANDINAS S.A.S."},
            },
        }
    )

    with patch.object(
        llm_client, "chat_completion", side_effect=[invalid_response, valid_response]
    ):
        extracted = extractor.extract(sample_text, method="llm")
        assert extracted.issuer_name == "SOLUCIONES ANDINAS S.A.S."
        assert extracted.total == Decimal("1000.0")


def test_llm_extraction_fails_after_retries():
    sample_text = "Bad invoice text"
    # Both attempts invalid
    invalid_1 = "Invalid JSON {{{ broken"
    invalid_2 = json.dumps({"total": "definitely-not-valid-decimal"})

    with patch.object(llm_client, "chat_completion", side_effect=[invalid_1, invalid_2]):
        with pytest.raises(LLMValidationError) as exc_info:
            extractor.extract(sample_text, method="llm")
        assert "failed validation" in str(exc_info.value)
