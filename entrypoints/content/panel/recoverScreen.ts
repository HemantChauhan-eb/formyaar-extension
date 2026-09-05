import { BACKEND_URL, SESSION_RECOVERY_DAYS, SUPPORT, formatPhone } from "../constants";
import { setActiveSession } from "../userData";
import { refreshPendingSessions } from "./homeScreen";
import { renderHeader } from "./shared";
import { setView } from "./router";

export function renderRecoverScreen(): string {
  return `
    <div id="fy-recover" class="fy-screen" style="display:none;flex-direction:column;height:100%;background:var(--fy-bg);">
      ${renderHeader({
        subtitle: "Recover session",
        leftHtml: `
          <button class="fy-hdr-back" id="fy-recover-back" aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>`,
      })}
      <div style="flex:1;overflow-y:auto;padding:40px 26px 24px;">
        <div style="text-align:center;margin-bottom:26px;">
          <div style="font-size:19px;font-weight:800;color:var(--fy-ink);letter-spacing:-0.4px;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">Already paid?</div>
          <div style="font-size:12.5px;color:var(--fy-muted);margin-top:8px;line-height:1.6;max-width:260px;margin-left:auto;margin-right:auto;">Enter the mobile number you used while paying and we'll restore your session.</div>
        </div>

        <div style="max-width:290px;margin:0 auto;display:flex;flex-direction:column;gap:10px;">
          <input
            id="fy-recover-mobile"
            type="text"
            inputmode="numeric"
            maxlength="10"
            placeholder="10-digit mobile number"
            style="width:100%;padding:14px;border:1.5px solid transparent;border-radius:11px;font-size:16px;font-weight:700;letter-spacing:2px;color:var(--fy-ink);text-align:center;outline:none;background:var(--fy-field);box-sizing:border-box;transition:border-color 0.15s,background 0.15s;"
            onfocus="this.style.borderColor='#305eff';this.style.background='#fff';"
            onblur="this.style.borderColor='transparent';this.style.background='#f3f5f9';"
          />
          <button id="fy-recover-submit" class="fy-btn fy-btn-primary fy-btn-block">
            Recover my session
          </button>
          <div id="fy-recover-error" style="display:none;font-size:12px;color:var(--fy-danger);text-align:center;line-height:1.5;margin-top:2px;"></div>
        </div>

        <div style="margin-top:22px;text-align:center;font-size:10.5px;color:var(--fy-faint);line-height:1.6;">
          Sessions stay recoverable for ${SESSION_RECOVERY_DAYS} days after payment.
        </div>

        <!-- The way out when the automatic path fails.
             Someone on this screen has already paid, and the number they typed
             did not bring their session back — so pointing them at a generic
             "contact us" page is asking a worried person to go and explain
             themselves from scratch. This tells them exactly what to say, so
             the first message we get already contains the number that paid and
             what went wrong. -->
        <div style="margin-top:20px;padding-top:18px;border-top:1px solid var(--fy-line);max-width:290px;margin-left:auto;margin-right:auto;">
          <div style="font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:var(--fy-muted);margin-bottom:9px;text-align:center;">
            Didn't work? Talk to us
          </div>
          <div style="font-size:12px;color:var(--fy-body);line-height:1.6;margin-bottom:13px;text-align:center;">
            Tell us: <strong style="color:var(--fy-ink);">"I've paid but couldn't finish my application — I want to resume."</strong>
            Include the mobile number you paid with. We'll get you back in.
          </div>
          <!-- WhatsApp first, on both numbers: it works at any hour, carries
               the pre-written message, and leaves a thread we can pick up
               later. Calling is offered under it with the hours stated, so
               nobody rings a phone at 11pm expecting an answer. -->
          <div style="display:flex;flex-direction:column;gap:7px;">
            ${SUPPORT.phones
              .map(
                (phone) => `
              <a href="https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                "I've paid but couldn't finish my application — I want to resume. The mobile number I paid with is ",
              )}" target="_blank" class="fy-btn fy-btn-ghost fy-btn-block" style="text-decoration:none;font-size:12.5px;padding:11px;gap:7px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.16c-.25.69-1.24 1.26-1.79 1.32-.46.05-1.04.07-1.68-.11-.39-.12-.88-.29-1.52-.56-2.67-1.15-4.42-3.84-4.55-4.02-.13-.18-1.09-1.45-1.09-2.77s.69-1.97.94-2.24c.25-.27.54-.34.72-.34.18 0 .36 0 .52.01.17.01.39-.06.61.47.23.55.77 1.9.84 2.04.07.14.11.3.02.48-.09.18-.14.29-.27.45-.14.16-.29.35-.41.47-.14.14-.28.28-.12.55.16.27.71 1.17 1.52 1.9 1.04.93 1.92 1.21 2.19 1.35.27.14.43.11.59-.07.16-.18.68-.79.86-1.07.18-.27.36-.23.61-.14.25.09 1.6.75 1.87.89.27.14.46.2.52.32.07.11.07.64-.18 1.33z"/></svg>
                WhatsApp ${formatPhone(phone)}
              </a>`,
              )
              .join("")}

            <div style="display:flex;gap:7px;margin-top:3px;">
              ${SUPPORT.phones
                .map(
                  (phone) => `
                <a href="tel:${phone}" class="fy-btn fy-btn-ghost" style="flex:1;text-decoration:none;font-size:11.5px;padding:9px;gap:5px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8.1 9.6a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2z"/></svg>
                  Call
                </a>`,
                )
                .join("")}
            </div>
            <div style="font-size:10.5px;color:var(--fy-faint);text-align:center;">
              Calls: ${SUPPORT.callHours}
            </div>

            <a href="mailto:${SUPPORT.email}?subject=${encodeURIComponent(
              "Paid but couldn't finish my application",
            )}&body=${encodeURIComponent(
              "I've paid but couldn't finish my application — I want to resume.\n\nThe mobile number I paid with: \n",
            )}" style="font-size:11.5px;color:var(--fy-muted);text-decoration:none;text-align:center;font-weight:600;margin-top:4px;">
              ${SUPPORT.email}
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function attachRecoverScreenHandlers() {
  document.getElementById("fy-recover-back")?.addEventListener("click", () => {
    setView("home");
  });

  document
    .getElementById("fy-recover-submit")
    ?.addEventListener("click", async () => {
      const input = document.getElementById(
        "fy-recover-mobile",
      ) as HTMLInputElement;
      const errorEl = document.getElementById(
        "fy-recover-error",
      ) as HTMLDivElement;
      const btn = document.getElementById(
        "fy-recover-submit",
      ) as HTMLButtonElement;

      const mobile = input.value.replace(/\D/g, "");
      if (!mobile || mobile.length !== 10) {
        errorEl.style.display = "block";
        errorEl.textContent = "Enter a valid 10-digit mobile number.";
        return;
      }

      btn.textContent = "Looking up…";
      btn.disabled = true;
      errorEl.style.display = "none";

      try {
        const res = await fetch(`${BACKEND_URL}/payment/resume/${mobile}`);
        if (!res.ok) {
          errorEl.style.display = "block";
          errorEl.textContent =
            `No active session found for this number. Sessions stay recoverable for ${SESSION_RECOVERY_DAYS} days after payment.`;
          btn.textContent = "Recover my session";
          btn.disabled = false;
          return;
        }

        const session = await res.json();

        await setActiveSession({
          form: session.form_type,
          order_id: session.order_id,
          paid_at: new Date(session.created_at).getTime(),
          completed: false,
        });

        setView("home");
        refreshPendingSessions();
      } catch {
        errorEl.style.display = "block";
        errorEl.textContent = "Network error. Please check your connection.";
      } finally {
        // Always put the button back, including on the success path.
        //
        // It used to be reset only on the two failure branches, because
        // success navigates away and the button is off-screen — but the screen
        // is not destroyed, it is hidden. Coming back to it a second time
        // found the button still reading "Looking up…" and still disabled,
        // with no way to try again short of reloading the page. The one path
        // nobody thought to reset was the one people hit twice.
        btn.textContent = "Recover my session";
        btn.disabled = false;
      }
    });
}
