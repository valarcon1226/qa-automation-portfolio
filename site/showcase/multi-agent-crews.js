window.SHOWCASE = {
  headline: "Built the exact same 4-agent market research team in CrewAI and AutoGen: both turn a topic and 10 internal documents into a verified report with tracked sources.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "flow",
      title: "Four-step research team workflow",
      caption: "Both frameworks share the same prompts, safe calculator, and document search tool",
      steps: [
        { label: "1. Researcher", detail: "Searches the 10-document internal library and logs every file actually read" },
        { label: "2. Analyst", detail: "Checks growth rates and percentages using a safe math calculator" },
        { label: "3. Writer", detail: "Drafts key findings and strategic recommendations in a structured report" },
        { label: "4. Reviewer", detail: "Verifies completeness before saving the final report" }
      ]
    },
    {
      type: "cards",
      title: "Generated market research report (topic: AI agent demand in LATAM)",
      caption: "Produced live through the report service using tracked corpus sources",
      items: [
        {
          title: "Key Findings",
          badge: "Verified sources",
          tone: "good",
          subtitle: "Sources locked by search tool: doc_01.md, doc_07.md, doc_08.md",
          body: "Job postings mentioning CrewAI or AutoGen tripled from 1,200 to 3,600 in one year (+200%) [doc_03.md]. 62% of surveyed LATAM SMBs want to automate customer support on WhatsApp [doc_01.md]."
        },
        {
          title: "Strategic Recommendations",
          badge: "Action plan",
          tone: "info",
          subtitle: "6 AI model turns per report in both engines",
          body: "Prioritize a WhatsApp customer-service agent offering, and bundle managed hosting because implementation complexity is the top barrier for small businesses."
        }
      ]
    },
    {
      type: "table",
      title: "CrewAI vs. AutoGen measured comparison (3 benchmark runs each)",
      columns: ["Framework", "Avg speed", "Single service run", "Model calls", "Complete reports", "Team code size"],
      rows: [
        ["CrewAI 1.x", "1.7 s", "4.20 s", "6.0", "3 / 3", "62 lines"],
        ["AutoGen 0.7", "0.1 s", "0.13 s", "6.0", "3 / 3", "62 lines"]
      ],
      tones: {
        "3 / 3": "good",
        "0.1 s": "good",
        "1.7 s": "info"
      }
    }
  ]
};
