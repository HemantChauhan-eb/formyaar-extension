// The "which PAN application?" branch point.
//
// Sits between the home screen's single CTA and the details wizard. The home
// screen keeps doing conversion work (one message, one button, trust lines);
// this screen is where the user says which of the PAN applications they
// actually need, and it's the only caller of showUserForm().
//
// Adding a variant later — companies, reprint, surrender — is one PAN_OPTIONS
// entry. Ship it as `available: false` first: the row renders as "Soon", the
// click is still tracked, and the click-through rate tells you whether the
// build is worth it before you write the config.

import { trackEvent } from "../telemetry";
import { renderHeader } from "./shared";
import { showUserForm } from "./userForm";

interface PanOption {
  // Form config slug — must match a configs/<slug>.json on the backend.
  // Empty for options that aren't built yet.
  slug: string;
  title: string;
  titleKey: string;
  subtitle: string;
  subKey: string;
  price: string;
  icon: string;
  available: boolean;
}

const ICON_CARD = `<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19"/><path d="M6 13.5h6M6 16.2h3.5"/>`;
const ICON_PENCIL = `<path d="M12 20h9"/><path d="M16.4 3.6a2.12 2.12 0 0 1 3 3L7.5 18.5l-4 1 1-4z"/>`;
const ICON_PERSON = `<circle cx="12" cy="8.5" r="3.3"/><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0"/>`;

// Order is deliberate: the highest-volume application sits first and reads
// first. The extra tap this screen costs a new-PAN applicant is paid back by
// every other applicant seeing their option exists at all.
const PAN_OPTIONS: PanOption[] = [
  {
    slug: "pan_card",
    title: "New PAN card",
    titleKey: "chooser.opt_new_title",
    subtitle: "You don't have a PAN yet",
    subKey: "chooser.opt_new_sub",
    price: "₹39",
    icon: ICON_CARD,
    available: true,
  },
  {
    slug: "correction_pan_card",
    title: "Correct existing PAN",
    titleKey: "chooser.opt_correction_title",
    subtitle: "Name, DOB, photo, address & more",
    subKey: "chooser.opt_correction_sub",
    price: "₹39",
    icon: ICON_PENCIL,
    available: true,
  },
  {
    slug: "",
    title: "PAN for a minor",
    titleKey: "chooser.opt_minor_title",
    subtitle: "Applicant is under 18",
    subKey: "chooser.opt_minor_sub",
    price: "",
    icon: ICON_PERSON,
    available: false,
  },
];

export const CHOOSER_STYLES = `
  /* ── Option rows: full-width tap targets, no card chrome ── */
  .fy-optrow { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; background: transparent; border: none; border-radius: 13px; padding: 13px 12px; cursor: pointer; transition: background 0.15s; font-family: inherit; }
  .fy-optrow + .fy-optrow { margin-top: 2px; }
  .fy-optrow:hover { background: var(--fy-field); }
  .fy-optrow:active { transform: scale(0.99); }
  .fy-optrow-ico { width: 36px; height: 36px; border-radius: 11px; background: var(--fy-field); color: var(--fy-body); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.15s, color 0.15s; }
  .fy-optrow:hover .fy-optrow-ico { background: var(--fy-accent-soft); color: var(--fy-accent); }
  .fy-optrow-text { flex: 1; min-width: 0; }
  .fy-optrow-title { display: block; font-size: 13.5px; font-weight: 700; color: var(--fy-ink); letter-spacing: -0.1px; line-height: 1.3; }
  .fy-optrow-sub { display: block; font-size: 11.5px; color: var(--fy-muted); line-height: 1.45; margin-top: 2px; }
  .fy-optrow-right { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
  .fy-optrow-price { font-size: 12.5px; font-weight: 700; color: var(--fy-ink); }
  .fy-optrow-right svg { color: var(--fy-faint); }

  /* Not built yet — visible on purpose, so the gap reads as a roadmap
     rather than an absence. Still clickable, purely to record the intent. */
  .fy-optrow.soon { cursor: default; }
  .fy-optrow.soon:hover { background: transparent; }
  .fy-optrow.soon:active { transform: none; }
  .fy-optrow.soon .fy-optrow-ico { background: var(--fy-bg); border: 1px dashed #dfe3ec; color: var(--fy-faint); }
  .fy-optrow.soon:hover .fy-optrow-ico { background: var(--fy-bg); color: var(--fy-faint); }
  .fy-optrow.soon .fy-optrow-title { color: var(--fy-muted); font-weight: 600; }
  .fy-optrow.soon .fy-optrow-sub { color: var(--fy-faint); }
  .fy-optrow-soon-pill { font-size: 10px; font-weight: 700; color: var(--fy-muted); background: var(--fy-field); border-radius: 999px; padding: 4px 9px; white-space: nowrap; }
`;

function renderOptionRow(opt: PanOption): string {
  const chevron = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>`;

  const right = opt.available
    ? `<span class="fy-optrow-price">${opt.price}</span>${chevron}`
    : `<span class="fy-optrow-soon-pill" data-i18n="chooser.soon">Soon</span>`;

  return `
    <button class="fy-optrow${opt.available ? "" : " soon"}" data-slug="${opt.slug}" data-title="${opt.title}">
      <span class="fy-optrow-ico">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${opt.icon}</svg>
      </span>
      <span class="fy-optrow-text">
        <span class="fy-optrow-title" data-i18n="${opt.titleKey}">${opt.title}</span>
        <span class="fy-optrow-sub" data-i18n="${opt.subKey}">${opt.subtitle}</span>
      </span>
      <span class="fy-optrow-right">${right}</span>
    </button>
  `;
}

export function renderChooserScreen(): string {
  return `
    <div id="fy-chooser" class="fy-screen" style="display:none;flex-direction:column;height:100%;background:var(--fy-bg);">
      ${renderHeader({
        subtitle: "Choose your application",
        leftHtml: `
          <button class="fy-hdr-back" id="fy-chooser-back" aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>`,
      }).replace(
        '<div class="fy-hdr-sub">Choose your application</div>',
        '<div class="fy-hdr-sub" data-i18n="chooser.header">Choose your application</div>',
      )}

      <div style="flex:1;overflow-y:auto;padding:22px 12px 20px;">
        <div style="padding:0 12px;margin-bottom:14px;">
          <h1 data-i18n="chooser.title" style="font-size:19px;font-weight:800;color:var(--fy-ink);letter-spacing:-0.4px;line-height:1.3;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
            What do you need?
          </h1>
          <p data-i18n="chooser.sub" style="margin-top:5px;font-size:12.5px;color:var(--fy-muted);line-height:1.55;">
            Pick one — we'll fill that government form for you.
          </p>
        </div>

        ${PAN_OPTIONS.map(renderOptionRow).join("")}

        <div style="margin-top:20px;padding:0 12px;">
          <div class="fy-quietrow">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/></svg>
            <span data-i18n-html="chooser.hint_html">Not sure? Pick <strong>Correct existing PAN</strong> only if you already hold one — applying twice is an offence.</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function showChooser(): void {
  const screens = ["fy-home", "fy-payment", "fy-filling", "fy-verify", "fy-recover"];
  screens.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  // The wizard is appended dynamically rather than pre-rendered, so it needs
  // removing (not hiding) when we come back to this screen.
  document.getElementById("fy-userform-screen")?.remove();

  const chooser = document.getElementById("fy-chooser");
  if (chooser) chooser.style.display = "flex";

  const panel = document.getElementById("formyaar-panel");
  if (panel) panel.style.right = "0px";

  trackEvent("chooser_shown");
}

export function attachChooserHandlers(): void {
  document.getElementById("fy-chooser-back")?.addEventListener("click", () => {
    const chooser = document.getElementById("fy-chooser");
    if (chooser) chooser.style.display = "none";
    const home = document.getElementById("fy-home");
    if (home) home.style.display = "flex";
  });

  document.querySelectorAll<HTMLElement>("#fy-chooser .fy-optrow").forEach((row) => {
    row.addEventListener("click", () => {
      const slug = row.dataset.slug ?? "";
      const title = row.dataset.title ?? "";

      if (!slug) {
        // Nothing to open — record the demand and acknowledge the tap, so the
        // row doesn't feel broken.
        trackEvent("locked_form_clicked", "pan_card", { option: title });
        const pill = row.querySelector<HTMLElement>(".fy-optrow-soon-pill");
        if (pill && pill.dataset.ack !== "1") {
          pill.dataset.ack = "1";
          const original = pill.textContent ?? "Soon";
          pill.textContent = "Noted 👍";
          setTimeout(() => {
            pill.textContent = original;
            delete pill.dataset.ack;
          }, 1800);
        }
        return;
      }

      trackEvent("form_selected", slug);
      // Same event the Android chooser fires, so "which service do people
      // pick" is one number across both clients rather than two half-numbers.
      trackEvent("service_type_selected", slug, { type: slug });
      showUserForm(slug);
    });
  });
}
