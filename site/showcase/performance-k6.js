window.SHOWCASE = {
  headline:
    "Order service cleared the speed gate at 62% faster than baseline, absorbed 94.8 requests/sec during a 60-shopper spike with zero errors, and blocked 100% of forged store alerts.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "Performance & security gate results",
      caption:
        "Live gate comparison against CI baseline plus saved smoke, normal load, 60-shopper burst, and forged-alert runs.",
      items: [
        {
          label: "Regression gate verdict",
          value: "PASSED",
          note: "62.25% faster than baseline; 0% errors",
          tone: "good",
        },
        {
          label: "60-shopper spike speed",
          value: "69.9 ms",
          note: "94.8 req/s across 2,886 requests",
          tone: "good",
        },
        {
          label: "Forged alerts blocked",
          value: "600 / 600",
          note: "Rejected in 4.5 ms with zero DB writes",
          tone: "good",
        },
        {
          label: "Failed requests",
          value: "0.00%",
          note: "Zero drops across all 3 load runs",
          tone: "good",
        },
      ],
    },
    {
      type: "bars",
      title: "95% response speed across traffic levels vs. baseline limit (lower is faster)",
      unit: "ms",
      items: [
        { label: "Forged signature rejection (5 attackers)", value: 4.5, tone: "good" },
        { label: "Steady single-user smoke test (1 shopper)", value: 15.5, tone: "good" },
        { label: "Sudden traffic spike (60 shoppers)", value: 69.9, tone: "good" },
        { label: "Shopify order intake (normal load)", value: 100.3, tone: "good" },
        { label: "WooCommerce order intake (normal load)", value: 103.8, tone: "good" },
        { label: "Staff orders dashboard (normal load)", value: 342.4, tone: "info" },
        { label: "CI baseline overall p95 reference", value: 366.1, tone: "warn" },
      ],
    },
    {
      type: "table",
      title: "Historical 20-shopper load trend across three runs",
      columns: ["Run", "Total Requests", "Error Rate", "Overall 95% Speed", "Order Intake 95%", "Gate Status"],
      rows: [
        ["Run 3 (latest)", "1,492", "0.00%", "181.62 ms", "115.77–124.73 ms", "PASS"],
        ["Run 2", "1,513", "0.00%", "177.36 ms", "116.90–125.55 ms", "PASS"],
        ["Run 1 (vs baseline)", "1,499", "0.00%", "138.19 ms", "100.33–103.81 ms", "PASS"],
      ],
      tones: {
        PASS: "good",
        "0.00%": "good",
      },
    },
    {
      type: "cards",
      title: "Real concurrency bug caught under stress",
      items: [
        {
          badge: "Fixed",
          title: "Simultaneous duplicate order deliveries caused server crashes",
          subtitle: "40 simultaneous duplicate requests for 10 orders",
          body: "Before the fix, 29 of 40 simultaneous retries crashed with duplicate database key errors. After fixing the order service, all 40 deliveries return clean success with only 10 orders stored and 10 confirmation emails sent.",
          tone: "good",
        },
      ],
    },
  ],
};
