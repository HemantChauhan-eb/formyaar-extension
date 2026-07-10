import { BACKEND_URL } from "../constants";
import { setActiveSession } from "../userData";
import { refreshPendingSessions } from "./homeScreen";
import { renderHeader } from "./shared";

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
          Sessions stay recoverable for 48 hours after payment.<br/>
          Stuck? <a href="https://formyaar.in/contact" target="_blank" style="color:var(--fy-muted);font-weight:600;">Message us</a> — a real person will help.
        </div>
      </div>
    </div>
  `;
}

export function attachRecoverScreenHandlers() {
  document.getElementById("fy-recover-back")?.addEventListener("click", () => {
    document.getElementById("fy-recover")!.style.display = "none";
    document.getElementById("fy-home")!.style.display = "flex";
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
            "No active session found for this number. Sessions expire after 48 hours.";
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

        document.getElementById("fy-recover")!.style.display = "none";
        document.getElementById("fy-home")!.style.display = "flex";
        refreshPendingSessions();
      } catch {
        errorEl.style.display = "block";
        errorEl.textContent = "Network error. Please check your connection.";
        btn.textContent = "Recover my session";
        btn.disabled = false;
      }
    });
}
