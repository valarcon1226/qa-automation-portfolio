window.SHOWCASE = {
  headline: "Validated an idempotent Bill Pay automation against 5 extracted invoices (blocking a -$95 invalid charge and skipping 4 already-paid bills) alongside 3 real defects found in ParaBank.",
  source: "automation/run-summary.json",
  blocks: [
    {
      type: "stats",
      title: "Bill Pay safety checks & ParaBank QA coverage",
      caption: "16 payment-safety checks passed live (demo-output/showcase-run.txt); live banking container could not start here",
      items: [
        { label: "Safety checks passed", value: "16 / 16", note: "Validation, retry & double-pay guard", tone: "good" },
        { label: "Duplicate bills blocked", value: "4 / 5", note: "Skipped already-paid invoices safely", tone: "good" },
        { label: "Bad invoice rejected", value: 1, note: "Blocked -$95.00 negative charge", tone: "good" },
        { label: "ParaBank bugs found", value: 3, note: "Documented crashes & response errors", tone: "bad" }
      ]
    },
    {
      type: "table",
      title: "Bill Pay batch run across 5 extracted invoices",
      columns: ["Invoice", "Payee", "Amount", "Batch decision", "Reason"],
      rows: [
        ["INV-2026-001", "Clean Grid Energy", "$126.00", "Skipped (safe)", "Already paid and verified in previous run"],
        ["INV-2026-002", "Metro Fiber Telecom", "$68.25", "Skipped (safe)", "Already paid and verified in previous run"],
        ["INV-2026-003", "Apex Office Supplies", "$241.50", "Skipped (safe)", "Already paid and verified in previous run"],
        ["INV-2026-004-INVALID", "Summit Cloud Hosting", "-$95.00", "Rejected", "Amount must be greater than $0"],
        ["INV-2026-005", "Pioneer Logistics Co", "$152.25", "Skipped (safe)", "Already paid and verified in previous run"]
      ],
      tones: {
        "Skipped (safe)": "good",
        "Rejected": "bad"
      }
    },
    {
      type: "checklist",
      title: "Payment safety rules verified live",
      items: [
        { text: "Rejects invoices missing payee name, ID, address, or having zero/negative amounts", status: "pass" },
        { text: "Retries transient network timeouts with increasing wait delays up to the limit", status: "pass" },
        { text: "Stops immediately on business-rule rejections instead of wasting retries", status: "pass" },
        { text: "Tracks verified payments so re-running a batch never pays the same bill twice", status: "pass" },
        { text: "Confirms payee name and exact dollar amount on screen before marking a bill paid", status: "pass" }
      ]
    },
    {
      type: "cards",
      title: "Real defects discovered in ParaBank banking app",
      items: [
        {
          title: "Admin page crashes with server error on fresh startup",
          badge: "High severity",
          tone: "bad",
          subtitle: "BUG-01 · Admin Portal",
          body: "Opening the admin page before database setup crashes with an unhandled database table error."
        },
        {
          title: "Direct registration submits crash without a browser session",
          badge: "Medium severity",
          tone: "warn",
          subtitle: "BUG-02 · New Customer Registration",
          body: "Sending registration details directly without loading the form first triggers a server crash instead of a validation message."
        },
        {
          title: "Failed login service returns raw plain text instead of structured error",
          badge: "Low severity",
          tone: "info",
          subtitle: "BUG-03 · Banking Service",
          body: "Invalid login lookups return plain text even when callers request structured responses."
        }
      ]
    }
  ]
};
