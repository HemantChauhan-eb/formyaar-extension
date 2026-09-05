// User data collection — types, storage, defaults

const STORAGE_KEY = "fy_user_data";
const SENSITIVE_KEY = "fy_sensitive_data";
const SENSITIVE_FIELDS: (keyof UserData)[] = [
  "passport_number",
  "tin_number",
];

export type IncomeSource =
  | "salary"
  | "business"
  | "house_property"
  | "other_sources"
  | "capital_gains"
  | "no_income";

export interface UserData {
  first_name: string;
  middle_name: string;
  last_name: string;
  date_of_birth: string;
  email: string;
  mobile: string;
  aadhaar_last_4: string;
  // Asked separately rather than assembled from first/middle/last, because the
  // government form asks for both and they are genuinely different strings:
  // Aadhaar prints one full name with its own spacing, initials and order,
  // and the PAN form's own name fields are split. Filling this from the split
  // names put a subtly different name in the box the Aadhaar match runs
  // against. Empty on drafts predating this field — `computed.name_as_per_aadhaar`
  // falls back to the assembled name so those keep working.
  name_as_per_aadhaar: string;
  gender: "M" | "F" | "T" | "";
  father_first_name: string;
  father_middle_name: string;
  father_last_name: string;
  mother_first_name: string;
  mother_middle_name: string;
  mother_last_name: string;
  parent_on_card_is_father: boolean;
  parent_on_card_is_mother: boolean;
  is_single_parent: boolean;
  is_single_parent_father: boolean;
  is_single_parent_mother: boolean;
  aadhaar_pin_code: string;
  place: string;
  is_defence: boolean;
  defence_branch: "army" | "air_force" | "";
  passport_number: string;
  tin_number: string;
  proof_of_dob: string;
  income_source: IncomeSource[];
  // Whether the applicant's current address matches their Aadhaar address.
  // Drives which PAN application mode is used: true → Aadhaar eKYC
  // (pan_card), false → PAN application with supporting documents
  // (adult_new_pan_card_supporting_docs), which needs the fields below.
  address_same_as_aadhaar: boolean;
  // Current residence address. Required for the correction flow, which
  // defaults to submitting scanned documents through e-Sign (not Aadhaar
  // eKYC), so the govt form needs it filled in directly — see
  // validateUserData. Also used, optionally, by the "PAN application with
  // supporting documents" new-PAN flow for applicants whose current address
  // differs from their Aadhaar address.
  current_address_flat: string;
  current_address_street: string;
  current_address_post_office: string;
  current_address_city: string;
  current_address_district: string;
  current_address_state: string;
  current_address_pin_code: string;
  // Proof documents for the "PAN application with supporting documents"
  // flow — proof_of_address is for the current address above, not Aadhaar.
  proof_of_identity: string;
  proof_of_address: string;
  // Which PAN application the user came in for: a fresh PAN, changes /
  // correction to one they already hold, or a PAN for a minor. Chosen on the
  // home screen and carried through the wizard, not asked as a form field.
  application_intent: "new" | "correction" | "minor";
  // Physical PAN card + ePAN vs ePAN only. Fees differ by flow — ₹101/₹66 for
  // an adult, ₹107/₹72 for a minor — so the panel's copy is per-flow while the
  // stored answer is the same yes/no either way.
  wants_physical_pan: "yes" | "no";
  // What the applicant is enclosing to prove the PAN they're correcting.
  // Correction flow only — a new-PAN applicant has no PAN to prove.
  proof_of_pan: string;

  // ── Minor flow: the guardian ──────────────────────────────────────
  // The government calls this the Representative Assessee. We never use that
  // phrase in the panel — applicants read it as jargon and stall — so every
  // label says "guardian" and only the config comments carry the legal term.
  //
  // Deliberately absent: the guardian's PAN. It is typed straight into the
  // government form by the applicant, mid-fill, and never stored or sent
  // anywhere — same treatment as aadhaar/passport/TIN numbers. That is what
  // the `pause_for_user` field in minor_pan_card.json exists to do.
  guardian_first_name: string;
  guardian_middle_name: string;
  guardian_last_name: string;
  guardian_email: string;
  guardian_mobile: string;
  // Whether the guardian lives at the applicant's address. When true the panel
  // copies the applicant's address across rather than asking twice.
  guardian_address_same_as_applicant: boolean;
  guardian_address_flat: string;
  guardian_address_street: string;
  // Optional, and labelled as such — applicants otherwise go hunting for their
  // post office name and lose several minutes to a field nobody requires.
  guardian_address_post_office: string;
  guardian_address_city: string;
  guardian_address_district: string;
  guardian_address_state: string;
  guardian_address_pin_code: string;
  guardian_proof_of_identity: string;
  guardian_proof_of_address: string;
  // Where the physical card should be posted: the minor's own address, or the
  // guardian's. Only asked when a physical card was chosen — with e-PAN there
  // is nothing to post, so the form's "address for communication" is set to
  // Residence and the question isn't worth the applicant's time.
  pan_delivery_address: "residence" | "guardian";
}

export const EMPTY_USER_DATA: UserData = {
  first_name: "",
  middle_name: "",
  last_name: "",
  date_of_birth: "",
  email: "",
  mobile: "",
  aadhaar_last_4: "",
  name_as_per_aadhaar: "",
  gender: "",
  father_first_name: "",
  father_middle_name: "",
  father_last_name: "",
  mother_first_name: "",
  mother_middle_name: "",
  mother_last_name: "",
  parent_on_card_is_father: true,
  parent_on_card_is_mother: false,
  is_single_parent: false,
  is_single_parent_father: false,
  is_single_parent_mother: false,
  aadhaar_pin_code: "",
  place: "",
  is_defence: false,
  defence_branch: "",
  passport_number: "",
  tin_number: "",
  proof_of_dob: "",
  income_source: [],
  address_same_as_aadhaar: true,
  current_address_flat: "",
  current_address_street: "",
  current_address_post_office: "",
  current_address_city: "",
  current_address_district: "",
  current_address_state: "",
  current_address_pin_code: "",
  proof_of_identity: "",
  proof_of_address: "",
  application_intent: "new",
  wants_physical_pan: "yes",
  proof_of_pan: "Copy of Pan Card",
  guardian_first_name: "",
  guardian_middle_name: "",
  guardian_last_name: "",
  guardian_email: "",
  guardian_mobile: "",
  guardian_address_same_as_applicant: false,
  guardian_address_flat: "",
  guardian_address_street: "",
  guardian_address_post_office: "",
  guardian_address_city: "",
  guardian_address_district: "",
  guardian_address_state: "",
  guardian_address_pin_code: "",
  guardian_proof_of_identity: "",
  guardian_proof_of_address: "",
  pan_delivery_address: "residence",
};

// Which NSDL/Protean config to run — the single source of truth for this
// decision, used at every point that kicks off or resumes autofill (payment,
// session resume, page-load resume) so they can't drift out of sync with each
// other. Two inputs, in order of precedence:
//   1. which application the user picked on the home screen (new vs correction)
//   2. for a new PAN only: whether their current address matches Aadhaar, which
//      decides eKYC vs the supporting-documents route.
export function resolveFormSlug(
  data: Pick<UserData, "address_same_as_aadhaar" | "application_intent">,
): string {
  if (data.application_intent === "correction") return "correction_pan_card";
  // A minor's application can only be filed on paper — eKYC and e-Sign are both
  // barred under s.160 of the Income-tax Act once a Representative Assessee is
  // appointed — so the address-vs-Aadhaar routing below simply doesn't apply.
  if (data.application_intent === "minor") return "minor_pan_card";
  return data.address_same_as_aadhaar === false
    ? "adult_new_pan_card_supporting_docs"
    : "pan_card";
}

export async function getUserData(): Promise<UserData> {
  try {
    // Operator override — persisted in session storage, survives navigation
    const sessionResult = await browser.storage.session.get(OPERATOR_SUB_KEY);
    const sessionSub = sessionResult[OPERATOR_SUB_KEY] as
      | Partial<UserData>
      | undefined;
    if (sessionSub && sessionSub.first_name) {
      return { ...EMPTY_USER_DATA, ...sessionSub };
    }
    // Regular user — merge localStorage (non-sensitive) + sessionStorage (sensitive)
    const [localResult, sensitiveResult] = await Promise.all([
      browser.storage.local.get(STORAGE_KEY),
      browser.storage.session.get(SENSITIVE_KEY),
    ]);
    const saved = localResult[STORAGE_KEY] as Partial<UserData> | undefined;
    const sensitive = sensitiveResult[SENSITIVE_KEY] as Partial<UserData> | undefined;
    return { ...EMPTY_USER_DATA, ...(saved ?? {}), ...(sensitive ?? {}) };
  } catch {
    return EMPTY_USER_DATA;
  }
}
export async function saveUserData(data: UserData): Promise<void> {
  const sensitive: Partial<UserData> = {};
  const local: Partial<UserData> = {};
  for (const key of Object.keys(data) as (keyof UserData)[]) {
    if (SENSITIVE_FIELDS.includes(key)) {
      (sensitive as any)[key] = data[key];
    } else {
      (local as any)[key] = data[key];
    }
  }
  await Promise.all([
    browser.storage.local.set({ [STORAGE_KEY]: local }),
    browser.storage.session.set({ [SENSITIVE_KEY]: sensitive }),
  ]);
}

export interface ValidationError {
  /**
   * The `data-field` to highlight and scroll to, which is a DOM name rather
   * than a data key. Those are the same string for almost every field, but
   * not all: a radio group is one input named `parent_on_card`, while
   * collectFormData turns it into the derived booleans
   * `parent_on_card_is_father` / `_is_mother`. Typing this as
   * `keyof UserData` forced the derived name, which the error jump then
   * looked for in the DOM and never found — so the message appeared and the
   * form silently failed to move to the field it was about.
   */
  field: keyof UserData | "parent_on_card";
  message: string;
}

export function validateUserData(
  data: UserData,
  form = "pan_card",
): ValidationError[] {
  const errors: ValidationError[] = [];
  const isMinor = form === "minor_pan_card";
  // The correction application asks for neither of these: it has no AO Code
  // fieldset (the applicant already has a jurisdiction) and no source-of-income
  // section. Requiring them would block a correction on data nobody uses.
  const isCorrection = form === "correction_pan_card";

  if (!data.first_name.trim())
    errors.push({ field: "first_name", message: "First name is required" });

  if (!data.last_name.trim())
    errors.push({ field: "last_name", message: "Last name is required" });

  if (!data.date_of_birth.match(/^\d{2}\/\d{2}\/\d{4}$/))
    errors.push({
      field: "date_of_birth",
      message: "Date must be DD/MM/YYYY",
    });

  if (!data.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
    errors.push({ field: "email", message: "Enter a valid email" });

  if (!data.mobile.match(/^[6-9]\d{9}$/))
    errors.push({
      field: "mobile",
      message: "Enter a valid 10-digit mobile number",
    });

  if (!data.aadhaar_last_4 || !/^\d{4}$/.test(data.aadhaar_last_4)) {
    errors.push({
      field: "aadhaar_last_4",
      message: "Enter the last 4 digits of your Aadhaar",
    });
  }

  if (!data.name_as_per_aadhaar.trim())
    errors.push({
      field: "name_as_per_aadhaar",
      message: "Enter your name exactly as printed on your Aadhaar",
    });

  if (!data.gender)
    errors.push({ field: "gender", message: "Select your gender" });

  if (!data.father_first_name.trim())
    errors.push({
      field: "father_first_name",
      message: "Father's first name is required",
    });

  // Optional, with one exception. The form asks for both parents but only
  // prints one name on the card, and an applicant who has chosen their
  // mother's name has to supply it — leaving it blank would put an empty
  // name in the one field that ends up printed on the PAN card.
  if (data.parent_on_card_is_mother && !data.mother_first_name.trim())
    errors.push({
      field: "mother_first_name",
      message:
        "Mother's first name is needed because you chose to print it on the card",
    });
  if (!data.parent_on_card_is_father && !data.parent_on_card_is_mother)
    errors.push({
      // Keyed to the radio's own data-field, not to the derived boolean.
      // The error jump does querySelector([data-field="…"]), and
      // parent_on_card_is_father is a collectFormData output rather than
      // anything in the DOM — so this used to show the message but never
      // highlight the field or move to the pane holding it.
      field: "parent_on_card",
      message: "Choose whose name to print on the PAN card",
    });

  if (!isCorrection && !data.aadhaar_pin_code.match(/^\d{6}$/))
    errors.push({
      field: "aadhaar_pin_code",
      message: "Enter a valid 6-digit PIN code",
    });

  if (!data.place.trim())
    errors.push({ field: "place", message: "Enter your city" });

  if (!data.proof_of_dob)
    errors.push({
      field: "proof_of_dob",
      message: "Select your proof of date of birth",
    });

  if (!isCorrection && !data.income_source.length)
    errors.push({
      field: "income_source",
      message: "Select your source of income",
    });

  // Two flows need the applicant's own address and both proofs typed out.
  // Correction, because it submits scanned documents through e-Sign rather
  // than Aadhaar eKYC, which un-disables those government sections. Minor,
  // because a minor's application can't use eKYC at all. Post Office and Zip
  // Code stay optional in both, matching the government form itself.
  if (isCorrection || isMinor) {
    if (!data.current_address_flat.trim())
      errors.push({
        field: "current_address_flat",
        message: "Flat/Door/Building is required",
      });
    if (!data.current_address_street.trim())
      errors.push({
        field: "current_address_street",
        message: "Road/Street/Block/Sector is required",
      });
    if (!data.current_address_city.trim())
      errors.push({
        field: "current_address_city",
        message: "Area/Locality/Town/City is required",
      });
    if (!data.current_address_district.trim())
      errors.push({
        field: "current_address_district",
        message: "District is required",
      });
    if (!data.current_address_state.trim())
      errors.push({
        field: "current_address_state",
        message: "Select your state",
      });
    if (!data.current_address_pin_code.match(/^\d{6}$/))
      errors.push({
        field: "current_address_pin_code",
        message: "Enter a valid 6-digit PIN code",
      });
    if (!data.proof_of_identity)
      errors.push({
        field: "proof_of_identity",
        message: "Select your proof of identity",
      });
    if (!data.proof_of_address)
      errors.push({
        field: "proof_of_address",
        message: "Select your proof of address",
      });
  }

  // The guardian. Every one of these is a required box on the government form
  // once a Representative Assessee is appointed, and a minor's application
  // always appoints one — so a blank here is an application that can't be
  // filed, not a field we can quietly leave alone. The guardian's PAN is the
  // deliberate exception: it's typed on the government page and never stored.
  if (isMinor) {
    if (!data.guardian_first_name.trim())
      errors.push({
        field: "guardian_first_name",
        message: "Enter the guardian's first name",
      });
    if (!data.guardian_last_name.trim())
      errors.push({
        field: "guardian_last_name",
        message: "Enter the guardian's last name",
      });
    if (!data.guardian_email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      errors.push({
        field: "guardian_email",
        message: "Enter a valid email for the guardian",
      });
    if (!data.guardian_mobile.match(/^[6-9]\d{9}$/))
      errors.push({
        field: "guardian_mobile",
        message: "Enter a valid 10-digit mobile number for the guardian",
      });
    if (!data.guardian_address_flat.trim())
      errors.push({
        field: "guardian_address_flat",
        message: "Enter the guardian's Flat/Door/Building",
      });
    if (!data.guardian_address_street.trim())
      errors.push({
        field: "guardian_address_street",
        message: "Enter the guardian's Road/Street/Block/Sector",
      });
    if (!data.guardian_address_city.trim())
      errors.push({
        field: "guardian_address_city",
        message: "Enter the guardian's Area/Locality/Town/City",
      });
    if (!data.guardian_address_district.trim())
      errors.push({
        field: "guardian_address_district",
        message: "Enter the guardian's district",
      });
    if (!data.guardian_address_state.trim())
      errors.push({
        field: "guardian_address_state",
        message: "Select the guardian's state",
      });
    if (!data.guardian_address_pin_code.match(/^\d{6}$/))
      errors.push({
        field: "guardian_address_pin_code",
        message: "Enter a valid 6-digit PIN code for the guardian",
      });
    if (!data.guardian_proof_of_identity)
      errors.push({
        field: "guardian_proof_of_identity",
        message: "Select the guardian's proof of identity",
      });
    if (!data.guardian_proof_of_address)
      errors.push({
        field: "guardian_proof_of_address",
        message: "Select the guardian's proof of address",
      });
  }

  return errors;
}

// ─── Active session (resume support) ─────────────────────────────────
const SESSION_KEY = "fy_active_session";

export interface ActiveSession {
  form: string;
  order_id: string;
  paid_at: number;
  completed: boolean;
}

export async function getActiveSession(): Promise<ActiveSession | null> {
  try {
    const result = await browser.storage.local.get(SESSION_KEY);
    return (result[SESSION_KEY] as ActiveSession) ?? null;
  } catch {
    return null;
  }
}

export async function setActiveSession(session: ActiveSession): Promise<void> {
  await browser.storage.local.set({ [SESSION_KEY]: session });
}

export async function markSessionCompleted(): Promise<void> {
  const s = await getActiveSession();
  if (!s) return;
  await setActiveSession({ ...s, completed: true });
}

// Inverse of markSessionCompleted — keeps the session in the "resume" state so
// the home-screen "Continue →" card stays visible. Used on the mid-flow
// document-upload page, which must not look completed. No-op if already active.
export async function markSessionActive(): Promise<void> {
  const s = await getActiveSession();
  if (!s || !s.completed) return;
  await setActiveSession({ ...s, completed: false });
}

export async function clearActiveSession(): Promise<void> {
  await browser.storage.local.remove(SESSION_KEY);
}

/**
 * What the fill engine remembers about a run in progress.
 *
 * `done` is the list of pathnames already filled, so a reload doesn't retype
 * into a page that's already complete. `skipOverlay` is set only by a restart:
 * the "ready to begin" overlay exists to get the applicant's attention when a
 * fill starts on a tab they may not be looking at, and someone who just
 * pressed Start again is already looking at it.
 */
export interface AutofillActive {
  form: string;
  done: string[];
  skipOverlay?: boolean;
  submission_id?: string;
}

/**
 * Begin the government application again from the top.
 *
 * The government site can end a session at any point, and the only way back is
 * to start its form over. That means throwing away everything the fill engine
 * remembers about *where it had got to* — while keeping everything about *who
 * the applicant is and that they paid*.
 *
 * Clearing `done` is the part that was missing. Without it, "Start again"
 * navigated to the first page of the form, found that pathname already in
 * `done` from the run that had just died, and did nothing at all: no overlay,
 * no fill, the panel sitting on the home screen next to a blank form. The
 * button worked — the flow simply refused to run twice.
 *
 * Returns the form to restart, or null if there's nothing to restart.
 */
export async function restartAutofillFlow(): Promise<string | null> {
  const [sessionResult, active] = await Promise.all([
    getActiveSession(),
    browser.storage.session
      .get("autofillActive")
      .then((r) => r.autofillActive as AutofillActive | undefined),
  ]);

  const form = active?.form ?? sessionResult?.form ?? null;
  if (!form) return null;

  await Promise.all([
    browser.storage.session.set({
      autofillActive: { form, done: [], skipOverlay: true },
    }),
    // The per-step record the review screen replays. Keeping it would show the
    // applicant what a previous, abandoned attempt filled.
    browser.storage.session.remove("fillHistory"),
  ]);

  // The paid session is untouched and must not look finished — the applicant
  // is mid-application, not done with one.
  await markSessionActive();

  return form;
}

const OPERATOR_SUB_KEY = "fy_operator_submission";

export async function setOperatorSubmission(
  sub: Partial<UserData>,
): Promise<void> {
  await browser.storage.session.set({ [OPERATOR_SUB_KEY]: sub });
}

export async function clearOperatorSubmission(): Promise<void> {
  await browser.storage.session.remove(OPERATOR_SUB_KEY);
}
