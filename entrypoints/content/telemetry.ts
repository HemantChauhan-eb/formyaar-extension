import { BACKEND_URL } from "./constants";

export function trackEvent(
  event: string,
  form = "pan_card",
  metadata: Record<string, unknown> = {},
): void {
  // Route through background to bypass NSDL's CSP restrictions
  browser.runtime
    .sendMessage({
      type: "TELEMETRY_EVENT",
      payload: { event, form, metadata },
    })
    .catch(() => {
      // Silently ignore — telemetry must never break user flow
    });
}
