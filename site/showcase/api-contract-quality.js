window.SHOWCASE = {
  headline:
    "Verified 3 live chat-widget contract rules and 49 automated store checks with zero unexpected failures, catching 9 real cross-service issues.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "API quality gate summary",
      caption:
        "Live chat-widget contract verification combined with saved store regression checks and defect discovery reports.",
      items: [
        {
          label: "Chat contract checks",
          value: "3 / 3",
          note: "Live run passed in 13.9 s",
          tone: "good",
        },
        {
          label: "Store API assertions",
          value: "49 / 49",
          note: "17 requests passed in 0.14 s",
          tone: "good",
        },
        {
          label: "Bugs discovered",
          value: 9,
          note: "2 startup/DB crashes fixed, 7 spec gaps logged",
          tone: "warn",
        },
      ],
    },
    {
      type: "checklist",
      title: "Verified business behaviors",
      caption:
        "Confirmed that client apps and backend services agree on valid responses, error handling, and order lifecycle rules.",
      items: [
        {
          text: "Customer chat message returns assistant replies",
          status: "pass",
          detail: "Live contract run verified reply list structure for active chat sessions",
        },
        {
          text: "Blank chat message is rejected cleanly with validation feedback",
          status: "pass",
          detail: "Live contract run confirmed empty messages cannot reach the assistant",
        },
        {
          text: "Spam burst from one chat session triggers rate-limit protection",
          status: "pass",
          detail: "Live contract run verified abusive session traffic is blocked",
        },
        {
          text: "Pet catalog supports create, lookup, update, delete, and missing-item errors",
          status: "pass",
          detail: "Saved regression run verified deleted pets no longer appear",
        },
        {
          text: "Store orders can be placed, inspected, and canceled cleanly",
          status: "pass",
          detail: "Saved regression run confirmed inventory tracking and 404 after deletion",
        },
        {
          text: "User accounts support creation, sign-in, profile updates, and sign-out",
          status: "pass",
          detail: "Saved regression run checked all 49 speed and format rules",
        },
      ],
    },
    {
      type: "cards",
      title: "Real defects uncovered across integrated services",
      caption:
        "Issues found by testing external services from the outside without modifying their code at discovery time.",
      items: [
        {
          badge: "Fixed · Critical",
          title: "Chat widget folder missing inside container startup",
          subtitle: "Restaurant Assistant service",
          body: "Startup crashed because the app looked for the chat widget folder outside the container boundary. Fixed with configurable directory mounting.",
          tone: "good",
        },
        {
          badge: "Fixed · High",
          title: "Long visitor session IDs caused server crashes",
          subtitle: "Web chat channel",
          body: "Session IDs over 16 characters overflowed the 20-character customer column in the database. Fixed by enforcing length limits before saving.",
          tone: "good",
        },
        {
          badge: "Open · 7 rules",
          title: "Order admin pages and payment error codes drift from spec",
          subtitle: "E-Commerce Order service",
          body: "Automated schema fuzzing across 171 generated inputs found 3 admin routes returning web pages instead of data and 4 undocumented payment rejection responses.",
          tone: "warn",
        },
      ],
    },
  ],
};
