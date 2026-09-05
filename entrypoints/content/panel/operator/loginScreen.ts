import { getOperatorSession, signInWithToken } from "../../supabase";
import { renderHeader } from "../shared";
import { loadQueue } from "./queueScreen";
import { setView } from "../router";

export function renderOperatorLoginScreen(): string {
  return `
    <div id="fy-operator-login" class="fy-screen" style="display:none;flex-direction:column;height:100%;background:var(--fy-bg-alt);">
      ${renderHeader({ subtitle: "Operator portal" })}

      <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;padding:22px 16px;gap:12px;">
        <div style="text-align:center;margin-bottom:4px;">
          <div style="width:52px;height:52px;border-radius:14px;background:var(--fy-accent-soft);display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#305eff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8l1.5-4h13L20 8"/><path d="M4 8h16v3a3 3 0 0 1-5.3 1.9A3 3 0 0 1 12 14a3 3 0 0 1-2.7-1.1A3 3 0 0 1 4 11z"/><path d="M5.5 14v6.5h13V14M10 20.5v-4h4v4"/></svg>
          </div>
          <div style="font-size:16px;font-weight:800;color:var(--fy-ink);margin-bottom:5px;letter-spacing:-0.3px;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">Operator sign in</div>
          <div style="font-size:12px;color:var(--fy-muted);line-height:1.6;max-width:270px;margin:0 auto;">Open your FormYaar dashboard, go to Settings, generate a token — then paste it below.</div>
        </div>

        <button id="fy-open-operator-login" class="fy-btn fy-btn-ghost fy-btn-block" style="font-size:12.5px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open my dashboard
        </button>

        <div style="display:flex;align-items:center;gap:8px;margin:2px 0;">
          <div style="flex:1;height:1px;background:var(--fy-line);"></div>
          <span style="font-size:10.5px;color:var(--fy-muted);font-weight:600;">then paste your token</span>
          <div style="flex:1;height:1px;background:var(--fy-line);"></div>
        </div>

        <div class="fy-card" style="padding:14px;display:flex;flex-direction:column;gap:9px;">
          <input
            id="fy-token-input"
            type="text"
            placeholder="K7XQ3MNPLVRB"
            maxlength="12"
            style="width:100%;padding:13px;border:1px solid var(--fy-line);border-radius:10px;font-size:18px;font-family:monospace;font-weight:800;letter-spacing:3px;color:var(--fy-accent-strong);text-align:center;text-transform:uppercase;outline:none;box-sizing:border-box;"
            onfocus="this.style.borderColor='#305eff';this.style.boxShadow='0 0 0 3px rgba(48,94,255,0.22)';"
            onblur="this.style.borderColor='#e6e9f1';this.style.boxShadow='none';"
          />
          <button id="fy-token-submit" class="fy-btn fy-btn-primary fy-btn-block">
            Connect extension
          </button>
        </div>

        <div id="fy-token-error" style="display:none;background:var(--fy-danger-bg);border:1px solid var(--fy-danger-line);border-radius:10px;padding:10px 12px;font-size:12px;color:var(--fy-danger);text-align:center;line-height:1.5;"></div>

        <div style="font-size:10.5px;color:var(--fy-muted);text-align:center;line-height:1.5;margin-top:auto;">
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

      btn.textContent = "Connecting…";
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
        btn.textContent = "Connect extension";
        btn.disabled = false;
        return;
      }

      // Success — show queue
      setView("operatorQueue");
      const session = await getOperatorSession();
      if (session) await loadQueue(session.id);
    });
}
