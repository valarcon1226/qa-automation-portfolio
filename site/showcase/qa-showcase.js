window.SHOWCASE = {
  headline:
    "Executed 26 live checks across hotel booking APIs and the SauceDemo storefront: 21 core shopping and booking journeys passed and 5 known store defects were caught.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "Live test run results",
      caption:
        "Full browser and booking API check run completed live with HTML report and bug evidence screenshots.",
      items: [
        {
          label: "Core journeys passing",
          value: 21,
          note: "8 booking API + 13 standard storefront checks",
          tone: "good",
        },
        {
          label: "Known bugs caught",
          value: 5,
          note: "Expected failures pinned with screenshots",
          tone: "warn",
        },
        {
          label: "Unexpected failures",
          value: 0,
          note: "Suite stays green while tracking open bugs",
          tone: "good",
        },
      ],
    },
    {
      type: "checklist",
      title: "Shopping and booking scenarios checked live",
      items: [
        {
          text: "Hotel booking API creates, reads, updates, and deletes reservations",
          status: "pass",
          detail: "5 booking lifecycle checks passed live",
        },
        {
          text: "Booking API rejects invalid tokens, unknown IDs, and missing fields",
          status: "pass",
          detail: "3 negative security and validation checks passed live",
        },
        {
          text: "Standard shopper signs in, sorts catalog, edits cart, and completes checkout",
          status: "pass",
          detail: "7 happy-path browser journeys passed live",
        },
        {
          text: "Locked accounts, wrong passwords, and empty checkout fields show clear errors",
          status: "pass",
          detail: "6 negative login and checkout validation checks passed live",
        },
        {
          text: "Affected user account can sort, see product photos, add/remove items, and enter last name",
          status: "fail",
          detail: "5 known storefront defects (QA-102 to QA-106) reproduced and pinned",
        },
      ],
    },
    {
      type: "cards",
      title: "Five known storefront bugs pinned with evidence",
      caption:
        "Screenshots saved in docs/screenshots/qa-102.png through qa-106.png.",
      items: [
        {
          badge: "QA-102 · High",
          title: "Product sorting does not reorder items",
          body: "Changing the sort dropdown leaves product cards in their original order.",
          tone: "bad",
        },
        {
          badge: "QA-103 · Medium",
          title: "Every product shows the wrong image",
          body: "All catalog items display the same placeholder dog picture instead of product photos.",
          tone: "warn",
        },
        {
          badge: "QA-104 · High",
          title: "Some Add-to-Cart buttons do not respond",
          body: "Trying to add all catalog items skips products whose Add buttons fail to react.",
          tone: "bad",
        },
        {
          badge: "QA-105 · High",
          title: "Checkout form clears the Last Name field",
          body: "Entering a last name clears the field and blocks progress with a required-field error.",
          tone: "bad",
        },
        {
          badge: "QA-106 · High",
          title: "Remove button on catalog page fails to empty cart",
          body: "Clicking Remove on the product grid leaves the item in the shopping cart.",
          tone: "bad",
        },
      ],
    },
  ],
};
