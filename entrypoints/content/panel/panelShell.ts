import {
  PANEL_WIDTH,
  PULSE_INITIAL_DELAY_MS,
  PULSE_INTERVAL_MS,
  Z_INDEX,
} from "../constants";
import { renderUploadScreen } from "../uploadScreen";
import { renderHomeScreen } from "./homeScreen";
import { renderPaymentScreen } from "./paymentScreen";
import { renderFillingScreen, renderVerifyScreen } from "./fillingScreen";
import { renderRecoverScreen } from "./recoverScreen";
import { USERFORM_STYLES } from "./userForm";
import { renderOperatorLoginScreen } from "./operator/loginScreen";
import { renderOperatorQueueScreen } from "./operator/queueScreen";
import { renderOperatorReviewScreen } from "./operator/reviewScreen";

export function renderPanelHTML(): string {
  return `
    <style>
      #formyaar-panel * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', -apple-system, sans-serif; }
      #formyaar-panel input { font-family: inherit; }
      #formyaar-panel button { font-family: inherit; }
      @keyframes fy-fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes fy-spin { to { transform: rotate(360deg); } }
      @keyframes fy-successPop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
      .fy-card-hover { transition: transform 0.15s ease, box-shadow 0.15s ease; cursor: pointer; }
      .fy-card-hover:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(130,28,255,0.18) !important; }
      .fy-screen { animation: fy-fadeIn 0.2s ease; }
      .fy-pay-btn:hover { opacity: 0.92; }
      ${USERFORM_STYLES}
    </style>
   ${renderHomeScreen()}
    ${renderPaymentScreen()}
    ${renderFillingScreen()}
    ${renderVerifyScreen()}
    ${renderUploadScreen()}
    ${renderRecoverScreen()}
    ${renderOperatorLoginScreen()}
${renderOperatorQueueScreen()}
${renderOperatorReviewScreen()}
  `;
}

export function createTab() {
  const tab = document.createElement("div");
  tab.id = "fy-tab";
  tab.style.cssText = `
    position: fixed;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    background: #000080;
    color: white;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    padding: 14px 8px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1.5px;
    cursor: pointer;
    z-index: ${Z_INDEX.SPOTLIGHT};
    border-radius: 8px 0 0 8px;
    box-shadow: -2px 0 12px rgba(0,0,0,0.15);
    font-family: 'DM Sans', sans-serif;
    transform-origin: right center;
  `;
  tab.innerHTML =
    '<span style="font-weight:200;opacity:0.7;">F</span><span style="color:#E8930A;font-weight:800;">·</span><span style="font-weight:800;">Y</span>';

  const pulseTab = () => {
    const t = document.getElementById("fy-tab");
    if (!t) return;
    t.style.transition = "transform 0.2s ease, box-shadow 0.2s ease";
    t.style.transform = "translateY(-50%) scale(2.0)";
    t.style.boxShadow = "-6px 0 24px rgba(0,0,128,0.5)";
    setTimeout(() => {
      t.style.transition = "transform 0.06s ease";
      t.style.transform = "translateY(-50%) scale(2.0) translateX(-8px)";
    }, 220);
    setTimeout(() => {
      t.style.transform = "translateY(-50%) scale(2.0) translateX(8px)";
    }, 280);
    setTimeout(() => {
      t.style.transform = "translateY(-50%) scale(2.0) translateX(-8px)";
    }, 340);
    setTimeout(() => {
      t.style.transform = "translateY(-50%) scale(2.0) translateX(8px)";
    }, 400);
    setTimeout(() => {
      t.style.transform = "translateY(-50%) scale(2.0) translateX(-6px)";
    }, 460);
    setTimeout(() => {
      t.style.transform = "translateY(-50%) scale(2.0) translateX(6px)";
    }, 520);
    setTimeout(() => {
      t.style.transform = "translateY(-50%) scale(2.0) translateX(0)";
    }, 580);
    setTimeout(() => {
      t.style.transition = "transform 0.3s ease, box-shadow 0.3s ease";
      t.style.transform = "translateY(-50%) scale(1)";
      t.style.boxShadow = "-2px 0 12px rgba(0,0,0,0.15)";
    }, 2000);
  };

  setTimeout(pulseTab, PULSE_INITIAL_DELAY_MS);
  const pulseInterval = setInterval(pulseTab, PULSE_INTERVAL_MS);
  (tab as any)._pulseInterval = pulseInterval;
  document.body.appendChild(tab);

  tab.addEventListener("click", () => {
    const p = document.getElementById("formyaar-panel");
    if (p)
      p.style.right = p.style.right === "0px" ? `-${PANEL_WIDTH}px` : "0px";
  });
}

export function removeTab() {
  const t = document.getElementById("fy-tab");
  if (!t) return;
  const id = (t as any)._pulseInterval;
  if (id) clearInterval(id);
  t.remove();
}

let currentClickHandler: ((e: MouseEvent) => void) | null = null;
let currentKeyHandler: ((e: KeyboardEvent) => void) | null = null;

export function attachClickOutsideHandler() {
  if (currentClickHandler) {
    document.removeEventListener("click", currentClickHandler);
  }
  currentClickHandler = (e: MouseEvent) => {
    const p = document.getElementById("formyaar-panel");
    const t = document.getElementById("fy-tab");
    if (!p || !t) return;
    const filling = document.getElementById("fy-filling");
    if (filling && filling.style.display !== "none") return;
    if (
      p.style.right === "0px" &&
      document.contains(e.target as Node) &&
      !p.contains(e.target as Node) &&
      !t.contains(e.target as Node)
    ) {
      p.style.right = `-${PANEL_WIDTH}px`;
    }
  };
  document.addEventListener("click", currentClickHandler);

  if (currentKeyHandler) {
    document.removeEventListener("keydown", currentKeyHandler);
  }
  currentKeyHandler = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    const p = document.getElementById("formyaar-panel");
    if (p && p.style.right === "0px") {
      p.style.right = `-${PANEL_WIDTH}px`;
    }
  };
  document.addEventListener("keydown", currentKeyHandler);
}
