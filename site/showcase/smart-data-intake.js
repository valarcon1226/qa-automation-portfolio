window.SHOWCASE = {
  headline: "Sorted 22 rows from two messy insurance Excel workbooks and a CSV into 7 clean CRM records, 4 flagged for human review, 3 invalid rows, and 8 discarded blank or total rows.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "Intake summary across 3 uploaded files",
      caption: "Processed claims workbook, insured assets workbook, and customer CSV",
      items: [
        { label: "Ready for CRM", value: 7, note: "Auto-approved clean rows", tone: "good" },
        { label: "Needs review", value: 4, note: "Sent to human review queue", tone: "warn" },
        { label: "Rejected rows", value: 3, note: "Missing name or bad email", tone: "bad" },
        { label: "Noise discarded", value: 8, note: "4 blank rows + 4 total rows", tone: "info" }
      ]
    },
    {
      type: "before_after",
      title: "Messy spreadsheet row turned into a structured review item",
      caption: "From listado_siniestros_desordenado.xlsx (skipped cover tab, flattened 2-row merged headers)",
      before: {
        "Workbook tabs": "Portada y Control, Siniestros Autos y Hogar, Resumen Auditoría",
        "Header layout": "2-row merged headers + 2 title rows",
        "Person": "Ana | Smith",
        "Email & phone": "ana.smith@smith | 555-0199",
        "Company": "",
        "Date & amount": "15/03/2026 | USD 2.300,50"
      },
      after: {
        "Selected sheet": "Siniestros Autos y Hogar",
        "Customer": "Ana Smith",
        "Email & phone": "ana.smith@smith | 555-0199",
        "Company": "",
        "Claim & date": "SIN-002 | 15/03/2026 | USD 2.300,50",
        "Decision": "Flagged for review (Missing company; suspicious email domain)"
      }
    },
    {
      type: "table",
      title: "Row-by-row sorting results (sample from all 3 files)",
      columns: ["Source file", "Record / Row", "Detected issue", "Outcome"],
      rows: [
        ["Claims Excel", "Carlos Mendez (Acme Corp)", "None", "Ready for CRM"],
        ["Claims Excel", "Ana Smith (SIN-002)", "Missing company; email domain needs check", "Needs review"],
        ["Claims Excel", "Row 8 (SIN-003)", "Missing name, invalid email & phone", "Rejected"],
        ["Claims Excel", "SUBTOTAL RAMO AUTOMOTOR", "Summary subtotal row", "Discarded"],
        ["Claims Excel", "TOTAL GENERAL SINIESTROS", "Grand total footer row", "Discarded"],
        ["Assets Excel", "Diego Morales (Andes Mining)", "None", "Ready for CRM"],
        ["Assets Excel", "Sofia Castro", "Missing company; email domain needs check", "Needs review"],
        ["Assets Excel", "Row 8 (Transformer 25MVA)", "Missing name, invalid email & phone", "Rejected"],
        ["Assets Excel", "TOTAL GENERAL BIENES", "Grand total footer row", "Discarded"],
        ["Customers CSV", "John Doe (Acme Corp)", "None", "Ready for CRM"],
        ["Customers CSV", "Jane Smith", "Missing company; email domain needs check", "Needs review"],
        ["Customers CSV", "Row 4 (empty)", "Missing name, invalid email", "Rejected"]
      ],
      tones: {
        "Ready for CRM": "good",
        "Needs review": "warn",
        "Rejected": "bad",
        "Discarded": "info"
      }
    }
  ]
};
