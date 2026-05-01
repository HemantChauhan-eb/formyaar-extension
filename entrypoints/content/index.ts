import { getCurrentIndex } from "./guide";
import { SITE_CONFIGS, BANNER_DELAY_MS } from "./constants";
import { beginGuide, handlePageChange, getActiveGuide } from "./api";
import { startOverlay, stopOverlay, showResumeButton } from "./overlay";
import { showContextualBanner, removeTab } from "./panel";

export default defineContentScript({
  matches: ["*://*/*"],
  async main() {
    if (import.meta.env.DEV)
      console.log("FormYaar loaded on:", window.location.href);

    // Message listener
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === "START_GUIDE") {
        beginGuide(message.form ?? "pan_card");
      }
      if (message.type === "OPEN_PANEL") {
        showContextualBanner();
      }
      if (message.type === "STOP_GUIDE") {
        stopOverlay();
      }
      if (message.type === "PAYMENT_VERIFIED") {
        const panel = document.getElementById("formyaar-panel");
        if (panel) panel.style.right = "-400px";
        setTimeout(() => {
          panel?.remove();
          removeTab();
          beginGuide();
        }, 300);
      }
    });

    // Custom events from panel/overlay (avoids circular imports)
    document.addEventListener("fy:open-panel", () => showContextualBanner());
    document.addEventListener("fy:show-resume", () => showResumeButton());
    document.addEventListener("fy:resume-clicked", () => {
      const guide = getActiveGuide();
      const field = guide?.fields[getCurrentIndex()];
      if (!field) return;
      startOverlay(field.selector, field.explanation, field.required ?? true);
    });

    // Watch for SPA navigation
    let lastUrl = window.location.href;
    let urlCheckScheduled = false;

    const navigationObserver = new MutationObserver(() => {
      if (urlCheckScheduled) return;
      urlCheckScheduled = true;
      queueMicrotask(() => {
        urlCheckScheduled = false;
        if (window.location.href !== lastUrl) {
          lastUrl = window.location.href;
          handlePageChange();
        }
      });
    });
    navigationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("popstate", () => handlePageChange());

    // Show contextual banner on supported sites
    const hostname = window.location.hostname;
    if (SITE_CONFIGS[hostname]) {
      setTimeout(() => showContextualBanner(), BANNER_DELAY_MS);
    }
  },
});
