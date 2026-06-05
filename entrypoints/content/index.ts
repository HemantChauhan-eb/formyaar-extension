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
          // Ignore programmatic clicks from autofill auto-advance — handled there
          if ((window as any).__fy_auto_advancing) return;
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

    // Allow formyaar.in buttons to open the panel via a custom DOM event
    if (hostname === "formyaar.in") {
      document.addEventListener("fy:open-panel", async () => {
        await showContextualBanner();
        const p = document.getElementById("formyaar-panel");
        if (p) p.style.right = "0px";
      });
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

            // First page of the flow (done was empty) → show start overlay
            // so the user knows to switch to this tab and confirm before autofill starts.
            // Subsequent pages (mid-flow) run directly — don't interrupt mid-fill.
            const isFirstPage = done.length === 0 && !isTokenPage;
            if (isFirstPage) {
              showStartOverlay(active.form);
            } else {
              setTimeout(() => runAutofill(active.form), 1500);
            }
          }
        }
      } catch (err) {
        console.warn("FormYaar: could not check autofill state", err);
      }
    }
  },
});

// ─── Start overlay ────────────────────────────────────────────────────
// Shown on the very first NSDL page after payment so the user can
// consciously kick off the autofill after switching back to this tab.
function showStartOverlay(form: string): void {
  const originalTitle = document.title;

  // Pulse the tab title so the user notices this tab in the background
  let pulse = true;
  const titleInterval = setInterval(() => {
    document.title = pulse
      ? "⚡ FormYaar — click here!"
      : "👆 Your PAN form is ready";
    pulse = !pulse;
  }, 900);

  const overlay = document.createElement("div");
  overlay.id = "fy-start-overlay";
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 2147483646;
    background: rgba(10,10,46,0.72);
    backdrop-filter: blur(3px);
    display: flex; align-items: center; justify-content: center;
    font-family: 'DM Sans', -apple-system, sans-serif;
    animation: fyOverlayIn 0.35s ease;
  `;

  const styleEl = document.createElement("style");
  styleEl.textContent = `
    @keyframes fyOverlayIn { from { opacity:0; } to { opacity:1; } }
    @keyframes fyCardIn { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
    #fy-start-card { animation: fyCardIn 0.4s 0.1s ease both; }
    #fy-start-btn:hover { background: #1a3aaa !important; }
    #fy-start-btn:active { transform: scale(0.97); }
  `;
  document.head.appendChild(styleEl);

  overlay.innerHTML = `
    <div id="fy-start-card" style="
      background:#fff; border-radius:20px; padding:40px 36px;
      max-width:380px; width:calc(100% - 48px);
      text-align:center; box-shadow:0 24px 64px rgba(0,0,0,0.35);
    ">
      <div style="font-size:52px;margin-bottom:16px;">📋</div>
      <div style="font-size:22px;font-weight:800;color:#0a0a2e;margin-bottom:10px;line-height:1.3;">
        Ready to fill your PAN card?
      </div>
      <div style="font-size:14px;color:#64748b;line-height:1.65;margin-bottom:28px;">
        FormYaar will auto-fill the entire application for you.<br>
        Just sit back — it takes about 2–3 minutes.
      </div>
      <button id="fy-start-btn" style="
        width:100%; padding:15px; background:#000080; color:#fff;
        border:none; border-radius:12px; font-size:16px; font-weight:800;
        cursor:pointer; font-family:inherit; letter-spacing:0.3px;
        transition: background 0.15s, transform 0.1s;
      ">
        Start filling →
      </button>
      <div style="margin-top:14px;font-size:12px;color:#94a3b8;">
        Powered by FormYaar · your details are saved locally
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fy-start-btn")!.addEventListener("click", () => {
    clearInterval(titleInterval);
    document.title = originalTitle;
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 0.2s ease";
    setTimeout(() => {
      overlay.remove();
      styleEl.remove();
      runAutofill(form);
    }, 200);
  });
}
