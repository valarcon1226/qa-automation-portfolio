window.SHOWCASE = {
  headline:
    "Validated a 10-service production stack behind a single edge router with isolated private networks, encrypted secret files, and automated dependency health checks.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "Stack topology & verification summary",
      caption:
        "Configuration, documentation sync, and backend dependency checks verified locally.",
      items: [
        {
          label: "Services configured",
          value: 10,
          note: "Proxy, API, workers, databases, storage, metrics",
          tone: "info",
        },
        {
          label: "Health & secret checks",
          value: "5 / 5",
          note: "Passed in 12.7s",
          tone: "good",
        },
        {
          label: "Isolated network tiers",
          value: 3,
          note: "Frontend, backend, and private database tier",
          tone: "good",
        },
        {
          label: "Public web entrypoints",
          value: 3,
          note: "API gateway, workflow editor, dashboards",
          tone: "info",
        },
      ],
    },
    {
      type: "table",
      title: "10-service architecture & network isolation",
      columns: ["Service", "Role", "Exposure", "Health check"],
      rows: [
        ["Traefik", "Edge reverse proxy & SSL termination", "Public (ports 80 / 443)", "Verified"],
        ["FastAPI Gateway", "Central backend API entry point", "Via Traefik only", "Verified"],
        ["n8n", "Visual workflow automation engine", "Via Traefik only", "Verified"],
        ["Grafana", "Visual observability dashboards", "Via Traefik only", "Verified"],
        ["Celery Worker", "Asynchronous background task runner", "Internal only", "Verified"],
        ["Celery Beat", "Scheduled job trigger", "Internal only", "Running"],
        ["PostgreSQL 16", "Shared database with isolated per-app roles", "Private DB tier only", "Verified"],
        ["Redis 7", "Password-protected cache & task broker", "Private DB tier only", "Verified"],
        ["MinIO", "Private S3-compatible file storage", "Private DB tier only", "Verified"],
        ["Prometheus", "Time-series metrics collector", "Internal only", "Verified"],
      ],
      tones: {
        Verified: "good",
        Running: "info",
      },
    },
    {
      type: "checklist",
      title: "Automated configuration & security checks",
      items: [
        {
          text: "All 10 services validate cleanly in combined production & local compose config",
          status: "pass",
          detail: "Verified by compose validation check (exit code 0)",
        },
        {
          text: "Documentation stays synchronized with the actual compose & environment files",
          status: "pass",
          detail: "README sync check passed with zero drift",
        },
        {
          text: "Gateway reports healthy only when both database and cache are reachable",
          status: "pass",
          detail: "Returns degraded unavailable status immediately if either dependency fails",
        },
        {
          text: "Signing keys and superuser passwords load from mounted secret files",
          status: "pass",
          detail: "Startup blocks cleanly if required database or secret configuration is missing",
        },
      ],
    },
  ],
};
