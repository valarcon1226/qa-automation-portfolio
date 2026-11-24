window.SHOWCASE = {
  headline:
    "Migrating the same 8 shopping journeys from Selenium to Playwright cut test run time by 3.39x (50.4 s down to 14.8 s) and trimmed test code by 11.9%.",
  source: "results/benchmark.md",
  blocks: [
    {
      type: "stats",
      title: "Measured benchmark summary (3 runs per tool)",
      caption:
        "Both frameworks ran the identical 8 customer journeys in headless Microsoft Edge against a containerized online store.",
      items: [
        {
          label: "Overall speedup",
          value: "3.39x",
          note: "Playwright finished 35.5 s faster per run",
          tone: "good",
        },
        {
          label: "Playwright suite time",
          value: "14.85 s",
          note: "Compared to 50.39 s with Selenium",
          tone: "good",
        },
        {
          label: "Test code size",
          value: "-11.9%",
          note: "304 vs 345 code lines across 11 files",
          tone: "info",
        },
        {
          label: "Pass rate (both tools)",
          value: "24 / 24",
          note: "0 intermittent failures across 3 runs",
          tone: "good",
        },
      ],
    },
    {
      type: "bars",
      title: "Suite and top journey durations (median seconds, lower is faster)",
      unit: "s",
      items: [
        { label: "Full 8-journey suite — Legacy Selenium", value: 50.39, tone: "warn" },
        { label: "Full 8-journey suite — Migrated Playwright", value: 14.85, tone: "good" },
        { label: "New customer registration — Selenium", value: 10.65, tone: "warn" },
        { label: "New customer registration — Playwright", value: 6.47, tone: "good" },
        { label: "Product search — Selenium", value: 6.33, tone: "warn" },
        { label: "Product search — Playwright", value: 1.17, tone: "good" },
        { label: "Remove item from cart — Selenium", value: 6.24, tone: "warn" },
        { label: "Remove item from cart — Playwright", value: 1.19, tone: "good" },
      ],
    },
    {
      type: "table",
      title: "All 8 customer journeys compared side by side",
      columns: ["Customer Journey", "Legacy Selenium", "Migrated Playwright", "Speedup", "3-Run Result"],
      rows: [
        ["Invalid sign-in error check", "4.99 s", "0.78 s", "6.38x", "Passed 3/3"],
        ["Empty search state check", "5.31 s", "0.90 s", "5.93x", "Passed 3/3"],
        ["Add product to shopping cart", "5.89 s", "1.03 s", "5.71x", "Passed 3/3"],
        ["Search matching products", "6.33 s", "1.17 s", "5.41x", "Passed 3/3"],
        ["Remove product from cart", "6.24 s", "1.19 s", "5.24x", "Passed 3/3"],
        ["Switch storefront language", "5.28 s", "1.24 s", "4.27x", "Passed 3/3"],
        ["Valid customer sign-in", "5.93 s", "1.85 s", "3.20x", "Passed 3/3"],
        ["New account registration", "10.65 s", "6.47 s", "1.64x", "Passed 3/3"],
      ],
      tones: {
        "Passed 3/3": "good",
      },
    },
  ],
};
