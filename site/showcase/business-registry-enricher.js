window.SHOWCASE = {
  headline:
    "Checked 4 European tax IDs live against the EU VIES registry—returning verified legal names and addresses for Google Ireland and Amazon Europe, flagging 1 invalid ID, and serving repeat batch checks from cache.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "Live European registry verification",
      caption:
        "Queried the public EU VAT registry live, then re-checked all 4 companies together from the local cache.",
      items: [
        {
          label: "Companies checked",
          value: 4,
          note: "Ireland, Luxembourg, Germany & Spain",
          tone: "info",
        },
        {
          label: "Valid registrations",
          value: 3,
          note: "Verified directly with EU VIES",
          tone: "good",
        },
        {
          label: "Invalid ID caught",
          value: 1,
          note: "Rejected before onboarding",
          tone: "bad",
        },
        {
          label: "Repeat lookup cache hits",
          value: "4 / 4",
          note: "Second batch answered without extra calls",
          tone: "good",
        },
      ],
    },
    {
      type: "table",
      title: "Enriched company records returned",
      caption:
        "Note: Germany omits company names in public VAT lookups by national rule; UK and French registries need partner credentials.",
      columns: ["Country", "Tax / VAT ID", "Official Name", "Registered Address", "Status", "Repeat Call"],
      rows: [
        [
          "Ireland",
          "IE 6388047V",
          "GOOGLE IRELAND LIMITED",
          "3rd Floor, Gordon House, Barrow Street, Dublin 4",
          "Valid",
          "Served from cache",
        ],
        [
          "Luxembourg",
          "LU 26375245",
          "AMAZON EUROPE CORE S.A R.L.",
          "38, Avenue John F. Kennedy, L-1855 Luxembourg",
          "Valid",
          "Served from cache",
        ],
        [
          "Germany",
          "DE 811115368",
          "Withheld by country rule",
          "—",
          "Valid",
          "Served from cache",
        ],
        [
          "Spain",
          "ES B86907926",
          "—",
          "—",
          "Invalid",
          "Served from cache",
        ],
      ],
      tones: {
        Valid: "good",
        Invalid: "bad",
        "Served from cache": "info",
      },
    },
    {
      type: "flow",
      title: "How each company check runs",
      steps: [
        {
          label: "Accept single or batch IDs",
          detail: "Takes country code and registration number",
        },
        {
          label: "Check 30-day local cache",
          detail: "Skips duplicate external requests when fresh",
        },
        {
          label: "Route & throttle",
          detail: "Picks EU VIES, UK, or French registry within rate limits",
        },
        {
          label: "Standardize & log",
          detail: "Returns one uniform record format for spreadsheets or CRM",
        },
      ],
    },
  ],
};
