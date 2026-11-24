window.SHOWCASE = {
  headline:
    "Collected 6 stories across 3 tech news feeds, collapsed 3 competing GPT-5 articles into 1 grouped story, categorized 4 unique topics, and compiled a ready-to-send HTML briefing.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "News digestion & deduplication run",
      caption:
        "Scanned TechNews A, DailyTech B, and GlobalNews C, filtered duplicate coverage, and rendered demo-output/showcase-digest.html (7,022 bytes).",
      items: [
        {
          label: "News feeds scanned",
          value: 3,
          note: "TechNews A, DailyTech B, GlobalNews C",
          tone: "info",
        },
        {
          label: "Articles collected",
          value: 6,
          note: "2 stories per feed",
          tone: "info",
        },
        {
          label: "Duplicates collapsed",
          value: 2,
          note: "Linked DailyTech B & GlobalNews C to lead story",
          tone: "warn",
        },
        {
          label: "Unique briefing stories",
          value: 4,
          note: "Sorted across 4 industry topics",
          tone: "good",
        },
      ],
    },
    {
      type: "table",
      title: "How 6 incoming articles were grouped into 4 briefing topics",
      columns: ["Topic", "Lead Outlet", "Story Headline", "Cross-Source Handling"],
      rows: [
        [
          "Artificial Intelligence",
          "TechNews A",
          "OpenAI presenta su nuevo modelo GPT-5 con razonamiento avanzado",
          "Lead story (+2 duplicates linked)",
        ],
        [
          "Cloud & DevOps",
          "TechNews A",
          "Kubernetes 1.32 introduce mejoras críticas en la gestión de memoria y contenedores",
          "Unique · Included in digest",
        ],
        [
          "Cybersecurity",
          "DailyTech B",
          "Alerta global por nueva ola de ataques de ransomware dirigidos a servidores Linux",
          "Unique · Included in digest",
        ],
        [
          "Fintech & Markets",
          "GlobalNews C",
          "Las acciones de gigantes tecnológicos impulsan el índice bursátil a máximos históricos",
          "Unique · Included in digest",
        ],
        [
          "Duplicate filtered",
          "DailyTech B",
          "Llega GPT-5: OpenAI revoluciona la inteligencia artificial con nuevo motor de razonamiento",
          "Merged under TechNews A",
        ],
        [
          "Duplicate filtered",
          "GlobalNews C",
          "OpenAI desvela GPT-5 y redefine los estándares de la computación cognitiva",
          "Merged under TechNews A",
        ],
      ],
      tones: {
        "Lead story (+2 duplicates linked)": "good",
        "Unique · Included in digest": "good",
        "Merged under TechNews A": "info",
      },
    },
    {
      type: "messages",
      title: "Compiled executive email digest preview",
      caption:
        "Formatted HTML newsletter grouping the 4 unique stories by category and listing duplicate coverage links underneath.",
      items: [
        {
          channel: "Email Digest",
          side: "out",
          to: "Executive Committee",
          subject: "Boletín Diario de Inteligencia — 4 Stories Across 4 Topics",
          body: "1. Inteligencia Artificial — OpenAI presenta GPT-5 (TechNews A; other coverage: DailyTech B, GlobalNews C)\n2. Cloud y DevOps — Kubernetes 1.32 memory & container improvements (TechNews A)\n3. Ciberseguridad — Global ransomware wave targeting Linux servers (DailyTech B)\n4. Fintech y Mercados — Tech giants push stock index to record highs (GlobalNews C)",
        },
      ],
    },
  ],
};
