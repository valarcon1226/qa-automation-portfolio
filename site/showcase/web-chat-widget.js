window.SHOWCASE = {
  headline: "Built a 143.8 KB drop-in web chat bubble in 49 ms and passed all 8 interactive customer and accessibility checks in Microsoft Edge.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "Build & Microsoft Edge verification",
      items: [
        { label: "Single-file bundle", value: "143.8 KB", note: "Zero external dependencies", tone: "good" },
        { label: "Build speed", value: "49 ms", note: "Compiled cleanly from TypeScript", tone: "good" },
        { label: "Edge browser checks", value: "8 / 8", note: "All scenarios passed in 29.44 s", tone: "good" }
      ]
    },
    {
      type: "checklist",
      title: "Customer experience verified in Microsoft Edge",
      items: [
        { text: "Keyboard users can open the chat bubble with Enter and type right away", status: "pass" },
        { text: "Asking about the menu displays restaurant dishes such as Ajiaco", status: "pass" },
        { text: "Requesting a table saves a confirmed reservation for 2 guests", status: "pass" },
        { text: "Clicking Send clears the input box and remembers chat history in the browser", status: "pass" },
        { text: "Dropping the internet connection shows a clear \"Error de conexión\" notice", status: "pass" },
        { text: "A busy or unavailable server displays a friendly status message instead of freezing", status: "pass" },
        { text: "Closing the chat panel returns keyboard focus back to the launcher button", status: "pass" },
        { text: "Staff document uploads require a valid access key before saving new menu files", status: "pass" }
      ]
    },
    {
      type: "flow",
      title: "How a restaurant adds it to any website",
      steps: [
        { label: "Paste 1 line of HTML", detail: "Point the widget script to the restaurant assistant address and set the header title" },
        { label: "Visitor clicks the chat bubble", detail: "Panel opens smoothly on desktop or mobile (90% width on small screens)" },
        { label: "Assistant answers in real time", detail: "Shows a typing indicator while checking menu, bookings, or policies" },
        { label: "Conversation stays saved", detail: "Chat history persists across page refreshes in the visitor's browser" }
      ]
    }
  ]
};
