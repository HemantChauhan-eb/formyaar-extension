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
      /* ═══ FormYaar panel — near-monochrome, one action per screen ═══
         White + ink + gray. The accent (#305eff) appears only on the one
         thing the user should press. No colored boxes, no border noise. */
      #formyaar-panel {
        --fy-accent: #305eff;
        --fy-accent-strong: #2149d9;
        --fy-accent-soft: #eef2ff;
        --fy-accent-line: rgba(48, 94, 255, 0.22);
        --fy-ink: #0c1322;
        --fy-body: #424b5e;
        --fy-muted: #8a92a3;
        --fy-faint: #b6bcc9;
        --fy-line: #edeff4;
        --fy-bg: #ffffff;
        --fy-field: #f3f5f9;
        --fy-danger: #d43c33;
        /* legacy tokens still referenced by operator screens */
        --fy-bg-alt: #f7f8fc;
        --fy-good: #157347;
        --fy-good-bg: #e8f6ee;
        --fy-good-line: #bfe5d0;
        --fy-warn: #8a6100;
        --fy-warn-bg: #fdf6e3;
        --fy-warn-line: #ecd9a0;
        --fy-danger-bg: #fdf0ef;
        --fy-danger-line: #f2c6c2;
        line-height: normal;
      }
      /* ── Reset + host-page isolation ──────────────────────────────────
         Base reset at ZERO specificity via :where(), so the panel's own class
         rules (.fy-btn padding, .fy-userform-field input padding, .fy-hdr-name
         font, …) always win. An id-scoped universal reset (#formyaar-panel *,
         specificity 1,0,0) out-specifies every single-class rule (0,1,0) and
         flattens the design — zero-padding buttons, fields jammed to the panel
         edge. The standalone preview hides this because it rescopes the reset to
         the .fy-frame *class*; production scopes by the #id, so the reset must
         drop to :where()'s zero specificity to behave the same. line-height on
         the root blocks the host page's body line-height from inheriting in.
         Prefer this over a Shadow DOM (which would force every panel-side
         document.getElementById to become shadow-root-scoped). */
      :where(#formyaar-panel) * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', 'Plus Jakarta Sans', -apple-system, sans-serif; }
      /* Form-control isolation — the design never sets these, so no conflict:
         kill inherited host font, uppercasing and native chrome. select is
         excluded from the appearance reset so it keeps its native arrow. */
      #formyaar-panel input, #formyaar-panel button, #formyaar-panel select, #formyaar-panel textarea { font-family: inherit; }
      #formyaar-panel button, #formyaar-panel input, #formyaar-panel select, #formyaar-panel textarea { text-transform: none; }
      #formyaar-panel button, #formyaar-panel input, #formyaar-panel textarea { -webkit-appearance: none; appearance: none; }
      @keyframes fy-fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes fy-spin { to { transform: rotate(360deg); } }
      @keyframes fy-successPop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
      .fy-screen { animation: fy-fadeIn 0.22s ease; }

      /* ── Header: one quiet row, hairline below ── */
      .fy-hdr { display: flex; align-items: center; gap: 10px; padding: 13px 16px; background: var(--fy-bg); border-bottom: 1px solid var(--fy-line); flex-shrink: 0; }
      .fy-hdr-brand { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
      .fy-brandmark { width: 24px; height: 24px; border-radius: 7px; background: var(--fy-accent); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .fy-hdr-name { font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif; font-weight: 800; font-size: 13px; letter-spacing: -0.3px; color: var(--fy-ink); line-height: 1.15; }
      .fy-hdr-sub { font-size: 10px; color: var(--fy-muted); font-weight: 500; margin-top: 1px; }
      .fy-hdr-back { width: 30px; height: 30px; border-radius: 9px; border: none; background: transparent; color: var(--fy-body); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: background 0.15s; }
      .fy-hdr-back:hover { background: var(--fy-field); }
      .fy-hdr-link { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 9px; border: none; background: transparent; color: var(--fy-muted); cursor: pointer; flex-shrink: 0; transition: background 0.15s, color 0.15s; text-decoration: none; font-size: 11px; font-weight: 700; }
      .fy-hdr-link:hover { background: var(--fy-field); color: var(--fy-ink); }
      /* legacy (operator screens) */
      .fy-accentbar { height: 2px; background: var(--fy-line); flex-shrink: 0; }

      /* ── Flow progress: a single hairline bar ── */
      .fy-flowbar { height: 3px; background: var(--fy-line); flex-shrink: 0; }
      .fy-flowbar-fill { height: 100%; background: var(--fy-accent); transition: width 0.35s ease; }

      /* ── Buttons: one primary per screen, everything else is text ── */
      .fy-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; font-size: 14px; padding: 14px 18px; border-radius: 12px; border: none; cursor: pointer; transition: background 0.15s, opacity 0.15s, transform 0.1s; letter-spacing: 0.1px; }
      .fy-btn:active { transform: scale(0.985); }
      .fy-btn-primary { background: var(--fy-accent); color: #fff; }
      .fy-btn-primary:hover { background: var(--fy-accent-strong); }
      .fy-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
      .fy-btn-ghost { background: var(--fy-field); color: var(--fy-body); }
      .fy-btn-ghost:hover { background: #e9ecf2; }
      .fy-btn-danger-ghost { background: transparent; color: var(--fy-danger); border: 1px solid var(--fy-danger-line); }
      .fy-btn-block { width: 100%; }
      .fy-textlink { background: transparent; border: none; color: var(--fy-muted); font-size: 11px; cursor: pointer; font-family: inherit; padding: 4px 2px; transition: color 0.15s; }
      .fy-textlink:hover { color: var(--fy-ink); }

      /* ── Quiet reassurance rows (replaces colored note boxes) ── */
      .fy-quietrow { display: flex; align-items: flex-start; gap: 9px; font-size: 11.5px; color: var(--fy-muted); line-height: 1.5; }
      .fy-quietrow svg { flex-shrink: 0; margin-top: 1px; color: var(--fy-faint); }
      .fy-quietrow strong { color: var(--fy-body); font-weight: 600; }

      /* ── Fill progress list ── */
      .fy-prog-item { display: flex; align-items: center; gap: 10px; font-size: 13px; padding: 3px 0; }
      .fy-prog-item.done { color: var(--fy-ink); font-weight: 600; }
      .fy-prog-item.done svg { color: var(--fy-good); }
      .fy-prog-item.active { color: var(--fy-accent); font-weight: 700; }
      .fy-prog-item.pending { color: var(--fy-faint); }
      .fy-prog-ring { width: 13px; height: 13px; border: 2px solid var(--fy-line); border-radius: 50%; flex-shrink: 0; }
      .fy-prog-spinner { width: 13px; height: 13px; border: 2px solid var(--fy-accent-line); border-top-color: var(--fy-accent); border-radius: 50%; animation: fy-spin 0.7s linear infinite; flex-shrink: 0; }

      /* ── Legacy classes kept for operator screens ── */
      .fy-card { background: var(--fy-bg); border: 1px solid var(--fy-line); border-radius: 13px; }
      .fy-card-hover { transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease; cursor: pointer; }
      .fy-card-hover:hover { transform: translateY(-1px); border-color: #d7dbe4 !important; box-shadow: 0 6px 18px -8px rgba(12, 19, 34, 0.14) !important; }
      .fy-kv-section { font-size: 10px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; color: var(--fy-muted); padding: 13px 2px 5px; }
      .fy-kv-card { background: var(--fy-bg-alt); border: 1px solid var(--fy-line); border-radius: 11px; padding: 3px 12px; }
      .fy-kv-row { display: flex; justify-content: space-between; gap: 10px; padding: 8.5px 0; border-bottom: 1px solid var(--fy-line); }
      .fy-kv-row:last-child { border-bottom: none; }
      .fy-kv-label { font-size: 11.5px; color: var(--fy-muted); font-weight: 500; }
      .fy-kv-value { font-size: 12.5px; color: var(--fy-ink); font-weight: 600; text-align: right; max-width: 60%; word-break: break-word; }

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
    background: #305eff;
    color: white;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    padding: 13px 8px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1.2px;
    cursor: pointer;
    z-index: ${Z_INDEX.SPOTLIGHT};
    border-radius: 10px 0 0 10px;
    box-shadow: -3px 0 14px rgba(48, 94, 255, 0.35);
    font-family: 'DM Sans', sans-serif;
    transform-origin: right center;
  `;
  tab.innerHTML =
    '<span style="font-weight:300;opacity:0.85;">Form</span><span style="font-weight:800;">Yaar</span>';

  // Gentle attention pulse — a soft breathe + glow instead of a shake.
  const pulseTab = () => {
    const t = document.getElementById("fy-tab");
    if (!t) return;
    t.style.transition = "transform 0.35s ease, box-shadow 0.35s ease";
    t.style.transform = "translateY(-50%) scale(1.12) translateX(-3px)";
    t.style.boxShadow = "-6px 0 24px rgba(48, 94, 255, 0.55)";
    setTimeout(() => {
      t.style.transform = "translateY(-50%) scale(1)";
      t.style.boxShadow = "-3px 0 14px rgba(48, 94, 255, 0.35)";
    }, 700);
    setTimeout(() => {
      t.style.transform = "translateY(-50%) scale(1.12) translateX(-3px)";
      t.style.boxShadow = "-6px 0 24px rgba(48, 94, 255, 0.55)";
    }, 1400);
    setTimeout(() => {
      t.style.transform = "translateY(-50%) scale(1)";
      t.style.boxShadow = "-3px 0 14px rgba(48, 94, 255, 0.35)";
    }, 2100);
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
