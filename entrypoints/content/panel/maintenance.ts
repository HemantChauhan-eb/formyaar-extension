let maintenanceCountdownInterval: ReturnType<typeof setInterval> | null = null;

export function renderMaintenanceScreen(backAt: string | null): string {
  return `
    <style>
      .fy-maint-stripe {
        height: 5px;
        flex-shrink: 0;
        background: linear-gradient(90deg, #305eff, #7d9bff);
      }
      .fy-maint-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 36px 28px;
        text-align: center;
        background: #f7f8fc;
        font-family: 'DM Sans', -apple-system, sans-serif;
      }
      .fy-maint-timer-box {
        width: 100%;
        background: #eef2ff;
        border: 1px solid rgba(48, 94, 255, 0.22);
        border-radius: 14px;
        padding: 18px 24px;
        margin-top: 30px;
      }
    </style>
    <div class="fy-maint-stripe"></div>
    <div class="fy-maint-body">
      <div style="width:64px;height:64px;border-radius:18px;background:#eef2ff;display:flex;align-items:center;justify-content:center;margin-bottom:22px;">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#305eff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a5 5 0 0 0-6.6 6.6L3 18l3 3 5.1-5.1a5 5 0 0 0 6.6-6.6L14 13l-3-3z"/></svg>
      </div>
      <div style="font-size:10px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:#305eff;margin-bottom:10px;">Quick maintenance</div>
      <div style="font-size:19px;font-weight:800;color:#0c1322;line-height:1.3;margin-bottom:12px;letter-spacing:-0.3px;">FormYaar is getting better</div>
      <div style="font-size:12.5px;color:#6c7689;line-height:1.7;max-width:268px;">We've paused briefly to ship an improvement. Nothing is lost — your saved details stay safely on your device.</div>
      <div class="fy-maint-timer-box">
        <div style="font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#305eff;margin-bottom:9px;">Back in</div>
        <div id="fy-maint-countdown" style="font-size:34px;font-weight:800;color:#0c1322;letter-spacing:3px;font-variant-numeric:tabular-nums;">--:--:--</div>
      </div>
    </div>
    <div class="fy-maint-stripe"></div>
  `;
}

export function startMaintenanceCountdown(backAt: string | null) {
  const update = () => {
    const el = document.getElementById("fy-maint-countdown");
    if (!el) return;
    if (!backAt) {
      el.textContent = "--:--:--";
      return;
    }
    const diff = new Date(backAt).getTime() - Date.now();
    if (diff <= 0) {
      el.textContent = "Soon";
      if (maintenanceCountdownInterval) {
        clearInterval(maintenanceCountdownInterval);
        maintenanceCountdownInterval = null;
      }
      return;
    }
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };
  update();
  maintenanceCountdownInterval = setInterval(update, 1000);
}

export function isVersionOutdated(current: string, required: string): boolean {
  const parse = (v: string) => v.split(".").map(Number);
  const [cMaj, cMin, cPat] = parse(current);
  const [rMaj, rMin, rPat] = parse(required);
  if (cMaj !== rMaj) return cMaj < rMaj;
  if (cMin !== rMin) return cMin < rMin;
  return cPat < rPat;
}

export function renderUpdateScreen(
  currentVersion: string,
  minVersion: string,
): string {
  return `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:36px 28px;text-align:center;background:#f7f8fc;font-family:'DM Sans',-apple-system,sans-serif;">
      <div style="width:64px;height:64px;border-radius:18px;background:#eef2ff;display:flex;align-items:center;justify-content:center;margin-bottom:22px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#305eff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M4.5 19.5h15"/></svg>
      </div>
      <div style="font-size:10px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:#305eff;margin-bottom:10px;">Update available</div>
      <div style="font-size:19px;font-weight:800;color:#0c1322;line-height:1.3;margin-bottom:12px;letter-spacing:-0.3px;">FormYaar needs a quick update</div>
      <div style="font-size:12.5px;color:#6c7689;line-height:1.7;max-width:272px;margin-bottom:28px;">You're on <strong style="color:#0c1322;">v${currentVersion}</strong>. Version <strong style="color:#0c1322;">v${minVersion}</strong> is required to continue — it takes less than a minute.</div>
      <button id="fy-update-btn" style="width:100%;padding:14px;background:#305eff;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:12px;box-shadow:0 6px 16px -6px rgba(48,94,255,0.55);">Update extension →</button>
      <div style="font-size:11px;color:#6c7689;line-height:1.6;">After updating, refresh this page and the panel will open normally.</div>
    </div>
  `;
}
