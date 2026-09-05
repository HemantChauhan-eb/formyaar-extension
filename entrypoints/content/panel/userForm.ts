import { BACKEND_URL } from "../constants";
import {
  getUserData,
  saveUserData,
  validateUserData,
  type UserData,
} from "../userData";
import { escapeHtml, renderHeader } from "./shared";
import { trackEvent } from "../telemetry";
// Only used by syncDocChecklist, which builds list rows at runtime rather than
// in markup — so a data-i18n attribute alone can't give them their first text.
import { t, getLang } from "./i18n";
import { setView } from "./router";

export const USERFORM_STYLES = `
      /* ===== Details wizard — one small step at a time ===== */
.fy-userform {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--fy-bg);
}
.fy-userform-body {
  flex: 1;
  overflow-y: auto;
  padding: 26px 24px 20px;
}
.fy-pane { display: none; }
.fy-pane.on { display: block; animation: fy-fadeIn 0.22s ease; }
.fy-pane-caption {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: var(--fy-muted);
  margin-bottom: 7px;
}
.fy-pane-title {
  font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
  font-size: 19px;
  font-weight: 800;
  color: var(--fy-ink);
  letter-spacing: -0.4px;
  line-height: 1.25;
  margin-bottom: 6px;
}
.fy-pane-sub {
  font-size: 12px;
  color: var(--fy-muted);
  line-height: 1.55;
  margin-bottom: 22px;
}
.fy-userform-field {
  display: block;
  margin-bottom: 16px;
}
.fy-userform-field > span {
  display: block;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--fy-body);
  margin-bottom: 7px;
}
.fy-userform-field em {
  color: var(--fy-danger);
  font-style: normal;
  margin-left: 1px;
}
.fy-userform-field input[type="text"],
.fy-userform-field input[type="email"],
.fy-userform-field input[type="tel"],
.fy-userform-field select {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid transparent;
  border-radius: 11px;
  font-size: 14px;
  font-family: inherit;
  color: var(--fy-ink);
  background: var(--fy-field);
  transition: border-color 0.15s, background 0.15s;
  box-sizing: border-box;
}
.fy-userform-field select { cursor: pointer; appearance: auto; }
.fy-userform-field input::placeholder { color: var(--fy-faint); }
.fy-userform-field input:focus,
.fy-userform-field select:focus {
  outline: none;
  background: var(--fy-bg);
  border-color: var(--fy-accent);
}
.fy-userform-field input.fy-error {
  border-color: var(--fy-danger);
  background: var(--fy-bg);
}
.fy-userform-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}
.fy-userform-row .fy-userform-field { margin-bottom: 0; }
.fy-userform-radios {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.fy-userform-radios.fy-userform-radios-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.fy-userform-radio {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 14px;
  border: 1.5px solid transparent;
  border-radius: 11px;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--fy-body);
  background: var(--fy-field);
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}
.fy-userform-radio:has(input:checked) {
  border-color: var(--fy-accent);
  background: var(--fy-accent-soft);
  color: var(--fy-accent-strong);
}
.fy-userform-radio input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.fy-userform-hint {
  display: block;
  font-size: 10.5px;
  color: var(--fy-muted);
  margin-top: 5px;
}
/* Deliberately louder than .fy-userform-hint: on the minor flow the document
   you pick here is one you will physically have to put in an envelope weeks
   later, and there is no screen that shows the choice back to you afterwards.
   A grey hint reads as optional detail; this has to read as an instruction. */
.fy-userform-remember {
  display: block;
  font-size: 10.5px;
  font-weight: 600;
  color: #d43c33;
  margin-top: 5px;
  line-height: 1.5;
}
.fy-uf-screenshot {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--fy-warn-bg, #fff8ec);
  border: 1px solid var(--fy-warn-line, #f0d9a8);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--fy-ink);
}
.fy-uf-checklist {
  border: 1px solid var(--fy-line, #e6e8ef);
  border-radius: 12px;
  overflow: hidden;
}
.fy-uf-checklist-group + .fy-uf-checklist-group {
  border-top: 1px solid var(--fy-line, #e6e8ef);
}
.fy-uf-checklist-group h4 {
  margin: 0;
  padding: 9px 13px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--fy-muted);
  background: var(--fy-soft, #f6f7fb);
}
.fy-uf-checklist-group ul {
  margin: 0;
  padding: 4px 0;
  list-style: none;
}
.fy-uf-checklist-group li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 13px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--fy-ink);
}
.fy-uf-checklist-group li span {
  font-size: 10.5px;
  color: var(--fy-muted);
}
.fy-uf-checklist-group li strong {
  font-weight: 700;
}
.fy-uf-checklist-missing {
  color: #d43c33;
}
.fy-uf-optional {
  margin-top: 4px;
}
.fy-uf-optional summary {
  list-style: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  color: var(--fy-muted);
  padding: 8px 0;
  transition: color 0.15s;
}
.fy-uf-optional summary:hover { color: var(--fy-ink); }
.fy-uf-optional summary::-webkit-details-marker { display: none; }
.fy-uf-optional[open] summary { color: var(--fy-ink); margin-bottom: 8px; }
.fy-userform-errors {
  margin-top: 6px;
  font-size: 12px;
  color: var(--fy-danger);
  line-height: 1.6;
}
.fy-userform-errors ul { margin: 0; padding-left: 16px; }
.fy-userform-footer {
  padding: 14px 24px 16px;
  border-top: 1px solid var(--fy-line);
  background: var(--fy-bg);
  flex-shrink: 0;
}
.fy-userform-privacy {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 10.5px;
  color: var(--fy-muted);
  margin-top: 10px;
}
`;

// ── Wizard panes ────────────────────────────────────────────────────
// Each pane asks one small group of questions. All fields stay in the DOM
// at all times, so validation and data collection are unchanged.

function paneName(data: UserData): string {
  return `
    <div class="fy-pane on" data-pane="0">
      <div class="fy-pane-caption" data-i18n="wizard.step1">Step 1 of 5</div>
      <div class="fy-pane-title" data-i18n="wizard.p1_title">What's your name?</div>
      <div class="fy-pane-sub" data-i18n="wizard.p1_sub">Exactly as printed on your Aadhaar card.</div>

      <div class="fy-userform-row">
        <label class="fy-userform-field">
          <span><span data-i18n="field.first_name">First name</span> <em>*</em></span>
          <input type="text" data-field="first_name" value="${escapeHtml(data.first_name)}" placeholder="HEMANT" autocomplete="off">
        </label>
        <label class="fy-userform-field">
          <span data-i18n="field.middle_name">Middle name</span>
          <input type="text" data-field="middle_name" value="${escapeHtml(data.middle_name)}" placeholder="Optional" data-i18n-ph="field.optional_ph" autocomplete="off">
        </label>
      </div>

      <label class="fy-userform-field">
        <span><span data-i18n="field.last_name">Last name</span> <em>*</em></span>
        <input type="text" data-field="last_name" value="${escapeHtml(data.last_name)}" placeholder="CHAUHAN" autocomplete="off">
      </label>

      <label class="fy-userform-field">
        <span><span data-i18n="field.dob">Date of birth</span> <em>*</em></span>
        <input type="text" data-field="date_of_birth" value="${escapeHtml(data.date_of_birth)}" placeholder="DD/MM/YYYY" autocomplete="off" inputmode="numeric">
      </label>

      <label class="fy-userform-field">
        <span><span data-i18n="field.gender">Gender</span> <em>*</em></span>
        <div class="fy-userform-radios">
          <label class="fy-userform-radio">
            <input type="radio" name="gender" data-field="gender" value="M" ${data.gender === "M" ? "checked" : ""}>
            <span data-i18n="opt.male">Male</span>
          </label>
          <label class="fy-userform-radio">
            <input type="radio" name="gender" data-field="gender" value="F" ${data.gender === "F" ? "checked" : ""}>
            <span data-i18n="opt.female">Female</span>
          </label>
          <label class="fy-userform-radio">
            <input type="radio" name="gender" data-field="gender" value="T" ${data.gender === "T" ? "checked" : ""}>
            <span data-i18n="opt.transgender">Transgender</span>
          </label>
        </div>
      </label>
    </div>
  `;
}

function paneContact(data: UserData): string {
  return `
    <div class="fy-pane" data-pane="1">
      <div class="fy-pane-caption" data-i18n="wizard.step2">Step 2 of 5</div>
      <div class="fy-pane-title" data-i18n="wizard.p2_title">How do we reach you?</div>
      <div class="fy-pane-sub" data-i18n="wizard.p2_sub">The government sends your e-PAN to this email.</div>

      <label class="fy-userform-field">
        <span><span data-i18n="field.email">Email</span> <em>*</em></span>
        <input type="email" data-field="email" value="${escapeHtml(data.email)}" placeholder="you@example.com" autocomplete="off">
      </label>

      <label class="fy-userform-field">
        <span><span data-i18n="field.mobile">Mobile number</span> <em>*</em></span>
        <input type="tel" data-field="mobile" value="${escapeHtml(data.mobile)}" placeholder="9876543210" autocomplete="off" inputmode="numeric" maxlength="10">
        <small class="fy-userform-hint" data-i18n="wizard.mobile_hint">If you leave your application midway, we may call this number to see if we can help.</small>
      </label>
    </div>
  `;
}

function paneAadhaar(form: string, data: UserData): string {
  // PIN code exists purely to look up an AO code. The correction form has no
  // AO Code fieldset, so asking for it there would be dead data collection.
  const pinCode =
    form === "correction_pan_card"
      ? ""
      : `
      <label class="fy-userform-field">
        <span><span data-i18n="field.aadhaar_pin">PIN code as per Aadhaar</span> <em>*</em></span>
        <input type="text" data-field="aadhaar_pin_code" value="${escapeHtml(data.aadhaar_pin_code)}" placeholder="243001" autocomplete="off" inputmode="numeric" maxlength="6">
        <div id="fy-ao-status" style="margin-top:7px;font-size:12px;min-height:18px;"></div>
      </label>
      `;

  return `
    <div class="fy-pane" data-pane="2">
      <div class="fy-pane-caption" data-i18n="wizard.step3">Step 3 of 5</div>
      <div class="fy-pane-title" data-i18n="wizard.p3_title">Your Aadhaar</div>
      <div class="fy-pane-sub" data-i18n="wizard.p3_sub">We only ask for the last 4 digits — never your full number. This stays on your device.</div>

      <label class="fy-userform-field">
        <span><span data-i18n="field.aadhaar_last4">Last 4 digits of Aadhaar</span> <em>*</em></span>
        <input type="text" data-field="aadhaar_last_4" value="${escapeHtml(data.aadhaar_last_4 ?? "")}" placeholder="9012" autocomplete="off" inputmode="numeric" maxlength="4">
      </label>

      <label class="fy-userform-field">
        <span><span data-i18n="field.name_as_per_aadhaar">Name exactly as printed on your Aadhaar</span> <em>*</em></span>
        <input type="text" data-field="name_as_per_aadhaar" value="${escapeHtml(data.name_as_per_aadhaar ?? "")}" placeholder="HEMANT CHAUHAN" autocomplete="off" maxlength="100">
        <small class="fy-userform-hint" data-i18n="wizard.name_aadhaar_hint">Copy it letter for letter from the card — the government checks this against Aadhaar, so even a missing middle name can fail the match.</small>
      </label>

      ${pinCode}
    </div>
  `;
}

function paneFamily(form: string, data: UserData): string {
  // NSDL populates the single-parent radio from the existing PAN record and the
  // correction config deliberately never touches it, so asking is misleading.
  const singleParent =
    form === "correction_pan_card"
      ? ""
      : `
      <label class="fy-userform-field">
        <span data-i18n="field.single_parent">Single parent?</span>
        <div class="fy-userform-radios">
          <label class="fy-userform-radio">
            <input type="radio" name="is_single_parent" data-field="is_single_parent" value="false" ${!data.is_single_parent ? "checked" : ""}>
            <span data-i18n="opt.no">No</span>
          </label>
          <label class="fy-userform-radio">
            <input type="radio" name="is_single_parent" data-field="is_single_parent" value="true" ${data.is_single_parent ? "checked" : ""}>
            <span data-i18n="opt.yes">Yes</span>
          </label>
        </div>
      </label>
      `;

  return `
    <div class="fy-pane" data-pane="3">
      <div class="fy-pane-caption" data-i18n="wizard.step4">Step 4 of 5</div>
      <div class="fy-pane-title" data-i18n="wizard.p4_title">Your parents' names</div>
      <div class="fy-pane-sub" data-i18n="wizard.p4_sub">The PAN form asks for both. One of them gets printed on the card.</div>

      <div class="fy-userform-row">
        <label class="fy-userform-field">
          <span><span data-i18n="field.father_first">Father's first name</span> <em>*</em></span>
          <input type="text" data-field="father_first_name" value="${escapeHtml(data.father_first_name)}" placeholder="RAMESH" autocomplete="off">
        </label>
        <label class="fy-userform-field">
          <span data-i18n="field.middle_short">Middle</span>
          <input type="text" data-field="father_middle_name" value="${escapeHtml(data.father_middle_name)}" placeholder="Optional" data-i18n-ph="field.optional_ph" autocomplete="off">
        </label>
      </div>

      <label class="fy-userform-field">
        <span data-i18n="field.father_last">Father's last name</span>
        <input type="text" data-field="father_last_name" value="${escapeHtml(data.father_last_name)}" placeholder="Optional" data-i18n-ph="field.optional_ph" autocomplete="off">
      </label>

      <div class="fy-userform-row">
        <label class="fy-userform-field">
          <span data-i18n="field.mother_first">Mother's first name</span>
          <input type="text" data-field="mother_first_name" value="${escapeHtml(data.mother_first_name)}" placeholder="Optional" data-i18n-ph="field.optional_ph" autocomplete="off">
        </label>
        <label class="fy-userform-field">
          <span data-i18n="field.middle_short">Middle</span>
          <input type="text" data-field="mother_middle_name" value="${escapeHtml(data.mother_middle_name)}" placeholder="Optional" data-i18n-ph="field.optional_ph" autocomplete="off">
        </label>
      </div>

      <label class="fy-userform-field">
        <span data-i18n="field.mother_last">Mother's last name</span>
        <input type="text" data-field="mother_last_name" value="${escapeHtml(data.mother_last_name)}" placeholder="Optional" data-i18n-ph="field.optional_ph" autocomplete="off">
      </label>

      ${singleParent}

      <label class="fy-userform-field">
        <span><span data-i18n="field.parent_on_card">Whose name on the card?</span> <em>*</em></span>
        <div class="fy-userform-radios">
          <label class="fy-userform-radio">
            <input type="radio" name="parent_on_card" data-field="parent_on_card" value="father" ${data.parent_on_card_is_father ? "checked" : ""}>
            <span data-i18n="opt.fathers">Father's</span>
          </label>
          <label class="fy-userform-radio">
            <input type="radio" name="parent_on_card" data-field="parent_on_card" value="mother" ${data.parent_on_card_is_mother ? "checked" : ""}>
            <span data-i18n="opt.mothers">Mother's</span>
          </label>
        </div>
      </label>
    </div>
  `;
}

// Matches the NSDL/Protean site's own state naming convention (ALL CAPS),
// used both by its residence-address State dropdown and its AO-code state
// selector — so text-matching this against the site's <select> options works.
const INDIAN_STATES = [
  "ANDAMAN AND NICOBAR ISLANDS", "ANDHRA PRADESH", "ARUNACHAL PRADESH",
  "ASSAM", "BIHAR", "CHANDIGARH", "CHHATTISGARH", "DADRA & NAGAR HAVELI",
  "DAMAN & DIU", "DELHI", "GOA", "GUJARAT", "HARYANA", "HIMACHAL PRADESH",
  "JAMMU AND KASHMIR", "JHARKHAND", "KARNATAKA", "KERALA", "LADAKH",
  "LAKHSWADEEP", "MADHYA PRADESH", "MAHARASHTRA", "MANIPUR", "MEGHALAYA",
  "MIZORAM", "NAGALAND", "ODISHA", "PONDICHERRY", "PUNJAB", "RAJASTHAN",
  "SIKKIM", "TAMIL NADU", "TELANGANA", "TRIPURA", "UTTAR PRADESH",
  "UTTARAKHAND", "WEST BENGAL",
];

// The minor flow ends at a post office: whatever is picked in these dropdowns
// has to be printed in colour and couriered to Protean's Pune office, and the
// government form never shows the choice back.
//
// Every mention of payment here names the *government's* fee and says it's
// paid on their website. A bare "after paying" reads as FormYaar's own fee —
// which the applicant hasn't even been asked for yet at this point in the
// wizard — so it would land as "wait, pay for what?" rather than as a
// deadline. Same wording in paneMinorNotice and the checklist pane.
//
// Marked data-flow rather than gated on the slug because the Android panel is
// baked once as "pan_card" — see applyFlowVisibility.
const rememberNote = `
        <small class="fy-userform-remember" data-flow="minor" style="display:none;" data-i18n="wizard.remember_doc">Remember which document you pick — once you've paid the government's fee on their own website, a colour printout of it has to be couriered to their Pune office.</small>`;

// Shared by the new-PAN "supporting documents" flow (optional, gated behind
// the address-match toggle) and the correction flow (always required, since
// correction now defaults to scanned-images e-Sign instead of Aadhaar eKYC —
// see submission_mode_scanned in correction_pan_card.json).
function proofOfIdentityField(
  selected: string,
  required: boolean,
  field = "proof_of_identity",
  labelText = "Proof of identity",
): string {
  const label = required
    ? `<span>${labelText} <em>*</em></span>`
    : `<span>${labelText}</span>`;
  const hint = required
    ? `<small class="fy-userform-hint">The document you'll submit as proof of identity</small>`
    : `<small class="fy-userform-hint">For "PAN application with supporting documents" — not needed for the Aadhaar eKYC option</small>`;
  return `
      <label class="fy-userform-field">
        ${label}
        <select data-field="${field}">
          <option value="">Select a document…</option>
          <option value="AADHAAR Card issued by the Unique Identification Authority of India" ${selected === "AADHAAR Card issued by the Unique Identification Authority of India" ? "selected" : ""}>Aadhaar Card</option>
          <option value="Driving License" ${selected === "Driving License" ? "selected" : ""}>Driving License</option>
          <option value="Passport" ${selected === "Passport" ? "selected" : ""}>Passport</option>
          <option value="Elector's photo identity card" ${selected === "Elector's photo identity card" ? "selected" : ""}>Voter ID</option>
          <option value="Central Government Health Scheme Card" ${selected === "Central Government Health Scheme Card" ? "selected" : ""}>Central Government Health Scheme Card</option>
          <option value="Ex-Servicemen Contributory Health Scheme photo card" ${selected === "Ex-Servicemen Contributory Health Scheme photo card" ? "selected" : ""}>Ex-Servicemen Contributory Health Scheme Card</option>
          <option value="Pensioner Card having photograph of the applicant" ${selected === "Pensioner Card having photograph of the applicant" ? "selected" : ""}>Pensioner Card</option>
          <option value="Ration card having photograph of the applicant" ${selected === "Ration card having photograph of the applicant" ? "selected" : ""}>Ration Card</option>
          <option value="Photo identity card issued by the Central Government or State Government or Public Sector Undertaking." ${selected === "Photo identity card issued by the Central Government or State Government or Public Sector Undertaking." ? "selected" : ""}>Govt./PSU Photo ID Card</option>
          <option value="Transgender Identity Card / Certificate issued under the Transgender Persons (Protection of Rights) Act 2019 having photograph of the applicant" ${selected === "Transgender Identity Card / Certificate issued under the Transgender Persons (Protection of Rights) Act 2019 having photograph of the applicant" ? "selected" : ""}>Transgender Identity Card</option>
          <option value="Bank certificate in Original on letter head from the branch (along with name and stamp of the issuing officer) containing duly attested photograph and bank account number of the applicant" ${selected === "Bank certificate in Original on letter head from the branch (along with name and stamp of the issuing officer) containing duly attested photograph and bank account number of the applicant" ? "selected" : ""}>Bank Certificate (Original)</option>
          <option value="Certificate of Identity signed by a Gazetted Officer" ${selected === "Certificate of Identity signed by a Gazetted Officer" ? "selected" : ""}>Certificate of Identity — Gazetted Officer</option>
          <option value="Certificate of Identity signed by a Member of Parliament" ${selected === "Certificate of Identity signed by a Member of Parliament" ? "selected" : ""}>Certificate of Identity — MP</option>
          <option value="Certificate of Identity signed by a Member of Legislative Assembly" ${selected === "Certificate of Identity signed by a Member of Legislative Assembly" ? "selected" : ""}>Certificate of Identity — MLA</option>
          <option value="Certificate of Identity signed by a Municipal Councillor" ${selected === "Certificate of Identity signed by a Municipal Councillor" ? "selected" : ""}>Certificate of Identity — Municipal Councillor</option>
        </select>
        ${hint}${rememberNote}
      </label>`;
}

function proofOfAddressField(
  selected: string,
  required: boolean,
  field = "proof_of_address",
  labelText = "Proof of address (current address)",
): string {
  const label = required
    ? `<span>${labelText} <em>*</em></span>`
    : `<span>${labelText}</span>`;
  const hint = required
    ? `<small class="fy-userform-hint">The document you'll submit as proof of your current address</small>`
    : `<small class="fy-userform-hint">Proof for your current address — used only in the "supporting documents" option</small>`;
  return `
      <label class="fy-userform-field">
        ${label}
        <select data-field="${field}">
          <option value="">Select a document…</option>
          <option value="AADHAAR Card issued by the Unique Identification Authority of India" ${selected === "AADHAAR Card issued by the Unique Identification Authority of India" ? "selected" : ""}>Aadhaar Card</option>
          <option value="Driving License" ${selected === "Driving License" ? "selected" : ""}>Driving License</option>
          <option value="Passport" ${selected === "Passport" ? "selected" : ""}>Passport</option>
          <option value="Passport of the spouse" ${selected === "Passport of the spouse" ? "selected" : ""}>Passport of Spouse</option>
          <option value="Elector's photo identity card" ${selected === "Elector's photo identity card" ? "selected" : ""}>Voter ID</option>
          <option value="Electricity Bill (Not more than 3 months old from the date of application)" ${selected === "Electricity Bill (Not more than 3 months old from the date of application)" ? "selected" : ""}>Electricity Bill (≤3 months)</option>
          <option value="Water Bill (Not more than 3 months old from the date of application)" ${selected === "Water Bill (Not more than 3 months old from the date of application)" ? "selected" : ""}>Water Bill (≤3 months)</option>
          <option value="Landline Telephone Bill (Not more than 3 months old from the date of application)" ${selected === "Landline Telephone Bill (Not more than 3 months old from the date of application)" ? "selected" : ""}>Landline Bill (≤3 months)</option>
          <option value="Broadband Connection Bill (Not more than 3 months old from the date of application)" ${selected === "Broadband Connection Bill (Not more than 3 months old from the date of application)" ? "selected" : ""}>Broadband Bill (≤3 months)</option>
          <option value="Consumer gas connection card or book or piped gas bill(Not more than 3 months old from date of application)" ${selected === "Consumer gas connection card or book or piped gas bill(Not more than 3 months old from date of application)" ? "selected" : ""}>Gas Connection Card/Bill (≤3 months)</option>
          <option value="Bank account statement/passbook (Not more than 3 months old from the date of application)" ${selected === "Bank account statement/passbook (Not more than 3 months old from the date of application)" ? "selected" : ""}>Bank Statement/Passbook (≤3 months)</option>
          <option value="Post office passbook having address of the applicant" ${selected === "Post office passbook having address of the applicant" ? "selected" : ""}>Post Office Passbook</option>
          <option value="Depository account statement (Not more than 3 months old from the date of application)" ${selected === "Depository account statement (Not more than 3 months old from the date of application)" ? "selected" : ""}>Depository Account Statement (≤3 months)</option>
          <option value="Credit card statement (Not more than 3 months old from the date of application)" ${selected === "Credit card statement (Not more than 3 months old from the date of application)" ? "selected" : ""}>Credit Card Statement (≤3 months)</option>
          <option value="Property Registration Document" ${selected === "Property Registration Document" ? "selected" : ""}>Property Registration Document</option>
          <option value="Latest property tax assessment order" ${selected === "Latest property tax assessment order" ? "selected" : ""}>Property Tax Assessment Order</option>
          <option value="Domicile certificate issued by the Government" ${selected === "Domicile certificate issued by the Government" ? "selected" : ""}>Domicile Certificate</option>
          <option value="Allotment letter of accommodation issued by Central or State Government of not more than three years old" ${selected === "Allotment letter of accommodation issued by Central or State Government of not more than three years old" ? "selected" : ""}>Govt. Accommodation Allotment Letter (≤3 years)</option>
          <option value="Employer certificate in original" ${selected === "Employer certificate in original" ? "selected" : ""}>Employer Certificate (Original)</option>
          <option value="Certificate of Address signed by a Gazetted Officer" ${selected === "Certificate of Address signed by a Gazetted Officer" ? "selected" : ""}>Certificate of Address — Gazetted Officer</option>
          <option value="Certificate of Address signed by a Member of Parliament" ${selected === "Certificate of Address signed by a Member of Parliament" ? "selected" : ""}>Certificate of Address — MP</option>
          <option value="Certificate of Address signed by a Member of Legislative Assembly" ${selected === "Certificate of Address signed by a Member of Legislative Assembly" ? "selected" : ""}>Certificate of Address — MLA</option>
          <option value="Certificate of Address signed by a Municipal Councillor" ${selected === "Certificate of Address signed by a Municipal Councillor" ? "selected" : ""}>Certificate of Address — Municipal Councillor</option>
          <option value="Bank Account Statement in the country of residence (Not more than 3 months old from the date of application)" ${selected === "Bank Account Statement in the country of residence (Not more than 3 months old from the date of application)" ? "selected" : ""}>Bank Statement — Country of Residence (≤3 months)</option>
          <option value="NRE bank account statement (Not more than 3 months old from the date of application)" ${selected === "NRE bank account statement (Not more than 3 months old from the date of application)" ? "selected" : ""}>NRE Bank Account Statement (≤3 months)</option>
        </select>
        ${hint}${rememberNote}
      </label>`;
}

// Post Office and Zip Code stay optional either way — the govt form itself
// doesn't require them (Zip Code is only meaningful for a foreign address,
// which our applicants don't have since we hardcode Country to India).
function currentAddressFields(data: UserData, required: boolean): string {
  const reqMark = required ? " <em>*</em>" : "";
  const valueAttrs = (value: string) =>
    required
      ? `value="${escapeHtml(value)}" autocomplete="off"`
      : `value="${escapeHtml(value)}" placeholder="Optional" data-i18n-ph="field.optional_ph" autocomplete="off"`;

  return `
        <label class="fy-userform-field">
          <span>Flat / Door / Building${reqMark}</span>
          <input type="text" data-field="current_address_flat" ${valueAttrs(data.current_address_flat)}>
        </label>

        <label class="fy-userform-field">
          <span>Road / Street / Block / Sector${reqMark}</span>
          <input type="text" data-field="current_address_street" ${valueAttrs(data.current_address_street)}>
        </label>

        <label class="fy-userform-field">
          <span>Post Office</span>
          <input type="text" data-field="current_address_post_office" value="${escapeHtml(data.current_address_post_office)}" placeholder="Optional" data-i18n-ph="field.optional_ph" autocomplete="off">
        </label>

        <label class="fy-userform-field">
          <span>Area / Locality / Town / City${reqMark}</span>
          <input type="text" data-field="current_address_city" ${valueAttrs(data.current_address_city)}>
        </label>

        <label class="fy-userform-field">
          <span>District${reqMark}</span>
          <input type="text" data-field="current_address_district" ${valueAttrs(data.current_address_district)}>
        </label>

        <label class="fy-userform-field">
          <span>State / Union Territory${reqMark}</span>
          <select data-field="current_address_state">
            <option value="">Select a state…</option>
            ${INDIAN_STATES.map(
              (state) =>
                `<option value="${state}" ${data.current_address_state === state ? "selected" : ""}>${state}</option>`,
            ).join("")}
          </select>
        </label>

        <label class="fy-userform-field">
          <span>PIN Code${reqMark}</span>
          <input type="text" data-field="current_address_pin_code" ${valueAttrs(data.current_address_pin_code)} maxlength="6" inputmode="numeric">
        </label>

      `;
}

function paneFinal(form: string, data: UserData): string {
  const isCorrection = form === "correction_pan_card";
  const isMinor = form === "minor_pan_card";
  // Both flows type the applicant's address and both proofs out in full:
  // correction because it submits scanned documents through e-Sign, minor
  // because a minor's application can't use eKYC at all.
  const needsOwnAddress = isCorrection || isMinor;
  // The government charges a minor's application differently.
  const feePhysical = isMinor ? "107" : "101";
  const feeEpan = isMinor ? "72" : "66";
  // Source of income and defence status feed parts of the new-PAN application
  // that the correction form simply doesn't have. Kept in the DOM (rather than
  // dropped) so collectFormData still reads their defaults. The address-match
  // question and current-address block are handled separately below — they're
  // omitted outright for correction rather than hidden, since correction now
  // always needs the address (see `isCorrection` branch further down) and
  // duplicating the same data-field names in a hidden copy would confuse
  // collectFormData's querySelector-based field lookup.
  const hideOnCorrection = isCorrection ? `style="display:none;"` : "";

  // Two questions only the correction application asks. A new-PAN applicant
  // has no PAN to prove, and pan_card.json hardcodes the physical card, so
  // showing either of these on that flow would be noise.
  // Rendered for every flow and marked instead of gated, because the Android
  // panel is baked once from renderUserFormScreen("pan_card", …) — anything
  // switched on the slug here simply would not exist there. applyFlowVisibility
  // below is what actually shows or hides it, on both clients.
  const proofOfPanBlock = `
      <div data-flow="correction" ${isCorrection ? "" : 'style="display:none;"'}>
      <label class="fy-userform-field">
        <span><span data-i18n="field.proof_of_pan">Proof of your existing PAN</span> <em>*</em></span>
        <select data-field="proof_of_pan">
          <option value="Copy of Pan Card" data-i18n="opt.pan_copy" ${data.proof_of_pan === "Copy of Pan Card" ? "selected" : ""}>Copy of PAN card</option>
          <option value="Copy of Pan Allotment Letter" data-i18n="opt.pan_allotment" ${data.proof_of_pan === "Copy of Pan Allotment Letter" ? "selected" : ""}>Copy of PAN allotment letter</option>
          <option value="No Document" data-i18n="opt.no_document" ${data.proof_of_pan === "No Document" ? "selected" : ""}>No document</option>
        </select>
        <small class="fy-userform-hint" data-i18n="wizard.proof_pan_hint">What you'll upload to prove the PAN you're correcting</small>
      </label>
      </div>
      `;

  // Asked by both flows that let the applicant choose, with the fee the
  // government actually charges for that flow. pan_card.json still hardcodes
  // the physical card, so the new-PAN flow doesn't show it.
  const deliveryBlock = `
      <div data-flow="correction minor" ${needsOwnAddress ? "" : 'style="display:none;"'}>
      <label class="fy-userform-field">
        <span><span data-i18n="field.wants_physical">Do you want a physical PAN card?</span> <em>*</em></span>
        <div class="fy-userform-radios">
          <label class="fy-userform-radio">
            <input type="radio" name="wants_physical_pan" data-field="wants_physical_pan" value="yes" ${data.wants_physical_pan !== "no" ? "checked" : ""}>
            <span data-fee="physical" data-fee-adult="101" data-fee-minor="107">Yes — ₹${feePhysical}</span>
          </label>
          <label class="fy-userform-radio">
            <input type="radio" name="wants_physical_pan" data-field="wants_physical_pan" value="no" ${data.wants_physical_pan === "no" ? "checked" : ""}>
            <span data-fee="epan" data-fee-adult="66" data-fee-minor="72">No — ₹${feeEpan}</span>
          </label>
        </div>
        <small class="fy-userform-hint" data-i18n="wizard.physical_hint">"No" means e-PAN only, sent to your email. This is the government's fee, not ours.</small>
      </label>

      <div data-flow="minor" id="fy-pan-delivery-block" style="display:${!isMinor || data.wants_physical_pan === "no" ? "none" : "block"};">
        <label class="fy-userform-field">
          <span><span data-i18n="field.pan_delivery">Where should the card be posted?</span> <em>*</em></span>
          <div class="fy-userform-radios">
            <label class="fy-userform-radio">
              <input type="radio" name="pan_delivery_address" data-field="pan_delivery_address" value="residence" ${data.pan_delivery_address !== "guardian" ? "checked" : ""}>
              <span data-i18n="opt.delivery_applicant">The applicant's address</span>
            </label>
            <label class="fy-userform-radio">
              <input type="radio" name="pan_delivery_address" data-field="pan_delivery_address" value="guardian" ${data.pan_delivery_address === "guardian" ? "checked" : ""}>
              <span data-i18n="opt.delivery_guardian">The guardian's address</span>
            </label>
          </div>
        </label>
      </div>
      </div>
      `;

  // The proofs and the applicant's own address stay gated on the flow rather
  // than marked, and deliberately so: the new-PAN branch further down renders
  // its own copy inside #fy-current-address-block, and rendering both would
  // put two elements behind each of these data-field names. Android reaches
  // the same fields through that other block, which applyFormVariant unhides.
  const ownAddressBlock = !needsOwnAddress
    ? ""
    : `
      ${proofOfIdentityField(data.proof_of_identity, true)}
      ${proofOfAddressField(data.proof_of_address, true)}

      <div class="fy-userform-field" style="margin-bottom:0;">
        <span data-i18n="field.current_address">Your current address</span>
        <small class="fy-userform-hint">${isMinor ? "The applicant's own address. A minor's application is filed on paper, so the government needs it written out." : "Required by the government form now that your correction submits via scanned documents + e-Sign instead of Aadhaar eKYC."}</small>
      </div>
      ${currentAddressFields(data, true)}
      `;

  return `
    <div class="fy-pane" data-pane="4">
      <div class="fy-pane-caption" data-i18n="wizard.step5">Step 5 of 5</div>
      <div class="fy-pane-title" data-i18n="wizard.p5_title">Last step</div>
      <div class="fy-pane-sub" data-i18n="wizard.p5_sub">A few details the income tax department requires.</div>

      ${proofOfPanBlock}
      ${deliveryBlock}
      ${ownAddressBlock}

      <div ${hideOnCorrection}>
      <label class="fy-userform-field">
        <span><span data-i18n="field.income_source">Source of income</span> <em>*</em></span>
        <small class="fy-userform-hint" data-i18n="wizard.select_all">Select all that apply</small>
        <div class="fy-userform-radios fy-userform-radios-grid" id="fy-income-source-group">
          <label class="fy-userform-radio">
            <input type="checkbox" name="income_source" data-field="income_source" value="salary" ${data.income_source.includes("salary") ? "checked" : ""}>
            <span data-i18n="opt.salary">Salary</span>
          </label>
          <label class="fy-userform-radio">
            <input type="checkbox" name="income_source" data-field="income_source" value="business" ${data.income_source.includes("business") ? "checked" : ""}>
            <span data-i18n="opt.business">Business</span>
          </label>
          <label class="fy-userform-radio">
            <input type="checkbox" name="income_source" data-field="income_source" value="house_property" ${data.income_source.includes("house_property") ? "checked" : ""}>
            <span data-i18n="opt.house_property">House property</span>
          </label>
          <label class="fy-userform-radio">
            <input type="checkbox" name="income_source" data-field="income_source" value="other_sources" ${data.income_source.includes("other_sources") ? "checked" : ""}>
            <span data-i18n="opt.other_sources">Other sources</span>
          </label>
          <label class="fy-userform-radio">
            <input type="checkbox" name="income_source" data-field="income_source" value="capital_gains" ${data.income_source.includes("capital_gains") ? "checked" : ""}>
            <span data-i18n="opt.capital_gains">Capital gains</span>
          </label>
          <label class="fy-userform-radio">
            <input type="checkbox" name="income_source" data-field="income_source" value="no_income" ${data.income_source.includes("no_income") ? "checked" : ""}>
            <span data-i18n="opt.no_income">No income</span>
          </label>
        </div>
      </label>
      </div>

      <label class="fy-userform-field">
        <span><span data-i18n="field.place">Place (district)</span> <em>*</em></span>
        <input type="text" data-field="place" value="${escapeHtml(data.place)}" placeholder="BAREILLY" autocomplete="off">
        <small class="fy-userform-hint" data-i18n="wizard.place_hint">The city where you're filing this application</small>
      </label>

      <label class="fy-userform-field">
        <span><span data-i18n="field.proof_of_dob">Proof of date of birth</span> <em>*</em></span>
        <select data-field="proof_of_dob">
          <option value="" data-i18n="opt.select_document">Select a document…</option>
          <option value="Birth Certificate issued by the Municipal Authority or any office authorized to issue Birth and Death Certificate by the Registrar of Birth and Death of the Indian Consulate" data-i18n="opt.birth_cert" ${data.proof_of_dob === "Birth Certificate issued by the Municipal Authority or any office authorized to issue Birth and Death Certificate by the Registrar of Birth and Death of the Indian Consulate" ? "selected" : ""}>Birth Certificate</option>
          <option value="Matriculation certificate" data-i18n="opt.matric_cert" ${data.proof_of_dob === "Matriculation certificate" ? "selected" : ""}>Matriculation Certificate</option>
          <option value="Matriculation Marksheet of recognised board" data-i18n="opt.matric_marksheet" ${data.proof_of_dob === "Matriculation Marksheet of recognised board" ? "selected" : ""}>Matriculation Marksheet</option>
          <option value="Driving License" data-i18n="opt.driving_license" ${data.proof_of_dob === "Driving License" ? "selected" : ""}>Driving License</option>
          <option value="Passport" data-i18n="opt.passport" ${data.proof_of_dob === "Passport" ? "selected" : ""}>Passport</option>
          <option value="Elector's photo identity card" data-i18n="opt.voter_id" ${data.proof_of_dob === "Elector's photo identity card" ? "selected" : ""}>Voter ID</option>
          <option value="Pension payment order" data-i18n="opt.pension_order" ${data.proof_of_dob === "Pension payment order" ? "selected" : ""}>Pension Payment Order</option>
        </select>
        <small class="fy-userform-hint" data-i18n="wizard.proof_dob_hint">The document you'll upload as proof</small>${rememberNote}
      </label>

      <div ${hideOnCorrection}>
      <label class="fy-userform-field">
        <span><span data-i18n="field.is_defence">Are you a defence personnel?</span> <em>*</em></span>
        <div class="fy-userform-radios">
          <label class="fy-userform-radio">
            <input type="radio" name="is_defence" data-field="is_defence" value="false" ${!data.is_defence ? "checked" : ""}>
            <span data-i18n="opt.no">No</span>
          </label>
          <label class="fy-userform-radio">
            <input type="radio" name="is_defence" data-field="is_defence" value="true" ${data.is_defence ? "checked" : ""}>
            <span data-i18n="opt.yes">Yes</span>
          </label>
        </div>
      </label>

      ${
        data.is_defence
          ? `
      <label class="fy-userform-field" id="fy-defence-branch-field">
        <span data-i18n="field.defence_branch">Defence branch</span>
        <div class="fy-userform-radios">
          <label class="fy-userform-radio">
            <input type="radio" name="defence_branch" data-field="defence_branch" value="army" ${data.defence_branch === "army" ? "checked" : ""}>
            <span data-i18n="opt.army">Army</span>
          </label>
          <label class="fy-userform-radio">
            <input type="radio" name="defence_branch" data-field="defence_branch" value="air_force" ${data.defence_branch === "air_force" ? "checked" : ""}>
            <span data-i18n="opt.air_force">Air Force</span>
          </label>
        </div>
      </label>
      `
          : ""
      }
      </div>

      ${
        // Not just `isCorrection`: the minor flow renders its own copy of the
        // address and both proofs above, and a second set here would put two
        // elements behind every one of those data-field names — collectFormData
        // does document.querySelector and would silently read whichever came
        // first. The address-vs-Aadhaar routing this block exists for doesn't
        // apply to either flow anyway.
        needsOwnAddress
          ? ""
          : `
      <label class="fy-userform-field">
        <span><span data-i18n="field.address_same">Is your current address the same as your Aadhaar address?</span> <em>*</em></span>
        <div class="fy-userform-radios" id="fy-address-match-group">
          <label class="fy-userform-radio">
            <input type="radio" name="address_same_as_aadhaar" data-field="address_same_as_aadhaar" value="true" ${data.address_same_as_aadhaar !== false ? "checked" : ""}>
            <span data-i18n="opt.yes">Yes</span>
          </label>
          <label class="fy-userform-radio">
            <input type="radio" name="address_same_as_aadhaar" data-field="address_same_as_aadhaar" value="false" ${data.address_same_as_aadhaar === false ? "checked" : ""}>
            <span data-i18n="opt.no">No</span>
          </label>
        </div>
        <small class="fy-userform-hint" data-i18n="wizard.address_hint">"Yes" uses the regular Aadhaar eKYC application. "No" switches to the PAN application with supporting documents, so you can enter your current address.</small>
      </label>

      <div id="fy-current-address-block" style="display:${data.address_same_as_aadhaar === false ? "block" : "none"};">
      ${proofOfIdentityField(data.proof_of_identity, false)}
      ${proofOfAddressField(data.proof_of_address, false)}
      ${currentAddressFields(data, false)}
      </div>
      `
      }

      <details class="fy-uf-optional"${data.passport_number || data.tin_number ? " open" : ""}>
        <summary data-i18n="wizard.optional_summary">+ Optional — passport, TIN</summary>

        <label class="fy-userform-field">
          <span data-i18n="field.passport_number">Passport number</span>
          <input type="text" data-field="passport_number" value="${escapeHtml(data.passport_number)}" placeholder="Optional" data-i18n-ph="field.optional_ph" autocomplete="off">
        </label>

        <label class="fy-userform-field">
          <span data-i18n="field.tin_number">TIN number</span>
          <input type="text" data-field="tin_number" value="${escapeHtml(data.tin_number)}" placeholder="Optional" data-i18n-ph="field.optional_ph" autocomplete="off">
        </label>
      </details>

      <div class="fy-userform-errors" id="fy-userform-errors" hidden></div>
    </div>
  `;
}

// Read this before filling anything: a minor's application ends at a post
// office, not at a Submit button, and that changes what the applicant has to
// have ready. Told first because it is the one thing that would make someone
// abandon halfway, and finding it out at the end — after paying — is the worst
// possible moment.
//
// Rendered for every flow and filtered out by the wizard for the ones it
// doesn't apply to, for the same reason as the guardian pane: the Android
// panel is baked once as "pan_card", so a pane gated on the slug at render
// time would not exist there at all.
function paneMinorNotice(): string {
  return `
    <div class="fy-pane fy-pane-minor" data-pane="-1">
      <div class="fy-pane-caption">Before you start</div>
      <div class="fy-pane-title" data-i18n="wizard.minor_notice_title">This one finishes by post</div>
      <div class="fy-pane-sub" data-i18n="wizard.minor_notice_sub">A PAN for a child can't be verified online — the government doesn't offer it for minors.</div>

      <div class="fy-userform-field" style="background:var(--fy-warn-bg,#fff8ec);border:1px solid var(--fy-warn-line,#f0d9a8);border-radius:12px;padding:14px 16px;">
        <div style="font-size:13px;line-height:1.65;color:var(--fy-ink,#0a0a2e);" data-i18n-html="wizard.minor_notice_body">
          <p style="margin:0 0 10px;">Once the form is filled and the government's own fee is paid on their website, you'll need to <strong>print it, sign it, and courier the documents to the government's Pune office</strong> for verification.</p>
          <p style="margin:0 0 10px;">Have <strong>colour printouts</strong> ready of whichever documents you pick for verification later in this form.</p>
          <p style="margin:0;"><strong>Write down which documents you choose.</strong> You won't be able to see your selections again after this, and every one of them has to go in the envelope.</p>
        </div>
      </div>
    </div>
  `;
}

// The minor flow's extra step: everything about the guardian, asked in one
// place after the applicant's own steps are done.
//
// Rendered for every flow rather than gated on `form`, and carrying
// `fy-pane-minor` so both clients can filter it out of the wizard when it
// doesn't apply. That looks redundant on desktop, where renderUserFormScreen
// already knows the form — but the Android panel is baked once from
// renderUserFormScreen("pan_card", …) (see prototype/build.mjs), so a pane
// gated on the slug would simply not exist there and the app could never
// collect any of this. No field name here is used by another block, so the
// inert copy in the other flows collides with nothing.
//
// "Guardian" throughout, never "Representative Assessee" — the legal term
// belongs in the config comments, not in front of an applicant.
function paneGuardian(data: UserData): string {
  const addr = (
    field: keyof UserData,
    label: string,
    extra = "",
    optional = false,
  ) => `
        <label class="fy-userform-field">
          <span>${label}${optional ? "" : " <em>*</em>"}</span>
          <input type="text" data-field="${field}" value="${escapeHtml(String(data[field] ?? ""))}" ${optional ? 'placeholder="Optional" data-i18n-ph="field.optional_ph"' : ""} autocomplete="off" ${extra}>
        </label>`;

  return `
    <div class="fy-pane fy-pane-minor" data-pane="5">
      <div class="fy-pane-caption">Last step</div>
      <div class="fy-pane-title" data-i18n="wizard.guardian_title">The guardian's details</div>
      <div class="fy-pane-sub" data-i18n="wizard.guardian_sub">A PAN for a child is always applied for by a parent or guardian, and the government asks for their details in full.</div>

      ${addr("guardian_first_name", "Guardian's first name")}
      <label class="fy-userform-field">
        <span>Guardian's middle name</span>
        <input type="text" data-field="guardian_middle_name" value="${escapeHtml(data.guardian_middle_name)}" placeholder="Optional" data-i18n-ph="field.optional_ph" autocomplete="off">
      </label>
      ${addr("guardian_last_name", "Guardian's last name")}
      <div class="fy-userform-hint" style="margin:-6px 0 14px;" data-i18n="wizard.guardian_name_hint">Write names out in full — the government rejects initials here.</div>

      ${addr("guardian_email", "Guardian's email", 'inputmode="email"')}
      ${addr("guardian_mobile", "Guardian's mobile number", 'inputmode="numeric" maxlength="10"')}

      <label class="fy-userform-field">
        <span><span data-i18n="field.guardian_same_address">Does the guardian live at the same address as the applicant?</span></span>
        <div class="fy-userform-radios" id="fy-guardian-same-address">
          <label class="fy-userform-radio">
            <input type="radio" name="guardian_address_same_as_applicant" data-field="guardian_address_same_as_applicant" value="true" ${data.guardian_address_same_as_applicant ? "checked" : ""}>
            <span data-i18n="opt.yes">Yes</span>
          </label>
          <label class="fy-userform-radio">
            <input type="radio" name="guardian_address_same_as_applicant" data-field="guardian_address_same_as_applicant" value="false" ${data.guardian_address_same_as_applicant ? "" : "checked"}>
            <span data-i18n="opt.no">No</span>
          </label>
        </div>
        <small class="fy-userform-hint" data-i18n="wizard.guardian_same_hint">Choosing Yes copies the address you already entered, so you don't type it twice.</small>
      </label>

      <div id="fy-guardian-address-block" style="display:${data.guardian_address_same_as_applicant ? "none" : "block"};">
        ${addr("guardian_address_flat", "Flat / Door / Building")}
        ${addr("guardian_address_street", "Road / Street / Block / Sector")}

        <label class="fy-userform-field">
          <span data-i18n="field.guardian_post_office">Post Office — optional, skip it if you're unsure</span>
          <input type="text" data-field="guardian_address_post_office" value="${escapeHtml(data.guardian_address_post_office)}" placeholder="Optional" data-i18n-ph="field.optional_ph" autocomplete="off">
        </label>

        ${addr("guardian_address_city", "Area / Locality / Town / City")}
        ${addr("guardian_address_district", "District")}

        <label class="fy-userform-field">
          <span>State / Union Territory <em>*</em></span>
          <select data-field="guardian_address_state">
            <option value="">Select a state…</option>
            ${INDIAN_STATES.map(
              (s) =>
                `<option value="${s}" ${data.guardian_address_state === s ? "selected" : ""}>${s}</option>`,
            ).join("")}
          </select>
        </label>

        ${addr("guardian_address_pin_code", "PIN Code", 'inputmode="numeric" maxlength="6"')}
      </div>

      ${proofOfIdentityField(data.guardian_proof_of_identity, true, "guardian_proof_of_identity", "Guardian's proof of identity")}
      ${proofOfAddressField(data.guardian_proof_of_address, true, "guardian_proof_of_address", "Guardian's proof of address")}

      <div class="fy-userform-errors" id="fy-userform-errors-guardian" hidden></div>
    </div>
  `;
}

// The last thing a minor's applicant sees before paying: the documents they
// picked, read back to them. Everything in this list has to be printed in
// colour and posted to Protean's Pune office, and once the government form is
// open the selections are no longer visible anywhere — so this is the only
// chance to write them down.
//
// Rendered for every flow and carried by `fy-pane-minor` so the wizard filters
// it out of the others, for the same reason as paneGuardian: the Android panel
// is baked once as "pan_card".
function paneDocChecklist(): string {
  return `
    <div class="fy-pane fy-pane-minor" data-pane="6">
      <div class="fy-pane-caption" data-i18n="wizard.checklist_caption">Before you continue</div>
      <div class="fy-pane-title" data-i18n="wizard.checklist_title">The documents you'll have to post</div>
      <div class="fy-pane-sub" data-i18n="wizard.checklist_sub">These are the documents you selected for verification.</div>

      <div class="fy-uf-screenshot" data-i18n="wizard.checklist_screenshot">📸 Take a screenshot of this page. This is the only place your choices are shown — you won't be able to see this list again.</div>

      <div class="fy-uf-checklist" id="fy-doc-checklist">
        <div class="fy-uf-checklist-group">
          <h4 data-i18n="wizard.checklist_applicant">Applicant's documents</h4>
          <ul id="fy-doc-checklist-applicant"></ul>
        </div>
        <div class="fy-uf-checklist-group">
          <h4 data-i18n="wizard.checklist_guardian">Guardian's documents</h4>
          <ul id="fy-doc-checklist-guardian"></ul>
        </div>
      </div>

      <small class="fy-userform-remember" style="margin-top:12px;" data-i18n="wizard.checklist_warning">Print every one of these as a colour photocopy. Once the government's fee is paid on their own website, they all have to be couriered to the government's Pune office — the application isn't processed until they arrive.</small>
    </div>
  `;
}

/**
 * Fills the checklist pane from whatever is currently selected in the proof
 * dropdowns. Reads the option's own text rather than its value: the values are
 * the government's full legal descriptions ("Bank certificate in Original on
 * letter head from the branch…"), which nobody can copy onto an envelope.
 *
 * Exported for the same reason as syncPanDeliveryVisibility — the Android
 * shell has its own render loop and needs to call this from it.
 */
export function syncDocChecklist(root: ParentNode): void {
  const lang = getLang();
  const list = (id: string, fields: [string, string][]) => {
    const ul = root.querySelector<HTMLElement>(id);
    if (!ul) return;
    ul.innerHTML = fields
      .map(([field, key]) => {
        const label = escapeHtml(t(key, lang));
        const sel = root.querySelector<HTMLSelectElement>(
          `[data-field="${field}"]`,
        );
        const text = escapeHtml(sel?.selectedOptions[0]?.text?.trim() ?? "");
        // An empty select means nothing has been picked yet. Saying so beats
        // omitting the row, which would read as "nothing needed here" — and
        // this pane is the applicant's only record of what to put in the
        // envelope, so a silent gap is the worst outcome.
        return !sel || !sel.value
          ? `<li class="fy-uf-checklist-missing"><span data-i18n="${key}">${label}</span><strong data-i18n="checklist.not_chosen">${escapeHtml(t("checklist.not_chosen", lang))}</strong></li>`
          : `<li><span data-i18n="${key}">${label}</span><strong>${text}</strong></li>`;
      })
      .join("");
  };

  list("#fy-doc-checklist-applicant", [
    ["proof_of_identity", "checklist.poi"],
    ["proof_of_address", "checklist.poa"],
    ["proof_of_dob", "checklist.pod"],
  ]);
  list("#fy-doc-checklist-guardian", [
    ["guardian_proof_of_identity", "checklist.poi"],
    ["guardian_proof_of_address", "checklist.poa"],
  ]);
}

/**
 * Shows or hides the blocks that belong to one flow, and puts the right fee on
 * the physical-card question.
 *
 * This exists because the two clients render the panel differently and one of
 * them can't use the form slug at render time. The extension calls
 * renderUserFormScreen per flow; the Android app bakes it once from
 * renderUserFormScreen("pan_card", …) at build time and picks the flow later,
 * from a chooser. Anything switched on the slug inside the render therefore
 * doesn't exist in the app at all — which is how the physical-card question,
 * the delivery-address question and proof-of-PAN all went missing there
 * without anyone noticing.
 *
 * So those blocks are always rendered, tagged `data-flow="…"` with the flows
 * they belong to, and this is what reveals them. Both clients call it, which
 * is the point: one rule, not two that drift.
 */
/**
 * "Where should the card be posted?" only means something when a card is being
 * posted. Exported because both clients need it on every change of the
 * physical-card answer, and because applyFlowVisibility has to re-apply it —
 * that function shows blocks by flow alone, which would otherwise bring this
 * one back for a minor who asked for the e-PAN.
 */
export function syncPanDeliveryVisibility(root: ParentNode): void {
  const block = root.querySelector<HTMLElement>("#fy-pan-delivery-block");
  if (!block) return;
  // Only ever shown on the flow it belongs to. data-flow is the single source
  // of truth for that; this narrows it, never widens it.
  const flows = (block.dataset.flow ?? "").split(/\s+/).filter(Boolean);
  const belongsHere = block.dataset.flowActive === "true";
  const wantsCard =
    root.querySelector<HTMLInputElement>(
      'input[name="wants_physical_pan"]:checked',
    )?.value !== "no";
  block.style.display = belongsHere && wantsCard && flows.length ? "block" : "none";
}

export function applyFlowVisibility(root: ParentNode, form: string): void {
  const flow =
    form === "correction_pan_card"
      ? "correction"
      : form === "minor_pan_card"
        ? "minor"
        : "new";

  root.querySelectorAll<HTMLElement>("[data-flow]").forEach((el) => {
    const flows = (el.dataset.flow ?? "").split(/\s+/).filter(Boolean);
    const belongs = flows.includes(flow);
    el.style.display = belongs ? "" : "none";
    // Recorded so a narrower rule can consult it without re-deriving the flow.
    el.dataset.flowActive = String(belongs);
  });

  // Must run after the loop above, which would otherwise re-reveal the
  // delivery question purely because the flow matches — ignoring the fact that
  // there is nothing to deliver.
  syncPanDeliveryVisibility(root);

  // The government charges a minor's application differently: ₹107/₹72 rather
  // than ₹101/₹66. Both amounts ride on the element so this can swap them
  // without re-rendering.
  const minor = flow === "minor";
  root.querySelectorAll<HTMLElement>("[data-fee]").forEach((el) => {
    const amount = minor ? el.dataset.feeMinor : el.dataset.feeAdult;
    if (!amount) return;
    el.textContent =
      el.dataset.fee === "physical" ? `Yes — ₹${amount}` : `No — ₹${amount}`;
  });
}

export function renderUserFormScreen(form: string, data: UserData): string {
  return `
    <div class="fy-userform">
      ${renderHeader({
        subtitle: "Your details · ~5 min",
        leftHtml: `
          <button class="fy-hdr-back" id="fy-userform-back" aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>`,
      }).replace(
        '<div class="fy-hdr-sub">Your details · ~5 min</div>',
        '<div class="fy-hdr-sub" data-i18n="wizard.header_subtitle">Your details · ~5 min</div>',
      )}
      <div class="fy-flowbar"><div class="fy-flowbar-fill" id="fy-uf-bar" style="width:20%;"></div></div>

      <div class="fy-userform-body" id="fy-uf-body">
        ${paneMinorNotice()}
        ${paneName(data)}
        ${paneContact(data)}
        ${paneAadhaar(form, data)}
        ${paneFamily(form, data)}
        ${paneFinal(form, data)}
        ${paneGuardian(data)}
        ${paneDocChecklist()}
      </div>

      <div class="fy-userform-footer">
        <button class="fy-btn fy-btn-primary fy-btn-block" id="fy-userform-next" data-i18n="wizard.continue">
          Continue
        </button>
        <button class="fy-btn fy-btn-primary fy-btn-block" id="fy-userform-submit" data-i18n="wizard.save_continue" style="display:none;">
          Save &amp; continue →
        </button>
        <div class="fy-userform-privacy">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/></svg>
          <span data-i18n="wizard.privacy">Saved on your device — only your mobile number reaches us</span>
        </div>
      </div>
    </div>
  `;
}

export function showUserForm(form: string): void {
  // The wizard is the one screen not in the panel's initial markup: it renders
  // per flow and per applicant, so baking it into the shell would mean
  // re-rendering and re-binding it on every change anyway.
  //
  // That used to make it the odd one out in a second way — it was appended and
  // removed while every other screen was shown and hidden, so it had to be
  // remembered separately by anything switching screens, and wasn't. Now it is
  // built on demand and then hidden like anything else; the router does not
  // need to know it is special.
  const existing = document.getElementById("fy-userform-screen");
  if (existing) existing.remove();

  getUserData().then((data) => {
    const panel = document.getElementById("formyaar-panel");
    if (!panel) return;

    const wrapper = document.createElement("div");
    wrapper.id = "fy-userform-screen";
    wrapper.className = "fy-screen";
    wrapper.style.cssText =
      "display:none;flex-direction:column;height:100%;animation:fy-fadeIn 0.2s ease;";
    wrapper.innerHTML = renderUserFormScreen(form, data);
    panel.appendChild(wrapper);
    setView("userform", { push: true });

    attachUserFormHandlers(
      form,
      // onSubmit: data is saved, now go to payment
      () => {
        trackEvent("payment_screen_view", form);
        setView("payment");
      },
      // onBack: return to the chooser the user came in through, so backing out
      // of the wizard lands on the application list rather than skipping past
      // it to the home screen.
      () => {
        setView("chooser");
      },
    );
  });
}

function attachUserFormHandlers(
  form: string,
  onSubmit: () => void,
  onBack: () => void,
): void {
  const back = document.getElementById("fy-userform-back");
  const submit = document.getElementById(
    "fy-userform-submit",
  ) as HTMLButtonElement | null;
  const next = document.getElementById(
    "fy-userform-next",
  ) as HTMLButtonElement | null;
  const errorBox = document.getElementById("fy-userform-errors");

  // ── Wizard navigation (pure presentation — all fields stay in the DOM) ──
  // The guardian pane is rendered for every flow so the Android build can bake
  // it (see paneGuardian), so it has to be filtered out of the wizard itself
  // for the flows that don't ask for a guardian. Its fields stay in the DOM
  // and collect as empty strings, which is what those flows want anyway.
  applyFlowVisibility(document, form);

  const panes = Array.from(
    document.querySelectorAll<HTMLElement>(".fy-userform .fy-pane"),
  ).filter(
    (p) =>
      form === "minor_pan_card" || !p.classList.contains("fy-pane-minor"),
  );
  const bar = document.getElementById("fy-uf-bar");
  const bodyEl = document.getElementById("fy-uf-body");
  let paneIdx = 0;

  // ── AO-code gate ────────────────────────────────────────────────────
  // Nobody advances past the PIN-code step until the backend has confirmed an
  // AO code for that area. An unchecked PIN (offline, backend down) is treated
  // exactly like a missing one: we can't know it's fillable, so we don't let
  // the form proceed on a guess and strand the user at payment.
  //
  // Two traps this has to avoid:
  //  • `next` is one shared footer button, not one per pane — gating it
  //    unconditionally would also strand someone who navigated back, so it is
  //    only ever disabled while the PIN pane itself is showing.
  //  • The correction form has no PIN input at all. With no field to check
  //    there is nothing to gate, so the gate opens rather than locking that
  //    form's submit button forever.
  const pinInputEl = document.querySelector<HTMLInputElement>(
    '[data-field="aadhaar_pin_code"]',
  );
  const aoStatusEl0 = document.getElementById("fy-ao-status");
  const aoGated = !!(pinInputEl && aoStatusEl0);
  // Indexed into `panes` — the list this flow actually walks — not read off
  // the authored data-pane attribute. Those two agree only when every pane is
  // walked. The minor flow prepends the courier notice, which shifts every
  // walked index by one, so reading the attribute gated the pane *before* the
  // PIN one: Continue was dead on the mobile-number step and the PIN step
  // itself was left ungated.
  const pinPane = pinInputEl?.closest<HTMLElement>(".fy-pane") ?? null;
  const pinPaneIdx = pinPane ? panes.indexOf(pinPane) : -1;
  let aoOk = !aoGated;

  const updateNavState = () => {
    if (next) next.disabled = aoGated && paneIdx === pinPaneIdx && !aoOk;
    if (submit) submit.disabled = !aoOk;
  };

  // ── Funnel instrumentation ──────────────────────────────────────────
  // Mirrors the Android shell exactly, including the event names, so both
  // clients land in one dataset rather than two that have to be reconciled.
  //
  // The abandon half is why this is not just click tracking: someone who
  // closes the tab on step 3 clicks nothing, so without it "left here" and
  // "still here" are indistinguishable and the drop-off step — the one thing
  // this exists to find — stays invisible.
  let stepEnteredAt = 0;
  let stepViewed = -1; // pane whose _view has already fired
  let stepResolved = false; // continued or abandoned; stops a double-fire

  const secondsOnStep = () =>
    stepEnteredAt ? Math.round((Date.now() - stepEnteredAt) / 1000) : 0;

  const trackStepView = () => {
    if (stepViewed === paneIdx) return;
    stepViewed = paneIdx;
    stepEnteredAt = Date.now();
    stepResolved = false;
    trackEvent(`step${paneIdx + 1}_view`, form);
  };

  const trackStepContinue = () => {
    stepResolved = true;
    // The last pane leaves via Save & continue, not Next — a different
    // button, so a different event name, matching the Android shell.
    const name =
      paneIdx === panes.length - 1
        ? "step5_save_continue_click"
        : `step${paneIdx + 1}_continue_click`;
    trackEvent(name, form, { time_spent_seconds: secondsOnStep() });
  };

  const trackStepAbandon = () => {
    if (stepResolved || stepViewed < 0) return;
    stepResolved = true;
    trackEvent(`step${stepViewed + 1}_abandon`, form, {
      time_spent_seconds: secondsOnStep(),
    });
  };

  const showPane = (i: number) => {
    paneIdx = Math.max(0, Math.min(panes.length - 1, i));
    panes.forEach((p, idx) => p.classList.toggle("on", idx === paneIdx));
    if (bar) bar.style.width = `${((paneIdx + 1) / panes.length) * 100}%`;
    const isLast = paneIdx === panes.length - 1;
    if (next) next.style.display = isLast ? "none" : "flex";
    if (submit) submit.style.display = isLast ? "flex" : "none";
    if (bodyEl) bodyEl.scrollTop = 0;
    // Recomputed on arrival rather than on every change: the dropdowns it
    // reads all live on earlier panes, so there is no way to reach this one
    // without passing them.
    syncDocChecklist(document);
    updateNavState();
    trackStepView();
  };

  updateNavState();
  // The wizard is created and mounted only when the applicant opens it, so
  // unlike the Android shell there is no hidden-render to guard against —
  // reaching this line means step 1 is genuinely on screen.
  trackStepView();

  // Leaving the page, or switching away from it, is what abandonment looks
  // like on desktop. Best-effort: a hard tab kill can outrun the send, so
  // abandon counts are a floor rather than a census.
  const onLeaving = () => {
    if (document.visibilityState === "hidden") trackStepAbandon();
  };
  document.addEventListener("visibilitychange", onLeaving);
  window.addEventListener("pagehide", trackStepAbandon);

  next?.addEventListener("click", () => {
    trackStepContinue();
    showPane(paneIdx + 1);
  });
  back?.addEventListener("click", () => {
    if (paneIdx > 0) showPane(paneIdx - 1);
    else onBack();
  });

  const jumpToField = (field: HTMLElement) => {
    const pane = field.closest<HTMLElement>(".fy-pane");
    // Same reason as pinPaneIdx above: showPane takes a walked index, and
    // data-pane is the authored one.
    if (pane) showPane(panes.indexOf(pane));
    const details = field.closest<HTMLDetailsElement>("details.fy-uf-optional");
    if (details) details.open = true;
    field.scrollIntoView({ behavior: "smooth", block: "center" });
    field.focus();
  };

  // Recovery-contact capture: the mobile number is sent to the backend the
  // moment it looks like a complete, valid number — not on submit. Submit
  // only ever fires at the end of this five-pane wizard, which is exactly the
  // point most applicants who abandon never reach; today that leaves nothing
  // recorded anywhere, extension storage included, so there's no way to
  // follow up with someone who started and disappeared.
  //
  // This is a recovery list, not a marketing one — the only use is "did
  // something go wrong we can help with", to a number the applicant typed
  // into this form themselves. The disclosure line above the input says so.
  // Fire-and-forget: no loading state, no error surfaced, and it never
  // blocks the wizard — a failed capture just means one fewer number on a
  // best-effort outreach list, not a broken application.
  const mobileInput = document.querySelector<HTMLInputElement>(
    '[data-field="mobile"]',
  );
  let leadCaptureTimer: ReturnType<typeof setTimeout> | null = null;
  let leadCapturedFor = ""; // last number already sent, so retyping the same
  // number after a pause doesn't re-fire pointlessly

  const captureLead = (mobile: string) => {
    if (!/^[6-9]\d{9}$/.test(mobile) || mobile === leadCapturedFor) return;
    leadCapturedFor = mobile;
    fetch(`${BACKEND_URL}/leads/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile, form_type: form }),
    }).catch(() => {
      // Offline or backend hiccup — leadCapturedFor stays set deliberately.
      // A silent retry loop here isn't worth the complexity for a best-effort
      // list; the number is still captured for anyone who reaches payment.
    });
    // This number is now reachable by phone. Its own event so that "how many
    // abandoners did we ring, and how many paid after the call" is a number
    // rather than a guess.
    trackEvent("callback_eligible", form);
  };

  if (mobileInput) {
    mobileInput.addEventListener("input", () => {
      const mobile = mobileInput.value.replace(/\D/g, "");
      if (leadCaptureTimer) clearTimeout(leadCaptureTimer);
      leadCaptureTimer = setTimeout(() => captureLead(mobile), 600);
    });
    // Already filled in (resuming saved data) — capture without waiting for
    // the user to touch the field at all.
    if (mobileInput.value.length === 10) captureLead(mobileInput.value);
  }

  // Live AO code availability check — fires when user finishes typing PIN
  const pinInput = pinInputEl;
  const aoStatus = aoStatusEl0;
  let aoCheckTimer: ReturnType<typeof setTimeout> | null = null;

  if (pinInput && aoStatus) {
    // Every outcome other than a confirmed code closes the gate. The retry
    // link matters more than it looks: the result is cached in the DOM and only
    // recomputed on input, so without it someone whose check failed while
    // offline would have to retype the PIN to get moving again.
    const retryLink = `<a href="#" id="fy-ao-retry" style="color:#305eff;font-weight:600;text-decoration:underline;">Retry</a>`;

    const setAO = (ok: boolean, html: string) => {
      aoOk = ok;
      aoStatus.innerHTML = html;
      updateNavState();
      const retry = document.getElementById("fy-ao-retry");
      if (retry)
        retry.addEventListener("click", (e) => {
          e.preventDefault();
          checkAO(pinInput.value.replace(/\D/g, ""));
        });
    };

    const checkAO = async (pin: string) => {
      if (pin.length !== 6) {
        setAO(false, "");
        return;
      }
      aoOk = false; // no advancing mid-flight
      updateNavState();
      aoStatus.innerHTML = `<span style="color:#8a92a3;">Checking AO code availability…</span>`;
      try {
        const res = await fetch(`${BACKEND_URL}/pincode/${pin}`);
        if (!res.ok) {
          // A PIN the service doesn't know, which is a different failure from
          // an area we have no AO code for — conflating the two would
          // misdirect where coverage actually needs extending.
          trackEvent("ao_code_check_result", form, {
            pincode: pin,
            result: "not_recognised",
          });
          setAO(
            false,
            `<span style="color:#d43c33;font-weight:600;">✗ PIN code not recognised — please double-check it</span>`,
          );
          return;
        }
        const { ao_code } = await res.json();
        if (ao_code) {
          trackEvent("ao_code_check_result", form, {
            pincode: pin,
            result: "available",
          });
          setAO(
            true,
            `<span style="color:#157347;font-weight:600;">✓ AO code available for your area</span>`,
          );
        } else {
          trackEvent("ao_code_check_result", form, {
            pincode: pin,
            result: "not_available",
          });
          // Distinct from a plain abandon: this applicant reached the gate and
          // was turned away by us, not by their own hesitation. Every one of
          // these is demand we could serve if the AO data covered their area.
          trackEvent("step3_blocked", form, { pincode: pin });
          setAO(
            false,
            `<span style="color:#d43c33;font-weight:600;">✗ We don't have the AO code for this area yet</span><br><span style="color:#8a92a3;">FormYaar can't complete this form correctly without it. Please write to us and we'll add your area.</span>`,
          );
        }
      } catch {
        setAO(
          false,
          `<span style="color:#d43c33;font-weight:600;">✗ Couldn't check your AO code</span><br><span style="color:#8a92a3;">Check your internet connection, then ${retryLink}.</span>`,
        );
      }
    };
    let pinTracked = "";
    pinInput.addEventListener("input", () => {
      const pin = pinInput.value.replace(/\D/g, "");
      if (aoCheckTimer) clearTimeout(aoCheckTimer);
      aoCheckTimer = setTimeout(() => {
        // Once per distinct complete PIN, not once per keystroke.
        if (pin.length === 6 && pin !== pinTracked) {
          pinTracked = pin;
          trackEvent("pincode_entered", form, { pincode: pin });
        }
        checkAO(pin);
      }, 600);
    });
    // Connection came back — re-run automatically rather than leaving a stale
    // failure on screen that the user has to notice and clear themselves.
    window.addEventListener("online", () => {
      if (!aoOk && pinInput.value.replace(/\D/g, "").length === 6)
        checkAO(pinInput.value.replace(/\D/g, ""));
    });
    // Check immediately if PIN is already filled (e.g. resuming saved data)
    if (pinInput.value.length === 6) checkAO(pinInput.value);
  }

  // Show/hide defence_branch radios dynamically when is_defence changes
  const DEFENCE_BRANCH_HTML = `
    <label class="fy-userform-field" id="fy-defence-branch-field">
      <span>Defence branch</span>
      <div class="fy-userform-radios">
        <label class="fy-userform-radio">
          <input type="radio" name="defence_branch" data-field="defence_branch" value="army">
          <span>Army</span>
        </label>
        <label class="fy-userform-radio">
          <input type="radio" name="defence_branch" data-field="defence_branch" value="air_force">
          <span>Air Force</span>
        </label>
      </div>
    </label>`;

  document
    .querySelectorAll<HTMLInputElement>('input[name="is_defence"]')
    .forEach((radio) => {
      radio.addEventListener("change", () => {
        const isDefence = radio.value === "true" && radio.checked;
        const existing = document.getElementById("fy-defence-branch-field");
        if (isDefence && !existing) {
          const anchor = radio.closest(".fy-userform-field");
          if (anchor) {
            anchor.insertAdjacentHTML("afterend", DEFENCE_BRANCH_HTML);
          }
        } else if (!isDefence && existing) {
          existing.remove();
        }
      });
    });

  // Show/hide current address + proof-of-identity/address fields based on
  // whether the applicant's current address matches Aadhaar.
  const currentAddressBlock = document.getElementById(
    "fy-current-address-block",
  );
  if (currentAddressBlock) {
    document
      .querySelectorAll<HTMLInputElement>('input[name="address_same_as_aadhaar"]')
      .forEach((radio) => {
        radio.addEventListener("change", () => {
          const sameAsAadhaar = radio.value === "true" && radio.checked;
          currentAddressBlock.style.display = sameAsAadhaar ? "none" : "block";
        });
      });
  }

  // "Where should the card be posted?" follows the physical-card answer.
  document
    .querySelectorAll<HTMLInputElement>('input[name="wants_physical_pan"]')
    .forEach((radio) => {
      radio.addEventListener("change", () =>
        syncPanDeliveryVisibility(document),
      );
    });

  // Guardian address: hide the block when it's the same as the applicant's,
  // and copy the values across so the applicant can see what will be sent
  // rather than trusting an invisible copy. collectFormData resolves this
  // again on submit, so the data is right even if this never ran.
  const guardianAddressBlock = document.getElementById(
    "fy-guardian-address-block",
  );
  if (guardianAddressBlock) {
    const GUARDIAN_ADDRESS_PAIRS: [string, string][] = [
      ["guardian_address_flat", "current_address_flat"],
      ["guardian_address_street", "current_address_street"],
      ["guardian_address_post_office", "current_address_post_office"],
      ["guardian_address_city", "current_address_city"],
      ["guardian_address_district", "current_address_district"],
      ["guardian_address_state", "current_address_state"],
      ["guardian_address_pin_code", "current_address_pin_code"],
    ];
    document
      .querySelectorAll<HTMLInputElement>(
        'input[name="guardian_address_same_as_applicant"]',
      )
      .forEach((radio) => {
        radio.addEventListener("change", () => {
          const same = radio.value === "true" && radio.checked;
          guardianAddressBlock.style.display = same ? "none" : "block";
          if (!same) return;
          for (const [to, from] of GUARDIAN_ADDRESS_PAIRS) {
            const src = document.querySelector<HTMLInputElement>(
              `[data-field="${from}"]`,
            );
            const dst = document.querySelector<HTMLInputElement>(
              `[data-field="${to}"]`,
            );
            if (src && dst) dst.value = src.value;
          }
        });
      });
  }

  // Income source: "No income" is mutually exclusive with every other
  // source — mirrors the real PAN form's own behavior (and the tax rule
  // that you can't have income sources and no income at once).
  const incomeGroup = document.getElementById("fy-income-source-group");
  if (incomeGroup) {
    const incomeBoxes = Array.from(
      incomeGroup.querySelectorAll<HTMLInputElement>(
        'input[name="income_source"]',
      ),
    );
    const noIncomeBox = incomeBoxes.find((b) => b.value === "no_income");
    incomeBoxes.forEach((box) => {
      box.addEventListener("change", () => {
        if (box === noIncomeBox && box.checked) {
          incomeBoxes.forEach((b) => {
            if (b !== noIncomeBox) b.checked = false;
          });
        } else if (box !== noIncomeBox && box.checked && noIncomeBox) {
          noIncomeBox.checked = false;
        }
      });
    });
  }

  const dobInput = document.querySelector<HTMLInputElement>(
    '[data-field="date_of_birth"]',
  );
  if (dobInput) {
    dobInput.addEventListener("input", (e) => {
      const input = e.target as HTMLInputElement;
      const isDeleting = !!(e as InputEvent).inputType?.startsWith("delete");
      input.value = formatDobValue(input.value, isDeleting);
    });
  }

  if (submit) {
    submit.addEventListener("click", async () => {
      const data = collectFormData(form);
      const errors = validateUserData(data, form);

      // Clear previous error highlights
      document
        .querySelectorAll(".fy-userform input.fy-error")
        .forEach((el) => el.classList.remove("fy-error"));

      if (errors.length > 0) {
        if (errorBox) {
          errorBox.hidden = false;
          errorBox.innerHTML = `<ul>${errors
            .map((e) => `<li>${e.message}</li>`)
            .join("")}</ul>`;
        }
        // Jump to the pane containing the first error field
        const firstError = errors[0];
        const firstField = document.querySelector(
          `[data-field="${firstError.field}"]`,
        ) as HTMLElement | null;
        if (firstField) {
          firstField.classList.add("fy-error");
          jumpToField(firstField);
        }
        return;
      }

      if (errorBox) errorBox.hidden = true;

      // Eligibility confirmation — required every time, before payment
      const eligible = await showEligibilityModal(form);
      if (!eligible) return;

      // Confirmation modal before payment
      const aoStatusEl = document.getElementById("fy-ao-status");
      const aoStatusHTML = aoStatusEl?.innerHTML?.trim() ?? "";
      // AO is available if the text contains the green checkmark — no modal
      // needed. The correction form has no AO Code fieldset and so no PIN input
      // to check, which would otherwise read as "AO unavailable" and pop an
      // empty warning modal — skip straight through.
      const aoAvailable =
        form === "correction_pan_card" ||
        (aoStatusEl?.textContent?.includes("✓") ?? false);

      if (aoAvailable) {
        await saveUserData(data);
        onSubmit();
        return;
      }

      const aoLine = aoStatusHTML
        ? `<div style="background:#f3f5f9;border-radius:10px;padding:10px 13px;margin-bottom:14px;font-size:12px;line-height:1.5;">${aoStatusHTML}</div>`
        : "";

      const modal = document.createElement("div");
      modal.className = "fy-modal-guard";
      modal.style.cssText = `
        position:fixed;inset:0;background:rgba(12,19,34,0.5);z-index:9999999;
        display:flex;align-items:center;justify-content:center;padding:24px;
      `;
      modal.innerHTML = `
        <div style="background:#fff;border-radius:16px;padding:22px;max-width:320px;width:100%;box-shadow:0 20px 60px rgba(12,19,34,0.3);font-family:'DM Sans',sans-serif;">
          <div style="font-size:16px;font-weight:800;color:#0c1322;margin-bottom:6px;letter-spacing:-0.2px;">Details saved</div>
          <div style="font-size:12.5px;color:#8a92a3;margin-bottom:14px;line-height:1.6;">
            Next is a one-time payment of <strong style="color:#0c1322;">₹39</strong>, then FormYaar fills your entire form.
          </div>
          ${aoLine}
          <div style="display:flex;gap:8px;">
            <button id="fy-modal-cancel" style="flex:1;padding:12px;background:#f3f5f9;color:#424b5e;border:none;border-radius:11px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;">Go back</button>
            <button id="fy-modal-confirm" style="flex:2;padding:12px;background:#305eff;color:#fff;border:none;border-radius:11px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">Continue</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const confirmed = await new Promise<boolean>((resolve) => {
        document.getElementById("fy-modal-confirm")!.onclick = () => {
          modal.remove();
          resolve(true);
        };
        document.getElementById("fy-modal-cancel")!.onclick = () => {
          modal.remove();
          resolve(false);
        };
        modal.addEventListener("click", (e) => {
          if (e.target === modal) {
            modal.remove();
            resolve(false);
          }
        });
      });

      if (!confirmed) return;

      // Save data and continue
      await saveUserData(data);
      onSubmit();
    });
  }
}

// Required every time before payment — PAN service currently only supports
// adults, so we make the applicant explicitly confirm both before they can
// proceed. The second confirmation inverts for the correction flow: holding a
// PAN disqualifies a new application, but is the whole premise of a correction.
function showEligibilityModal(form: string): Promise<boolean> {
  const isCorrection = form === "correction_pan_card";
  const panConfirmText = isCorrection
    ? `I confirm I already have a PAN card and want to change or correct its details.`
    : `I confirm I do not already have a PAN card.`;
  const modal = document.createElement("div");
  modal.className = "fy-modal-guard";
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(12,19,34,0.5);z-index:9999999;
    display:flex;align-items:center;justify-content:center;padding:24px;
  `;
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:22px;max-width:320px;width:100%;box-shadow:0 20px 60px rgba(12,19,34,0.3);font-family:'DM Sans',sans-serif;">
      <div style="font-size:16px;font-weight:800;color:#0c1322;margin-bottom:14px;letter-spacing:-0.2px;">Before you continue</div>
      <div style="background:#fdecea;border:1px solid #f3b9b3;border-radius:11px;padding:12px 13px;margin-bottom:16px;">
        <label style="display:flex;gap:9px;align-items:flex-start;cursor:pointer;margin-bottom:10px;">
          <input type="checkbox" id="fy-elig-adult" style="margin-top:2px;flex-shrink:0;">
          <span style="font-size:12.5px;color:#b3261e;font-weight:600;line-height:1.5;">I confirm I am over 18 years old. <span style="font-weight:400;">We don't currently offer PAN cards for minors.</span></span>
        </label>
        <label style="display:flex;gap:9px;align-items:flex-start;cursor:pointer;">
          <input type="checkbox" id="fy-elig-no-pan" style="margin-top:2px;flex-shrink:0;">
          <span style="font-size:12.5px;color:#b3261e;font-weight:600;line-height:1.5;">${panConfirmText}</span>
        </label>
      </div>
      <div style="display:flex;gap:8px;">
        <button id="fy-elig-cancel" style="flex:1;padding:12px;background:#f3f5f9;color:#424b5e;border:none;border-radius:11px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;">Go back</button>
        <button id="fy-elig-confirm" disabled style="flex:2;padding:12px;background:#c7ccd6;color:#fff;border:none;border-radius:11px;font-size:13px;font-weight:700;cursor:not-allowed;font-family:inherit;">Continue</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const adultBox = modal.querySelector<HTMLInputElement>("#fy-elig-adult")!;
  const noPanBox = modal.querySelector<HTMLInputElement>("#fy-elig-no-pan")!;
  const confirmBtn = modal.querySelector<HTMLButtonElement>(
    "#fy-elig-confirm",
  )!;

  const updateConfirmState = () => {
    const bothChecked = adultBox.checked && noPanBox.checked;
    confirmBtn.disabled = !bothChecked;
    confirmBtn.style.background = bothChecked ? "#305eff" : "#c7ccd6";
    confirmBtn.style.cursor = bothChecked ? "pointer" : "not-allowed";
  };
  adultBox.addEventListener("change", updateConfirmState);
  noPanBox.addEventListener("change", updateConfirmState);

  return new Promise<boolean>((resolve) => {
    confirmBtn.onclick = () => {
      if (confirmBtn.disabled) return;
      modal.remove();
      resolve(true);
    };
    modal.querySelector<HTMLButtonElement>("#fy-elig-cancel")!.onclick =
      () => {
        modal.remove();
        resolve(false);
      };
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
        resolve(false);
      }
    });
  });
}

/**
 * Read the intake wizard back out as a UserData record.
 *
 * Exported because the Android app renders this same markup and has to read it
 * back the same way. Its first attempt did the obvious thing — copy each
 * control's `.value` into a key of the same name — and that is wrong in ways
 * that only show up on the government form: a "No" radio carries the string
 * "false", which is truthy, so the fill ticked Yes on the single-parent
 * question the applicant had answered No. Fields like is_single_parent_father
 * aren't controls at all; they're derived from two separate answers. That
 * knowledge lives here, and there should be exactly one copy of it.
 */
export function collectFormData(form: string): UserData {
  const get = (field: string): string => {
    const el = document.querySelector(
      `[data-field="${field}"]`,
    ) as HTMLInputElement | null;
    return el ? el.value.trim() : "";
  };

  const getRadio = (name: string): string => {
    const el = document.querySelector(
      `input[name="${name}"]:checked`,
    ) as HTMLInputElement | null;
    return el ? el.value : "";
  };

  const getCheckboxGroup = (name: string): string[] =>
    Array.from(
      document.querySelectorAll(`input[name="${name}"]:checked`),
    ).map((el) => (el as HTMLInputElement).value);

  const parentOnCard = getRadio("parent_on_card");

  // "The guardian lives at the same address" is resolved here rather than only
  // by the copy-across in the UI. The block is hidden when it's on, and a
  // hidden block that was never populated would otherwise collect as empty and
  // put a blank address on the government form.
  const guardianSameAddress =
    getRadio("guardian_address_same_as_applicant") === "true";
  const guardianAddr = (guardianField: string, applicantField: string) =>
    get(guardianSameAddress ? applicantField : guardianField).toUpperCase();

  return {
    first_name: get("first_name").toUpperCase(),
    middle_name: get("middle_name").toUpperCase(),
    last_name: get("last_name").toUpperCase(),
    date_of_birth: get("date_of_birth"),
    email: get("email"),
    mobile: get("mobile"),
    aadhaar_last_4: get("aadhaar_last_4").replace(/\D/g, "").slice(0, 4),
    name_as_per_aadhaar: get("name_as_per_aadhaar").toUpperCase(),
    gender: getRadio("gender") as "M" | "F" | "T" | "",
    father_first_name: get("father_first_name").toUpperCase(),
    father_middle_name: get("father_middle_name").toUpperCase(),
    father_last_name: get("father_last_name").toUpperCase(),
    mother_first_name: get("mother_first_name").toUpperCase(),
    mother_middle_name: get("mother_middle_name").toUpperCase(),
    mother_last_name: get("mother_last_name").toUpperCase(),
    parent_on_card_is_father: parentOnCard === "father",
    parent_on_card_is_mother: parentOnCard === "mother",
    is_single_parent: getRadio("is_single_parent") === "true",
    is_single_parent_father:
      getRadio("is_single_parent") === "true" && parentOnCard === "father",
    is_single_parent_mother:
      getRadio("is_single_parent") === "true" && parentOnCard === "mother",
    aadhaar_pin_code: get("aadhaar_pin_code"),
    place: get("place").toUpperCase(),
    is_defence: getRadio("is_defence") === "true",
    defence_branch: getRadio("defence_branch") as UserData["defence_branch"],
    passport_number: get("passport_number"),
    tin_number: get("tin_number"),
    proof_of_dob: get("proof_of_dob"),
    income_source: getCheckboxGroup(
      "income_source",
    ) as UserData["income_source"],
    address_same_as_aadhaar: getRadio("address_same_as_aadhaar") !== "false",
    current_address_flat: get("current_address_flat").toUpperCase(),
    current_address_street: get("current_address_street").toUpperCase(),
    current_address_post_office: get(
      "current_address_post_office",
    ).toUpperCase(),
    current_address_city: get("current_address_city").toUpperCase(),
    current_address_district: get("current_address_district").toUpperCase(),
    current_address_state: get("current_address_state").toUpperCase(),
    current_address_pin_code: get("current_address_pin_code"),
    proof_of_identity: get("proof_of_identity"),
    proof_of_address: get("proof_of_address"),
    // Not a form field — comes from which home-screen entry point the user
    // took, so it survives into resolveFormSlug() after save.
    application_intent: form === "correction_pan_card" ? "correction" : "new",
    // Both only rendered on the correction flow; everywhere else the radio /
    // select isn't in the DOM, so these fall back to the same defaults
    // EMPTY_USER_DATA carries.
    wants_physical_pan: getRadio("wants_physical_pan") === "no" ? "no" : "yes",
    proof_of_pan: get("proof_of_pan") || "Copy of Pan Card",
    guardian_first_name: get("guardian_first_name").toUpperCase(),
    guardian_middle_name: get("guardian_middle_name").toUpperCase(),
    guardian_last_name: get("guardian_last_name").toUpperCase(),
    guardian_email: get("guardian_email"),
    guardian_mobile: get("guardian_mobile").replace(/\D/g, "").slice(0, 10),
    guardian_address_same_as_applicant: guardianSameAddress,
    guardian_address_flat: guardianAddr(
      "guardian_address_flat",
      "current_address_flat",
    ),
    guardian_address_street: guardianAddr(
      "guardian_address_street",
      "current_address_street",
    ),
    guardian_address_post_office: guardianAddr(
      "guardian_address_post_office",
      "current_address_post_office",
    ),
    guardian_address_city: guardianAddr(
      "guardian_address_city",
      "current_address_city",
    ),
    guardian_address_district: guardianAddr(
      "guardian_address_district",
      "current_address_district",
    ),
    guardian_address_state: guardianAddr(
      "guardian_address_state",
      "current_address_state",
    ),
    guardian_address_pin_code: guardianSameAddress
      ? get("current_address_pin_code")
      : get("guardian_address_pin_code"),
    guardian_proof_of_identity: get("guardian_proof_of_identity"),
    guardian_proof_of_address: get("guardian_proof_of_address"),
    pan_delivery_address:
      getRadio("pan_delivery_address") === "guardian" ? "guardian" : "residence",
  };
}

/**
 * DD/MM/YYYY as you type: inserts the slashes, clamps day to 31 and month to
 * 12. Pure so the Android app can share it — a phone's numeric keyboard has no
 * slash key, so without this the date can't be entered there at all, and a
 * second implementation would be free to drift from this one.
 *
 * `isDeleting` stops a backspace from immediately re-adding the separator the
 * user just removed.
 */
export function formatDobValue(raw: string, isDeleting: boolean): string {
  let digits = raw.replace(/\D/g, "");

  // Clamp day to 31
  if (digits.length >= 2) {
    const day = parseInt(digits.slice(0, 2), 10);
    if (day > 31) digits = "31" + digits.slice(2);
    if (day === 0) digits = "01" + digits.slice(2);
  }
  // Clamp month to 12
  if (digits.length >= 4) {
    const month = parseInt(digits.slice(2, 4), 10);
    if (month > 12) digits = digits.slice(0, 2) + "12" + digits.slice(4);
    if (month === 0) digits = digits.slice(0, 2) + "01" + digits.slice(4);
  }

  let formatted = digits.slice(0, 2);
  if (digits.length === 2 && !isDeleting) {
    formatted += "/";
  } else if (digits.length > 2) {
    formatted += "/" + digits.slice(2, 4);
    if (digits.length === 4 && !isDeleting) {
      formatted += "/";
    } else if (digits.length > 4) {
      formatted += "/" + digits.slice(4, 8);
    }
  }
  return formatted;
}
