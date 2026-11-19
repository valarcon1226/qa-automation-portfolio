# Sabor de Casa — Web Chat Widget

An accessible, lightweight, and responsive floating web chat widget built with **TypeScript** and **React**, compiled into a single self-contained script bundle (`widget.js`). It connects directly to the Sabor de Casa conversational restaurant assistant (Project `whatsapp-restaurant-assistant`).

---

## 1. Features & Capabilities

- **Zero-Dependency Embed:** Compiles to a single standalone file (`widget.js`) with React bundled in IIFE format. No external CDN or wrapper libraries required on host pages.
- **Strict TypeScript:** Built with strict typing (`noImplicitAny`, `strictNullChecks`, zero `any`).
- **Full Accessibility (a11y):**
  - Accessible button labels (`aria-label="Abrir chat"`, `aria-label="Cerrar chat"`).
  - Input field labeled with `aria-label="Mensaje"`.
  - Dynamic messages container announced via `aria-live="polite"`.
  - Seamless keyboard navigation: press `Enter` on the launcher to open and focus input; press `Escape` inside the panel to close and return focus to the launcher button.
- **State & Session Persistence:** Persists user conversations (`chat_history`) and unique session identifiers (`chat_session_id`) in browser `localStorage`.
- **Responsive Layout:** Automatically adapts to mobile screens (`90vw` for screens narrower than 400px).
- **Robust Network Error Handling:** Displays inline feedback on network disconnections and server error responses (`500`/`503`), clearing loading indicators reliably.

---

## 2. Embedding in Any Website

Add the `<script>` tag just before your closing `</body>` tag on any HTML page:

```html
<!-- Example embedding -->
<script src="https://your-domain.com/widget.js" 
        data-api="https://your-api.com" 
        data-title="Asistente Sabor de Casa"></script>
```

### Configuration Attributes

| Attribute | Required | Default | Description |
|---|:---:|---|---|
| `data-api` | **Yes** | `http://localhost:8004` | Base URL of the FastAPI backend serving `/web/chat`. |
| `data-title` | No | `Chat` | Header title displayed on the chat panel. |

---

## 3. Building & Developing

### Prerequisites
- Node.js 18+ and npm
- Python 3.12+ (for running Playwright test suite)

### Commands

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Type check with strict compiler:**
   ```bash
   npx tsc --noEmit
   # or
   npm run type-check
   ```

3. **Compile bundle:**
   ```bash
   npm run build
   ```
   *Uses `esbuild` to produce a minified, self-contained IIFE bundle at `widget.js` in ~30ms.*

4. **Run End-to-End Tests:**
   ```bash
   pytest
   ```
   *Runs automated Playwright tests using Microsoft Edge (`--browser-channel msedge`).*

---

## 4. Serving the Widget from FastAPI (Project `whatsapp-restaurant-assistant`)

The backend in `whatsapp-restaurant-assistant` automatically mounts this folder as static files at `/widget`:

```
http://localhost:8004/widget/widget.js
http://localhost:8004/widget/demo/index.html
```

When changes are built to `widget.js`, Project `whatsapp-restaurant-assistant` immediately serves the updated bundle without rebuilding backend containers.

---

## 5. Security & CORS

- **CORS:** Ensure that `WEB_CORS_ORIGINS` in Project `whatsapp-restaurant-assistant` includes the origin domain of any external website embedding the widget.
- **Rate Limiting:** Inbound messages sent via `/web/chat` are subject to the same customer rate limit rules as WhatsApp messages (max 20 messages per 10-minute window).
