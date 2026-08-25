import { BACKEND_URL } from "../constants";
import {
  getUserData,
  saveUserData,
  validateUserData,
  type UserData,
} from "../userData";
import { escapeHtml, renderHeader } from "./shared";

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
          <input type="text" data-field="middle_name" value="${escapeHtml(data.middle_name)}" placeholder="Optional" autocomplete="off">
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
          <input type="text" data-field="father_middle_name" value="${escapeHtml(data.father_middle_name)}" placeholder="Optional" autocomplete="off">
        </label>
      </div>

      <label class="fy-userform-field">
        <span data-i18n="field.father_last">Father's last name</span>
        <input type="text" data-field="father_last_name" value="${escapeHtml(data.father_last_name)}" placeholder="Optional" autocomplete="off">
      </label>

      <div class="fy-userform-row">
        <label class="fy-userform-field">
          <span><span data-i18n="field.mother_first">Mother's first name</span> <em>*</em></span>
          <input type="text" data-field="mother_first_name" value="${escapeHtml(data.mother_first_name)}" placeholder="RADHA" autocomplete="off">
        </label>
        <label class="fy-userform-field">
          <span data-i18n="field.middle_short">Middle</span>
          <input type="text" data-field="mother_middle_name" value="${escapeHtml(data.mother_middle_name)}" placeholder="Optional" autocomplete="off">
        </label>
      </div>

      <label class="fy-userform-field">
        <span data-i18n="field.mother_last">Mother's last name</span>
        <input type="text" data-field="mother_last_name" value="${escapeHtml(data.mother_last_name)}" placeholder="Optional" autocomplete="off">
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

function paneFinal(form: string, data: UserData): string {
  const isCorrection = form === "correction_pan_card";
  // Source of income, defence status and the current-address branch all feed
  // parts of the new-PAN application that the correction form simply doesn't
  // have. Kept in the DOM (rather than dropped) so collectFormData still reads
  // their defaults and the address-toggle handler has something to bind to.
  const hideOnCorrection = isCorrection ? `style="display:none;"` : "";

  // Two questions only the correction application asks. A new-PAN applicant
  // has no PAN to prove, and pan_card.json hardcodes the physical card, so
  // showing either of these on that flow would be noise.
  const correctionOnly = !isCorrection
    ? ""
    : `
      <label class="fy-userform-field">
        <span><span data-i18n="field.proof_of_pan">Proof of your existing PAN</span> <em>*</em></span>
        <select data-field="proof_of_pan">
          <option value="Copy of Pan Card" data-i18n="opt.pan_copy" ${data.proof_of_pan === "Copy of Pan Card" ? "selected" : ""}>Copy of PAN card</option>
          <option value="Copy of Pan Allotment Letter" data-i18n="opt.pan_allotment" ${data.proof_of_pan === "Copy of Pan Allotment Letter" ? "selected" : ""}>Copy of PAN allotment letter</option>
          <option value="No Document" data-i18n="opt.no_document" ${data.proof_of_pan === "No Document" ? "selected" : ""}>No document</option>
        </select>
        <small class="fy-userform-hint" data-i18n="wizard.proof_pan_hint">What you'll upload to prove the PAN you're correcting</small>
      </label>

      <label class="fy-userform-field">
        <span><span data-i18n="field.wants_physical">Do you want a physical PAN card?</span> <em>*</em></span>
        <div class="fy-userform-radios">
          <label class="fy-userform-radio">
            <input type="radio" name="wants_physical_pan" data-field="wants_physical_pan" value="yes" ${data.wants_physical_pan !== "no" ? "checked" : ""}>
            <span data-i18n="opt.yes_101">Yes — ₹101</span>
          </label>
          <label class="fy-userform-radio">
            <input type="radio" name="wants_physical_pan" data-field="wants_physical_pan" value="no" ${data.wants_physical_pan === "no" ? "checked" : ""}>
            <span data-i18n="opt.no_66">No — ₹66</span>
          </label>
        </div>
        <small class="fy-userform-hint" data-i18n="wizard.physical_hint">"No" means e-PAN only, sent to your email. This is the government's fee, not ours.</small>
      </label>
      `;

  return `
    <div class="fy-pane" data-pane="4">
      <div class="fy-pane-caption" data-i18n="wizard.step5">Step 5 of 5</div>
      <div class="fy-pane-title" data-i18n="wizard.p5_title">Last step</div>
      <div class="fy-pane-sub" data-i18n="wizard.p5_sub">A few details the income tax department requires.</div>

      ${correctionOnly}

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
        <small class="fy-userform-hint" data-i18n="wizard.proof_dob_hint">The document you'll upload as proof</small>
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

      <label class="fy-userform-field">
        <span>Proof of identity</span>
        <select data-field="proof_of_identity">
          <option value="">Select a document…</option>
          <option value="AADHAAR Card issued by the Unique Identification Authority of India" ${data.proof_of_identity === "AADHAAR Card issued by the Unique Identification Authority of India" ? "selected" : ""}>Aadhaar Card</option>
          <option value="Driving License" ${data.proof_of_identity === "Driving License" ? "selected" : ""}>Driving License</option>
          <option value="Passport" ${data.proof_of_identity === "Passport" ? "selected" : ""}>Passport</option>
          <option value="Elector's photo identity card" ${data.proof_of_identity === "Elector's photo identity card" ? "selected" : ""}>Voter ID</option>
          <option value="Central Government Health Scheme Card" ${data.proof_of_identity === "Central Government Health Scheme Card" ? "selected" : ""}>Central Government Health Scheme Card</option>
          <option value="Ex-Servicemen Contributory Health Scheme photo card" ${data.proof_of_identity === "Ex-Servicemen Contributory Health Scheme photo card" ? "selected" : ""}>Ex-Servicemen Contributory Health Scheme Card</option>
          <option value="Pensioner Card having photograph of the applicant" ${data.proof_of_identity === "Pensioner Card having photograph of the applicant" ? "selected" : ""}>Pensioner Card</option>
          <option value="Ration card having photograph of the applicant" ${data.proof_of_identity === "Ration card having photograph of the applicant" ? "selected" : ""}>Ration Card</option>
          <option value="Photo identity card issued by the Central Government or State Government or Public Sector Undertaking." ${data.proof_of_identity === "Photo identity card issued by the Central Government or State Government or Public Sector Undertaking." ? "selected" : ""}>Govt./PSU Photo ID Card</option>
          <option value="Transgender Identity Card / Certificate issued under the Transgender Persons (Protection of Rights) Act 2019 having photograph of the applicant" ${data.proof_of_identity === "Transgender Identity Card / Certificate issued under the Transgender Persons (Protection of Rights) Act 2019 having photograph of the applicant" ? "selected" : ""}>Transgender Identity Card</option>
          <option value="Bank certificate in Original on letter head from the branch (along with name and stamp of the issuing officer) containing duly attested photograph and bank account number of the applicant" ${data.proof_of_identity === "Bank certificate in Original on letter head from the branch (along with name and stamp of the issuing officer) containing duly attested photograph and bank account number of the applicant" ? "selected" : ""}>Bank Certificate (Original)</option>
          <option value="Certificate of Identity signed by a Gazetted Officer" ${data.proof_of_identity === "Certificate of Identity signed by a Gazetted Officer" ? "selected" : ""}>Certificate of Identity — Gazetted Officer</option>
          <option value="Certificate of Identity signed by a Member of Parliament" ${data.proof_of_identity === "Certificate of Identity signed by a Member of Parliament" ? "selected" : ""}>Certificate of Identity — MP</option>
          <option value="Certificate of Identity signed by a Member of Legislative Assembly" ${data.proof_of_identity === "Certificate of Identity signed by a Member of Legislative Assembly" ? "selected" : ""}>Certificate of Identity — MLA</option>
          <option value="Certificate of Identity signed by a Municipal Councillor" ${data.proof_of_identity === "Certificate of Identity signed by a Municipal Councillor" ? "selected" : ""}>Certificate of Identity — Municipal Councillor</option>
        </select>
        <small class="fy-userform-hint">For "PAN application with supporting documents" — not needed for the Aadhaar eKYC option</small>
      </label>

      <label class="fy-userform-field">
        <span>Proof of address (current address)</span>
        <select data-field="proof_of_address">
          <option value="">Select a document…</option>
          <option value="AADHAAR Card issued by the Unique Identification Authority of India" ${data.proof_of_address === "AADHAAR Card issued by the Unique Identification Authority of India" ? "selected" : ""}>Aadhaar Card</option>
          <option value="Driving License" ${data.proof_of_address === "Driving License" ? "selected" : ""}>Driving License</option>
          <option value="Passport" ${data.proof_of_address === "Passport" ? "selected" : ""}>Passport</option>
          <option value="Passport of the spouse" ${data.proof_of_address === "Passport of the spouse" ? "selected" : ""}>Passport of Spouse</option>
          <option value="Elector's photo identity card" ${data.proof_of_address === "Elector's photo identity card" ? "selected" : ""}>Voter ID</option>
          <option value="Electricity Bill (Not more than 3 months old from the date of application)" ${data.proof_of_address === "Electricity Bill (Not more than 3 months old from the date of application)" ? "selected" : ""}>Electricity Bill (≤3 months)</option>
          <option value="Water Bill (Not more than 3 months old from the date of application)" ${data.proof_of_address === "Water Bill (Not more than 3 months old from the date of application)" ? "selected" : ""}>Water Bill (≤3 months)</option>
          <option value="Landline Telephone Bill (Not more than 3 months old from the date of application)" ${data.proof_of_address === "Landline Telephone Bill (Not more than 3 months old from the date of application)" ? "selected" : ""}>Landline Bill (≤3 months)</option>
          <option value="Broadband Connection Bill (Not more than 3 months old from the date of application)" ${data.proof_of_address === "Broadband Connection Bill (Not more than 3 months old from the date of application)" ? "selected" : ""}>Broadband Bill (≤3 months)</option>
          <option value="Consumer gas connection card or book or piped gas bill(Not more than 3 months old from date of application)" ${data.proof_of_address === "Consumer gas connection card or book or piped gas bill(Not more than 3 months old from date of application)" ? "selected" : ""}>Gas Connection Card/Bill (≤3 months)</option>
          <option value="Bank account statement/passbook (Not more than 3 months old from the date of application)" ${data.proof_of_address === "Bank account statement/passbook (Not more than 3 months old from the date of application)" ? "selected" : ""}>Bank Statement/Passbook (≤3 months)</option>
          <option value="Post office passbook having address of the applicant" ${data.proof_of_address === "Post office passbook having address of the applicant" ? "selected" : ""}>Post Office Passbook</option>
          <option value="Depository account statement (Not more than 3 months old from the date of application)" ${data.proof_of_address === "Depository account statement (Not more than 3 months old from the date of application)" ? "selected" : ""}>Depository Account Statement (≤3 months)</option>
          <option value="Credit card statement (Not more than 3 months old from the date of application)" ${data.proof_of_address === "Credit card statement (Not more than 3 months old from the date of application)" ? "selected" : ""}>Credit Card Statement (≤3 months)</option>
          <option value="Property Registration Document" ${data.proof_of_address === "Property Registration Document" ? "selected" : ""}>Property Registration Document</option>
          <option value="Latest property tax assessment order" ${data.proof_of_address === "Latest property tax assessment order" ? "selected" : ""}>Property Tax Assessment Order</option>
          <option value="Domicile certificate issued by the Government" ${data.proof_of_address === "Domicile certificate issued by the Government" ? "selected" : ""}>Domicile Certificate</option>
          <option value="Allotment letter of accommodation issued by Central or State Government of not more than three years old" ${data.proof_of_address === "Allotment letter of accommodation issued by Central or State Government of not more than three years old" ? "selected" : ""}>Govt. Accommodation Allotment Letter (≤3 years)</option>
          <option value="Employer certificate in original" ${data.proof_of_address === "Employer certificate in original" ? "selected" : ""}>Employer Certificate (Original)</option>
          <option value="Certificate of Address signed by a Gazetted Officer" ${data.proof_of_address === "Certificate of Address signed by a Gazetted Officer" ? "selected" : ""}>Certificate of Address — Gazetted Officer</option>
          <option value="Certificate of Address signed by a Member of Parliament" ${data.proof_of_address === "Certificate of Address signed by a Member of Parliament" ? "selected" : ""}>Certificate of Address — MP</option>
          <option value="Certificate of Address signed by a Member of Legislative Assembly" ${data.proof_of_address === "Certificate of Address signed by a Member of Legislative Assembly" ? "selected" : ""}>Certificate of Address — MLA</option>
          <option value="Certificate of Address signed by a Municipal Councillor" ${data.proof_of_address === "Certificate of Address signed by a Municipal Councillor" ? "selected" : ""}>Certificate of Address — Municipal Councillor</option>
          <option value="Bank Account Statement in the country of residence (Not more than 3 months old from the date of application)" ${data.proof_of_address === "Bank Account Statement in the country of residence (Not more than 3 months old from the date of application)" ? "selected" : ""}>Bank Statement — Country of Residence (≤3 months)</option>
          <option value="NRE bank account statement (Not more than 3 months old from the date of application)" ${data.proof_of_address === "NRE bank account statement (Not more than 3 months old from the date of application)" ? "selected" : ""}>NRE Bank Account Statement (≤3 months)</option>
        </select>
        <small class="fy-userform-hint">Proof for your current address — used only in the "supporting documents" option</small>
      </label>

        <label class="fy-userform-field">
          <span>Flat / Door / Building</span>
          <input type="text" data-field="current_address_flat" value="${escapeHtml(data.current_address_flat)}" placeholder="Optional" autocomplete="off">
        </label>

        <label class="fy-userform-field">
          <span>Road / Street / Block / Sector</span>
          <input type="text" data-field="current_address_street" value="${escapeHtml(data.current_address_street)}" placeholder="Optional" autocomplete="off">
        </label>

        <label class="fy-userform-field">
          <span>Post Office</span>
          <input type="text" data-field="current_address_post_office" value="${escapeHtml(data.current_address_post_office)}" placeholder="Optional" autocomplete="off">
        </label>

        <label class="fy-userform-field">
          <span>Area / Locality / Town / City</span>
          <input type="text" data-field="current_address_city" value="${escapeHtml(data.current_address_city)}" placeholder="Optional" autocomplete="off">
        </label>

        <label class="fy-userform-field">
          <span>District</span>
          <input type="text" data-field="current_address_district" value="${escapeHtml(data.current_address_district)}" placeholder="Optional" autocomplete="off">
        </label>

        <label class="fy-userform-field">
          <span>State / Union Territory</span>
          <select data-field="current_address_state">
            <option value="">Select a state…</option>
            ${INDIAN_STATES.map(
              (state) =>
                `<option value="${state}" ${data.current_address_state === state ? "selected" : ""}>${state}</option>`,
            ).join("")}
          </select>
        </label>

        <label class="fy-userform-field">
          <span>PIN Code</span>
          <input type="text" data-field="current_address_pin_code" value="${escapeHtml(data.current_address_pin_code)}" placeholder="Optional" maxlength="6" inputmode="numeric" autocomplete="off">
        </label>

      </div>
      </div>

      <details class="fy-uf-optional"${data.passport_number || data.tin_number ? " open" : ""}>
        <summary data-i18n="wizard.optional_summary">+ Optional — passport, TIN</summary>

        <label class="fy-userform-field">
          <span data-i18n="field.passport_number">Passport number</span>
          <input type="text" data-field="passport_number" value="${escapeHtml(data.passport_number)}" placeholder="Optional" autocomplete="off">
        </label>

        <label class="fy-userform-field">
          <span data-i18n="field.tin_number">TIN number</span>
          <input type="text" data-field="tin_number" value="${escapeHtml(data.tin_number)}" placeholder="Optional" autocomplete="off">
        </label>
      </details>

      <div class="fy-userform-errors" id="fy-userform-errors" hidden></div>
    </div>
  `;
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
        ${paneName(data)}
        ${paneContact(data)}
        ${paneAadhaar(form, data)}
        ${paneFamily(form, data)}
        ${paneFinal(form, data)}
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
          <span data-i18n="wizard.privacy">Saved on your device only — never sent to us</span>
        </div>
      </div>
    </div>
  `;
}

export function showUserForm(form: string): void {
  // Hide all other screens
  const screens = [
    "fy-home",
    "fy-chooser",
    "fy-payment",
    "fy-filling",
    "fy-verify",
    "fy-recover",
  ];
  screens.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  // Remove any existing form (in case user clicks again)
  const existing = document.getElementById("fy-userform-screen");
  if (existing) existing.remove();

  // Render the form
  getUserData().then((data) => {
    const panel = document.getElementById("formyaar-panel");
    if (!panel) return;

    const wrapper = document.createElement("div");
    wrapper.id = "fy-userform-screen";
    wrapper.className = "fy-screen";
    wrapper.style.cssText =
      "display:flex;flex-direction:column;height:100%;animation:fy-fadeIn 0.2s ease;";
    wrapper.innerHTML = renderUserFormScreen(form, data);
    panel.appendChild(wrapper);

    attachUserFormHandlers(
      form,
      // onSubmit: data is saved, now go to payment
      () => {
        wrapper.remove();
        document.getElementById("fy-payment")!.style.display = "flex";
      },
      // onBack: return to the chooser the user came in through, so backing out
      // of the wizard lands on the application list rather than skipping past
      // it to the home screen.
      () => {
        wrapper.remove();
        document.getElementById("fy-chooser")!.style.display = "flex";
      },
    );

    // Open panel if collapsed
    panel.style.right = "0px";
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
  const panes = Array.from(
    document.querySelectorAll<HTMLElement>(".fy-userform .fy-pane"),
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
  const pinPaneIdx = pinInputEl
    ? Number(pinInputEl.closest<HTMLElement>(".fy-pane")?.dataset.pane ?? -1)
    : -1;
  let aoOk = !aoGated;

  const updateNavState = () => {
    if (next) next.disabled = aoGated && paneIdx === pinPaneIdx && !aoOk;
    if (submit) submit.disabled = !aoOk;
  };

  const showPane = (i: number) => {
    paneIdx = Math.max(0, Math.min(panes.length - 1, i));
    panes.forEach((p, idx) => p.classList.toggle("on", idx === paneIdx));
    if (bar) bar.style.width = `${((paneIdx + 1) / panes.length) * 100}%`;
    const isLast = paneIdx === panes.length - 1;
    if (next) next.style.display = isLast ? "none" : "flex";
    if (submit) submit.style.display = isLast ? "flex" : "none";
    if (bodyEl) bodyEl.scrollTop = 0;
    updateNavState();
  };

  updateNavState();

  next?.addEventListener("click", () => showPane(paneIdx + 1));
  back?.addEventListener("click", () => {
    if (paneIdx > 0) showPane(paneIdx - 1);
    else onBack();
  });

  const jumpToField = (field: HTMLElement) => {
    const pane = field.closest<HTMLElement>(".fy-pane");
    if (pane) showPane(Number(pane.dataset.pane ?? 0));
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
          setAO(
            false,
            `<span style="color:#d43c33;font-weight:600;">✗ PIN code not recognised — please double-check it</span>`,
          );
          return;
        }
        const { ao_code } = await res.json();
        if (ao_code) {
          setAO(
            true,
            `<span style="color:#157347;font-weight:600;">✓ AO code available for your area</span>`,
          );
        } else {
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
    pinInput.addEventListener("input", () => {
      const pin = pinInput.value.replace(/\D/g, "");
      if (aoCheckTimer) clearTimeout(aoCheckTimer);
      aoCheckTimer = setTimeout(() => checkAO(pin), 600);
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

  return {
    first_name: get("first_name").toUpperCase(),
    middle_name: get("middle_name").toUpperCase(),
    last_name: get("last_name").toUpperCase(),
    date_of_birth: get("date_of_birth"),
    email: get("email"),
    mobile: get("mobile"),
    aadhaar_last_4: get("aadhaar_last_4").replace(/\D/g, "").slice(0, 4),
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
