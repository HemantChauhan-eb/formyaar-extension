// User data collection — types, storage, defaults

const STORAGE_KEY = "fy_user_data";

export interface UserData {
  first_name: string;
  middle_name: string;
  last_name: string;
  date_of_birth: string;
  email: string;
  mobile: string;
  aadhaar_number: string;
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
  aadhaar_pin_code: string;
  place: string;
  is_defence: boolean;
  passport_number: string;
  tin_number: string;
  proof_of_dob: string;
  income_source:
    | "salary"
    | "business"
    | "house_property"
    | "other_sources"
    | "capital_gains"
    | "no_income"
    | "";
}

export const EMPTY_USER_DATA: UserData = {
  first_name: "",
  middle_name: "",
  last_name: "",
  date_of_birth: "",
  email: "",
  mobile: "",
  aadhaar_last_4: "",
  aadhaar_number: "",
  gender: "",
  father_first_name: "",
  father_middle_name: "",
  father_last_name: "",
  mother_first_name: "",
  mother_middle_name: "",
  mother_last_name: "",
  parent_on_card_is_father: true,
  parent_on_card_is_mother: false,
  aadhaar_pin_code: "",
  place: "",
  is_defence: false,
  passport_number: "",
  tin_number: "",
  proof_of_dob: "",
  income_source: "",
};
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
    // Regular user — local storage
    const result = await browser.storage.local.get(STORAGE_KEY);
    const saved = result[STORAGE_KEY] as UserData | undefined;
    return { ...EMPTY_USER_DATA, ...(saved ?? {}) };
  } catch {
    return EMPTY_USER_DATA;
  }
}
export async function saveUserData(data: UserData): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: data });
}

export interface ValidationError {
  field: keyof UserData;
  message: string;
}

export function validateUserData(data: UserData): ValidationError[] {
  const errors: ValidationError[] = [];

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

  const aadhaarClean = (data.aadhaar_number ?? "").replace(/\s/g, "");
  if (!aadhaarClean || !/^\d{12}$/.test(aadhaarClean)) {
    errors.push({
      field: "aadhaar_number",
      message: "Aadhaar number must be exactly 12 digits",
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

  if (!data.aadhaar_pin_code.match(/^\d{6}$/))
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

  if (!data.income_source)
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
