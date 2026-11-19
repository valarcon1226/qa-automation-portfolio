import { createRoot } from "react-dom/client";
import type { WidgetConfig } from "./types";
import { Widget } from "./Widget";

// Capture current script at execution time
const currentScript = (typeof document !== "undefined"
  ? (document.currentScript as HTMLScriptElement | null)
  : null);

function resolveConfig(): WidgetConfig {
  const scriptEl =
    currentScript ||
    document.querySelector<HTMLScriptElement>("script[data-api]") ||
    document.querySelector<HTMLScriptElement>("script[src*='widget.js']");

  const api = scriptEl?.getAttribute("data-api") || "http://localhost:8004";
  const title = scriptEl?.getAttribute("data-title") || "Chat";

  let sessionId = localStorage.getItem("chat_session_id");
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15);
    try {
      localStorage.setItem("chat_session_id", sessionId);
    } catch {
      // Ignore storage write issues
    }
  }

  return { api, title, sessionId };
}

function mountWidget(): void {
  const config = resolveConfig();
  const mountContainer = document.createElement("div");
  mountContainer.id = "sabor-de-casa-widget-root";
  document.body.appendChild(mountContainer);

  const root = createRoot(mountContainer);
  root.render(<Widget config={config} />);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountWidget);
  } else {
    mountWidget();
  }
}
