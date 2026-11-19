import json
import sys
from contextlib import contextmanager
from pathlib import Path
from uuid import uuid4

import pytest

from app import routes, services
from tests.test_routes import HEADERS, client


BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

SINIESTROS_PATH = BASE_DIR / "listado_siniestros_desordenado.xlsx"
BIENES_PATH = BASE_DIR / "bienes_asegurados_desordenado.xlsx"


@pytest.fixture(scope="session", autouse=True)
def ensure_excels_generated():
    from generate_messy_excels import main as generate_excels
    generate_excels()


def test_excel_sheet_selection_and_flattening_siniestros():
    content = SINIESTROS_PATH.read_bytes()
    valid_rows, discarded_rows = services._parse_excel(content)

    # Valid data rows
    assert len(valid_rows) == 6
    # Discarded rows: 2 empty + 1 subtotal + 1 total
    assert len(discarded_rows) == 4

    # Verify canonical mapped keys
    first_row = valid_rows[0][1]
    assert first_row["first_name"] == "Carlos"
    assert first_row["last_name"] == "Mendez"
    assert first_row["email"] == "carlos.mendez@example.com"
    assert first_row["phone"] == "+1-555-0198"
    assert first_row["company"] == "Acme Corp"

    # Verify discarded row reasons
    reasons = [r[2] for r in discarded_rows]
    assert "Empty row discarded" in reasons
    assert any("SUBTOTAL" in r for r in reasons)
    assert any("TOTAL GENERAL" in r for r in reasons)


def test_excel_sheet_selection_and_flattening_bienes():
    content = BIENES_PATH.read_bytes()
    valid_rows, discarded_rows = services._parse_excel(content)

    assert len(valid_rows) == 5
    assert len(discarded_rows) == 4

    first_row = valid_rows[0][1]
    assert first_row["first_name"] == "Diego"
    assert first_row["last_name"] == "Morales"
    assert first_row["email"] == "diego.morales@example.com"
    assert first_row["company"] == "Andes Mining"


def test_real_intake_pipeline_siniestros(monkeypatch):
    upload_id = uuid4()
    content = SINIESTROS_PATH.read_bytes()

    updates, clean, errors, queue = [], [], [], []

    class Stored:
        def read(self):
            return content

        def close(self):
            pass

        def release_conn(self):
            pass

    class Store:
        def get_object(self, bucket, name):
            return Stored()

    class Queue:
        def lpush(self, name, raw):
            queue.append(json.loads(raw))

    class Connection:
        def execute(self, statement, params):
            updates.append(params)

    class Engine:
        @contextmanager
        def begin(self):
            yield Connection()

    monkeypatch.setattr(services.db, "get_minio", Store)
    monkeypatch.setattr(services.db, "get_redis", Queue)
    monkeypatch.setattr(services.db, "get_engine", Engine)
    monkeypatch.setattr(services, "insert_clean", lambda uid, line, row: clean.append(row) or True)
    monkeypatch.setattr(services, "log_error", lambda uid, line, row, reason: errors.append((line, reason)))
    monkeypatch.setattr(services.settings, "N8N_CALLBACK_URL", None)

    services.process_upload(upload_id)

    # 3 Clean rows (Carlos, Maria, Roberto)
    assert len(clean) == 3
    assert {c["first_name"] for c in clean} == {"Carlos", "Maria", "Roberto"}

    # 2 Ambiguous rows (Ana, Laura)
    assert len(queue) == 2
    assert {q["data"]["first_name"] for q in queue} == {"Ana", "Laura"}

    # 5 Errors/Discards: 1 failed row + 2 empty rows + 1 subtotal + 1 total
    assert len(errors) == 5
    error_reasons = [e[1] for e in errors]
    assert any("Missing required fields" in r for r in error_reasons)
    assert error_reasons.count("Empty row discarded") == 2
    assert any("SUBTOTAL" in r for r in error_reasons)
    assert any("TOTAL GENERAL" in r for r in error_reasons)

    # Total processed matches total rows (6 valid + 4 discarded = 10)
    assert updates[-1] == {"id": str(upload_id), "total": 10}


def test_real_intake_pipeline_bienes(monkeypatch):
    upload_id = uuid4()
    content = BIENES_PATH.read_bytes()

    updates, clean, errors, queue = [], [], [], []

    class Stored:
        def read(self):
            return content

        def close(self):
            pass

        def release_conn(self):
            pass

    class Store:
        def get_object(self, bucket, name):
            return Stored()

    class Queue:
        def lpush(self, name, raw):
            queue.append(json.loads(raw))

    class Connection:
        def execute(self, statement, params):
            updates.append(params)

    class Engine:
        @contextmanager
        def begin(self):
            yield Connection()

    monkeypatch.setattr(services.db, "get_minio", Store)
    monkeypatch.setattr(services.db, "get_redis", Queue)
    monkeypatch.setattr(services.db, "get_engine", Engine)
    monkeypatch.setattr(services, "insert_clean", lambda uid, line, row: clean.append(row) or True)
    monkeypatch.setattr(services, "log_error", lambda uid, line, row, reason: errors.append((line, reason)))
    monkeypatch.setattr(services.settings, "N8N_CALLBACK_URL", None)

    services.process_upload(upload_id)

    # 3 clean (Diego, Javier, Elena)
    assert len(clean) == 3
    assert {c["first_name"] for c in clean} == {"Diego", "Javier", "Elena"}

    # 1 ambiguous (Sofia)
    assert len(queue) == 1
    assert queue[0]["data"]["first_name"] == "Sofia"

    # 5 errors/discards (1 failed + 2 empty + 1 subtotal + 1 total)
    assert len(errors) == 5
    assert updates[-1] == {"id": str(upload_id), "total": 9}


def test_upload_endpoint_accepts_xlsx(monkeypatch):
    calls = []

    class Store:
        def bucket_exists(self, name):
            return True

        def put_object(self, bucket, name, stream, length):
            calls.append((bucket, name, stream.read(), length))

    class Connection:
        def execute(self, statement, parameters):
            calls.append(parameters)

    class Engine:
        @contextmanager
        def begin(self):
            yield Connection()

    monkeypatch.setattr(routes.db, "get_minio", Store)
    monkeypatch.setattr(routes.db, "get_engine", Engine)
    monkeypatch.setattr(routes, "process_upload", lambda uid, cb=None: None)

    content = SINIESTROS_PATH.read_bytes()
    result = client.post(
        "/api/v1/intake/upload",
        files={"file": ("listado_siniestros.xlsx", content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=HEADERS,
    )
    assert result.status_code == 202
    assert result.json()["status"] == "processing"
