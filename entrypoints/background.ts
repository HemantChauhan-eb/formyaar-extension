import { BACKEND_URL } from "./content/constants";

// Requested interval. Chrome clamps alarm periods in packed builds, so the real
// gap is closer to 30s than the 6s asked for — which is why the /pay page nudges
// the worker directly instead of relying on this. It stays as the safety net for
// payments completed somewhere this page can't reach (UPI on a phone, a retry in
// another browser).
const POLL_INTERVAL_MINUTES = 0.1;
const MAX_ATTEMPTS = 60;
import type { ExtensionMessage } from "./content/types";

type PendingPayment = {
  orderId: string;
  originTabId: number;
  // Where to send the user back to, and which tab to dispose of. Both are
  // optional: a payment started by a build that didn't record them still
  // verifies correctly, it just can't tidy up the tabs afterwards.
  originWindowId?: number;
  paymentTabId?: number;
  attempts: number;
};

export default defineBackground(() => {
  // Allow content scripts to read/write session storage
  browser.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
  });

  // Bring the user back to the form themselves rather than leaving them on a
  // dead-end "you can close this tab" screen: close the payment tab and focus
  // the tab that started the payment, which is already reloading the
  // government form. Every step is best-effort — the tab may already be gone,
  // and none of it may block the unlock.
  const returnToForm = async (pending: PendingPayment) => {
    const { originTabId, originWindowId, paymentTabId } = pending;
    try {
      if (originWindowId !== undefined)
        await browser.windows.update(originWindowId, { focused: true });
    } catch {
      /* window closed */
    }
    try {
      await browser.tabs.update(originTabId, { active: true });
    } catch {
      /* form tab closed — nothing to return to */
    }
    try {
      if (paymentTabId !== undefined) await browser.tabs.remove(paymentTabId);
    } catch {
      /* payment tab already closed by the user */
    }
  };

  // One poll tick. Driven both by the alarm and by the /pay page's nudge, so
  // the two can't drift apart. Returns true once the payment is settled.
  const runPaymentCheck = async (): Promise<boolean> => {
    const result = await browser.storage.session.get("pendingPayment");
    const pending = result.pendingPayment as PendingPayment | null;

    if (!pending) {
      browser.alarms.clear("paymentPoll");
      return false;
    }

    const { orderId, originTabId, attempts } = pending;

    if (attempts >= MAX_ATTEMPTS) {
      console.warn("FormYaar: payment poll timed out");
      await browser.storage.session.remove("pendingPayment");
      browser.alarms.clear("paymentPoll");
      return false;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/payment/status/${orderId}`);
      const data = await res.json();

      if (data.paid) {
        // Payment confirmed — clear state first so a nudge and an alarm tick
        // racing each other can't both unlock and double-fire the handoff.
        await browser.storage.session.remove("pendingPayment");
        browser.alarms.clear("paymentPoll");
        browser.tabs.sendMessage(originTabId, {
          type: "PAYMENT_VERIFIED",
          order_id: orderId,
        });
        await returnToForm(pending);
        return true;
      }
      // Not yet paid — increment attempts
      await browser.storage.session.set({
        pendingPayment: { ...pending, attempts: attempts + 1 },
      });
    } catch (err) {
      console.error("FormYaar: poll error:", err);
      await browser.storage.session.set({
        pendingPayment: { ...pending, attempts: attempts + 1 },
      });
    }
    return false;
  };

  // The /pay page nudges several times (it can't tell whether a nudge woke the
  // worker) and the alarm keeps ticking underneath. Without serialising, two
  // checks can both read the order as paid and each unlock — which resets the
  // fill's "pages already done" list mid-run and re-fills a completed page.
  // Concurrent callers share the single in-flight check instead.
  let checkInFlight: Promise<boolean> | null = null;
  const checkPaymentOnce = (): Promise<boolean> => {
    if (!checkInFlight) {
      checkInFlight = runPaymentCheck().finally(() => {
        checkInFlight = null;
      });
    }
    return checkInFlight;
  };

  // Re-register alarm listener every time SW starts (MV3 requirement)
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== "paymentPoll") return;
    await checkPaymentOnce();
  });

  // Message handler
  browser.runtime.onMessage.addListener(
    (message: ExtensionMessage, sender, sendResponse) => {
      if (message.type === "AI_CHAT") {
        fetch(`${BACKEND_URL}/ai/chat`, {
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
        fetch(`${BACKEND_URL}/payment/create-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            form: message.form || "pan_card",
            coupon: message.coupon || "",
          }),
        })
          .then((res) => res.json())
          .then((data) => sendResponse(data))
          .catch(() =>
            sendResponse({ success: false, error: "Network error" }),
          );
        return true;
      }
      if (message.type === "OPEN_URL") {
        browser.tabs.create({ url: message.url });
        return true;
      }

      if (message.type === "OPEN_RAZORPAY") {
        const originTabId = sender.tab?.id;
        if (!originTabId) {
          sendResponse({ success: false });
          return true;
        }

        // Free coupon → the backend already settled it (no Razorpay order
        // exists). Skip checkout and the poller, and unlock straight away.
        if (message.order_id.startsWith("free_")) {
          browser.tabs.sendMessage(originTabId, {
            type: "PAYMENT_VERIFIED",
            order_id: message.order_id,
          });
          sendResponse({ success: true });
          return true;
        }

        const paymentUrl = `https://formyaar.in/pay?order_id=${message.order_id}`;

        // Record the payment tab so it can be closed on success, and the
        // window so the form can be raised even if the user wandered off to
        // another window while paying.
        browser.tabs
          .create({ url: paymentUrl })
          .then((tab) =>
            browser.storage.session.set({
              pendingPayment: {
                orderId: message.order_id,
                originTabId,
                originWindowId: sender.tab?.windowId,
                paymentTabId: tab.id,
                attempts: 0,
              },
            }),
          )
          .then(() => {
            browser.alarms.create("paymentPoll", {
              periodInMinutes: POLL_INTERVAL_MINUTES,
            });
          });

        sendResponse({ success: true });
        return true;
      }

      // The /pay page saw Razorpay succeed. Check straight away instead of
      // waiting out the alarm interval — Chrome clamps alarm periods in packed
      // builds, so the poll alone can leave the user staring at a finished
      // payment for half a minute wondering what to do next.
      if (message.type === "PAYMENT_CHECK_NOW") {
        checkPaymentOnce().then((settled) => sendResponse({ settled }));
        return true;
      }
      if (message.type === "TELEMETRY_EVENT") {
        fetch(`${BACKEND_URL}/telemetry/event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message.payload),
        }).catch(() => {});
        return;
      }
    },
  );
});
