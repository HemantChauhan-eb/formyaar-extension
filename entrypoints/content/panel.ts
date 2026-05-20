import { ensureFontsLoaded } from "./fonts";
import {
  BACKEND_URL,
  PANEL_WIDTH,
  PULSE_INITIAL_DELAY_MS,
  PULSE_INTERVAL_MS,
  Z_INDEX,
} from "./constants";
import {
  getOperatorSession,
  signInWithGoogle,
  signOut,
  signInWithToken,
  OperatorSession,
} from "./supabase";
import { runAutofill, runAutofillFromSubmission } from "./autofill";
import { trackEvent } from "./telemetry";
import {
  getUserData,
  saveUserData,
  validateUserData,
  type UserData,
  type ActiveSession,
  clearActiveSession,
} from "./userData";
import { renderUploadScreen, attachUploadScreenHandlers } from "./uploadScreen";
let currentClickHandler: ((e: MouseEvent) => void) | null = null;

export function removeTab() {
  const t = document.getElementById("fy-tab");
  if (!t) return;
  const id = (t as any)._pulseInterval;
  if (id) clearInterval(id);
  t.remove();
}

export function showContextualBanner() {
  ensureFontsLoaded();
  if (document.getElementById("formyaar-panel")) return;

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
}

function renderPanelHTML(): string {
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
      /* ===== User data collection form ===== */
.fy-userform {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}
.fy-userform-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #e5e7eb;
}
.fy-userform-back {
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #475569;
  flex-shrink: 0;
}
.fy-userform-back:hover { background: #f8fafc; }
.fy-userform-title {
  font-size: 16px;
  font-weight: 600;
  color: #111;
  line-height: 1.3;
}
.fy-userform-subtitle {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
  line-height: 1.4;
}
.fy-userform-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}
.fy-userform-section {
  margin-bottom: 24px;
}
.fy-userform-section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #94a3b8;
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f1f5f9;
}
.fy-userform-field {
  display: block;
  margin-bottom: 14px;
}
.fy-userform-field > span {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  margin-bottom: 6px;
}
.fy-userform-field em {
  color: #ef4444;
  font-style: normal;
  margin-left: 2px;
}
.fy-userform-field input[type="text"],
.fy-userform-field input[type="email"],
.fy-userform-field input[type="tel"] {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: #0f172a;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}
.fy-userform-field input:focus {
  outline: none;
  border-color: #1e3a8a;
  box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.1);
}
.fy-userform-field input.fy-error {
  border-color: #ef4444;
}
.fy-userform-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}
.fy-userform-row .fy-userform-field {
  margin-bottom: 0;
}
.fy-userform-radios {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.fy-userform-radio {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #334155;
  transition: all 0.15s;
}
.fy-userform-radio:has(input:checked) {
  border-color: #1e3a8a;
  background: #eff6ff;
  color: #1e3a8a;
  font-weight: 500;
}
.fy-userform-radio input {
  margin: 0;
  accent-color: #1e3a8a;
}
.fy-userform-hint {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
}
.fy-userform-errors {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 10px 12px;
  margin-top: 8px;
  font-size: 12px;
  color: #991b1b;
}
.fy-userform-errors ul {
  margin: 0;
  padding-left: 18px;
}
.fy-userform-errors li { margin-bottom: 2px; }
.fy-userform-footer {
  padding: 14px 20px 18px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
}
.fy-userform-submit {
  width: 100%;
  padding: 12px;
  background: #1e3a8a;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.fy-userform-submit:hover { background: #1e40af; }
.fy-userform-submit:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}
.fy-userform-privacy {
  text-align: center;
  font-size: 11px;
  color: #94a3b8;
  margin-top: 8px;
}
    </style>
   ${renderHomeScreen()}
    ${renderPaymentScreen()}
    ${renderFillingScreen()}
    ${renderVerifyScreen()}
    ${renderUploadScreen()}
    ${renderResumeScreen()}
    ${renderOperatorLoginScreen()}
${renderOperatorQueueScreen()}
${renderOperatorReviewScreen()}
  `;
}

function renderHomeScreen(): string {
  const ashokaChakra = Array.from({ length: 24 }, (_, i) => {
    const a = (i * 15 * Math.PI) / 180;
    return `<line x1="${36 + 9 * Math.cos(a)}" y1="${36 + 9 * Math.sin(a)}" x2="${36 + 27 * Math.cos(a)}" y2="${36 + 27 * Math.sin(a)}" stroke="white" stroke-width="2.5"/>`;
  }).join("");

  const flagChakra = Array.from({ length: 24 }, (_, i) => {
    const a = (i * 15 * Math.PI) / 180;
    return `<line x1="${450 + 14 * Math.cos(a)}" y1="${300 + 14 * Math.sin(a)}" x2="${450 + 82 * Math.cos(a)}" y2="${300 + 82 * Math.sin(a)}" stroke="#000080" stroke-width="9"/>`;
  }).join("");

  return `
    <div id="fy-home" class="fy-screen" style="display:flex;flex-direction:column;height:100%;">
      <div style="position:relative;background:#000080;overflow:hidden;flex-shrink:0;">
        <div style="position:absolute;right:-8px;top:-8px;pointer-events:none;opacity:0.07;">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="33" fill="none" stroke="white" stroke-width="4.3"/>
            <circle cx="36" cy="36" r="8.6" fill="white"/>
            ${ashokaChakra}
          </svg>
        </div>
        <div style="padding:13px 16px;display:flex;align-items:center;gap:10px;position:relative;z-index:1;">
          <div style="width:40px;height:27px;border-radius:5px;overflow:hidden;border:1.5px solid rgba(255,255,255,0.25);flex-shrink:0;">
            <svg viewBox="0 0 900 600" width="40" height="27">
              <rect width="900" height="200" fill="#FF9933"/>
              <rect y="200" width="900" height="200" fill="#FFFFFF"/>
              <rect y="400" width="900" height="200" fill="#138808"/>
              <circle cx="450" cy="300" r="90" fill="none" stroke="#000080" stroke-width="22"/>
              <circle cx="450" cy="300" r="14" fill="#000080"/>
              ${flagChakra}
            </svg>
          </div>
          <div style="flex:1;">
            <div style="font-weight:800;font-size:16px;letter-spacing:-0.5px;color:#ffffff;line-height:1.2;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
              <span style="font-weight:200;color:rgba(255,255,255,0.7);">Form</span><span style="color:#E8930A;font-weight:800;">·</span><span style="font-weight:800;color:#ffffff;">Yaar</span>
            </div>
            <div style="font-size:10.5px;color:#aabbd4;font-weight:500;letter-spacing:0.3px;">Your dost for every sarkari kaam</div>
          </div>
          <a href="https://formyaar.in/contact" target="_blank" style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.13);border-radius:7px;padding:5px 10px;text-decoration:none;border:1px solid rgba(255,255,255,0.18);">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span style="font-size:11px;color:white;font-weight:700;opacity:0.9;">Help</span>
          </a>
        </div>
        <div style="height:3px;display:flex;">
          <div style="flex:1;background:#FF9933;"></div>
          <div style="flex:1;background:#ffffff;"></div>
          <div style="flex:1;background:#138808;"></div>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:18px 16px 20px;position:relative;">
        <svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 640">
          <defs>
            <radialGradient id="fy-wm1" cx="0%" cy="0%"><stop offset="0%" stop-color="#FF9933" stop-opacity="0.07"/><stop offset="100%" stop-color="#FF9933" stop-opacity="0"/></radialGradient>
            <radialGradient id="fy-wm2" cx="100%" cy="100%"><stop offset="0%" stop-color="#138808" stop-opacity="0.07"/><stop offset="100%" stop-color="#138808" stop-opacity="0"/></radialGradient>
          </defs>
          <ellipse cx="0" cy="0" rx="220" ry="160" fill="url(#fy-wm1)"/>
          <ellipse cx="400" cy="640" rx="220" ry="160" fill="url(#fy-wm2)"/>
        </svg>
        <div style="position:relative;z-index:1;">
          <p style="text-align:center;font-size:12.5px;color:#50507a;margin-bottom:16px;font-weight:500;letter-spacing:0.2px;">
            Select a government document to get started
          </p>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
            ${renderPanCard()}
            ${renderLockedCard("Aadhaar", renderAadhaarIcon())}
            ${renderLockedCard("Driving License", renderDLIcon())}
            ${renderLockedCard("Voter ID", renderVoterIcon())}
            ${renderLockedCard("Passport", renderPassportIcon())}
            ${renderLockedCard("Visa", renderVisaIcon())}
          </div>
          <div style="margin-top:12px;text-align:center;">
            <span style="font-size:10.5px;color:#50507a;font-weight:500;opacity:0.7;">+ More services coming soon — Passport, VISA &amp; more</span>
          </div>
          <div style="margin-top:14px;background:rgba(130,28,255,0.05);border:1.5px solid rgba(130,28,255,0.13);border-radius:12px;padding:12px 13px;display:flex;gap:10px;align-items:flex-start;">
            <div style="flex-shrink:0;margin-top:1px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#821cff" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </div>
            <div>
              <div style="font-size:12px;color:#0a0a2e;font-weight:600;margin-bottom:3px;">New to FormYaar?</div>
              <div style="font-size:11px;color:#50507a;line-height:1.5;">We guide you through every field — no agent, no confusion. Takes 10 mins.</div>
              <a href="https://formyaar.in" target="_blank" style="font-size:11px;color:#821cff;font-weight:700;text-decoration:none;margin-top:5px;display:inline-block;">Visit formyaar.in to learn more →</a>
            </div>
          </div>
          <div style="margin-top:12px;background:#f0f8ff;border:1px solid #bfd4ec;border-radius:10px;padding:9px 13px;display:flex;align-items:center;gap:8px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            <span style="font-size:11px;color:#50507a;font-weight:500;">We <strong style="color:#0a0a2e;">never store your information</strong></span>
          </div>
        </div>
        <div style="margin-top:12px;text-align:center;">
  <button id="fy-operator-mode" style="background:transparent;border:none;color:#94a3b8;font-size:11px;cursor:pointer;font-family:inherit;text-decoration:underline;">
    Cafe operator? Sign in here
  </button>
</div>
        <div style="margin-top:10px;padding:6px 4px;text-align:center;display:flex;align-items:flex-start;gap:6px;justify-content:center;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2.2" stroke-linecap="round" style="flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <p style="font-size:9.5px;color:#aaa;line-height:1.5;font-weight:400;text-align:left;">Not affiliated with any government entity. FormYaar is a private service that helps you fill forms with ease.</p>
        </div>
      </div>
    </div>
  `;
}

function renderPanCard(): string {
  return `
    <button id="fy-pan-card" class="fy-card-hover" style="background:#ffffff;border:1.5px solid #821cff;border-radius:13px;padding:14px 6px 12px;display:flex;flex-direction:column;align-items:center;gap:8px;box-shadow:0 2px 14px rgba(130,28,255,0.1);position:relative;text-align:center;width:100%;">
      <svg viewBox="0 0 84 54" width="62" height="40">
        <defs>
          <linearGradient id="fy-pcBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#7bbde8"/><stop offset="55%" stop-color="#a8c8f0"/><stop offset="100%" stop-color="#c0a8e8"/>
          </linearGradient>
          <linearGradient id="fy-pcGold" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#f5d060"/><stop offset="100%" stop-color="#b8850a"/>
          </linearGradient>
        </defs>
        <rect width="84" height="54" rx="4" fill="url(#fy-pcBg)"/>
        <rect width="84" height="54" rx="4" fill="none" stroke="#5aadd4" stroke-width="0.8"/>
        <rect width="84" height="18" rx="4" fill="#72c0e4" opacity="0.45"/>
        <rect y="14" width="84" height="4" fill="#72c0e4" opacity="0.45"/>
        <text x="3" y="7" font-size="4.2" fill="#00205b" font-weight="bold" font-family="Arial">INCOME TAX</text>
        <text x="3" y="13" font-size="3.4" fill="#00307a" font-family="Arial">DEPARTMENT</text>
        <text x="81" y="7" font-size="4.2" fill="#00205b" font-weight="bold" font-family="Arial" text-anchor="end">GOVT. OF INDIA</text>
        <circle cx="42" cy="9" r="7" fill="url(#fy-pcGold)"/>
        <circle cx="42" cy="9" r="6" fill="none" stroke="#7a5500" stroke-width="0.7"/>
        <text x="42" y="23" font-size="3.2" fill="#003087" font-family="Arial" text-anchor="middle" font-style="italic">Permanent Account Number Card</text>
        <text x="36" y="32" font-size="8.5" fill="#00205b" font-weight="bold" font-family="'Courier New'" letter-spacing="0.8">AAAAA1234A</text>
        <text x="3" y="38" font-size="2.8" fill="#336688" font-family="Arial">Name / नाम</text>
        <rect x="3" y="39.5" width="44" height="2.2" rx="1.1" fill="#003087" opacity="0.2"/>
        <text x="3" y="45" font-size="2.4" fill="#336688" font-family="Arial">Father's Name</text>
        <rect x="3" y="46.5" width="40" height="1.8" rx="0.9" fill="#003087" opacity="0.2"/>
        <text x="3" y="52" font-size="2.4" fill="#336688" font-family="Arial">DOB: DD/MM/YYYY</text>
        <rect x="65" y="22" width="16" height="20" rx="2" fill="white" stroke="#7aafc8" stroke-width="0.9"/>
        <text x="73" y="31" font-size="2.4" fill="#bbb" text-anchor="middle" font-family="Arial">CARD</text>
        <text x="73" y="34.5" font-size="2.4" fill="#bbb" text-anchor="middle" font-family="Arial">HOLDER</text>
        <text x="73" y="38" font-size="2.4" fill="#bbb" text-anchor="middle" font-family="Arial">PHOTO</text>
      </svg>
      <div>
        <div style="font-size:10.5px;font-weight:700;color:#0a0a2e;line-height:1.25;">PAN Card</div>
        <div style="font-size:9.5px;color:#821cff;margin-top:2px;font-weight:600;">New / Correction</div>
      </div>
    </button>
  `;
}

function renderLockedCard(name: string, iconSVG: string): string {
  return `
    <button style="background:#f2f2f8;border:1.5px solid #e0e0f0;border-radius:13px;padding:14px 6px 12px;display:flex;flex-direction:column;align-items:center;gap:8px;opacity:0.6;cursor:not-allowed;position:relative;text-align:center;width:100%;">
      <div style="position:absolute;top:7px;right:7px;color:#b0b0c0;">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </div>
      ${iconSVG}
      <div><div style="font-size:10.5px;font-weight:700;color:#a0a0b8;">${name}</div><div style="font-size:9.5px;color:#b8b8cc;margin-top:2px;font-weight:600;">Coming Soon</div></div>
    </button>
  `;
}

function renderAadhaarIcon(): string {
  return `<svg viewBox="0 0 84 54" width="62" height="40" xmlns="http://www.w3.org/2000/svg">
    <rect width="84" height="54" rx="4" fill="#fbf6ee"/>
    <rect width="84" height="54" rx="4" fill="none" stroke="#d8cdb8" stroke-width="0.8"/>
    <rect x="14" y="4" width="44" height="4" rx="1" fill="#f08a1c"/>
    <rect x="14" y="9.5" width="44" height="4" rx="1" fill="#1a8a3a"/>
    <circle cx="7" cy="8.5" r="4" fill="#fbf6ee" stroke="#9a8a6a" stroke-width="0.7"/>
    <circle cx="7" cy="8.5" r="2.2" fill="none" stroke="#9a8a6a" stroke-width="0.5"/>
    <circle cx="7" cy="8.5" r="0.9" fill="#9a8a6a"/>
    <g transform="translate(72,8.5)">
      <g stroke="#d94b3a" stroke-width="0.9" stroke-linecap="round" fill="none">
        <line x1="0" y1="-7" x2="0" y2="-5"/><line x1="5" y1="-5" x2="3.7" y2="-3.7"/>
        <line x1="7" y1="0" x2="5" y2="0"/><line x1="-5" y1="-5" x2="-3.7" y2="-3.7"/>
        <line x1="-7" y1="0" x2="-5" y2="0"/><line x1="3.5" y1="-6" x2="2.5" y2="-4.5"/>
        <line x1="-3.5" y1="-6" x2="-2.5" y2="-4.5"/>
      </g>
      <path d="M-4 1 Q-4 -3 0 -3 Q4 -3 4 1" stroke="#d94b3a" stroke-width="1.1" fill="none" stroke-linecap="round"/>
      <path d="M-2.6 1 Q-2.6 -1.6 0 -1.6 Q2.6 -1.6 2.6 1" stroke="#d94b3a" stroke-width="1" fill="none" stroke-linecap="round"/>
      <path d="M-1.3 1 Q-1.3 -0.4 0 -0.4 Q1.3 -0.4 1.3 1" stroke="#d94b3a" stroke-width="0.9" fill="none" stroke-linecap="round"/>
    </g>
    <rect x="4" y="20" width="18" height="22" rx="1.5" fill="#e8e0d0" stroke="#bfb39a" stroke-width="0.6"/>
    <circle cx="13" cy="28" r="3.2" fill="#b8ac92"/>
    <path d="M6.5 41 Q13 32 19.5 41 Z" fill="#b8ac92"/>
    <rect x="25" y="21" width="28" height="2" rx="0.8" fill="#bfb39a"/>
    <rect x="25" y="25" width="22" height="1.6" rx="0.6" fill="#cfc4ad"/>
    <rect x="25" y="28.5" width="24" height="1.6" rx="0.6" fill="#cfc4ad"/>
    <rect x="25" y="32" width="18" height="1.6" rx="0.6" fill="#cfc4ad"/>
    <text x="25" y="42" font-size="6" fill="#1f1f1f" font-weight="bold" font-family="'Courier New',monospace" letter-spacing="0.6">XXXX XXXX XXXX</text>
    <rect x="64" y="26" width="16" height="16" rx="1" fill="#fff" stroke="#9a8a6a" stroke-width="0.5"/>
    <g fill="#1f1f1f">
      <rect x="65.5" y="27.5" width="3.5" height="3.5"/><rect x="75" y="27.5" width="3.5" height="3.5"/>
      <rect x="65.5" y="37" width="3.5" height="3.5"/><rect x="70" y="29" width="1.2" height="1.2"/>
      <rect x="72" y="30.5" width="1.2" height="1.2"/><rect x="70" y="32" width="1.2" height="1.2"/>
      <rect x="73" y="33.5" width="1.2" height="1.2"/><rect x="71" y="35" width="1.2" height="1.2"/>
      <rect x="73.5" y="36.5" width="1.2" height="1.2"/><rect x="70" y="38.5" width="1.2" height="1.2"/>
    </g>
    <rect x="0" y="49" width="84" height="1" fill="#d94b3a"/>
  </svg>`;
}

function renderDLIcon(): string {
  return `<svg viewBox="0 0 84 54" width="62" height="40" xmlns="http://www.w3.org/2000/svg">
    <rect width="84" height="54" rx="4" fill="#f7f3ec"/>
    <rect width="84" height="54" rx="4" fill="none" stroke="#c9bfa8" stroke-width="0.8"/>
    <rect x="0" y="0" width="84" height="11" rx="4" fill="#b81d24"/>
    <rect x="0" y="7" width="84" height="4" fill="#b81d24"/>
    <text x="42" y="5" font-size="3" fill="#fff" font-weight="bold" font-family="Arial,sans-serif" text-anchor="middle">UNION OF INDIA</text>
    <text x="42" y="9.5" font-size="3.4" fill="#fff" font-weight="bold" font-family="Arial,sans-serif" text-anchor="middle">DRIVING LICENCE</text>
    <circle cx="5" cy="5.5" r="3.5" fill="#fff" stroke="#7a1015" stroke-width="0.5"/>
    <circle cx="5" cy="5.5" r="1.6" fill="none" stroke="#7a1015" stroke-width="0.4"/>
    <circle cx="5" cy="5.5" r="0.6" fill="#7a1015"/>
    <g transform="translate(79,5.5)" fill="none" stroke="#7a1015" stroke-width="0.5">
      <circle r="3.4" fill="#fff"/><circle r="1.6"/><circle r="0.5" fill="#7a1015" stroke="none"/>
      <g stroke-width="0.6">
        <line x1="0" y1="-3.4" x2="0" y2="-2.2"/><line x1="0" y1="2.2" x2="0" y2="3.4"/>
        <line x1="-3.4" y1="0" x2="-2.2" y2="0"/><line x1="2.2" y1="0" x2="3.4" y2="0"/>
        <line x1="-2.4" y1="-2.4" x2="-1.6" y2="-1.6"/><line x1="2.4" y1="-2.4" x2="1.6" y2="-1.6"/>
        <line x1="-2.4" y1="2.4" x2="-1.6" y2="1.6"/><line x1="2.4" y1="2.4" x2="1.6" y2="1.6"/>
      </g>
    </g>
    <text x="3" y="16" font-size="2.6" fill="#444" font-family="Arial,sans-serif" font-weight="bold">DL No</text>
    <rect x="11" y="14" width="22" height="2.4" rx="0.5" fill="#555" opacity="0.25"/>
    <text x="50" y="16" font-size="2.6" fill="#444" font-family="Arial,sans-serif" font-weight="bold">DOI</text>
    <rect x="55" y="14" width="20" height="2.4" rx="0.5" fill="#555" opacity="0.25"/>
    <g transform="translate(6,22)">
      <rect width="11" height="9" rx="1.2" fill="#d4af37" stroke="#8a6f1f" stroke-width="0.4"/>
      <line x1="0" y1="3" x2="11" y2="3" stroke="#8a6f1f" stroke-width="0.3"/>
      <line x1="0" y1="6" x2="11" y2="6" stroke="#8a6f1f" stroke-width="0.3"/>
      <line x1="3.5" y1="0" x2="3.5" y2="9" stroke="#8a6f1f" stroke-width="0.3"/>
      <line x1="7.5" y1="0" x2="7.5" y2="9" stroke="#8a6f1f" stroke-width="0.3"/>
    </g>
    <rect x="65" y="20" width="15" height="19" rx="1" fill="#e6dfd0" stroke="#bfb39a" stroke-width="0.5"/>
    <circle cx="72.5" cy="27" r="2.6" fill="#b8ac92"/>
    <path d="M67 38 Q72.5 31.5 78 38 Z" fill="#b8ac92"/>
    <rect x="3" y="43.5" width="40" height="2" rx="0.5" fill="#555" opacity="0.3"/>
    <line x1="3" y1="50" x2="30" y2="50" stroke="#444" stroke-width="0.4"/>
    <path d="M5 49 q3 -2 6 0 t6 0 t6 0" stroke="#1a3b8a" stroke-width="0.5" fill="none"/>
  </svg>`;
}

function renderVoterIcon(): string {
  return `<svg viewBox="0 0 84 54" width="62" height="40" xmlns="http://www.w3.org/2000/svg">
    <rect width="84" height="54" rx="4" fill="#f3ead4"/>
    <rect width="84" height="54" rx="4" fill="none" stroke="#cdb98a" stroke-width="0.8"/>
    <circle cx="42" cy="30" r="22" fill="#2e7a3a" opacity="0.07"/>
    <circle cx="42" cy="30" r="14" fill="none" stroke="#2e7a3a" stroke-width="0.4" opacity="0.25"/>
    <path d="M0 4 H84 V13 H0 Z" fill="#2e7a3a" opacity="0.12"/>
    <text x="42" y="6.5" font-size="2.6" fill="#1a4a22" font-weight="bold" font-family="Arial,sans-serif" text-anchor="middle">भारत निर्वाचन आयोग</text>
    <text x="42" y="10" font-size="2.8" fill="#1a4a22" font-weight="bold" font-family="Arial,sans-serif" text-anchor="middle">ELECTION COMMISSION OF INDIA</text>
    <text x="3" y="15.5" font-size="2.2" fill="#1a4a22" font-family="Arial,sans-serif">मतदाता फोटो पहचान पत्र</text>
    <text x="81" y="15.5" font-size="2.2" fill="#1a4a22" font-weight="bold" font-family="Arial,sans-serif" text-anchor="end">ELECTOR PHOTO IDENTITY CARD</text>
    <line x1="3" y1="17" x2="81" y2="17" stroke="#d9692a" stroke-width="0.4"/>
    <rect x="6" y="20" width="16" height="20" rx="1" fill="#e2d9bf" stroke="#a89766" stroke-width="0.5"/>
    <circle cx="14" cy="27" r="2.8" fill="#9e8d63"/>
    <path d="M8 39 Q14 31.5 20 39 Z" fill="#9e8d63"/>
    <g transform="translate(26,21)" fill="#1a1a1a">
      <rect x="0" y="0" width="0.6" height="9"/><rect x="1.2" y="0" width="0.4" height="9"/>
      <rect x="2.2" y="0" width="0.8" height="9"/><rect x="3.6" y="0" width="0.4" height="9"/>
      <rect x="4.4" y="0" width="0.6" height="9"/><rect x="5.6" y="0" width="0.3" height="9"/>
      <rect x="6.4" y="0" width="0.7" height="9"/><rect x="7.6" y="0" width="0.4" height="9"/>
      <rect x="8.4" y="0" width="0.6" height="9"/><rect x="9.6" y="0" width="0.4" height="9"/>
      <rect x="10.4" y="0" width="0.8" height="9"/><rect x="11.8" y="0" width="0.4" height="9"/>
    </g>
    <rect x="0" y="52" width="84" height="2" fill="#d9692a" opacity="0.85"/>
  </svg>`;
}

function renderPassportIcon(): string {
  return `<svg viewBox="0 0 84 54" width="62" height="40" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fy-ppNavy" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0e1a3a"/><stop offset="100%" stop-color="#1a2750"/>
      </linearGradient>
      <linearGradient id="fy-ppGold" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#e6c87a"/><stop offset="100%" stop-color="#a07e2e"/>
      </linearGradient>
    </defs>
    <rect width="84" height="54" rx="3" fill="url(#fy-ppNavy)"/>
    <rect x="0" y="0" width="3.5" height="54" fill="#0a1230" opacity="0.6"/>
    <rect x="3.5" y="0" width="0.5" height="54" fill="#2a3868" opacity="0.6"/>
    <rect x="6" y="3" width="74" height="48" rx="1.5" fill="none" stroke="#a07e2e" stroke-width="0.3" opacity="0.7"/>
    <text x="46" y="11" font-size="3.4" fill="url(#fy-ppGold)" font-family="Arial,sans-serif" text-anchor="middle">पासपोर्ट</text>
    <text x="46" y="16.5" font-size="4.4" fill="url(#fy-ppGold)" font-family="Georgia,serif" letter-spacing="1.2" text-anchor="middle" font-weight="bold">PASSPORT</text>
    <g transform="translate(46,32)" fill="url(#fy-ppGold)" opacity="0.95">
      <rect x="-7" y="6" width="14" height="1.2" rx="0.3"/>
      <rect x="-6" y="4.5" width="12" height="1.2" rx="0.3"/>
      <rect x="-4.5" y="-1" width="9" height="5.5" rx="0.5"/>
      <circle cx="-3" cy="-3" r="1.6"/><circle cx="0" cy="-4" r="1.8"/><circle cx="3" cy="-3" r="1.6"/>
      <path d="M-4 -5.5 Q0 -7.5 4 -5.5" stroke="url(#fy-ppGold)" stroke-width="0.5" fill="none"/>
    </g>
    <text x="46" y="48" font-size="3" fill="url(#fy-ppGold)" font-family="Arial,sans-serif" text-anchor="middle">भारत गणराज्य</text>
    <text x="46" y="52" font-size="3.4" fill="url(#fy-ppGold)" font-family="Georgia,serif" letter-spacing="0.8" text-anchor="middle" font-weight="bold">REPUBLIC OF INDIA</text>
  </svg>`;
}

function renderVisaIcon(): string {
  return `<svg viewBox="0 0 84 54" width="62" height="40" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fy-vsBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#dceaf6"/><stop offset="55%" stop-color="#f0e0ec"/><stop offset="100%" stop-color="#f5d5e0"/>
      </linearGradient>
    </defs>
    <rect width="84" height="54" rx="3" fill="url(#fy-vsBg)"/>
    <rect width="84" height="54" rx="3" fill="none" stroke="#b8a8c4" stroke-width="0.6"/>
    <g fill="none" stroke="#9aa8c4" stroke-width="0.25" opacity="0.45">
      <circle cx="14" cy="40" r="10"/><circle cx="14" cy="40" r="6.5"/>
      <circle cx="70" cy="44" r="11"/><circle cx="70" cy="44" r="7"/><circle cx="70" cy="44" r="3.5"/>
    </g>
    <g transform="translate(3,3)">
      <rect width="9" height="9" rx="1" fill="#fff" stroke="#5a7aa8" stroke-width="0.4"/>
      <rect x="1" y="1" width="3" height="3" fill="#1a1a1a"/>
      <rect x="5" y="1" width="3" height="3" fill="#1a1a1a"/>
      <rect x="1" y="5" width="3" height="3" fill="#1a1a1a"/>
      <rect x="2" y="6" width="1" height="1" fill="#fff"/>
      <text x="4.5" y="13" font-size="2.4" fill="#1a3a7a" font-weight="bold" font-family="Arial,sans-serif" text-anchor="middle">VISA</text>
    </g>
    <text x="16" y="6.5" font-size="2.6" fill="#1a1a1a" font-weight="bold" font-family="Arial,sans-serif">भारत गणराज्य</text>
    <text x="32" y="6.5" font-size="2.8" fill="#1a1a1a" font-weight="bold" font-family="Arial,sans-serif">REPUBLIC OF INDIA</text>
    <text x="60" y="14.5" font-size="8.5" fill="#d63384" font-weight="bold" font-family="Georgia,serif" letter-spacing="1">VISA</text>
    <rect x="3" y="20" width="14" height="17" rx="0.8" fill="#b88a6a" opacity="0.7" stroke="#7a5238" stroke-width="0.4"/>
    <rect x="0" y="42" width="84" height="12" fill="#f7eef0" opacity="0.6"/>
    <text x="3" y="47" font-size="3" fill="#1a1a1a" font-family="'Courier New',monospace" letter-spacing="0.4">VXIND&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
    <text x="3" y="51.5" font-size="3" fill="#1a1a1a" font-family="'Courier New',monospace" letter-spacing="0.4">7206292M2105150IND&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;9</text>
  </svg>`;
}
function renderOperatorLoginScreen(): string {
  return `
    <div id="fy-operator-login" class="fy-screen" style="display:none;flex-direction:column;height:100%;">
      <div style="position:relative;background:#000080;overflow:hidden;flex-shrink:0;">
        <div style="padding:13px 16px;display:flex;align-items:center;gap:10px;position:relative;z-index:1;">
          <div style="flex:1;text-align:center;">
            <div style="font-weight:800;font-size:16px;letter-spacing:-0.5px;color:#ffffff;line-height:1.2;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
              <span style="font-weight:200;color:rgba(255,255,255,0.7);">Form</span><span style="color:#E8930A;font-weight:800;">·</span><span style="font-weight:800;color:#ffffff;">Yaar</span>
            </div>
            <div style="font-size:10.5px;color:#aabbd4;font-weight:500;">Operator Portal</div>
          </div>
        </div>
        <div style="height:3px;display:flex;"><div style="flex:1;background:#FF9933;"></div><div style="flex:1;background:#ffffff;"></div><div style="flex:1;background:#138808;"></div></div>
      </div>

      <div style="flex:1;display:flex;flex-direction:column;padding:24px 20px;gap:14px;">
        <div style="text-align:center;margin-bottom:6px;">
          <div style="font-size:40px;margin-bottom:10px;">🏪</div>
          <div style="font-size:17px;font-weight:800;color:#0a0a2e;margin-bottom:5px;">Operator Sign In</div>
          <div style="font-size:12px;color:#50507a;line-height:1.6;">Go to your FormYaar dashboard, open Settings, and generate a token. Paste it below.</div>
        </div>

        <button id="fy-open-operator-login" style="width:100%;padding:12px 16px;background:#f8fafc;color:#000080;border:1.5px solid #e0e0f0;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000080" stroke-width="2.2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open Dashboard
        </button>

        <div style="display:flex;align-items:center;gap:8px;margin:2px 0;">
          <div style="flex:1;height:1px;background:#e5e7eb;"></div>
          <span style="font-size:11px;color:#94a3b8;font-weight:500;">paste your token below</span>
          <div style="flex:1;height:1px;background:#e5e7eb;"></div>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;">
          <input
            id="fy-token-input"
            type="text"
            placeholder="e.g. K7XQ3MNPLVRB"
            maxlength="12"
            style="width:100%;padding:14px;border:1.5px solid #e0e0f0;border-radius:10px;font-size:20px;font-family:monospace;font-weight:800;letter-spacing:3px;color:#000080;text-align:center;text-transform:uppercase;outline:none;"
          />
          <button id="fy-token-submit" style="width:100%;padding:11px;background:#000080;color:white;border:none;border-radius:10px;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit;">
            Connect Extension
          </button>
        </div>

        <div id="fy-token-error" style="display:none;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:9px 12px;font-size:12px;color:#991b1b;text-align:center;"></div>

        <div style="font-size:11px;color:#94a3b8;text-align:center;line-height:1.5;margin-top:auto;">
          Only for cafe operators with a FormYaar subscription.
        </div>
      </div>
    </div>
  `;
}
function renderOperatorQueueScreen(): string {
  return `
    <div id="fy-operator-queue" class="fy-screen" style="display:none;flex-direction:column;height:100%;">
      <div style="position:relative;background:#000080;overflow:hidden;flex-shrink:0;">
        <div style="padding:13px 16px;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1;">
<div>
    <div style="font-weight:800;font-size:16px;letter-spacing:-0.5px;color:#ffffff;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
      <span style="font-weight:200;color:rgba(255,255,255,0.7);">Form</span><span style="color:#E8930A;">·</span><span>Yaar</span>
    </div>
    <div style="font-size:10.5px;color:#aabbd4;font-weight:500;">Operator Queue</div>
  </div>
  <div style="display:flex;align-items:center;gap:8px;">
    <button id="fy-queue-refresh" style="background:rgba(255,255,255,0.13);border:1px solid rgba(255,255,255,0.18);border-radius:7px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
      <svg id="fy-refresh-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
    </button>
    <button id="fy-operator-signout" style="background:rgba(255,255,255,0.13);border:1px solid rgba(255,255,255,0.18);border-radius:7px;padding:5px 10px;color:white;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;">
      Sign out
    </button>
  </div>
</div>
        <div style="height:3px;display:flex;"><div style="flex:1;background:#FF9933;"></div><div style="flex:1;background:#ffffff;"></div><div style="flex:1;background:#138808;"></div></div>
      </div>

      <div style="flex:1;overflow-y:auto;padding:14px 12px;">
        <div id="fy-queue-list" style="display:flex;flex-direction:column;gap:8px;">
          <div style="text-align:center;color:#94a3b8;font-size:13px;padding:40px 20px;">
            Loading queue...
          </div>
        </div>
      </div>
    </div>
  `;
}
function renderOperatorReviewScreen(): string {
  return `
    <div id="fy-operator-review" class="fy-screen" style="display:none;flex-direction:column;height:100%;">
      <div style="position:relative;background:#000080;overflow:hidden;flex-shrink:0;">
        <div style="padding:13px 16px;display:flex;align-items:center;gap:10px;position:relative;z-index:1;">
          <button id="fy-review-back" style="background:none;border:none;cursor:pointer;color:white;display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:600;opacity:0.9;padding:4px 0;font-family:inherit;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Queue
          </button>
          <div style="flex:1;text-align:center;">
            <div style="font-weight:800;font-size:16px;letter-spacing:-0.5px;color:#ffffff;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
              <span style="font-weight:200;color:rgba(255,255,255,0.7);">Form</span><span style="color:#E8930A;">·</span><span>Yaar</span>
            </div>
            <div style="font-size:10.5px;color:#aabbd4;font-weight:500;">Review Form</div>
          </div>
          <div style="width:60px;"></div>
        </div>
        <div style="height:3px;display:flex;"><div style="flex:1;background:#FF9933;"></div><div style="flex:1;background:#ffffff;"></div><div style="flex:1;background:#138808;"></div></div>
      </div>

      <div id="fy-review-body" style="flex:1;overflow-y:auto;padding:16px;">
        <!-- Populated dynamically -->
      </div>

      <div style="padding:12px 16px;border-top:1px solid #e5e7eb;background:#fafafa;display:flex;gap:8px;">
        <button id="fy-review-reject" style="flex:1;padding:11px;background:#fff;color:#ef4444;border:1.5px solid #ef4444;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
          Reject
        </button>
        <button id="fy-review-accept" style="flex:2;padding:11px;background:#000080;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
          Accept & Fill
        </button>
      </div>
    </div>
  `;
}
function renderPaymentScreen(): string {
  const ashokaChakra = Array.from({ length: 24 }, (_, i) => {
    const a = (i * 15 * Math.PI) / 180;
    return `<line x1="${36 + 9 * Math.cos(a)}" y1="${36 + 9 * Math.sin(a)}" x2="${36 + 27 * Math.cos(a)}" y2="${36 + 27 * Math.sin(a)}" stroke="white" stroke-width="2.5"/>`;
  }).join("");

  return `
    <div id="fy-payment" class="fy-screen" style="display:none;flex-direction:column;height:100%;">
      <div style="position:relative;background:#000080;overflow:hidden;flex-shrink:0;">
        <div style="position:absolute;right:-8px;top:-8px;pointer-events:none;opacity:0.07;">
          <svg width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="33" fill="none" stroke="white" stroke-width="4.3"/><circle cx="36" cy="36" r="8.6" fill="white"/>${ashokaChakra}</svg>
        </div>
        <div style="padding:13px 16px;display:flex;align-items:center;gap:10px;position:relative;z-index:1;">
          <button id="fy-back-btn" style="background:none;border:none;cursor:pointer;color:white;display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:600;opacity:0.9;padding:4px 0;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <div style="flex:1;text-align:center;">
            <div style="font-weight:800;font-size:16px;letter-spacing:-0.5px;color:#ffffff;line-height:1.2;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
              <span style="font-weight:200;color:rgba(255,255,255,0.7);">Form</span><span style="color:#E8930A;font-weight:800;">·</span><span style="font-weight:800;color:#ffffff;">Yaar</span>
            </div>
            <div style="font-size:10.5px;color:#aabbd4;font-weight:500;">Secure Payment</div>
          </div>
          <div style="width:60px;"></div>
        </div>
        <div style="height:3px;display:flex;">
          <div style="flex:1;background:#FF9933;"></div>
          <div style="flex:1;background:#ffffff;"></div>
          <div style="flex:1;background:#138808;"></div>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:18px 16px 24px;position:relative;">
        <div style="position:relative;z-index:1;">
          <div style="background:linear-gradient(135deg,#000080 0%,#000060 100%);border-radius:14px;padding:22px 20px;color:#fff;margin-bottom:20px;position:relative;overflow:hidden;">
            <div style="position:absolute;right:-14px;top:-14px;pointer-events:none;opacity:0.1;">
              <svg width="90" height="90" viewBox="0 0 90 90"><circle cx="45" cy="45" r="41" fill="none" stroke="white" stroke-width="5.4"/><circle cx="45" cy="45" r="10.8" fill="white"/></svg>
            </div>
            <div style="font-size:11px;opacity:0.8;font-weight:500;letter-spacing:0.3px;">PAN CARD — NEW APPLICATION</div>
            <div style="font-size:36px;font-weight:800;margin-top:6px;letter-spacing:-0.5px;">₹29</div>
            <div style="font-size:10.5px;opacity:0.72;margin-top:6px;">Govt. fee ₹93 + Service fee ₹14 (incl. GST)</div>
            <div style="margin-top:12px;display:flex;gap:10px;">
              <div style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.15);border-radius:20px;padding:4px 10px;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                <span style="font-size:10px;font-weight:600;">PCI Compliant</span>
              </div>
              <div style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.15);border-radius:20px;padding:4px 10px;">
                <span style="font-size:10px;font-weight:600;">🔒 SSL Secured</span>
              </div>
            </div>
          </div>
          <p style="font-size:12.5px;color:#50507a;text-align:center;margin-bottom:16px;">You will be redirected to a secure Razorpay page to complete payment.</p>
          <button id="fy-pay-btn" class="fy-pay-btn" style="width:100%;padding:14px;background:#000080;color:#fff;border:none;border-radius:12px;font-weight:800;font-size:15px;cursor:pointer;box-shadow:0 5px 20px rgba(0,0,128,0.27);transition:all 0.2s ease;letter-spacing:0.3px;display:flex;align-items:center;justify-content:center;gap:8px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            Pay ₹29 Securely
          </button>
          <div style="text-align:center;margin-top:10px;font-size:10.5px;color:#aaa;font-weight:500;">
            By paying you agree to FormYaar's Terms &amp; Privacy Policy
          </div>
        </div>
      </div>
    </div>
  `;
}
function renderUserFormScreen(form: string, data: UserData): string {
  const formLabel = form === "pan_card" ? "PAN Card" : form;

  return `
    <div class="fy-userform">
      <div class="fy-userform-header">
        <button class="fy-userform-back" id="fy-userform-back" aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <div class="fy-userform-title">Your details for ${formLabel}</div>
          <div class="fy-userform-subtitle">We'll use this to auto-fill the form. Saved locally on your device.</div>
        </div>
      </div>

      <div class="fy-userform-body">
        <div class="fy-userform-section">
          <div class="fy-userform-section-title">About you</div>

          <div class="fy-userform-row">
            <label class="fy-userform-field">
              <span>First name <em>*</em></span>
              <input type="text" data-field="first_name" value="${escapeHtml(data.first_name)}" placeholder="HEMANT" autocomplete="off">
            </label>
            <label class="fy-userform-field">
              <span>Middle name</span>
              <input type="text" data-field="middle_name" value="${escapeHtml(data.middle_name)}" placeholder="(optional)" autocomplete="off">
            </label>
          </div>

          <label class="fy-userform-field">
            <span>Last name <em>*</em></span>
            <input type="text" data-field="last_name" value="${escapeHtml(data.last_name)}" placeholder="CHAUHAN" autocomplete="off">
          </label>

          <label class="fy-userform-field">
            <span>Date of birth <em>*</em></span>
            <input type="text" data-field="date_of_birth" value="${escapeHtml(data.date_of_birth)}" placeholder="DD/MM/YYYY" autocomplete="off" inputmode="numeric">
          </label>

          <label class="fy-userform-field">
            <span>Gender <em>*</em></span>
            <div class="fy-userform-radios">
              <label class="fy-userform-radio">
                <input type="radio" name="gender" data-field="gender" value="M" ${data.gender === "M" ? "checked" : ""}>
                <span>Male</span>
              </label>
              <label class="fy-userform-radio">
                <input type="radio" name="gender" data-field="gender" value="F" ${data.gender === "F" ? "checked" : ""}>
                <span>Female</span>
              </label>
              <label class="fy-userform-radio">
                <input type="radio" name="gender" data-field="gender" value="T" ${data.gender === "T" ? "checked" : ""}>
                <span>Transgender</span>
              </label>
            </div>
          </label>

          <label class="fy-userform-field">
            <span>Email <em>*</em></span>
            <input type="email" data-field="email" value="${escapeHtml(data.email)}" placeholder="you@example.com" autocomplete="off">
          </label>

          <label class="fy-userform-field">
            <span>Mobile number <em>*</em></span>
            <input type="tel" data-field="mobile" value="${escapeHtml(data.mobile)}" placeholder="9876543210" autocomplete="off" inputmode="numeric" maxlength="10">
          </label>
          <label class="fy-userform-field">
            <span>Source of income <em>*</em></span>
            <div class="fy-userform-radios" style="flex-direction:column;gap:6px;">
              <label class="fy-userform-radio">
                <input type="radio" name="income_source" data-field="income_source" value="salary" ${data.income_source === "salary" ? "checked" : ""}>
                <span>Salary</span>
              </label>
              <label class="fy-userform-radio">
                <input type="radio" name="income_source" data-field="income_source" value="business" ${data.income_source === "business" ? "checked" : ""}>
                <span>Business / Profession</span>
              </label>
              <label class="fy-userform-radio">
                <input type="radio" name="income_source" data-field="income_source" value="house_property" ${data.income_source === "house_property" ? "checked" : ""}>
                <span>House property</span>
              </label>
              <label class="fy-userform-radio">
                <input type="radio" name="income_source" data-field="income_source" value="other_sources" ${data.income_source === "other_sources" ? "checked" : ""}>
                <span>Other sources</span>
              </label>
              <label class="fy-userform-radio">
                <input type="radio" name="income_source" data-field="income_source" value="capital_gains" ${data.income_source === "capital_gains" ? "checked" : ""}>
                <span>Capital gains</span>
              </label>
              <label class="fy-userform-radio">
                <input type="radio" name="income_source" data-field="income_source" value="no_income" ${data.income_source === "no_income" ? "checked" : ""}>
                <span>No income</span>
              </label>
            </div>
          </label>
        </div>

        <div class="fy-userform-section">
          <div class="fy-userform-section-title">Aadhaar</div>

       <label class="fy-userform-field">
            <span>Aadhaar number <em>*</em></span>
            <input type="text" data-field="aadhaar_number" value="${escapeHtml(data.aadhaar_number ?? data.aadhaar_last_4 ?? "")}" placeholder="1234 5678 9012" autocomplete="off" inputmode="numeric" maxlength="14">
            <small class="fy-userform-hint">12-digit number on your Aadhaar card</small>
          </label>

          <label class="fy-userform-field">
            <span>PIN code as per Aadhaar <em>*</em></span>
            <input type="text" data-field="aadhaar_pin_code" value="${escapeHtml(data.aadhaar_pin_code)}" placeholder="243001" autocomplete="off" inputmode="numeric" maxlength="6">
          </label>
        </div>

        <div class="fy-userform-section">
          <div class="fy-userform-section-title">Family</div>

        <div class="fy-userform-row">
            <label class="fy-userform-field">
              <span>Father's first name <em>*</em></span>
              <input type="text" data-field="father_first_name" value="${escapeHtml(data.father_first_name)}" placeholder="RAMESH" autocomplete="off">
            </label>
            <label class="fy-userform-field">
              <span>Middle</span>
              <input type="text" data-field="father_middle_name" value="${escapeHtml(data.father_middle_name)}" placeholder="(optional)" autocomplete="off">
            </label>
          </div>

          <label class="fy-userform-field">
            <span>Father's last name</span>
            <input type="text" data-field="father_last_name" value="${escapeHtml(data.father_last_name)}" placeholder="(optional)" autocomplete="off">
          </label>
          <div class="fy-userform-row">
            <label class="fy-userform-field">
              <span>Mother's first name <em>*</em></span>
              <input type="text" data-field="mother_first_name" value="${escapeHtml(data.mother_first_name)}" placeholder="RADHA" autocomplete="off">
            </label>
            <label class="fy-userform-field">
              <span>Middle</span>
              <input type="text" data-field="mother_middle_name" value="${escapeHtml(data.mother_middle_name)}" placeholder="(optional)" autocomplete="off">
            </label>
          </div>

          <label class="fy-userform-field">
            <span>Mother's last name</span>
            <input type="text" data-field="mother_last_name" value="${escapeHtml(data.mother_last_name)}" placeholder="(optional)" autocomplete="off">
          </label>

          <label class="fy-userform-field">
            <span>Whose name to print on PAN card? <em>*</em></span>
            <div class="fy-userform-radios">
              <label class="fy-userform-radio">
                <input type="radio" name="parent_on_card" data-field="parent_on_card" value="father" ${data.parent_on_card_is_father ? "checked" : ""}>
                <span>Father's name</span>
              </label>
              <label class="fy-userform-radio">
                <input type="radio" name="parent_on_card" data-field="parent_on_card" value="mother" ${data.parent_on_card_is_mother ? "checked" : ""}>
                <span>Mother's name</span>
              </label>
            </div>
          </label>
        </div>

        <div class="fy-userform-section">
          <div class="fy-userform-section-title">Verification</div>

          <label class="fy-userform-field">
            <span>Place (city) <em>*</em></span>
            <input type="text" data-field="place" value="${escapeHtml(data.place)}" placeholder="BAREILLY" autocomplete="off">
            <small class="fy-userform-hint">The city where you're filing this application</small>
          </label>

          <label class="fy-userform-field">
            <span>Proof of date of birth <em>*</em></span>
            <select data-field="proof_of_dob" style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit;color:#0f172a;background:#fff;">
              <option value="">-- Select --</option>
              <option value="Birth Certificate issued by the Municipal Authority or any office authorized to issue Birth and Death Certificate by the Registrar of Birth and Death of the Indian Consulate" ${data.proof_of_dob === "Birth Certificate issued by the Municipal Authority or any office authorized to issue Birth and Death Certificate by the Registrar of Birth and Death of the Indian Consulate" ? "selected" : ""}>Birth Certificate</option>
              <option value="Matriculation certificate" ${data.proof_of_dob === "Matriculation certificate" ? "selected" : ""}>Matriculation Certificate</option>
              <option value="Matriculation Marksheet of recognised board" ${data.proof_of_dob === "Matriculation Marksheet of recognised board" ? "selected" : ""}>Matriculation Marksheet</option>
              <option value="Driving License" ${data.proof_of_dob === "Driving License" ? "selected" : ""}>Driving License</option>
              <option value="Passport" ${data.proof_of_dob === "Passport" ? "selected" : ""}>Passport</option>
              <option value="Elector's photo identity card" ${data.proof_of_dob === "Elector's photo identity card" ? "selected" : ""}>Voter ID</option>
              <option value="Pension payment order" ${data.proof_of_dob === "Pension payment order" ? "selected" : ""}>Pension Payment Order</option>
            </select>
          </label>
        </div>

        <div class="fy-userform-section">
          <div class="fy-userform-section-title">Additional Details</div>

          <label class="fy-userform-field">
            <span>Are you a defence personnel?</span>
            <div class="fy-userform-radios">
              <label class="fy-userform-radio">
                <input type="radio" name="is_defence" data-field="is_defence" value="false" ${!data.is_defence ? "checked" : ""}>
                <span>No</span>
              </label>
              <label class="fy-userform-radio">
                <input type="radio" name="is_defence" data-field="is_defence" value="true" ${data.is_defence ? "checked" : ""}>
                <span>Yes</span>
              </label>
            </div>
          </label>

          <label class="fy-userform-field">
            <span>Passport number</span>
            <input type="text" data-field="passport_number" value="${escapeHtml(data.passport_number)}" placeholder="(optional)" autocomplete="off">
          </label>

          <label class="fy-userform-field">
            <span>TIN number</span>
            <input type="text" data-field="tin_number" value="${escapeHtml(data.tin_number)}" placeholder="(optional)" autocomplete="off">
          </label>
        </div>

        <div class="fy-userform-errors" id="fy-userform-errors" hidden></div>
      </div>

      <div class="fy-userform-footer">
        <button class="fy-userform-submit" id="fy-userform-submit">
          Continue to Pay ₹29
        </button>
        <div class="fy-userform-privacy">🔒 Saved on your device. Never sent to our servers.</div>
      </div>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function renderFillingScreen(): string {
  return `
    <div id="fy-filling" class="fy-screen" style="display:none;flex-direction:column;height:100%;">
      <div style="position:relative;background:#000080;overflow:hidden;flex-shrink:0;">
        <div style="padding:13px 16px;display:flex;align-items:center;gap:10px;position:relative;z-index:1;">
          <div style="flex:1;text-align:center;">
            <div style="font-weight:800;font-size:16px;letter-spacing:-0.5px;color:#ffffff;line-height:1.2;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
              <span style="font-weight:200;color:rgba(255,255,255,0.7);">Form</span><span style="color:#E8930A;font-weight:800;">·</span><span style="font-weight:800;color:#ffffff;">Yaar</span>
            </div>
            <div style="font-size:10.5px;color:#aabbd4;font-weight:500;">Filling your form...</div>
          </div>
        </div>
        <div style="height:3px;display:flex;"><div style="flex:1;background:#FF9933;"></div><div style="flex:1;background:#ffffff;"></div><div style="flex:1;background:#138808;"></div></div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:24px 20px;">
        <div style="text-align:center;margin-bottom:20px;">
          <div style="width:56px;height:56px;border-radius:50%;background:rgba(130,28,255,0.1);display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;">
            <div style="width:28px;height:28px;border:3px solid rgba(130,28,255,0.2);border-top-color:#821cff;border-radius:50%;animation:fy-spin 0.8s linear infinite;"></div>
          </div>
          <div style="font-size:18px;font-weight:800;color:#0a0a2e;">Filling your PAN form</div>
          <div style="margin-top:6px;font-size:12.5px;color:#50507a;">Please don't close this tab</div>
        </div>
        <div style="background:#f8f9fc;border:1px solid #e8e8f0;border-radius:12px;padding:14px 16px;">
          <div id="fy-fill-progress-label" style="font-size:11px;color:#50507a;font-weight:600;margin-bottom:10px;letter-spacing:0.3px;text-transform:uppercase;">Progress</div>
          <div id="fy-fill-progress-list" style="display:flex;flex-direction:column;gap:8px;font-size:12.5px;color:#50507a;">
            <div style="opacity:0.6;">Preparing...</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderVerifyScreen(): string {
  return `
    <div id="fy-verify" class="fy-screen" style="display:none;flex-direction:column;height:100%;">
      <div style="position:relative;background:#000080;overflow:hidden;flex-shrink:0;">
        <div style="padding:13px 16px;display:flex;align-items:center;gap:10px;position:relative;z-index:1;">
          <div style="flex:1;text-align:center;">
            <div style="font-weight:800;font-size:16px;letter-spacing:-0.5px;color:#ffffff;line-height:1.2;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
              <span style="font-weight:200;color:rgba(255,255,255,0.7);">Form</span><span style="color:#E8930A;font-weight:800;">·</span><span style="font-weight:800;color:#ffffff;">Yaar</span>
            </div>
            <div style="font-size:10.5px;color:#aabbd4;font-weight:500;">Almost done</div>
          </div>
        </div>
        <div style="height:3px;display:flex;"><div style="flex:1;background:#FF9933;"></div><div style="flex:1;background:#ffffff;"></div><div style="flex:1;background:#138808;"></div></div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:24px 20px;">
        <div style="text-align:center;margin-bottom:18px;">
          <div style="width:60px;height:60px;border-radius:50%;background:#22c55e;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;animation:fy-successPop 0.5s ease forwards;box-shadow:0 8px 20px rgba(34,197,94,0.27);">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style="font-size:19px;font-weight:800;color:#0a0a2e;">All filled in!</div>
          <div style="margin-top:6px;font-size:12.5px;color:#50507a;line-height:1.5;">We've auto-filled this page with your information.</div>
        </div>

        <div style="background:#fff8eb;border:1.5px solid #f5d27a;border-radius:12px;padding:14px 16px;margin-bottom:12px;">
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b8860b" stroke-width="2.2" stroke-linecap="round" style="flex-shrink:0;margin-top:1px;"><path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg>
            <div>
              <div style="font-size:13px;color:#7a5a00;font-weight:700;margin-bottom:6px;">Complete these steps manually</div>
              <div style="font-size:12px;color:#7a5a00;line-height:1.8;">
                <strong>1.</strong> Upload your <strong>Aadhaar card</strong> as proof of identity &amp; address<br>
                <strong>2.</strong> Upload your <strong>proof of date of birth</strong> document<br>
                <strong>3.</strong> Upload your <strong>passport-size photo</strong> and <strong>signature</strong><br>
                <strong>4.</strong> Solve the <strong>reCAPTCHA</strong> at the bottom<br>
                <strong>5.</strong> Click the <strong>Submit</strong> button
              </div>
            </div>
          </div>
        </div>

        <div style="background:#f0f8ff;border:1px solid #bfd4ec;border-radius:10px;padding:11px 14px;font-size:12px;color:#50507a;line-height:1.5;">
          The information has been verified, but a quick review never hurts. If anything looks off, just edit it directly on the page.
        </div>

        <div style="margin-top:12px;background:#f0fff4;border:1px solid #86efac;border-radius:10px;padding:11px 14px;font-size:12px;color:#166534;line-height:1.5;">
          <strong>AO Code</strong> has been auto-selected based on your PIN code. You can change it manually if needed.
        </div>
      </div>
    </div>
  `;
}

function renderResumeScreen(): string {
  return `
    <div id="fy-resume" class="fy-screen" style="display:none;flex-direction:column;height:100%;">
      <div style="position:relative;background:#000080;overflow:hidden;flex-shrink:0;">
        <div style="padding:13px 16px;display:flex;align-items:center;gap:10px;position:relative;z-index:1;">
          <div style="flex:1;text-align:center;">
            <div style="font-weight:800;font-size:16px;letter-spacing:-0.5px;color:#ffffff;line-height:1.2;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
              <span style="font-weight:200;color:rgba(255,255,255,0.7);">Form</span><span style="color:#E8930A;font-weight:800;">·</span><span style="font-weight:800;color:#ffffff;">Yaar</span>
            </div>
            <div style="font-size:10.5px;color:#aabbd4;font-weight:500;">Welcome back</div>
          </div>
        </div>
        <div style="height:3px;display:flex;"><div style="flex:1;background:#FF9933;"></div><div style="flex:1;background:#ffffff;"></div><div style="flex:1;background:#138808;"></div></div>
      </div>

      <div style="flex:1;overflow-y:auto;padding:24px 20px;">
        <div style="text-align:center;margin-bottom:18px;">
          <div style="width:60px;height:60px;border-radius:50%;background:#22c55e;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;animation:fy-successPop 0.5s ease forwards;box-shadow:0 8px 20px rgba(34,197,94,0.27);">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style="font-size:19px;font-weight:800;color:#0a0a2e;">Payment confirmed</div>
          <div style="margin-top:6px;font-size:12.5px;color:#50507a;line-height:1.5;">PAN Card — New Application<br>Your details are saved. Ready to continue?</div>
        </div>

        <button id="fy-resume-start" style="width:100%;padding:14px;background:#000080;color:#fff;border:none;border-radius:12px;font-weight:800;font-size:15px;cursor:pointer;box-shadow:0 5px 20px rgba(0,0,128,0.27);letter-spacing:0.3px;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;margin-bottom:10px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Start Filling Now
        </button>

        <button id="fy-resume-startover" style="width:100%;padding:11px;background:transparent;color:#50507a;border:1.5px solid #e0e0f0;border-radius:10px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;">
          Start over with a new form
        </button>

        <div style="margin-top:16px;background:#f0f8ff;border:1px solid #bfd4ec;border-radius:10px;padding:11px 14px;font-size:11.5px;color:#50507a;line-height:1.5;text-align:center;">
          If you started filling earlier, NSDL will ask whether to use your previous token. We'll handle that automatically.
        </div>
      </div>
    </div>
  `;
}
function createTab() {
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
  `;
  tab.innerHTML =
    '<span style="font-weight:200;opacity:0.7;">F</span><span style="color:#E8930A;font-weight:800;">·</span><span style="font-weight:800;">Y</span>';

  const pulseTab = () => {
    const t = document.getElementById("fy-tab");
    if (!t) return;
    t.style.transition = "transform 0.2s ease, box-shadow 0.2s ease";
    t.style.transform = "translateY(-50%) scale(1.4)";
    t.style.boxShadow = "-6px 0 24px rgba(0,0,128,0.5)";
    setTimeout(() => {
      t.style.transition = "transform 0.06s ease";
      t.style.transform = "translateY(-50%) scale(1.4) translateX(-4px)";
    }, 220);
    setTimeout(() => {
      t.style.transform = "translateY(-50%) scale(1.4) translateX(4px)";
    }, 280);
    setTimeout(() => {
      t.style.transform = "translateY(-50%) scale(1.4) translateX(-4px)";
    }, 340);
    setTimeout(() => {
      t.style.transform = "translateY(-50%) scale(1.4) translateX(4px)";
    }, 400);
    setTimeout(() => {
      t.style.transform = "translateY(-50%) scale(1.4) translateX(-3px)";
    }, 460);
    setTimeout(() => {
      t.style.transform = "translateY(-50%) scale(1.4) translateX(3px)";
    }, 520);
    setTimeout(() => {
      t.style.transform = "translateY(-50%) scale(1.4) translateX(0)";
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

let currentKeyHandler: ((e: KeyboardEvent) => void) | null = null;

function attachClickOutsideHandler() {
  if (currentClickHandler) {
    document.removeEventListener("click", currentClickHandler);
  }
  currentClickHandler = (e: MouseEvent) => {
    const p = document.getElementById("formyaar-panel");
    const t = document.getElementById("fy-tab");
    if (!p || !t) return;
    if (
      p.style.right === "0px" &&
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
function attachPanelEventHandlers() {
  document.getElementById("fy-pan-card")?.addEventListener("click", () => {
    trackEvent("panel_opened", "pan_card");
    showUserForm("pan_card");
  });

  document.getElementById("fy-back-btn")?.addEventListener("click", () => {
    document.getElementById("fy-payment")!.style.display = "none";
    document.getElementById("fy-home")!.style.display = "flex";
  });
  document.getElementById("fy-operator-mode")?.addEventListener("click", () => {
    showOperatorPanel();
  });
  document.getElementById("fy-pay-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("fy-pay-btn") as HTMLButtonElement;
    btn.innerHTML = `<div style="width:16px;height:16px;border:2.5px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:fy-spin 0.8s linear infinite;"></div> Processing...`;
    btn.style.opacity = "0.7";
    btn.style.cursor = "default";

    const orderRes = await browser.runtime.sendMessage({
      type: "CREATE_PAYMENT",
      form: "pan_card",
    });

    if (!orderRes?.success) {
      btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg> Pay ₹29 Securely`;
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
      alert("Could not initiate payment. Please try again.");
      return;
    }
    trackEvent("payment_started", "pan_card");
    await browser.runtime.sendMessage({
      type: "OPEN_RAZORPAY",
      order_id: orderRes.order_id,
      amount: orderRes.amount,
    });

    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg> Pay ₹29 Securely`;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
  });
  attachUploadScreenHandlers();
  // Operator login button
  document
    .getElementById("fy-open-operator-login")
    ?.addEventListener("click", () => {
      browser.runtime.sendMessage({
        type: "OPEN_URL",
        url: "https://formyaar.in/operator-login.html",
      });
    });

  document
    .getElementById("fy-token-submit")
    ?.addEventListener("click", async () => {
      const input = document.getElementById(
        "fy-token-input",
      ) as HTMLInputElement;
      const errorEl = document.getElementById(
        "fy-token-error",
      ) as HTMLDivElement;
      const btn = document.getElementById(
        "fy-token-submit",
      ) as HTMLButtonElement;

      const token = input.value.trim().toUpperCase();
      if (!token || token.length !== 12) {
        errorEl.style.display = "block";
        errorEl.textContent =
          "Please enter the 12-character token from your dashboard.";
        return;
      }

      btn.textContent = "Connecting...";
      btn.disabled = true;
      errorEl.style.display = "none";

      const { error } = await signInWithToken(token);

      if (error) {
        errorEl.style.display = "block";
        errorEl.textContent =
          error === "Token expired"
            ? "Token expired. Go to your dashboard and generate a new one."
            : error === "Token already used"
              ? "This token has already been used. Generate a new one from your dashboard."
              : "Invalid token. Please check and try again.";
        btn.textContent = "Connect Extension";
        btn.disabled = false;
        return;
      }

      // Success — show queue
      document.getElementById("fy-operator-login")!.style.display = "none";
      document.getElementById("fy-operator-queue")!.style.display = "flex";
      const session = await getOperatorSession();
      if (session) await loadQueue(session.id);
    });
  // Operator sign out
  document
    .getElementById("fy-operator-signout")
    ?.addEventListener("click", async () => {
      await signOut();
      document.getElementById("fy-operator-queue")!.style.display = "none";
      document.getElementById("fy-operator-login")!.style.display = "flex";
    });
  document
    .getElementById("fy-queue-refresh")
    ?.addEventListener("click", async () => {
      const icon = document.getElementById("fy-refresh-icon");
      if (icon) {
        icon.style.transition = "transform 0.5s ease";
        icon.style.transform = "rotate(360deg)";
        setTimeout(() => {
          icon.style.transition = "none";
          icon.style.transform = "rotate(0deg)";
        }, 500);
      }
      const session = await getOperatorSession();
      if (session) await loadQueue(session.id);
    });
  // Review back button
  document.getElementById("fy-review-back")?.addEventListener("click", () => {
    document.getElementById("fy-operator-review")!.style.display = "none";
    document.getElementById("fy-operator-queue")!.style.display = "flex";
  });
} // Public helpers for autofill engine to drive panel state

export function showFillingScreen() {
  document.getElementById("fy-payment")!.style.display = "none";
  document.getElementById("fy-home")!.style.display = "none";
  document.getElementById("fy-verify")!.style.display = "none";
  document.getElementById("fy-filling")!.style.display = "flex";

  // Open the panel if it's collapsed
  const p = document.getElementById("formyaar-panel");
  if (p) p.style.right = "0px";
}

export function showVerifyScreen() {
  document.getElementById("fy-filling")!.style.display = "none";
  document.getElementById("fy-verify")!.style.display = "flex";

  const p = document.getElementById("formyaar-panel");
  if (p) p.style.right = "0px";
}
export function showResumeScreen(session: ActiveSession): void {
  const screens = [
    "fy-home",
    "fy-payment",
    "fy-filling",
    "fy-verify",
    "fy-upload",
  ];
  screens.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  const resume = document.getElementById("fy-resume");
  if (resume) resume.style.display = "flex";

  // Open panel
  const p = document.getElementById("formyaar-panel");
  if (p) p.style.right = "0px";

  // Wire up buttons (every time we show, in case DOM was rebuilt)
  document
    .getElementById("fy-resume-start")
    ?.addEventListener("click", async () => {
      // Mark autofill active so it runs on the NSDL page load
      await browser.storage.session.set({
        autofillActive: { form: session.form, order_id: session.order_id },
      });
      // Navigate to NSDL page 1 (will autofill on landing)
      window.location.href =
        "https://onlineservices.proteantech.in/paam/registerEndUser.html";
    });

  document
    .getElementById("fy-resume-startover")
    ?.addEventListener("click", async () => {
      if (
        !confirm("This will clear your current application progress. Continue?")
      )
        return;
      await clearActiveSession();
      document.getElementById("fy-resume")!.style.display = "none";
      document.getElementById("fy-home")!.style.display = "flex";
    });
}
function showUserForm(form: string): void {
  // Hide all other screens
  const screens = ["fy-home", "fy-payment", "fy-filling", "fy-verify"];
  screens.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  // Remove any existing form (in case user clicks again)
  const existing = document.getElementById("fy-userform-screen");
  if (existing) existing.remove();

  // Render the form
  getUserData().then((data) => {
    const panel = document.getElementById("formyaar-panel");
    if (!panel) return;

    const wrapper = document.createElement("div");
    wrapper.id = "fy-userform-screen";
    wrapper.className = "fy-screen";
    wrapper.style.cssText =
      "display:flex;flex-direction:column;height:100%;animation:fy-fadeIn 0.2s ease;";
    wrapper.innerHTML = renderUserFormScreen(form, data);
    panel.appendChild(wrapper);

    attachUserFormHandlers(
      form,
      // onSubmit: data is saved, now go to payment
      () => {
        wrapper.remove();
        document.getElementById("fy-payment")!.style.display = "flex";
      },
      // onBack: go back to home
      () => {
        wrapper.remove();
        document.getElementById("fy-home")!.style.display = "flex";
      },
    );

    // Open panel if collapsed
    panel.style.right = "0px";
  });
}
function attachUserFormHandlers(
  form: string,
  onSubmit: () => void,
  onBack: () => void,
): void {
  const back = document.getElementById("fy-userform-back");
  const submit = document.getElementById("fy-userform-submit");
  const errorBox = document.getElementById("fy-userform-errors");

  if (back) back.addEventListener("click", onBack);

  if (submit) {
    submit.addEventListener("click", async () => {
      const data = collectFormData();
      const errors = validateUserData(data);

      // Clear previous error highlights
      document
        .querySelectorAll(".fy-userform input.fy-error")
        .forEach((el) => el.classList.remove("fy-error"));

      if (errors.length > 0) {
        if (errorBox) {
          errorBox.hidden = false;
          errorBox.innerHTML = `<ul>${errors
            .map((e) => `<li>${e.message}</li>`)
            .join("")}</ul>`;
        }
        // Highlight first error field and scroll to it
        const firstError = errors[0];
        const firstField = document.querySelector(
          `[data-field="${firstError.field}"]`,
        ) as HTMLElement | null;
        if (firstField) {
          firstField.classList.add("fy-error");
          firstField.scrollIntoView({ behavior: "smooth", block: "center" });
          firstField.focus();
        }
        return;
      }

      if (errorBox) errorBox.hidden = true;

      // Save data and continue
      await saveUserData(data);
      onSubmit();
    });
  }
}

function collectFormData(): UserData {
  const get = (field: string): string => {
    const el = document.querySelector(
      `[data-field="${field}"]`,
    ) as HTMLInputElement | null;
    return el ? el.value.trim() : "";
  };

  const getRadio = (name: string): string => {
    const el = document.querySelector(
      `input[name="${name}"]:checked`,
    ) as HTMLInputElement | null;
    return el ? el.value : "";
  };

  const parentOnCard = getRadio("parent_on_card");

  return {
    first_name: get("first_name").toUpperCase(),
    middle_name: get("middle_name").toUpperCase(),
    last_name: get("last_name").toUpperCase(),
    date_of_birth: get("date_of_birth"),
    email: get("email"),
    mobile: get("mobile"),
    aadhaar_number: get("aadhaar_number").replace(/\s/g, ""),
    aadhaar_last_4: get("aadhaar_number").replace(/\s/g, "").slice(-4), // kept for backwards compat
    gender: getRadio("gender") as "M" | "F" | "T" | "",
    father_first_name: get("father_first_name").toUpperCase(),
    father_middle_name: get("father_middle_name").toUpperCase(),
    father_last_name: get("father_last_name").toUpperCase(),
    mother_first_name: get("mother_first_name").toUpperCase(),
    mother_middle_name: get("mother_middle_name").toUpperCase(),
    mother_last_name: get("mother_last_name").toUpperCase(),
    parent_on_card_is_father: parentOnCard === "father",
    parent_on_card_is_mother: parentOnCard === "mother",
    aadhaar_pin_code: get("aadhaar_pin_code"),
    place: get("place").toUpperCase(),
    is_defence: getRadio("is_defence") === "true",
    passport_number: get("passport_number"),
    tin_number: get("tin_number"),
    proof_of_dob: get("proof_of_dob"),
    income_source: getRadio("income_source") as UserData["income_source"],
  };
}
export function updateFillProgress(
  items: { label: string; status: "done" | "active" | "pending" }[],
) {
  const list = document.getElementById("fy-fill-progress-list");
  if (!list) return;

  list.innerHTML = items
    .map((item) => {
      if (item.status === "done") {
        return `
          <div style="display:flex;align-items:center;gap:8px;color:#22c55e;font-weight:600;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>${item.label}</span>
          </div>`;
      }
      if (item.status === "active") {
        return `
          <div style="display:flex;align-items:center;gap:8px;color:#821cff;font-weight:700;">
            <div style="width:12px;height:12px;border:2px solid rgba(130,28,255,0.25);border-top-color:#821cff;border-radius:50%;animation:fy-spin 0.7s linear infinite;"></div>
            <span>${item.label}</span>
          </div>`;
      }
      return `
        <div style="display:flex;align-items:center;gap:8px;color:#aaa;">
          <div style="width:12px;height:12px;border:2px solid #ddd;border-radius:50%;"></div>
          <span>${item.label}</span>
        </div>`;
    })
    .join("");
}
export async function showOperatorPanel(): Promise<void> {
  const session = await getOperatorSession();

  const screens = [
    "fy-home",
    "fy-payment",
    "fy-filling",
    "fy-verify",
    "fy-upload",
    "fy-resume",
  ];
  screens.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  if (!session) {
    document.getElementById("fy-operator-login")!.style.display = "flex";
    return;
  }

  // Has session — show queue
  document.getElementById("fy-operator-login")!.style.display = "none";
  document.getElementById("fy-operator-queue")!.style.display = "flex";
  await loadQueue(session.id);
}
function isSubscriptionActive(session: OperatorSession): boolean {
  if (session.subscription_status !== "active") return false;
  if (!session.subscription_expires_at) return false;
  return new Date(session.subscription_expires_at) > new Date();
}
async function loadQueue(operatorId: string): Promise<void> {
  const list = document.getElementById("fy-queue-list");
  if (!list) return;

  const session = await getOperatorSession();
  if (!session) {
    document.getElementById("fy-operator-login")!.style.display = "flex";
    document.getElementById("fy-operator-queue")!.style.display = "none";
    return;
  }

  const subRes = await fetch(
    `${BACKEND_URL}}/operator/subscription/${session.id}`,
  );
  const subData = subRes.ok ? await subRes.json() : null;

  if (!subData?.is_active) {
    list.innerHTML = `
      <div style="text-align:center;padding:40px 20px;">
        <div style="font-size:36px;margin-bottom:14px;">🔒</div>
        <div style="font-size:15px;font-weight:800;color:#0a0a2e;margin-bottom:8px;">Subscription Expired</div>
        <div style="font-size:12.5px;color:#64748b;line-height:1.6;margin-bottom:16px;">Your FormYaar subscription has expired. Renew to keep using speedy filling services for your customers.</div>
        <a href="https://formyaar.in/operator-dashboard.html" target="_blank" style="display:inline-block;padding:10px 20px;background:#000080;color:#fff;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;">Renew Subscription</a>
      </div>
    `;
    return;
  }

  const res = await fetch(`${BACKEND_URL}}/operator/queue/${operatorId}`);
  const { data, error } = res.ok
    ? { data: await res.json(), error: null }
    : { data: null, error: true };

  if (error || !data || data.length === 0) {
    list.innerHTML = `
      <div style="text-align:center;color:#94a3b8;font-size:13px;padding:40px 20px;">
        <div style="font-size:32px;margin-bottom:12px;">✅</div>
        No pending forms. Queue is clear.
      </div>
    `;
    return;
  }

  const FORM_ICONS: Record<string, string> = {
    pan_card: "🪪",
    driving_license: "🚗",
    passport: "📘",
    voter_id: "🗳️",
  };

  list.innerHTML = data
    .map(
      (sub: any) => `
    <button class="fy-queue-tile" data-id="${sub.id}" style="width:100%;background:#fff;border:1.5px solid #e0e0f0;border-radius:12px;padding:13px 14px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;font-family:inherit;text-align:left;transition:border-color 0.15s;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:20px;">${FORM_ICONS[sub.form_type] ?? "📄"}</span>
        <div>
          <div style="font-size:13.5px;font-weight:700;color:#0a0a2e;">${[sub.first_name, sub.middle_name, sub.last_name].filter(Boolean).join(" ") || sub.name || "Unknown"}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">${sub.form_type.replace("_", " ").toUpperCase()} · ${new Date(sub.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
  `,
    )
    .join("");

  list.querySelectorAll<HTMLButtonElement>(".fy-queue-tile").forEach((tile) => {
    tile.addEventListener("click", () => {
      const sub = data.find((s: any) => s.id === tile.dataset.id);
      if (sub) showReviewScreen(sub);
    });
  });
}

function showReviewScreen(sub: any): void {
  document.getElementById("fy-operator-queue")!.style.display = "none";
  const review = document.getElementById("fy-operator-review")!;
  review.style.display = "flex";

  const body = document.getElementById("fy-review-body")!;

  const row = (label: string, value: string) =>
    value
      ? `
    <div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #f1f5f9;">
      <span style="font-size:11.5px;color:#64748b;font-weight:500;">${label}</span>
      <span style="font-size:12.5px;color:#0a0a2e;font-weight:600;text-align:right;max-width:60%;">${value}</span>
    </div>
  `
      : "";

  body.innerHTML = `
    <div style="margin-bottom:14px;">
      <div style="font-size:16px;font-weight:800;color:#0a0a2e;">${[sub.first_name, sub.middle_name, sub.last_name].filter(Boolean).join(" ") || sub.name || "Unknown"}</div>
      <div style="font-size:11.5px;color:#64748b;margin-top:2px;">${sub.form_type.replace("_", " ").toUpperCase()}</div>
    </div>
    <div style="background:#f8fafc;border-radius:10px;padding:4px 12px;">
      ${row("Mobile", sub.mobile)}
      ${row("Email", sub.email)}
      ${row("Date of Birth", sub.dob)}
      ${row("Father's Name", sub.father_name)}
      ${row("Mother's Name", sub.mother_name)}
      ${row("City", sub.city)}
      ${row("State", sub.state)}
      ${row("PIN Code", sub.pincode)}
      ${row("Income Source", sub.income_source)}
      ${row("Proof of DOB", sub.proof_of_dob)}
      ${row("Defence", sub.defence ? "Yes" : "No")}
    </div>
  `;

  // Accept button
  const acceptBtn = document.getElementById("fy-review-accept")!;
  acceptBtn.onclick = async () => {
    await fetch(`${BACKEND_URL}/operator/submission/${sub.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "filling" }),
    });
    await browser.storage.session.set({
      autofillActive: { form: sub.form_type, submission_id: sub.id },
    });
    document.getElementById("fy-operator-review")!.style.display = "none";
    runAutofillFromSubmission(sub);
  };

  // Reject button
  const rejectBtn = document.getElementById("fy-review-reject")!;
  rejectBtn.onclick = async () => {
    await fetch(`${BACKEND_URL}}/operator/submission/${sub.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    document.getElementById("fy-operator-review")!.style.display = "none";
    document.getElementById("fy-operator-queue")!.style.display = "flex";
  };
}
