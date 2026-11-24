window.SHOWCASE = {
  headline:
    "Enforced task dependencies by skipping a report until its parent sync finished, ran both jobs cleanly in under 0.25 s, and sent a critical Slack alert after 3 consecutive failures.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "Scheduled automation execution summary",
      caption:
        "Ran 3 scheduled jobs with dependency rules, execution history logging, and automatic failure alerting.",
      items: [
        {
          label: "Jobs orchestrated",
          value: 3,
          note: "Sync, Dependent Report & Check",
          tone: "info",
        },
        {
          label: "Successful runs",
          value: 2,
          note: "145 ms & 222 ms runtime",
          tone: "good",
        },
        {
          label: "Blocked by dependency",
          value: 1,
          note: "Skipped until parent job passed",
          tone: "warn",
        },
        {
          label: "Failure alert sent",
          value: 1,
          note: "Triggered on 3rd failure in a row",
          tone: "bad",
        },
      ],
    },
    {
      type: "table",
      title: "Recorded execution log",
      columns: ["Scheduled Job", "Trigger Condition", "Outcome", "Duration", "Details"],
      rows: [
        [
          "Generate Executive Report",
          "Triggered before Nightly Data Sync ran",
          "Skipped",
          "0 ms",
          "Parent job had not succeeded yet",
        ],
        [
          "Nightly Data Sync",
          "Scheduled daily run (02:00)",
          "Success",
          "145 ms",
          "Finished daily batch cleanly",
        ],
        [
          "Generate Executive Report",
          "Retriggered after parent succeeded",
          "Success",
          "222 ms",
          "Prerequisite met; report completed",
        ],
        [
          "External Sync Check",
          "Runs 1–3 (simulated failure)",
          "Failed (x3)",
          "143–172 ms",
          "Exited with error; crossed 3-fail threshold",
        ],
      ],
      tones: {
        Success: "good",
        Skipped: "warn",
        "Failed (x3)": "bad",
      },
    },
    {
      type: "messages",
      title: "Automatic team alert dispatched on repeated failure",
      caption:
        "Sent automatically once External Sync Check failed three consecutive times.",
      items: [
        {
          channel: "Slack",
          side: "out",
          to: "#alerts (Critical)",
          body: "CRITICAL: Task 'External Sync Check' failed 3 consecutive times.\nError: Simulated error: task execution failed intentionally.\nSystem: scheduler-engine",
        },
      ],
    },
  ],
};
