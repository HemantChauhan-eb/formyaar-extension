let maintenanceCountdownInterval: ReturnType<typeof setInterval> | null = null;

export function renderMaintenanceScreen(backAt: string | null): string {
  return `
    <style>
      @keyframes fy-stripe-scroll {
        from { background-position: 0 0; }
        to { background-position: 40px 0; }
      }
      .fy-maint-stripe {
        height: 34px;
        flex-shrink: 0;
        background: repeating-linear-gradient(
          -45deg,
          #FFD700 0px, #FFD700 24px,
          #333 24px, #333 48px
        );
      }
      .fy-maint-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 36px 28px;
        text-align: center;
      }
      .fy-maint-timer-box {
        width: 100%;
        background: #eef0fa;
        border: 1.5px solid #000080;
        border-radius: 14px;
        padding: 18px 24px;
        margin-top: 32px;
      }
    </style>
    <div class="fy-maint-stripe"></div>
    <div class="fy-maint-body">
      <div style="font-size:56px;line-height:1;margin-bottom:24px;">🚧</div>
      <div style="font-size:10px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#b8920a;margin-bottom:10px;">Under Maintenance</div>
      <div style="font-size:20px;font-weight:800;color:#1a1a18;line-height:1.3;margin-bottom:16px;">FormYaar is getting better</div>
      <div style="font-size:12.5px;color:#64748b;line-height:1.75;max-width:268px;">To provide you the latest and most updated services, we've temporarily paused. We'll be right back.</div>
      <div class="fy-maint-timer-box">
        <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#000080;margin-bottom:10px;">Back in</div>
        <div id="fy-maint-countdown" style="font-size:36px;font-weight:800;color:#1a1a18;letter-spacing:4px;font-variant-numeric:tabular-nums;">--:--:--</div>
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
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:36px 28px;text-align:center;background:#fff;">
      <div style="width:64px;height:64px;border-radius:16px;background:#fff4e5;border:2px solid #f59e0b;display:flex;align-items:center;justify-content:center;margin-bottom:24px;font-size:32px;">🔄</div>
      <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#b45309;margin-bottom:10px;">Update Required</div>
      <div style="font-size:20px;font-weight:800;color:#1a1a18;line-height:1.3;margin-bottom:14px;">FormYaar needs an update</div>
      <div style="font-size:13px;color:#64748b;line-height:1.7;max-width:272px;margin-bottom:32px;">You're on <strong style="color:#1a1a18;">v${currentVersion}</strong>. Version <strong style="color:#1a1a18;">v${minVersion}</strong> is required to continue. Please update your extension.</div>
      <button id="fy-update-btn" style="width:100%;padding:14px;background:#000080;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:12px;">Update Extension →</button>
      <div style="font-size:11.5px;color:#94a3b8;line-height:1.6;">After updating, refresh this page and the panel will open normally.</div>
    </div>
  `;
}
