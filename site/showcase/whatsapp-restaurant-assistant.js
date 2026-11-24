window.SHOWCASE = {
  headline: "Tested a 24/7 restaurant assistant across 30 real conversations: 100% accurate on opening hours and closed Mondays, while catching 7 real mistakes before going live.",
  source: "evals/results.jsonl",
  blocks: [
    {
      type: "messages",
      title: "Real customer conversations handled by the assistant",
      caption: "From the 30-case evaluation with local model qwen3:4b-instruct",
      items: [
        {
          channel: "Web Chat",
          side: "in",
          from: "Customer (eval_28)",
          body: "Does the Ajiaco Santafereño soup contain dairy or milk products?"
        },
        {
          channel: "Web Chat",
          side: "out",
          to: "Customer",
          body: "Yes, the Ajiaco Santafereño contains dairy or milk products, specifically cream of milk, as listed in the ingredients. It is marked with a \"Lácteos\" allergen note. Let me know if you'd like to explore other options!"
        },
        {
          channel: "WhatsApp",
          side: "in",
          from: "Customer (eval_04)",
          body: "I need a table for 20 people this Saturday to celebrate a birthday."
        },
        {
          channel: "WhatsApp",
          side: "out",
          to: "Customer",
          body: "Sorry, we cannot assign a single table for 20 guests because table bookings are capped at 12 people. For larger celebrations we handle a private catering event — share your date, budget, and contact name and our events team will reach out within 24 business hours."
        }
      ]
    },
    {
      type: "stats",
      title: "Go / no-go evaluation summary (30 conversations)",
      caption: "Live booking, menu, and event lead tools also verified in demo-output/showcase-run.txt",
      items: [
        { label: "Strict test pass", value: "9 / 30", note: "30% automated exact match", tone: "warn" },
        { label: "Factually accurate", value: "23 / 30", note: "14 failed only strict wording checks", tone: "info" },
        { label: "Opening hours", value: "100%", note: "3 of 3 answered accurately", tone: "good" },
        { label: "Real defects caught", value: 7, note: "Off-topic drift & wrong EN hours", tone: "bad" }
      ]
    },
    {
      type: "bars",
      title: "Strict pass rate by conversation category",
      unit: "%",
      items: [
        { label: "Opening hours (3/3)", value: 100, tone: "good" },
        { label: "Trick / jailbreak defense (2/4)", value: 50, tone: "warn" },
        { label: "Policy limits & closures (1/3)", value: 33, tone: "warn" },
        { label: "English questions (1/4)", value: 25, tone: "bad" },
        { label: "Menu & prices (1/5)", value: 20, tone: "warn" },
        { label: "Off-topic redirection (1/5)", value: 20, tone: "bad" }
      ]
    }
  ]
};
