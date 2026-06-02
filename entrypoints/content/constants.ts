export const VERSION = "0.8.0";
export const CWS_LISTING_URL = "https://chromewebstore.google.com/detail/formyaar/anibapibnfjepjpomkpoifpolbagajag";

export const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string) ??
  "https://formyaar-backend-production-a43e.up.railway.app";

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
