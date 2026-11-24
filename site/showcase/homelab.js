window.SHOWCASE = {
  headline:
    "Documents the self-hosted Debian automation server running 24/7 jobs, dashboards, and a local 4B AI model at ~22.6 tokens/sec with automated cloud fallback and disk recovery.",
  source: "README.md",
  blocks: [
    {
      type: "stats",
      title: "Home server capacity & workload snapshot",
      caption:
        "Sanitized operational snapshot from the server documentation (all network addresses, hostnames, and credentials omitted).",
      items: [
        {
          label: "Server compute",
          value: "8 cores",
          note: "7.6 GB RAM + 4 GB VRAM GPU on Debian 13",
          tone: "info",
        },
        {
          label: "Local AI speed",
          value: "22.6 tok/s",
          note: "Qwen3 4B running 100% on GPU",
          tone: "good",
        },
        {
          label: "Database records",
          value: 818,
          note: "222 jobs, 547 freelance gigs, 49 market trends",
          tone: "info",
        },
        {
          label: "Disk space used",
          value: "18%",
          note: "35 GB / 211 GB used (166 GB free after cleanup)",
          tone: "good",
        },
      ],
    },
    {
      type: "table",
      title: "Always-on self-hosted services",
      columns: ["Service", "Purpose", "Run schedule"],
      rows: [
        ["Homepage", "Central quick-access portal for home apps", "24/7"],
        ["Portainer", "Visual container management dashboard", "24/7"],
        ["Nextcloud", "Private self-hosted file storage", "24/7"],
        ["Hustles Dashboard", "Live job & freelance opportunity browser", "24/7"],
        ["Hermes Librarian", "AI agent connected to personal Markdown notes", "24/7"],
        ["Job Hunter Stack (4 workers)", "Job scouting, CV tailoring, freelance gigs, trend spotting", "Every 5 min to 24h"],
        ["Local Ollama Engine", "Zero-cost local model inference for background workers", "System service"],
      ],
      tones: {
        "24/7": "good",
        "System service": "info",
      },
    },
    {
      type: "before_after",
      title: "Disk-full incident & recovery (2026-09-28)",
      caption:
        "Retired unconfigured media services so background automations remain reliable 24/7.",
      before: {
        "Root disk usage": "100% full (211 GB / 211 GB)",
        "Automation state": "Job pipeline halted with database/disk full errors",
        "Workload mix": "Media downloaders + automation agents sharing 211 GB",
      },
      after: {
        "Root disk usage": "18% used (35 GB / 211 GB · 166 GB free)",
        "Automation state": "All 4 workers healthy and writing new records",
        "Workload mix": "Server dedicated strictly to automations & local AI",
      },
    },
  ],
};
