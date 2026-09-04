import { BACKEND_URL, PANEL_WIDTH } from "./constants";
import { escapeHtml } from "./panel/shared";
import { trackEvent } from "./telemetry";
import panCardConfig from "../../public/configs/pan_card.json";
import correctionPanCardConfig from "../../public/configs/correction_pan_card.json";
import minorPanCardConfig from "../../public/configs/minor_pan_card.json";
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
export const FIELD_LABELS: Record<string, string> = {
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
  submission_mode_scanned: "Submission mode (scanned + e-Sign)",
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
  eid_checkbox: "EID section tick",
  // minor_pan_card. "Guardian" rather than "Representative Assessee" here too
  // — this map is what the applicant reads in the progress list.
  submission_mode_courier: "Submission mode (post the signed form)",
  address_for_communication_residence: "Card goes to the applicant",
  address_for_communication_guardian: "Card goes to the guardian",
  email_id: "Email",
  rep_assessee_yes: "Applying through a guardian",
  rep_assessee_by_pan: "Identify guardian by PAN",
  guardian_pan_manual: "Guardian's PAN (you type this)",
  guardian_first_name: "Guardian's first name",
  guardian_middle_name: "Guardian's middle name",
  guardian_last_name: "Guardian's last name",
  guardian_address_flat: "Guardian's Flat/Door/Building",
  guardian_address_street: "Guardian's Road/Street/Block/Sector",
  guardian_address_post_office: "Guardian's post office",
  guardian_address_city: "Guardian's Area/Locality/Town/City",
  guardian_address_district: "Guardian's district",
  guardian_address_country: "Guardian's country",
  guardian_address_state: "Guardian's state",
  guardian_address_pin_code: "Guardian's PIN code",
  guardian_isd_code: "Guardian's country code",
  guardian_mobile: "Guardian's mobile number",
  guardian_email: "Guardian's email",
  guardian_poi_code: "Guardian's proof of identity",
  guardian_poa_code: "Guardian's proof of address",
  designation: "Designation",
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
  // Renamed from guide_started, which dated from when this was a guide rather
  // than a fill. guide_started/guide_completed stay in the backend's allowed
  // list because installed extensions below this version still send them.
  const fillStartedAt = Date.now();
  trackEvent("autofill_started", form, {
    step: step.step,
    field_count: step.fields.length,
  });

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

  // The success side of the ledger. Failures were already reported
  // (step_match_failed, field_fill_failed, autofill_error) but nothing marked
  // a fill that worked, so a failure rate had a numerator and no denominator.
  // The per-field outcomes are already sitting in `progress` — this counts
  // them instead of discarding them.
  //
  // Sent from two places and only ever once: a button_click submits the page,
  // which tears this script down mid-loop, so a step whose last field is a
  // click would never reach the call at the end. Most step configs end in a
  // click, so left alone this reports a success rate far below the truth.
  let completionSent = false;
  const sendFillCompletion = () => {
    if (completionSent) return;
    completionSent = true;
    trackEvent("autofill_completed", form, {
      step: step.step,
      duration_seconds: Math.round((Date.now() - fillStartedAt) / 1000),
      filled: progress.filter((p) => p.status === "done").length,
      skipped: progress.filter((p) => p.status === "intentional").length,
      failed: progress.filter((p) => p.status === "skipped").length,
    });
  };

  // Fill each field with delay
  for (let i = 0; i < step.fields.length; i++) {
    const field = { ...step.fields[i], _step: step.step };
    const value = resolveValue(field, userData);

    // The click is the navigation, so the tally has to go out before it.
    if (field.type === "button_click") sendFillCompletion();

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

    // One field the engine deliberately doesn't type. Hands the page back to
    // the applicant, waits for them, then carries on down the same step.
    if (field.type === "pause_for_user") {
      await pauseForUser(field);
      progress[i].status = "done";
      updateFillProgress([...progress]);
      continue;
    }

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

  // No-op if a button_click in the loop above already sent it.
  sendFillCompletion();

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
    // No page_coach here on purpose: these steps end in a Save Draft click that
    // navigates to fullFormSave.html and tears this script down, so anything
    // drawn on this page is gone within the second. Coach marks for that page
    // are raised from index.ts's isDocUploadPage branch, which runs there.
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

// ── Handing one field back to the applicant ──────────────────────────
// Some boxes we refuse to fill on purpose. The guardian's PAN on a minor's
// application is the case this exists for: a PAN is the most sensitive
// identifier on the form, so it is never asked for in the panel, never stored
// and never sent anywhere — which leaves exactly one way for it to reach the
// page, and that is the applicant typing it.
//
// A bottom sheet rather than a full-screen modal, because the field underneath
// has to stay visible and usable while this is up. Mirrors pauseForUser() in
// the Android engine's fill-engine.js; keep the two in step.
function pauseForUser(field: FieldConfig): Promise<void> {
  return new Promise((resolve) => {
    const el = document.querySelector(field.selector) as HTMLInputElement | null;
    const prevOutline = el?.style.outline ?? "";
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.outline = "3px solid #f59e0b";
      el.style.outlineOffset = "3px";
      try {
        el.focus();
      } catch {
        /* focus is a nicety; a refusal here must not stall the fill */
      }
    }

    const sheet = document.createElement("div");
    sheet.id = "fy-pause-sheet";
    sheet.style.cssText = `
      position: fixed; left: 0; right: ${PANEL_WIDTH}px; bottom: 0;
      z-index: 2147483645;
      background: #fff; border-radius: 20px 20px 0 0; padding: 22px 24px;
      box-shadow: 0 -12px 40px rgba(0,0,0,0.28);
      font-family: 'DM Sans', -apple-system, sans-serif;
    `;
    sheet.innerHTML = `
      <div style="font-size:17px;font-weight:800;color:#0a0a2e;margin-bottom:7px;">${escapeHtml(field.pause_title ?? "Your turn")}</div>
      <div style="font-size:13px;color:#64748b;line-height:1.6;margin-bottom:8px;">${escapeHtml(field.pause_body ?? field.pause_message ?? "")}</div>
      <div id="fy-pause-note" style="font-size:12px;color:#b45309;line-height:1.5;margin-bottom:14px;display:none;"></div>
      <button id="fy-pause-continue" disabled style="width:100%;padding:14px;background:#cbd5e1;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:800;font-family:inherit;cursor:not-allowed;">Continue →</button>
    `;
    document.body.appendChild(sheet);

    const btn = sheet.querySelector("#fy-pause-continue") as HTMLButtonElement;
    const note = sheet.querySelector("#fy-pause-note") as HTMLElement;

    // The button stays dead until the box has something in it. That isn't
    // politeness: the site keeps the guardian's middle-name input disabled
    // until a PAN is present, so resuming early silently loses that field
    // further down the same step.
    const refresh = () => {
      const v = el ? el.value.trim() : "";
      const ready = v.length > 0;
      btn.disabled = !ready;
      btn.style.background = ready ? "#305eff" : "#cbd5e1";
      btn.style.cursor = ready ? "pointer" : "not-allowed";
      // A PAN is always 10 characters. Say so, but never block on it — a wrong
      // guess about the format shouldn't strand anyone mid-form.
      const odd = ready && v.length !== 10;
      note.style.display = odd ? "block" : "none";
      if (odd)
        note.textContent =
          "That doesn't look like a PAN — they're 10 characters. Double-check before continuing.";
    };
    el?.addEventListener("input", refresh);
    el?.addEventListener("change", refresh);
    refresh();

    btn.addEventListener("click", () => {
      if (!el || !el.value.trim()) return;
      el.removeEventListener("input", refresh);
      el.removeEventListener("change", refresh);
      el.style.outline = prevOutline;
      el.style.outlineOffset = "";
      sheet.remove();
      resolve();
    });
  });
}

export function showCoachMark(selector: string, message: string): void {
  const target = document.querySelector(selector) as HTMLElement | null;
  // Silent no-op is what made the #noOfDocs coach mark so hard to pin down —
  // a selector that matches nothing looks identical to a coach mark that was
  // never requested. Say so in dev.
  if (!target) {
    if (import.meta.env.DEV)
      console.warn(`FormYaar: coach mark target not found — ${selector}`);
    return;
  }

  // Subtle pulse on the target button so it's clearly the thing to click
  const prevOutline = target.style.outline;
  target.style.outline = "3px solid #f59e0b";
  target.style.outlineOffset = "3px";

  const mark = document.createElement("div");
  mark.id = "fy-coach-mark";

  // Fixed and measured off getBoundingClientRect on every paint, rather than
  // absolute off window.scrollY. These pages scroll their content inside their
  // own container, so window.scrollY stays 0 while the element's rect reflects
  // where it actually is — document-space coordinates then put the bubble
  // somewhere the viewport never shows. The outline still lands correctly
  // (it's on the element), which is what makes that failure so confusing.
  mark.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
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
  // Arrow pointing down toward the target
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

  const place = () => {
    const rect = target.getBoundingClientRect();
    // Target scrolled out of view — hide rather than strand the bubble at the
    // top or bottom edge pointing at nothing.
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      mark.style.display = "none";
      return;
    }
    mark.style.display = "block";
    const half = mark.offsetWidth / 2;
    // Clamp to the viewport so a long message can't run off either edge.
    const centre = Math.min(
      Math.max(rect.left + rect.width / 2, half + 8),
      window.innerWidth - half - 8,
    );
    mark.style.top = `${rect.top - mark.offsetHeight - 10}px`;
    mark.style.left = `${centre - half}px`;
  };
  place();

  // capture:true so scrolling inside any nested container repositions it too,
  // not just scrolling the window.
  window.addEventListener("scroll", place, true);
  window.addEventListener("resize", place);

  // Remove once the user acts on the target — for a button that's the click
  // that navigates; for an input it's them clicking in to type, by which point
  // they've read it.
  const cleanup = () => {
    mark.remove();
    target.style.outline = prevOutline;
    target.style.outlineOffset = "";
    target.removeEventListener("click", cleanup);
    window.removeEventListener("scroll", place, true);
    window.removeEventListener("resize", place);
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
  minor_pan_card: minorPanCardConfig as unknown as FormConfig,
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
  // The name exactly as printed on Aadhaar, which the applicant now types in
  // themselves. Falls back to the assembled name for drafts saved before that
  // field existed — without the fallback those applicants would hit a blank
  // required box on a form they'd already paid for.
  // The guardian's name, for the declaration on a minor's application. The
  // declaration is made by the guardian in the capacity of Representative
  // Assessee — the child never signs it — so both name boxes on it are theirs,
  // not the applicant's.
  if (field.value_source === "computed.guardian_full_name") {
    return [
      userData.guardian_first_name,
      userData.guardian_middle_name,
      userData.guardian_last_name,
    ]
      .filter(Boolean)
      .join(" ");
  }
  if (field.value_source === "computed.name_as_per_aadhaar") {
    const typed = userData.name_as_per_aadhaar?.trim();
    if (typed) return typed;
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
