import { setView } from "./router";

let maintenanceCountdownInterval: ReturnType<typeof setInterval> | null = null;

// Both screens used to be injected with `panel.innerHTML = …` after an async
// fetch — which destroyed every other screen and every handler attached to
// them, up to 2.5 seconds after the panel had appeared and possibly in the
// middle of a fill. They are ordinary screens now, rendered once with the
// rest and shown through the router like anything else.
//
// `backAt` is deliberately not a render argument any more: nothing in the
// markup interpolated it (the countdown fills itself in), and taking it here
// forced the whole screen to be re-rendered to show it.
export function renderMaintenanceScreen(): string {
  return `
    <div id="fy-maintenance" class="fy-screen" style="display:none;flex-direction:column;height:100%;">
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
        <div id="fy-maint-backat" style="display:none;font-size:11.5px;font-weight:600;color:#4d5b7a;margin-top:11px;padding-top:10px;border-top:1px solid rgba(48,94,255,0.16);"></div>
      </div>
    </div>
    <div class="fy-maint-stripe"></div>
    </div>
  `;
}

/** Show it, and start the clock. The only way this screen appears. */
export function showMaintenance(backAt: string | null): void {
  setView("maintenance");
  startMaintenanceCountdown(backAt);
}

// The date the panel comes back, phrased the way someone would say it out loud.
// A bare "31 Jul" reads as far away even when it's tonight, so the two nearest
// days are named and anything beyond that gets the weekday + date.
function formatBackAt(target: Date): string {
  const time = target
    .toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toUpperCase();
  const dayStart = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysAway = Math.round(
    (dayStart(target) - dayStart(new Date())) / 86400000,
  );
  if (daysAway <= 0) return `Today, ${time}`;
  if (daysAway === 1) return `Tomorrow, ${time}`;
  const date = target.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `${date}, ${time}`;
}

export function startMaintenanceCountdown(backAt: string | null) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const update = () => {
    const el = document.getElementById("fy-maint-countdown");
    const backEl = document.getElementById("fy-maint-backat");
    const hideBackAt = () => {
      if (backEl) backEl.style.display = "none";
    };
    if (!el) return;
    if (!backAt) {
      el.textContent = "--:--:--";
      hideBackAt();
      return;
    }
    const target = new Date(backAt);
    const diff = target.getTime() - Date.now();
    if (diff <= 0) {
      el.textContent = "Soon";
      hideBackAt();
      if (maintenanceCountdownInterval) {
        clearInterval(maintenanceCountdownInterval);
        maintenanceCountdownInterval = null;
      }
      return;
    }
    // Multi-day maintenance was rolling the days into the hours slot — 5 days
    // out read as "133:48:57", which looks like a glitch rather than a wait.
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const clock = `${pad(h)}:${pad(m)}:${pad(s)}`;
    // The day prefix makes the line too wide for the panel at full size, so the
    // clock tightens only while days are on screen.
    el.style.fontSize = d > 0 ? "27px" : "34px";
    el.style.letterSpacing = d > 0 ? "1.5px" : "3px";
    el.textContent = d > 0 ? `${d} days ${clock}` : clock;

    if (backEl) {
      backEl.style.display = "block";
      backEl.textContent = `Expected back · ${formatBackAt(target)}`;
    }
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

export function renderUpdateScreen(): string {
  return `
    <div id="fy-update" class="fy-screen" style="display:none;flex-direction:column;height:100%;">
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:36px 28px;text-align:center;background:#f7f8fc;font-family:'DM Sans',-apple-system,sans-serif;">
      <div style="width:64px;height:64px;border-radius:18px;background:#eef2ff;display:flex;align-items:center;justify-content:center;margin-bottom:22px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#305eff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M4.5 19.5h15"/></svg>
      </div>
      <div style="font-size:10px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:#305eff;margin-bottom:10px;">Update available</div>
      <div style="font-size:19px;font-weight:800;color:#0c1322;line-height:1.3;margin-bottom:12px;letter-spacing:-0.3px;">FormYaar needs a quick update</div>
      <div style="font-size:12.5px;color:#6c7689;line-height:1.7;max-width:272px;margin-bottom:28px;">You're on <strong style="color:#0c1322;">v<span id="fy-update-current"></span></strong>. Version <strong style="color:#0c1322;">v<span id="fy-update-min"></span></strong> is required to continue — it takes less than a minute.</div>
      <button id="fy-update-btn" style="width:100%;padding:14px;background:#305eff;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:12px;box-shadow:0 6px 16px -6px rgba(48,94,255,0.55);">Update extension →</button>
      <div style="font-size:11px;color:#6c7689;line-height:1.6;">After updating, refresh this page and the panel will open normally.</div>
    </div>
    </div>
  `;
}

/** Show it, with the two version numbers filled in. */
export function showUpdateRequired(current: string, min: string): void {
  const c = document.getElementById("fy-update-current");
  const m = document.getElementById("fy-update-min");
  if (c) c.textContent = current;
  if (m) m.textContent = min;
  setView("update");
}
