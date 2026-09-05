// The one way a panel screen changes.
//
// Before this file there were four conventions, and they disagreed:
//
//   showFillingScreen / showVerifyScreen  hid every .fy-screen (correct)
//   showChooser                           hid a hardcoded list of 5
//   showUserForm                          hid a hardcoded list of 6
//   the operator screens                  toggled each other in pairs
//
// Neither hardcoded list included fy-upload, so opening the chooser or the
// wizard on the document page left the upload screen underneath, and any
// screen added later would have been missed by both. The wizard was a fifth
// case again: appended to the panel and removed rather than hidden, so it had
// a different lifecycle from everything around it.
//
// And nothing owned the question "what is on screen right now", so nothing
// could answer it — which is why an unrecognised page left the previous
// screen up rather than saying so.
//
// Now: setView() is the only thing that changes a screen. It hides everything
// and shows one thing, so two screens cannot be visible at once, and a screen
// added tomorrow is handled without touching this file.

import { PANEL_WIDTH } from "../constants";

export const VIEWS = {
  home: "fy-home",
  chooser: "fy-chooser",
  userform: "fy-userform-screen",
  payment: "fy-payment",
  filling: "fy-filling",
  verify: "fy-verify",
  upload: "fy-upload",
  recover: "fy-recover",
  maintenance: "fy-maintenance",
  update: "fy-update",
  // Real states, not the absence of one. The old code had no way to say "this
  // page isn't part of your application" or "the form rejected that step", so
  // it said nothing and left whatever was already up on screen.
  offtrack: "fy-offtrack",
  blocked: "fy-blocked",
  siteerror: "fy-siteerror",
  operatorLogin: "fy-operator-login",
  operatorQueue: "fy-operator-queue",
  operatorReview: "fy-operator-review",
} as const;

export type ViewId = keyof typeof VIEWS;

/**
 * Screens that aren't in the panel's initial markup and have to be built on
 * demand. The intake wizard is the only one today: it renders per flow and
 * per applicant, so baking it into the shell would mean re-rendering and
 * re-binding it anyway.
 */
const mounters = new Map<ViewId, () => void>();

export function registerMount(view: ViewId, mount: () => void): void {
  mounters.set(view, mount);
}

type Listener = (view: ViewId | null) => void;
const listeners: Listener[] = [];

/** Told on every change. Used for telemetry and, on Android, the Back key. */
export function onViewChange(fn: Listener): void {
  listeners.push(fn);
}

const stack: ViewId[] = [];

export function currentView(): ViewId | null {
  for (const [view, id] of Object.entries(VIEWS) as [ViewId, string][]) {
    const el = document.getElementById(id);
    if (el && el.style.display !== "none") return view;
  }
  return null;
}

export interface SetViewOptions {
  /**
   * Remember where we came from, so back can return there. Off by default:
   * most transitions are the flow moving forward on its own, and only a
   * deliberate navigation should be somewhere to come back to.
   */
  push?: boolean;
  /** Leave the panel collapsed if it already was. */
  keepCollapsed?: boolean;
}

/**
 * Show one screen and hide every other.
 *
 * Selects on the .fy-screen class rather than a list of ids on purpose: a
 * screen added later is hidden correctly without anyone remembering to come
 * back here, which is exactly what the two hardcoded lists failed to do.
 */
export function setView(view: ViewId, opts: SetViewOptions = {}): void {
  const targetId = VIEWS[view];
  const from = currentView();

  if (opts.push && from && from !== view) stack.push(from);

  // Build it if it isn't in the DOM yet.
  if (!document.getElementById(targetId)) mounters.get(view)?.();

  document.querySelectorAll<HTMLElement>(".fy-screen").forEach((el) => {
    el.style.display = el.id === targetId ? "flex" : "none";
  });

  const panel = document.getElementById("formyaar-panel");
  if (panel && !opts.keepCollapsed) panel.style.right = "0px";

  for (const fn of listeners) fn(view);
}

/** Returns false when there's nowhere to go — the caller decides what that means. */
export function goBack(): boolean {
  const previous = stack.pop();
  if (!previous) return false;
  setView(previous);
  return true;
}

export function resetStack(): void {
  stack.length = 0;
}

export function isPanelOpen(): boolean {
  const panel = document.getElementById("formyaar-panel");
  return !!panel && panel.style.right === "0px";
}

export function closePanel(): void {
  const panel = document.getElementById("formyaar-panel");
  if (panel) panel.style.right = `-${PANEL_WIDTH}px`;
}
