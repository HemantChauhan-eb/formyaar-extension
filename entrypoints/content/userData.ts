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
  // Current residence address — only used by the "PAN application with
  // supporting documents" flow, for applicants whose current address
  // differs from their Aadhaar address. Optional everywhere else.
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
  // Which PAN application the user came in for: a fresh PAN, or changes /
  // correction to one they already hold. Chosen on the home screen and carried
  // through the wizard, not asked as a form field.
  application_intent: "new" | "correction";
  // Physical PAN card + ePAN (₹101) vs ePAN only (₹66). Only the correction
  // config reads this today; pan_card.json still hardcodes the physical card.
  wants_physical_pan: "yes" | "no";
  // What the applicant is enclosing to prove the PAN they're correcting.
  // Correction flow only — a new-PAN applicant has no PAN to prove.
  proof_of_pan: string;
}

export const EMPTY_USER_DATA: UserData = {
  first_name: "",
  middle_name: "",
  last_name: "",
  date_of_birth: "",
  email: "",
  mobile: "",
  aadhaar_last_4: "",
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
  field: keyof UserData;
  message: string;
}

export function validateUserData(
  data: UserData,
  form = "pan_card",
): ValidationError[] {
  const errors: ValidationError[] = [];
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

  if (!data.gender)
    errors.push({ field: "gender", message: "Select your gender" });

  if (!data.father_first_name.trim())
    errors.push({
      field: "father_first_name",
      message: "Father's first name is required",
    });

  if (!data.mother_first_name.trim())
    errors.push({
      field: "mother_first_name",
      message: "Mother's first name is required",
    });
  if (!data.parent_on_card_is_father && !data.parent_on_card_is_mother)
    errors.push({
      field: "parent_on_card_is_father",
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

const OPERATOR_SUB_KEY = "fy_operator_submission";

export async function setOperatorSubmission(
  sub: Partial<UserData>,
): Promise<void> {
  await browser.storage.session.set({ [OPERATOR_SUB_KEY]: sub });
}

export async function clearOperatorSubmission(): Promise<void> {
  await browser.storage.session.remove(OPERATOR_SUB_KEY);
}
