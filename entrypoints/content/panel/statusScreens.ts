// Two states the panel could not previously express.
//
// The old engine had one answer for "I don't know where we are": say nothing.
// matchStep returning null wrote "Page not recognized" into the progress list
// and left whatever screen was already up on display — so an applicant who
// clicked something unexpected saw the last step's panel, confidently telling
// them about a step they had left. That is the single most-reported symptom of
// the old panel, and it was not a bug in any one place. It was the absence of
// a state.
//
// Advancing had the same gap. The fill clicked Next, polled for four seconds,
// and on failure showed a generic "Review required" verify screen — the same
// screen used to celebrate a completed step, with different words.

import { renderHeader } from "./shared";

export function renderOffTrackScreen(): string {
  return `
    <div id="fy-offtrack" class="fy-screen" style="display:none;flex-direction:column;height:100%;background:var(--fy-bg);">
      ${renderHeader({ subtitle: "Waiting" })}
      <div style="flex:1;overflow-y:auto;padding:44px 26px 24px;text-align:center;">
        <div style="width:52px;height:52px;border-radius:15px;background:var(--fy-field);display:inline-flex;align-items:center;justify-content:center;color:var(--fy-muted);margin-bottom:16px;">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>
        </div>
        <div id="fy-offtrack-title" style="font-size:18px;font-weight:800;color:var(--fy-ink);letter-spacing:-0.4px;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
          This page isn't part of your application
        </div>
        <div id="fy-offtrack-sub" style="margin-top:9px;font-size:12.5px;color:var(--fy-muted);line-height:1.65;max-width:270px;margin-left:auto;margin-right:auto;">
          Nothing is lost. Go back to the form and FormYaar picks up where it left off.
        </div>
      </div>
    </div>
  `;
}

export function renderBlockedScreen(): string {
  return `
    <div id="fy-blocked" class="fy-screen" style="display:none;flex-direction:column;height:100%;background:var(--fy-bg);">
      ${renderHeader({ subtitle: "Needs your attention" })}
      <div style="flex:1;overflow-y:auto;padding:40px 26px 24px;text-align:center;">
        <div style="width:52px;height:52px;border-radius:50%;background:var(--fy-warn-bg);border:1px solid var(--fy-warn-line);display:inline-flex;align-items:center;justify-content:center;color:var(--fy-warn);margin-bottom:16px;">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 8v5"/><path d="M12 16.5v.2"/></svg>
        </div>
        <div id="fy-blocked-title" style="font-size:18px;font-weight:800;color:var(--fy-ink);letter-spacing:-0.4px;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
          The form needs something from you
        </div>
        <div id="fy-blocked-sub" style="margin-top:9px;font-size:12.5px;color:var(--fy-muted);line-height:1.65;max-width:270px;margin-left:auto;margin-right:auto;">
          Fix anything highlighted on the page, then continue.
        </div>
        <div id="fy-blocked-body" style="margin-top:20px;text-align:left;"></div>
      </div>
    </div>
  `;
}

/**
 * The site threw us out.
 *
 * Distinct from `blocked` because the action is different: blocked means fix
 * something on this page and carry on, this means the application is gone and
 * has to be started again. Conflating them is how an applicant ends up staring
 * at a dead page being told to correct a field.
 *
 * This exists because of a real failure: the government session timed out on
 * `registerEndUser.html`, which is a page the config recognises. The step's one
 * action — click `#submitForm` — found nothing, because the error page has no
 * such button. The fill then fell through to the completion screen and the
 * panel said **"Step complete!"** over confetti, on a page whose only content
 * was "Your Session Has Expired". Nothing had completed and nothing could.
 */
export function renderSiteErrorScreen(): string {
  return `
    <div id="fy-siteerror" class="fy-screen" style="display:none;flex-direction:column;height:100%;background:var(--fy-bg);">
      ${renderHeader({ subtitle: "Something went wrong" })}
      <div style="flex:1;overflow-y:auto;padding:40px 26px 24px;text-align:center;">
        <div style="width:52px;height:52px;border-radius:50%;background:var(--fy-danger-bg);border:1px solid var(--fy-danger-line);display:inline-flex;align-items:center;justify-content:center;color:var(--fy-danger);margin-bottom:16px;">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 7.5v5.5"/><path d="M12 16.5v.2"/><circle cx="12" cy="12" r="9"/></svg>
        </div>
        <div id="fy-siteerror-title" style="font-size:18px;font-weight:800;color:var(--fy-ink);letter-spacing:-0.4px;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
          The government site ended your session
        </div>
        <div id="fy-siteerror-sub" style="margin-top:9px;font-size:12.5px;color:var(--fy-muted);line-height:1.65;max-width:272px;margin-left:auto;margin-right:auto;">
          This happens on their side, usually after a pause. Your details are still saved on this device — starting again will refill everything.
        </div>
        <button id="fy-siteerror-restart" class="fy-btn fy-btn-primary fy-btn-block" style="margin-top:22px;">
          Start again
        </button>
        <div style="margin-top:12px;font-size:11px;color:var(--fy-faint);line-height:1.6;">
          You won't be charged again — this is the same paid application.
        </div>
      </div>
    </div>
  `;
}

function setText(id: string, value: string | undefined): void {
  if (value === undefined) return;
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

export function showOffTrack(copy?: { title?: string; subtitle?: string }): void {
  setText("fy-offtrack-title", copy?.title);
  setText("fy-offtrack-sub", copy?.subtitle);
}

export function showBlocked(copy?: { title?: string; subtitle?: string }): void {
  setText("fy-blocked-title", copy?.title);
  setText("fy-blocked-sub", copy?.subtitle);
}

/**
 * Phrases the government site's own error pages.
 *
 * Detected by their text rather than their URL, because the URL is a page the
 * flow legitimately passes through — the session-expired screen is served at
 * `registerEndUser.html`, the same address as the token step. Only the content
 * says anything went wrong.
 */
const SITE_ERRORS: { match: RegExp; title: string; subtitle: string }[] = [
  {
    match: /session\s+has\s+expired/i,
    title: "The government site ended your session",
    subtitle:
      "This happens on their side, usually after a pause. Your details are still saved on this device — starting again will refill everything.",
  },
  {
    match: /you\s+have\s+not\s+logged\s+in/i,
    title: "The government site logged you out",
    subtitle:
      "Your details are still saved on this device. Starting again will refill the form from the beginning.",
  },
];

export interface SiteError {
  title: string;
  subtitle: string;
}

/** Returns the error on this page, or null if it looks normal. */
export function detectSiteError(): SiteError | null {
  // Only the visible text, and only a slice from the top: matching the whole
  // document would eventually reach our own panel copy (appended last), and
  // matching innerHTML would hit any script on the page that happens to
  // mention a session.
  //
  // innerText needs layout and comes back empty if the browser hasn't done it
  // yet, which is exactly when this runs on a page that rendered nothing but
  // an error — so textContent is the fallback rather than the other way round.
  const body = document.body;
  const text = (body?.innerText || body?.textContent || "").slice(0, 2000);
  for (const e of SITE_ERRORS) {
    if (e.match.test(text)) return { title: e.title, subtitle: e.subtitle };
  }
  return null;
}

export function showSiteError(copy: SiteError, onRestart: () => void): void {
  setText("fy-siteerror-title", copy.title);
  setText("fy-siteerror-sub", copy.subtitle);
  const btn = document.getElementById("fy-siteerror-restart");
  if (btn) {
    // Replace rather than add: this screen can be shown more than once in a
    // session, and stacking listeners would open a tab per showing.
    const fresh = btn.cloneNode(true) as HTMLElement;
    btn.replaceWith(fresh);
    fresh.addEventListener("click", onRestart);
  }
}
