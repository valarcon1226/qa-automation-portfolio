window.SHOWCASE = {
  headline: "Replicated 1,000,000 rows from PostgreSQL to an analytics warehouse under 1-second live lag and zero data differences, and exposed a constraint bug that halts sync instead of quarantining bad rows.",
  source: "results/metrics.json",
  blocks: [
    {
      type: "stats",
      title: "Live replication speed, 1M-row snapshot & upgrade",
      caption: "Measured across PostgreSQL 16, Debezium 2.7.3, and Redpanda",
      items: [
        { label: "1M-row initial sync", value: "285.3 s", note: "0 missing, 0 duplicate rows", tone: "good" },
        { label: "1M-row cross-check", value: "3.48 s", note: "0 differences between source & target", tone: "good" },
        { label: "Slow-sink catch-up", value: "62.3 s", note: "Cleared 22,535-row backlog cleanly", tone: "good" },
        { label: "Live upgrade downtime", value: "13.5 s", note: "2.6.2 -> 2.7.3 across 1,004,517 rows", tone: "good" }
      ]
    },
    {
      type: "bars",
      title: "End-to-end sync delay (95th percentile) under increasing write traffic",
      unit: "s",
      items: [
        { label: "100 writes / sec (11,153 samples)", value: 0.89, tone: "good" },
        { label: "500 writes / sec (18,200 samples)", value: 0.95, tone: "good" },
        { label: "1,000 writes / sec (18,200 samples)", value: 0.88, tone: "good" }
      ]
    },
    {
      type: "checklist",
      title: "Fault tolerance & live schema change checks",
      items: [
        { text: "Killing the sync worker mid-stream recovers with zero lost or duplicated records", status: "pass" },
        { text: "Malformed poison messages route safely to the quarantine queue (dlq_ledger)", status: "pass" },
        { text: "Adding columns and renaming columns via expand/contract runs live with zero data diffs", status: "pass" },
        { text: "Upgrading Debezium 2.6.2 -> 2.7.3 resumes from saved offset without re-copying 1M rows", status: "pass" },
        { text: "Rows violating a stricter warehouse validation rule route to quarantine instead of crashing", status: "fail", detail: "Known connector limitation (FINDING-001)" }
      ]
    },
    {
      type: "cards",
      title: "Operational risks & findings uncovered",
      items: [
        {
          title: "Warehouse constraint errors stop replication cold",
          badge: "High severity",
          tone: "bad",
          subtitle: "FINDING-001 · Dead-Letter Routing",
          body: "When a row breaks a warehouse validation rule, the database connector halts completely instead of sending that single row to the quarantine queue."
        },
        {
          title: "Widening integer columns requires updating the warehouse first",
          badge: "Medium risk",
          tone: "warn",
          subtitle: "FINDING-002 · Online Schema Changes",
          body: "Automatic evolution only adds new columns; widening INT to BIGINT on source first crashes writes once values exceed 2.1 billion."
        }
      ]
    }
  ]
};
