window.SHOWCASE = {
  headline:
    "Scraped 27 restaurants and accounting firms in Bogotá, merged 3 duplicate listings, scored 24 unique leads by contact completeness, and exported a formatted Excel workbook.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "Lead extraction & cleanup summary",
      caption:
        "Collected listings from the local business directory, normalized phone numbers, merged duplicates, and exported showcase-leads.xlsx.",
      items: [
        {
          label: "Raw listings found",
          value: 27,
          note: "Restaurants & accounting firms in Bogotá",
          tone: "info",
        },
        {
          label: "Duplicates merged",
          value: 3,
          note: "100% fuzzy match on SAS / S.A.S. variants",
          tone: "warn",
        },
        {
          label: "Clean unique leads",
          value: 24,
          note: "Exported to 3-tab Excel file",
          tone: "good",
        },
        {
          label: "Top-scored prospects",
          value: 10,
          note: "Scored 70/100 with phone, email & site",
          tone: "good",
        },
      ],
    },
    {
      type: "before_after",
      title: "Raw duplicate directory cards vs. clean sales lead",
      caption:
        "Combined near-identical company names and normalized phone numbers into one standard format.",
      before: {
        "Duplicate listing 1": "Restaurante El Buen Sabor",
        "Duplicate listing 2": "Restaurante El Buen Sabor SAS (100% match)",
        "Duplicate listing 3": "Contadores Ruiz S.A.S. vs Contadores Ruiz SAS",
        "Raw phone formats": "Mixed local spacing and extensions",
      },
      after: {
        "Deduplicated records": "Merged 3 duplicate listings cleanly",
        "Standardized phones": "Formatted consistently (+57 country code)",
        "Website email lookup": "Visited business contact pages for emails",
        "Excel deliverable": "Sorted highest-score prospects first",
      },
    },
    {
      type: "table",
      title: "Top 12 ranked leads from the run",
      columns: ["Business Name", "Category", "City", "Contact Channels Found", "Lead Score"],
      rows: [
        ["Restaurante El Buen Sabor", "Restaurants", "Bogotá", "Phone, Website & Email", "70 / 100"],
        ["Restaurante Doña Rosa", "Restaurants", "Bogotá", "Phone, Website & Email", "70 / 100"],
        ["Pastelería y Cafetería Dulce Hogar", "Restaurants", "Bogotá", "Phone, Website & Email", "70 / 100"],
        ["Restaurante Sabor Costeño", "Restaurants", "Bogotá", "Phone, Website & Email", "70 / 100"],
        ["Restaurante Parrilla Los Amigos", "Restaurants", "Bogotá", "Phone, Website & Email", "70 / 100"],
        ["Contadores Ruiz SAS", "Accounting", "Bogotá", "Phone, Website & Email", "70 / 100"],
        ["Asesorías Contables del Norte", "Accounting", "Bogotá", "Phone, Website & Email", "70 / 100"],
        ["Firma Contable Andina", "Accounting", "Bogotá", "Phone, Website & Email", "70 / 100"],
        ["Servicios Tributarios Bogotá", "Accounting", "Bogotá", "Phone, Website & Email", "70 / 100"],
        ["Asesoría Fiscal y Contable Sur", "Accounting", "Bogotá", "Phone, Website & Email", "70 / 100"],
        ["Restaurante La Fonda Antioqueña", "Restaurants", "Bogotá", "Phone & Website (no email)", "40 / 100"],
        ["Auditores y Contadores Prieto", "Accounting", "Bogotá", "Phone & Website (no email)", "40 / 100"],
      ],
      tones: {
        "70 / 100": "good",
        "40 / 100": "warn",
      },
    },
  ],
};
