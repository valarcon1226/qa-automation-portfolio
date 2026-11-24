window.SHOWCASE = {
  headline:
    "Formatted and routed 3 real business notifications—welcome onboarding, critical operations alerts, and a daily summary—across Email, Slack, Telegram, and Discord from a single request.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "Outbound messaging summary",
      caption:
        "Validated recipients and message templates before queueing delivery across all four channels.",
      items: [
        {
          label: "Channels supported",
          value: 4,
          note: "Email, Slack, Telegram & Discord",
          tone: "info",
        },
        {
          label: "Templates rendered",
          value: 3,
          note: "Welcome, Alert & Daily Report",
          tone: "good",
        },
        {
          label: "Channel deliveries logged",
          value: "7 / 7",
          note: "4 onboarding + 2 ops alerts + 1 digest",
          tone: "good",
        },
      ],
    },
    {
      type: "messages",
      title: "Actual formatted messages delivered to recipients",
      caption:
        "Rendered directly from the notification templates with user and system data filled in.",
      items: [
        {
          channel: "Email",
          side: "out",
          to: "alice@example.com",
          subject: "Welcome to Data Intake Pipeline",
          body: "Hello Alice,\n\nWelcome to Data Intake Pipeline!\n\nThanks for joining us.",
        },
        {
          channel: "Slack",
          side: "out",
          to: "#ops-alerts",
          body: ":rotating_light: *CRITICAL*: Database connection pool at 95% capacity\nSystem: Order Automation API",
        },
        {
          channel: "Email",
          side: "out",
          to: "ops@example.com",
          subject: "Daily Operations Report - 2026-11-22",
          body: "Daily Report — 2026-11-22\n\nSummary: All scheduled ingestion and cleaning batches finished within SLA.\n\nTotal items processed: 148",
        },
      ],
    },
    {
      type: "table",
      title: "Unified delivery audit log",
      columns: ["Template Used", "Priority", "Target Channels", "Status"],
      rows: [
        ["Welcome Email", "High", "Email, Slack, Telegram, Discord", "Delivered (4/4)"],
        ["Critical Ops Alert", "High", "Slack (#ops-alerts), Discord", "Delivered (2/2)"],
        ["Daily Operations Report", "Medium", "Email (ops@example.com)", "Delivered (1/1)"],
      ],
      tones: {
        "Delivered (4/4)": "good",
        "Delivered (2/2)": "good",
        "Delivered (1/1)": "good",
        High: "warn",
      },
    },
  ],
};
