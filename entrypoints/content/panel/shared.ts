export function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Brand pen glyph (white stroke) — used in headers and the side tab.
export const BRAND_PEN_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5l4 4L8 20l-4.6 1 1-4.6z"/><path d="M12.5 7.5l4 4"/></svg>`;

/**
 * Minimal white header. One quiet row: optional back button, small brand,
 * optional right slot. No colored bars — hierarchy comes from whitespace.
 */
export function renderHeader(opts: {
  subtitle?: string;
  leftHtml?: string;
  rightHtml?: string;
}): string {
  return `
    <div class="fy-hdr">
      ${opts.leftHtml ?? ""}
      <div class="fy-hdr-brand">
        <span class="fy-brandmark">${BRAND_PEN_SVG}</span>
        <div>
          <div class="fy-hdr-name">FormYaar</div>
          ${opts.subtitle ? `<div class="fy-hdr-sub">${opts.subtitle}</div>` : ""}
        </div>
      </div>
      ${opts.rightHtml ?? ""}
    </div>
  `;
}

/**
 * A single hairline progress bar under the header — the only "where am I"
 * chrome a flow screen carries. fraction: 0..1.
 */
export function renderProgress(fraction: number): string {
  const pct = Math.max(0, Math.min(100, Math.round(fraction * 100)));
  return `<div class="fy-flowbar"><div class="fy-flowbar-fill" style="width:${pct}%;"></div></div>`;
}

/**
 * Legacy 3-step map — no longer rendered on user screens (replaced by the
 * quieter fy-flowbar) but kept exported for compatibility.
 */
export function renderSteps(step: 1 | 2 | 3): string {
  return renderProgress(step / 3);
}
