window.SHOWCASE = {
  headline: "Generated 31 QA test cases for 4 held-out e-commerce features with a local AI model: achieved 93.8% verified requirement coverage and 100% negative/edge coverage, flagging 2 quality gates.",
  source: "reports/qwen3-4b-test/eval.json",
  blocks: [
    {
      type: "stats",
      title: "Held-out test split results (4 features, 31 generated test cases)",
      caption: "Harness self-check also passed 6/6 metrics (32 cases) in demo-output/showcase-run.json alongside live CLI run in demo-output/showcase-run.txt",
      items: [
        { label: "Targets passed", value: "3 / 5", note: "Needs retry + QA sign-off", tone: "warn" },
        { label: "Verified coverage", value: "93.8%", note: "Goal >= 70% (passed)", tone: "good" },
        { label: "1st-try valid format", value: "75.0%", note: "Goal >= 90% (1 needed retry)", tone: "bad" },
        { label: "Invented ref IDs", value: "3.2%", note: "Limit <= 2% (1 of 31 cases)", tone: "bad" }
      ]
    },
    {
      type: "bars",
      title: "Quality metrics vs. pre-registered targets (test split)",
      unit: "%",
      items: [
        { label: "Negative or edge test included (goal 100%)", value: 100.0, tone: "good" },
        { label: "Verified requirement coverage (goal >= 70%)", value: 93.8, tone: "good" },
        { label: "Valid structure on 1st try (goal >= 90%)", value: 75.0, tone: "bad" },
        { label: "Duplicate test cases (limit <= 10%)", value: 6.5, tone: "good" },
        { label: "Invented criterion IDs (limit <= 2%)", value: 3.2, tone: "bad" }
      ]
    },
    {
      type: "cards",
      title: "Prompt discovery & real generated test examples",
      items: [
        {
          title: "One prompt line raised coverage from 56.2% to 90.6%",
          badge: "Dev tuning",
          tone: "good",
          subtitle: "Dev Run 1 -> Dev Run 2 (8 requirements)",
          body: "In Run 1, the model wrote English test cases for Spanish requirements. Instructing it to match the requirement language jumped verified coverage by 34.4 points."
        },
        {
          title: "Sample generated case: Order tracking (TC-01)",
          badge: "Smoke test",
          tone: "info",
          subtitle: "REQ-09 · Order status visibility",
          body: "Sign in, open order tracking, pick an order in preparation, and confirm the interface displays \"en preparación\" (covers AC-01)."
        },
        {
          title: "Sample generated case: Cancel shipped order (TC-03)",
          badge: "Negative test",
          tone: "info",
          subtitle: "REQ-09 · Cancellation rule",
          body: "Select an already shipped order and attempt to cancel; verify the system blocks cancellation and explains it only applies while in preparation (covers AC-03)."
        }
      ]
    }
  ]
};
