# ParaBank Automated Quality Engineering Framework

> End-to-end, API and visual regression test suite built with **Playwright Test** and **TypeScript** (Strict Mode) against the **ParaBank** banking system.

[![Playwright](https://img.shields.io/badge/Playwright-1.48.2-2EAD33?logo=playwright)](https://playwright.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.4_Strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-24-339933?logo=node.js)](https://nodejs.org/)
[![Browsers](https://img.shields.io/badge/Browsers-Edge_%7C_Firefox_%7C_WebKit-0078D7)](https://playwright.dev/docs/browsers)

---

## 1. What Exists Today

This repository delivers an automated testing suite designed according to modern Software Quality Engineering standards.

Key highlights:

- **Strict TypeScript Architecture:** Zero untyped variables (`strict: true`, ESLint + Prettier enforcement).
- **Targeted Browser Matrix:** Primary focus on **Microsoft Edge** (`channel: 'msedge'`) with cross-browser support for **Mozilla Firefox** and **WebKit**. Chrome/Chromium are disallowed per project policy.
- **Hybrid UI + API Verification:** A hybrid test executes funds transfer through the user interface and immediately validates the resulting balances directly via ParaBank's REST API, preventing UI masking of backend calculation defects.
- **Disposable Customer Fixture:** Automated lifecycle generating unique dynamic accounts for tests, followed by verified cleanup via `/cleanDB` asserting the user has been purged.
- **Visual Regression Testing:** Snapshot comparison on the primary login interface using `toHaveScreenshot()`.
- **Zero Sleep Policy:** No static pauses (`page.waitForTimeout` / `setTimeout`). All tests synchronize on explicit DOM states, network responses, and API state assertions.

---

## 2. Test Coverage: Designed vs. Automated

| Functional Area                        | Scenarios Designed | Scenarios Automated | Coverage (%) | Automated Test Spec                                                                       |
| -------------------------------------- | :----------------: | :-----------------: | :----------: | ----------------------------------------------------------------------------------------- |
| **Authentication & Registration**      |         10         |          5          |     50%      | `tests/ui/auth.spec.ts`                                                                   |
| **Accounts & Overview**                |         7          |          3          |     43%      | `tests/ui/accounts.spec.ts`                                                               |
| **Transfers & Balance Reconciliation** |         5          |          2          |     40%      | `tests/ui/transfers.spec.ts`                                                              |
| **Bill Pay Services**                  |         4          |          1          |     25%      | `tests/ui/billpay.spec.ts`                                                                |
| **Loan Applications**                  |         4          |          1          |     25%      | `tests/ui/loan.spec.ts`                                                                   |
| **Find Transactions**                  |         5          |          1          |     20%      | `tests/ui/accounts.spec.ts`                                                               |
| **Customer Profile**                   |         3          |          1          |     33%      | `tests/ui/profile.spec.ts`                                                                |
| **REST API & DB Lifecycle**            |         10         |         10          |     100%     | `tests/api/accounts.spec.ts`, `tests/api/transactions.spec.ts`, `tests/api/admin.spec.ts` |
| **Visual Regression**                  |         1          |          1          |     100%     | `tests/visual/login.spec.ts`                                                              |
| **Total**                              |       **49**       |       **25**        |   **51%**    | **Full Suite**                                                                            |

_Detailed scenario breakdown and priorities can be found in [`docs/TEST-SCENARIOS.md`](docs/TEST-SCENARIOS.md) and [`docs/TRACEABILITY-MATRIX.md`](docs/TRACEABILITY-MATRIX.md)._

---

## 3. Architecture Overview (Target Architecture)

```mermaid
flowchart TD
    subgraph SUT["System Under Test (Docker Container: 127.0.0.1:8640)"]
        UI["ParaBank Web UI (/parabank/*.htm)"]
        REST["REST API (/parabank/services/bank/*)"]
        DB[("HSQLDB 2.7.4 (Seed & Transient Data)")]
        UI --> DB
        REST --> DB
    end

    subgraph Framework["Playwright + TypeScript Framework"]
        Config["playwright.config.ts (BASE_URL Validation)"]
        Fixtures["Test Fixtures (disposableCustomer & cleanDB teardown)"]
        POM["Page Objects (LoginPage, TransferPage, etc.)"]
        APIClient["BankApiClient (Typed CXF REST Client)"]

        UITests["UI E2E Specs (tests/ui/)"]
        APITests["REST API Specs (tests/api/)"]
        VisTests["Visual Specs (tests/visual/)"]

        Fixtures --> POM
        Fixtures --> APIClient
        POM --> UITests
        APIClient --> APITests
        POM --> VisTests
    end

    subgraph Browsers["Browser Drivers"]
        Edge["Microsoft Edge (channel: msedge)"]
        Firefox["Mozilla Firefox"]
        WebKit["WebKit (Safari Engine)"]
    end

    UITests --> Edge
    UITests -.->|workflow_dispatch| Firefox
    UITests -.->|workflow_dispatch| WebKit
    APITests --> REST
    UITests --> UI
    APIClient -.->|State Check| REST
```

---

## 4. Prerequisites & Environment Variables

### Prerequisites

- **Node.js:** v24.x or higher
- **Docker & Docker Compose:** Required to run the local ParaBank service
- **Microsoft Edge:** Installed locally for UI execution

### Environment Variables

The framework loads variables from `.env`. See `.env.example`:

| Variable   | Default Value                    | Description                                                                   |
| ---------- | -------------------------------- | ----------------------------------------------------------------------------- |
| `BASE_URL` | `http://127.0.0.1:8640/parabank` | Base URL of the ParaBank web application (must be a valid `http`/`https` URL) |

---

## 5. Local Setup & Execution Guide

### 1. Install Dependencies

```bash
npm ci
```

### 2. Start ParaBank SUT

```bash
docker compose up -d --wait
```

_Note: The container healthcheck ensures that database tables and seed parameters are initialized before marking the service healthy._

### 3. Run Quality Gates

```bash
npm run lint
npm run format:check
npm run typecheck
```

### 4. Run Test Suites

```bash
# Run default test suite (Edge UI + API)
npm test

# Run only REST API tests
npm run test:api

# Run only UI tests (Edge)
npm run test:ui

# Run Smoke tests
npm run test:smoke

# Run Regression tests
npm run test:regression

# Run Full Cross-Browser Suite (Edge + Firefox + WebKit)
npm run test:cross-browser
```

### 5. Tear Down SUT

```bash
docker compose down -v
```

---

## 6. Available NPM Scripts

| Script               | Command                                                             | Purpose                                                |
| -------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| `test`               | `playwright test --project=edge`                                    | Runs default UI (Edge) and core tests                  |
| `test:api`           | `playwright test --project=api`                                     | Runs headless REST API test suite                      |
| `test:ui`            | `playwright test --project=edge`                                    | Runs full UI suite on Microsoft Edge                   |
| `test:smoke`         | `playwright test --grep @smoke`                                     | Runs all `@smoke` tagged tests                         |
| `test:regression`    | `playwright test --grep @regression`                                | Runs all `@regression` tagged tests                    |
| `test:cross-browser` | `playwright test --project=edge --project=firefox --project=webkit` | Runs cross-browser matrix across Edge, Firefox, WebKit |
| `lint`               | `eslint "src/**/*.ts" "tests/**/*.ts" "playwright.config.ts"`       | Lints code with ESLint and TypeScript rules            |
| `format:check`       | `prettier --check "**/*.{ts,json,md,yml,yaml}"`                     | Checks formatting compliance                           |
| `typecheck`          | `tsc --noEmit`                                                      | Compiles TypeScript in strict mode without output      |
| `automation:run`     | `npx ts-node automation/run.ts`                                     | Runs Bill Pay batch form filler against ParaBank       |
| `automation:test`    | `npx ts-node automation/test-validation-retry.ts`                   | Runs unit tests for validation, retry & idempotency    |

---

## 7. CI/CD Policy (GitHub Actions)

Workflow file: [`.github/workflows/playwright-ts-parabank.yml`](../.github/workflows/playwright-ts-parabank.yml)

- **Push Policy:** Triggered on changes to `playwright-ts-parabank/**` or the workflow itself. Runs `lint`, `typecheck`, `test:api`, and `test:ui` (Edge) to provide rapid feedback (< 2 minutes).
- **Manual Policy (`workflow_dispatch`):** Executes full cross-browser testing across Edge, Firefox, and WebKit.
- **Reporting:** Generates the official Playwright HTML report and uploads it as an action artifact.

---

## 8. Batch Bill Pay Form Filler Automation (Project `invoice-processor` Integration)

A standalone browser automation tool (not a test runner) designed to ingest extracted invoice records conforming to the **Project `invoice-processor` Invoice Processor** schema (`InvoiceResponse` / `ExtractedInvoice`) and execute batch payments via ParaBank's **Bill Pay** service using **Microsoft Edge** (`channel: 'msedge'`).

### What It Does

1. **Ingests Batch Invoice Records:** Reads input JSON files (defaults to `automation/sample-records.json`) containing invoices extracted by upstream document ingestion pipelines.
2. **Reuses Existing Page Objects:** Operates through the tested `LoginPage`, `BillPayPage`, and `AccountOverviewPage` abstractions without duplication.
3. **Automates Bill Pay Entries:** Populates Payee Name, Street, City, State, Zip Code, Phone Number, Account Number, and Amount into the ParaBank UI.
4. **Verifies Post-Submission Integrity:** Compares the on-screen confirmation notice and queries the account activity table (`/parabank/activity.htm`) to ensure the transaction was persisted accurately.
5. **Generates Run Audits:** Emits timestamped execution metrics in `automation/run-summary.json` and segregates invalid records into `automation/rejected-records.json`.

### How to Run It

```bash
# 1. Run unit tests verifying validation and exponential retry logic (no browser required)
npm run automation:test

# 2. Run batch form filler against ParaBank with sample dataset
npm run automation:run

# 3. Custom run with specific record file and options
npx ts-node automation/run.ts --records automation/sample-records.json --retries 3 --headless
```

#### CLI Flags:

- `--records <path>`: Path to input invoice JSON file (defaults to `automation/sample-records.json`).
- `--state <path>`: Path to state tracking JSON file (defaults to `automation/payment-state.json`).
- `--summary <path>`: Path to output execution summary JSON (defaults to `automation/run-summary.json`).
- `--rejected <path>`: Path to output rejected records JSON (defaults to `automation/rejected-records.json`).
- `--retries <number>`: Maximum retry attempts for transient failures (default: `3`).
- `--headed` / `--headless`: Run Microsoft Edge with visible browser window or in headless mode.

### Failure Handling & Resilience Strategy

- **Pre-flight Schema & Business Validation:** Every record is validated before typing. Required fields (`invoice_id`, `issuer_name`, street, city, state, zipCode, `phoneNumber`, `accountNumber`) and a strictly positive numeric `total` (`> 0`) are enforced. Malformed records are written to `automation/rejected-records.json` with descriptive rejection reasons and do not block remaining valid records in the batch.
- **Idempotency Protection:** Maintains a persistent state ledger (`automation/payment-state.json`) keyed by `invoice_id`. Records already marked as `VERIFIED` are skipped on subsequent runs or retries, preventing duplicate financial transactions.
- **Transient Error Retry with Exponential Backoff:** Transient network failures, connection resets, and navigation timeouts are intercepted by `withRetry()`. Operations are retried with configurable geometric backoff delays (`initialBackoffMs: 1000`, `backoffFactor: 2`). Non-transient errors (such as business rule violations or data mismatches) fail immediately without wasteful retries.
- **Two-Phase Saved Data Verification:**
  - **Phase 1 (Confirmation Screen):** Verifies that the success alert confirms payment to the expected payee and with the exact monetary amount.
  - **Phase 2 (Account Activity Ledger):** Queries the debiting account's transaction log (`activity.htm?id=...`) to verify that a debit entry exists matching the expected payee name and amount. Any discrepancy marks the record as `FAILED`.
