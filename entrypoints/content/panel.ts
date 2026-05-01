import { ensureFontsLoaded } from "./fonts";
import {
  PANEL_WIDTH,
  PULSE_INITIAL_DELAY_MS,
  PULSE_INTERVAL_MS,
  Z_INDEX,
} from "./constants";
import { trackEvent } from "./telemetry";
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
    </style>
    ${renderHomeScreen()}
    ${renderPaymentScreen()}
    ${renderSuccessScreen()}
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
          <a href="https://formyaar.in/help" target="_blank" style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.13);border-radius:7px;padding:5px 10px;text-decoration:none;border:1px solid rgba(255,255,255,0.18);">
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
  return `<svg width="38" height="38" viewBox="0 0 38 38" fill="none"><rect x="4" y="5" width="30" height="28" rx="3.5" stroke="#c0c0d0" stroke-width="2"/><path d="M13 22 Q19 15 25 22" stroke="#c0c0d0" stroke-width="1.8" stroke-linecap="round" fill="none"/><path d="M15 22 Q19 19 23 22" stroke="#c0c0d0" stroke-width="1.5" stroke-linecap="round" fill="none"/><circle cx="19" cy="17" r="1.5" fill="#c0c0d0"/><line x1="9" y1="27" x2="29" y2="27" stroke="#c0c0d0" stroke-width="1.4" stroke-linecap="round" stroke-dasharray="2 2"/></svg>`;
}

function renderDLIcon(): string {
  return `<svg width="38" height="38" viewBox="0 0 38 38" fill="none"><rect x="4" y="9" width="30" height="21" rx="3.5" stroke="#c0c0d0" stroke-width="2"/><circle cx="19" cy="19.5" r="6" stroke="#c0c0d0" stroke-width="1.8"/><circle cx="19" cy="19.5" r="2" stroke="#c0c0d0" stroke-width="1.5"/><line x1="19" y1="13.5" x2="19" y2="15.5" stroke="#c0c0d0" stroke-width="1.8" stroke-linecap="round"/><line x1="19" y1="23.5" x2="19" y2="25.5" stroke="#c0c0d0" stroke-width="1.8" stroke-linecap="round"/><line x1="13" y1="19.5" x2="15" y2="19.5" stroke="#c0c0d0" stroke-width="1.8" stroke-linecap="round"/><line x1="23" y1="19.5" x2="25" y2="19.5" stroke="#c0c0d0" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}

function renderVoterIcon(): string {
  return `<svg width="38" height="38" viewBox="0 0 38 38" fill="none"><rect x="6" y="5" width="26" height="30" rx="3.5" stroke="#c0c0d0" stroke-width="2"/><line x1="11" y1="14" x2="27" y2="14" stroke="#c0c0d0" stroke-width="1.8" stroke-linecap="round"/><line x1="11" y1="19" x2="27" y2="19" stroke="#c0c0d0" stroke-width="1.8" stroke-linecap="round"/><line x1="11" y1="24" x2="20" y2="24" stroke="#c0c0d0" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}

function renderPassportIcon(): string {
  return `<svg width="38" height="38" viewBox="0 0 38 38" fill="none"><rect x="7" y="4" width="24" height="31" rx="3.5" stroke="#c0c0d0" stroke-width="2"/><circle cx="19" cy="17" r="5.5" stroke="#c0c0d0" stroke-width="1.8"/><line x1="13.5" y1="17" x2="24.5" y2="17" stroke="#c0c0d0" stroke-width="1.2" stroke-linecap="round"/><path d="M19 11.5 Q21.5 14 21.5 17 Q21.5 20 19 22.5" stroke="#c0c0d0" stroke-width="1.2" stroke-linecap="round" fill="none"/><path d="M19 11.5 Q16.5 14 16.5 17 Q16.5 20 19 22.5" stroke="#c0c0d0" stroke-width="1.2" stroke-linecap="round" fill="none"/><line x1="11" y1="27" x2="27" y2="27" stroke="#c0c0d0" stroke-width="1.6" stroke-linecap="round"/><line x1="11" y1="30" x2="22" y2="30" stroke="#c0c0d0" stroke-width="1.4" stroke-linecap="round"/></svg>`;
}

function renderVisaIcon(): string {
  return `<svg width="38" height="38" viewBox="0 0 38 38" fill="none"><rect x="4" y="10" width="30" height="19" rx="3.5" stroke="#c0c0d0" stroke-width="2"/><line x1="4" y1="16.5" x2="34" y2="16.5" stroke="#c0c0d0" stroke-width="1.5"/><line x1="4" y1="22.5" x2="34" y2="22.5" stroke="#c0c0d0" stroke-width="1.5"/><line x1="8" y1="25.5" x2="16" y2="25.5" stroke="#c0c0d0" stroke-width="1.5" stroke-linecap="round"/><line x1="8" y1="13.5" x2="14" y2="13.5" stroke="#c0c0d0" stroke-width="2" stroke-linecap="round"/></svg>`;
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
            <div style="font-size:36px;font-weight:800;margin-top:6px;letter-spacing:-0.5px;">₹107</div>
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
            Pay ₹107 Securely
          </button>
          <div style="text-align:center;margin-top:10px;font-size:10.5px;color:#aaa;font-weight:500;">
            By paying you agree to FormYaar's Terms &amp; Privacy Policy
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderSuccessScreen(): string {
  return `
    <div id="fy-success" class="fy-screen" style="display:none;flex-direction:column;height:100%;">
      <div style="position:relative;background:#000080;overflow:hidden;flex-shrink:0;">
        <div style="padding:13px 16px;display:flex;align-items:center;gap:10px;position:relative;z-index:1;">
          <div style="flex:1;text-align:center;">
            <div style="font-weight:800;font-size:16px;letter-spacing:-0.5px;color:#ffffff;line-height:1.2;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
              <span style="font-weight:200;color:rgba(255,255,255,0.7);">Form</span><span style="color:#E8930A;font-weight:800;">·</span><span style="font-weight:800;color:#ffffff;">Yaar</span>
            </div>
            <div style="font-size:10.5px;color:#aabbd4;font-weight:500;">Application Submitted</div>
          </div>
        </div>
        <div style="height:3px;display:flex;"><div style="flex:1;background:#FF9933;"></div><div style="flex:1;background:#ffffff;"></div><div style="flex:1;background:#138808;"></div></div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 32px;gap:0;">
        <div id="fy-success-icon" style="width:68px;height:68px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;animation:fy-successPop 0.5s ease forwards;box-shadow:0 8px 24px rgba(34,197,94,0.27);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div style="margin-top:20px;font-size:20px;font-weight:800;color:#0a0a2e;text-align:center;">Payment Successful!</div>
        <div style="margin-top:8px;font-size:13px;color:#50507a;text-align:center;line-height:1.6;max-width:260px;">Your PAN Card application has been submitted and is being processed.</div>
        <div style="margin-top:6px;font-size:12.5px;color:#821cff;font-weight:700;">Expected: 7–10 working days</div>
        <div style="margin-top:24px;background:#f0f8ff;border:1px solid #bfd4ec;border-radius:10px;padding:10px 16px;font-size:11px;color:#50507a;text-align:center;">A confirmation has been sent to your registered email.</div>
        <button id="fy-back-home" style="margin-top:20px;background:#821cff;color:#fff;border:none;border-radius:11px;padding:12px 36px;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 16px rgba(130,28,255,0.27);">Back to Home</button>
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
    document.getElementById("fy-home")!.style.display = "none";
    document.getElementById("fy-payment")!.style.display = "flex";
  });

  document.getElementById("fy-back-btn")?.addEventListener("click", () => {
    document.getElementById("fy-payment")!.style.display = "none";
    document.getElementById("fy-home")!.style.display = "flex";
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
      btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg> Pay ₹107 Securely`;
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

    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg> Pay ₹107 Securely`;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
  });

  document.getElementById("fy-back-home")?.addEventListener("click", () => {
    document.getElementById("fy-success")!.style.display = "none";
    document.getElementById("fy-home")!.style.display = "flex";
  });
}
