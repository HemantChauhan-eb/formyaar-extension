import {
  startGuide,
  nextField,
  getCurrentIndex,
  getTotalFields,
  type Field,
  type Guide,
} from "./guide";
import type { FormConfig } from "./types";
import { BACKEND_URL } from "./constants";
import { showErrorMessage, showCompletionMessage } from "./toasts";
import { startOverlay, stopOverlay } from "./overlay";
import { trackEvent } from "./telemetry";
let activeGuide: Guide | null = null;

export function getActiveGuide(): Guide | null {
  return activeGuide;
}

export async function fetchGuide(form: string): Promise<Guide | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/configs/${form}/latest`);
    if (!res.ok) return null;
    const config: FormConfig = await res.json();

    const currentPath = window.location.pathname + window.location.search;
    const matchingStep =
      config.steps.find((step) =>
        new RegExp(step.page_pattern).test(currentPath),
      ) ?? config.steps[0];

    if (!matchingStep || !matchingStep.fields?.length) return null;

    const fields: Field[] = matchingStep.fields.map((field) => ({
      id: field.field_id,
      selector: field.selectors?.[0]?.value ?? "",
      explanation: field.explanation,
      required: field.required ?? true,
    }));

    return { form: config.form, fields };
  } catch (err) {
    console.warn("FormYaar: could not fetch config:", err);
    return null;
  }
}

export async function beginGuide(form = "pan_card") {
  const guide = await fetchGuide(form);

  if (!guide || guide.fields.length === 0) {
    showErrorMessage(
      "Couldn't load the form guide. Please refresh and try again.",
    );
    return;
  }

  activeGuide = guide;
  startGuide(
    guide,
    (field) => {
      startOverlay(field.selector, field.explanation, field.required ?? true);
    },
    () => {
      trackEvent("guide_completed", form);
      showCompletionMessage();
    },
  );
  trackEvent("guide_started", form);
}

export function handlePageChange() {
  const currentGuideIndex = getCurrentIndex();
  const totalFields = getTotalFields();

  if (currentGuideIndex >= totalFields) return;

  setTimeout(() => {
    const field = activeGuide?.fields[getCurrentIndex()];
    if (!field) return;

    const target = document.querySelector(field.selector);
    if (target) {
      stopOverlay();
      startOverlay(field.selector, field.explanation, field.required ?? true);
    }
  }, 1000);
}
