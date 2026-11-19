import csv
import io
import json
import logging
import re
import unicodedata
from datetime import date, datetime
from typing import Literal
from urllib.parse import unquote, urlsplit
from uuid import UUID, uuid4

import httpx
from sqlalchemy import text

from app import db
from app.config import settings
from app.models import ReviewItem, RowData

EMAIL = re.compile(r"[^@\s]+@[^@\s]+")
PHONE = re.compile(r"\+?[\d\s\-().]{7,}")
TOTAL_PATTERN = re.compile(
    r"\b(sub-?total|total general|grand total|total|totales|resumen|promedio|average|suma|sum)\b",
    re.IGNORECASE,
)


def _normalize_header_name(header: str) -> str:
    text_val = unicodedata.normalize("NFKD", str(header or "")).encode("ascii", "ignore").decode("utf-8")
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", text_val)).strip().lower()


def _map_to_canonical_key(header: str) -> str:
    norm = _normalize_header_name(header)
    if any(k in norm for k in ("email", "e mail", "correo", "mail")):
        return "email"
    if any(k in norm for k in ("telefono", "phone", "celular", "tel", "movil")):
        return "phone"
    if any(k in norm for k in ("compania", "empresa", "company", "aseguradora", "corporacion", "entidad", "organizacion")):
        return "company"
    if any(k in norm for k in ("apellido", "apellidos", "last name", "lastname", "surname")):
        return "last_name"
    if any(k in norm for k in ("primer nombre", "first name", "firstname", "nombre", "nombres")):
        return "first_name"
    return norm.replace(" ", "_")


def _format_cell_value(val: object) -> str:
    if val is None:
        return ""
    if isinstance(val, (datetime, date)):
        return val.strftime("%Y-%m-%d")
    return str(val).strip()


def _select_data_worksheet(wb):
    if len(wb.sheetnames) == 1:
        return wb.active

    metadata_keywords = {"portada", "instrucciones", "resumen", "control", "notas", "firmas", "auditoria", "index", "readme", "guia"}
    best_sheet = None
    best_score = -1000

    for name in wb.sheetnames:
        ws = wb[name]
        lower_name = name.lower()
        non_empty_rows = 0
        total_cells = 0
        for row in ws.iter_rows(values_only=True):
            cells = [c for c in row if c is not None and str(c).strip() != ""]
            if cells:
                total_cells += len(cells)
                if len(cells) >= 2:
                    non_empty_rows += 1
        score = non_empty_rows * 10 + total_cells
        if any(meta in lower_name for meta in metadata_keywords):
            score -= 50
        if score > best_score:
            best_score = score
            best_sheet = ws

    return best_sheet or wb.active


def _parse_excel(content: bytes) -> tuple[list[tuple[int, dict]], list[tuple[int, dict, str]]]:
    import openpyxl

    wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
    ws = _select_data_worksheet(wb)

    merge_map = {}
    for rng in ws.merged_cells.ranges:
        top_left_val = ws.cell(rng.min_row, rng.min_col).value
        for r in range(rng.min_row, rng.max_row + 1):
            for c in range(rng.min_col, rng.max_col + 1):
                merge_map[(r, c)] = top_left_val

    header_row_idx = None
    max_scan = min(ws.max_row, 20)
    for r in range(1, max_scan + 1):
        row_cells = [ws.cell(r, c).value for c in range(1, ws.max_column + 1)]
        non_empty = [c for c in row_cells if c is not None and str(c).strip() != ""]
        if len(non_empty) >= 3:
            header_row_idx = r
            break
    if not header_row_idx:
        header_row_idx = 1

    is_two_row = False
    next_r = header_row_idx + 1
    if next_r <= ws.max_row:
        has_merged = any(rng.min_row <= header_row_idx <= rng.max_row for rng in ws.merged_cells.ranges)
        next_cells = [ws.cell(next_r, c).value for c in range(1, ws.max_column + 1)]
        next_non_empty = [c for c in next_cells if c is not None and str(c).strip() != ""]
        if has_merged or len(next_non_empty) >= 3:
            has_data_val = any(isinstance(c, (int, float, datetime, date)) or "@" in str(c or "") for c in next_cells)
            if not has_data_val:
                is_two_row = True

    headers = []
    for c in range(1, ws.max_column + 1):
        v1 = merge_map.get((header_row_idx, c), ws.cell(header_row_idx, c).value)
        v1_str = str(v1 or "").strip()
        if is_two_row:
            v2 = merge_map.get((next_r, c), ws.cell(next_r, c).value)
            v2_str = str(v2 or "").strip()
            if v1_str and v2_str and v1_str.lower() != v2_str.lower():
                combined = f"{v1_str} {v2_str}"
            else:
                combined = v2_str or v1_str
        else:
            combined = v1_str
        headers.append(_map_to_canonical_key(combined) if combined else f"col_{c}")

    data_start = (header_row_idx + 2) if is_two_row else (header_row_idx + 1)
    valid_rows = []
    discarded_rows = []

    for r in range(data_start, ws.max_row + 1):
        row_vals = [ws.cell(r, c).value for c in range(1, ws.max_column + 1)]
        non_empty = [c for c in row_vals if c is not None and str(c).strip() != ""]
        if not non_empty:
            discarded_rows.append((r, {}, "Empty row discarded"))
            continue

        row_dict = {}
        for col_name, val in zip(headers, row_vals):
            row_dict[col_name] = _format_cell_value(val)

        is_total = False
        total_label = ""
        for val in row_vals:
            if val is not None and isinstance(val, str) and TOTAL_PATTERN.search(val.strip()):
                is_total = True
                total_label = val.strip()
                break
        if is_total:
            discarded_rows.append((r, row_dict, f"Total/subtotal row discarded: {total_label}"))
            continue

        valid_rows.append((r, row_dict))

    return valid_rows, discarded_rows


def read_tabular_stream(content: bytes) -> tuple[list[tuple[int, dict]], list[tuple[int, dict, str]]]:
    if content.startswith(b"PK\x03\x04") or content.startswith(b"\xd0\xcf\x11\xe0"):
        return _parse_excel(content)

    rows = list(csv.DictReader(io.StringIO(content.decode("utf-8-sig"))))
    valid_rows = [(line_number, raw) for line_number, raw in enumerate(rows, start=2)]
    return valid_rows, []


def normalize_row(row: dict) -> dict:
    result = {key: str(value or "").strip() for key, value in row.items()}
    result["email"] = result.get("email", "").lower()
    return result


def row_issues(row: dict) -> list[str]:
    data = normalize_row(row)
    issues = []
    if not data.get("first_name") or not data.get("last_name"):
        issues.append("Missing required fields")
    if not EMAIL.fullmatch(data.get("email", "")):
        issues.append("Invalid email")
    if not data.get("company"):
        issues.append("Missing company")
    if EMAIL.fullmatch(data.get("email", "")) and "." not in data["email"].split("@")[1]:
        issues.append("Potentially invalid email domain")
    if not PHONE.fullmatch(data.get("phone", "")):
        issues.append("Invalid phone")
    return issues


def clean_row(row: dict) -> Literal["clean", "ambiguous", "failed"]:
    issues = row_issues(row)
    if "Missing required fields" in issues or "Invalid email" in issues:
        return "failed"
    return "ambiguous" if issues else "clean"


def is_allowed_callback_url(callback_url: str, base_url: str | None) -> bool:
    if not base_url or not callback_url or callback_url != callback_url.strip():
        return False
    try:
        base = urlsplit(base_url)
        candidate = urlsplit(callback_url)
        same_origin = (
            candidate.scheme.lower() == base.scheme.lower()
            and candidate.hostname is not None
            and candidate.hostname.lower() == (base.hostname or "").lower()
            and candidate.port == base.port
            and candidate.username is None
            and candidate.password is None
        )
    except ValueError:
        return False
    if not same_origin or base.query or base.fragment or candidate.fragment:
        return False
    base_path = unquote(base.path)
    callback_path = unquote(candidate.path)
    if not base_path.endswith("/"):
        base_path += "/"
    if not callback_path.startswith(base_path):
        return False
    return not any(part in {".", ".."} for part in callback_path.split("/"))


def process_upload(upload_id: UUID, callback_url: str | None = None) -> None:
    try:
        stored = db.get_minio().get_object(settings.MINIO_BUCKET_NAME, str(upload_id))
        try:
            content = stored.read()
        finally:
            stored.close()
            stored.release_conn()

        valid_rows, discarded_rows = read_tabular_stream(content)

        # Discarded rows are reported with reason; never lost in silence
        for line_number, raw, reason in discarded_rows:
            log_error(upload_id, line_number, raw, reason)

        for line_number, raw in valid_rows:
            row = normalize_row(raw)
            classification = clean_row(row)
            if classification == "ambiguous":
                item = ReviewItem(
                    record_id=uuid4(),
                    upload_id=upload_id,
                    line_number=line_number,
                    data=RowData.model_validate(row),
                    reasons=row_issues(row),
                )
                db.get_redis().lpush("review_queue", item.model_dump_json())
                continue
            if classification == "failed":
                log_error(upload_id, line_number, row, "; ".join(row_issues(row)))
                continue
            if not insert_clean(upload_id, line_number, row):
                log_error(upload_id, line_number, row, "Duplicate email in upload")

        total_processed = len(valid_rows) + len(discarded_rows)
        with db.get_engine().begin() as connection:
            connection.execute(
                text(
                    "UPDATE uploads SET status='completed', total_rows=:total "
                    "WHERE upload_id=CAST(:id AS uuid)"
                ),
                {"id": str(upload_id), "total": total_processed},
            )
        callback_target = callback_url if callback_url is not None else settings.N8N_CALLBACK_URL
        if callback_target:
            try:
                if callback_url is not None and not is_allowed_callback_url(
                    callback_url, settings.N8N_RESUME_BASE_URL
                ):
                    raise ValueError("Unvalidated n8n callback URL")
                from app.routes import get_status

                status = get_status(upload_id)
                payload = status.model_dump(mode="json")
                payload["clean_rows_count"] = payload.pop("clean_rows")
                with db.get_engine().connect() as connection:
                    result = connection.execute(
                        text(
                            "SELECT line_number, first_name, last_name, email, phone, company "
                            "FROM clean_data WHERE upload_id=CAST(:id AS uuid) "
                            "ORDER BY line_number"
                        ),
                        {"id": str(upload_id)},
                    )
                    payload["clean_rows"] = [dict(row) for row in result.mappings().all()]
                httpx.post(callback_target, json=payload, timeout=5).raise_for_status()
            except Exception:
                logging.exception("Intake callback failed for %s", upload_id)
    except Exception:
        logging.exception("Intake processing failed for %s", upload_id)
        with db.get_engine().begin() as connection:
            connection.execute(
                text("UPDATE uploads SET status='failed' WHERE upload_id=CAST(:id AS uuid)"),
                {"id": str(upload_id)},
            )


def insert_clean(upload_id: UUID, line_number: int, row: dict) -> bool:
    clean_params = {
        "id": str(upload_id),
        "line": line_number,
        "first_name": row.get("first_name", ""),
        "last_name": row.get("last_name", ""),
        "email": row.get("email", ""),
        "phone": row.get("phone", ""),
        "company": row.get("company", ""),
    }
    with db.get_engine().begin() as connection:
        inserted = connection.execute(
            text(
                "INSERT INTO clean_data (upload_id, line_number, first_name, last_name, email, "
                "phone, company) "
                "VALUES (CAST(:id AS uuid), :line, :first_name, :last_name, :email, "
                ":phone, :company) "
                "ON CONFLICT (upload_id, email) DO NOTHING RETURNING record_id"
            ),
            clean_params,
        )
        return inserted.scalar_one_or_none() is not None


def log_error(upload_id: UUID, line_number: int, row: dict, reason: str) -> None:
    with db.get_engine().begin() as connection:
        connection.execute(
            text(
                "INSERT INTO error_log (upload_id, line_number, row_data, error_reason) "
                "VALUES (CAST(:id AS uuid), :line, CAST(:row AS jsonb), :reason)"
            ),
            {"id": str(upload_id), "line": line_number, "row": json.dumps(row), "reason": reason},
        )
