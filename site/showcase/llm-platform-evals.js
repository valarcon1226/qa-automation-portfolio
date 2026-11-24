window.SHOWCASE = {
  headline: "Evaluated an internal Kubernetes Q&A assistant across 150 questions (360 test answers): passed 3 of 5 launch gates, missed 2, and uncovered 6 platform defects blocking release.",
  source: "evals/baseline.json",
  blocks: [
    {
      type: "stats",
      title: "Pre-launch release gate verdict: Do not ship yet",
      caption: "Evaluated 120 test questions across 3 passes on 187 Kubernetes documentation pages",
      items: [
        { label: "Targets met", value: "3 / 5", note: "Missed correctness & false refusals", tone: "bad" },
        { label: "Doc search hit rate", value: "93.8%", note: "Goal >= 85% (90 of 96)", tone: "good" },
        { label: "Correct key facts", value: "70.8%", note: "Goal >= 75% (68 of 96)", tone: "bad" },
        { label: "False refusals", value: "12.5%", note: "Limit <= 10% (12 of 96)", tone: "bad" }
      ]
    },
    {
      type: "bars",
      title: "Quality scorecard vs. pre-registered targets",
      unit: "%",
      items: [
        { label: "Refused unanswerable questions (goal >= 90%)", value: 100.0, tone: "good" },
        { label: "Valid source citations (goal = 100%)", value: 100.0, tone: "good" },
        { label: "Found right doc in top 5 (goal >= 85%)", value: 93.8, tone: "good" },
        { label: "Included all key facts (goal >= 75%)", value: 70.8, tone: "bad" },
        { label: "False \"I don't know\" rate (limit <= 10%)", value: 12.5, tone: "bad" }
      ]
    },
    {
      type: "cards",
      title: "Key platform bugs uncovered before internal rollout",
      items: [
        {
          title: "Cut-off answers look finished",
          badge: "High risk",
          tone: "bad",
          subtitle: "FINDING-002 · Gateway & Chat UI",
          body: "When a streaming answer disconnects after 5 words, the UI closes it normally with no error or retry banner."
        },
        {
          title: "Search misses closest passages on 1 in 5 questions",
          badge: "High risk",
          tone: "bad",
          subtitle: "FINDING-006 · Vector Retrieval",
          body: "Approximate search skipped closer chunks in 17-18 of 96 questions, causing half of the false refusals and changing after restarts."
        },
        {
          title: "Citations cannot name the source document",
          badge: "Medium risk",
          tone: "warn",
          subtitle: "FINDING-004 · Knowledge Collection",
          body: "All 5 retrieved chunks arrive tagged as source ID 0, so answers cannot point readers to the exact document."
        },
        {
          title: "Cost tracking drops updates under concurrent traffic",
          badge: "Medium risk",
          tone: "warn",
          subtitle: "FINDING-003 · Usage Accounting",
          body: "Requests finishing during a background batch write lose 2%-4% of recorded AI spend unless the flush interval is tuned."
        }
      ]
    }
  ]
};
