window.SHOWCASE = {
  headline:
    "Verified 3 supplier invoice PDFs (catching a math mismatch and an impossible date), wrote a daily sales report for $1,079,000 COP, and passed 9 workflow security checks.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "Automation pack execution summary",
      caption:
        "Ran workflow security & extraction checks alongside live PDF invoice validation and daily sales summarization.",
      items: [
        {
          label: "Workflow safety checks",
          value: "9 / 9",
          note: "Zero leaked credentials; all webhooks guarded",
          tone: "good",
        },
        {
          label: "Invoices validated",
          value: 3,
          note: "1 approved, 2 flagged before accounting",
          tone: "info",
        },
        {
          label: "Exceptions caught",
          value: 2,
          note: "1 wrong total, 1 invalid calendar date",
          tone: "warn",
        },
        {
          label: "Daily sales reported",
          value: "$1.08M",
          note: "$1,079,000 COP across 49 dishes (2025-01-15)",
          tone: "good",
        },
      ],
    },
    {
      type: "table",
      title: "Automated supplier invoice audit",
      columns: ["PDF file", "Supplier", "Total billed", "Validation finding", "Status"],
      rows: [
        ["factura-valida.pdf", "Distribuidora La Sabana SAS", "232,050 COP", "Subtotal (195,000) + Tax (37,050) matches", "Validated"],
        ["factura-totales-no-cuadran.pdf", "Carnes El Novillo Ltda", "999,999 COP", "Total does not match subtotal + tax (553,350)", "Needs review"],
        ["factura-fecha-invalida.pdf", "Verduras Frescas del Valle", "60,690 COP", "Invalid calendar date (2026-13-45)", "Needs review"],
      ],
      tones: {
        Validated: "good",
        "Needs review": "warn",
      },
    },
    {
      type: "messages",
      title: "Generated executive sales report & team alert",
      items: [
        {
          channel: "Email",
          side: "out",
          to: "Restaurant Team",
          subject: "Reporte diario de ventas — 2025-01-15",
          body: "Resumen de ventas de Sabor de Casa del 2025-01-15: se vendieron 14 unidades de Bandeja Paisa ($476000 COP); 9 unidades de Ajiaco Santafereño ($261000 COP); 6 unidades de Sancocho de Gallina ($162000 COP); 20 unidades de Limonada de Coco ($180000 COP). Total del día: $1079000 COP. ¡Buen trabajo, equipo!",
        },
        {
          channel: "Email",
          side: "out",
          to: "Accounting Team",
          subject: "Invoice requires manual review — Carnes El Novillo Ltda",
          body: "Supplier invoice failed automatic math validation (total does not match subtotal + IVA) and was held in needs_review instead of corrupting accounting records.",
        },
      ],
    },
  ],
};
