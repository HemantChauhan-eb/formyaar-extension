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
    if (message.type === "OPEN_RAZORPAY") {
      const paymentUrl = `https://formyaar.pages.dev/pay?order_id=${message.order_id}&amount=${message.amount}`;
      browser.tabs.create({ url: paymentUrl });

      // Start polling for payment status
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max

      const poll = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(poll);
          return;
        }

        try {
          const res = await fetch(
            `https://formyaar-backend-production.up.railway.app/payment/status/${message.order_id}`,
          );
          const data = await res.json();

          if (data.paid) {
            clearInterval(poll);
            // Tell all active tabs to start guide
            browser.tabs.query({ active: true }, (tabs) => {
              tabs.forEach((tab) => {
                if (tab.id) {
                  browser.tabs.sendMessage(tab.id, {
                    type: "PAYMENT_VERIFIED",
                  });
                }
              });
            });
          }
        } catch (err) {
          console.error("Poll error:", err);
        }
      }, 5000); // check every 5 seconds

      sendResponse({ success: true });
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
    if (message.type === "PAYMENT_SUCCESS") {
      // Verify and notify content script
      fetch(
        "https://formyaar-backend-production.up.railway.app/payment/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message.payload),
        },
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            // Tell content script to start guide
            browser.tabs.query({ active: true }, (tabs) => {
              tabs.forEach((tab) => {
                if (tab.id) {
                  browser.tabs.sendMessage(tab.id, {
                    type: "PAYMENT_VERIFIED",
                  });
                }
              });
            });
          }
        });
    }
  });
});
