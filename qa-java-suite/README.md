# QA Java Automation Suite

Automated test suite built with **Java 21**. Covers web UI testing (Selenium WebDriver 4), REST API testing (RestAssured), Behavior-Driven Development (Cucumber BDD), controlled defect reproduction for known bugs, and interactive reporting with Allure.

---

## Architectural Highlights

1. **Modular Page Object Model (POM):**
   - Strict separation between UI interaction logic (`qa.ui.pages`) and assertions/test flows (`qa.ui.tests`).
   - Reusable base components for explicit waits and WebDriver lifecycle management.

2. **Web UI Automation with Selenium WebDriver 4 & Microsoft Edge:**
   - Full E2E user journeys on SauceDemo: authentication, inventory catalog, cart management, and multi-step checkout through order completion.
   - Strict business rule validations (exact error strings and floating-point tolerance for tax/subtotal calculations).

3. **REST API Automation with RestAssured:**
   - Full CRUD lifecycle against [Restful Booker API](https://restful-booker.herokuapp.com): token generation (`/auth`), booking creation (`POST /booking`), retrieval (`GET`), full/partial updates (`PUT`/`PATCH`), and deletion (`DELETE`).
   - Negative testing (HTTP 403 Forbidden on invalid tokens, HTTP 404 Not Found on nonexistent records).
   - Preventive client-side rate limiting (1 request per second max).

4. **BDD Living Documentation with Cucumber:**
   - Executable Gherkin feature files (`saucedemo.feature`) executed via JUnit Platform Suite (`RunCucumberTest`).
   - Reuses Page Objects directly across both standard JUnit tests and Cucumber step definitions.

5. **Containerized Execution via Docker:**
   - Runs in isolated Docker containers without requiring local installations of Java, Maven, or Edge (`selenium/standalone-edge` and `maven:3.9-eclipse-temurin-21`).

6. **Continuous Integration & Reporting:**
   - Ready-to-use pipeline definitions for GitHub Actions and Azure DevOps in `ci/`.
   - Allure interactive HTML test reports with execution history, categories, and step breakdowns.

---

## Test Case Matrix (35 Cases)

| ID | Type | Target & Verification |
| :--- | :--- | :--- |
| **LOGIN-01** | UI (Selenium) | Standard user (`standard_user`) authentication and redirect to catalog (`inventory.html`). |
| **LOGIN-02** | UI (Selenium) | Locked-out user (`locked_out_user`) error verification (`"Epic sadface: Sorry, this user has been locked out."`). |
| **LOGIN-03** | UI (Selenium) | Invalid credentials error verification. |
| **LOGIN-04** | UI (Selenium) | Input validation: explicit error messages for missing username and missing password. |
| **INV-01** | UI (Selenium) | Add backpack to cart, verify badge increments to "1", remove item, verify badge clears to "0". |
| **INV-02** | UI (Selenium) | Catalog sorting verification across all 4 options (Z-A, Low-High, High-Low, A-Z). |
| **QA-104** | UI / Known Defect | Problem user (`problem_user`) defect reproduction: clicking "Add to cart" on all 6 items fails to add all items. |
| **QA-105** | UI / Known Defect | Problem user defect reproduction: Last Name input field is not persisted during checkout, triggering validation error. |
| **QA-106** | UI / Known Defect | Problem user defect reproduction: clicking "Remove" in catalog fails to remove item from cart. |
| **CHECKOUT-01** | UI (Selenium) | 2-item cart (backpack and bike light): verify badge displays "2" and cart table displays 2 rows. |
| **CHECKOUT-02** | UI (Selenium) | Full E2E purchase flow: cart review, address entry, overview validation, order placement, and `"Thank you for your order!"` confirmation. |
| **CHECKOUT-03** | UI (Selenium) | Checkout step 1 validation: missing First Name displays `"Error: First Name is required"`. |
| **CHECKOUT-04** | UI (Selenium) | Checkout step 1 validation: missing Last Name displays `"Error: Last Name is required"`. |
| **CHECKOUT-05** | UI (Selenium) | Checkout step 1 validation: missing Postal Code displays `"Error: Postal Code is required"`. |
| **CHECKOUT-06** | UI (Selenium) | Mathematical consistency: total equals `Subtotal + Tax` within 0.01 tolerance. |
| **CHECKOUT-07** | UI (Selenium) | Cancel button in Checkout Step 1 navigates back to cart (`cart.html`). |
| **CHECKOUT-08** | UI (Selenium) | Cancel button in Checkout Step 2 (Overview) navigates back to catalog (`inventory.html`). |
| **API-01** | API (RestAssured) | `POST /auth`: valid administrator authentication returns HTTP 200 and a non-null token. |
| **API-02** | API (RestAssured) | `POST /auth`: invalid credentials return HTTP 200 with `reason: "Bad credentials"`. |
| **API-03** | API (RestAssured) | `POST /booking`: booking creation returns HTTP 200, valid `bookingid`, and matching payload. |
| **API-04** | API (RestAssured) | `GET /booking/{id}`: retrieval of previously created booking returns HTTP 200 and data integrity. |
| **API-05** | API (RestAssured) | `GET /booking`: general listing returns non-empty list of booking IDs. |
| **API-06** | API (RestAssured) | `PUT /booking/{id}`: full booking update with auth token returns HTTP 200 and updated fields. |
| **API-07** | API (RestAssured) | `DELETE /booking/{id}`: booking deletion with token returns HTTP 201; subsequent GET returns HTTP 404. |
| **API-08** | API (RestAssured) | `PUT /booking/{id}` (Negative): update attempt with invalid token returns HTTP 403 Forbidden. |
| **API-09** | API (RestAssured) | `DELETE /booking/{id}` (Negative): deletion attempt with invalid token returns HTTP 403 Forbidden. |
| **API-10** | API (RestAssured) | `GET /booking/999999999` (Negative): non-existent booking lookup returns HTTP 404 Not Found. |
| **API-11** | API (RestAssured) | `GET /ping`: health check endpoint returns HTTP 201 Created. |
| **BDD-01** | BDD (Cucumber) | QA-104 defect scenario: `problem_user` fails to add all items to cart. |
| **BDD-02** | BDD (Cucumber) | QA-105 defect scenario: `problem_user` cannot enter Last Name during checkout. |
| **BDD-03** | BDD (Cucumber) | QA-106 defect scenario: `problem_user` cannot remove items from catalog. |
| **BDD-04** | BDD (Cucumber) | Standard shopping scenario: adding 2 items updates badge counter to "2". |
| **BDD-05** | BDD (Cucumber) | Standard checkout scenario: completing order journey displays `"Thank you for your order!"`. |
| **BDD-06** | BDD (Cucumber) | Validation scenario: missing first name displays expected validation error. |
| **BDD-07** | BDD (Cucumber) | Validation scenario: missing postal code displays expected validation error. |

---

## Running Tests with Docker

No local installation of Java, Maven, or Edge is required. Execution is orchestrated via Docker Compose.

### 1. Start the Selenium Edge Service
```bash
docker compose up -d selenium
```

### 2. Run the Test Suite
```bash
# Run tests quietly
docker compose run --rm tests mvn -q test

# Run tests with detailed console logs
docker compose run --rm tests mvn test
```

### 3. Stop Containers
```bash
docker compose down
```

---

## Allure Test Reports

The Allure Maven plugin is pre-configured in `pom.xml`. Test execution automatically generates raw results in `target/allure-results`.

### 1. Generate Static HTML Report
```bash
docker compose run --rm tests mvn allure:report
```

The standalone HTML report is generated at:
```
target/site/allure-maven-plugin/index.html
```

### 2. Open Report in Browser
- Open `target/site/allure-maven-plugin/index.html` directly in your browser.
- Or launch via the Allure CLI:
  ```bash
  allure open target/site/allure-maven-plugin
  ```

---

## Continuous Integration (CI/CD)

The `ci/` directory provides pipeline definitions ready for CI runners:

1. **GitHub Actions (`ci/github-actions.yml`):**
   - Spins up Selenium Edge in headless mode.
   - Executes the Maven test suite inside Docker.
   - Generates Allure reports via `simple-elf/allure-report-action`.
   - Deploys test reports to GitHub Pages (`gh-pages`).

2. **Azure DevOps Pipelines (`ci/azure-pipelines.yml`):**
   - Orchestrates container lifecycle and test execution.
   - Publishes JUnit XML test results (`PublishTestResults@2`) to the Azure DevOps test analytics tab.
