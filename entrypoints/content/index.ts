import { SITE_CONFIGS, BANNER_DELAY_MS, BACKEND_URL } from "./constants";
import { showContextualBanner } from "./panel";
import { runAutofill } from "./autofill";
import { getUserData } from "./userData";

const NSDL_START_URL = "https://onlineservices.proteantech.in/paam/endUserRegisterContact.html";
export default defineContentScript({
  matches: [
    "*://*.proteantech.in/*",
    "*://*.nsdl.com/*",
    "*://*.utiitsl.com/*",
    "*://*.passporthub.gov.in/*",
    "*://*.sarathi.parivahan.gov.in/*",
    "*://formyaar.in/*",
  ],
  async main() {
    if (import.meta.env.DEV)
      console.log("FormYaar loaded on:", window.location.href);

    const hostname = window.location.hostname;

    // Message listener
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === "OPEN_PANEL") {
        showContextualBanner();
      }
      if (message.type === "PAYMENT_VERIFIED") {
        const orderId = message.order_id ?? "";

        // Persist session server-side (payment proof only — no form data)
        getUserData().then((userData) => {
          if (!userData.mobile) return;
          fetch(`${BACKEND_URL}/payment/save-session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_id: orderId,
              mobile: userData.mobile,
              form_type: "pan_card",
            }),
          }).catch(() => {});
        });

        Promise.all([
          browser.storage.session.set({ autofillActive: { form: "pan_card", done: [] } }),
          browser.storage.local.set({
            fy_active_session: {
              form: "pan_card",
              order_id: orderId,
              paid_at: Date.now(),
              completed: false,
            },
          }),
        ]).then(() => {
          if (hostname === "onlineservices.proteantech.in") {
            // Already on NSDL — run autofill directly on this page
            runAutofill("pan_card");
          } else {
            // Navigate to NSDL — autofill runs on page load via autofillActive
            window.location.href = NSDL_START_URL;
          }
        }).catch((err) => console.warn("FormYaar: could not save autofill state", err));
      }
    });
    // Re-run autofill when user moves to next step on endUserLogin
    if (hostname === "onlineservices.proteantech.in") {
      document.addEventListener("click", async (e) => {
        const target = e.target as HTMLElement;
        if (
          target.classList.contains("button-next") ||
          target.closest(".button-next")
        ) {
          const result = await browser.storage.session.get("autofillActive");
          const active = result.autofillActive as { form: string } | undefined;
          if (!active) return;

          // Wait for stepy to show the next fieldset
          const observer = new MutationObserver(() => {
            const visible = document.querySelector(
              '.stepy-step:not([style*="display: none"])',
            );
            if (visible) {
              observer.disconnect();
              setTimeout(() => runAutofill(active.form), 300);
            }
          });

          observer.observe(document.body, {
            subtree: true,
            attributes: true,
            attributeFilter: ["style"],
          });

          // Safety fallback — disconnect after 3 seconds if nothing happens
          setTimeout(() => observer.disconnect(), 3000);
        }
      });
    }
    // Show contextual banner on supported sites + formyaar website
    if (SITE_CONFIGS[hostname] || hostname === "formyaar.in") {
      setTimeout(() => showContextualBanner(), BANNER_DELAY_MS);
    }

    // Auto-run autofill on page load only for pages not yet seen in this flow
    if (SITE_CONFIGS[hostname]) {
      try {
        const result = await browser.storage.session.get("autofillActive");
        const active = result.autofillActive as { form: string; done: string[] } | undefined;
        if (active) {
          const pageKey = window.location.pathname;
          const isTokenPage = !!document.querySelector("input.tokenButton");
          const done = active.done ?? [];
          if (isTokenPage || !done.includes(pageKey)) {
            if (!isTokenPage) {
              await browser.storage.session.set({
                autofillActive: { ...active, done: [...done, pageKey] },
              });
            }
            setTimeout(() => runAutofill(active.form), 1500);
          }
        }
      } catch (err) {
        console.warn("FormYaar: could not check autofill state", err);
      }
    }
  },
});
