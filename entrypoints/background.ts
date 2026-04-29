export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "AI_CHAT") {
      fetch("https://formyaar-backend-production.up.railway.app/ai/chat", {
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
    if (message.type === "CREATE_PAYMENT") {
      fetch(
        "https://formyaar-backend-production.up.railway.app/payment/create-order",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ form: message.form }),
        },
      )
        .then((res) => res.json())
        .then((data) =>
          sendResponse({
            success: true,
            order_id: data.order_id,
            amount: data.amount,
          }),
        )
        .catch(() => sendResponse({ success: false }));
      return true;
    }

    if (message.type === "VERIFY_PAYMENT") {
      fetch(
        "https://formyaar-backend-production.up.railway.app/payment/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message.payload),
        },
      )
        .then((res) => res.json())
        .then((data) => sendResponse({ success: data.success }))
        .catch(() => sendResponse({ success: false }));
      return true;
    }
  });
});
