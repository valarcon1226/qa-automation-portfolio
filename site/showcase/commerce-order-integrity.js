window.SHOWCASE = {
  headline: "Stress-tested Saleor 3.20 e-commerce across 704 checkouts, 50-buyer stock races, failing webhooks, and a 3.19 -> 3.20 upgrade: caught 18 oversold units that drove stock negative.",
  source: "results/metrics.json",
  blocks: [
    {
      type: "stats",
      title: "Storefront speed, resilience & upgrade integrity",
      caption: "Measured against live containerized Saleor 3.20, PostgreSQL, and Redis",
      items: [
        { label: "Checkout speed (p95)", value: "150 ms", note: "704 checkouts, 0 errors", tone: "good" },
        { label: "Catalog browse (p95)", value: "38 ms", note: "2,114 queries, 0 errors", tone: "good" },
        { label: "Webhook delivery", value: "100%", note: "50/50 delivered under 30% errors", tone: "good" },
        { label: "Oversold units caught", value: 18, note: "Stock dropped to -3 in 10/20 races", tone: "bad" }
      ]
    },
    {
      type: "checklist",
      title: "Business scenarios verified on Saleor 3.20",
      items: [
        { text: "Browsing 2,000 orders page by page returns every order once with zero duplicates", status: "pass" },
        { text: "Retrying a checkout 50 times after a dropped connection creates only 1 order", status: "pass" },
        { text: "Failing order notifications (30% errors) retry automatically until 100% arrive", status: "pass", detail: "14 failed tries retried every ~10.0 s" },
        { text: "Upgrading from Saleor 3.19 to 3.20 preserves all orders, totals, stock & payments", status: "pass", detail: "12.54 s migration, 0 data differences" },
        { text: "Staff can sign in, find orders, fulfill shipments & issue refunds on Edge, Firefox & WebKit", status: "pass", detail: "15 / 15 passed on all 3 browsers" },
        { text: "50 simultaneous buyers racing for 5 last-in-stock items never oversell inventory", status: "fail", detail: "Oversold 18 units across 10 of 20 runs" }
      ]
    },
    {
      type: "cards",
      title: "Real defects confirmed in Saleor 3.20",
      items: [
        {
          title: "Flash-sale race condition oversells stock down to -3",
          badge: "High severity",
          tone: "bad",
          subtitle: "FINDING-001 · Checkout Stock Allocation",
          body: "When 50 buyers checked out simultaneously for 5 remaining items, up to 8 orders completed in a single run (18 extra units sold across 20 runs)."
        },
        {
          title: "Duplicate product link inside a bulk upload crashes the whole batch",
          badge: "Medium severity",
          tone: "warn",
          subtitle: "FINDING-002 · Bulk Product Import",
          body: "Uploading two products with the same slug in one file triggers an unhandled database error instead of rejecting only the conflicting row."
        }
      ]
    }
  ]
};
