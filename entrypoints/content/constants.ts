// Single source of truth — version comes from package.json via Vite
export const VERSION = (import.meta.env.VITE_APP_VERSION as string) ?? "0.33.3";
export const CWS_LISTING_URL =
  "https://chromewebstore.google.com/detail/formyaar/anibapibnfjepjpomkpoifpolbagajag";

export const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string) ??
  "https://formyaar-backend-production-ad09.up.railway.app";

// How long a paid session stays recoverable. Mirrors SESSION_TTL_DAYS in the
// backend's sessions.ts — the panel tells the applicant this number, so the
// two must not drift.
export const SESSION_RECOVERY_DAYS = 14;

// Where an applicant reaches a human.
//
// Kept here rather than inline in a screen because more than one screen needs
// it, and a phone number that is right in one place and stale in another is
// worse than no phone number: someone who has paid and cannot continue rings
// it, gets nothing, and now has a payment and no way through.
//
// Both numbers take WhatsApp and calls; the email is shared. Mirrors what
// formyaar-website/contact.html publishes — if that page changes, change this.
export const SUPPORT = {
  phones: ["+919897031039", "+919057779366"],
  email: "formyaar@gmail.com",
  // Stated because the recover screen is reached by someone who has already
  // paid and is stuck. Sending them to a phone that rings out at 11pm, with no
  // warning it would, is worse than pointing them at WhatsApp in the first
  // place — which is why WhatsApp leads and the hours sit under the numbers.
  callHours: "Mon–Sun · 10am–2:30pm IST",
} as const;

/** Pretty form for display: +91 98970 31039 */
export function formatPhone(e164: string): string {
  const d = e164.replace(/\D/g, "").replace(/^91/, "");
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}

// Where a PAN application begins. Needed in two places — the resume path and
// the "start again" button on the site-error screen — so it lives here rather
// than being typed out twice.
export const NSDL_START_URL =
  "https://onlineservices.proteantech.in/paam/endUserRegisterContact.html";

export const PANEL_WIDTH = 400;
export const PANEL_TRANSITION_MS = 300;
export const BANNER_DELAY_MS = 1500;
export const PULSE_INITIAL_DELAY_MS = 5000;
export const PULSE_INTERVAL_MS = 10000;
export const OVERLAY_SCROLL_PAD = 8;
export const OVERLAY_TRANSITION_MS = 400;
export const SKIP_FLASH_DURATION_MS = 400;
export const SKIP_ADVANCE_DELAY_MS = 600;
export const COMPLETION_AUTO_DISMISS_MS = 30000;
export const SELECT_POLL_INTERVAL_MS = 300;

export const Z_INDEX = {
  BARS: 999997,
  SPOTLIGHT: 999998,
  TOOLTIP: 999999,
  PANEL: 2147483647,
};

export const SITE_CONFIGS: Record<string, { title: string; form: string }> = {
  "onlineservices.nsdl.com": {
    title: "Looks like you're applying for a PAN card.",
    form: "pan_card",
  },
  "onlineservices.proteantech.in": {
    title: "Looks like you're applying for a PAN card.",
    form: "pan_card",
  },
  "www.utiitsl.com": {
    title: "Looks like you're on the PAN card portal.",
    form: "pan_card",
  },
  "passporthub.gov.in": {
    title: "Looks like you're applying for a Passport.",
    form: "passport",
  },
  "sarathi.parivahan.gov.in": {
    title: "Looks like you're on the Driving License portal.",
    form: "driving_license",
  },
};
