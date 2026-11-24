window.SHOWCASE = {
  headline:
    "Audited the scripted Sabor de Casa WordPress site: scored 100 on Best Practices, 95 on Accessibility, 92 on SEO, and passed all 10 browser and booking checks.",
  source: "lighthouse-report.json",
  blocks: [
    {
      type: "stats",
      title: "Saved Google Lighthouse audit scores",
      caption:
        "Measured on the home page of the containerized WordPress site.",
      items: [
        {
          label: "Best Practices",
          value: "100 / 100",
          note: "Zero browser or security errors",
          tone: "good",
        },
        {
          label: "Accessibility",
          value: "95 / 100",
          note: "High-contrast labels and landmarks",
          tone: "good",
        },
        {
          label: "SEO",
          value: "92 / 100",
          note: "Schema.org Restaurant markup & Open Graph",
          tone: "good",
        },
        {
          label: "Performance",
          value: "81 / 100",
          note: "LCP 3.8s, 0 ms blocking, 0.015 layout shift",
          tone: "info",
        },
      ],
    },
    {
      type: "bars",
      title: "Lighthouse category breakdown",
      unit: "/ 100",
      items: [
        { label: "Best Practices", value: 100, tone: "good" },
        { label: "Accessibility", value: 95, tone: "good" },
        { label: "SEO", value: 92, tone: "good" },
        { label: "Performance", value: 81, tone: "info" },
      ],
    },
    {
      type: "checklist",
      title: "Automated browser & booking verification (last recorded run)",
      items: [
        {
          text: "All 8 site pages load with visible content (Home, Menu, Bookings, Delivery, Events, Contact, Privacy)",
          status: "pass",
          detail: "Last saved browser test run status: passed (0 failed)",
        },
        {
          text: "Online table reservation form saves booking and sends confirmation email",
          status: "pass",
          detail: "Verified against test inbox and WordPress booking records",
        },
        {
          text: "Events & catering inquiry form delivers quote request email",
          status: "pass",
          detail: "Verified confirmation banner and delivered message",
        },
        {
          text: "Core layout stability and interactivity verified",
          status: "pass",
          detail: "Total Blocking Time 0 ms, Cumulative Layout Shift 0.015",
        },
      ],
    },
  ],
};
