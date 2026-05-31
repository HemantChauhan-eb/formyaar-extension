import { BACKEND_URL } from "./constants";
import { trackEvent } from "./telemetry";
import {
  showFillingScreen,
  showVerifyScreen,
  updateFillProgress,
  celebrateTimeSaved,
} from "./panel";
import { showUploadScreen } from "./uploadScreen";
import { getUserData, type UserData } from "./userData";

// ─── Types matching pan_card.json schema v2 ──────────────────────────
interface FieldConfig {
  field_id: string;
  type: "text" | "select" | "checkbox" | "date" | "radio" | "button_click";
  selector: string;
  value_source: string;
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

// ─── Field-friendly labels (used in progress UI) ─────────────────────
const FIELD_LABELS: Record<string, string> = {
  // Step 1
  application_type: "Application type",
  applicant_category: "Applicant category",
  first_name: "First name",
  middle_name: "Middle name",
  last_name: "Last name",
  date_of_birth: "Date of birth",
  email: "Email",
  mobile: "Mobile number",
  consent: "Consent",
  // Step 2-5
  submission_mode_ekyc: "Submission mode (eKYC)",
  ekyc_photo_consent: "Aadhaar photo consent",
  epan_option: "PAN delivery option",
  aadhaar_last_4: "Aadhaar (last 4)",
  first_name_step2: "First name",
  middle_name_step2: "Middle name",
  last_name_step2: "Last name",
  gender: "Gender",
  father_first_name: "Father's first name",
  father_middle_name: "Father's middle name",
  father_last_name: "Father's last name",
  mother_first_name: "Mother's first name",
  mother_middle_name: "Mother's middle name",
  mother_last_name: "Mother's last name",
  parent_on_card_father: "Father's name on card",
  parent_on_card_mother: "Mother's name on card",
  isd_code: "Country code",
  residential_status_resident: "Residential status",
  aadhaar_pin_code: "PIN code (Aadhaar)",
  ao_indian_citizen: "AO category",
  capacity_verifier: "Declaration capacity",
  place: "Place",
  ao_fetch_btn: "Fetch AO code",
};

// ─── Main entry point ────────────────────────────────────────────────
export async function runAutofill(form: string = "pan_card") {
  showFillingScreen();

  const config = await fetchConfig(form);
  const userData = await getUserData();
  if (!config) {
    updateFillProgress([
      { label: "Could not load form config", status: "active" },
    ]);
    return;
  }

  const step = matchStep(config);
  if (!step) {
    updateFillProgress([{ label: "Page not recognized", status: "active" }]);
    trackEvent("step_match_failed", form, {
      url: window.location.pathname + window.location.search,
    });
    return;
  }
  trackEvent("guide_started", form);

  // If this is the last step we have a config for, clear the active flag
  // so autofill doesn't re-trigger on future visits
  const isLastStep = step.step === config.steps[config.steps.length - 1].step;
  if (isLastStep) {
    await browser.storage.session.remove("autofillActive");
  }
  if ((step as any).guidance_only) {
    showVerifyScreen();
    return;
  }
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

    const field = { ...step.fields[i], _step: step.step };
    const value = resolveValue(field, userData);
    const ok = await fillField(field, value);
    const delay = field.type === "button_click" ? 2500 : 150;
    await sleep(delay);
    progress[i].status = ok ? "done" : "done"; // mark done either way; missing fields aren't fatal
    updateFillProgress([...progress]);
  }

  trackEvent("guide_completed", form);

  // Fill AO code fields directly on step 4
  if ((step as any).stepy_index === 3) {
    const isDefence =
      userData.is_defence === true || (userData.is_defence as any) === "true";
    if (isDefence) {
      const DEFENCE_AO: Record<string, AOCode> = {
        army:      { area_code: "PNE", ao_type: "W", range_code: "55", ao_number: "3" },
        air_force: { area_code: "DEL", ao_type: "W", range_code: "72", ao_number: "2" },
      };
      const branch = (userData as any).defence_branch as string;
      const target = DEFENCE_AO[branch];
      if (target) fillAOCodeFields(target);
    } else {
      await autoFillAOCode(userData.aadhaar_pin_code);
    }
  }
  await sleep(400);

  // Last step of pan_card → show upload helper screen instead of generic verify
  if (form === "pan_card" && isLastStep) {
    showUploadScreen();
  } else {
    showVerifyScreen();
  }

  // Surprise: celebrate the time saved on this step (fields auto-filled).
  celebrateTimeSaved(step.fields.length);
}
export async function prepareOperatorSubmission(sub: any): Promise<void> {
  const incomeSources: string[] = (sub.income_source ?? "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  const userData: Partial<UserData> = {
    first_name: sub.first_name ?? "",
    middle_name: sub.middle_name ?? "",
    last_name: sub.last_name ?? "",
    father_first_name: sub.father_first_name ?? "",
    father_middle_name: sub.father_middle_name ?? "",
    father_last_name: sub.father_last_name ?? "",
    mother_first_name: sub.mother_first_name ?? "",
    mother_middle_name: sub.mother_middle_name ?? "",
    mother_last_name: sub.mother_last_name ?? "",
    date_of_birth: sub.dob ?? "",
    email: sub.email ?? "",
    mobile: sub.mobile ?? "",
    aadhaar_last_4: sub.aadhaar_last_4 ?? (sub.aadhaar_number ? String(sub.aadhaar_number).replace(/\D/g, "").slice(-4) : ""),
    gender: (({ male: "M", female: "F", transgender: "T", m: "M", f: "F", t: "T" } as Record<string, string>)[String(sub.gender ?? "").toLowerCase()] ?? sub.gender ?? "") as "M" | "F" | "T" | "",
    parent_on_card_is_father: sub.name_to_print === "father",
    parent_on_card_is_mother: sub.name_to_print === "mother",
    is_single_parent: sub.is_single_parent ?? false,
    aadhaar_pin_code: sub.pincode ?? "",
    place: sub.city ?? "",
    is_defence: sub.defence ?? false,
    defence_branch: (sub.defence_branch ?? "") as "army" | "air_force" | "",
    passport_number: "",
    tin_number: "",
    proof_of_dob: sub.proof_of_dob ?? "",
    income_source: (incomeSources[0] as UserData["income_source"]) ?? "",
  };

  delete (window as any).__fy_operator_userdata;

  const { setOperatorSubmission } = await import("./userData");
  await setOperatorSubmission(userData);
}

export async function runAutofillFromSubmission(sub: any): Promise<void> {
  await prepareOperatorSubmission(sub);
  await runAutofill(sub.form_type);
}
// ─── Fetch config — backend first for live updates, bundled as fallback ─
async function fetchConfig(form: string): Promise<FormConfig | null> {
  // Backend first — allows pushing selector fixes without an extension update
  try {
    const res = await fetch(`${BACKEND_URL}/configs/${form}/latest`);
    if (res.ok) return await res.json();
  } catch {
    // fall through to bundled
  }
  // Bundled fallback — works offline, satisfies Chrome's local-copy requirement
  try {
    const bundledUrl = (browser.runtime.getURL as (p: string) => string)(`configs/${form}.json`);
    const res = await fetch(bundledUrl);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("FormYaar: config fetch failed", err);
  }
  return null;
}

// ─── Match the current page to a step in the config ──────────────────
function matchStep(config: FormConfig): StepConfig | null {
  const url = window.location.pathname + window.location.search;

  // Check for token page first — regardless of URL
  // (NSDL shows this on registerEndUser.html after submission)
  const tokenRadio = document.querySelector("input.tokenButton");
  if (tokenRadio) {
    return config.steps.find((s: any) => s.is_token_page === true) ?? null;
  }

  // Page 1 — registerEndUser, simple URL match
  if (!url.includes("endUserLogin")) {
    return config.steps.find((s) => url.includes(s.page_pattern)) ?? null;
  }

  // Page 3 — endUserLogin, detect which stepy step is visible
  const fieldsets = document.querySelectorAll(".stepy-step");
  let visibleIndex = -1;
  fieldsets.forEach((fs, i) => {
    if ((fs as HTMLElement).style.display !== "none") {
      visibleIndex = i;
    }
  });

  if (visibleIndex === -1) return null;

  return config.steps.find((s: any) => s.stepy_index === visibleIndex) ?? null;
}

// ─── Resolve "user.first_name" or "static" to actual value ───────────
function resolveValue(
  field: FieldConfig,
  userData: UserData,
): string | boolean {
  if (!field.value_source) {
    console.warn(`FormYaar: missing value_source on ${field.field_id}`);
    return "";
  }
  // Special case: checkbox that matches against a user value
  if (
    field.value_source.startsWith("user.") &&
    field.static_value !== undefined
  ) {
    const key = field.value_source.slice(5) as keyof UserData;
    const userVal = userData[key];
    return userVal === field.static_value;
  }
  if (field.value_source === "static") {
    return field.static_value ?? "";
  }
  if (field.value_source.startsWith("user.")) {
    const key = field.value_source.slice(5);
    const v = userData[key as keyof UserData];
    return v !== undefined ? v : "";
  }
  return "";
}

// ─── Fill a single field based on its type ───────────────────────────
async function fillField(
  field: FieldConfig,
  value: string | boolean,
): Promise<boolean> {
  const el = document.querySelector(field.selector) as HTMLElement | null;
  console.log("FormYaar: fillField called for", field.selector);
  if (!el) {
    console.warn(`FormYaar: field not found ${field.selector}`);
    trackEvent("field_fill_failed", "pan_card", {
      field_id: field.field_id,
      selector: field.selector,
      step: (field as any)._step ?? "unknown",
    });
    return false;
  }

  if ((el as HTMLInputElement).disabled) {
    console.log(`FormYaar: skipping disabled field ${field.selector}`);
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
    case "radio":
      if ((field as any).defence_selector) {
        if (value === true || value === "true") {
          const defEl = document.querySelector(
            (field as any).defence_selector,
          ) as HTMLInputElement | null;
          if (defEl) return fillRadio(defEl, true);
          return false;
        } else {
          return fillRadio(el as HTMLInputElement, true, true);
        }
      }
      return fillRadio(el as HTMLInputElement, Boolean(value));
    case "button_click":
      // Wait for button to be enabled if disabled (e.g. token page)
      if ((el as HTMLButtonElement).disabled) {
        await new Promise<void>((resolve) => {
          const observer = new MutationObserver(() => {
            if (!(el as HTMLButtonElement).disabled) {
              observer.disconnect();
              resolve();
            }
          });
          observer.observe(el, {
            attributes: true,
            attributeFilter: ["disabled"],
          });
          setTimeout(() => {
            observer.disconnect();
            resolve();
          }, 3000);
        });
      }
      return clickButton(el);
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

  // Trigger Select2 update if jQuery and Select2 are available
  try {
    const win = window as any;
    if (win.$ && win.$(select).data("select2")) {
      win.$(select).trigger("change");
    }
  } catch (e) {
    // Select2 not present, ignore
  }

  return true;
}

function fillCheckbox(input: HTMLInputElement, checked: boolean): boolean {
  if (input.checked === checked) return true;
  input.checked = checked;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.dispatchEvent(new Event("click", { bubbles: true }));
  return true;
}
function fillRadio(
  input: HTMLInputElement,
  shouldSelect: boolean,
  forceClick = false,
): boolean {
  if (!shouldSelect && !forceClick) return true;
  if (shouldSelect) {
    if (input.checked && !forceClick) return true;
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("click", { bubbles: true }));
  }
  return true;
}
interface AOCode {
  area_code: string;
  ao_type: string;
  range_code: string;
  ao_number: string;
}

function fillAOCodeFields(ao: AOCode): void {
  const map: [string, string][] = [
    ["area_code", ao.area_code],
    ["ao_type",   ao.ao_type],
    ["range_code", ao.range_code],
    ["ao_num",    ao.ao_number],
  ];
  for (const [id, value] of map) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) fillText(el, value);
  }
}

async function autoFillAOCode(pinCode: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/pincode/${pinCode}`);
    if (!res.ok) return false;
    const { ao_code } = (await res.json()) as { state: string; city: string; ao_code?: AOCode };
    if (!ao_code) {
      console.warn("FormYaar: no AO code in backend response for pincode", pinCode);
      return false;
    }
    fillAOCodeFields(ao_code);
    return true;
  } catch (err) {
    console.error("FormYaar: AO code auto-fill failed", err);
    trackEvent("ao_code_failed", "pan_card", {
      pincode: pinCode,
      reason: err instanceof Error ? err.message : "unknown",
    });
    return false;
  }
}
function clickButton(el: HTMLElement): boolean {
  el.click();
  el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  return true;
}
// ─── Utility ─────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
