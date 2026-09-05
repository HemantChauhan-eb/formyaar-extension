import {
  SITE_CONFIGS,
  BANNER_DELAY_MS,
  BACKEND_URL,
  NSDL_START_URL,
} from "./constants";
import { showContextualBanner, showVerifyScreen } from "./panel";
import { detectSiteError, showSiteError } from "./panel/statusScreens";
import { showUploadScreen } from "./uploadScreen";
import { watchStepReview } from "./stepReview";
import { runAutofill, showCoachMark } from "./autofill";
import {
  getUserData,
  resolveFormSlug,
  getActiveSession,
  restartAutofillFlow,
  type AutofillActive,
} from "./userData";
import { trackEvent } from "./telemetry";

export default defineContentScript({
  matches: [
    "*://*.proteantech.in/*",
    "*://*.nsdl.com/*",
    "*://*.utiitsl.com/*",
    "*://*.passporthub.gov.in/*",
    "*://*.sarathi.parivahan.gov.in/*",
    "*://formyaar.in/*",
  ],
  async main() {
    if (import.meta.env.DEV)
      console.log("FormYaar loaded on:", window.location.href);

    const hostname = window.location.hostname;

    // Before anything else decides what to show.
    //
    // The government site can serve an error page at *any* of its URLs — the
    // session-expired screen appears at registerEndUser.html, at
    // fullFormSave.html?ID=…, anywhere. So every branch below is reached with
    // a URL that looks right and a page that is dead, and each one confidently
    // shows its own screen: the document branch shows upload instructions, the
    // fill shows "Step complete!". Checking inside the fill engine only fixed
    // the branch that goes through the fill engine.
    //
    // This has to be first, and it has to return, because the question "is
    // this page usable at all" comes before "which step is it".
    if (SITE_CONFIGS[hostname]) {
      const siteError = detectSiteError();
      if (siteError) {
        await showContextualBanner("siteerror");
        showSiteError(siteError, () => {
          // Clear where the dead run had got to, keep who they are and that
          // they paid, then go back to the first page.
          void restartAutofillFlow().then(() => {
            window.location.href = NSDL_START_URL;
          });
        });
        const session = await getActiveSession();
        trackEvent("site_error", session?.form, {
          reason: siteError.title,
          url: window.location.pathname,
        });
        return;
      }
    }

    // NSDL document-upload flow. After "Save draft" the user lands on
    // fullFormSave.html (the review + document-upload page); each uploaded file
    // then reloads the page with a fresh ?ID= query param (sometimes as
    // uploadDocument.html). Clicking the individual Photo/Signature "Upload"
    // buttons (photoUploadForm/signUploadForm) instead lands on
    // uploadFile.html?ID=...&type=1|2, a distinct URL from the same reload
    // pattern. We key off the pathname — stable across those reloads — so
    // the panel keeps showing upload guidance instead of the generic "Step
    // complete!" verify screen, the home screen, or a "page not recognized"
    // fallback once the URL/ID changes.
    //
    // Once the user clicks "Submit" (#submitFormSTM) on that same
    // fullFormSave.html, the site re-renders it into a post-upload review
    // state — same pathname, but with #confirmSubmit ("Proceed") /
    // #cancelConfirm ("Edit") buttons and an editable first-8-Aadhaar-digits
    // field, and none of the upload widgets. #aadhaarNo_1 is NOT a reliable
    // signal for this — it's present (readonly) on the upload page too, from
    // the Personal Details fieldset in the same single-page app. #confirmSubmit
    // only ever renders on the review state, so that state should run the
    // normal step-matching flow (so the "enter first 8 digits, then click
    // Proceed" guidance shows) instead of being swallowed by the upload screen.
    const pathname = window.location.pathname;
    const isDocUploadPage =
      hostname === "onlineservices.proteantech.in" &&
      (pathname.includes("fullFormSave") ||
        pathname.includes("uploadDocument") ||
        pathname.includes("uploadFile")) &&
      !document.getElementById("confirmSubmit");

    // The government site loaded and the content script got to run on it.
    // load_success is always true here by construction — if the page failed
    // to load there would be no script to report it — but the field is kept
    // so the shape matches the Android app, which can see a failed load.
    if (hostname === "onlineservices.proteantech.in") {
      getActiveSession().then((session) => {
        if (session && !session.completed) {
          trackEvent("govt_site_opened", session.form, { load_success: true });
        }
      });
    }

    // ── The real conversion ─────────────────────────────────────────
    // Payment says money moved; this says an application was actually lodged
    // with the government. The gap between the two is the paid non-customer —
    // someone who paid ₹39, stalled on NSDL and never submitted — and nothing
    // recorded that they existed.
    //
    // Same page list the Android app uses (TERMINAL_PAGES in MainActivity),
    // so both clients mean the same thing by "submitted". Guarded through
    // storage.session because a terminal page can be reloaded or returned to
    // with Back, and each would otherwise count as another submission.
    if (hostname === "onlineservices.proteantech.in") {
      const terminal = [
        "fullFormSubmit",
        "ddSave",
        "continuePayment",
        "paytmResponseAfterStatus",
      ].some((p) => pathname.includes(p));

      if (terminal) {
        getActiveSession().then((session) => {
          const key = `fy_submitted_${session?.order_id ?? "unknown"}`;
          browser.storage.session.get(key).then((seen) => {
            if (seen[key]) return;
            browser.storage.session.set({ [key]: true });
            const page = pathname.split("/").pop()?.slice(0, 80) ?? "";
            trackEvent("govt_form_submitted", session?.form ?? "pan_card", {
              page,
            });
            // Same moment, separate question: one is "was it lodged", the
            // other is "did the person actually see proof of it". The
            // acknowledgement number is deliberately not scraped — it
            // identifies a real application and nothing here needs it.
            trackEvent("confirmation_screen_view", session?.form ?? "pan_card", {
              page,
            });
          });
        });
      }
    }

    // Message listener
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === "OPEN_PANEL") {
        showContextualBanner();
      }
      if (message.type === "PAYMENT_VERIFIED") {
        const orderId = message.order_id ?? "";

        getUserData().then((userData) => {
          const formSlug = resolveFormSlug(userData);

          // The paid conversion, matching the Android app's own
          // payment_success. Fired here because this is the point the
          // extension learns the payment was verified — the panel that
          // started it may be on a different tab by now.
          trackEvent("payment_success", formSlug, { order_id: orderId });

          // Persist session server-side (payment proof only — no form data)
          if (userData.mobile) {
            fetch(`${BACKEND_URL}/payment/save-session`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                order_id: orderId,
                mobile: userData.mobile,
                form_type: formSlug,
              }),
            }).catch(() => {});
          }

          Promise.all([
            browser.storage.session.set({ autofillActive: { form: formSlug, done: [] } }),
            browser.storage.local.set({
              fy_active_session: {
                form: formSlug,
                order_id: orderId,
                paid_at: Date.now(),
                completed: false,
              },
            }),
          ]).then(() => {
            if (hostname === "onlineservices.proteantech.in") {
              // Already on NSDL — run autofill directly on this page
              runAutofill(formSlug);
            } else {
              // Navigate to NSDL — autofill runs on page load via autofillActive
              window.location.href = NSDL_START_URL;
            }
          }).catch((err) => console.warn("FormYaar: could not save autofill state", err));
        });
      }
    });
    // Re-run autofill when user moves to next step on endUserLogin
    if (hostname === "onlineservices.proteantech.in") {
      document.addEventListener("click", async (e) => {
        const target = e.target as HTMLElement;
        if (
          target.classList.contains("button-next") ||
          target.closest(".button-next")
        ) {
          // Ignore programmatic clicks from autofill auto-advance — handled there
          if ((window as any).__fy_auto_advancing) return;
          const result = await browser.storage.session.get("autofillActive");
          const active = result.autofillActive as { form: string } | undefined;
          if (!active) return;

          // Wait for stepy to show the next fieldset
          const observer = new MutationObserver(() => {
            const visible = document.querySelector(
              '.stepy-step:not([style*="display: none"])',
            );
            if (visible) {
              observer.disconnect();
              setTimeout(() => runAutofill(active.form), 300);
            }
          });

          observer.observe(document.body, {
            subtree: true,
            attributes: true,
            attributeFilter: ["style"],
          });

          // Safety fallback — disconnect after 3 seconds if nothing happens
          setTimeout(() => observer.disconnect(), 3000);
        }
      });
    }
    // Document-upload page: open the panel straight to the upload guidance
    // screen on every load (survives the self-reloads with changing ?ID=).
    if (isDocUploadPage) {
      // Opened directly on the upload screen. Naming it here rather than
      // letting the panel appear on home and switch a moment later is the
      // difference between "FormYaar knows where I am" and a flash of a
      // screen the applicant left several steps ago.
      showContextualBanner("upload");
      // ...but not for a minor's application, which uploads nothing at all:
      // it is printed, signed and posted to Protean. This page is only a
      // review-and-pay stop on that flow, so upload guidance here would be
      // instructions for a step that doesn't exist. Resolved from the active
      // session because this branch keys off the URL, which is the same for
      // every form. Async, so the guidance is suppressed rather than never
      // shown — the alternative is blocking the whole branch on a storage read.
      getActiveSession().then((session) => {
        if (session?.form === "minor_pan_card") {
          // They still have to act on this page — it just isn't uploading.
          showVerifyScreen({
            title: "Form filled & saved!",
            subtitle: "Check it over, then submit",
            manual_steps: [
              "Review the form and click <strong>Submit</strong>",
              "Enter the <strong>first 8 digits of the applicant's Aadhaar</strong>, then <strong>Proceed</strong>",
              "Pay the government fee",
              "<strong>Print the form, sign it, attach the documents and post it to Protean, Pune</strong>",
            ],
            info: "A minor's application can't be completed online — eKYC and e-Sign aren't available for it, so the last step is physical. The address is printed on the acknowledgement.",
          });
          return;
        }
        showUploadScreen();
      });
      // Both of these re-run on every load: the page reloads itself after each
      // uploaded document and comes back with its defaults restored.
      // DigiLocker is the site's default upload method and we don't support
      // it, so put the applicant on manual upload first.
      selectManualDocUpload();
      // The upload page resets the eKYC photo-consent dropdown on every
      // self-reload, so Submit errors with "please select a consent". Re-apply
      // it on each load so it survives however many documents the user uploads.
      reapplyEkycConsent();
      // "I/We have enclosed ___ (number of documents)" is the one declaration
      // field we deliberately never autofill — the real count isn't knowable
      // until the applicant has actually uploaded, and the upload widget can
      // merge several documents into a single PDF. Point at it here rather
      // than from the step config: the step that fills the rest of the
      // declaration runs on endUserLogin and navigates here on Save Draft, so
      // a coach mark raised there is destroyed before it can be read. Skipped
      // once the box has a value, so it stops nagging after they fill it in.
      // Not for a minor: nothing is enclosed on this page for that flow, so
      // the "how many documents" prompt would be pointing at a box the
      // applicant has no answer for.
      getActiveSession().then((session) => {
        if (session?.form !== "minor_pan_card") coachDocumentCount();
      });
      // This page still renders the full stepper, so the applicant can click
      // back through the steps they've already filled. Returning to the
      // document step restores the upload guidance they need here.
      watchStepReview(() => showUploadScreen());
    } else if (SITE_CONFIGS[hostname] || hostname === "formyaar.in") {
      // Show contextual banner on supported sites + formyaar website, but not
      // on the payment page: the user is mid-checkout and about to be sent
      // back to the form, so a "start your PAN application" prompt there is
      // just one more thing to decode.
      const isPayPage = /^\/pay(\.html)?$/.test(window.location.pathname);
      if (!isPayPage)
        setTimeout(() => showContextualBanner(), BANNER_DELAY_MS);
    }

    // Allow formyaar.in buttons to open the panel via a custom DOM event
    if (hostname === "formyaar.in") {
      document.addEventListener("fy:open-panel", async () => {
        await showContextualBanner();
        const p = document.getElementById("formyaar-panel");
        if (p) p.style.right = "0px";
      });

      // The /pay page announces a confirmed payment here. Treated purely as a
      // "check now" nudge — the page can't prove anything, the background
      // re-verifies with the backend before the form is unlocked.
      document.addEventListener("fy:payment-done", () => {
        browser.runtime.sendMessage({ type: "PAYMENT_CHECK_NOW" });
      });
    }

    // Auto-run autofill on page load only for pages not yet seen in this flow.
    // Skip the document-upload page — it's guidance-only (handled above) and
    // has no autofillable step, so matchStep would flash "page not recognized".
    if (SITE_CONFIGS[hostname] && !isDocUploadPage) {
      try {
        const result = await browser.storage.session.get("autofillActive");
        const active = result.autofillActive as AutofillActive | undefined;
        if (active) {
          const pageKey = window.location.pathname;
          const isTokenPage = !!document.querySelector("input.tokenButton");
          const done = active.done ?? [];
          if (isTokenPage || !done.includes(pageKey)) {
            if (!isTokenPage) {
              await browser.storage.session.set({
                // skipOverlay is consumed here: it applies to the first page
                // after a restart and to nothing else.
                autofillActive: { ...active, done: [...done, pageKey], skipOverlay: false },
              });
            }

            // First page of the flow (done was empty) → show start overlay
            // so the user knows to switch to this tab and confirm before autofill starts.
            // Subsequent pages (mid-flow) run directly — don't interrupt mid-fill.
            //
            // A restart is the exception: the applicant pressed "Start again"
            // a moment ago and is looking straight at the tab, so asking them
            // to confirm they meant it is a second click for nothing.
            const isFirstPage = done.length === 0 && !isTokenPage;
            if (isFirstPage && !active.skipOverlay) {
              // Panel must exist before showStartOverlay — showFillingScreen crashes otherwise.
              // showContextualBanner creates the panel div synchronously before its first await,
              // so calling it here (fire-and-forget) guarantees the panel is in the DOM.
              showContextualBanner();
              showStartOverlay(active.form);
            } else {
              // Open straight onto the filling screen. The fill itself waits
              // 1.5s for the page to settle, and the applicant should be
              // looking at "we're typing" for that second and a half rather
              // than at a home screen they have long since moved past.
              showContextualBanner("filling");
              setTimeout(() => runAutofill(active.form), 1500);
            }
          }
        }
      } catch (err) {
        console.warn("FormYaar: could not check autofill state", err);
      }

      // Follow the stepper here too, so a step can be reviewed part-way
      // through the flow and not only from the document page at the end. No
      // restore callback: on this page the fill owns the panel, and the guard
      // inside the watcher keeps it from interfering while one is running.
      watchStepReview();
    }
  },
});

// ─── Start overlay ────────────────────────────────────────────────────
// Shown on the very first NSDL page after payment so the user can
// consciously kick off the autofill after switching back to this tab.
function showStartOverlay(form: string): void {
  const originalTitle = document.title;

  // Pulse the tab title so the user notices this tab in the background
  let pulse = true;
  const titleInterval = setInterval(() => {
    document.title = pulse
      ? "⚡ FormYaar — click here!"
      : "👆 Your PAN form is ready";
    pulse = !pulse;
  }, 900);

  const overlay = document.createElement("div");
  overlay.id = "fy-start-overlay";
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 2147483646;
    background: rgba(10,10,46,0.72);
    backdrop-filter: blur(3px);
    display: flex; align-items: center; justify-content: center;
    font-family: 'DM Sans', -apple-system, sans-serif;
    animation: fyOverlayIn 0.35s ease;
  `;

  const styleEl = document.createElement("style");
  styleEl.textContent = `
    @keyframes fyOverlayIn { from { opacity:0; } to { opacity:1; } }
    @keyframes fyCardIn { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
    #fy-start-card { animation: fyCardIn 0.4s 0.1s ease both; }
    #fy-start-btn:hover { background: #1a3aaa !important; }
    #fy-start-btn:active { transform: scale(0.97); }
  `;
  document.head.appendChild(styleEl);

  overlay.innerHTML = `
    <div id="fy-start-card" style="
      background:#fff; border-radius:20px; padding:40px 36px;
      max-width:380px; width:calc(100% - 48px);
      text-align:center; box-shadow:0 24px 64px rgba(0,0,0,0.35);
    ">
      <div style="font-size:52px;margin-bottom:16px;">📋</div>
      <div style="font-size:22px;font-weight:800;color:#0a0a2e;margin-bottom:10px;line-height:1.3;">
        Ready to fill your PAN card?
      </div>
      <div style="font-size:14px;color:#64748b;line-height:1.65;margin-bottom:28px;">
        FormYaar will auto-fill the entire application for you.<br>
        Just sit back — it takes about 2–3 minutes.
      </div>
      <button id="fy-start-btn" style="
        width:100%; padding:15px; background:#000080; color:#fff;
        border:none; border-radius:12px; font-size:16px; font-weight:800;
        cursor:pointer; font-family:inherit; letter-spacing:0.3px;
        transition: background 0.15s, transform 0.1s;
      ">
        Start filling →
      </button>
      <div style="margin-top:14px;font-size:12px;color:#94a3b8;">
        Powered by FormYaar · your details are saved locally
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("fy-start-btn")!.addEventListener("click", () => {
    // The applicant opting in to the fill, as distinct from the fill itself
    // starting — the gap between the two is how long the overlay sat unread.
    trackEvent("autofill_start_click", form);
    clearInterval(titleInterval);
    document.title = originalTitle;
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 0.2s ease";
    setTimeout(() => {
      overlay.remove();
      styleEl.remove();
      runAutofill(form);
    }, 200);
  });
}

// ─── Force "Manual Document Upload" on the document-upload page ───────
// NSDL added a DigiLocker upload option and made it the default. That path
// fetches documents from the applicant's DigiLocker account and FormYaar has
// no part in it — so the applicant lands on a section we can't guide them
// through, on the one page that already causes the most support load.
// Selecting the manual radio puts them back on the flow we support.
//
// Setting `.checked` isn't enough on its own: the page keeps the manual
// upload UI (#hideManualDocDiv) hidden until its own handler runs, and that
// handler is bound to the radio's click/change. So dispatch a real click and
// nudge jQuery too, then keep checking until the manual section is actually
// on screen — the page's scripts initialise on jQuery-ready, which can land
// either side of our content script. Same race, same remedy as the eKYC
// consent below.
function selectManualDocUpload(): void {
  let tries = 0;
  const tick = () => {
    tries += 1;
    const done = applyManualDocUpload();
    if (!done && tries < 15) setTimeout(tick, 300);
  };
  tick();
}

// Returns true once the manual radio is selected AND the manual upload
// section is visible — until both hold, the caller keeps retrying.
function applyManualDocUpload(): boolean {
  const radio = document.getElementById("manualDoc") as HTMLInputElement | null;
  if (!radio) return false;

  const manualDiv = document.getElementById("hideManualDocDiv");
  // offsetParent goes null for a display:none ancestor, which is exactly how
  // the page hides this section.
  const manualVisible = !!manualDiv && manualDiv.offsetParent !== null;

  if (!radio.checked) {
    // A real click sets .checked and fires the events the page listens for.
    radio.click();
  } else if (!manualVisible) {
    // Already selected but the section is still hidden — the page's handler
    // probably bound after our click. Re-fire what it listens for.
    radio.dispatchEvent(new Event("click", { bubbles: true }));
    radio.dispatchEvent(new Event("change", { bubbles: true }));
  }

  try {
    const jq = (window as any).$;
    if (jq) jq(radio).trigger("change");
  } catch {
    // no jQuery yet — the native click above already applied
  }

  return radio.checked && !!manualDiv && manualDiv.offsetParent !== null;
}

// ─── Re-apply eKYC photo consent on the document-upload page ──────────
// The NSDL upload page renders a select2-enhanced "photo visible on Aadhaar"
// consent dropdown (#consentEkyc) that resets to "-----Please Select-----"
// on every self-reload after an Upload. Clicking Submit then errors with
// "please select a consent". We re-select "Y" on each page load, setting the
// native <select> value AND triggering a jQuery change so select2's visible
// label updates. select2 initialises on the page's own jQuery-ready, which can
// land before or after our content script, so we poll briefly to win the race.
// The declaration's document-count box. Both spellings are tried because the
// id is what endUserLogin's markup uses and the name is what the form posts —
// fullFormSave.html renders the same declaration in its own layout, and we
// have no saved copy of it to confirm the id survives.
const DOC_COUNT_SELECTOR = '#noOfDocs, input[name="no_Of_documents"]';

function coachDocumentCount(): void {
  let tries = 0;
  const tick = () => {
    tries += 1;
    const box = document.querySelector(DOC_COUNT_SELECTOR) as HTMLInputElement | null;
    // Already answered, or our own mark is already up — nothing to do.
    if (box?.value.trim() || document.getElementById("fy-coach-mark")) return;
    if (box) {
      showCoachMark(
        DOC_COUNT_SELECTOR,
        "After uploading, enter how many documents you've uploaded",
      );
      return;
    }
    // Same reasoning as reapplyEkycConsent: the page renders progressively, so
    // give it a few seconds before concluding the box isn't there.
    if (tries < 15) setTimeout(tick, 300);
    else if (import.meta.env.DEV)
      console.warn("FormYaar: document-count box never appeared on this page");
  };
  tick();
}

function reapplyEkycConsent(): void {
  let tries = 0;
  const tick = () => {
    tries += 1;
    const done = applyConsentValue();
    // Keep re-asserting for a few seconds: covers select2's init race and any
    // late reset the page performs after the initial render.
    if (!done && tries < 15) setTimeout(tick, 300);
  };
  tick();
}

// Returns true once "Y" is selected AND select2 is initialised (so the visible
// label reflects it) — the caller stops polling then. Returns false while the
// options/select2 aren't ready yet, so the caller retries.
function applyConsentValue(): boolean {
  const select = document.getElementById("consentEkyc") as HTMLSelectElement | null;
  if (!select) return false;

  let idx = -1;
  for (let i = 0; i < select.options.length; i++) {
    if (select.options[i].value === "Y") {
      idx = i;
      break;
    }
  }
  if (idx === -1) return false; // options not populated yet

  if (select.selectedIndex !== idx) {
    select.selectedIndex = idx;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Sync select2's rendered label if it's present.
  try {
    const jq = (window as any).$;
    if (jq && jq(select).data && jq(select).data("select2")) {
      jq(select).trigger("change");
      return true;
    }
  } catch {
    // fall through — native value is still set
  }
  return false;
}
