window.SHOWCASE = {
  headline:
    "All 35 automated checks across online store browsers, hotel booking APIs, and plain-English user stories passed with zero unexpected errors.",
  source: "target/surefire-reports/TEST-qa.bdd.RunCucumberTest.xml",
  blocks: [
    {
      type: "stats",
      title: "Containerized test run summary",
      caption:
        "Executed in isolated browser and Java test containers across three complementary quality layers.",
      items: [
        {
          label: "Total checks passed",
          value: "35 / 35",
          note: "0 failures, 0 skipped",
          tone: "good",
        },
        {
          label: "Storefront browser checks",
          value: 17,
          note: "Sign-in, catalog, checkout & bug pinning",
          tone: "info",
        },
        {
          label: "Booking API checks",
          value: 11,
          note: "Create, read, update, delete & auth guards",
          tone: "info",
        },
        {
          label: "Plain-English stories",
          value: 7,
          note: "Business-readable scenarios sharing page models",
          tone: "good",
        },
      ],
    },
    {
      type: "checklist",
      title: "Business capabilities verified",
      items: [
        {
          text: "Customers can sign in, while bad passwords, blank forms, and locked accounts are blocked",
          status: "pass",
          detail: "4 browser checks passed in 9.4 s",
        },
        {
          text: "Shoppers can sort catalog products and add or remove cart items",
          status: "pass",
          detail: "2 catalog checks passed in 5.1 s",
        },
        {
          text: "Multi-step checkout totals match subtotal plus tax and catch missing address fields",
          status: "pass",
          detail: "8 checkout and cancellation checks passed in 24.6 s",
        },
        {
          text: "Hotel booking API creates, reads, updates, and deletes stays while blocking invalid tokens",
          status: "pass",
          detail: "11 API checks passed in 34.0 s",
        },
        {
          text: "Seven plain-English customer journeys run end-to-end using shared screen models",
          status: "pass",
          detail: "7 business-readable scenarios passed in 21.1 s",
        },
      ],
    },
    {
      type: "cards",
      title: "Three known store defects pinned automatically",
      caption:
        "Automated checks verify that these known defects still behave consistently until fixed.",
      items: [
        {
          badge: "QA-104",
          title: "Some Add-to-Cart buttons do not work for affected user",
          subtitle: "Verified in browser & business story",
          body: "Clicking Add to Cart on all 6 items fails to add every product to the basket.",
          tone: "warn",
        },
        {
          badge: "QA-105",
          title: "Last name cannot be saved during checkout",
          subtitle: "Verified in browser & business story",
          body: "Typing a last name fails to persist in the form and triggers a required-field error.",
          tone: "warn",
        },
        {
          badge: "QA-106",
          title: "Remove button on catalog page leaves item in cart",
          subtitle: "Verified in browser & business story",
          body: "Clicking Remove directly from the catalog leaves the cart item badge unchanged.",
          tone: "warn",
        },
      ],
    },
  ],
};
