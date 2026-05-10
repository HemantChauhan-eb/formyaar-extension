const BACKEND = "https://formyaar-backend-production.up.railway.app";
const POLL_INTERVAL_MINUTES = 0.1; // ~6 seconds
const MAX_ATTEMPTS = 60; // 5 minutes max
import type { ExtensionMessage } from "./content/types";

export default defineBackground(() => {
  // Allow content scripts to read/write session storage
  browser.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
  });

  // Re-register alarm listener every time SW starts (MV3 requirement)
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== "paymentPoll") return;

    const result = await browser.storage.session.get("pendingPayment");
    const pending = result.pendingPayment as {
      orderId: string;
      originTabId: number;
      attempts: number;
    } | null;

    if (!pending) {
      browser.alarms.clear("paymentPoll");
      return;
    }

    const { orderId, originTabId, attempts } = pending;

    if (attempts >= MAX_ATTEMPTS) {
      console.warn("FormYaar: payment poll timed out");
      await browser.storage.session.remove("pendingPayment");
      browser.alarms.clear("paymentPoll");
      return;
    }

    try {
      const res = await fetch(`${BACKEND}/payment/status/${orderId}`);
      const data = await res.json();

      if (data.paid) {
        // Payment confirmed — notify original tab
        await browser.storage.session.remove("pendingPayment");
        browser.alarms.clear("paymentPoll");
        browser.tabs.sendMessage(originTabId, {
          type: "PAYMENT_VERIFIED",
          order_id: orderId,
        });
      } else {
        // Not yet paid — increment attempts
        await browser.storage.session.set({
          pendingPayment: { orderId, originTabId, attempts: attempts + 1 },
        });
      }
    } catch (err) {
      console.error("FormYaar: poll error:", err);
      await browser.storage.session.set({
        pendingPayment: { orderId, originTabId, attempts: attempts + 1 },
      });
    }
  });

  // Message handler
  browser.runtime.onMessage.addListener(
    (message: ExtensionMessage, sender, sendResponse) => {
      if (message.type === "AI_CHAT") {
        fetch(`${BACKEND}/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fieldId: message.fieldId,
            fieldExplanation: message.fieldExplanation,
            userMessage: message.userMessage,
          }),
        })
          .then((res) => res.json())
          .then((data) => sendResponse({ response: data.response }))
          .catch(() =>
            sendResponse({
              response: "Sorry, couldn't get help right now. Please try again.",
            }),
          );
        return true;
      }

      if (message.type === "CREATE_PAYMENT") {
        fetch(`${BACKEND}/payment/create-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ form: message.form || "pan_card" }),
        })
          .then((res) => res.json())
          .then((data) => sendResponse(data))
          .catch(() =>
            sendResponse({ success: false, error: "Network error" }),
          );
        return true;
      }

      if (message.type === "OPEN_RAZORPAY") {
        const originTabId = sender.tab?.id;
        if (!originTabId) {
          sendResponse({ success: false });
          return true;
        }

        const paymentUrl = `https://formyaar.pages.dev/pay?order_id=${message.order_id}`;
        browser.tabs.create({ url: paymentUrl });

        // Store pending payment and start alarm
        browser.storage.session
          .set({
            pendingPayment: {
              orderId: message.order_id,
              originTabId,
              attempts: 0,
            },
          })
          .then(() => {
            browser.alarms.create("paymentPoll", {
              periodInMinutes: POLL_INTERVAL_MINUTES,
            });
          });

        sendResponse({ success: true });
        return true;
      }
    },
  );
});
