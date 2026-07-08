import { BACKEND_URL } from "../constants";
import { getUserData, saveUserData, validateUserData, type UserData } from "../userData";
import { escapeHtml } from "./shared";

export const USERFORM_STYLES = `
      /* ===== User data collection form ===== */
.fy-userform {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}
.fy-userform-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #e5e7eb;
}
.fy-userform-back {
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #475569;
  flex-shrink: 0;
}
.fy-userform-back:hover { background: #f8fafc; }
.fy-userform-title {
  font-size: 16px;
  font-weight: 600;
  color: #111;
  line-height: 1.3;
}
.fy-userform-subtitle {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
  line-height: 1.4;
}
.fy-userform-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}
.fy-userform-section {
  margin-bottom: 24px;
}
.fy-userform-section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #94a3b8;
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f1f5f9;
}
.fy-userform-field {
  display: block;
  margin-bottom: 14px;
}
.fy-userform-field > span {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  margin-bottom: 6px;
}
.fy-userform-field em {
  color: #ef4444;
  font-style: normal;
  margin-left: 2px;
}
.fy-userform-field input[type="text"],
.fy-userform-field input[type="email"],
.fy-userform-field input[type="tel"] {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: #0f172a;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}
.fy-userform-field input:focus {
  outline: none;
  border-color: #1e3a8a;
  box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.1);
}
.fy-userform-field input.fy-error {
  border-color: #ef4444;
}
.fy-userform-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}
.fy-userform-row .fy-userform-field {
  margin-bottom: 0;
}
.fy-userform-radios {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.fy-userform-radio {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #334155;
  transition: all 0.15s;
}
.fy-userform-radio:has(input:checked) {
  border-color: #1e3a8a;
  background: #eff6ff;
  color: #1e3a8a;
  font-weight: 500;
}
.fy-userform-radio input {
  margin: 0;
  accent-color: #1e3a8a;
}
.fy-userform-hint {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
}
.fy-userform-errors {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 10px 12px;
  margin-top: 8px;
  font-size: 12px;
  color: #991b1b;
}
.fy-userform-errors ul {
  margin: 0;
  padding-left: 18px;
}
.fy-userform-errors li { margin-bottom: 2px; }
.fy-userform-footer {
  padding: 14px 20px 18px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
}
.fy-userform-submit {
  width: 100%;
  padding: 12px;
  background: #1e3a8a;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.fy-userform-submit:hover { background: #1e40af; }
.fy-userform-submit:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}
.fy-userform-privacy {
  text-align: center;
  font-size: 11px;
  color: #94a3b8;
  margin-top: 8px;
}
`;

export function renderUserFormScreen(form: string, data: UserData): string {
  const formLabel = form === "pan_card" ? "PAN Card" : form;

  return `
    <div class="fy-userform">
      <div class="fy-userform-header">
        <button class="fy-userform-back" id="fy-userform-back" aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <div class="fy-userform-title">Your details for ${formLabel}</div>
          <div class="fy-userform-subtitle">We'll use this to auto-fill the form. Saved locally on your device.</div>
        </div>
      </div>

      <div class="fy-userform-body">
        <div class="fy-userform-section">
          <div class="fy-userform-section-title">About you</div>

          <div class="fy-userform-row">
            <label class="fy-userform-field">
              <span>First name <em>*</em></span>
              <input type="text" data-field="first_name" value="${escapeHtml(data.first_name)}" placeholder="HEMANT" autocomplete="off">
            </label>
            <label class="fy-userform-field">
              <span>Middle name</span>
              <input type="text" data-field="middle_name" value="${escapeHtml(data.middle_name)}" placeholder="(optional)" autocomplete="off">
            </label>
          </div>

          <label class="fy-userform-field">
            <span>Last name <em>*</em></span>
            <input type="text" data-field="last_name" value="${escapeHtml(data.last_name)}" placeholder="CHAUHAN" autocomplete="off">
          </label>

          <label class="fy-userform-field">
            <span>Date of birth <em>*</em></span>
            <input type="text" data-field="date_of_birth" value="${escapeHtml(data.date_of_birth)}" placeholder="DD/MM/YYYY" autocomplete="off" inputmode="numeric">
          </label>

          <label class="fy-userform-field">
            <span>Gender <em>*</em></span>
            <div class="fy-userform-radios">
              <label class="fy-userform-radio">
                <input type="radio" name="gender" data-field="gender" value="M" ${data.gender === "M" ? "checked" : ""}>
                <span>Male</span>
              </label>
              <label class="fy-userform-radio">
                <input type="radio" name="gender" data-field="gender" value="F" ${data.gender === "F" ? "checked" : ""}>
                <span>Female</span>
              </label>
              <label class="fy-userform-radio">
                <input type="radio" name="gender" data-field="gender" value="T" ${data.gender === "T" ? "checked" : ""}>
                <span>Transgender</span>
              </label>
            </div>
          </label>

          <label class="fy-userform-field">
            <span>Email <em>*</em></span>
            <input type="email" data-field="email" value="${escapeHtml(data.email)}" placeholder="you@example.com" autocomplete="off">
          </label>

          <label class="fy-userform-field">
            <span>Mobile number <em>*</em></span>
            <input type="tel" data-field="mobile" value="${escapeHtml(data.mobile)}" placeholder="9876543210" autocomplete="off" inputmode="numeric" maxlength="10">
          </label>
          <label class="fy-userform-field">
            <span>Source of income <em>*</em></span>
            <div class="fy-userform-radios" style="flex-direction:column;gap:6px;">
              <label class="fy-userform-radio">
                <input type="radio" name="income_source" data-field="income_source" value="salary" ${data.income_source === "salary" ? "checked" : ""}>
                <span>Salary</span>
              </label>
              <label class="fy-userform-radio">
                <input type="radio" name="income_source" data-field="income_source" value="business" ${data.income_source === "business" ? "checked" : ""}>
                <span>Business / Profession</span>
              </label>
              <label class="fy-userform-radio">
                <input type="radio" name="income_source" data-field="income_source" value="house_property" ${data.income_source === "house_property" ? "checked" : ""}>
                <span>House property</span>
              </label>
              <label class="fy-userform-radio">
                <input type="radio" name="income_source" data-field="income_source" value="other_sources" ${data.income_source === "other_sources" ? "checked" : ""}>
                <span>Other sources</span>
              </label>
              <label class="fy-userform-radio">
                <input type="radio" name="income_source" data-field="income_source" value="capital_gains" ${data.income_source === "capital_gains" ? "checked" : ""}>
                <span>Capital gains</span>
              </label>
              <label class="fy-userform-radio">
                <input type="radio" name="income_source" data-field="income_source" value="no_income" ${data.income_source === "no_income" ? "checked" : ""}>
                <span>No income</span>
              </label>
            </div>
          </label>
        </div>

        <div class="fy-userform-section">
          <div class="fy-userform-section-title">Aadhaar</div>

       <label class="fy-userform-field">
            <span>Last 4 digits of Aadhaar <em>*</em></span>
            <input type="text" data-field="aadhaar_last_4" value="${escapeHtml(data.aadhaar_last_4 ?? "")}" placeholder="9012" autocomplete="off" inputmode="numeric" maxlength="4">
            <small class="fy-userform-hint">Last 4 digits of your Aadhaar card</small>
          </label>

          <label class="fy-userform-field">
            <span>PIN code as per Aadhaar <em>*</em></span>
            <input type="text" data-field="aadhaar_pin_code" value="${escapeHtml(data.aadhaar_pin_code)}" placeholder="243001" autocomplete="off" inputmode="numeric" maxlength="6">
            <div id="fy-ao-status" style="margin-top:6px;font-size:12px;min-height:18px;"></div>
          </label>
        </div>

        <div class="fy-userform-section">
          <div class="fy-userform-section-title">Family</div>

        <div class="fy-userform-row">
            <label class="fy-userform-field">
              <span>Father's first name <em>*</em></span>
              <input type="text" data-field="father_first_name" value="${escapeHtml(data.father_first_name)}" placeholder="RAMESH" autocomplete="off">
            </label>
            <label class="fy-userform-field">
              <span>Middle</span>
              <input type="text" data-field="father_middle_name" value="${escapeHtml(data.father_middle_name)}" placeholder="(optional)" autocomplete="off">
            </label>
          </div>

          <label class="fy-userform-field">
            <span>Father's last name</span>
            <input type="text" data-field="father_last_name" value="${escapeHtml(data.father_last_name)}" placeholder="(optional)" autocomplete="off">
          </label>
          <div class="fy-userform-row">
            <label class="fy-userform-field">
              <span>Mother's first name <em>*</em></span>
              <input type="text" data-field="mother_first_name" value="${escapeHtml(data.mother_first_name)}" placeholder="RADHA" autocomplete="off">
            </label>
            <label class="fy-userform-field">
              <span>Middle</span>
              <input type="text" data-field="mother_middle_name" value="${escapeHtml(data.mother_middle_name)}" placeholder="(optional)" autocomplete="off">
            </label>
          </div>

          <label class="fy-userform-field">
            <span>Mother's last name</span>
            <input type="text" data-field="mother_last_name" value="${escapeHtml(data.mother_last_name)}" placeholder="(optional)" autocomplete="off">
          </label>

          <label class="fy-userform-field">
            <span>Single parent?</span>
            <div class="fy-userform-radios">
              <label class="fy-userform-radio">
                <input type="radio" name="is_single_parent" data-field="is_single_parent" value="false" ${!data.is_single_parent ? "checked" : ""}>
                <span>No — both parents</span>
              </label>
              <label class="fy-userform-radio">
                <input type="radio" name="is_single_parent" data-field="is_single_parent" value="true" ${data.is_single_parent ? "checked" : ""}>
                <span>Yes — single parent</span>
              </label>
            </div>
          </label>

          <label class="fy-userform-field">
            <span>Whose name to print on PAN card? <em>*</em></span>
            <div class="fy-userform-radios">
              <label class="fy-userform-radio">
                <input type="radio" name="parent_on_card" data-field="parent_on_card" value="father" ${data.parent_on_card_is_father ? "checked" : ""}>
                <span>Father's name</span>
              </label>
              <label class="fy-userform-radio">
                <input type="radio" name="parent_on_card" data-field="parent_on_card" value="mother" ${data.parent_on_card_is_mother ? "checked" : ""}>
                <span>Mother's name</span>
              </label>
            </div>
          </label>
        </div>

        <div class="fy-userform-section">
          <div class="fy-userform-section-title">Verification</div>

          <label class="fy-userform-field">
            <span>Place (district) <em>*</em></span>
            <input type="text" data-field="place" value="${escapeHtml(data.place)}" placeholder="BAREILLY" autocomplete="off">
            <small class="fy-userform-hint">The city where you're filing this application</small>
          </label>

          <label class="fy-userform-field">
            <span>Proof of date of birth <em>*</em></span>
            <select data-field="proof_of_dob" style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit;color:#0f172a;background:#fff;">
              <option value="">-- Select --</option>
              <option value="Birth Certificate issued by the Municipal Authority or any office authorized to issue Birth and Death Certificate by the Registrar of Birth and Death of the Indian Consulate" ${data.proof_of_dob === "Birth Certificate issued by the Municipal Authority or any office authorized to issue Birth and Death Certificate by the Registrar of Birth and Death of the Indian Consulate" ? "selected" : ""}>Birth Certificate</option>
              <option value="Matriculation certificate" ${data.proof_of_dob === "Matriculation certificate" ? "selected" : ""}>Matriculation Certificate</option>
              <option value="Matriculation Marksheet of recognised board" ${data.proof_of_dob === "Matriculation Marksheet of recognised board" ? "selected" : ""}>Matriculation Marksheet</option>
              <option value="Driving License" ${data.proof_of_dob === "Driving License" ? "selected" : ""}>Driving License</option>
              <option value="Passport" ${data.proof_of_dob === "Passport" ? "selected" : ""}>Passport</option>
              <option value="Elector's photo identity card" ${data.proof_of_dob === "Elector's photo identity card" ? "selected" : ""}>Voter ID</option>
              <option value="Pension payment order" ${data.proof_of_dob === "Pension payment order" ? "selected" : ""}>Pension Payment Order</option>
            </select>
          </label>
        </div>

        <div class="fy-userform-section">
          <div class="fy-userform-section-title">Additional Details</div>

          <label class="fy-userform-field">
            <span>Are you a defence personnel?</span>
            <div class="fy-userform-radios">
              <label class="fy-userform-radio">
                <input type="radio" name="is_defence" data-field="is_defence" value="false" ${!data.is_defence ? "checked" : ""}>
                <span>No</span>
              </label>
              <label class="fy-userform-radio">
                <input type="radio" name="is_defence" data-field="is_defence" value="true" ${data.is_defence ? "checked" : ""}>
                <span>Yes</span>
              </label>
            </div>
          </label>

          ${
            data.is_defence
              ? `
          <label class="fy-userform-field">
            <span>Defence branch</span>
            <div class="fy-userform-radios">
              <label class="fy-userform-radio">
                <input type="radio" name="defence_branch" data-field="defence_branch" value="army" ${data.defence_branch === "army" ? "checked" : ""}>
                <span>Army</span>
              </label>
              <label class="fy-userform-radio">
                <input type="radio" name="defence_branch" data-field="defence_branch" value="air_force" ${data.defence_branch === "air_force" ? "checked" : ""}>
                <span>Air Force</span>
              </label>
            </div>
          </label>
          `
              : ""
          }

          <label class="fy-userform-field">
            <span>Passport number</span>
            <input type="text" data-field="passport_number" value="${escapeHtml(data.passport_number)}" placeholder="(optional)" autocomplete="off">
          </label>

          <label class="fy-userform-field">
            <span>TIN number</span>
            <input type="text" data-field="tin_number" value="${escapeHtml(data.tin_number)}" placeholder="(optional)" autocomplete="off">
          </label>
        </div>

        <div class="fy-userform-errors" id="fy-userform-errors" hidden></div>
      </div>

      <div class="fy-userform-footer">
        <button class="fy-userform-submit" id="fy-userform-submit">
          Continue to Pay ₹29
        </button>
        <div class="fy-userform-privacy">🔒 Saved on your device. Never sent to our servers.</div>
      </div>
    </div>
  `;
}

export function showUserForm(form: string): void {
  // Hide all other screens
  const screens = [
    "fy-home",
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
      // onBack: go back to home
      () => {
        wrapper.remove();
        document.getElementById("fy-home")!.style.display = "flex";
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
  const submit = document.getElementById("fy-userform-submit");
  const errorBox = document.getElementById("fy-userform-errors");

  if (back) back.addEventListener("click", onBack);

  // Live AO code availability check — fires when user finishes typing PIN
  const pinInput = document.querySelector<HTMLInputElement>(
    '[data-field="aadhaar_pin_code"]',
  );
  const aoStatus = document.getElementById("fy-ao-status");
  const submitBtn = document.getElementById(
    "fy-userform-submit",
  ) as HTMLButtonElement | null;
  let aoCheckTimer: ReturnType<typeof setTimeout> | null = null;

  const setSubmitEnabled = (enabled: boolean) => {
    if (!submitBtn) return;
    submitBtn.disabled = !enabled;
    submitBtn.style.opacity = enabled ? "1" : "0.45";
    submitBtn.style.cursor = enabled ? "pointer" : "not-allowed";
  };

  if (pinInput && aoStatus) {
    const checkAO = async (pin: string) => {
      if (pin.length !== 6) {
        aoStatus.innerHTML = "";
        setSubmitEnabled(true);
        return;
      }
      aoStatus.innerHTML = `<span style="color:#94a3b8;">Checking AO code availability…</span>`;
      setSubmitEnabled(false); // disable while checking
      try {
        const res = await fetch(`${BACKEND_URL}/pincode/${pin}`);
        if (!res.ok) {
          aoStatus.innerHTML = `<span style="color:#e74c3c;font-weight:600;">✗ PIN code not recognised — please double-check it</span>`;
          setSubmitEnabled(false); // keep disabled — invalid pincode
          return;
        }
        const { ao_code } = await res.json();
        if (ao_code) {
          aoStatus.innerHTML = `<span style="color:#1d9e75;font-weight:600;">✓ AO code available for your area</span>`;
        } else {
          aoStatus.innerHTML = `<span style="color:#e67e22;font-weight:600;">⚠ AO code not available yet — you'll need to select it manually on the NSDL form</span>`;
        }
        setSubmitEnabled(true);
      } catch {
        aoStatus.innerHTML = `<span style="color:#94a3b8;">Could not check — please continue</span>`;
        setSubmitEnabled(true); // network error — let them proceed
      }
    };
    pinInput.addEventListener("input", () => {
      const pin = pinInput.value.replace(/\D/g, "");
      if (aoCheckTimer) clearTimeout(aoCheckTimer);
      aoCheckTimer = setTimeout(() => checkAO(pin), 600);
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

  const dobInput = document.querySelector<HTMLInputElement>(
    '[data-field="date_of_birth"]',
  );
  if (dobInput) {
    dobInput.addEventListener("input", (e) => {
      const input = e.target as HTMLInputElement;
      const isDeleting = (e as InputEvent).inputType?.startsWith("delete");
      let digits = input.value.replace(/\D/g, "");

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

      input.value = formatted;
    });
  }

  if (submit) {
    submit.addEventListener("click", async () => {
      const data = collectFormData();
      const errors = validateUserData(data);

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
        // Highlight first error field and scroll to it
        const firstError = errors[0];
        const firstField = document.querySelector(
          `[data-field="${firstError.field}"]`,
        ) as HTMLElement | null;
        if (firstField) {
          firstField.classList.add("fy-error");
          firstField.scrollIntoView({ behavior: "smooth", block: "center" });
          firstField.focus();
        }
        return;
      }

      if (errorBox) errorBox.hidden = true;

      // Confirmation modal before payment
      const aoStatusEl = document.getElementById("fy-ao-status");
      const aoStatusHTML = aoStatusEl?.innerHTML?.trim() ?? "";
      // AO is available if the text contains the green checkmark — no modal needed
      const aoAvailable = aoStatusEl?.textContent?.includes("✓") ?? false;

      if (aoAvailable) {
        await saveUserData(data);
        onSubmit();
        return;
      }

      const aoLine = aoStatusHTML
        ? `<div style="background:#fff8eb;border:1px solid #f5d27a;border-radius:10px;padding:10px 13px;margin-bottom:14px;font-size:12.5px;">${aoStatusHTML}</div>`
        : "";

      const modal = document.createElement("div");
      modal.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999999;
        display:flex;align-items:center;justify-content:center;padding:24px;
      `;
      modal.innerHTML = `
        <div style="background:#fff;border-radius:16px;padding:24px;max-width:320px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
          <div style="font-size:18px;font-weight:800;color:#0a0a2e;margin-bottom:6px;">Confirm payment</div>
          <div style="font-size:13px;color:#64748b;margin-bottom:16px;line-height:1.6;">
            You're about to pay <strong style="color:#0a0a2e;">₹29</strong> to auto-fill your PAN card application.
          </div>
          ${aoLine}
          <div style="display:flex;gap:8px;">
            <button id="fy-modal-cancel" style="flex:1;padding:11px;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">Cancel</button>
            <button id="fy-modal-confirm" style="flex:2;padding:11px;background:#000080;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;">Pay ₹29 →</button>
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

function collectFormData(): UserData {
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
    income_source: getRadio("income_source") as UserData["income_source"],
  };
}
