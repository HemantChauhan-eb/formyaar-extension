import { BACKEND_URL } from "./constants";
import { trackEvent } from "./telemetry";
import panCardConfig from "../../public/configs/pan_card.json";
import correctionPanCardConfig from "../../public/configs/correction_pan_card.json";
import {
  showFillingScreen,
  showVerifyScreen,
  updateFillProgress,
  resetFillingScreenChrome,
  celebrateTimeSaved,
} from "./panel";
import { showUploadScreen } from "./uploadScreen";
import { getUserData, type UserData } from "./userData";
import {
  validateFormConfig,
  type FormConfig,
  type FieldConfig,
  type StepConfig,
} from "./formConfig";

// Forms whose last config step ends on the NSDL/Protean "Save Draft" →
// fullFormSave.html document-upload page. index.ts independently detects
// that page by URL pattern (not by form), so this only controls whether the
// panel jumps straight to the upload-guidance screen the moment this last
// step's fields are filled, vs. showing the generic verify screen for the
// brief instant before the page navigates there.
const FORMS_WITH_DOC_UPLOAD_PAGE = new Set([
  "pan_card",
  "adult_new_pan_card_supporting_docs",
  "correction_pan_card",
]);

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
  // adult_new_pan_card_supporting_docs
  submission_mode_supporting_docs: "Submission mode (supporting documents)",
  esign_vendor: "e-Sign vendor",
  address_for_communication: "Address for communication",
  current_address_flat: "Flat/Door/Building",
  current_address_street: "Road/Street/Block/Sector",
  current_address_post_office: "Post office",
  current_address_city: "Area/Locality/Town/City",
  current_address_district: "District",
  current_address_country: "Country",
  current_address_state: "State",
  current_address_pin_code: "PIN code (current address)",
  mobile_num: "Mobile number",
  rep_ase_no: "Representative Assessee",
  poid_code: "Proof of identity",
  poa_code: "Proof of address",
  verifier_name: "Declarant name (\"I, ___\")",
  declaration_name: "Declarant name",
  name_as_per_aadhaar: "Name as per Aadhaar",
  // correction_pan_card
  citizen_of_india: "Citizen of India",
  physical_pan_yes: "Physical PAN card",
  physical_pan_no: "ePAN only",
  // The correction form's per-section "change this" ticks
  update_flag_aadhaar: "Mark Aadhaar for change",
  update_flag_name: "Mark name for change",
  update_flag_dob: "Mark date of birth for change",
  update_flag_gender: "Mark gender for change",
  update_flag_parents: "Mark parents' details for change",
  update_flag_contact: "Mark contact details for change",
  passport_num: "Passport number",
  tin_num: "TIN",
  proof_dob_code: "Proof of date of birth",
  proof_pan_code: "Proof of PAN",
  no_of_docs: "Documents enclosed",
  save_draft: "Save draft",
};

export function getCurrentStepyIndex(): number {
  // Primary: stepy header active class — most reliable indicator
  const headers = document.querySelectorAll(".stepy-header li");
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].classList.contains("stepy-active")) return i;
  }
  // Fallback: inline display style on fieldsets
  let idx = -1;
  document.querySelectorAll(".stepy-step").forEach((fs, i) => {
    if ((fs as HTMLElement).style.display !== "none") idx = i;
  });
  return idx;
}

// ─── Main entry point ────────────────────────────────────────────────
// True while a fill is actually typing into the page. The step-review watcher
// checks this: the fill advances the site's own stepper as it goes, and those
// programmatic step changes look identical to a user clicking one — without
// the guard, review mode would overwrite the live progress list mid-fill.
let filling = false;
export const isFilling = (): boolean => filling;

export async function runAutofill(form: string = "pan_card") {
  filling = true;
  try {
    await runAutofillInner(form);
  } finally {
    filling = false;
  }
}

async function runAutofillInner(form: string = "pan_card") {
  showFillingScreen();
  // Review mode reuses these nodes, so a fill starting after one must put the
  // spinner and headings back before it writes any progress.
  resetFillingScreenChrome();

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
  if (step.guidance_only) {
    showVerifyScreen(step.completion);
    return;
  }
  // Initial progress: all pending
  const progress = step.fields.map((f) => ({
    label: FIELD_LABELS[f.field_id] ?? f.field_id,
    status: "pending" as
      | "done"
      | "active"
      | "pending"
      | "skipped"
      | "intentional",
    note: undefined as string | undefined,
  }));
  updateFillProgress(progress);

  // Fill each field with delay
  for (let i = 0; i < step.fields.length; i++) {
    const field = { ...step.fields[i], _step: step.step };
    const value = resolveValue(field, userData);

    // Optional field the applicant has no value for. Don't touch it, and say
    // why — left to the normal path it would report a green tick for an empty
    // box (fillText always succeeds), which reads as "FormYaar filled this"
    // for a field it deliberately left alone.
    if (field.skip_when_empty && (value === "" || value === false)) {
      progress[i].status = "intentional";
      progress[i].note = field.skip_reason ?? "Not needed for your PAN";
      updateFillProgress([...progress]);
      continue;
    }

    progress[i].status = "active";
    updateFillProgress([...progress]);

    // Scroll the target field into view so the user can follow along
    const el = document.querySelector(field.selector);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });

    const ok = await fillField(field, value, form);
    const baseDelay = field.type === "button_click" ? 2500 : 150;
    const delay = (ok && field.min_delay_ms) ? field.min_delay_ms : baseDelay;
    await sleep(delay);
    // Show fills honestly: a field we couldn't fill is "skipped" (muted), not a
    // false green check. Still non-fatal — the loop continues either way.
    progress[i].status = ok ? "done" : "skipped";
    // No note on a failure: the panel renders these as a plain "Skipped" row,
    // and we have no truthful reason to put under it. The status itself is
    // still "skipped" rather than "intentional" so telemetry and any future
    // UI can tell a real failure from a field we left alone by design.
    updateFillProgress([...progress]);
  }

  // Keep what we did on this step so the panel can show it again when the user
  // clicks back to the step in the site's own stepper. Keyed by stepy_index
  // because that is literally the index of the page's own fieldset (see
  // matchStep), so the stored rows line up with whatever step is on screen —
  // including on later pages that re-render the same wizard.
  if (typeof step.stepy_index === "number") {
    try {
      const prev = await browser.storage.session.get("fillHistory");
      const history = (prev.fillHistory ?? {}) as Record<string, unknown>;
      await browser.storage.session.set({
        fillHistory: {
          ...history,
          [String(step.stepy_index)]: progress,
        },
      });
    } catch {
      // Nice-to-have only — never let history bookkeeping break a paid fill.
    }
  }

  trackEvent("guide_completed", form);

  // Fill AO code fields directly on step 4.
  // Gated on the AO input actually being present, not on the step index alone:
  // the correction form has no AO Code fieldset at all (Guidelines, Personal,
  // Contact, Document — four in total), so its Document step also sits at
  // stepy_index 3 and would otherwise trigger a pointless PIN-code lookup.
  if (step.stepy_index === 3 && document.getElementById("area_code")) {
    const isDefence =
      userData.is_defence === true || (userData.is_defence as any) === "true";
    if (isDefence) {
      const branch = (userData as any).defence_branch as string;
      if (branch) {
        try {
          const url = (browser.runtime.getURL as (p: string) => string)("configs/defence.json");
          const res = await fetch(url);
          if (res.ok) {
            const defenceAO = await res.json();
            const target: AOCode | undefined = defenceAO[branch];
            if (target) fillAOCodeFields(target);
          }
        } catch {
          // Fallback to hardcoded if file can't be read
          const FALLBACK: Record<string, AOCode> = {
            army:      { area_code: "PNE", ao_type: "W", range_code: "55", ao_number: "3" },
            air_force: { area_code: "DEL", ao_type: "W", range_code: "72", ao_number: "2" },
          };
          if (FALLBACK[branch]) fillAOCodeFields(FALLBACK[branch]);
        }
      }
    } else {
      await autoFillAOCode(
        userData.aadhaar_pin_code,
        primaryIncomeSource(userData.income_source),
        form,
      );
    }
  }
  await sleep(400);

  if (FORMS_WITH_DOC_UPLOAD_PAGE.has(form) && isLastStep) {
    showUploadScreen({ markCompleted: true });
    celebrateTimeSaved(step.fields.length);
  } else if (step.auto_advance) {
    // Click Next and wait for stepy to actually change before running next step.
    // Handled here (not via index.ts click listener) to avoid infinite loops
    // when NSDL validation errors trigger the MutationObserver on the same step.
    celebrateTimeSaved(step.fields.length);
    // Find Next button inside the CURRENT visible fieldset — not the first in DOM
    // which would be inside the hidden Guidelines step
    const visibleFieldset = Array.from(document.querySelectorAll(".stepy-step"))
      .find(fs => (fs as HTMLElement).style.display !== "none");
    const nextBtn = (visibleFieldset?.querySelector("a.button-next") ??
      document.querySelector("a.button-next")) as HTMLElement | null;
    if (nextBtn) {
      const stepyBefore = getCurrentStepyIndex();
      (window as any).__fy_auto_advancing = true;
      // Use jQuery trigger if available — stepy.js listens via jQuery event
      // delegation and may not respond to raw dispatchEvent
      const jq = (window as any).$;
      if (jq) {
        jq(nextBtn).trigger("click");
      } else {
        nextBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      }
      setTimeout(() => { (window as any).__fy_auto_advancing = false; }, 200);
      // Poll until stepy changes (max 4s — if validation error, give up cleanly)
      let elapsed = 0;
      while (elapsed < 4000) {
        await sleep(150);
        elapsed += 150;
        if (getCurrentStepyIndex() !== stepyBefore) {
          await sleep(200); // let NSDL finish animating
          await runAutofill(form);
          return;
        }
      }
      // Stepy didn't change — likely a validation error, show verify so user knows
      showVerifyScreen({ title: "Review required", subtitle: "Fix any errors on the page, then click Next →" });
    }
  } else {
    showVerifyScreen(step.completion);
    celebrateTimeSaved(step.fields.length);
    // Show a page-level coach mark if the step config requests one
    const coach = step.page_coach as { selector: string; message: string } | undefined;
    if (coach) showCoachMark(coach.selector, coach.message);
  }
}

function showCoachMark(selector: string, message: string): void {
  const target = document.querySelector(selector) as HTMLElement | null;
  if (!target) return;

  // Subtle pulse on the target button so it's clearly the thing to click
  const prevOutline = target.style.outline;
  target.style.outline = "3px solid #f59e0b";
  target.style.outlineOffset = "3px";

  const mark = document.createElement("div");
  mark.id = "fy-coach-mark";

  const rect = target.getBoundingClientRect();
  const top = rect.top + window.scrollY - 72;
  const left = rect.left + window.scrollX + rect.width / 2;

  mark.style.cssText = `
    position: absolute;
    top: ${top}px;
    left: ${left}px;
    transform: translateX(-50%);
    background: #0a0a2e;
    color: #fff;
    font-family: 'DM Sans', -apple-system, sans-serif;
    font-size: 13.5px;
    font-weight: 700;
    padding: 10px 16px;
    border-radius: 10px;
    white-space: nowrap;
    z-index: 2147483640;
    box-shadow: 0 8px 24px rgba(0,0,0,0.35);
    pointer-events: none;
  `;
  // Arrow pointing down toward the button
  mark.innerHTML = `
    ${message}
    <div style="
      position:absolute; bottom:-7px; left:50%; transform:translateX(-50%);
      width:0; height:0;
      border-left:7px solid transparent;
      border-right:7px solid transparent;
      border-top:7px solid #0a0a2e;
    "></div>
  `;

  document.body.appendChild(mark);

  // Remove when user clicks the target button (page will navigate anyway)
  const cleanup = () => {
    mark.remove();
    target.style.outline = prevOutline;
    target.style.outlineOffset = "";
    target.removeEventListener("click", cleanup);
  };
  target.addEventListener("click", cleanup);
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
    is_single_parent_father: !!(sub.is_single_parent) && sub.name_to_print === "father",
    is_single_parent_mother: !!(sub.is_single_parent) && sub.name_to_print === "mother",
    aadhaar_pin_code: sub.pincode ?? "",
    place: sub.city ?? "",
    is_defence: sub.defence ?? false,
    defence_branch: (({ army: "army", "air force": "air_force", air_force: "air_force" } as Record<string, string>)[String(sub.defence_branch ?? "").toLowerCase()] ?? "") as "army" | "air_force" | "",
    passport_number: "",
    tin_number: "",
    proof_of_dob: sub.proof_of_dob ?? "",
    income_source: incomeSources as UserData["income_source"],
  };

  delete (window as any).__fy_operator_userdata;

  const { setOperatorSubmission } = await import("./userData");
  await setOperatorSubmission(userData);
}

export async function runAutofillFromSubmission(sub: any): Promise<void> {
  await prepareOperatorSubmission(sub);
  await runAutofill(sub.form_type);
}
const BUNDLED_CONFIGS: Record<string, FormConfig> = {
  pan_card: panCardConfig as unknown as FormConfig,
  correction_pan_card: correctionPanCardConfig as unknown as FormConfig,
};

// ─── Fetch config — backend first for live updates, bundled as fallback ─
// Every config is validated before it's allowed to run: a malformed backend
// push (bad selector shape, missing fields, truncated payload) is rejected and
// we fall back to the bundled copy rather than half-filling a paid-for
// government form. An invalid backend config also fires a critical telemetry
// alert so the team hears about a bad push immediately.
async function fetchConfig(form: string): Promise<FormConfig | null> {
  // Backend first — allows pushing selector fixes without an extension update
  try {
    const res = await fetch(`${BACKEND_URL}/configs/${form}/latest`);
    if (res.ok) {
      const out: { reason?: string } = {};
      const valid = validateFormConfig(await res.json(), out);
      if (valid) return valid;
      // Backend returned something, but it's not safe to run.
      trackEvent("autofill_error", form, {
        error: `invalid_backend_config: ${out.reason ?? "unknown"}`,
        step: "config_fetch",
      });
    }
  } catch {
    // network/parse failure — fall through to bundled
  }
  // Bundled fallback — static import, immune to extension context invalidation.
  // Validated too, so a bad bundled copy can't slip through either.
  return validateFormConfig(BUNDLED_CONFIGS[form]);
}

// ─── Match the current page to a step in the config ──────────────────
function matchStep(config: FormConfig): StepConfig | null {
  const url = window.location.pathname + window.location.search;

  // Check for token page first — regardless of URL
  // (NSDL shows this on registerEndUser.html after submission)
  const tokenRadio = document.querySelector("input.tokenButton");
  if (tokenRadio) {
    return config.steps.find((s) => s.is_token_page === true) ?? null;
  }

  // Page 1 — registerEndUser, simple URL match
  if (!url.includes("endUserLogin")) {
    return (
      config.steps.find((s) => !!s.page_pattern && url.includes(s.page_pattern)) ??
      null
    );
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

  return config.steps.find((s) => s.stepy_index === visibleIndex) ?? null;
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
  // Computed values — derived from more than one UserData field, so they
  // can't be expressed as a plain "user.<key>" lookup.
  if (field.value_source === "computed.full_name") {
    return [userData.first_name, userData.middle_name, userData.last_name]
      .filter(Boolean)
      .join(" ");
  }
  // Special case: checkbox that matches against a user value
  if (
    field.value_source.startsWith("user.") &&
    field.static_value !== undefined
  ) {
    const key = field.value_source.slice(5) as keyof UserData;
    const userVal = userData[key];
    // Multi-select fields (e.g. income_source) store an array — check
    // membership rather than exact equality, so more than one checkbox
    // on the target site can end up checked.
    if (Array.isArray(userVal))
      return (userVal as string[]).includes(field.static_value as string);
    return userVal === field.static_value;
  }
  if (field.value_source === "static") {
    return field.static_value ?? "";
  }
  if (field.value_source.startsWith("user.")) {
    const key = field.value_source.slice(5);
    const v = userData[key as keyof UserData];
    // Array-valued fields (income_source) only make sense via the
    // static_value/checkbox branch above — never as a plain text/select fill.
    return typeof v === "string" || typeof v === "boolean" ? v : "";
  }
  return "";
}

// ─── Fill a single field based on its type ───────────────────────────
async function fillField(
  field: FieldConfig,
  value: string | boolean,
  form: string,
): Promise<boolean> {
  const el = document.querySelector(field.selector) as HTMLElement | null;
  if (import.meta.env.DEV) console.log("FormYaar: fillField called for", field.selector);
  if (!el) {
    console.warn(`FormYaar: field not found ${field.selector}`);
    trackEvent("field_fill_failed", form, {
      field_id: field.field_id,
      selector: field.selector,
      step: field._step ?? "unknown",
    });
    return false;
  }

  if ((el as HTMLInputElement).disabled) {
    // Some NSDL fields are disabled by a one-time $(document).ready() check
    // that runs before our script switches the submission-mode radio, and
    // nothing re-enables them afterward. force_enable is an explicit opt-in
    // per field (set only where we've confirmed via the site's own source
    // that the field should legitimately be editable in our flow) — a plain
    // .disabled skip stays the default for everything else.
    if (field.force_enable) {
      (el as HTMLInputElement).disabled = false;
    } else {
      if (import.meta.env.DEV) console.log(`FormYaar: skipping disabled field ${field.selector}`);
      return false;
    }
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
      if (field.defence_selector) {
        if (value === true || value === "true") {
          const defEl = document.querySelector(
            field.defence_selector,
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
  if (!shouldSelect && !forceClick) return false;
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

// AO jurisdiction rules (cities-ao-code/*.json) key on a single income
// source. When the applicant has multiple, business/professional income
// determines the ward/circle over salary-only, per IT dept convention —
// pick the most "senior" source present rather than an arbitrary one.
const INCOME_SOURCE_PRIORITY: readonly string[] = [
  "business",
  "salary",
  "house_property",
  "capital_gains",
  "other_sources",
  "no_income",
];
function primaryIncomeSource(sources: readonly string[]): string {
  for (const candidate of INCOME_SOURCE_PRIORITY) {
    if (sources.includes(candidate)) return candidate;
  }
  return sources[0] ?? "";
}

async function autoFillAOCode(pinCode: string, incomeSource = "", form = "pan_card"): Promise<boolean> {
  try {
    const params = incomeSource ? `?income=${encodeURIComponent(incomeSource)}` : "";
    const res = await fetch(`${BACKEND_URL}/pincode/${pinCode}${params}`);
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
    trackEvent("ao_code_failed", form, {
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
