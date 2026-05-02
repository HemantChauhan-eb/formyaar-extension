import { SITE_CONFIGS, BANNER_DELAY_MS } from "./constants";
import { showContextualBanner } from "./panel";
import { runAutofill } from "./autofill";
export default defineContentScript({
  matches: ["*://*/*"],
  async main() {
    if (import.meta.env.DEV)
      console.log("FormYaar loaded on:", window.location.href);

    // Message listener
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === "OPEN_PANEL") {
        showContextualBanner();
      }
      if (message.type === "PAYMENT_VERIFIED") {
        runAutofill("pan_card");
      }
    });

    // Show contextual banner on supported sites
    const hostname = window.location.hostname;
    if (SITE_CONFIGS[hostname]) {
      setTimeout(() => showContextualBanner(), BANNER_DELAY_MS);
    }
  },
});
