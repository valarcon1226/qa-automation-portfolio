# Sabor de Casa — WhatsApp & Web Restaurant Assistant

Conversational assistant that handles a restaurant's WhatsApp and web chat 24/7: takes delivery orders, schedules table reservations, collects leads for private events, and smoothly hands conversations over to human staff without requiring customers to repeat their information.

## Evaluation & Decision Framework

> **What was measured and what decision it enables:**  
> This project includes an automated conversation evaluation suite ([`evals/cases.yaml`](evals/cases.yaml)) measuring tool-calling precision, knowledge grounding, strict business policy enforcement (maximum 12 guests per table reservation, Monday closure, 8:30 PM last seating cutoff), allergen safety, off-topic deflection, and prompt injection defense across 30 deterministic test cases in both Spanish and English.  
> This benchmark enables engineering and management to make an objective, data-driven **go/no-go production deployment decision** before granting the assistant autonomous customer-facing authority.  
> **Real Results:** Evaluated against local Ollama (`qwen3:4b-instruct-2507-q4_K_M`) across the 30 real conversation test cases, the assistant achieved **9/30 (30.0%)** pass rate in [`evals/RESULTS.md`](evals/RESULTS.md). As detailed in the qualitative error analysis, a significant portion of failures stem from overly literal assertion criteria (for example, the model answered menu questions, pricing, and allergens accurately directly from BM25 retrieved knowledge without triggering the redundant `get_menu` tool call, or called `check_availability` before reserving), alongside real model behavioral defects in off-topic deflection and English schedule hallucination.

---

## 1. The Problem

A small or mid-sized restaurant receives dozens of WhatsApp and web inquiries daily requesting the menu, checking delivery areas, booking tables, or asking for event quotes. Answering each manually:

- Results in missed orders outside business hours.
- Overwhelms staff during peak rush hours (precisely when order intake is most critical).
- Causes human error when calculating totals, delivery surcharges, or group seating capacities.

This project solves these challenges with an autonomous assistant that replies instantly with deterministic business logic (prices, delivery zones, schedules, capacities) consistently applied, immediately alerting staff whenever a situation genuinely requires human judgment.

---

## 2. Capabilities & Covered Scenarios

| Scenario | Behavior |
|---|---|
| **Delivery Order** | The customer builds an order in natural language. The assistant verifies the menu, delivery zone coverage, minimum order threshold ($25,000 COP), and payment method. The server deterministically calculates the total (including delivery fees) and records the order. |
| **Order Status** | The customer checks their order status using an order ID; customers can only access their own orders. |
| **Table Reservation** | The customer requests a table for a specific date, time, and party size. The assistant validates operating hours, day of the week (closed Mondays), available seating capacity (max 40 per 30-min window), and group size (up to 12 guests). |
| **Modify or Cancel Reservation** | Customers can reschedule date/time or cancel without penalty up to 2 hours prior to the reservation. Customers can only modify their own reservations. |
| **Automated Reminder** | A background worker automatically delivers a WhatsApp reminder 24 hours prior to the scheduled booking. |
| **Large Events (> 12 guests)** | Requests exceeding 12 guests are politely diverted to catering/event management. The assistant captures event type, desired date, guest count, estimated budget, and contact name as a sales lead. |
| **Human Handover** | Triggered when explicitly requested by the customer or automatically after 2 consecutive agent failures. The bot pauses for that customer for 12 hours while alerting staff with reason and context. |
| **Staff Commands** | Authorized team phone numbers can execute administrative commands: `/pedidos` (view pending orders for today), `/bot <phone>` (resume bot for a customer), and `/r <phone> <message>` (reply directly as staff). |

What the bot **deliberately does not do**: it does not process online credit card transactions directly, does not hallucinate custom discounts, and avoids external microservice bloat—the entire system runs in a single clean FastAPI process backed by PostgreSQL.

---

## 3. Architecture

```mermaid
flowchart LR
    subgraph Channels
        Meta[Meta WhatsApp Cloud API]
        Widget[Web Chat Widget :8004/widget]
        DevChat[Developer Chat POST /dev/chat]
    end

    Meta <-->|webhook / messages| Webhook[app/webhook.py]
    Widget <-->|POST /web/chat| WebChat[app/web_chat.py]
    DevChat --> DevRouter[app/dev_chat.py]

    subgraph API["FastAPI Application"]
        Webhook --> Conv[app/conversation.py<br/>deduplication · rate limiting · staff routing]
        WebChat --> Conv
        DevRouter --> Conv
        Conv --> Agent[app/agent.py<br/>BM25 retrieval + function calling]
        Agent <--> Tools[app/tools.py<br/>deterministic business logic]
        Reminders[app/reminders.py<br/>background reminder loop]
    end

    subgraph Storage["Data Store"]
        Postgres[(PostgreSQL 15)]
        Knowledge["knowledge/*.md<br/>restaurant policies & menu"]
    end

    Tools <--> Postgres
    Conv <--> Postgres
    Reminders <--> Postgres
    Agent <--> Knowledge
```

---

## 4. Technology Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0 (async), asyncpg, Pydantic v2.
- **Database:** PostgreSQL 15 (Docker container or managed instance).
- **LLM Engine:** OpenAI-compatible client (`AsyncOpenAI`) configured for Groq (`llama-3.3-70b-versatile`), with built-in fallback to scripted deterministic mode (`LLM_FAKE=true`).
- **Retrieval:** Pure-Python BM25 ranker over curated Markdown files in `knowledge/`.
- **Testing & Evals:** `pytest`, `pytest-asyncio`, Playwright (msedge), evaluation harness in `evals/`.

---

## 5. Getting Started

### Prerequisites
- Python 3.12+
- Docker and Docker Compose (optional for full containerized stack)

### Local Development Setup

1. **Clone and enter the directory:**
   ```bash
   cd whatsapp-restaurant-assistant
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python -m venv .venv
   # Windows PowerShell:
   .venv\Scripts\Activate.ps1
   # Linux/macOS:
   source .venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements-dev.txt
   ```

4. **Run test suite:**
   ```bash
   python -m pytest -q
   ```

5. **Run conversation evaluation suite:**
   ```bash
   # Evaluates real configured model, reporting NO EJECUTADO if credentials or model are unavailable:
   python -m evals.runner
   ```

---

## 6. Docker Deployment

Launch the complete stack (FastAPI backend + PostgreSQL 15):

```bash
docker compose up -d
```

The service will be accessible at:
- **API Health:** `http://localhost:8004/health`
- **Embedded Web Chat Widget:** `http://localhost:8004/widget/demo/index.html`
- **Knowledge Admin Panel:** `http://localhost:8004/admin`

---

## 7. Configuration Reference (`.env`)

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL async connection URI | `postgresql://postgres:...@localhost:5436/restaurant_db` |
| `LLM_BASE_URL` | Base URL for OpenAI-compatible endpoint | `https://api.groq.com/openai/v1` |
| `LLM_API_KEY` | API Key for LLM provider | `change_me_llm_api_key` |
| `LLM_MODEL` | Target language model name | `llama-3.3-70b-versatile` |
| `LLM_FAKE` | Enable scripted testing LLM | `true` (for tests/local demos) |
| `WHATSAPP_ENABLED` | Enable Meta WhatsApp webhook integration | `false` |
| `STAFF_WA_IDS` | Comma-separated staff phone numbers | `""` |
| `ADMIN_API_KEY` | Secret key for `/admin` file uploads | `test_admin_key` |
| `DEV_MODE` | Enable `/dev/chat` testing endpoint | `true` |
