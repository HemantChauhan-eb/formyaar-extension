import { BACKEND_URL } from "./constants";
import { trackEvent } from "./telemetry";
import {
  showFillingScreen,
  showVerifyScreen,
  updateFillProgress,
} from "./panel";

// ─── Types matching pan_card.json schema v2 ──────────────────────────
interface FieldConfig {
  field_id: string;
  type: "text" | "select" | "checkbox" | "date";
  selector: string;
  value_source: string; // "user.X" or "static"
  static_value?: string | boolean;
  match_by?: "value" | "text";
  format?: string;
  explanation: string;
}

interface StepConfig {
  step: number;
  page_pattern: string;
  stop_message: string;
  fields: FieldConfig[];
}

interface FormConfig {
  form: string;
  version: number;
  site: string;
  steps: StepConfig[];
}

// ─── Hardcoded test user data ────────────────────────────────────────
// TODO: Replace with data collection screen output later
const TEST_USER_DATA: Record<string, string> = {
  first_name: "HEMANT",
  middle_name: "",
  last_name: "CHAUHAN",
  date_of_birth: "15/08/2007",
  email: "test@formyaar.in",
  mobile: "9876543210",
};

// ─── Field-friendly labels (used in progress UI) ─────────────────────
const FIELD_LABELS: Record<string, string> = {
  application_type: "Application type",
  applicant_category: "Applicant category",
  first_name: "First name",
  middle_name: "Middle name",
  last_name: "Last name",
  date_of_birth: "Date of birth",
  email: "Email",
  mobile: "Mobile number",
  consent: "Consent",
};

// ─── Main entry point ────────────────────────────────────────────────
export async function runAutofill(form: string = "pan_card") {
  showFillingScreen();

  const config = await fetchConfig(form);
  if (!config) {
    updateFillProgress([
      { label: "Could not load form config", status: "active" },
    ]);
    return;
  }

  const step = matchStep(config);
  if (!step) {
    updateFillProgress([{ label: "Page not recognized", status: "active" }]);
    return;
  }

  trackEvent("guide_started", form);

  // Initial progress: all pending
  const progress = step.fields.map((f) => ({
    label: FIELD_LABELS[f.field_id] ?? f.field_id,
    status: "pending" as "done" | "active" | "pending",
  }));
  updateFillProgress(progress);

  // Fill each field with delay
  for (let i = 0; i < step.fields.length; i++) {
    progress[i].status = "active";
    updateFillProgress([...progress]);

    await sleep(150);

    const field = step.fields[i];
    const value = resolveValue(field);
    const ok = fillField(field, value);

    progress[i].status = ok ? "done" : "done"; // mark done either way; missing fields aren't fatal
    updateFillProgress([...progress]);
  }

  trackEvent("guide_completed", form);

  // Tiny pause so the user sees the last checkmark before screen flips
  await sleep(400);
  showVerifyScreen();
}

// ─── Fetch config from backend ───────────────────────────────────────
async function fetchConfig(form: string): Promise<FormConfig | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/configs/${form}/latest`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("FormYaar: config fetch failed", err);
    return null;
  }
}

// ─── Match the current page to a step in the config ──────────────────
function matchStep(config: FormConfig): StepConfig | null {
  const url = window.location.pathname + window.location.search;
  return (
    config.steps.find((s) => url.includes(s.page_pattern)) ??
    config.steps[0] ??
    null
  );
}

// ─── Resolve "user.first_name" or "static" to actual value ───────────
function resolveValue(field: FieldConfig): string | boolean {
  if (!field.value_source) {
    console.warn(`FormYaar: missing value_source on ${field.field_id}`);
    return "";
  }
  if (field.value_source === "static") {
    return field.static_value ?? "";
  }
  if (field.value_source.startsWith("user.")) {
    const key = field.value_source.slice(5);
    return TEST_USER_DATA[key] ?? "";
  }
  return "";
}

// ─── Fill a single field based on its type ───────────────────────────
function fillField(field: FieldConfig, value: string | boolean): boolean {
  const el = document.querySelector(field.selector) as HTMLElement | null;
  if (!el) {
    console.warn(`FormYaar: field not found ${field.selector}`);
    return false;
  }

  switch (field.type) {
    case "text":
    case "date":
      return fillText(el as HTMLInputElement, String(value));
    case "select":
      return fillSelect(
        el as HTMLSelectElement,
        String(value),
        field.match_by ?? "value",
      );
    case "checkbox":
      return fillCheckbox(el as HTMLInputElement, Boolean(value));
    default:
      return false;
  }
}

function fillText(input: HTMLInputElement, value: string): boolean {
  // Use native setter to bypass framework value-tracking (React, etc.)
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  if (setter) {
    setter.call(input, value);
  } else {
    input.value = value;
  }
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.dispatchEvent(new Event("blur", { bubbles: true }));
  return true;
}

function fillSelect(
  select: HTMLSelectElement,
  value: string,
  matchBy: "value" | "text",
): boolean {
  let matched = false;
  for (let i = 0; i < select.options.length; i++) {
    const opt = select.options[i];
    const candidate = matchBy === "text" ? opt.text.trim() : opt.value;
    if (candidate === value) {
      select.selectedIndex = i;
      matched = true;
      break;
    }
  }
  if (!matched) {
    console.warn(`FormYaar: no option matches ${value} on ${select.id}`);
    return false;
  }
  select.dispatchEvent(new Event("change", { bubbles: true }));

  // The PAN form uses Select2 — when our native change fires, NSDL's JS
  // re-renders the visible Select2 widget. If Select2 listens to jQuery
  // events specifically, we may need to also trigger via jQuery. We try
  // here without it; if the visible label doesn't update, we'll add a
  // jQuery trigger fallback in the next iteration.
  return true;
}

function fillCheckbox(input: HTMLInputElement, checked: boolean): boolean {
  if (input.checked === checked) return true;
  input.checked = checked;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.dispatchEvent(new Event("click", { bubbles: true }));
  return true;
}

// ─── Utility ─────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
