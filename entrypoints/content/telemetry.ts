import { BACKEND_URL } from "./constants";

export function trackEvent(
  event: string,
  form = "pan_card",
  metadata: Record<string, unknown> = {},
): void {
  // Fire and forget — never block the user flow
  fetch(`${BACKEND_URL}/telemetry/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, form, metadata }),
  }).catch(() => {
    // Silently ignore — telemetry should never cause errors
  });
}
