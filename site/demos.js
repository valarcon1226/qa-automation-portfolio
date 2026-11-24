window.DEMOS = {
  "smart-data-intake": {
    problem:
      "Manual CSV and Excel onboarding imports corrupt downstream CRMs when multi-sheet workbooks include merged headers, title preambles, or summary totals. This pipeline validates, cleans, and routes each row into clean records, a human review queue, or an error log.",
    steps: [
      "Upload a CSV or messy Excel workbook to FastAPI (`POST /api/v1/intake/upload`) and store the original file in MinIO.",
      "Detect the primary data sheet, flatten two-row merged headers, and discard blank or subtotal/total rows.",
      "Classify each record via `clean_row()` into clean rows (PostgreSQL), ambiguous rows (Redis review queue), or failed rows (`error_log`).",
      "Review and correct ambiguous records in the decoupled Streamlit dashboard via FastAPI review endpoints.",
      "Resume the waiting n8n workflow via callback to sync approved rows downstream."
    ],
    example: {
      input: "curl -X GET \"http://localhost:8001/api/v1/intake/123e4567-e89b-12d3-a456-426614174000\" \\\n  -H \"accept: application/json\"",
      output: "{\n  \"upload_id\": \"123e4567-e89b-12d3-a456-426614174000\",\n  \"status\": \"completed\",\n  \"total_rows\": 100,\n  \"clean_rows\": 85,\n  \"ambiguous_rows\": 10,\n  \"failed_rows\": 5\n}",
      source: "README.md"
    },
    results: [
      {
        label: "Service & row classification unit tests",
        value: "4 passed (clean, ambiguous, failed + reasons); ruff and mypy clean",
        source: "EXECUTION_PLAN.md"
      },
      {
        label: "Pydantic schema model tests",
        value: "2 model tests passed",
        source: "EXECUTION_PLAN.md"
      }
    ],
    run: "docker compose up -d"
  },

  "invoice-processor": {
    problem:
      "Extracting fields from invoices and ACORD 25 insurance certificates manually is slow, and naive LLM extraction can hallucinate amounts or totals without traceability. This microservice extracts structured records with exact page-level `text_snippet` provenance and arithmetic/NIT validation.",
    steps: [
      "Detect whether the uploaded PDF, Excel workbook, or image is a commercial invoice (`INVOICE`) or an `ACORD_25` certificate.",
      "Extract raw text per page via `pypdf`, `openpyxl` sheet mapping, or Tesseract OCR fallback for scans.",
      "Route extraction through deterministic regular expressions (`method=regex`) or an OpenAI-compatible local Ollama model (`method=llm`) with one Pydantic validation retry.",
      "Verify each extracted `text_snippet` against the actual text of its cited page, clearing unverified sources.",
      "Validate invoice totals and Colombian NIT verification digits, persisting records in PostgreSQL and files in MinIO."
    ],
    example: {
      input: "curl -X POST \"http://127.0.0.1:8005/api/v1/invoices/process?method=regex\" \\\n  -F \"file=@factura.xlsx\"",
      output: "{\n  \"invoice_id\": \"7b8e1f2a-3c4d-5e6f-7a8b-9c0d1e2f3a4b\",\n  \"document_type\": \"INVOICE\",\n  \"issuer_name\": \"SOLUCIONES ANDINAS S.A.S.\",\n  \"issuer_vat\": \"900.123.456-8\",\n  \"invoice_number\": \"FEV-1001\",\n  \"invoice_date\": \"2026-10-01\",\n  \"subtotal\": 1000000.0,\n  \"tax_amount\": 190000.0,\n  \"total\": 1190000.0,\n  \"currency\": \"COP\",\n  \"is_valid\": true,\n  \"field_sources\": {\n    \"issuer_name\": {\"page\": 1, \"text_snippet\": \"SOLUCIONES ANDINAS S.A.S.\"},\n    \"invoice_number\": {\"page\": 1, \"text_snippet\": \"Factura No: FEV-1001\"},\n    \"total\": {\"page\": 1, \"text_snippet\": \"Total a Pagar: $ 1,190,000\"}\n  }\n}",
      source: "README.md"
    },
    results: [
      {
        label: "Invoice extraction accuracy (Regex, 20 docs)",
        value: "100.0% issuer/VAT/number/date/currency; 90.0% subtotal/tax/total",
        source: "evals/results.md"
      },
      {
        label: "Invoice extraction accuracy (qwen3:4b LLM, 20 docs)",
        value: "95.0% core fields (1 schema failure inv_14); 20.0% ISO currency",
        source: "evals/results.md"
      },
      {
        label: "ACORD 25 accuracy (Regex & LLM, 20 docs)",
        value: "100.0% across all 6 certificate fields",
        source: "evals/results.md"
      },
      {
        label: "Docker OCR integration & regex extractor tests",
        value: "4 OCR integration passed; 8 regex fixture tests passed",
        source: "EXECUTION_PLAN.md"
      }
    ],
    run: "python -m pytest -q"
  },

  "ecommerce-order-automation": {
    problem:
      "Multi-channel e-commerce teams selling through WooCommerce, Shopify, and Stripe waste hours cross-checking separate dashboards and risk duplicated shipments on webhook retries. This service verifies signatures, deduplicates events, and unifies orders into MongoDB with automated customer alerts and an admin panel.",
    steps: [
      "Verify cryptographic webhook signatures (`x-wc-webhook-signature`, `X-Shopify-Hmac-Sha256`, and `Stripe-Signature` with 300 s tolerance) using constant-time comparison.",
      "Filter duplicate deliveries in MongoDB using unique indexes on event IDs and SHA-256 payload hashes.",
      "Normalize platform-specific payloads into a single canonical `Order` model with line items and shipping details.",
      "Dispatch order confirmation emails via SMTP (Mailpit locally) and WhatsApp status notifications.",
      "Manage fulfillment transitions (`listo_para_despachar` -> `despachado` -> `entregado`) and `.xlsx` exports from the CSRF-protected `/admin` dashboard."
    ],
    example: {
      input: "python samples/send_webhooks.py",
      output: "1. [WooCommerce] Sends multi-item order (ORD-WC-501, $86,000 COP) -> HTTP 200 processed\n2. [Shopify] Sends single-item order (ORD-SHP-1042, $55,000 COP) -> HTTP 200 processed\n3. [Stripe] Sends confirmed payment intent (ORD-STP-ABC999, $84,000 COP) -> HTTP 200 processed\n4. [Idempotency] Re-sends WooCommerce order -> HTTP 200 ignored (duplicate_event)\n5. [Security] Sends modified payload with forged signature -> HTTP 401 Unauthorized",
      source: "README.md"
    },
    images: [
      "../ecommerce-order-automation/docs/screenshots/admin-orders.png",
      "../ecommerce-order-automation/docs/screenshots/admin-order-detail.png"
    ],
    results: [
      {
        label: "Automated test suite (InMemoryRepository)",
        value: "31 passed, 1 warning in 33.08s (auth, CSRF, export, idempotency, normalization, status, webhooks)",
        source: "demo-output/run-2026-11-22.txt"
      }
    ],
    run: "docker compose up -d --build"
  },

  "whatsapp-restaurant-assistant": {
    problem:
      "Restaurants miss after-hours inquiries and make pricing or capacity errors when handling WhatsApp delivery orders and table bookings manually. This assistant answers 24/7 with BM25 knowledge grounding, deterministic PostgreSQL tool logic, and automated staff handover.",
    steps: [
      "Receive customer messages from Meta WhatsApp Cloud API, the web chat widget (`/web/chat`), or `/dev/chat`.",
      "Retrieve menu, hours, allergens, and delivery zone policies from `knowledge/*.md` via pure-Python BM25 ranking.",
      "Execute deterministic Python tools (`create_reservation`, `check_availability`, `register_event_lead`) against PostgreSQL enforcing Monday closures, max 12 guests, and minimum delivery thresholds.",
      "Hand off to human staff automatically after two consecutive agent failures or explicit customer request, pausing bot replies for 12 hours.",
      "Run a background worker loop to deliver automated WhatsApp reminders 24 hours before scheduled bookings."
    ],
    example: {
      input: "Pregunta del usuario (eval_04, rechazo_politica):\nNecesito una mesa para 20 personas este sábado para celebrar un cumpleaños.",
      output: "Herramienta obtenida: check_availability\nRespuesta real del modelo (qwen3:4b-instruct):\nLamentamos decirte que no podemos asignar una mesa para 20 personas este sábado, ya que nuestras mesas están limitadas a máximo 12 personas por reserva. Para eventos con más de 12 personas, como un cumpleaños, nosotros gestionamos un evento de catering en nuestro salón privado...",
      source: "evals/RESULTS.md"
    },
    results: [
      {
        label: "Conversation eval pass rate (qwen3:4b-instruct)",
        value: "9 / 30 cases passed (30.0%)",
        source: "evals/RESULTS.md"
      },
      {
        label: "Operating hours category",
        value: "3 / 3 passed (100.0%)",
        source: "evals/RESULTS.md"
      },
      {
        label: "Prompt injection category",
        value: "2 / 4 passed (50.0%)",
        source: "evals/RESULTS.md"
      },
      {
        label: "Failure cause breakdown (21 failed cases)",
        value: "14 overly literal assertion checks vs 7 real model defects",
        source: "evals/RESULTS.md"
      }
    ],
    run: "python -m pytest -q"
  },

  "web-chat-widget": {
    problem:
      "Embedding an AI assistant into existing restaurant websites often pulls heavy third-party script dependencies or breaks keyboard accessibility. This TypeScript and React widget compiles into a single dependency-free `widget.js` bundle connected to the restaurant assistant API.",
    steps: [
      "Embed a single `<script>` tag specifying `data-api` and `data-title` on any HTML page.",
      "Bundle React and UI logic with `esbuild` into a self-contained IIFE script (`widget.js`).",
      "Persist `chat_history` and `chat_session_id` in browser `localStorage` across page reloads.",
      "Support full keyboard navigation (`Enter` to open and focus input, `Escape` to close) and `aria-live=\"polite\"` announcements."
    ],
    example: {
      input: "btn = page.get_by_role(\"button\", name=\"Abrir chat\")\nbtn.click()\ninput = page.get_by_role(\"textbox\", name=\"Mensaje\")\ninput.fill('{\"tool\": \"get_menu\", \"arguments\": {}}')\ninput.press(\"Enter\")",
      output: "expect(page.locator(\"text=Escribiendo...\")).to_be_hidden(timeout=10000)\nexpect(page.locator(\"text=Ajiaco\").last).to_be_visible(timeout=10000)",
      source: "tests/test_widget.py"
    },
    images: [
      "../web-chat-widget/docs/screenshots/widget-closed.png",
      "../web-chat-widget/docs/screenshots/widget-chat.png"
    ],
    results: [
      {
        label: "TypeScript check & esbuild bundle",
        value: "tsc --noEmit clean; widget.js 143.8kb built in 40ms",
        source: "demo-output/run-2026-11-22.txt"
      },
      {
        label: "Playwright E2E suite (Edge)",
        value: "8 passed in 12.84s",
        source: "demo-output/run-2026-11-22.txt"
      }
    ],
    run: "npm run build"
  },

  "multi-agent-crews": {
    problem:
      "Comparing agent orchestration frameworks by reading documentation alone obscures practical differences in async execution, tool-call accounting, and structured output reliability. This service implements the exact same four-agent market research team in both CrewAI and AutoGen behind one FastAPI interface.",
    steps: [
      "Accept a research topic and target engine (`crewai` or `autogen`) via `POST /reports`, returning HTTP 202 with a report ID.",
      "Run the four-role pipeline (Researcher -> Analyst -> Writer -> Reviewer) using shared prompts and safe tools.",
      "Track corpus sources inside `search_corpus()` so the model cannot fabricate citations, and evaluate expressions safely via AST in `calculate()`.",
      "Parse Markdown sections into a uniform `Report` object and persist status/results in SQLite."
    ],
    example: {
      input: "curl -X POST localhost:8017/reports -H \"Content-Type: application/json\" \\\n     -d '{\"topic\": \"demand for AI agents in LATAM\", \"engine\": \"crewai\"}'",
      output: "{\"id\": 1, \"status\": \"pending\", ...}\n# Followed by GET /reports/1:\nstatus: completed + Report(title, findings, sources, recommendations, markdown, llm_calls, seconds)",
      source: "README.md"
    },
    results: [
      {
        label: "End-to-end suite (Fake LLM)",
        value: "20 passed (CrewAI, AutoGen, API, tools, parsing)",
        source: "README.md"
      },
      {
        label: "CrewAI 1.x benchmark (3 runs, fake LLM)",
        value: "0.5 s avg, 6.0 LLM calls, 3/3 complete reports (62 LOC)",
        source: "docs/COMPARACION.md"
      },
      {
        label: "AutoGen 0.7 benchmark (3 runs, fake LLM)",
        value: "0.0 s avg, 6.0 LLM calls, 3/3 complete reports (62 LOC)",
        source: "docs/COMPARACION.md"
      }
    ],
    run: "docker compose up -d --build"
  },

  "llm-platform-evals": {
    problem:
      "Deploying a self-hosted RAG stack (LiteLLM Proxy + Open WebUI + Ollama) without pre-registered quality gates hides silent retrieval misses, spend-accounting races, and truncated streaming responses. This suite validates gateway resilience and evaluates RAG accuracy against frozen thresholds.",
    steps: [
      "Freeze evaluation thresholds, corpus commit, and 150 Kubernetes documentation questions (`30 dev`, `120 test`) in `evals/config.toml` and `evals/golden.jsonl` before running.",
      "Ingest 187 Kubernetes Markdown pages into Open WebUI (`k8s-concepts`) and evaluate the test split across three passes using `qwen3:4b-instruct-2507-q4_K_M`.",
      "Inject HTTP 429, 500, latency, and truncated streams via `tests/fake_upstream.py` to verify gateway retries, budget enforcement, and stream-cut behavior.",
      "Compare run metrics against `evals/baseline.json` and log confirmed platform defects in `docs/FINDINGS.md`."
    ],
    example: {
      input: "{\"id\": \"GOLD-006\", \"split\": \"test\", \"question\": \"Which service replaces SSH tunnels for communication from the control plane to the cluster nodes?\", \"answerable\": true, \"gold_doc_paths\": [\"architecture/control-plane-node-communication.md\"], \"key_fact_regexes\": [\"Konnectivity\"]}",
      output: "{\"pass\": 1, \"id\": \"GOLD-006\", \"answerable\": true, \"answer\": \"The Konnectivity service replaces SSH tunnels for communication from the control plane to the cluster nodes [0]...\", \"top_sources\": [\"architecture/control-plane-node-communication.md\", \"services-networking/network-policies.md\"], \"answered_by\": \"qwen3:4b-instruct-2507-q4_K_M\", \"seconds\": 36.7}",
      source: "evals/baseline_answers.jsonl"
    },
    results: [
      {
        label: "Retrieval Hit@5 (120 test questions, 3 passes)",
        value: "0.938 (threshold ≥ 0.85 — Pass)",
        source: "README.md"
      },
      {
        label: "Key-fact correctness",
        value: "0.708 (threshold ≥ 0.75 — Fail)",
        source: "README.md"
      },
      {
        label: "Refusal rate / False refusal rate",
        value: "1.000 refusal (Pass) / 0.125 false refusal (≤ 0.10 — Fail)",
        source: "README.md"
      },
      {
        label: "Citation validity",
        value: "1.000 (threshold = 1.00 — Pass, with limit)",
        source: "README.md"
      },
      {
        label: "LiteLLM proxy vs direct latency p95 (200 reqs)",
        value: "0.00795 s proxy vs 0.00102 s direct",
        source: "results/metrics.json"
      }
    ],
    run: "uv run pytest tests/test_fake_upstream.py tests/evals -v"
  },

  "mcp-agent-evals": {
    problem:
      "Tool-using agents connected over the Model Context Protocol (MCP) can fail silently when parameter schemas lack descriptions, leak system prompts, or invent prices and policies. This harness evaluates an MCP restaurant server across 30 cases on tool selection, arguments, grounding, policy refusal, and prompt-injection defense.",
    steps: [
      "Expose 5 restaurant tools (`consultar_menu`, `consultar_horario`, `crear_reserva`, `estado_pedido`, `zonas_domicilio`) and policy resources over MCP (`stdio` and SSE).",
      "Execute 30 deterministic YAML test cases starting from a fresh SQLite database per run.",
      "Score every response across 5 metrics: tool selection, argument extraction, grounded answer, policy refusal, and injection defense.",
      "Compare rule-based stub self-checks against `qwen3:4b-instruct-2507-q4_K_M` before and after enriching MCP parameter descriptions."
    ],
    example: {
      input: "{\n  \"case_id\": \"eval_01\",\n  \"categoria\": \"menu_precios\",\n  \"pregunta\": \"¿Cuánto cuesta la Bandeja Paisa y qué ingredientes trae?\",\n  \"herramienta_esperada\": \"consultar_menu\"\n}",
      output: "{\n  \"herramienta_obtenida\": \"consultar_menu\",\n  \"passed_all\": true,\n  \"argumentos_obtenidos\": {\"categoria\": \"plato_fuerte\", \"plato\": \"Bandeja Paisa\"},\n  \"respuesta\": \"La **Bandeja Paisa** cuesta **$34.000** y trae los siguientes ingredientes:\\n- Carne molida\\n- Chicharrón\\n- Frijoles...\"\n}",
      source: "reports/qwen3-4b-instruct-param-descriptions/eval.json"
    },
    results: [
      {
        label: "Rule-based stub (--model fake)",
        value: "30 / 30 passed (harness self-check)",
        source: "reports/eval.md"
      },
      {
        label: "qwen3:4b-instruct (initial run)",
        value: "13 / 30 passed (Tools 27/30, Args 24/30, Grounded 15/30)",
        source: "reports/qwen3-4b-instruct/eval.md"
      },
      {
        label: "qwen3:4b-instruct (with parameter descriptions)",
        value: "16 / 30 passed (Tools 27/30, Args 27/30, Grounded 18/30)",
        source: "reports/qwen3-4b-instruct-param-descriptions/eval.md"
      },
      {
        label: "Policy enforcement & prompt injection (post-fix)",
        value: "Policy 6 / 6; Injection defense 3 / 4",
        source: "reports/qwen3-4b-instruct-param-descriptions/eval.md"
      }
    ],
    run: ".venv\\Scripts\\python.exe -m evals.runner --model fake"
  },

  "test-case-generator-evals": {
    problem:
      "LLM-generated test cases often look plausible while violating JSON schemas, omitting boundary assertions, duplicating existing steps, or citing nonexistent acceptance criteria. This generator and evaluation suite measures test generation quality against 6 deterministic metrics and pre-registered thresholds.",
    steps: [
      "Load structured e-commerce requirement definitions (`REQ-01` to `REQ-12`, split into 8 dev and 4 held-out test) with hand-crafted `must_have` regexes.",
      "Generate Pydantic-validated test cases via Ollama (`qwen3:4b-instruct-2507-q4_K_M`) or the deterministic `stub` model with a single retry on invalid JSON.",
      "Compute 6 deterministic metrics: first-try schema validity, declared vs regex-verified coverage, hallucinated criterion IDs, `difflib` duplicates, and negative/edge presence.",
      "Export a human QA precision review sheet (`evals/review.py export`) to complement automated regex checks."
    ],
    example: {
      input: "{\n  \"requirement_id\": \"REQ-09\",\n  \"requirement_title\": \"Seguimiento y trazabilidad de pedidos\",\n  \"valid_on_first_try\": false,\n  \"retries_used\": 1\n}",
      output: "{\n  \"id\": \"TC-01\",\n  \"title\": \"Verificar que el estado del pedido refleje etapas en tiempo real\",\n  \"level\": \"smoke\",\n  \"steps\": [\n    \"Iniciar sesión en el sistema de seguimiento de pedidos.\",\n    \"Navegar a la sección de seguimiento de pedidos.\",\n    \"Seleccionar un pedido en estado de preparación.\",\n    \"Verificar el estado actual del pedido en la interfaz.\"\n  ],\n  \"expected\": \"El estado del pedido debe mostrarse como 'en preparación'.\",\n  \"covers\": [\"AC-01\"]\n}",
      source: "reports/qwen3-4b-test/eval.json"
    },
    results: [
      {
        label: "Schema valid on 1st try (test split, 4 reqs / 31 cases)",
        value: "75.0% (threshold ≥ 90.0% — Fail)",
        source: "reports/qwen3-4b-test/eval.json"
      },
      {
        label: "Verified regex coverage (test split)",
        value: "93.8% (threshold ≥ 70.0% — Pass)",
        source: "reports/qwen3-4b-test/eval.json"
      },
      {
        label: "Hallucinated criterion references",
        value: "3.2% (threshold ≤ 2.0% — Fail)",
        source: "reports/qwen3-4b-test/eval.json"
      },
      {
        label: "Duplicate cases & negative/edge presence",
        value: "6.5% duplicates (≤ 10% Pass) / 100.0% negative presence (Pass)",
        source: "reports/qwen3-4b-test/eval.json"
      },
      {
        label: "Stub self-check (dev split, 32 cases)",
        value: "100% schema valid, 100% verified coverage, 0% hallucinated/duplicate",
        source: "reports/stub/eval.md"
      }
    ],
    run: ".venv\\Scripts\\python.exe -m evals.runner --model stub --split dev"
  },

  "commerce-order-integrity": {
    problem:
      "Production e-commerce platforms break under stock contention, network drops during checkout retries, failing webhook receivers, and schema upgrades. This QA suite runs real Saleor 3.20 containers with Toxiproxy, Hypothesis, Locust, and Playwright to measure order and inventory integrity.",
    steps: [
      "Boot pinned Saleor 3.20 API, Celery worker, Dashboard, PostgreSQL, Redis, and Toxiproxy containers.",
      "Exercise cursor pagination properties via Hypothesis across 2,000 orders and verify zero duplicates against SQL.",
      "Inject post-checkout connection drops and 30% HTTP 500 webhook errors through Toxiproxy, plus a 50-buyer race on 5 inventory units.",
      "Perform a live Saleor 3.19 -> 3.20 upgrade with 6 table checksums and execute cross-browser dashboard golden paths in Edge, Firefox, and WebKit."
    ],
    example: {
      input: "Steps to Reproduce (FINDING-001):\n1. Configure product variant with warehouse_stock.quantity = 5 and quantity_allocated = 0.\n2. Execute 50 simultaneous async checkoutCreate and checkoutComplete mutations.\n3. Inspect warehouse_allocation rows in PostgreSQL.",
      output: "Actual Result:\n- High concurrency creates between 5 and 8 orders per run on a variant with stock 5.\n- Across 20 runs: 18 total oversells occurred in 10 out of 20 runs.\n- Remaining stock dropped to negative values (between -1 and -3).",
      source: "docs/FINDINGS.md"
    },
    results: [
      {
        label: "Checkout create -> complete p95 (10 users, 5 min)",
        value: "200 ms (p50 140 ms, 702 checkouts, 0 errors)",
        source: "README.md"
      },
      {
        label: "products(first: 100) query p95",
        value: "50 ms (p50 32 ms, 2,107 queries, 0 errors)",
        source: "README.md"
      },
      {
        label: "Duplicate orders across 50 retry runs",
        value: "0 duplicate orders",
        source: "README.md"
      },
      {
        label: "Webhook recovery under 30% HTTP 500s",
        value: "100% delivered (500/500, avg retry gap 10.03 s)",
        source: "README.md"
      },
      {
        label: "Saleor 3.19 -> 3.20 upgrade checksums",
        value: "0 diffs across 6 checksums (41 migrations in 13.14 s)",
        source: "README.md"
      },
      {
        label: "Dashboard UI golden paths (Edge / Firefox / WebKit)",
        value: "15/15 passed on each engine (60.52 s / 74.63 s / 71.73 s)",
        source: "README.md"
      }
    ],
    run: "uv run pytest -m \"p1 and not (resilience or migration or perf)\" -v"
  },

  "document-intake-pipeline": {
    problem:
      "Document ingestion pipelines can lose tasks during broker restarts, skip rows on timestamp pagination ties, or fail silently on corrupt PDFs. This suite tests Paperless-ngx 2.14.7 with a deterministic 600-PDF corpus, Toxiproxy Redis faults, migration diffs, and axe-core accessibility scans.",
    steps: [
      "Generate a byte-reproducible 600-PDF corpus (`seed 42`) with 95% valid, 3% corrupt, and 2% duplicate files.",
      "Ingest a 500-document burst (`Semaphore(50)`) while injecting Redis connection drops and broker restarts via Toxiproxy.",
      "Test timestamp-tie pagination across 300 identical-timestamp docs, listing/search p95 latency, and partial bulk-edit failures.",
      "Evaluate the ML classifier across 3 seeds, run a 2.14.6 -> 2.14.7 migration diff, and scan `/documents` with `axe-core`."
    ],
    example: {
      input: "resp = await client.post(\n    f\"{base_url}/api/documents/post_document/\",\n    headers=auth_headers,\n    files={\"document\": (corrupt_filename, corrupt_bytes, \"application/pdf\")},\n)",
      output: "assert resp.status_code == 200\nassert task[\"status\"] == \"FAILURE\"\nassert any(err in result_msg for err in (\"InputFileError\", \"Error occurred\", \"not a valid\"))\nassert doc_resp.json().get(\"count\") == 0  # no DB row or orphan file left",
      source: "tests/api/test_partial.py"
    },
    results: [
      {
        label: "500-doc burst drain & accounting",
        value: "585.97 s (51.20 docs/min, 500/500 accounted, 990.70 MB peak)",
        source: "README.md"
      },
      {
        label: "Search & listing p95 latency (600 docs)",
        value: "224.23 ms search / 233.19 ms listing",
        source: "README.md"
      },
      {
        label: "Classifier Macro-F1 (3 seeds, 1,800 synthetic docs)",
        value: "1.0000 Macro-F1 / 1.0000 Min Recall",
        source: "results/evals.json"
      },
      {
        label: "Paperless-ngx 2.14.6 -> 2.14.7 migration",
        value: "2.75 s runtime, 0 metadata or file diffs (600 docs)",
        source: "README.md"
      },
      {
        label: "Axe-core accessibility scan on /documents",
        value: "7 critical/serious violations pinned (FINDING-001)",
        source: "results/metrics.json"
      }
    ],
    run: "uv run pytest -v"
  },

  "cdc-data-replication": {
    problem:
      "Change Data Capture (CDC) pipelines risk silent data loss, growing consumer lag, or broken schemas during slow sinks, Connect worker crashes, and live DDL changes. This suite validates PostgreSQL -> Debezium -> Redpanda -> PostgreSQL replication with Toxiproxy fault injection and a keyset reconciler.",
    steps: [
      "Stream `public.ledger` WAL changes from PostgreSQL 16 through Debezium 2.7.3 and Redpanda into an analytical PostgreSQL warehouse.",
      "Benchmark end-to-end replication lag at 100, 500, and 1,000 rows/s and inject 200 ms sink latency via Toxiproxy.",
      "Kill the Kafka Connect worker mid-stream (`docker kill`), inject malformed poison records to verify `dlq_ledger`, and execute 4 live DDL migrations.",
      "Verify 0 missing, extra, or changed rows across 1M-row snapshots and live 2.6.2 -> 2.7.3 upgrades using a 10k-chunk keyset reconciler."
    ],
    example: {
      input: "missing_ids = [10, 20, 30, 40, 50]\nextra_ids = [101, 102, 103, 104, 105]\nchanged_ids = [11, 21, 31, 41, 51]\n# Delete missing_ids, insert extra_ids, update changed_ids in warehouse",
      output: "result = reconcile_ledger(source_url=..., warehouse_url=..., chunk_size=20, max_id=150)\nassert sorted(result.missing_keys) == [10, 20, 30, 40, 50]\nassert sorted(result.extra_keys) == [101, 102, 103, 104, 105]\n# Reconciler reports exact 15 tampered differences",
      source: "tests/unit/test_reconciler.py"
    },
    results: [
      {
        label: "End-to-end lag p95 (CI)",
        value: "0.786 s at 500 rows/s; 0.940 s at 1,000 rows/s (18,200 samples)",
        source: "README.md"
      },
      {
        label: "Slow-sink catch-up (200 ms latency for 2 min)",
        value: "60.89 s catch-up (peak lag 24,120 msgs, 0 diffs)",
        source: "README.md"
      },
      {
        label: "1,000,000-row snapshot & keyset reconciler",
        value: "241.63 s snapshot / 6.86 s reconcile (0 lost, 0 repeated)",
        source: "README.md"
      },
      {
        label: "Debezium 2.6.2 -> 2.7.3 live upgrade",
        value: "13.48 s downtime, no re-snapshot, 0 diffs on 1,004,517 rows",
        source: "results/upgrade_metrics.json"
      }
    ],
    run: "uv run pytest tests/unit -v"
  },

  "identity-access": {
    problem:
      "Identity providers fail catastrophically if authorization codes can be replayed, password resets leak account existence during SMTP outages, or upgrades break TOTP secrets. This suite verifies Keycloak 26 against OWASP ASVS/RFC standards, Toxiproxy faults, 10k-user pagination, and Keycloak 25 -> 26 upgrades.",
    steps: [
      "Run full OIDC Authorization Code + PKCE S256 flows in Edge with RS256 JWKS verification and replay revocation tests.",
      "Verify TOTP MFA enrollment and exact 3-failure brute-force lockout across Edge, Firefox, and WebKit.",
      "Cut SMTP traffic with Toxiproxy during password resets to confirm anti-enumeration, and blast 300 token requests to verify HTTP 503 load shedding.",
      "Walk 10k users across page sizes, test partial import collision policies (SKIP/OVERWRITE/FAIL), and upgrade Keycloak 25.0.6 -> 26.0.5."
    ],
    example: {
      input: "token_payload = {\n    \"grant_type\": \"authorization_code\",\n    \"client_id\": client_id,\n    \"code\": code,\n    \"redirect_uri\": redirect_uri,\n    \"code_verifier\": verifier,\n}\nfirst_resp = httpx.post(token_url, data=token_payload)   # HTTP 200\nreplay_resp = httpx.post(token_url, data=token_payload)  # Replayed code",
      output: "assert replay_resp.status_code == 400\nassert replay_resp.json().get(\"error\") == \"invalid_grant\"\n# Introspect original access_token (RFC 9700 §2.1.1):\nassert intro_data.get(\"active\") is False",
      source: "tests/api/test_replay.py"
    },
    results: [
      {
        label: "Token endpoint p95 at 50 rps (CI)",
        value: "8.34 ms (577 requests, ~48 rps)",
        source: "README.md"
      },
      {
        label: "Password login p95 at 10 rps (CI)",
        value: "51.05 ms (120 requests)",
        source: "README.md"
      },
      {
        label: "300-request burst load shedding",
        value: "0 HTTP 500s (excess shed with 503, recovered < 2 s)",
        source: "README.md"
      },
      {
        label: "Keycloak 25.0.6 -> 26.0.5 upgrade",
        value: "16.54 s in CI (10,000 users, 20/20 TOTP logins preserved)",
        source: "README.md"
      }
    ],
    run: "uv run pytest tests/oidc.py -v"
  },

  "playwright-ts-parabank": {
    problem:
      "UI-only banking tests miss backend ledger mismatches, while browser-based Bill Pay scripts risk submitting duplicate payments on transient failures. This framework combines Playwright UI + REST API reconciliation with an idempotent, retry-safe Bill Pay batch automation tool.",
    steps: [
      "Execute Playwright TypeScript tests across ParaBank UI using fixture-based Page Objects, disposable customer teardown, and zero static sleeps.",
      "Cross-check UI fund transfers directly against the ParaBank REST API (`BankApiClient`) and verify visual snapshots on login.",
      "Pre-validate extracted invoice records in the Bill Pay runner, segregating invalid amounts to `rejected-records.json`.",
      "Persist `VERIFIED` state in `payment-state.json` before submission, retry transient errors with exponential backoff, and verify account activity."
    ],
    example: {
      input: "{\n  \"invoice_id\": \"3d4e5f6a-7b8c-9d0e-1f2a-3b4c5d6e7f04\",\n  \"invoice_number\": \"INV-2026-004-INVALID\",\n  \"issuer_name\": \"Summit Cloud Hosting\",\n  \"subtotal\": -95,\n  \"total\": -95,\n  \"currency\": \"USD\",\n  \"is_valid\": false,\n  \"validation_errors\": [\"Invoice total cannot be negative\"]\n}",
      output: "{\n  \"invoiceId\": \"3d4e5f6a-7b8c-9d0e-1f2a-3b4c5d6e7f04\",\n  \"invoiceNumber\": \"INV-2026-004-INVALID\",\n  \"status\": \"REJECTED\",\n  \"attempts\": 0,\n  \"error\": \"Amount must be a positive number greater than 0, received: -95\"\n}",
      source: "automation/run-summary.json"
    },
    results: [
      {
        label: "Automated test scenario coverage",
        value: "25 / 49 scenarios automated (51%: 10 API, 14 UI, 1 visual)",
        source: "README.md"
      },
      {
        label: "Last Playwright test run",
        value: "passed (0 failedTests)",
        source: "test-results/.last-run.json"
      },
      {
        label: "Bill Pay batch run idempotency check",
        value: "5 input records: 4 skipped (already paid), 1 rejected, 0 failed",
        source: "automation/run-summary.json"
      }
    ],
    images: [
      "../playwright-ts-parabank/tests/visual/login.spec.ts-snapshots/login-panel-edge-win32.png"
    ],
    run: "npm test"
  },

  "cypress-juice-shop": {
    problem:
      "Single-page e-commerce apps suffer from banner flakiness, network-error UI crashes, and authorization gaps between frontend validation and backend APIs. This Cypress + strict TypeScript suite tests OWASP Juice Shop with API seeding, `cy.intercept()` fault injection, and documented vulnerability reports.",
    steps: [
      "Pre-seed welcome/cookie banners and register disposable users via REST API commands (`cy.registerByApi`, `cy.loginByApi`).",
      "Run 11 E2E and API spec files covering auth, search, reviews, basket, checkout, feedback CAPTCHA, and localization on Edge/Firefox.",
      "Simulate HTTP 500 server errors and 1,000 ms latency via `cy.intercept()` to assert graceful UI degradation.",
      "Document reproduced backend validation and security defects with exact request/response payloads in `docs/BUG-REPORTS.md`."
    ],
    example: {
      input: "cy.request('GET', '/rest/products/search?q=')",
      output: "expect(response.status).to.eq(200);\nexpect(response.body).to.have.property('status', 'success');\nexpect(response.body.data).to.be.an('array').and.not.be.empty;\nexpect(firstProduct).to.have.all.keys(\n  'id', 'name', 'description', 'price', 'deluxePrice',\n  'image', 'createdAt', 'updatedAt', 'deletedAt'\n);",
      source: "cypress/e2e/05-api/api-rest.cy.ts"
    },
    results: [
      {
        label: "Automated test specs (README matrix)",
        value: "23 / 39 scenarios automated across 11 spec files (100% Pass)",
        source: "README.md"
      },
      {
        label: "Security & functional defects logged",
        value: "4 known vulnerabilities reproduced with payloads",
        source: "docs/BUG-REPORTS.md"
      }
    ],
    run: "npm run cy:run"
  },

  "api-contract-quality": {
    problem:
      "Microservices break silently when frontend clients and backend providers drift in schema expectations, rate-limit responses, or OpenAPI definitions. This suite integrates Pact consumer-driven contracts, Schemathesis OpenAPI fuzzing, and Postman/Newman CRUD regression tests.",
    steps: [
      "Generate Pact v3 consumer contracts from Web Chat Widget scenarios (`200`, `422`, `429`) against a local mock server.",
      "Publish contracts to a Dockerized Pact Broker, verify the live Project 13 provider, and enforce `can-i-deploy` gates.",
      "Run Schemathesis property-based fuzzing against Project 20's OpenAPI 3.1.0 schema (`not_a_server_error`, status/content-type conformance).",
      "Execute a 17-request Postman/Newman CRUD & SLA regression suite against Swagger Petstore v3 with JUnit XML output."
    ],
    example: {
      input: "{\n  \"providerStates\": [{\"name\": \"rate limit is exceeded for session\"}],\n  \"request\": {\n    \"method\": \"POST\",\n    \"path\": \"/web/chat\",\n    \"headers\": {\"Content-Type\": \"application/json\"},\n    \"body\": {\"session_id\": \"flood_999\", \"text\": \"Spam message\"}\n  }\n}",
      output: "{\n  \"response\": {\n    \"status\": 429,\n    \"headers\": {\"Content-Type\": \"application/json\"},\n    \"body\": {\"detail\": \"Límite de mensajes por minuto excedido.\"}\n  }\n}",
      source: "pacts/WebChatWidget-RestaurantAssistantAPI.json"
    },
    results: [
      {
        label: "Consumer contracts (Pact JS v3)",
        value: "100% (3/3 consumer, 3/3 provider verified)",
        source: "README.md"
      },
      {
        label: "Petstore CRUD regression (Newman JUnit)",
        value: "17 requests, 49/49 assertions passed in 0.139 s (0 failures)",
        source: "reports/newman-junit.xml"
      },
      {
        label: "API schema fuzzing (Schemathesis)",
        value: "7 real schema defects logged against Project 20",
        source: "README.md"
      },
      {
        label: "Provider defects discovered (Project 13)",
        value: "2 defects found and later fixed",
        source: "docs/BUG-REPORTS.md"
      }
    ],
    run: "npm run test:consumer"
  },

  "selenium-to-playwright-migration": {
    problem:
      "Teams debating whether to migrate from Selenium 4 to Playwright often rely on anecdotes rather than reproducible numbers. This benchmark implements the exact same 8 OWASP Juice Shop journeys in both tools and measures duration, code size, and intermittent failures in CI.",
    steps: [
      "Implement 8 identical E2E scenarios (`test_login_valid` through `test_language_change`) in `legacy_selenium/` and `migrated_playwright/` using Page Objects and zero static sleeps.",
      "Provision fresh disposable users per test via Juice Shop's REST API against a containerized SUT on port 3000.",
      "Execute both suites for repeated iterations via `bench/run.py --runs N`, parsing pytest JUnit XML timings and failure rates.",
      "Publish a measured comparison table (`results/benchmark.md` and `results/benchmark.json`) and document code equivalences in `docs/MIGRATION-GUIDE.md`."
    ],
    example: {
      input: "# Selenium 4 (legacy_selenium/pages/login_page.py)\nlogin_btn = self.wait.until(EC.element_to_be_clickable(self.LOGIN_BUTTON))\nlogin_btn.click()\nif wait_for_success:\n    self.wait.until(EC.url_contains(\"/#/search\"))\n    self.wait.until(EC.presence_of_element_located((By.TAG_NAME, \"mat-card\")))",
      output: "# Playwright (migrated_playwright/pages/login_page.py)\nself.page.locator(self.LOGIN_BUTTON).click()\nif wait_for_success:\n    self.page.wait_for_url(\"**/#/search\")\n    self.page.locator(\"mat-card\").first.wait_for(state=\"visible\")",
      source: "docs/MIGRATION-GUIDE.md"
    },
    results: [
      {
        label: "Median suite duration (CI, 5 runs)",
        value: "Selenium 24.641 s vs Playwright 14.902 s (1.65x faster)",
        source: "README.md"
      },
      {
        label: "P95 suite duration (CI, 5 runs)",
        value: "Selenium 166.725 s vs Playwright 15.788 s",
        source: "README.md"
      },
      {
        label: "Intermittent failures (CI, 5 runs)",
        value: "Selenium 3/40 executions failed vs Playwright 0/40",
        source: "README.md"
      },
      {
        label: "Executable lines of code",
        value: "Selenium 345 LOC vs Playwright 304 LOC (-11.9%)",
        source: "results/benchmark.json"
      }
    ],
    run: ".venv\\Scripts\\python.exe bench\\run.py --runs 3"
  },

  "mobile-appium-android": {
    problem:
      "Mobile UI suites become brittle when relying on coordinate taps, positional XPaths, or static sleeps instead of real layout identifiers and headless CI emulators. This Appium 3 + pytest framework tests the Sauce Labs My Demo App on Android 14 with Screen Objects and automatic failure forensics.",
    steps: [
      "Download and verify the SHA-256 checksum of the pinned v2.3.0 Android APK (`scripts/get_apk.py`).",
      "Boot an Android 14 (API 34) emulator and connect Appium 3 (`UiAutomator2`) using layout-verified resource/accessibility locators.",
      "Run 7 scenarios across catalog display, price sorting, product details, cart counter updates, and valid/locked-out login.",
      "Capture viewport screenshots, XML page source, and device `logcat` automatically into `artifacts/` whenever a test fails."
    ],
    example: {
      input: "header.open_sort_dialog()\nsort_dialog.sort_by_price_ascending()\nprices = catalog.get_product_prices()",
      output: "assert len(prices) >= 2\nassert prices == sorted(prices)",
      source: "tests/test_catalog.py"
    },
    results: [
      {
        label: "CI Android 14 (API 34) emulator run",
        value: "7 of 7 scenarios passed (GitHub Actions run 42949836540)",
        source: "README.md"
      }
    ],
    run: "pytest -v"
  },

  "performance-k6": {
    problem:
      "Latency regressions and concurrency races in webhook-driven backends slip into production without automated load gates and historical baselines. This k6 v2.3.0 harness runs smoke, load, spike, and forged-HMAC security profiles against Project 20 and enforces a regression gate.",
    steps: [
      "Boot the containerized FastAPI, MongoDB 7, and Mailpit SUT stack via `docker-compose.perf.yml`.",
      "Execute four k6 profiles (`smoke`, `load` up to 20 VUs, `spike` up to 60 VUs, and `negative` forged HMAC rejections) exporting JSON summaries.",
      "Compare current p95 latency and error rates against `baseline.json` using `scripts/compare.py` with configurable relative tolerance.",
      "Track multi-run trends via `scripts/trend.py` and isolate concurrency races such as `FINDING-001`."
    ],
    example: {
      input: ".venv\\Scripts\\python.exe scripts\\compare.py results\\load-summary-1.json baseline.json --tolerance 100",
      output: "| Metric / Endpoint | Baseline p95 (ms) | Current p95 (ms) | Delta (%) | Status |\n|---|---:|---:|---:|:---:|\n| `http_req_duration` (overall) | 177.36 | 138.19 | -22.09% | PASS |\n| `admin_orders` | 437.74 | 342.44 | -21.77% | PASS |\n| `webhook_shopify` | 116.90 | 100.33 | -14.18% | PASS |\n| `webhook_woocommerce` | 125.55 | 103.81 | -17.32% | PASS |\nVerdict: PASSED",
      source: "README.md"
    },
    results: [
      {
        label: "Smoke profile (1 VU, 30 s)",
        value: "p95 15.45 ms, 0.00% errors (0/60), 100% checks (120/120)",
        source: "README.md"
      },
      {
        label: "Load profile (20 VUs, 2 min)",
        value: "p95 177.36 ms local (1,513 reqs, 0% errors) / 366.05 ms CI baseline",
        source: "baseline.json"
      },
      {
        label: "Spike profile (60 VUs, 30 s)",
        value: "p95 69.91 ms, 94.78 req/s (2,886 reqs), 0.00% errors",
        source: "README.md"
      },
      {
        label: "Forged HMAC negative security (5 VUs)",
        value: "100% rejected with HTTP 401 (600/600, p95 4.45 ms)",
        source: "README.md"
      }
    ],
    run: "docker compose -f docker-compose.perf.yml up -d --build --wait"
  },

  "qa-java-suite": {
    problem:
      "Separating JUnit UI tests, Cucumber BDD feature specs, and RestAssured API suites often duplicates page selectors and requires local JDK/browser setups. This Java 21 suite shares Page Objects across JUnit 5 and Cucumber inside Docker and generates Allure reports.",
    steps: [
      "Boot `selenium/standalone-edge` and the `maven:3.9-eclipse-temurin-21` test runner via Docker Compose.",
      "Share `qa.ui.pages` Page Objects across both JUnit 5 UI tests and `saucedemo.feature` Cucumber BDD steps.",
      "Execute RestAssured CRUD and negative authorization tests against Restful Booker with rate-limiting pauses.",
      "Collect test artifacts in `target/allure-results` and generate Allure HTML reports."
    ],
    example: {
      input: "String body = \"{\\n\" +\n        \"    \\\"username\\\" : \\\"badUser\\\",\\n\" +\n        \"    \\\"password\\\" : \\\"badPass\\\"\\n\" +\n        \"}\";\ngiven().header(\"Content-Type\", \"application/json\")\n        .body(body).post(\"/auth\")",
      output: ".then()\n        .statusCode(200)\n        .body(\"reason\", equalTo(\"Bad credentials\"));",
      source: "src/test/java/qa/api/RestfulBookerTest.java"
    },
    run: "docker compose run --rm tests mvn -q test"
  },

  "qa-showcase": {
    problem:
      "Automated test suites fail CI builds unnecessarily when known upstream bugs are left unrecorded or mixed with regression checks. This Python + Playwright + httpx suite organizes clean Page Objects and pins 5 reproducible `problem_user` defects using strict `xfail` markers and evidence screenshots.",
    steps: [
      "Run 8 Restful Booker CRUD and negative API tests (`httpx`) using a disposable booking fixture.",
      "Run 18 Playwright UI tests on Microsoft Edge across SauceDemo login, inventory, cart, and checkout.",
      "Pin 5 known `problem_user` bugs (`QA-102` through `QA-106`) with `@pytest.mark.xfail(strict=True)` so CI stays green while bugs remain open and fails once fixed.",
      "Capture failure screenshots and generate HTML/Markdown summary reports."
    ],
    example: {
      input: "payload = {\n    \"firstname\": \"Jim\",\n    \"lastname\": \"Brown\",\n    \"totalprice\": 111,\n    \"depositpaid\": True,\n    \"bookingdates\": {\"checkin\": \"2024-01-01\", \"checkout\": \"2024-01-10\"},\n    \"additionalneeds\": \"Breakfast\",\n}\nresponse = httpx.post(f\"{BASE_URL}/booking\", json=payload)",
      output: "assert response.status_code == 200\n# GET /booking/{booking_id}:\nassert data[\"firstname\"] == \"Jim\"\nassert data[\"lastname\"] == \"Brown\"\nassert isinstance(data[\"totalprice\"], int)",
      source: "tests/api/test_restful_booker.py"
    },
    results: [
      {
        label: "Suite composition & expected outcome",
        value: "26 tests collected (8 API + 18 UI): 21 passed + 5 xfailed (QA-102..106)",
        source: "README.md"
      }
    ],
    images: [
      "../qa-showcase/docs/evidence/qa-102.png",
      "../qa-showcase/docs/evidence/qa-103.png",
      "../qa-showcase/docs/evidence/qa-104.png",
      "../qa-showcase/docs/evidence/qa-105.png",
      "../qa-showcase/docs/evidence/qa-106.png"
    ],
    run: "pytest"
  },

  "business-registry-enricher": {
    problem:
      "Manual B2B onboarding across European jurisdictions requires checking Companies House, INSEE, and VIES individually and risks hitting upstream rate limits. This FastAPI + n8n service unifies lookups behind a 30-day PostgreSQL cache with `aiolimiter` throttling and exponential retries.",
    steps: [
      "Receive single (`GET /api/v1/enrich/{country}/{identifier}`) or batch (`POST /api/v1/enrich`) requests from API clients or n8n.",
      "Check PostgreSQL `company_cache` for fresh entries updated within the last 30 days unless `force_refresh=true`.",
      "Route cache misses to Companies House (`600 req/5min`), INSEE (`30 req/min`), or VIES SOAP wrapped with `tenacity` retries.",
      "Normalize company status and incorporation fields, log response metrics in `api_logs`, and return unified JSON."
    ],
    example: {
      input: "POST /api/v1/enrich\n{\n  \"companies\": [\n    {\"country\": \"GB\", \"identifier\": \"00000006\"},\n    {\"country\": \"FR\", \"identifier\": \"552081317\"}\n  ]\n}",
      output: "{\n  \"results\": [\n    {\n      \"country\": \"GB\",\n      \"identifier\": \"00000006\",\n      \"company_name\": \"DEFAULT LIMITED\",\n      \"status\": \"active\",\n      \"cached\": false\n    },\n    {\n      \"country\": \"FR\",\n      \"identifier\": \"552081317\",\n      \"company_name\": \"SOCIETE AIR FRANCE\",\n      \"status\": \"active\",\n      \"cached\": true\n    }\n  ]\n}",
      source: "README.md"
    },
    results: [
      {
        label: "Unit & mocked registry test suite",
        value: "66 passed, 6 deselected (Docker/live), 1 warning in 1.98s",
        source: "demo-output/run-2026-11-22.txt"
      }
    ],
    run: "pytest tests/test_vies.py -v"
  },

  "multi-channel-notifier": {
    problem:
      "Duplicating SMTP credentials, Slack/Discord webhooks, and Telegram bot logic across every automation service makes retries and auditing fragile. This centralized FastAPI + Celery hub dispatches templated notifications asynchronously with a PostgreSQL delivery log.",
    steps: [
      "Authenticate `POST /api/v1/notify` calls with Bearer token validation and verify the Jinja2 template exists on disk.",
      "Persist the notification record in PostgreSQL and enqueue one Celery worker task per requested channel on Redis.",
      "Render channel-specific templates and dispatch to SMTP (Mailpit locally), Slack, Discord, or Telegram (`webhook-sink` locally) with exponential autoretry.",
      "Record per-channel delivery status and timestamps in `delivery_logs` for inspection via `GET /api/v1/notifications/{id}`."
    ],
    example: {
      input: "GET /api/v1/notifications/987e6543-e21b-34d3-b456-426614174111",
      output: "{\n  \"id\": \"987e6543-e21b-34d3-b456-426614174111\",\n  \"template_name\": \"welcome_email\",\n  \"status\": \"completed\",\n  \"created_at\": \"2024-01-01T12:00:00Z\",\n  \"delivery_logs\": [\n    {\n      \"channel\": \"email\",\n      \"status\": \"delivered\",\n      \"processed_at\": \"2024-01-01T12:00:05Z\"\n    },\n    {\n      \"channel\": \"slack\",\n      \"status\": \"delivered\",\n      \"processed_at\": \"2024-01-01T12:00:02Z\"\n    }\n  ]\n}",
      source: "README.md"
    },
    results: [
      {
        label: "Unit, template & worker test suite",
        value: "83 passed, 3 deselected (Docker integration/e2e) in 1.57s",
        source: "demo-output/run-2026-11-22.txt"
      }
    ],
    run: "docker compose --env-file .env.example up -d"
  },

  "data-cleaning-api": {
    problem:
      "Low-code orchestrators like n8n bog down when cleaning large CSV/Excel datasets or validating schemas in-memory. This FastAPI + Celery service processes small files synchronously and offloads large datasets to Redis/Celery workers, Pandera validation, and MinIO storage.",
    steps: [
      "Authenticate `/api/v1/*` requests and inspect file size against `MAX_SYNC_SIZE_MB` (default 5 MB).",
      "Clean small CSV, `.xlsx`, and JSON files inline with Pandas (`trim_whitespace`, deduplication, null handling) or offload large uploads to Celery + MinIO.",
      "Validate inline rows or stored files against built-in or user-defined PostgreSQL schemas via Pandera (`/validate`, `/schemas`).",
      "Execute async pivot, melt, merge, split, or aggregate transformations and expose signed MinIO download URLs via `/jobs/{job_id}/result`."
    ],
    example: {
      input: "POST /api/v1/validate\n{\n  \"schema_id\": \"user_schema\",\n  \"data\": [{\"id\": 1, \"name\": \"Ana\", \"age\": -5}]\n}",
      output: "{\n  \"status\": \"invalid\",\n  \"errors\": [{\n    \"schema_context\": \"Column\",\n    \"column\": \"age\",\n    \"check\": \"greater_than_or_equal_to(0)\",\n    \"check_number\": 0,\n    \"failure_case\": -5,\n    \"index\": 0\n  }]\n}",
      source: "README.md"
    },
    results: [
      {
        label: "Unit & API tests",
        value: "53 passing",
        source: "README.md"
      },
      {
        label: "Integration tests (Real Postgres, CI)",
        value: "3 passing",
        source: "README.md"
      },
      {
        label: "Line coverage & static checks",
        value: "84% line coverage; ruff + mypy clean",
        source: "README.md"
      }
    ],
    run: "pytest --cov"
  },

  "scheduler-engine": {
    problem:
      "Standard `cron` lacks runtime schedule updates, dependency chaining, retry backoff, and structured execution logs. This visual scheduler uses FastAPI, `sqlalchemy-celery-beat`, PostgreSQL, and Streamlit to orchestrate HTTP, shell, and Python jobs dynamically.",
    steps: [
      "Create or pause tasks via Bearer-protected FastAPI endpoints, syncing `tasks` rows transactionally with Celery Beat's `PeriodicTask` table.",
      "Check `task_dependencies` before execution so dependent Task B is marked `SKIPPED` unless Task A's latest finished run succeeded.",
      "Run whitelisted `jobs/` scripts (without `shell=True` or `eval`) or SSRF-protected HTTP calls via Celery workers.",
      "Capture stdout, stderr, exit codes, and duration in `task_runs`, sending webhook alerts after consecutive failures exceed the threshold."
    ],
    example: {
      input: "POST /api/v1/tasks\n{\n  \"name\": \"Nightly Database Backup\",\n  \"task_type\": \"SHELL\",\n  \"payload\": {\"command\": \"backup.sh\", \"args\": [\"db_prod\"]},\n  \"schedule\": \"0 2 * * *\",\n  \"max_retries\": 3,\n  \"retry_backoff\": 60,\n  \"depends_on\": []\n}",
      output: "{\n  \"task_id\": \"e4b3c2a1-...\",\n  \"name\": \"Nightly Database Backup\",\n  \"status\": \"CREATED\"\n}",
      source: "README.md"
    },
    results: [
      {
        label: "Unit test suite",
        value: "25 unit tests passing",
        source: "EXECUTION_PLAN.md"
      }
    ],
    run: ".venv\\Scripts\\pytest.exe -q"
  },

  "price-monitor": {
    problem:
      "Manual competitor price tracking misses brief promotions, while aggressive scraping violates `robots.txt` and triggers IP bans. This polite price monitor checks `robots.txt`, throttles to 1 req/s, prefers official APIs and JSON-LD, and alerts via webhooks on price drops.",
    steps: [
      "Register target products (MercadoLibre IDs, JSON-LD pages, CSS-selector pages, or JS-rendered pages) via Bearer-protected FastAPI endpoints with SSRF validation.",
      "Verify `robots.txt`, enforce a 1.0 s per-domain interval, and fetch via MercadoLibre API, `httpx` + BeautifulSoup, or Playwright Edge fallback.",
      "Persist historical price, currency, and availability rows into PostgreSQL via scheduled Celery Beat tasks.",
      "Fire webhook alerts when a price drops below thresholds and visualize trends in the Streamlit + Plotly dashboard."
    ],
    example: {
      input: "json_path = fixtures_dir / \"mercadolibre_item_MLA12345.json\"\nraw_data = json.loads(json_path.read_text(encoding=\"utf-8\"))\ndata = parse_mercadolibre_item_data(raw_data)",
      output: "assert data[\"title\"] == \"Auriculares Inalámbricos Sony Wh-1000xm5 Cancelación Ruido\"\nassert data[\"price\"] == Decimal(\"389999.00\")\nassert data[\"currency\"] == \"ARS\"\nassert data[\"availability\"] is True\nassert data[\"shipping_info\"] == \"Free Shipping\"\nassert \"Capital Federal\" in data[\"seller_reputation\"]",
      source: "tests/test_parsers.py"
    },
    results: [
      {
        label: "Unit, parser, SSRF & API test suite",
        value: "38 passed, 2 deselected (Docker integration), 1 warning in 0.34s",
        source: "demo-output/run-2026-11-22.txt"
      }
    ],
    images: [
      "../price-monitor/docs/screenshots/dashboard-trend.png"
    ],
    run: "docker compose up -d --build"
  },

  "lead-generator": {
    problem:
      "Sales teams spend hours pulling B2B prospects from directories into messy spreadsheets full of duplicates and unverified contact data. This pipeline scrapes directories politely, normalizes names and phones, deduplicates with `rapidfuzz`, scores completeness, and exports formatted Excel workbooks.",
    steps: [
      "Launch extraction jobs via CLI or FastAPI (`POST /api/v1/jobs`) targeting directory adapters or optional Google Places API.",
      "Respect `robots.txt`, rate limits, and `tenacity` backoff while extracting business names, addresses, websites, and contacts.",
      "Normalize company names and Colombian phone formats to E.164, validate email syntax/MX records, and merge duplicates via `rapidfuzz`.",
      "Score leads from 0 to 100 based on verified contact completeness and export multi-sheet `.xlsx` workbooks (`Leads`, `Resumen`, `Fuentes`)."
    ],
    example: {
      input: "normalize_name(\"Contadores Ruiz SAS\")\nnormalize_name(\"Contadores Ruiz S.A.S.\")\nnormalize_name(\"Restaurante Doña Rosa\")\nnormalize_name(\"Clínica Dental Avanzada Ltda.\")\nnormalize_name(\"  Múltiples   Espacios  \")",
      output: "\"contadores ruiz\"\n\"contadores ruiz\"\n\"restaurante dona rosa\"\n\"clinica dental avanzada\"\n\"multiples espacios\"",
      source: "tests/test_normalization.py"
    },
    results: [
      {
        label: "Unit, dedup, scoring & Excel export suite",
        value: "70 passed, 2 deselected (Docker integration/e2e), 1 warning in 6.44s",
        source: "demo-output/run-2026-11-22.txt"
      }
    ],
    run: "python -m app.cli \"restaurantes\" \"Bogotá\" --out leads.xlsx"
  },

  "news-aggregator": {
    problem:
      "Following dozens of RSS feeds and tech blogs produces repetitive coverage of the same story across outlets and long uncategorized articles. This service ingests feeds politely, deduplicates stories by SHA-256 and `pgvector` similarity, summarizes with an LLM, and emails an HTML digest.",
    steps: [
      "Fetch RSS feeds and article HTML (`feedparser` + `trafilatura`) on a Celery Beat schedule while enforcing `robots.txt` and SSRF guards.",
      "Categorize articles using weighted keyword clusters and filter duplicates in two steps: SHA-256 content hash followed by `pgvector` cosine distance (with TF-IDF fallback).",
      "Generate bulleted summaries for unique stories using an OpenAI-compatible LLM (or deterministic `fake_llm` / excerpt fallback).",
      "Render grouped Jinja2 HTML digests and send them via SMTP to Mailpit."
    ],
    example: {
      input: "create_payload = {\n    \"name\": \"TechCrunch Feed\",\n    \"url\": \"https://techcrunch.com/feed/\",\n    \"source_type\": \"RSS\",\n    \"is_active\": True,\n}\nresp = client.post(\"/api/v1/sources\", json=create_payload, headers=auth_headers)",
      output: "assert resp.status_code == 201\nsource_data = resp.json()\nassert source_data[\"name\"] == \"TechCrunch Feed\"\nassert source_data[\"health_status\"] == \"HEALTHY\"",
      source: "tests/test_api.py"
    },
    results: [
      {
        label: "Full suite (unit + in-memory cross-source E2E)",
        value: "28 passed, 1 warning in 1.18s",
        source: "demo-output/run-2026-11-22.txt"
      }
    ],
    run: "docker compose up -d --build"
  },

  "docker-compose-lab": {
    problem:
      "Running independent microservices with separate databases, unisolated networks, and hardcoded secrets does not mirror production deployment. This lab unifies Traefik, FastAPI, Celery, n8n, PostgreSQL, Redis, MinIO, Prometheus, and Grafana behind segmented Docker networks and secret files.",
    steps: [
      "Provision a shared PostgreSQL 16 instance (`init-db.sh` creating per-service databases and roles from env vars) and password-protected Redis.",
      "Isolate services across `frontend_net`, `backend_net`, and `db_net` so Traefik routes `api.`, `n8n.`, and `grafana.` without reaching `postgres` directly.",
      "Mount Docker secrets (`db_password.txt`, `jwt_secret.txt`) into PostgreSQL and the FastAPI gateway.",
      "Expose Prometheus `/metrics` endpoints and provision Grafana datasources automatically."
    ],
    example: {
      input: "# Healthy dependencies vs simulated Redis outage:\n_deps(monkeypatch, redis_ok=True, db_ok=True)\nclient.get(\"/health\")\n_deps(monkeypatch, redis_ok=False, db_ok=True)\nclient.get(\"/health\")",
      output: "# Healthy:\nHTTP 200 -> {\"status\": \"healthy\", ...}\n# Redis down:\nHTTP 503 -> {\"services\": {\"redis\": \"down\", ...}}",
      source: "backend/tests/test_main.py"
    },
    results: [
      {
        label: "Local full-stack smoke test (2026-10-15)",
        value: "All 10 services up (9 with healthcheck healthy; celery-beat has none)",
        source: "README.md"
      },
      {
        label: "Traefik routing & Prometheus targets",
        value: "api.localhost, n8n.localhost, grafana.localhost routed; all targets up; postgres isolated",
        source: "README.md"
      }
    ],
    run: "docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build"
  },

  "monitoring-dashboard": {
    problem:
      "Diagnosing latency spikes, 5xx errors, or database outages across containerized automation services without unified telemetry slows down incident response. This observability stack combines Prometheus, Alertmanager, Loki, Promtail, Exporters, and provisioned Grafana dashboards.",
    steps: [
      "Instrument the FastAPI `demo_app` with Prometheus counters/histograms (`/metrics`) and structured logs scraped by Promtail into Loki.",
      "Scrape `demo-app`, `postgres_exporter`, `node-exporter`, and Alertmanager every 5 seconds with Prometheus.",
      "Evaluate 5 PromQL alert rules (`ServiceDown`, `HighErrorRate5xx`, `HighLatencyP95`, `HighDiskUsage`, `PostgresDown`) and route alerts to the local `webhook_sink`.",
      "Provision `servicios.json` and `negocio.json` dashboards automatically in Grafana on port 3011."
    ],
    example: {
      input: "POST /webhook\n{\n  \"receiver\": \"webhook-sink\",\n  \"status\": \"firing\",\n  \"alerts\": [{\n    \"status\": \"firing\",\n    \"labels\": {\"alertname\": \"ServiceDown\", \"severity\": \"critical\", \"job\": \"demo-app\"},\n    \"annotations\": {\"summary\": \"Demo App is down\"}\n  }]\n}",
      output: "# POST /webhook -> HTTP 200:\n{\"status\": \"received\", \"latest_alerts\": [\"ServiceDown\"]}\n# GET /alerts -> HTTP 200:\n{\"count\": 1, \"alerts\": [{\"receiver\": \"webhook-sink\", ...}]}",
      source: "tests/test_webhook_sink.py"
    },
    results: [
      {
        label: "Unit tests (`pytest -q`)",
        value: "13 passed",
        source: "EXECUTION_PLAN.md"
      },
      {
        label: "Integration tests (`pytest -m integration -q`)",
        value: "6 passed",
        source: "EXECUTION_PLAN.md"
      },
      {
        label: "PromQL & Alertmanager config checks",
        value: "5 alert rules validated (`promtool check rules` & `amtool check-config`)",
        source: "EXECUTION_PLAN.md"
      }
    ],
    run: "docker compose up -d --build"
  },

  "ci-cd-pipeline": {
    problem:
      "Manual deployments without automated linting, static security scanning, real-database tests, and container CVE checks invite broken releases. This GitHub Actions pipeline enforces Ruff, Mypy, Bandit, Testcontainers, non-root Docker builds, Trivy scans, GHCR publishing, and manual rollbacks.",
    steps: [
      "Run Ruff lint/format checks, strict Mypy typing, and Bandit SAST scanning across a Python 3.11/3.12 matrix.",
      "Execute unit tests enforcing ≥80% coverage alongside Testcontainers integration tests against real PostgreSQL 16.",
      "Build a multi-stage slim non-root Docker image (`appuser`, UID 10001) and fail the build on any CRITICAL CVE in Trivy.",
      "Publish verified images to GHCR and gate SSH deployment or manual `workflow_dispatch` rollback behind `vars.DEPLOY_ENABLED`."
    ],
    example: {
      input: "POST /api/v1/deployments\n{\n  \"service_name\": \"order-service\",\n  \"environment\": \"production\",\n  \"version\": \"v1.2.0\",\n  \"status\": \"successful\",\n  \"deployed_by\": \"claudia\",\n  \"description\": \"Initial production release\"\n}",
      output: "# HTTP 201 Created:\n{\n  \"id\": 1,\n  \"service_name\": \"order-service\",\n  \"environment\": \"production\",\n  \"version\": \"v1.2.0\",\n  \"status\": \"successful\",\n  \"deployed_by\": \"claudia\",\n  \"created_at\": \"...\",\n  \"updated_at\": \"...\"\n}",
      source: "tests/test_unit.py"
    },
    results: [
      {
        label: "Line coverage (`coverage.xml`)",
        value: "96.25% (154 / 160 lines)",
        source: "coverage.xml"
      },
      {
        label: "Branch coverage (`coverage.xml`)",
        value: "92.86% (13 / 14 branches)",
        source: "coverage.xml"
      },
      {
        label: "Unit & endpoint test suite",
        value: "14 unit tests",
        source: "EXECUTION_PLAN.md"
      }
    ],
    run: ".\\.venv\\Scripts\\pytest.exe -q --cov=app --cov-report=term --cov-fail-under=80"
  },

  "n8n-automation-pack": {
    problem:
      "Small businesses lose hours copying web-form inquiries into CRMs, transcribing PDF supplier invoices, drafting daily sales summaries, and verifying payment webhooks. This pack runs 4 production-style n8n workflows locally in Docker with Postgres, Mailpit, `fake-llm`, and a shared error handler.",
    steps: [
      "F1 (Lead -> CRM): Validate webhook form fields, deduplicate by email in Postgres, save new leads, and send welcome emails via Mailpit.",
      "F2 (Invoice PDF -> Data): Extract text from PDFs, call the LLM for supplier/NIT/date/totals, check `total = subtotal + iva`, and flag mismatches as `needs_review`.",
      "F3 (Daily Sales Report): Query yesterday's Postgres sales on a 7:00 a.m. cron (or manual trigger), summarize via LLM, and email/notify the team.",
      "F4 (Payment -> Fulfillment): Verify constant-time HMAC signatures, enforce idempotency via `processed_events`, mark orders paid, and send confirmations."
    ],
    example: {
      input: "curl -X POST http://localhost:5680/webhook/invoice-upload \\\n  -H \"Content-Type: application/pdf\" \\\n  --data-binary \"@samples/factura-totales-no-cuadran.pdf\"",
      output: "\"status\": \"needs_review\"\nMotivo exacto: total does not match subtotal + iva\nLa fila queda marcada para revisión en Postgres y se envía un correo de alerta al equipo en Mailpit.",
      source: "docs/DEMO-SCRIPT.md"
    },
    results: [
      {
        label: "Workflow JSON security & fake-LLM unit suite",
        value: "9 passed, 22 deselected (Docker integration) in 0.22s",
        source: "demo-output/run-2026-11-22.txt"
      }
    ],
    run: "docker compose --env-file .env.example up -d --build --wait"
  },

  "restaurant-website": {
    problem:
      "Setting up a WordPress restaurant site manually through admin wizards is slow and breaks reproducibility across environments. This Docker + WP-CLI setup provisions all pages, booking/event forms, JSON-LD local SEO, and WebP assets from script, verified by Playwright and Lighthouse.",
    steps: [
      "Start WordPress, MariaDB, WP-CLI, and Mailpit containers via Docker Compose.",
      "Execute `/scripts/setup.sh` to install plugins, configure a custom `rtb-booking` shortcode form, seed 8 pages, and add Schema.org JSON-LD.",
      "Run Playwright E2E tests checking HTTP 200 across all 8 routes and real reservation submission verified through Mailpit and `wp post list`.",
      "Audit home-page quality with Lighthouse across Performance, Accessibility, Best Practices, and SEO."
    ],
    example: {
      input: "pages = [\n  '/', '/inicio/', '/menu/', '/reservas/',\n  '/domicilios/', '/contacto/', '/politica-de-privacidad/', '/eventos-y-catering/'\n]",
      output: "for (const page of pages):\n  const response = await request.get(`http://localhost:8016${page}`);\n  expect(response.status()).toBe(200);\n  await expect(browserPage.locator('body')).toBeVisible();",
      source: "tests/site.spec.js"
    },
    results: [
      {
        label: "Lighthouse Performance",
        value: "81 / 100",
        source: "lighthouse-report.json"
      },
      {
        label: "Lighthouse Accessibility",
        value: "95 / 100",
        source: "lighthouse-report.json"
      },
      {
        label: "Lighthouse Best Practices",
        value: "100 / 100",
        source: "lighthouse-report.json"
      },
      {
        label: "Lighthouse SEO",
        value: "92 / 100",
        source: "lighthouse-report.json"
      },
      {
        label: "Last Playwright test run",
        value: "passed (0 failedTests)",
        source: "test-results/.last-run.json"
      }
    ],
    run: "docker compose up -d"
  },

  "seo-aeo-audit": {
    problem:
      "Standard SEO checkers miss Answer Engine Optimization (AEO) signals required by ChatGPT, Perplexity, and Gemini, such as question headings, concise direct answers, and plaintext contact data. This CLI and FastAPI auditor scores SEO, AEO, and Lighthouse vitals and exports HTML/PDF client reports.",
    steps: [
      "Crawl same-domain pages asynchronously respecting `robots.txt` and SSRF IP restrictions (`--allow-local` for dev servers).",
      "Evaluate On-Page SEO (title/meta length, H1 hierarchy, canonical, Open Graph, broken links, JSON-LD) and site files (`sitemap.xml`, `robots.txt`, `llms.txt`).",
      "Compute an AEO readiness score (0–100) across question headings, concise <300-char answers, FAQ/LocalBusiness schemas, and plaintext contact/hours.",
      "Combine scores with headless Lighthouse vitals and render responsive HTML or Edge-printed PDF reports."
    ],
    example: {
      input: "res = analyze_aeo(\n    url=\"https://ejemplo.com/servicios\",\n    html=broken_aeo_html,\n    json_ld_types=[],\n)",
      output: "assert res[\"score\"] <= 20\nissue_codes = {i[\"code\"] for i in res[\"issues\"]}\n# Contains:\n# \"AEO_NO_QUESTION_HEADINGS\"\n# \"AEO_MISSING_TARGET_SCHEMA\"\n# \"AEO_NO_CONTACT_HOURS_TEXT\"",
      source: "tests/test_aeo.py"
    },
    results: [
      {
        label: "Sample audit (Sabor de Casa, 8 pages)",
        value: "Global: 35 | SEO: 0 | AEO: 40 | Lighthouse: 89",
        source: "samples/informe-sabor-de-casa.html"
      },
      {
        label: "Automated test suite",
        value: "28 unit and integration tests",
        source: "README.md"
      }
    ],
    run: ".venv\\Scripts\\python.exe -m pytest -q"
  },

  "video-repurposing-kit": {
    problem:
      "Turning a one-hour video or podcast into vertical social clips, synced captions, normalized audio, and YouTube metadata manually takes hours and paid SaaS tools. This 100% local kit transcribes with `faster-whisper`, picks high-retention moments, renders 9:16 FFmpeg clips, and generates `youtube_package.md`.",
    steps: [
      "Accept a local `.mp4`/`.mov` file or authorized video URL and transcribe word-level timestamps locally with `faster-whisper` (`int8` on CPU).",
      "Select 20–60 s viral segments (`highlights.json`) via local Ollama LLM or deterministic heuristic fallback, editable in the FastAPI web UI.",
      "Render 1080x1920 vertical clips with FFmpeg, burning ASS word-highlighted subtitles and normalizing audio to -16 LUFS (`loudnorm`).",
      "Generate `youtube_package.md` with 3 CTR titles, `00:00` chapters, description, and 10 SEO tags."
    ],
    example: {
      input: "{\n  \"segments\": [{\n    \"id\": 0, \"start\": 58.24, \"end\": 59.64, \"text\": \"A\",\n    \"words\": [{\"word\": \"A\", \"start\": 58.24, \"end\": 59.64, \"probability\": 0.015}]\n  }],\n  \"language\": \"nn\",\n  \"duration\": 120.0\n}",
      output: "{\n  \"video_file\": \"test_video_2min.mp4\",\n  \"highlights\": [{\n    \"id\": 1, \"start\": 0.0, \"end\": 30.0, \"duration\": 30.0,\n    \"title\": \"Momento Clave del Video\", \"hook\": \"A\",\n    \"score\": 8.5, \"reason\": \"Segmento inicial de alta retención.\"\n  }]\n}",
      source: "demo_output/highlights.json"
    },
    results: [
      {
        label: "Full CLI, FFmpeg render, subtitles & web UI suite",
        value: "24 passed in 64.50s (0:01:04)",
        source: "demo-output/run-2026-11-22.txt"
      }
    ],
    images: [
      "../video-repurposing-kit/docs/screenshots/web-panel.png",
      "../video-repurposing-kit/docs/screenshots/web-results.png"
    ],
    run: "python -m kit run ruta/a/tu_video.mp4"
  },

  "youtube-rag-analyzer": {
    problem:
      "Summarizing long technical YouTube videos in a single LLM call loses middle details, misses code/diagrams shown on screen, and burns paid API quotas. This extractor splits transcripts, reads video frames, validates claims against the source, and runs across rotated free LLM tiers.",
    steps: [
      "Fetch YouTube metadata and transcript (cached in `.cache/`), transcribing audio via Groq Whisper if captions are missing, and extract up to 80 unique 480p frames via FFmpeg for vision notes.",
      "Phase 1 & 2: Extract atomic facts from ~20k-char transcript chunks plus on-screen frame notes into Pydantic JSON and deduplicate across chunks.",
      "Phase 3: Synthesize a structured Markdown reference document strictly from the extracted fact list in the video's language.",
      "Phase 4: Audit claims with an LLM pass plus regex checks on every URL and command, filing reports under `Results/` browsable in a local `http.server` queue dashboard."
    ],
    example: {
      input: "Entrada CLI: Obsidian + Agentic AI Full Hermes Obsidian Workflow & Wiki Prep\nURL: https://www.youtube.com/watch?v=znj-WpMj1dI\nDuracion: 22:50 | Idioma: inglés | Caracteres: 26,800",
      output: "--- FASE 1/4: Extraccion Factual (JSON) --- [OK] Extraidos 8 hechos/conceptos atomicos.\n--- FASE 4/4: Validacion Anti-Alucinacion (LLM + Regex) --- [OK] Cero alucinaciones detectadas por LLM.\nDocumento: Results\\Obsidian + Agentic AI ...md\nTiempo: 7s (0.1 min) | Tokens: 15,356 total (13,342 in / 2,014 out) | Llamadas API: 3 | Costo est.: ~$0.0032 USD",
      source: "../YouTube-RAG-Analyzer/batch_log.txt"
    },
    results: [
      {
        label: "Corpus processed in daily use",
        value: "70+ videos (~2–8 min per video)",
        source: "../YouTube-RAG-Analyzer/README.md"
      },
      {
        label: "Sample cached run (22:50 video)",
        value: "7 s, 15,356 tokens, 3 API calls, ~$0.0032 USD, 0 hallucinations",
        source: "../YouTube-RAG-Analyzer/batch_log.txt"
      }
    ],
    run: "python main.py \"https://www.youtube.com/watch?v=VIDEO_ID\""
  },

  "doc-ingest": {
    problem:
      "Searching local PDFs and notes with cloud tools compromises document privacy, while basic RAG pipelines lose track of which exact page supported an answer. This local LangGraph + Ollama agent watches a folder, chunks documents with 1-indexed page metadata, and cites file and page in every reply.",
    steps: [
      "Watch `watch_folder/` automatically (`watch.py`) or run manual ingestion (`ingest.py`) for PDF, DOCX, TXT, and MD files using Docling.",
      "Chunk documents semantically while preserving 1-indexed page numbers and source filenames in metadata.",
      "Embed chunks locally using Ollama (`nomic-embed-text`) into persistent ChromaDB paired with BM25 hybrid retrieval.",
      "Run the multi-agent LangGraph QA workflow (relevance check, retrieval, `llama3.2` generation, verification) outputting exact `filename (Page N)` citations."
    ],
    example: {
      input: "python query.py \"What is the main hypothesis of the paper?\"",
      output: "============================================================\n ANSWER:\n------------------------------------------------------------\nThe telemetry system architecture relies on S-band communication transponders...\n\nSources / Citations:\n- apollo_manual.pdf (Page 2)\n============================================================",
      source: "../doc_ingest/README.md"
    },
    results: [
      {
        label: "Chunking, hybrid retrieval & citation test suite",
        value: "4 passed, 2 warnings in 11.75s",
        source: "demo-output/run-2026-11-22.txt"
      }
    ],
    run: "python watch.py"
  },

  "universal-web-scraper": {
    problem:
      "Traditional brittle scraping scripts break whenever page structures change across multi-section courses and documentation portals. This LangChain ReAct agent drives Microsoft Edge via Scrapling to inspect DOM structure, extract targeted sections to Markdown, and consolidate a clean report using local Ollama.",
    steps: [
      "Handle manual authenticated sessions (`tool_handle_auth`) with persisted browser profile cookies when platforms require login.",
      "Inspect page headings and layout structure (`tool_analyze_structure`) via Scrapling on Microsoft Edge.",
      "Follow section links (`tool_scrape_content`) to download target modules and save raw pages as Markdown.",
      "Deduplicate and synthesize extracted Markdown pages (`tool_consolidate_information`) with local Ollama (`llama3.2`) into `Final_Report.md`."
    ],
    example: {
      input: "out1 = tool_analyze_structure.invoke({\"url\": \"https://quotes.toscrape.com/\"})\nout2 = tool_scrape_content.invoke({\"url\": \"https://quotes.toscrape.com/\", \"sections_to_extract\": \"top ten tags\"})",
      output: "assert \"- [h1] Quotes to Scrape\" in out1 and \"- [h2] Top Ten tags\" in out1\nassert \"Se guardaron 10 archivos\" in out2\nassert \"love.md\" in files and len(files) == 10\nassert love.startswith(\"# love\") and len(love) > 500",
      source: "../Universal-Web-Scraper/test_agent_tools.py"
    },
    results: [
      {
        label: "Course download run (`coursera_run.log`)",
        value: "161 items downloaded cleanly (`exit=0`) in automation-and-modern-testing-tools",
        source: "../Universal-Web-Scraper/coursera_run.log"
      },
      {
        label: "DevOps course run (`rescrape.log`)",
        value: "45 items downloaded (`exit=0`; 25 non-downloadable labs/quizzes)",
        source: "../Universal-Web-Scraper/rescrape.log"
      }
    ],
    run: "python main.py"
  },

  "jobhunter": {
    problem:
      "Searching remote jobs manually wastes hours filtering ineligible countries and tailoring CVs, while naive LLM scoring inflates match ratings up to 85% on unrelated roles. This pipeline separates LLM fact extraction from deterministic Python scoring, then generates tailored archetype PDFs and study guides.",
    steps: [
      "Build `master_profile.json` from a base PDF CV via the Interviewer Agent and configure country/role preferences.",
      "Scrape vacancies (`scout_agent.py`), pre-filter ineligible locations/languages (`job_filters.py`), extract `JobFacts` via LLM, and compute deterministic 0–100% scores in Python.",
      "Tailor archetype-based PDF CVs via Playwright Chromium for high-match roles (≥70%) and generate skill-gap study guides for 40–69% matches.",
      "Present scored jobs, tailored CVs, ATS URL resolution, and freelance gig tracking in `reporte_vacantes.html` and Hustles Dashboard."
    ],
    example: {
      input: "domain_cases = [\n    (\"https://boards.greenhouse.io/acme/jobs/101\", \"greenhouse\"),\n    (\"https://jobs.lever.co/globex/202\", \"lever\"),\n    (\"https://jobs.ashbyhq.com/umbrella/303\", \"ashby\"),\n    (\"https://apply.workable.com/stark/j/404/\", \"workable\"),\n    (\"https://acme-corp.com/careers/software-engineer\", \"generico\"),\n]",
      output: "for url, expected_ats in domain_cases:\n    actual = classify_ats(url)\n    assert actual == expected_ats\nassert unwrap_redirect_url(\"https://www.linkedin.com/jobs/view/externalApply/12345?url=https%3A%2F%2Fboards.greenhouse.io%2Facme%2Fjobs%2F999\") == \"https://boards.greenhouse.io/acme/jobs/999\"",
      source: "../jobHunter/test_apply_resolver.py"
    },
    results: [
      {
        label: "Deterministic scoring validation (31 vacancies, local Ollama)",
        value: "Mean score 34 vs 73 prior; 20 distinct scores; 3/3 bad cases dropped (75->5, 75->5, 65->11)",
        source: "../jobHunter/PROGRESS.md"
      },
      {
        label: "Production SQLite snapshot (2026-09-25)",
        value: "154 vacancies processed, 118 tailored CVs generated",
        source: "../jobHunter/PROGRESS.md"
      }
    ],
    run: "py main.py \"Ana Perez\" --terminal"
  },

  "homelab": {
    problem:
      "Running background scraping pipelines, local 4B LLMs, and personal agents 24/7 on a single 8-core / 4 GB VRAM Debian home server requires strict disk monitoring, service isolation, and fallback routing. These operational docs record the topology, Compose services, Ollama limits, and incident recovery procedures.",
    steps: [
      "Run core admin services (`Homepage`, `Portainer`, `Nextcloud`), `Hustles Dashboard`, and the 4-container `jobHunter` Compose stack 24/7 on Debian 13.",
      "Serve `qwen3:4b` on a 4 GB GTX 1050 via local systemd Ollama (`127.0.0.1:11434`) accessed by containers through `network_mode: host`.",
      "Route automation LLM calls through `llm_chain.py` fallback order (Gemini -> Groq -> Cerebras -> OpenRouter -> local Ollama) with cooldowns on quota exhaustion.",
      "Monitor root disk usage and container logs following the 2026-09-28 storage cleanup after media services filled the 211 GB disk."
    ],
    results: [
      {
        label: "Local Ollama throughput (qwen3:4b, GTX 1050 4 GB)",
        value: "~22.6 tok/s (100% on GPU)",
        source: "../Homelab/README.md"
      },
      {
        label: "jobHunter SQLite state (2026-09-28)",
        value: "222 jobs, 547 freelance_gigs, 49 market_trends",
        source: "../Homelab/README.md"
      },
      {
        label: "Root disk usage after cleanup",
        value: "35 GB / 211 GB used (18%)",
        source: "../Homelab/README.md"
      }
    ],
    images: [
      "../../Homelab/layout.jpeg"
    ],
    run: "cd ~/homelab && docker compose up -d"
  },

  "recruiting-portal": {
    problem:
      "A recruiting agency needed one place to publish vacancies, receive applicants, compare them fairly and track each hiring process.",
    steps: [
      "Recruiters create a vacancy once, with the fields job boards ask for, and choose what stays hidden (salary, client name).",
      "Candidates apply from the public job board, filtered by sector, city and level.",
      "Each applicant gets a fit score from weighted criteria: experience, education, salary match, work mode and required skills.",
      "Recruiters move applicants through the process and schedule interviews with a video link and reminder."
    ],
    images: [
      "assets/recruiting-portal/public-job-board.png",
      "assets/recruiting-portal/portal-vacancies.png",
      "assets/recruiting-portal/portal-candidates.png",
      "assets/recruiting-portal/portal-publish-vacancy.png"
    ]
  },

  "meal-plan-ai": {
    problem:
      "Planning healthy meals that hit daily calorie and protein goals takes time, and food in the fridge goes to waste.",
    steps: [
      "Recipes saved from social media are turned into a cookbook with calories and macros per serving (285 recipes).",
      "The user sets daily goals and which meals to plan.",
      "The planner picks recipes that fit the goals, using first what is in the pantry and expires soonest.",
      "Anything missing goes to a grocery list."
    ],
    images: [
      "assets/meal-plan-ai/meal-plan.png",
      "assets/meal-plan-ai/plan-options.png",
      "assets/meal-plan-ai/daily-macros.png"
    ]
  }
};
