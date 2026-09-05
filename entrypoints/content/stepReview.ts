// ─── Step review: the panel follows the site's own stepper ────────────
//
// The panel used to show one thing — whatever the fill reached last. So an
// applicant standing on the document step, who clicks back to "Personal
// Details" to check what went in, still saw upload instructions. The panel and
// the page disagreed about which step was being looked at.
//
// Now clicking a step in NSDL's stepper shows that step's own fill results:
// the same rows, with the same ticks, dashes and warnings, that the applicant
// watched being filled. Nothing is re-derived or re-worded here — the rows are
// replayed exactly as `runAutofill` recorded them, because a summary we
// invented could disagree with what actually happened on the page.
//
// The step the page opened on keeps its normal screen (upload guidance on the
// document page), so returning to it puts the applicant back where they were
// rather than trapping them in review.

import { getCurrentStepyIndex, isFilling } from "./autofill";
import { showStepReview, type ProgressItem } from "./panel";
import { trackEvent } from "./telemetry";

// Read the step's name from the page's own stepper, so the panel calls it
// exactly what the site calls it. Falls back to a number if the markup differs
// from what we expect — a wrong-but-harmless label beats showing nothing.
function stepTitle(idx: number): string {
  const header = document.querySelectorAll(".stepy-header li");
  const text = header[idx]?.textContent?.trim();
  if (text) {
    // The stepper renders "1Guidelines" / "2 Personal Details" — drop the
    // leading step number so the panel heading reads as a name.
    const cleaned = text.replace(/^\s*\d+[\s.)-]*/, "").trim();
    if (cleaned) return cleaned;
  }
  const legend = document
    .querySelectorAll(".stepy-step")
    [idx]?.querySelector("legend")
    ?.textContent?.trim();
  return legend || `Step ${idx + 1}`;
}

/**
 * Send the applicant back to the step the fill had reached.
 *
 * Driven through the site's own stepper rather than by showing/hiding its
 * fieldsets ourselves: the widget keeps its own idea of which step is current,
 * and moving the markup without telling it leaves the two disagreeing — the
 * next Next button then goes somewhere neither of us expected.
 *
 * jQuery first for the same reason the auto-advance uses it: the widget binds
 * through jQuery's event delegation and does not always answer a raw
 * dispatchEvent.
 */
function jumpToStep(idx: number): void {
  const header = document.querySelectorAll<HTMLElement>(".stepy-header li");
  const target = header[idx];
  if (!target) return;

  const jq = (window as unknown as { $?: (el: Element) => { trigger: (e: string) => void } }).$;
  if (jq) jq(target).trigger("click");
  else target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

  trackEvent("step_review_continue", undefined, { from_step: idx });
}

async function historyFor(idx: number): Promise<ProgressItem[] | null> {
  try {
    const res = await browser.storage.session.get("fillHistory");
    const history = (res.fillHistory ?? {}) as Record<string, ProgressItem[]>;
    const items = history[String(idx)];
    return Array.isArray(items) && items.length > 0 ? items : null;
  } catch {
    return null; // storage unavailable — just leave the panel alone
  }
}

/**
 * Start following the page's stepper.
 *
 * `restoreDefault` is what the panel should show when the applicant returns to
 * the step the page opened on — the caller owns that, since it differs per
 * page (upload guidance on the document page, nothing elsewhere).
 */
export function watchStepReview(restoreDefault?: () => void): void {
  const stepper =
    document.querySelector(".stepy-header") ??
    document.querySelector(".stepy-clickable");
  if (!stepper) return;

  // Whatever step the page opened on is "home" — it keeps its normal screen.
  const homeIdx = getCurrentStepyIndex();
  let lastIdx = homeIdx;

  const check = () => {
    // Never fight a running fill: it drives the stepper itself, and those
    // changes are indistinguishable from a click.
    if (isFilling()) return;

    const idx = getCurrentStepyIndex();
    if (idx === -1 || idx === lastIdx) return;
    lastIdx = idx;

    if (idx === homeIdx) {
      restoreDefault?.();
      return;
    }
    void historyFor(idx).then((items) => {
      // No record for this step (never filled, or a fresh session) — leave the
      // panel as it is rather than blanking it.
      if (items) showStepReview(stepTitle(idx), items, () => jumpToStep(homeIdx));
    });
  };

  // stepy marks the active step with a class and toggles fieldset display, so
  // watch attributes on the stepper subtree rather than polling.
  new MutationObserver(check).observe(stepper, {
    attributes: true,
    subtree: true,
    attributeFilter: ["class", "style"],
  });

  // Belt and braces: if this build of stepy re-renders the header instead of
  // re-classing it, the observer above may miss it. A delayed post-click read
  // catches that without polling on a timer.
  document.addEventListener("click", () => setTimeout(check, 80), true);
}
