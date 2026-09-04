import { VERSION } from "../constants";
import { trackEvent } from "../telemetry";
import {
  getUserData,
  clearActiveSession,
  type ActiveSession,
} from "../userData";
import { runAutofill } from "../autofill";
import { showChooser } from "./chooserScreen";
import { showOperatorPanel } from "./operator/queueScreen";
import { renderHeader } from "./shared";

export function renderHomeScreen(): string {
  const icon = (path: string) =>
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

  return `
    <div id="fy-home" class="fy-screen" style="display:flex;flex-direction:column;height:100%;position:relative;background:var(--fy-bg);">
      ${renderHeader({
        subtitle: `v${VERSION}`,
        rightHtml: `
          <a href="https://formyaar.in/contact" target="_blank" class="fy-hdr-link" title="Help" aria-label="Help">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.2 9a2.9 2.9 0 0 1 5.6 1c0 1.8-2.6 2.3-2.6 3.8M12 17.2v.2"/></svg>
          </a>`,
      })}

      <div style="flex:1;overflow-y:auto;padding:0 24px 20px;display:flex;flex-direction:column;">
        <div id="fy-pending-sessions"></div>

        ${renderPanCard()}

        <!-- Quiet reassurance — plain text, no boxes -->
        <div style="display:flex;flex-direction:column;gap:9px;margin-top:26px;">
          <div class="fy-quietrow">
            ${icon('<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/>')}
            <span data-i18n-html="home.trust1_html">Your details are saved <strong>only on this device</strong> — never on our servers</span>
          </div>
          <div class="fy-quietrow">
            ${icon('<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3.5V8h4.5"/>')}
            <span data-i18n-html="home.trust2_html"><strong>Full refund</strong> if the government rejects your form</span>
          </div>
          <div class="fy-quietrow">
            ${icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>')}
            <span data-i18n="home.trust3">You review everything before it's submitted</span>
          </div>
        </div>

        <div style="flex:1;"></div>

        <!-- Footer: everything secondary stays whisper-quiet -->
        <div style="border-top:1px solid var(--fy-line);padding-top:14px;margin-top:26px;">
          <div data-i18n="home.coming_soon" style="font-size:10.5px;color:var(--fy-faint);text-align:center;margin-bottom:8px;">
            Coming soon — Aadhaar · Driving Licence · Passport · Voter ID
          </div>
          <div style="display:flex;gap:18px;justify-content:center;">
            <button id="fy-operator-mode" class="fy-textlink" data-i18n="home.operator">Cafe operator?</button>
            <button id="fy-recover-session" class="fy-textlink" data-i18n="home.recover">Already paid? Recover</button>
          </div>
          <p data-i18n="home.footer_note" style="font-size:9px;color:var(--fy-faint);line-height:1.5;text-align:center;margin-top:10px;">
            Not affiliated with any government entity. FormYaar is a private service. Usage data and your mobile number are collected — see formyaar.in/privacy-policy
          </p>
        </div>
      </div>

      <button id="fy-clear-data" data-i18n-title="home.clear_data_title" title="Delete my saved details" style="position:absolute;top:13px;right:52px;width:30px;height:30px;border-radius:9px;background:transparent;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;color:var(--fy-faint);transition:color 0.15s,background 0.15s;"
        onmouseover="this.style.color='#d43c33';this.style.background='#fdf0ef';"
        onmouseout="this.style.color='#b6bcc9';this.style.background='transparent';">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
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
    <div style="text-align:center;padding-top:34px;">
      <svg viewBox="0 0 84 54" width="148" height="95" style="display:inline-block;border-radius:6px;box-shadow:0 10px 30px -8px rgba(12,19,34,0.22);">
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

      <h1 data-i18n="home.title" style="margin-top:22px;font-size:21px;font-weight:800;color:var(--fy-ink);letter-spacing:-0.4px;line-height:1.25;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
        Get your PAN card made.
      </h1>
      <p data-i18n="home.subtitle" style="margin:9px auto 0;font-size:13px;color:var(--fy-muted);line-height:1.6;max-width:270px;">
        We type the entire government form for you. You just check it and submit.
      </p>

      <button id="fy-pan-card" class="fy-btn fy-btn-primary fy-btn-block" data-i18n="home.cta" style="margin-top:22px;">
        Start — it takes 5 minutes
      </button>
      <div data-i18n="home.price_note" style="margin-top:9px;font-size:11px;color:var(--fy-muted);">
        ₹39 · pay only when your details are ready
      </div>
    </div>
  `;
}

// Kept for compatibility — the minimal home no longer renders locked
// document cards, but other code may still import these.
export function renderLockedCard(name: string, iconSVG: string): string {
  return `
    <button style="background:var(--fy-bg);border:1px solid var(--fy-line);border-radius:11px;padding:10px 4px 9px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:not-allowed;text-align:center;width:100%;">
      <div style="filter:grayscale(0.85);opacity:0.55;line-height:0;">${iconSVG}</div>
      <div style="font-size:10px;font-weight:700;color:#9aa3b5;line-height:1.2;">${name}</div>
    </button>
  `;
}

export function renderAadhaarIcon(): string {
  return `<svg viewBox="0 0 84 54" width="56" height="36" xmlns="http://www.w3.org/2000/svg">
    <rect width="84" height="54" rx="4" fill="#fbf6ee"/>
    <rect width="84" height="54" rx="4" fill="none" stroke="#d8cdb8" stroke-width="0.8"/>
    <rect x="14" y="4" width="44" height="4" rx="1" fill="#f08a1c"/>
    <rect x="14" y="9.5" width="44" height="4" rx="1" fill="#1a8a3a"/>
    <rect x="4" y="20" width="18" height="22" rx="1.5" fill="#e8e0d0" stroke="#bfb39a" stroke-width="0.6"/>
    <circle cx="13" cy="28" r="3.2" fill="#b8ac92"/>
    <path d="M6.5 41 Q13 32 19.5 41 Z" fill="#b8ac92"/>
    <text x="25" y="42" font-size="6" fill="#1f1f1f" font-weight="bold" font-family="'Courier New',monospace" letter-spacing="0.6">XXXX XXXX XXXX</text>
    <rect x="0" y="49" width="84" height="1" fill="#d94b3a"/>
  </svg>`;
}

export function renderDLIcon(): string {
  return `<svg viewBox="0 0 84 54" width="56" height="36" xmlns="http://www.w3.org/2000/svg">
    <rect width="84" height="54" rx="4" fill="#f7f3ec"/>
    <rect width="84" height="54" rx="4" fill="none" stroke="#c9bfa8" stroke-width="0.8"/>
    <rect x="0" y="0" width="84" height="11" rx="4" fill="#b81d24"/>
    <text x="42" y="9.5" font-size="3.4" fill="#fff" font-weight="bold" font-family="Arial,sans-serif" text-anchor="middle">DRIVING LICENCE</text>
    <rect x="65" y="20" width="15" height="19" rx="1" fill="#e6dfd0" stroke="#bfb39a" stroke-width="0.5"/>
    <circle cx="72.5" cy="27" r="2.6" fill="#b8ac92"/>
    <path d="M67 38 Q72.5 31.5 78 38 Z" fill="#b8ac92"/>
  </svg>`;
}

export function renderVoterIcon(): string {
  return `<svg viewBox="0 0 84 54" width="56" height="36" xmlns="http://www.w3.org/2000/svg">
    <rect width="84" height="54" rx="4" fill="#f3ead4"/>
    <rect width="84" height="54" rx="4" fill="none" stroke="#cdb98a" stroke-width="0.8"/>
    <text x="42" y="10" font-size="2.8" fill="#1a4a22" font-weight="bold" font-family="Arial,sans-serif" text-anchor="middle">ELECTION COMMISSION OF INDIA</text>
    <rect x="6" y="20" width="16" height="20" rx="1" fill="#e2d9bf" stroke="#a89766" stroke-width="0.5"/>
    <circle cx="14" cy="27" r="2.8" fill="#9e8d63"/>
    <path d="M8 39 Q14 31.5 20 39 Z" fill="#9e8d63"/>
    <rect x="0" y="52" width="84" height="2" fill="#d9692a" opacity="0.85"/>
  </svg>`;
}

export function renderPassportIcon(): string {
  return `<svg viewBox="0 0 84 54" width="56" height="36" xmlns="http://www.w3.org/2000/svg">
    <rect width="84" height="54" rx="3" fill="#0e1a3a"/>
    <text x="42" y="16.5" font-size="4.4" fill="#c9a95c" font-family="Georgia,serif" letter-spacing="1.2" text-anchor="middle" font-weight="bold">PASSPORT</text>
    <text x="42" y="50" font-size="3.4" fill="#c9a95c" font-family="Georgia,serif" letter-spacing="0.8" text-anchor="middle" font-weight="bold">REPUBLIC OF INDIA</text>
  </svg>`;
}

export function renderVisaIcon(): string {
  return `<svg viewBox="0 0 84 54" width="56" height="36" xmlns="http://www.w3.org/2000/svg">
    <rect width="84" height="54" rx="3" fill="#dceaf6"/>
    <rect width="84" height="54" rx="3" fill="none" stroke="#b8a8c4" stroke-width="0.6"/>
    <text x="60" y="14.5" font-size="8.5" fill="#d63384" font-weight="bold" font-family="Georgia,serif" letter-spacing="1">VISA</text>
    <rect x="3" y="20" width="14" height="17" rx="0.8" fill="#b88a6a" opacity="0.7" stroke="#7a5238" stroke-width="0.4"/>
  </svg>`;
}

const FORM_LABELS: Record<string, string> = {
  pan_card: "PAN Card — New Application",
  adult_new_pan_card_supporting_docs: "PAN Card — Supporting Documents",
  correction_pan_card: "PAN Card — Changes / Correction",
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
    <div style="margin-top:16px;background:var(--fy-field);border-radius:13px;padding:14px;">
      <div style="font-size:12.5px;font-weight:700;color:var(--fy-ink);">${label}</div>
      <div style="font-size:11px;color:var(--fy-muted);margin-top:2px;">Paid ${paidDate} — ready to continue</div>
      <div style="display:flex;gap:8px;margin-top:11px;">
        <button id="fy-session-discard" class="fy-textlink" style="flex-shrink:0;">Discard</button>
        <button id="fy-session-continue" class="fy-btn fy-btn-primary" style="flex:1;padding:10px;font-size:12.5px;border-radius:10px;">Continue →</button>
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

  // The Start button no longer commits the user to a specific form — it opens
  // the chooser, which is the only thing that calls showUserForm().
  document.getElementById("fy-pan-card")?.addEventListener("click", () => {
    trackEvent("panel_opened");
    showChooser();
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
