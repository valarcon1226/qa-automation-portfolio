"""Pydantic schemas for HTTP requests and responses."""

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class FieldSource(BaseModel):
    page: int | None = None
    text_snippet: str | None = None

    model_config = ConfigDict(from_attributes=True)


class LineItemSchema(BaseModel):
    item_id: uuid.UUID | None = None
    description: str | None = None
    quantity: Decimal | None = None
    unit_price: Decimal | None = None
    line_total: Decimal | None = None

    model_config = ConfigDict(from_attributes=True)


class InvoiceResponse(BaseModel):
    invoice_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    original_filename: str = ""
    minio_key: str = ""
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
    currency: str | None = None
    is_valid: bool = False
    validation_errors: list[str] = Field(default_factory=list)
    status: str = "COMPLETED"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    line_items: list[LineItemSchema] = Field(default_factory=list)
    field_sources: dict[str, FieldSource] = Field(default_factory=dict)
    document_type: str = "INVOICE"

    model_config = ConfigDict(from_attributes=True)


class CoverageLimit(BaseModel):
    coverage_type: str
    limit_amount: Decimal | None = None
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)


class Acord25Certificate(BaseModel):
    insured_name: str | None = None
    insurer_name: str | None = None
    policy_number: str | None = None
    effective_date: date | None = None
    expiration_date: date | None = None
    coverage_limits: list[CoverageLimit] = Field(default_factory=list)
    document_type: str = "ACORD_25"
    is_valid: bool = True
    validation_errors: list[str] = Field(default_factory=list)
    field_sources: dict[str, FieldSource] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class InvoiceListItem(BaseModel):
    invoice_id: uuid.UUID
    issuer_name: str | None = None
    total: Decimal | None = None
    currency: str | None = None
    is_valid: bool = False
    status: str = "COMPLETED"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InvoiceListResponse(BaseModel):
    data: list[InvoiceListItem]
    total_records: int
    page: int
    limit: int


class JobResponse(BaseModel):
    job_id: str
    status: str
    progress: str | None = None
    message: str | None = None
    invoice_id: uuid.UUID | None = None


class ExportRequest(BaseModel):
    format: str = "csv"
    start_date: date | None = None
    end_date: date | None = None


class ExportResponse(BaseModel):
    status: str = "SUCCESS"
    exported_records: int
    format: str
    content: str | None = None
