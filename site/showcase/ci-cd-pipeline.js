window.SHOWCASE = {
  headline:
    "Passed all 5 quality, type-safety, security, and test gates at 96% coverage, then recorded 3 live service releases and a production rollback.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "Pipeline verification highlights",
      caption:
        "Executed local static checks, security scan, test suite, and live deployment tracker service.",
      items: [
        {
          label: "Quality & security gates",
          value: "5 / 5",
          note: "Lint, format, types, SAST, tests",
          tone: "good",
        },
        {
          label: "Code coverage",
          value: "95.98%",
          note: "Exceeds 80% required gate",
          tone: "good",
        },
        {
          label: "Security findings",
          value: 0,
          note: "277 source lines scanned cleanly",
          tone: "good",
        },
        {
          label: "Tracked releases",
          value: 3,
          note: "2 successful, 1 rolled back",
          tone: "info",
        },
      ],
    },
    {
      type: "checklist",
      title: "Automated release gate checks",
      items: [
        {
          text: "Code style & lint verification passed",
          status: "pass",
          detail: "All checks passed across application and test files",
        },
        {
          text: "Consistent formatting check passed",
          status: "pass",
          detail: "10 files already properly formatted",
        },
        {
          text: "Strict static type checking passed",
          status: "pass",
          detail: "0 issues found across 6 source files",
        },
        {
          text: "Static security vulnerability scan passed",
          status: "pass",
          detail: "0 high, medium, or low issues across 277 lines",
        },
        {
          text: "Automated behavior suite passed with 95.98% coverage",
          status: "pass",
          detail: "14 unit and endpoint checks passed in 2.14s",
        },
      ],
    },
    {
      type: "table",
      title: "Live deployment tracker audit log",
      columns: ["Service", "Environment", "Version", "Triggered by", "Note", "Outcome"],
      rows: [
        ["order-service", "production", "v1.2.0", "pipeline-bot", "Initial production release", "Successful"],
        ["billing-api", "staging", "v2.1.0-rc1", "release-manager", "Tax calculation patch", "Successful"],
        ["checkout-worker", "production", "v1.4.2", "pipeline-bot", "Manual rollback to v1.4.1 completed", "Rolled back"],
      ],
      tones: {
        Successful: "good",
        "Rolled back": "warn",
      },
    },
  ],
};
