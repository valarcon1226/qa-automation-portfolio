# Hi, I'm Valentina Alarcon

I'm an automation engineer with four years of experience, most of them in QA automation, and I now focus on AI engineering: AI agents that use tools to automate work on business documents and systems.

I test what I build the way I test any other software. Each project fixes its thresholds before the run, measures against labelled data or the real system, and says in its README where the numbers come from and what the limits are.

**What I work with:** Python, TypeScript, FastAPI, Playwright, Selenium, Cypress, pytest, Docker, GitHub Actions, PostgreSQL, n8n, LLM APIs and local models with Ollama.

Every folder in this repository is one project. This page groups them by what they show; [`PROJECTS.md`](PROJECTS.md) lists all of them with their stack and evidence.

## AI automation: documents in, systems updated

| Project | What it does | Evidence |
|---|---|---|
| [Document extraction](invoice-processor/) | Reads invoices and ACORD 25 insurance certificates from PDF and Excel into a validated schema, by regular expressions or by a language model, and keeps the page and text fragment each field came from | A labelled set of 40 documents with accuracy per field, a [design document](invoice-processor/docs/DESIGN.md) and a [client implementation guide](invoice-processor/docs/CLIENT-IMPLEMENTATION-GUIDE.md) |
| [Browser automation that writes](playwright-ts-parabank/) | A Playwright script in TypeScript takes extracted invoice records and types them into the bill-payment form of a banking web app, with validation, retries and a check of what was saved | A record is marked as sent before the click and is never submitted twice; a second run over the same file skips what was already verified |
| [Three client systems, one data model](ecommerce-order-automation/) | Orders from WooCommerce, Shopify and Stripe arrive by signed webhooks and are unified in one model, with an admin panel | A [field mapping table](ecommerce-order-automation/docs/FIELD-MAPPING.md) checked by tests and an [operations runbook](ecommerce-order-automation/docs/RUNBOOK.md) |
| [Restaurant assistant](whatsapp-restaurant-assistant/) and its [chat widget](web-chat-widget/) | A tool-using assistant for WhatsApp and the web; the widget is written in TypeScript and React | 30 evaluation conversations run through the real chat path; the README reads the result of a local 4B model case by case |
| [Spreadsheet intake](smart-data-intake/) | Loads spreadsheets the way clients send them: several sheets, merged headers, title rows and total rows | Tests on generated claim and insured-asset listings; discarded rows are reported with the reason |

## Evaluating models and agents

| Project | What was measured | Result |
|---|---|---|
| [LLM platform](llm-platform-evals/) | A self-hosted RAG assistant (LiteLLM, Open WebUI, Ollama) with an evaluation protocol written before the run, plus spend, rate-limit and streaming checks | A local 4B model met 3 of 5 thresholds on the held-out split |
| [Agent evals](mcp-agent-evals/) | A tool-using agent over an MCP server, 30 cases, before and after a fix to the tool schemas | 13 of 30, then 16 of 30; the README reads every failed case |
| [Test case generator](test-case-generator-evals/) | Test cases written by a model from a requirement, graded by six deterministic metrics | A local 4B model met 3 of 5 thresholds on the held-out split |

All three ran with a small local model. They show what the harness catches; a run with a large hosted model is still to be done.

## QA on real open-source systems

Each suite runs the real product in containers and checks what tends to break in production: concurrency, retries, partial failures, pagination under writes and version upgrades.

| Project | System under test | What it covers | CI |
|---|---|---|---|
| [Order integrity](commerce-order-integrity/) | Saleor 3.20 | Pagination properties, checkout retries through a fault proxy, a 50-buyer stock race, webhook delivery under failures, a 3.19 → 3.20 upgrade with checksums | ![CI](https://github.com/valarcon1226/qa-automation-portfolio/actions/workflows/commerce-order-integrity.yml/badge.svg?branch=main) |
| [Document intake](document-intake-pipeline/) | Paperless-ngx 2.14.7 | A 500-document burst with broker faults, pagination ties, search latency, a 2.14.6 → 2.14.7 migration diff, an accessibility scan | ![CI](https://github.com/valarcon1226/qa-automation-portfolio/actions/workflows/document-intake-pipeline.yml/badge.svg?branch=main) |
| [CDC replication](cdc-data-replication/) | Postgres → Debezium → Redpanda → Postgres | Lag under load, a slow sink, a killed worker, poison records, live schema changes and a 1M-row snapshot, each verified by a reconciler that has its own tests | ![CI](https://github.com/valarcon1226/qa-automation-portfolio/actions/workflows/cdc-data-replication.yml/badge.svg?branch=main) |
| [Identity and access](identity-access/) | Keycloak 26 | OIDC with PKCE and negative cases, token replay, TOTP and lockout on three browsers, an SMTP outage, load shedding, a 25 → 26 upgrade | ![CI](https://github.com/valarcon1226/qa-automation-portfolio/actions/workflows/identity-access.yml/badge.svg?branch=main) |
| [LLM platform](llm-platform-evals/) | LiteLLM + Open WebUI + Ollama | Spend and budget accounting, rate limits, retries, a stream cut observed at three layers, and the RAG evaluation above | ![CI](https://github.com/valarcon1226/qa-automation-portfolio/actions/workflows/llm-platform-evals.yml/badge.svg?branch=main) |

## Test automation frameworks

| Project | Stack | Notes | CI |
|---|---|---|---|
| [ParaBank](playwright-ts-parabank/) | Playwright, TypeScript | UI flows verified against the REST API, page objects as fixtures, a table of designed versus automated scenarios | ![CI](https://github.com/valarcon1226/qa-automation-portfolio/actions/workflows/playwright-ts-parabank.yml/badge.svg?branch=main) |
| [Juice Shop](cypress-juice-shop/) | Cypress, TypeScript | Login, catalog, checkout, API and network-failure tests | ![CI](https://github.com/valarcon1226/qa-automation-portfolio/actions/workflows/cypress-juice-shop.yml/badge.svg?branch=main) |
| [API contract quality](api-contract-quality/) | Pact, Schemathesis, Newman | Consumer contracts and fuzzing against my own services; it found two defects in the restaurant assistant, fixed since | ![CI](https://github.com/valarcon1226/qa-automation-portfolio/actions/workflows/api-contract-quality.yml/badge.svg?branch=main) |
| [Selenium to Playwright](selenium-to-playwright-migration/) | Python, Selenium 4, Playwright | The same 8 scenarios in both tools against Juice Shop, with suite duration and intermittent failures measured over repeated runs in CI | ![CI](https://github.com/valarcon1226/qa-automation-portfolio/actions/workflows/selenium-to-playwright-migration.yml/badge.svg?branch=main) |
| [Android app](mobile-appium-android/) | Appium 3, Python, UiAutomator2 | 7 scenarios on an open-source Android app, run on the GitHub Actions emulator, with screenshot, page source and logcat kept on failure | ![CI](https://github.com/valarcon1226/qa-automation-portfolio/actions/workflows/mobile-appium-android.yml/badge.svg?branch=main) |
| [Performance gate](performance-k6/) | k6, Docker | Load, spike and forged-signature scenarios against the order service, with thresholds, a baseline comparison and a run-to-run trend. It found a race on simultaneous deliveries, fixed since | ![CI](https://github.com/valarcon1226/qa-automation-portfolio/actions/workflows/performance-k6.yml/badge.svg?branch=main) |
| [Java suite](qa-java-suite/) | Java 21, Selenium, Cucumber, REST Assured, Allure | 35 cases, page objects shared by JUnit tests and Cucumber steps | Runs in Docker |
| [Python suite](qa-showcase/) | Python, Playwright, httpx | API and UI tests, including five that pin known bugs of the demo site | ![CI](https://github.com/valarcon1226/qa-automation-portfolio/actions/workflows/qa-showcase.yml/badge.svg?branch=main) |

## Backend and automation services

Twelve services designed to run together as one self-hosted stack, plus builds for small businesses. Each has code, tests and a README that states its limits; [`PROJECTS.md`](PROJECTS.md) has the full list. A few to start with:

- [n8n automation pack](n8n-automation-pack/), tested against a real n8n
- [Data cleaning API](data-cleaning-api/), [monitoring stack](monitoring-dashboard/) and [CI/CD pipeline](ci-cd-pipeline/)
- [Business registry enricher](business-registry-enricher/) and [multi-channel notifier](multi-channel-notifier/)

## Personal tools and learning

- [`youtube-rag-analyzer`](youtube-rag-analyzer/): turns videos into fact-checked notes, reading the transcript and the frames on screen, on free model tiers.
- [`doc-ingest`](doc-ingest/): local document ingestion and question answering with Ollama; answers cite the source document and page.
- [`universal-web-scraper`](universal-web-scraper/): an agent that downloads course material for offline study.
- [`jobhunter`](jobhunter/): my own job-search pipeline: finds openings, scores them against my profile and tailors the CV.
- [`homelab`](homelab/): notes on the home server that runs my automations.
- [`ibm-coursework`](ibm-coursework/): lab scripts from the IBM RAG and Agentic AI certificate, kept for reference. The full course material is in [ibm-rag-agentic-ai-labs](https://github.com/valarcon1226/ibm-rag-agentic-ai-labs).

## How to read the evidence

- A CI badge shows the last run on `main`. Workflows are in [`.github/workflows`](.github/workflows/). The heavier suites (resilience, migration, performance) run in scheduled nightly jobs.
- Each findings document separates what was measured from the explanation, and says so when a cause is not confirmed.
- Versions of the systems under test are pinned in every compose file, so a result can be reproduced.
