import { getOperatorSession, signInWithToken } from "../../supabase";
import { loadQueue } from "./queueScreen";

export function renderOperatorLoginScreen(): string {
  return `
    <div id="fy-operator-login" class="fy-screen" style="display:none;flex-direction:column;height:100%;">
      <div style="position:relative;background:#000080;overflow:hidden;flex-shrink:0;">
        <div style="padding:13px 16px;display:flex;align-items:center;gap:10px;position:relative;z-index:1;">
          <div style="flex:1;text-align:center;">
            <div style="font-weight:800;font-size:16px;letter-spacing:-0.5px;color:#ffffff;line-height:1.2;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
              <span style="font-weight:200;color:rgba(255,255,255,0.7);">Form</span><span style="color:#E8930A;font-weight:800;">·</span><span style="font-weight:800;color:#ffffff;">Yaar</span>
            </div>
            <div style="font-size:10.5px;color:#aabbd4;font-weight:500;">Operator Portal</div>
          </div>
        </div>
        <div style="height:3px;display:flex;"><div style="flex:1;background:#FF9933;"></div><div style="flex:1;background:#ffffff;"></div><div style="flex:1;background:#138808;"></div></div>
      </div>

      <div style="flex:1;display:flex;flex-direction:column;padding:24px 20px;gap:14px;">
        <div style="text-align:center;margin-bottom:6px;">
          <div style="font-size:40px;margin-bottom:10px;">🏪</div>
          <div style="font-size:17px;font-weight:800;color:#0a0a2e;margin-bottom:5px;">Operator Sign In</div>
          <div style="font-size:12px;color:#50507a;line-height:1.6;">Go to your FormYaar dashboard, open Settings, and generate a token. Paste it below.</div>
        </div>

        <button id="fy-open-operator-login" style="width:100%;padding:12px 16px;background:#f8fafc;color:#000080;border:1.5px solid #e0e0f0;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000080" stroke-width="2.2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open Dashboard
        </button>

        <div style="display:flex;align-items:center;gap:8px;margin:2px 0;">
          <div style="flex:1;height:1px;background:#e5e7eb;"></div>
          <span style="font-size:11px;color:#94a3b8;font-weight:500;">paste your token below</span>
          <div style="flex:1;height:1px;background:#e5e7eb;"></div>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;">
          <input
            id="fy-token-input"
            type="text"
            placeholder="e.g. K7XQ3MNPLVRB"
            maxlength="12"
            style="width:100%;padding:14px;border:1.5px solid #e0e0f0;border-radius:10px;font-size:20px;font-family:monospace;font-weight:800;letter-spacing:3px;color:#000080;text-align:center;text-transform:uppercase;outline:none;"
          />
          <button id="fy-token-submit" style="width:100%;padding:11px;background:#000080;color:white;border:none;border-radius:10px;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit;">
            Connect Extension
          </button>
        </div>

        <div id="fy-token-error" style="display:none;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:9px 12px;font-size:12px;color:#991b1b;text-align:center;"></div>

        <div style="font-size:11px;color:#94a3b8;text-align:center;line-height:1.5;margin-top:auto;">
          Only for cafe operators with a FormYaar subscription.
        </div>
      </div>
    </div>
  `;
}

export function attachOperatorLoginHandlers() {
  document
    .getElementById("fy-open-operator-login")
    ?.addEventListener("click", () => {
      browser.runtime.sendMessage({
        type: "OPEN_URL",
        url: "https://formyaar.in/operator-dashboard.html",
      });
    });

  document
    .getElementById("fy-token-submit")
    ?.addEventListener("click", async () => {
      const input = document.getElementById(
        "fy-token-input",
      ) as HTMLInputElement;
      const errorEl = document.getElementById(
        "fy-token-error",
      ) as HTMLDivElement;
      const btn = document.getElementById(
        "fy-token-submit",
      ) as HTMLButtonElement;

      const token = input.value.trim().toUpperCase();
      if (!token || token.length !== 12) {
        errorEl.style.display = "block";
        errorEl.textContent =
          "Please enter the 12-character token from your dashboard.";
        return;
      }

      btn.textContent = "Connecting...";
      btn.disabled = true;
      errorEl.style.display = "none";

      const { error } = await signInWithToken(token);

      if (error) {
        errorEl.style.display = "block";
        errorEl.textContent =
          error === "Token expired"
            ? "Token expired. Go to your dashboard and generate a new one."
            : error === "Token already used"
              ? "This token has already been used. Generate a new one from your dashboard."
              : "Invalid token. Please check and try again.";
        btn.textContent = "Connect Extension";
        btn.disabled = false;
        return;
      }

      // Success — show queue
      document.getElementById("fy-operator-login")!.style.display = "none";
      document.getElementById("fy-operator-queue")!.style.display = "flex";
      const session = await getOperatorSession();
      if (session) await loadQueue(session.id);
    });
}
