import { BACKEND_URL } from "../../constants";
import { getOperatorSession, getOperatorAuthHeaders } from "../../supabase";
import {
  runAutofillFromSubmission,
  prepareOperatorSubmission,
} from "../../autofill";
import { escapeHtml } from "../shared";
import { addInProgressSubmission } from "./queueScreen";

export function renderOperatorReviewScreen(): string {
  return `
    <div id="fy-operator-review" class="fy-screen" style="display:none;flex-direction:column;height:100%;background:var(--fy-bg-alt);">
      <div class="fy-hdr">
        <button class="fy-hdr-back" id="fy-review-back" aria-label="Back to queue">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div class="fy-hdr-brand">
          <span class="fy-brandmark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5l4 4L8 20l-4.6 1 1-4.6z"/><path d="M12.5 7.5l4 4"/></svg></span>
          <div>
            <div class="fy-hdr-name">Review form</div>
            <div class="fy-hdr-sub">Check details before filling</div>
          </div>
        </div>
        <button class="fy-hdr-back" id="fy-review-edit" title="Edit details" aria-label="Edit details">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      </div>
      <div class="fy-accentbar"></div>

      <div id="fy-review-body" style="flex:1;overflow-y:auto;padding:14px;">
        <!-- Populated dynamically -->
      </div>

      <div id="fy-review-footer" style="padding:12px 14px;border-top:1px solid var(--fy-line);background:var(--fy-bg);display:flex;gap:8px;flex-shrink:0;">
        <!-- populated by showReviewScreen -->
      </div>
    </div>
  `;
}

const INPUT_STYLE =
  "width:100%;padding:8px 11px;border:1px solid #e6e9f1;border-radius:9px;font-size:13px;font-family:inherit;color:#0c1322;background:#fff;box-sizing:border-box;";
const SELECT_STYLE = INPUT_STYLE + "cursor:pointer;";

function renderEditForm(sub: any): string {
  const inp = (field: string, value: unknown, type = "text", extra = "") =>
    `<input data-edit="${field}" type="${type}" value="${escapeHtml(value)}" style="${INPUT_STYLE}" ${extra}>`;

  const sel = (field: string, current: unknown, options: [string, string][]) =>
    `<select data-edit="${field}" style="${SELECT_STYLE}">${options
      .map(
        ([v, l]) =>
          `<option value="${v}"${String(current) === v ? " selected" : ""}>${l}</option>`,
      )
      .join("")}</select>`;

  const editRow = (label: string, inputHtml: string) => `
    <div style="padding:8px 0;border-bottom:1px solid #eef0f5;">
      <div style="font-size:11px;color:#6c7689;font-weight:600;margin-bottom:5px;">${label}</div>
      ${inputHtml}
    </div>`;

  const editSection = (title: string, content: string) => `
    <div class="fy-kv-section">${title}</div>
    <div class="fy-kv-card" style="padding:4px 12px;">${content}</div>
  `;

  return `
    ${editSection(
      "Applicant",
      `
      ${editRow("First Name", inp("first_name", sub.first_name))}
      ${editRow("Middle Name", inp("middle_name", sub.middle_name))}
      ${editRow("Last Name", inp("last_name", sub.last_name))}
      ${editRow(
        "Gender",
        sel("gender", sub.gender, [
          ["male", "Male"],
          ["female", "Female"],
          ["transgender", "Transgender"],
        ]),
      )}
      ${editRow("Date of Birth", inp("dob", sub.dob))}
      ${editRow("Aadhaar Last 4", inp("aadhaar_last_4", sub.aadhaar_last_4, "text", 'maxlength="4" inputmode="numeric"'))}
      ${editRow(
        "Single Parent",
        sel("is_single_parent", String(sub.is_single_parent), [
          ["false", "No"],
          ["true", "Yes"],
        ]),
      )}
      ${editRow(
        "Parent on Card",
        sel("name_to_print", sub.name_to_print, [
          ["father", "Father's Name"],
          ["mother", "Mother's Name"],
        ]),
      )}
    `,
    )}
    ${editSection(
      "Contact",
      `
      ${editRow("Mobile", inp("mobile", sub.mobile, "tel"))}
      ${editRow("Email", inp("email", sub.email, "email"))}
    `,
    )}
    ${editSection(
      "Address",
      `
      ${editRow("City", inp("city", sub.city))}
      ${editRow("State", inp("state", sub.state))}
      ${editRow("PIN Code", inp("pincode", sub.pincode, "text", 'maxlength="6" inputmode="numeric"'))}
    `,
    )}
    ${editSection(
      "Father",
      `
      ${editRow("First Name", inp("father_first_name", sub.father_first_name))}
      ${editRow("Middle Name", inp("father_middle_name", sub.father_middle_name))}
      ${editRow("Last Name", inp("father_last_name", sub.father_last_name))}
    `,
    )}
    ${editSection(
      "Mother",
      `
      ${editRow("First Name", inp("mother_first_name", sub.mother_first_name))}
      ${editRow("Middle Name", inp("mother_middle_name", sub.mother_middle_name))}
      ${editRow("Last Name", inp("mother_last_name", sub.mother_last_name))}
    `,
    )}
    ${editSection(
      "Application",
      `
      ${editRow(
        "Income Source",
        sel("income_source", sub.income_source, [
          ["salary", "Salary"],
          ["business", "Business"],
          ["house_property", "House Property"],
          ["other_sources", "Other Sources"],
          ["capital_gains", "Capital Gains"],
          ["no_income", "No Income"],
        ]),
      )}
      ${editRow(
        "Proof of DOB",
        sel("proof_of_dob", sub.proof_of_dob, [
          [
            "Birth Certificate issued by the Municipal Authority or any office authorized to issue Birth and Death Certificate by the Registrar of Birth and Death of the Indian Consulate",
            "Birth Certificate",
          ],
          ["Matriculation certificate", "Matriculation Certificate"],
          [
            "Matriculation Marksheet of recognised board",
            "Matriculation Marksheet",
          ],
          ["Driving License", "Driving License"],
          ["Passport", "Passport"],
          ["Elector's photo identity card", "Voter ID"],
          ["Pension payment order", "Pension Payment Order"],
        ]),
      )}
      ${editRow(
        "Defence",
        sel("defence", String(sub.defence ?? false), [
          ["false", "No"],
          ["true", "Yes"],
        ]),
      )}
      ${editRow(
        "Defence Branch",
        sel("defence_branch", String(sub.defence_branch ?? ""), [
          ["", "—"],
          ["army", "Army"],
          ["air_force", "Air Force"],
        ]),
      )}
    `,
    )}
  `;
}

export function showReviewScreen(sub: any): void {
  document.getElementById("fy-operator-queue")!.style.display = "none";
  const review = document.getElementById("fy-operator-review")!;
  review.style.display = "flex";

  // Always restore the view-mode footer — edit mode replaces it with
  // Cancel/Save buttons, so re-entering view mode must reset it.
  const footer = document.getElementById("fy-review-footer")!;
  footer.innerHTML = `
    <button id="fy-review-reject" class="fy-btn fy-btn-danger-ghost" style="flex:1;padding:11px;font-size:13px;">Reject</button>
    <button id="fy-review-accept" class="fy-btn fy-btn-primary" style="flex:2;padding:11px;font-size:13px;">Accept &amp; fill →</button>
  `;
  footer.style.display = "flex";
  footer.style.gap = "8px";

  const body = document.getElementById("fy-review-body")!;

  // Escapes the value — customer-supplied data must never be injected as raw HTML
  const row = (label: string, value: unknown) =>
    value
      ? `
    <div class="fy-kv-row">
      <span class="fy-kv-label">${label}</span>
      <span class="fy-kv-value">${escapeHtml(value)}</span>
    </div>
  `
      : "";

  const section = (title: string, content: string) => `
    <div class="fy-kv-section">${title}</div>
    <div class="fy-kv-card">${content}</div>
  `;

  body.innerHTML = `
    <div style="margin-bottom:10px;background:var(--fy-bg);border:1px solid var(--fy-line);border-radius:12px;padding:13px 14px;">
      <div style="font-size:15.5px;font-weight:800;color:var(--fy-ink);letter-spacing:-0.2px;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">${escapeHtml([sub.first_name, sub.middle_name, sub.last_name].filter(Boolean).join(" ") || "Unknown")}</div>
      <div style="font-size:11px;color:var(--fy-muted);margin-top:2px;">${escapeHtml(
        String(sub.form_type ?? "")
          .replace(/_/g, " ")
          .toUpperCase(),
      )}</div>
    </div>

    ${section(
      "Applicant",
      `
      ${row("First Name", sub.first_name)}
      ${row("Middle Name", sub.middle_name)}
      ${row("Last Name", sub.last_name)}
      ${row("Gender", sub.gender)}
      ${row("Date of Birth", sub.dob)}
      ${row("Aadhaar Last 4", sub.aadhaar_last_4)}
      ${row("Single Parent", sub.is_single_parent === true ? "Yes" : sub.is_single_parent === false ? "No" : "")}
      ${row("Parent on Card", sub.name_to_print === "father" ? "Father's Name" : sub.name_to_print === "mother" ? "Mother's Name" : "")}
    `,
    )}

    ${section(
      "Contact",
      `
      ${row("Mobile", sub.mobile)}
      ${row("Email", sub.email)}
    `,
    )}

    ${section(
      "Address",
      `
      ${row("City", sub.city)}
      ${row("State", sub.state)}
      ${row("PIN Code", sub.pincode)}
    `,
    )}

    ${section(
      "Father",
      `
      ${row("First Name", sub.father_first_name)}
      ${row("Middle Name", sub.father_middle_name)}
      ${row("Last Name", sub.father_last_name)}
    `,
    )}

    ${section(
      "Mother",
      `
      ${row("First Name", sub.mother_first_name)}
      ${row("Middle Name", sub.mother_middle_name)}
      ${row("Last Name", sub.mother_last_name)}
    `,
    )}

    ${section(
      "Application",
      `
      ${row(
        "Form Type",
        String(sub.form_type ?? "")
          .replace(/_/g, " ")
          .toUpperCase(),
      )}
      ${row("Income Source", sub.income_source)}
      ${row("Proof of DOB", sub.proof_of_dob)}
      ${row("Defence", sub.defence === true ? "Yes" : "No")}
      ${row(
        "Defence Branch",
        sub.defence_branch
          ? String(sub.defence_branch)
              .replace("_", " ")
              .replace(/\b\w/g, (c: string) => c.toUpperCase())
          : "",
      )}
    `,
    )}
  `;

  // Accept button
  const acceptBtn = document.getElementById("fy-review-accept")!;
  acceptBtn.onclick = async () => {
    const session = await getOperatorSession();
    if (!session) {
      document.getElementById("fy-operator-review")!.style.display = "none";
      document.getElementById("fy-operator-login")!.style.display = "flex";
      return;
    }
    const authHeaders = await getOperatorAuthHeaders();
    await fetch(`${BACKEND_URL}/operator/submission/${sub.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ status: "filling" }),
    });
    await browser.storage.session.set({
      autofillActive: { form: sub.form_type, submission_id: sub.id, done: [] },
    });
    await addInProgressSubmission(session.id, sub);
    if (window.location.hostname === "onlineservices.proteantech.in") {
      document.getElementById("fy-operator-review")!.style.display = "none";
      runAutofillFromSubmission(sub);
    } else {
      await prepareOperatorSubmission(sub);
      window.open(
        "https://onlineservices.proteantech.in/paam/endUserRegisterContact.html",
        "_blank",
      );
    }
  };

  // Reject button — confirms then permanently deletes the submission
  const rejectBtn = document.getElementById("fy-review-reject")!;
  rejectBtn.onclick = async () => {
    const name = escapeHtml(
      [sub.first_name, sub.last_name].filter(Boolean).join(" ") ||
        "this submission",
    );
    const confirmed = confirm(
      `Delete ${name}?\n\nThis will permanently remove the submission from the queue and cannot be undone.`,
    );
    if (!confirmed) return;

    rejectBtn.textContent = "Deleting…";
    (rejectBtn as HTMLButtonElement).disabled = true;

    try {
      const authHeaders = await getOperatorAuthHeaders();
      await fetch(`${BACKEND_URL}/operator/submission/${sub.id}`, {
        method: "DELETE",
        headers: { ...authHeaders },
      });
    } catch {
      /* best effort — remove from view regardless */
    }

    document.getElementById("fy-operator-review")!.style.display = "none";
    document.getElementById("fy-operator-queue")!.style.display = "flex";
  };

  // Edit button — toggle edit mode
  let currentSub = { ...sub };
  document.getElementById("fy-review-edit")!.onclick = () => {
    const body = document.getElementById("fy-review-body")!;
    const footer = document.getElementById("fy-review-footer")!;

    body.innerHTML = renderEditForm(currentSub);

    footer.innerHTML = `
      <button id="fy-edit-cancel" class="fy-btn fy-btn-ghost" style="flex:1;padding:11px;font-size:13px;">Cancel</button>
      <button id="fy-edit-save" class="fy-btn fy-btn-primary" style="flex:2;padding:11px;font-size:13px;">Save changes</button>
    `;
    footer.style.display = "flex";
    footer.style.gap = "8px";

    document.getElementById("fy-edit-cancel")!.onclick = () => {
      showReviewScreen(currentSub);
    };

    document.getElementById("fy-edit-save")!.onclick = async () => {
      const updates: Record<string, unknown> = {};
      body
        .querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-edit]")
        .forEach((el) => {
          const field = el.dataset.edit!;
          let value: unknown = el.value;
          if (field === "is_single_parent" || field === "defence")
            value = el.value === "true";
          updates[field] = value;
        });

      if (
        !confirm(
          `Update ${currentSub.first_name ?? "this customer"}'s details? This will overwrite the submission.`,
        )
      )
        return;

      const saveBtn = document.getElementById(
        "fy-edit-save",
      ) as HTMLButtonElement;
      saveBtn.textContent = "Saving…";
      saveBtn.disabled = true;

      try {
        const authHeaders = await getOperatorAuthHeaders();
        const res = await fetch(
          `${BACKEND_URL}/operator/submission/${currentSub.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify(updates),
          },
        );
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          console.error(
            "FormYaar: submission edit failed",
            res.status,
            errBody,
          );
          throw new Error("Failed");
        }
        currentSub = { ...currentSub, ...updates };
        showReviewScreen(currentSub);
      } catch {
        saveBtn.textContent = "Save changes";
        saveBtn.disabled = false;
        alert("Failed to save. Please try again.");
      }
    };
  };
}

export function attachOperatorReviewHandlers() {
  document.getElementById("fy-review-back")?.addEventListener("click", () => {
    document.getElementById("fy-operator-review")!.style.display = "none";
    document.getElementById("fy-operator-queue")!.style.display = "flex";
  });
}
