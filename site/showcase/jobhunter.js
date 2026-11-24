window.SHOWCASE = {
  headline:
    "Scored sample job openings for a fictional QA/AI candidate, classified 25 inbox emails with zero missed interviews, resolved 5 job board links, and auto-filled application fields.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "Fictional-profile pipeline run summary",
      caption:
        "Executed using an isolated synthetic profile ('Ana Perez Rios') and anonymized sample emails and application forms.",
      items: [
        {
          label: "High-match jobs ready",
          value: "2 / 4",
          note: "Scored 100% & 85%; 2 ineligible roles filtered at 5%",
          tone: "good",
        },
        {
          label: "Emails triaged",
          value: 25,
          note: "8 categories detected, 0 interviews missed",
          tone: "good",
        },
        {
          label: "Job boards resolved",
          value: "5 / 5",
          note: "Greenhouse, Lever, Workable, Ashby + Easy Apply",
          tone: "info",
        },
        {
          label: "Deterministic checks",
          value: "6 / 6",
          note: "Location, freelance, URL, email, form & trend rules",
          tone: "good",
        },
      ],
    },
    {
      type: "table",
      title: "Sample job compatibility scoring (synthetic profile)",
      columns: ["Role", "Location", "Match score", "Missing skills", "Next step"],
      rows: [
        ["Senior QA Automation Engineer", "Remote LATAM", "100%", "None", "Tailor CV"],
        ["AI Integration Engineer", "Latin America", "85%", "Kubernetes, AWS", "Tailor CV"],
        ["Staff Backend Architect (US Citizen)", "Austin, TX (US only)", "5%", "Out-of-scope role & US permit", "Filtered out"],
        ["Growth Marketing Operations Manager", "Remote", "5%", "Non-technical role family", "Filtered out"],
      ],
      tones: {
        "Tailor CV": "good",
        "Filtered out": "bad",
      },
    },
    {
      type: "table",
      title: "Sample inbox classification & form auto-fill behavior",
      columns: ["Channel", "Input item", "Automated output", "Safety rule"],
      rows: [
        ["Email triage", "Jobright & Welcome to the Jungle alerts (4)", "Sorted as job alert", "Separated from direct replies"],
        ["Email triage", "Calendly / Zoom / Spanish interview invites (3)", "Flagged as interview", "100% recall required"],
        ["Email triage", "CodeSignal / HackerRank / Take-home (3)", "Flagged as technical test", "Prioritized for follow-up"],
        ["Form filler", "Name, Email, Country, City, Phone, CV, LinkedIn", "Auto-filled from profile bank", "Never invents unknown answers"],
        ["Form filler", "Custom open-ended company essay questions", "Marked 'Needs human'", "Pauses for candidate review"],
      ],
      tones: {
        "Flagged as interview": "good",
        "Flagged as technical test": "info",
        "Auto-filled from profile bank": "good",
        "Marked 'Needs human'": "warn",
      },
    },
  ],
};
