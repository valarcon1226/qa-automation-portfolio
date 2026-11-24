window.SHOWCASE = {
  headline:
    "Audited a live local demo site (Overall 78, AI Readiness 90) and inspected the 8-page Sabor de Casa restaurant report (Lighthouse 89, 29 prioritized fixes, 25 strengths).",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "Live demo audit & saved restaurant benchmark",
      caption:
        "Executed the auditor on a local 2-page sample site and verified the full 8-page Sabor de Casa audit output.",
      items: [
        {
          label: "Live audit overall score",
          value: "78 / 100",
          note: "Technical SEO: 65 · AI Answers (AEO): 90",
          tone: "good",
        },
        {
          label: "Restaurant sample overall",
          value: "35 / 100",
          note: "8 pages crawled (SEO 0, AEO 40, Lighthouse 89)",
          tone: "warn",
        },
        {
          label: "Issues prioritized",
          value: 29,
          note: "3 high impact, 17 medium, 9 low (restaurant report)",
          tone: "bad",
        },
        {
          label: "Automated checks",
          value: "27 / 28",
          note: "All crawl, AEO, SEO & web checks passed; PDF export timed out",
          tone: "info",
        },
      ],
    },
    {
      type: "bars",
      title: "Live audit vs. unoptimized restaurant scores (/ 100)",
      unit: "/ 100",
      items: [
        { label: "Live demo — AI Readiness (AEO)", value: 90, tone: "good" },
        { label: "Live demo — Overall score", value: 78, tone: "good" },
        { label: "Live demo — Technical SEO", value: 65, tone: "info" },
        { label: "Sabor de Casa — Lighthouse", value: 89, tone: "good" },
        { label: "Sabor de Casa — AI Readiness (AEO)", value: 40, tone: "warn" },
        { label: "Sabor de Casa — Overall score", value: 35, tone: "bad" },
      ],
    },
    {
      type: "table",
      title: "Sample findings flagged for Sabor de Casa (8 pages)",
      columns: ["Area", "Finding", "Recommended action", "Impact"],
      rows: [
        ["Page structure", "2 main H1 headings found on home page", "Keep one main H1 and turn extras into H2/H3", "High"],
        ["Page titles", "Duplicate title across home URL variants", "Give every page a unique 30–60 char title", "High"],
        ["Search snippets", "Missing meta description on all 8 pages", "Add a 70–160 char summary with a call to action", "Medium"],
        ["AI answers (AEO)", "No customer question headings detected", "Frame key sections as direct customer questions", "Medium"],
        ["AI answers (AEO)", "Business hours missing in plain page text", "Add opening days and hours in contact text", "Medium"],
        ["AI discovery", "No llms.txt summary file at domain root", "Publish a concise Markdown business summary", "Low"],
      ],
      tones: {
        High: "bad",
        Medium: "warn",
        Low: "info",
      },
    },
  ],
};
