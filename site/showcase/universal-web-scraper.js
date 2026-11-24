window.SHOWCASE = {
  headline:
    "Drove Microsoft Edge to map a live site's headings, downloaded all 10 topic pages as clean Markdown, and consolidated them with a local AI model into a structured summary report.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "Live extraction & saved course archive stats",
      caption:
        "Verified live Edge scraping + local AI synthesis on quotes.toscrape.com alongside historical Coursera & career guide runs.",
      items: [
        {
          label: "Live pages scraped",
          value: 10,
          note: "All 10 tag pages saved as clean Markdown",
          tone: "good",
        },
        {
          label: "AI report compiled",
          value: "1,957",
          note: "Characters synthesized locally by Llama 3.2",
          tone: "good",
        },
        {
          label: "Courses archived",
          value: 20,
          note: "999 lessons & readings saved across 20 Coursera courses",
          tone: "info",
        },
        {
          label: "Career guides saved",
          value: 8,
          note: "Harvard resume & cover letter templates converted",
          tone: "info",
        },
      ],
    },
    {
      type: "flow",
      title: "How the autonomous scraper executes a request",
      steps: [
        {
          label: "1. Inspect page structure",
          detail: "Opens the page in Microsoft Edge and reads H1/H2/H3 sections (found 'Quotes to Scrape' and 'Top Ten tags').",
        },
        {
          label: "2. Deep-scrape selected sections",
          detail: "Follows all 10 tag links in the target section and converts each page into clean Markdown.",
        },
        {
          label: "3. Local AI consolidation",
          detail: "Deduplicates and summarizes top topics, authors, and patterns into Final_Report.md.",
        },
      ],
    },
    {
      type: "table",
      title: "Sample courses & sites extracted",
      columns: ["Source", "Topic / Category", "Items saved", "Outcome"],
      rows: [
        ["quotes.toscrape.com (live)", "Top Ten tags + AI report", "10 pages + summary", "Completed"],
        ["Automation & Modern Testing Tools", "QA Automation", "161 items", "Completed"],
        ["DevOps Foundations Hands-On", "DevOps", "71 items", "Completed"],
        ["Source Control & CI/CD Hands-On", "DevOps", "71 items", "Completed"],
        ["Generative AI & Large Language Models", "AI / LLMs", "56 items", "Completed"],
        ["RAG & Agentic AI Capstone", "Agentic AI", "54 items", "Completed"],
        ["Harvard Career Services", "Resume & CV Guides", "8 guides", "Completed"],
      ],
      tones: {
        Completed: "good",
      },
    },
  ],
};
