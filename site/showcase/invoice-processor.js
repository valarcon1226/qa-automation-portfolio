window.SHOWCASE = {
  headline: "Extracted structured fields with page-level proof quotes from PDF and Excel invoices and ACORD 25 certificates, hitting 100% accuracy on insurance certificates across 40 test documents.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "Live extraction & 40-document benchmark",
      caption: "20 invoices and 20 ACORD 25 insurance certificates tested across PDF and Excel",
      items: [
        { label: "ACORD 25 accuracy", value: "100%", note: "All 6 fields across 20 certificates", tone: "good" },
        { label: "Invoice header rules", value: "100%", note: "Issuer, tax ID, number & date", tone: "good" },
        { label: "Invoice totals (rules)", value: "90%", note: "18 of 20 matched exact totals", tone: "warn" },
        { label: "Local AI currency codes", value: "20%", note: "Missed ISO code COP without cleanup", tone: "bad" }
      ]
    },
    {
      type: "before_after",
      title: "Raw PDF text turned into verified accounting fields with proof quotes",
      caption: "Live run on evals/data/inv_01.pdf",
      before: {
        "Document": "evals/data/inv_01.pdf (1 page)",
        "Raw header": "ANDINA TECNOLOGICA S.A.S. | NIT/VAT: 900.123.456-8",
        "Raw line": "Factura No: FEV-101 | Fecha de Emisión: 2026-10-01",
        "Raw totals": "Subtotal: $ 2,000,000.00 | IVA: $ 380,000.00 | Total a Pagar: $ 2,380,000.00"
      },
      after: {
        "Issuer & Tax ID": "ANDINA TECNOLOGICA S.A.S. (900.123.456-8)",
        "Invoice & Date": "FEV-101 (2026-10-01)",
        "Amounts": "Subtotal 2,000,000 + Tax 380,000 = 2,380,000 COP",
        "Math & ID check": "Passed (valid Colombian check digit & totals)",
        "Proof quote (Page 1)": "\"Total a Pagar: $ 2,380,000.00\""
      }
    },
    {
      type: "table",
      title: "Sample documents processed live",
      columns: ["File", "Type", "Key extracted values", "Exact source proof", "Status"],
      rows: [
        ["inv_01.pdf", "Invoice", "ANDINA TECNOLOGICA · FEV-101 · $2,380,000 COP", "Page 1: \"Factura No: FEV-101\"", "Valid"],
        ["inv_05.xlsx", "Invoice", "SUMINISTROS INDUSTRIALES · FEV-105 · $952,000 COP", "Page 1: \"NIT: 900.555.666-1\"", "Valid"],
        ["acord_01.pdf", "ACORD 25", "ANDES LOGISTICS · Travelers · GL-98765432-01 · $2M agg.", "Page 1: \"POLICY NUMBER: GL-98765432-01\"", "Valid"],
        ["acord_04.xlsx", "ACORD 25", "SUMMIT INDUSTRIAL · Chubb · GL-77665544-04 · $3M agg.", "Page 1: \"GENERAL AGGREGATE $ 3,000,000\"", "Valid"]
      ],
      tones: {
        "Valid": "good"
      }
    },
    {
      type: "bars",
      title: "40-document benchmark: rules vs. local 4B AI model",
      caption: "Percentage of documents extracted accurately per field group",
      unit: "%",
      items: [
        { label: "ACORD 25 fields (rules)", value: 100, tone: "good" },
        { label: "ACORD 25 fields (local AI)", value: 100, tone: "good" },
        { label: "Invoice IDs & dates (rules)", value: 100, tone: "good" },
        { label: "Invoice IDs & dates (local AI)", value: 95, tone: "good" },
        { label: "Invoice totals (local AI)", value: 95, tone: "good" },
        { label: "Invoice totals (rules)", value: 90, tone: "warn" },
        { label: "Invoice currency ISO code (local AI)", value: 20, tone: "bad" }
      ]
    }
  ]
};
