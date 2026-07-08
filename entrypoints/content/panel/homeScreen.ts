import { VERSION } from "../constants";
import { trackEvent } from "../telemetry";
import {
  getUserData,
  clearActiveSession,
  type ActiveSession,
} from "../userData";
import { runAutofill } from "../autofill";
import { showUserForm } from "./userForm";
import { showOperatorPanel } from "./operator/queueScreen";

export function renderHomeScreen(): string {
  const ashokaChakra = Array.from({ length: 24 }, (_, i) => {
    const a = (i * 15 * Math.PI) / 180;
    return `<line x1="${36 + 9 * Math.cos(a)}" y1="${36 + 9 * Math.sin(a)}" x2="${36 + 27 * Math.cos(a)}" y2="${36 + 27 * Math.sin(a)}" stroke="white" stroke-width="2.5"/>`;
  }).join("");

  const flagChakra = Array.from({ length: 24 }, (_, i) => {
    const a = (i * 15 * Math.PI) / 180;
    return `<line x1="${450 + 14 * Math.cos(a)}" y1="${300 + 14 * Math.sin(a)}" x2="${450 + 82 * Math.cos(a)}" y2="${300 + 82 * Math.sin(a)}" stroke="#000080" stroke-width="9"/>`;
  }).join("");

  return `
    <div id="fy-home" class="fy-screen" style="display:flex;flex-direction:column;height:100%;position:relative;">
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
            <div style="font-size:10.5px;color:#aabbd4;font-weight:500;letter-spacing:0.3px;">Your dost for every sarkari kaam <span style="opacity:0.5;font-size:9px;">v${VERSION}</span></div>
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
          <div id="fy-pending-sessions"></div>
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
            <span style="font-size:11px;color:#50507a;font-weight:500;">Your details are <strong style="color:#0a0a2e;">saved only on your device</strong> — never on our servers</span>
          </div>
        </div>
        <div style="margin-top:12px;text-align:center;display:flex;gap:16px;justify-content:center;flex-wrap:wrap;">
          <button id="fy-operator-mode" style="background:transparent;border:none;color:#94a3b8;font-size:11px;cursor:pointer;font-family:inherit;text-decoration:underline;">
            Cafe operator? Sign in here
          </button>
          <button id="fy-recover-session" style="background:transparent;border:none;color:#94a3b8;font-size:11px;cursor:pointer;font-family:inherit;text-decoration:underline;">
            Already paid? Recover session
          </button>
        </div>
        <div style="margin-top:10px;padding:6px 4px;text-align:center;display:flex;align-items:flex-start;gap:6px;justify-content:center;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2.2" stroke-linecap="round" style="flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <p style="font-size:9.5px;color:#aaa;line-height:1.5;font-weight:400;text-align:left;">Not affiliated with any government entity. FormYaar is a private service that helps you fill forms with ease. Anonymous usage events are collected to improve the service.</p>
        </div>
      </div>
      <button id="fy-clear-data" title="Clear my data" style="position:absolute;bottom:16px;right:16px;width:26px;height:26px;border-radius:30%;background:#fff0f0;border:1.5px solid #fca5a5;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(239,68,68,0.15);padding:0;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/>
          <path d="M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
    </div>
  `;
}

export function renderPanCard(): string {
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

export function renderLockedCard(name: string, iconSVG: string): string {
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

export function renderAadhaarIcon(): string {
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

export function renderDLIcon(): string {
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

export function renderVoterIcon(): string {
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

export function renderPassportIcon(): string {
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

export function renderVisaIcon(): string {
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

const FORM_LABELS: Record<string, string> = {
  pan_card: "PAN Card — New Application",
};

export async function refreshPendingSessions(): Promise<void> {
  const container = document.getElementById("fy-pending-sessions");
  if (!container) return;

  const result = await browser.storage.local.get("fy_active_session");
  const session = result["fy_active_session"] as ActiveSession | undefined;

  if (!session || session.completed) {
    container.innerHTML = "";
    return;
  }

  const label = FORM_LABELS[session.form] ?? session.form;
  const paidDate = new Date(session.paid_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  container.innerHTML = `
    <div style="margin-top:14px;background:#fff8eb;border:1.5px solid #f5d27a;border-radius:12px;padding:12px 13px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#b8860b;margin-bottom:8px;">In Progress</div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <div>
          <div style="font-size:13px;font-weight:700;color:#0a0a2e;">${label}</div>
          <div style="font-size:11px;color:#7a5a00;margin-top:2px;">Paid ${paidDate}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button id="fy-session-discard" style="padding:7px 10px;background:transparent;color:#ef4444;border:1.5px solid #ef4444;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">Discard</button>
          <button id="fy-session-continue" style="padding:7px 12px;background:#000080;color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">Continue →</button>
        </div>
      </div>
    </div>
  `;

  document
    .getElementById("fy-session-continue")
    ?.addEventListener("click", async () => {
      const existing = await getUserData();
      if (!existing.first_name.trim()) {
        alert(
          "Your details are not saved on this device. Please fill in your details first (tap the PAN card option on the home screen).\n\nIf you have already paid but are still seeing this message:\n1. Try a hard refresh — press Ctrl+Shift+R (or Cmd+Shift+R on Mac) and click Continue again.\n\nIf that doesn't work, contact us and we'll let you fill your PAN form for free (one time):\n📧 formyaar@gmail.com\n📞 +91 9897031039",
        );
        return;
      }
      if (window.location.hostname === "onlineservices.proteantech.in") {
        // Already on NSDL — panel exists, run directly without a page reload
        await browser.storage.session.set({
          autofillActive: {
            form: session.form,
            done: [window.location.pathname],
          },
        });
        runAutofill(session.form);
      } else {
        await browser.storage.session.set({
          autofillActive: { form: session.form, done: [] },
        });
        window.location.href =
          "https://onlineservices.proteantech.in/paam/endUserRegisterContact.html";
      }
    });

  document
    .getElementById("fy-session-discard")
    ?.addEventListener("click", async () => {
      if (!confirm("Discard this application? You won't be able to undo this."))
        return;
      await clearActiveSession();
      container.innerHTML = "";
    });
}

export function attachHomeScreenHandlers() {
  refreshPendingSessions();

  document.getElementById("fy-pan-card")?.addEventListener("click", () => {
    trackEvent("panel_opened", "pan_card");
    showUserForm("pan_card");
  });

  document.getElementById("fy-operator-mode")?.addEventListener("click", () => {
    showOperatorPanel();
  });

  document
    .getElementById("fy-recover-session")
    ?.addEventListener("click", () => {
      document.getElementById("fy-home")!.style.display = "none";
      document.getElementById("fy-recover")!.style.display = "flex";
    });

  document
    .getElementById("fy-clear-data")
    ?.addEventListener("click", async () => {
      const confirmed = window.confirm(
        "This will delete all your saved form details from this device. Continue?",
      );
      if (!confirmed) return;
      await Promise.all([
        browser.storage.local.remove(["fy_user_data", "fy_active_session"]),
        browser.storage.session.remove([
          "autofillActive",
          "aadhaar_last_4",
          "passport_number",
          "tin_number",
        ]),
      ]);
      refreshPendingSessions();
    });
}
