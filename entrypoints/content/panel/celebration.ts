// ─── Surprise: cumulative "time saved" celebration ───────────────────
const TIME_SAVED_KEY = "fy_time_saved";
// Conservative estimate of manual time per field (typing + reading + tabbing).
const SECONDS_PER_FIELD = 25;

function humanizeSeconds(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return `${m}m`;
  return `${Math.max(1, Math.round(total))}s`;
}

/**
 * Called by the autofill engine after each completed step. Accumulates an
 * estimate of the time FormYaar saved, persists it, and shows a one-shot
 * tricolor confetti burst with a "time saved" pill. Pure CSS — no libraries,
 * no remote code (Chrome Web Store safe). Never throws into the fill flow.
 */
export async function celebrateTimeSaved(fieldsThisRun: number): Promise<void> {
  if (!fieldsThisRun || fieldsThisRun < 1) return;
  try {
    const runSeconds = fieldsThisRun * SECONDS_PER_FIELD;
    const stored = await browser.storage.local.get(TIME_SAVED_KEY);
    const prev =
      (stored[TIME_SAVED_KEY] as { seconds: number } | undefined)?.seconds ?? 0;
    const totalSeconds = prev + runSeconds;
    await browser.storage.local.set({
      [TIME_SAVED_KEY]: { seconds: totalSeconds },
    });
    renderCelebration(runSeconds, totalSeconds);
  } catch {
    // Celebration is best-effort — never break the fill flow
  }
}

function renderCelebration(runSeconds: number, totalSeconds: number): void {
  const panel = document.getElementById("formyaar-panel");
  if (!panel) return;

  // Inject keyframes once
  if (!document.getElementById("fy-celebrate-style")) {
    const style = document.createElement("style");
    style.id = "fy-celebrate-style";
    style.textContent = `
      @keyframes fy-confetti-fall {
        0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
        100% { transform: translateY(420px) rotate(540deg); opacity: 0; }
      }
      @keyframes fy-pill-in {
        0% { transform: translate(-50%, -16px); opacity: 0; }
        15% { transform: translate(-50%, 0); opacity: 1; }
        85% { transform: translate(-50%, 0); opacity: 1; }
        100% { transform: translate(-50%, -10px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Confetti layer (brand blues + celebratory saffron/green accents)
  const layer = document.createElement("div");
  layer.style.cssText = `
    position: absolute; inset: 0; pointer-events: none;
    overflow: hidden; z-index: 5;
  `;
  const colors = ["#305eff", "#7d9bff", "#ffffff", "#22c55e", "#ffb347"];
  for (let i = 0; i < 32; i++) {
    const piece = document.createElement("div");
    const size = 6 + Math.random() * 6;
    const color = colors[Math.floor(Math.random() * colors.length)];
    piece.style.cssText = `
      position: absolute;
      top: -20px; left: ${Math.random() * 100}%;
      width: ${size}px; height: ${size * 0.5}px;
      background: ${color};
      border: ${color === "#ffffff" ? "0.5px solid #ddd" : "none"};
      border-radius: 1px;
      animation: fy-confetti-fall ${1.6 + Math.random() * 1.4}s ${Math.random() * 0.5}s ease-in forwards;
    `;
    layer.appendChild(piece);
  }
  panel.appendChild(layer);
  setTimeout(() => layer.remove(), 3200);

  // "Time saved" pill
  const pill = document.createElement("div");
  pill.style.cssText = `
    position: absolute; top: 14px; left: 50%; transform: translate(-50%, 0);
    z-index: 6; pointer-events: none;
    background: #0c1322; color: #fff;
    padding: 9px 15px; border-radius: 999px;
    box-shadow: 0 8px 24px rgba(12,19,34,0.35);
    font-family: 'DM Sans', sans-serif; white-space: nowrap;
    animation: fy-pill-in 4.5s ease forwards;
  `;
  pill.innerHTML = `
    <span style="font-size:13px;font-weight:800;">⚡ Saved you ~${humanizeSeconds(runSeconds)}</span>
    <span style="font-size:11.5px;opacity:0.7;margin-left:6px;">${humanizeSeconds(totalSeconds)} total 🎉</span>
  `;
  panel.appendChild(pill);
  setTimeout(() => pill.remove(), 4600);
}
