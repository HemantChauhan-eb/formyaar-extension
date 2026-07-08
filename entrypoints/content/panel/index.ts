import { ensureFontsLoaded } from "../fonts";
import { BACKEND_URL, CWS_LISTING_URL, PANEL_WIDTH, VERSION, Z_INDEX } from "../constants";
import { trackEvent } from "../telemetry";
import { attachUploadScreenHandlers } from "../uploadScreen";
import {
  renderPanelHTML,
  createTab,
  attachClickOutsideHandler,
  removeTab,
} from "./panelShell";
import {
  renderMaintenanceScreen,
  startMaintenanceCountdown,
  isVersionOutdated,
  renderUpdateScreen,
} from "./maintenance";
import { attachHomeScreenHandlers } from "./homeScreen";
import { attachPaymentScreenHandlers } from "./paymentScreen";
import { attachRecoverScreenHandlers } from "./recoverScreen";
import { attachOperatorLoginHandlers } from "./operator/loginScreen";
import {
  attachOperatorQueueHandlers,
  showOperatorPanel,
} from "./operator/queueScreen";
import { attachOperatorReviewHandlers } from "./operator/reviewScreen";

export { removeTab };
export { showOperatorPanel };
export { showFillingScreen, showVerifyScreen, updateFillProgress } from "./fillingScreen";
export { celebrateTimeSaved } from "./celebration";

export async function showContextualBanner() {
  ensureFontsLoaded();
  if (document.getElementById("formyaar-panel")) return;

  // Create panel immediately — autofill screen transitions depend on this existing at page load
  const panel = document.createElement("div");
  panel.id = "formyaar-panel";
  panel.style.cssText = `
    position: fixed;
    top: 0;
    right: -${PANEL_WIDTH}px;
    width: ${PANEL_WIDTH}px;
    height: 100vh;
    background: #ffffff;
    z-index: ${Z_INDEX.PANEL};
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    box-shadow: -4px 0 32px rgba(0,0,0,0.18);
    transition: right 0.3s ease;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;
  panel.innerHTML = renderPanelHTML();
  document.body.appendChild(panel);

  setTimeout(() => {
    panel.style.right = "0px";
  }, 100);
  trackEvent("banner_shown");
  createTab();
  attachClickOutsideHandler();
  attachPanelEventHandlers();

  // Check maintenance + min_version in background — swaps content if needed
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`${BACKEND_URL}/maintenance/status`, {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      // Version check takes priority — outdated extension can't interact anyway
      if (data.min_version && isVersionOutdated(VERSION, data.min_version)) {
        panel.innerHTML = renderUpdateScreen(VERSION, data.min_version);
        document
          .getElementById("fy-update-btn")
          ?.addEventListener("click", () => {
            window.open(CWS_LISTING_URL || "https://formyaar.in", "_blank");
          });
      } else if (data.enabled) {
        panel.innerHTML = renderMaintenanceScreen(data.back_at ?? null);
        startMaintenanceCountdown(data.back_at ?? null);
      }
    }
  } catch {
    /* treat fetch failure as neither outdated nor in maintenance */
  }
}

function attachPanelEventHandlers() {
  attachHomeScreenHandlers();
  attachPaymentScreenHandlers();
  attachRecoverScreenHandlers();
  attachUploadScreenHandlers();
  attachOperatorLoginHandlers();
  attachOperatorQueueHandlers();
  attachOperatorReviewHandlers();
}
