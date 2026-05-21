import { SITE_CONFIGS, BANNER_DELAY_MS, BACKEND_URL } from "./constants";
import { showContextualBanner } from "./panel";
import { runAutofill } from "./autofill";
import { getActiveSession, getUserData } from "./userData";
import { showResumeScreen } from "./panel";
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

        browser.storage.session
          .set({ autofillActive: { form: "pan_card" } })
          .catch((err) =>
            console.warn("FormYaar: could not save autofill state", err),
          );

        browser.storage.local
          .set({
            fy_active_session: {
              form: "pan_card",
              order_id: orderId,
              paid_at: Date.now(),
              completed: false,
            },
          })
          .catch((err) =>
            console.warn("FormYaar: could not save resume session", err),
          );

        // Also persist server-side so session survives localStorage wipes
        getUserData().then((userData) => {
          if (!userData.mobile) return;
          fetch(`${BACKEND_URL}/payment/save-session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_id: orderId,
              mobile: userData.mobile,
              form_type: "pan_card",
              form_data: userData,
            }),
          }).catch(() => {});
        });

        runAutofill("pan_card");
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

    // Resume autofill if flow is active (e.g. after navigation to a new page)
    if (SITE_CONFIGS[hostname]) {
      try {
        const result = await browser.storage.session.get("autofillActive");
        const active = result.autofillActive as { form: string } | undefined;
        if (active) {
          console.log("FormYaar: resuming autofill for", active.form);
          // Small delay to let the page fully render before we start filling
          setTimeout(() => runAutofill(active.form), 1500);
        } else {
          // No active autofill — but check for a paused session (resume case)
          const session = await getActiveSession();
          if (session && !session.completed) {
            // Wait for panel to be in DOM (showContextualBanner runs after BANNER_DELAY_MS)
            setTimeout(() => showResumeScreen(session), BANNER_DELAY_MS + 300);
          }
        }
      } catch (err) {
        console.warn("FormYaar: could not check autofill state", err);
      }
    }
  },
});
