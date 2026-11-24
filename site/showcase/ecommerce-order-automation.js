window.SHOWCASE = {
  headline: "Turned incoming orders from WooCommerce, Shopify, and Stripe into 3 unified warehouse orders ($225,000 COP total), blocked a forged request, dropped a duplicate retry, and sent 6 customer alerts.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "Live 5-event store simulation",
      caption: "Executed sample webhooks from all three channels against the order service",
      items: [
        { label: "Orders unified", value: 3, note: "$225,000 COP ready to ship", tone: "good" },
        { label: "Duplicate retry dropped", value: 1, note: "WooCommerce #501 ignored safely", tone: "info" },
        { label: "Forged alert blocked", value: 1, note: "Rejected bad security stamp", tone: "good" },
        { label: "Customer alerts sent", value: 6, note: "3 emails + 3 WhatsApp notices", tone: "good" }
      ]
    },
    {
      type: "table",
      title: "Unified warehouse order list",
      columns: ["Order ID", "Store", "Customer", "City", "Items", "Total", "Status"],
      rows: [
        ["ORD-WC-501", "WooCommerce", "Ana Pérez", "Bogotá", "2x Huila + 1x Nariño coffee", "$86,000 COP", "Ready to ship"],
        ["ORD-SHP-1042", "Shopify", "Carlos Mendoza", "Medellín", "1x Geisha Sierra Nevada (250g)", "$55,000 COP", "Ready to ship"],
        ["ORD-STP-ABC999", "Stripe", "Andrea Gómez", "Medellín", "3x Huila Especial (250g)", "$84,000 COP", "Ready to ship"]
      ],
      tones: {
        "Ready to ship": "good",
        "WooCommerce": "info",
        "Shopify": "info",
        "Stripe": "info"
      }
    },
    {
      type: "messages",
      title: "Customer notifications dispatched automatically",
      caption: "Captured directly from the local mail receiver and WhatsApp dispatcher during the run",
      items: [
        {
          channel: "Email",
          side: "out",
          to: "Ana Pérez",
          subject: "¡Tu pedido ORD-WC-501 está listo para despachar! - Café de Origen",
          body: "Your order ORD-WC-501 ($86,000 COP: 2x Café Huila Especial, 1x Café Nariño Supremo) has been confirmed and is READY TO SHIP to Bogotá."
        },
        {
          channel: "WhatsApp",
          side: "out",
          to: "Carlos Mendoza",
          body: "Café de Origen: Hello Carlos Mendoza, your order ORD-SHP-1042 for $55,000 COP is confirmed and READY TO SHIP. We will notify you when it leaves the warehouse."
        }
      ]
    }
  ]
};
