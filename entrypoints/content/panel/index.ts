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
import { isVersionOutdated, showMaintenance, showUpdateRequired } from "./maintenance";
import { attachHomeScreenHandlers } from "./homeScreen";
import { attachChooserHandlers } from "./chooserScreen";
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
export {
  showFillingScreen,
  showVerifyScreen,
  updateFillProgress,
  showStepReview,
  resetFillingScreenChrome,
  type ProgressItem,
} from "./fillingScreen";
export { celebrateTimeSaved } from "./celebration";

import { setView, type ViewId } from "./router";

/**
 * Build the panel and open it on `initialView`.
 *
 * The screen to open on is an argument because it is a decision, and it used
 * to be a markup default: `fy-home` shipped with `display:flex`, so the panel
 * always appeared on the home screen and whatever was supposed to be there
 * switched it afterwards. On a page that resumes a fill, that meant the home
 * screen sat visible for the second and a half before the fill began — every
 * time the URL changed, on a form the applicant had already paid for and
 * watched start.
 *
 * Every screen now starts hidden, so nothing is on display until someone says
 * what should be.
 */
export async function showContextualBanner(initialView: ViewId = "home") {
  ensureFontsLoaded();
  if (document.getElementById("formyaar-panel")) {
    // Already built. The caller still gets to say what should be showing —
    // this runs on pages where more than one thing wants the panel.
    setView(initialView, { keepCollapsed: true });
    return;
  }

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
    border-left: 1px solid #d3d8e2;
    box-shadow: -10px 0 40px rgba(12,19,34,0.16), -1px 0 0 rgba(48,94,255,0.35);
    transition: right 0.3s ease;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;
  panel.innerHTML = renderPanelHTML();
  document.body.appendChild(panel);

  // keepCollapsed so the slide-in below still animates — setView would
  // otherwise snap the panel open with no transition.
  setView(initialView, { keepCollapsed: true });

  setTimeout(() => {
    panel.style.right = "0px";
  }, 100);
  trackEvent("banner_shown");
  // The funnel's first step, and deliberately separate from banner_shown /
  // panel_opened: both of those have carried their own meaning since before
  // there was a funnel, and quietly repurposing either would change what
  // every historical row means.
  //
  // Only when home is actually what opened. It used to fire unconditionally
  // because home was always what opened — which made the funnel count a home
  // screen view on every resumed fill, where the applicant never saw one.
  if (initialView === "home") trackEvent("home_screen_view");
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
      // Both of these used to be injected with `panel.innerHTML = …`, which
      // destroyed every other screen and every handler attached to them — up
      // to 2.5 seconds after the panel appeared, and possibly mid-fill. They
      // are ordinary screens now, shown through the router.
      //
      // Version check takes priority: an outdated extension can't interact
      // anyway, so telling it about maintenance would be the lesser problem.
      if (data.min_version && isVersionOutdated(VERSION, data.min_version)) {
        showUpdateRequired(VERSION, data.min_version);
      } else if (data.enabled) {
        showMaintenance(data.back_at ?? null);
      }
    }
  } catch {
    /* treat fetch failure as neither outdated nor in maintenance */
  }
}

function attachPanelEventHandlers() {
  attachHomeScreenHandlers();
  attachChooserHandlers();
  attachPaymentScreenHandlers();
  attachRecoverScreenHandlers();
  attachUploadScreenHandlers();
  attachOperatorLoginHandlers();
  attachOperatorQueueHandlers();
  attachOperatorReviewHandlers();
}
