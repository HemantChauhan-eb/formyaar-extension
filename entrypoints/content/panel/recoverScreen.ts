import { BACKEND_URL } from "../constants";
import { setActiveSession } from "../userData";
import { refreshPendingSessions } from "./homeScreen";

export function renderRecoverScreen(): string {
  return `
    <div id="fy-recover" class="fy-screen" style="display:none;flex-direction:column;height:100%;">
      <div style="position:relative;background:#000080;overflow:hidden;flex-shrink:0;">
        <div style="padding:13px 16px;display:flex;align-items:center;gap:10px;position:relative;z-index:1;">
          <button id="fy-recover-back" style="background:none;border:none;cursor:pointer;color:white;display:flex;align-items:center;padding:4px 0;opacity:0.85;font-family:inherit;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style="flex:1;text-align:center;">
            <div style="font-weight:800;font-size:16px;letter-spacing:-0.5px;color:#ffffff;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
              <span style="font-weight:200;color:rgba(255,255,255,0.7);">Form</span><span style="color:#E8930A;font-weight:800;">·</span><span style="font-weight:800;color:#ffffff;">Yaar</span>
            </div>
          </div>
          <div style="width:24px;"></div>
        </div>
        <div style="height:3px;display:flex;">
          <div style="flex:1;background:#FF9933;"></div>
          <div style="flex:1;background:#ffffff;"></div>
          <div style="flex:1;background:#138808;"></div>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:24px 20px;">
        <div style="text-align:center;margin-bottom:20px;">
          <div style="font-size:28px;margin-bottom:10px;">🔄</div>
          <div style="font-size:16px;font-weight:800;color:#0a0a2e;">Recover your session</div>
          <div style="font-size:12px;color:#50507a;margin-top:6px;line-height:1.5;">Enter the mobile number you used while paying to restore your session.</div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;">
          <input
            id="fy-recover-mobile"
            type="text"
            inputmode="numeric"
            maxlength="10"
            placeholder="10-digit mobile number"
            style="width:100%;padding:13px;border:1.5px solid #e0e0f0;border-radius:10px;font-size:15px;font-family:monospace;font-weight:700;letter-spacing:2px;color:#0a0a2e;text-align:center;outline:none;"
          />
          <button id="fy-recover-submit" style="width:100%;padding:12px;background:#000080;color:white;border:none;border-radius:10px;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit;">
            Recover Session
          </button>
        </div>

        <div id="fy-recover-error" style="display:none;margin-top:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:9px 12px;font-size:12px;color:#991b1b;text-align:center;"></div>
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

      btn.textContent = "Looking up...";
      btn.disabled = true;
      errorEl.style.display = "none";

      try {
        const res = await fetch(`${BACKEND_URL}/payment/resume/${mobile}`);
        if (!res.ok) {
          errorEl.style.display = "block";
          errorEl.textContent =
            "No active session found for this number. Sessions expire after 48 hours.";
          btn.textContent = "Recover Session";
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
        btn.textContent = "Recover Session";
        btn.disabled = false;
      }
    });
}
