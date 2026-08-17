import { renderHeader, renderProgress } from "./shared";

export function renderFillingScreen(): string {
  return `
    <div id="fy-filling" class="fy-screen" style="display:none;flex-direction:column;height:100%;background:var(--fy-bg);">
      ${renderHeader({ subtitle: "Filling your form" })}
      ${renderProgress(1)}
      <div style="flex:1;overflow-y:auto;padding:44px 26px 24px;">
        <div style="text-align:center;">
          <div id="fy-fill-spinner" style="width:44px;height:44px;border:3px solid var(--fy-accent-line);border-top-color:var(--fy-accent);border-radius:50%;animation:fy-spin 0.8s linear infinite;display:inline-block;"></div>
          <div id="fy-fill-title" style="margin-top:20px;font-size:19px;font-weight:800;color:var(--fy-ink);letter-spacing:-0.4px;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">Sit back — we're typing</div>
          <div id="fy-fill-sub" style="margin-top:7px;font-size:12.5px;color:var(--fy-muted);">Keep this tab open. It takes about a minute.</div>
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
  // Hide every screen rather than a hardcoded list. The list version missed
  // fy-upload, so opening this on the document page stacked two screens on top
  // of each other — and would have missed the next screen anyone adds too.
  document.querySelectorAll<HTMLElement>(".fy-screen").forEach((el) => {
    el.style.display = el.id === "fy-filling" ? "flex" : "none";
  });

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
  // Same reason as showFillingScreen: hide everything, not a named few, so
  // this can't land on top of an already-visible screen.
  document.querySelectorAll<HTMLElement>(".fy-screen").forEach((el) => {
    el.style.display = el.id === "fy-verify" ? "flex" : "none";
  });

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

export type ProgressItem = {
  label: string;
  status: "done" | "active" | "pending" | "skipped" | "intentional";
  note?: string;
};

// Re-show a step the fill already finished, when the user clicks back to it in
// the site's own stepper. Same screen and the same list they watched being
// filled — only the heading changes, because "we're typing" is a lie once it's
// done. Live filling and review share one screen deliberately: two screens
// showing the same rows would drift apart.
export function showStepReview(title: string, items: ProgressItem[]) {
  showFillingScreen();

  // Mark this as review, not a live fill. The click-outside-to-close handler
  // refuses to close the panel whenever this screen is up — right during an
  // actual fill, wrong when the user is just reading a finished step and can't
  // get the panel out of the way.
  const screen = document.getElementById("fy-filling");
  if (screen) screen.dataset.mode = "review";

  const spinner = document.getElementById("fy-fill-spinner");
  if (spinner) spinner.style.display = "none";

  const titleEl = document.getElementById("fy-fill-title");
  if (titleEl) titleEl.textContent = title;

  const subEl = document.getElementById("fy-fill-sub");
  if (subEl) subEl.textContent = "What FormYaar filled on this step.";

  const label = document.getElementById("fy-fill-progress-label");
  if (label) label.textContent = "Fields";

  updateFillProgress(items);
}

// Put the screen back the way live filling expects to find it — the review
// mode above mutates the shared nodes, so a fill starting afterwards would
// otherwise inherit a hidden spinner and the wrong heading.
export function resetFillingScreenChrome() {
  const screen = document.getElementById("fy-filling");
  if (screen) screen.dataset.mode = "live";

  const spinner = document.getElementById("fy-fill-spinner");
  if (spinner) spinner.style.display = "inline-block";

  const titleEl = document.getElementById("fy-fill-title");
  if (titleEl) titleEl.textContent = "Sit back — we're typing";

  const subEl = document.getElementById("fy-fill-sub");
  if (subEl) subEl.textContent = "Keep this tab open. It takes about a minute.";

  const label = document.getElementById("fy-fill-progress-label");
  if (label) label.textContent = "Progress";
}

export function updateFillProgress(
  items: {
    label: string;
    status: "done" | "active" | "pending" | "skipped" | "intentional";
    note?: string;
  }[],
) {
  const list = document.getElementById("fy-fill-progress-list");
  if (!list) return;

  const noteLine = (note?: string, color = "var(--fy-muted)") =>
    note
      ? `<div style="font-size:11px;color:${color};line-height:1.45;margin-top:2px;">${note}</div>`
      : "";

  list.innerHTML = items
    .map((item) => {
      if (item.status === "done") {
        return `
          <div class="fy-prog-item done">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>
            <span>${item.label}</span>
          </div>`;
      }
      // Deliberately left alone — an option the applicant didn't choose, or a
      // field that doesn't apply to them. Grey and tagged "Skipped" in as many
      // words: users were reading a muted row as "FormYaar broke here" and
      // going off to fix something that was never wrong.
      if (item.status === "intentional") {
        return `
          <div class="fy-prog-item" style="align-items:flex-start;color:var(--fy-muted);">
            <span style="width:13px;text-align:center;flex-shrink:0;font-weight:800;line-height:1.5;">–</span>
            <div>
              <span style="font-weight:600;">${item.label}</span>
              <span style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:999px;background:var(--fy-field);color:var(--fy-muted);font-size:9px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;vertical-align:1px;">Skipped</span>
              ${noteLine(item.note ?? "Not required for your PAN")}
            </div>
          </div>`;
      }
      // A field we genuinely couldn't fill (selector missing / disabled). This
      // is the only status that asks the user to do something, so it's the only
      // one that gets the warning colour — otherwise it reads the same as a
      // deliberate skip and the real problems get lost among them.
      if (item.status === "skipped") {
        return `
          <div class="fy-prog-item" style="align-items:flex-start;color:var(--fy-ink);">
            <span style="width:13px;text-align:center;flex-shrink:0;color:var(--fy-warn);font-weight:800;line-height:1.5;">!</span>
            <div>
              <span style="font-weight:600;">${item.label}</span>
              <span style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:999px;background:var(--fy-warn-bg);color:var(--fy-warn);font-size:9px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;vertical-align:1px;">Check</span>
              ${noteLine(item.note, "var(--fy-warn)")}
            </div>
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
