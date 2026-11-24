window.SHOWCASE = {
  headline:
    "Processed 500 business rows across 3 pipelines under live synthetic load while capturing service latency, structured logs, and 2 critical alert notifications.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "Live observability run summary",
      caption:
        "Generated real traffic against the instrumented service, scraped live metrics, and delivered alerts to the local receiver.",
      items: [
        {
          label: "Business rows processed",
          value: 500,
          note: "Across 5 batches in 3 pipelines",
          tone: "good",
        },
        {
          label: "Successful requests",
          value: 26,
          note: "20 item reads, 5 batches, 1 slow check",
          tone: "good",
        },
        {
          label: "Triggered errors",
          value: 3,
          note: "Synthetic 500s logged for alert testing",
          tone: "warn",
        },
        {
          label: "Automated checks",
          value: "13 / 13",
          note: "All service, metric, and webhook checks passed",
          tone: "good",
        },
      ],
    },
    {
      type: "bars",
      title: "Processed business rows by pipeline",
      caption: "Live business counter values scraped directly from the running service.",
      unit: "rows",
      items: [
        { label: "Sales pipeline", value: 200, tone: "good" },
        { label: "Inventory ETL pipeline", value: 200, tone: "good" },
        { label: "Financial enricher pipeline", value: 100, tone: "info" },
      ],
    },
    {
      type: "table",
      title: "Configured alert rules (5 monitors)",
      columns: ["Alert rule", "What it watches", "Threshold", "Severity"],
      rows: [
        ["ServiceDown", "Service availability heartbeat", "Unreachable > 10s", "Critical"],
        ["HighErrorRate5xx", "Share of server failure responses", "> 5% over 1 minute", "Critical"],
        ["HighLatencyP95", "95th percentile response time", "> 500 ms for 30s", "Warning"],
        ["HighDiskUsage", "Host filesystem capacity", "> 85% disk used", "Warning"],
        ["PostgresDown", "Database health exporter", "Database down > 15s", "Critical"],
      ],
      tones: {
        Critical: "bad",
        Warning: "warn",
      },
    },
    {
      type: "messages",
      title: "Sample alert payload received by the notification sink",
      items: [
        {
          channel: "Alert Webhook",
          side: "in",
          from: "Alertmanager",
          subject: "FIRING: HighErrorRate5xx & ServiceDown (Critical)",
          body: "1) High API Error Rate (5xx): HTTP 5xx error rate is above 5% in the last 1 minute.\n2) Demo App is down: Target demo-app has been unreachable for more than 10 seconds.",
        },
      ],
    },
  ],
};
