window.SHOWCASE = {
  headline:
    "Tracked 3 retail products politely across store pages and MercadoLibre, caught a $20 drop on Studio Monitor Headphones ($85 to $65), and sent an instant target-price alert.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "Price tracking & alert run",
      caption:
        "Checked robots.txt and rate limits before reading structured product listings and simulating a price drop.",
      items: [
        {
          label: "Products monitored",
          value: 3,
          note: "2 store items + 1 MercadoLibre sample",
          tone: "info",
        },
        {
          label: "Price drop caught",
          value: "-23.5%",
          note: "Headphones fell from $85.00 to $65.00",
          tone: "good",
        },
        {
          label: "Alerts dispatched",
          value: 1,
          note: "Target price $70.00 reached & sent",
          tone: "good",
        },
      ],
    },
    {
      type: "table",
      title: "Tracked catalog & latest price status",
      columns: ["Product", "Source", "Observed Price", "Target Price", "Stock & Shipping", "Status"],
      rows: [
        [
          "Mechanical Keyboard RGB",
          "Demo Store",
          "$120.00 USD",
          "$100.00 USD",
          "In stock",
          "Monitoring",
        ],
        [
          "Studio Monitor Headphones",
          "Demo Store",
          "$85.00 → $65.00 USD",
          "$70.00 USD",
          "In stock",
          "Alert sent",
        ],
        [
          "Sony WH-1000XM5 Headphones",
          "MercadoLibre",
          "389,999 ARS",
          "—",
          "In stock · Free shipping",
          "Parsed",
        ],
      ],
      tones: {
        "Alert sent": "good",
        Monitoring: "info",
        Parsed: "info",
      },
    },
    {
      type: "messages",
      title: "Outbound price-drop notification sent",
      caption:
        "Delivered immediately when Studio Monitor Headphones dropped below the $70.00 target.",
      items: [
        {
          channel: "Alert Webhook",
          side: "out",
          to: "Price Alert Subscriber",
          subject: "Target Price Met: Studio Monitor Headphones",
          body: "Price dropped from $85.00 to $65.00 USD (at or below your $70.00 target price). Status: Delivered.",
        },
      ],
    },
  ],
};
