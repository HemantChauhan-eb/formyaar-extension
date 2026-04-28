export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "AI_CHAT") {
      fetch("http://localhost:3001/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldExplanation: message.fieldExplanation,
          userMessage: message.userMessage,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("FormYaar AI response:", data);
          sendResponse({ success: true, response: data.response });
        })
        .catch((err) => {
          console.error("FormYaar fetch error:", err);
          sendResponse({ success: false });
        });

      return true;
    }
  });
});
