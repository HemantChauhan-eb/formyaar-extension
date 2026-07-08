export function renderFillingScreen(): string {
  return `
    <div id="fy-filling" class="fy-screen" style="display:none;flex-direction:column;height:100%;">
      <div style="position:relative;background:#000080;overflow:hidden;flex-shrink:0;">
        <div style="padding:13px 16px;display:flex;align-items:center;gap:10px;position:relative;z-index:1;">
          <div style="flex:1;text-align:center;">
            <div style="font-weight:800;font-size:16px;letter-spacing:-0.5px;color:#ffffff;line-height:1.2;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
              <span style="font-weight:200;color:rgba(255,255,255,0.7);">Form</span><span style="color:#E8930A;font-weight:800;">·</span><span style="font-weight:800;color:#ffffff;">Yaar</span>
            </div>
            <div style="font-size:10.5px;color:#aabbd4;font-weight:500;">Filling your form...</div>
          </div>
        </div>
        <div style="height:3px;display:flex;"><div style="flex:1;background:#FF9933;"></div><div style="flex:1;background:#ffffff;"></div><div style="flex:1;background:#138808;"></div></div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:24px 20px;">
        <div style="text-align:center;margin-bottom:20px;">
          <div style="width:56px;height:56px;border-radius:50%;background:rgba(130,28,255,0.1);display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;">
            <div style="width:28px;height:28px;border:3px solid rgba(130,28,255,0.2);border-top-color:#821cff;border-radius:50%;animation:fy-spin 0.8s linear infinite;"></div>
          </div>
          <div style="font-size:18px;font-weight:800;color:#0a0a2e;">Filling your PAN form</div>
          <div style="margin-top:6px;font-size:12.5px;color:#50507a;">Please don't close this tab</div>
        </div>
        <div style="background:#f8f9fc;border:1px solid #e8e8f0;border-radius:12px;padding:14px 16px;">
          <div id="fy-fill-progress-label" style="font-size:11px;color:#50507a;font-weight:600;margin-bottom:10px;letter-spacing:0.3px;text-transform:uppercase;">Progress</div>
          <div id="fy-fill-progress-list" style="display:flex;flex-direction:column;gap:8px;font-size:12.5px;color:#50507a;">
            <div style="opacity:0.6;">Preparing...</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderVerifyScreen(): string {
  return `
    <div id="fy-verify" class="fy-screen" style="display:none;flex-direction:column;height:100%;">
      <div style="position:relative;background:#000080;overflow:hidden;flex-shrink:0;">
        <div style="padding:13px 16px;display:flex;align-items:center;gap:10px;position:relative;z-index:1;">
          <div style="flex:1;text-align:center;">
            <div style="font-weight:800;font-size:16px;letter-spacing:-0.5px;color:#ffffff;line-height:1.2;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
              <span style="font-weight:200;color:rgba(255,255,255,0.7);">Form</span><span style="color:#E8930A;font-weight:800;">·</span><span style="font-weight:800;color:#ffffff;">Yaar</span>
            </div>
            <div id="fy-verify-subtitle" style="font-size:10.5px;color:#aabbd4;font-weight:500;">Step complete</div>
          </div>
        </div>
        <div style="height:3px;display:flex;"><div style="flex:1;background:#FF9933;"></div><div style="flex:1;background:#ffffff;"></div><div style="flex:1;background:#138808;"></div></div>
      </div>
      <div id="fy-verify-body" style="flex:1;overflow-y:auto;padding:24px 20px;"></div>
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
    <div style="background:#fff8eb;border:1.5px solid #f5d27a;border-radius:12px;padding:14px 16px;margin-bottom:12px;">
      <div style="display:flex;gap:10px;align-items:flex-start;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b8860b" stroke-width="2.2" stroke-linecap="round" style="flex-shrink:0;margin-top:1px;"><path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg>
        <div>
          <div style="font-size:13px;color:#7a5a00;font-weight:700;margin-bottom:6px;">Complete manually</div>
          <div style="font-size:12px;color:#7a5a00;line-height:1.9;">
            ${manualSteps.map((s, i) => `<strong>${i + 1}.</strong> ${s}`).join("<br>")}
          </div>
        </div>
      </div>
    </div>`
      : "";

  const infoCard = info
    ? `
    <div style="background:#f0f8ff;border:1px solid #bfd4ec;border-radius:10px;padding:11px 14px;font-size:12px;color:#50507a;line-height:1.5;margin-bottom:12px;">
      ${info}
    </div>`
    : "";

  const body = document.getElementById("fy-verify-body");
  if (body)
    body.innerHTML = `
    <div style="text-align:center;margin-bottom:20px;">
      <div style="width:60px;height:60px;border-radius:50%;background:#22c55e;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;animation:fy-successPop 0.5s ease forwards;box-shadow:0 8px 20px rgba(34,197,94,0.27);">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div style="font-size:19px;font-weight:800;color:#0a0a2e;">${title}</div>
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
          <div style="display:flex;align-items:center;gap:8px;color:#22c55e;font-weight:600;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>${item.label}</span>
          </div>`;
      }
      if (item.status === "active") {
        return `
          <div style="display:flex;align-items:center;gap:8px;color:#821cff;font-weight:700;">
            <div style="width:12px;height:12px;border:2px solid rgba(130,28,255,0.25);border-top-color:#821cff;border-radius:50%;animation:fy-spin 0.7s linear infinite;"></div>
            <span>${item.label}</span>
          </div>`;
      }
      return `
        <div style="display:flex;align-items:center;gap:8px;color:#aaa;">
          <div style="width:12px;height:12px;border:2px solid #ddd;border-radius:50%;"></div>
          <span>${item.label}</span>
        </div>`;
    })
    .join("");
}
