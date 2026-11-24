window.SHOWCASE = {
  headline:
    "Turned 87 YouTube videos across 10 topics into fact-checked Markdown reference guides and a 161-tool directory, auditing claims in 6–13 seconds per video.",
  source: "batch_log.txt",
  blocks: [
    {
      type: "stats",
      title: "Knowledge library & batch run highlights",
      caption:
        "Measured across the generated Markdown archive and the 29-video batch processing log.",
      items: [
        {
          label: "Video guides generated",
          value: 87,
          note: "Filed across 10 topic folders + root archive",
          tone: "good",
        },
        {
          label: "Tools cataloged",
          value: 161,
          note: "Consolidated with source videos & purpose",
          tone: "info",
        },
        {
          label: "Processing speed",
          value: "6–13 s",
          note: "Per cached video in 3-call fact & audit pipeline",
          tone: "good",
        },
        {
          label: "Hallucination defense",
          value: "12 / 12",
          note: "10 passed clean; 2 had ungrounded claims scrubbed",
          tone: "good",
        },
      ],
    },
    {
      type: "table",
      title: "Sample videos processed in the batch log",
      columns: ["Video title", "Channel", "Length", "Facts extracted", "Time", "Audit result"],
      rows: [
        ["Obsidian + Agentic AI (Hermes Workflow)", "Wanderloots", "22:50", "8 facts", "7 s", "0 hallucinations"],
        ["What Is An Agentic Librarian (HITL)", "Wanderloots", "42:48", "12 facts", "7 s", "Fixed & verified"],
        ["Restricting Agentic AI (Docker + Hermes)", "Wanderloots", "16:18", "6 facts", "7 s", "0 hallucinations"],
        ["The Economics Of Owning a Business", "Bgo", "15:38", "22 facts", "13 s", "0 hallucinations"],
        ["Top 10 Repos: Archify, Omarchi, OpenMAIC", "The Next New Thing", "27:14", "18 facts", "9 s", "0 hallucinations"],
        ["Top 10 GitHub AI Videos & Diagrams", "The Next New Thing", "27:22", "16 facts", "9 s", "0 hallucinations"],
        ["OpenWork: One MCP Hub for Every Agent", "Full Stack", "11:50", "10 facts", "11 s", "0 hallucinations"],
        ["The 10 BEST Android Apps", "Matt Robb", "9:18", "12 facts", "6 s", "Fixed & verified"],
      ],
      tones: {
        "0 hallucinations": "good",
        "Fixed & verified": "warn",
      },
    },
    {
      type: "bars",
      title: "Generated knowledge reports by topic folder",
      unit: "reports",
      items: [
        { label: "AI Agents & Automation", value: 18, tone: "good" },
        { label: "GitHub Tools", value: 12, tone: "info" },
        { label: "Learning & Productivity", value: 7, tone: "info" },
        { label: "AI Side Hustles", value: 6, tone: "info" },
        { label: "Instagram Reels & Short Tips", value: 6, tone: "info" },
        { label: "Apps, Software & Lifestyle", value: 8, tone: "info" },
      ],
    },
  ],
};
