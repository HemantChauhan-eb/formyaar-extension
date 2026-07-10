import { renderHeader, renderProgress } from "./shared";

export function renderFillingScreen(): string {
  return `
    <div id="fy-filling" class="fy-screen" style="display:none;flex-direction:column;height:100%;background:var(--fy-bg);">
      ${renderHeader({ subtitle: "Filling your form" })}
      ${renderProgress(1)}
      <div style="flex:1;overflow-y:auto;padding:44px 26px 24px;">
        <div style="text-align:center;">
          <div style="width:44px;height:44px;border:3px solid var(--fy-accent-line);border-top-color:var(--fy-accent);border-radius:50%;animation:fy-spin 0.8s linear infinite;display:inline-block;"></div>
          <div style="margin-top:20px;font-size:19px;font-weight:800;color:var(--fy-ink);letter-spacing:-0.4px;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">Sit back — we're typing</div>
          <div style="margin-top:7px;font-size:12.5px;color:var(--fy-muted);">Keep this tab open. It takes about a minute.</div>
        </div>

        <div style="max-width:280px;margin:36px auto 0;">
          <div id="fy-fill-progress-label" style="font-size:10px;color:var(--fy-muted);font-weight:800;margin-bottom:12px;letter-spacing:1.2px;text-transform:uppercase;">Progress</div>
          <div id="fy-fill-progress-list" style="display:flex;flex-direction:column;gap:10px;">
            <div style="font-size:13px;color:var(--fy-faint);">Preparing…</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderVerifyScreen(): string {
  return `
    <div id="fy-verify" class="fy-screen" style="display:none;flex-direction:column;height:100%;background:var(--fy-bg);">
      <div class="fy-hdr">
        <div class="fy-hdr-brand">
          <span class="fy-brandmark"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5l4 4L8 20l-4.6 1 1-4.6z"/><path d="M12.5 7.5l4 4"/></svg></span>
          <div>
            <div class="fy-hdr-name">FormYaar</div>
            <div id="fy-verify-subtitle" class="fy-hdr-sub">Step complete</div>
          </div>
        </div>
      </div>
      <div id="fy-verify-body" style="flex:1;overflow-y:auto;padding:40px 26px 24px;"></div>
    </div>
  `;
}

export function showFillingScreen() {
  document.getElementById("fy-payment")!.style.display = "none";
  document.getElementById("fy-home")!.style.display = "none";
  document.getElementById("fy-verify")!.style.display = "none";
  document.getElementById("fy-filling")!.style.display = "flex";

  // Open the panel if it's collapsed
  const p = document.getElementById("formyaar-panel");
  if (p) p.style.right = "0px";
}

export function showVerifyScreen(completion?: {
  title?: string;
  subtitle?: string;
  manual_steps?: string[];
  info?: string;
}) {
  document.getElementById("fy-filling")!.style.display = "none";
  document.getElementById("fy-verify")!.style.display = "flex";

  const p = document.getElementById("formyaar-panel");
  if (p) p.style.right = "0px";

  const title = completion?.title ?? "Step complete!";
  const subtitle = completion?.subtitle ?? "";
  const manualSteps = completion?.manual_steps ?? [];
  const info = completion?.info ?? "";

  const subEl = document.getElementById("fy-verify-subtitle");
  if (subEl) subEl.textContent = subtitle || "Step complete";

  const manualCard =
    manualSteps.length > 0
      ? `
    <div style="max-width:290px;margin:0 auto 18px;text-align:left;">
      <div style="font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:var(--fy-muted);margin-bottom:11px;">Now do this</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${manualSteps
          .map(
            (s, i) => `
          <div style="display:flex;gap:11px;align-items:flex-start;">
            <span style="width:19px;height:19px;border-radius:50%;background:var(--fy-field);color:var(--fy-ink);font-size:10.5px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">${i + 1}</span>
            <span style="font-size:13px;color:var(--fy-body);line-height:1.55;">${s}</span>
          </div>`,
          )
          .join("")}
      </div>
    </div>`
      : "";

  const infoCard = info
    ? `<div style="max-width:290px;margin:0 auto;font-size:11.5px;color:var(--fy-muted);line-height:1.6;text-align:center;">${info}</div>`
    : "";

  const body = document.getElementById("fy-verify-body");
  if (body)
    body.innerHTML = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:54px;height:54px;border-radius:50%;background:var(--fy-good);display:inline-flex;align-items:center;justify-content:center;animation:fy-successPop 0.5s ease forwards;">
        <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div style="margin-top:16px;font-size:19px;font-weight:800;color:var(--fy-ink);letter-spacing:-0.4px;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">${title}</div>
    </div>
    ${manualCard}
    ${infoCard}
  `;
}

export function updateFillProgress(
  items: { label: string; status: "done" | "active" | "pending" }[],
) {
  const list = document.getElementById("fy-fill-progress-list");
  if (!list) return;

  list.innerHTML = items
    .map((item) => {
      if (item.status === "done") {
        return `
          <div class="fy-prog-item done">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>
            <span>${item.label}</span>
          </div>`;
      }
      if (item.status === "active") {
        return `
          <div class="fy-prog-item active">
            <div class="fy-prog-spinner"></div>
            <span>${item.label}</span>
          </div>`;
      }
      return `
        <div class="fy-prog-item pending">
          <div class="fy-prog-ring"></div>
          <span>${item.label}</span>
        </div>`;
    })
    .join("");
}
