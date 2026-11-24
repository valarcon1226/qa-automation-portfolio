window.SHOWCASE = {
  headline: "Ingested a 500-document burst into Paperless-ngx with 100% file accounting and 186 ms search speed, while catching 7 accessibility violations and 8 tasks stuck after an abrupt queue crash.",
  source: "results/metrics.json",
  blocks: [
    {
      type: "stats",
      title: "Burst intake, search speed & classifier benchmark",
      caption: "Tested on Paperless-ngx 2.14.7 with a reproducible 600-document PDF corpus",
      items: [
        { label: "500-doc accounting", value: "100%", note: "500 of 500 uploads tracked (50.8/min)", tone: "good" },
        { label: "Full-text search (p95)", value: "185.7 ms", note: "Target <= 5,000 ms across 600 docs", tone: "good" },
        { label: "Auto-tagger accuracy", value: "1.00", note: "Perfect score on 5 synthetic types", tone: "good" },
        { label: "Accessibility issues", value: 7, note: "Critical/serious issues on /documents", tone: "bad" }
      ]
    },
    {
      type: "checklist",
      title: "Business & resilience scenarios verified",
      items: [
        { text: "500 concurrent document uploads drain cleanly within memory limits (1,252 MB peak)", status: "pass" },
        { text: "Corrupt PDFs fail cleanly without leaving orphan records or breaking valid files", status: "pass" },
        { text: "Listing 300 documents with identical timestamps never skips or duplicates a file", status: "pass" },
        { text: "Upgrading from Paperless-ngx 2.14.6 to 2.14.7 preserves all 600 docs, tags & notes", status: "pass" },
        { text: "Uploading, searching, and tagging a document works end-to-end in Microsoft Edge", status: "pass" },
        { text: "Sudden queue broker restart recovers all in-flight tasks immediately", status: "fail", detail: "8 prefetched tasks stay PENDING for 1 hour" },
        { text: "Document list page passes automated screen-reader & keyboard checks", status: "fail", detail: "7 critical/serious accessibility errors" }
      ]
    },
    {
      type: "cards",
      title: "Findings documented in Paperless-ngx 2.14.7",
      items: [
        {
          title: "7 critical/serious accessibility violations on document list",
          badge: "High severity",
          tone: "bad",
          subtitle: "FINDING-001 · Web Interface",
          body: "Toolbar icon buttons, filter controls, pagination links, and dropdown lists lack accessible labels or valid ARIA structure."
        },
        {
          title: "8 documents stall in PENDING after an abrupt queue restart",
          badge: "Medium severity",
          tone: "warn",
          subtitle: "FINDING-003 · Task Queue Recovery",
          body: "Prefetched worker jobs remain unacknowledged in the queue until the 1-hour timeout expires before redelivery."
        },
        {
          title: "Password-protected PDFs save without text scanning",
          badge: "By design",
          tone: "info",
          subtitle: "FINDING-002 · Encrypted Uploads",
          body: "Encrypted files succeed and store the original attachment while skipping OCR so administrators can decrypt them later."
        }
      ]
    }
  ]
};
