# FormYaar Extension — Changelog

## [0.23.3] — 2026-08-27

### Fixed

- `autofill_completed` is sent before a `button_click` field rather than after the loop. The click navigates and tears the content script down, so a step ending in one never reached the completion call — and most step configs end in one. Same defect the Android engine had, found in its telemetry first.

## [0.23.2] — 2026-08-27

### Changed

- **The fill now reports when it works, not only when it breaks.** `step_match_failed`, `field_fill_failed` and `autofill_error` covered every way a fill could fail, and nothing marked one that succeeded — so a failure rate had a numerator and no denominator. `guide_started`/`guide_completed` (names left over from when this guided rather than filled) become `autofill_started`/`autofill_completed`, and the completion event now carries `duration_seconds` plus `filled`/`skipped`/`failed`. Those per-field outcomes were already sitting in the `progress` array and were being discarded.
- The old `guide_*` names stay accepted by the backend, because installed extensions below this version still send them.

## [0.23.1] — 2026-08-27

### Fixed

- Telemetry events carry `client_ts`, stamped before the async id lookup so it reflects when the event happened rather than when the handler got round to sending it. Arrival order at the backend is a race between independent requests and cannot be used to reconstruct a sequence.

## [0.23.0] — 2026-08-27

### Added

- **`anon_id` / `session_id` on every telemetry event.** Attached in `background.ts`, where all events already funnel through one handler, so the ids land in exactly one place and no `trackEvent()` caller can forget them. Without `anon_id` the backend has rows but no funnel — nothing ties a `step1_view` to the `payment_success` by the same person, and drop-off cannot be computed at all.
- `anon_id` lives in `storage.local` (survives restarts, cleared with the extension's data); `session_id` lives in `storage.session` (dies with the browser), so "came back a week later" and "did it in one sitting" read differently. Both are `crypto.randomUUID()` — nothing derived from the user, the browser, or the machine.
- `platform` and `app_version` ride along, so drop-off can be read per build.

## [0.22.1] — 2026-08-26

### Fixed

- The language toggle's own label was `हिं` — a clipped abbreviation that assumed the reader already knew what a shortened Hindi word for "Hindi" looked like. Someone who reads only Hindi is exactly the person this button is for, and they were the ones least likely to recognise it. Spelled out in full both directions now: `हिंदी` and `English`.

## [0.22.0] — 2026-08-25

### Added

- **Hindi translation infrastructure** (`panel/i18n.ts`) — a `STRINGS` dictionary, `t()`, and `applyLang()`. Scoped to what the Android app actually renders: home, chooser, the five-pane intake wizard, and the document-upload screen carry `data-i18n` attributes now; `applyLang()` is never called from the extension's own code, so this is inert here — the desktop panel renders exactly the English text it always has. The toggle itself lives only in the Android app (`app-shell.html`); see its changelog.

## [0.21.0] — 2026-08-24

### Changed

- Point at the migrated Railway backend (`formyaar-backend-production-ad09`). Same three places as the last migration: the `BACKEND_URL` fallback in `constants.ts`, both `.env` files, and — via `backendUrl` in `wxt.config.ts` — the `host_permissions` entry in the manifest. Chrome blocks every request to a host that isn't in `host_permissions`, so all four have to move together.

## [0.20.5] — 2026-08-18

### Added

- **Recovery-contact capture.** The mobile number in the panel's intake form is now sent to the backend the moment it looks complete, not just on final submit. Submit only ever fires at the end of the five-pane wizard, which is exactly the point most applicants who abandon never reach — until now that left nothing recorded anywhere, not even in extension storage, so there was no way to follow up with someone who started and disappeared. A one-line disclosure sits under the field. This is a recovery list only: the sole intended use is checking in with someone who started an application and didn't finish, never marketing. A number is dropped from the outreach list the moment that person pays (backend-side, via the existing save-session call).

## [0.20.4] — 2026-08-18

### Changed

- The panel has a defined left edge instead of relying on its drop shadow alone. Most of the sites it opens over are white, and so is the panel, so the two ran together — a soft shadow was the only thing saying where one ended and the other began. Now a 1px neutral border with a faint blue seam alongside it: readable as a separate surface on white without competing with the page.

## [0.20.3] — 2026-08-17

### Changed

- Two states in the fill list instead of three: filled, or skipped. A field FormYaar couldn't fill now renders as a plain grey "Skipped" row like any deliberate skip, with no warning colour and no "please check it" — applicants were reading that as FormYaar being broken and going looking for a problem that wasn't theirs. No reason is invented for these rows: unlike a real skip there isn't one, and claiming the field wasn't needed could be untrue. The engine still records the two cases separately and still fires `field_fill_failed`, so a broken selector stays visible to us in telemetry while being silent to the user.

## [0.20.2] — 2026-08-17

### Fixed

- **Unchosen options no longer look like failures.** Where the form offers a choice — ePAN vs physical card, the six income sources — only one option gets filled, and every other option was reported as "We couldn't fill this, please check it". On the new-PAN form that meant five of six income rows accusing FormYaar of breaking. Those rows now read as deliberate skips with the reason ("You chose to receive a physical card, so this option is left unselected"). Config-driven, via the same `skip_when_empty` keys.

### Changed

- Progress rows are colour-coded: green for filled, grey with a "Skipped" tag and a reason for anything left alone on purpose, amber with a "Check" tag for the only case that actually needs the user's attention. Filled rows were previously near-black ink with only the tick in green.

## [0.20.1] — 2026-08-17

### Fixed

- Step review no longer opens on top of the document-upload screen. `showFillingScreen`/`showVerifyScreen` hid a hardcoded list of screens that didn't include the upload one, so two panel screens rendered stacked. Both now hide every screen and show only their own.
- The panel can be closed again while reviewing a step. Click-outside-to-close refuses to fire while the filling screen is up so a running fill can't be dismissed by accident; review reuses that screen and inherited the block. The check is now on the screen's mode rather than its visibility.

## [0.20.0] — 2026-08-17

### Added

- **The panel follows the step you're looking at.** It used to show one thing — whatever the fill reached last — so an applicant on the document step who clicked back to "Personal Details" to check what went in still saw upload instructions. Clicking a step in NSDL's own stepper now shows that step's fill results: the same rows, with the same ticks, dashes and warnings, that were watched going in. The rows are replayed exactly as the fill recorded them rather than re-derived, so the panel can't claim something different from what happened on the page. The step the page opened on keeps its normal screen, so returning to it restores the upload guidance instead of trapping the applicant in review. A running fill is never interrupted — it drives the stepper itself, and those moves are indistinguishable from a click.

## [0.19.1] — 2026-08-17

### Fixed

- **Document upload defaults to manual again.** NSDL added a DigiLocker upload option to the document page and made it the default, dropping applicants into a flow FormYaar has no part in — on the page that already generates the most confusion. The manual upload option is now selected automatically on every load of that page. Selecting the radio alone doesn't reveal the manual section (the site keeps it hidden until its own handler fires), so this dispatches a real click and re-asserts until the section is actually on screen, the same way the eKYC consent fix handles the site's initialisation race.

## [0.19.0] — 2026-08-17

### Fixed

- **You're returned to your form automatically after paying.** Previously the payment tab ended on "you can close this tab" while the form tab quietly redirected itself to the government site — two tabs, no clear signal which one to look at, and the most common source of confusion we had. Now the /pay page tells the extension the moment Razorpay confirms; the background verifies with the backend, closes the payment tab, and focuses the form tab. The page reads "Taking you back to your form…" while that happens. The nudge also removes the wait: the poller runs on a `chrome.alarms` interval that Chrome clamps in packed builds, so a paid user could sit on a finished payment for ~30s before anything moved. If nothing has closed the tab after 10s (older build, or the form tab is gone) the manual "close this tab" button reappears, so nobody is stranded.
- **The AO code must be confirmed before you can continue.** The PIN-code check treated "couldn't reach the backend" as good enough to proceed, so anyone offline sailed past it and only discovered the problem at payment. Now nothing but a confirmed AO code opens the gate — an unrecognised PIN, an area we have no code for, and a check that never completed all stop the form, each with its own message. Network failures get a Retry link and re-check themselves when the connection returns, rather than leaving a stale error that only clears if you retype the PIN. Two things this deliberately avoids: the shared Next button is only disabled while the PIN step itself is showing (so navigating back doesn't strand you), and forms with no PIN field — the correction flow — aren't gated at all.
- **Fields we skip on purpose now say so.** Optional government fields the applicant has no value for (passport number, foreign TIN) were reported as filled — `fillText` returns success even for an empty box — while genuine failures shared the same muted row. Deliberate skips now show a reason ("Only needed if you're a non-resident"), and real failures show a warning marker and "We couldn't fill this — please check it". Driven by `skip_when_empty` / `skip_reason` in the form config, so which fields these are stays a backend decision.
- FormYaar's own banner no longer appears over the payment page.

## [0.18.0] — 2026-08-16

### Added

- **Free coupon codes.** A code the backend marks as free takes the total to ₹0, and the pay button becomes "Start filling — free". Razorpay is never opened: the backend hands back a `free_…` order id, the background script recognises the prefix and fires `PAYMENT_VERIFIED` straight back to the tab, so the fill starts immediately and the payment poller never runs. Which codes are free is a backend env var, so codes can be issued or revoked without shipping an extension update.

### Changed

- The receipt's discount amount and the "you saved" chip are now computed from the applied code instead of being hardcoded to ₹10, so a ₹0 code reads "−₹39.00" and "this one's free".

## [0.17.1] — 2026-07-27

### Changed

- Point at the migrated Railway backend (`formyaar-backend-production-d3a3`). Covers the `BACKEND_URL` fallback, both `.env` files, and the `host_permissions` entry in the manifest — without that last one Chrome would block every request to the new host regardless of the code.

## [0.17.0] — 2026-07-26

### Added

- **`correction_pan_card.json` is now bundled with the extension**, alongside `pan_card.json`. Until it's deployed to the backend, the correction flow had no config to run at all — the fetch 404'd and there was no bundled fallback, so it died on "Could not load form config". It now runs offline-first like the new-PAN flow.

### Changed

- **The details wizard now matches what the correction application actually asks for.** Four questions are hidden on that flow because the correction form has no fieldset that consumes them:
  - _PIN code as per Aadhaar_ — exists only to look up an AO code, and the correction form has no AO Code fieldset.
  - _Source of income_ — no such section on the correction form.
  - _Are you a defence personnel?_ — same reason (it's an AO-code branch).
  - _Is your current address the same as your Aadhaar address?_ plus the whole current-address block — the correction form takes the address from Aadhaar under eKYC.
  - _Single parent?_ — NSDL fills this from the existing PAN record and the config never touches it, so asking implied a control the applicant doesn't have.
- `validateUserData()` takes the form slug and no longer demands a PIN code or a source of income on the correction flow — previously those two blocked submission on data nothing would ever read.
- The pre-payment AO-availability modal is skipped on the correction flow. With no PIN field to check, it would have read as "AO unavailable" and shown an empty warning.

## [0.16.1] — 2026-07-26

### Changed

- The correction flow now shows the document-upload screen after Save Draft, the same as the two new-PAN configs, instead of the generic "step complete" panel. `correction_pan_card` joins `FORMS_WITH_DOC_UPLOAD_PAGE`.

## [0.16.0] — 2026-07-26

### Added

- **Two correction-only questions on the wizard's last pane**, rendered only when the chosen application is `correction_pan_card`:
  - _Proof of your existing PAN_ — copy of PAN card / allotment letter / no document. A new-PAN applicant has no PAN to prove, so it stays hidden there.
  - _Do you want a physical PAN card?_ — Yes ₹101 / No ₹66 (e-PAN only). This activates the `wants_physical_pan` plumbing added in 0.15.1, which until now had no way to be set.
- `UserData.proof_of_pan`, defaulting to "Copy of Pan Card".
- Progress labels for the correction form's step-4 fields.

### Fixed

- **AO-code autofill no longer fires on the correction form's Document step.** The trigger keyed purely on `stepy_index === 3`, which is the AO Code fieldset on the new-PAN form but Document details on the correction form — that form has no AO fieldset at all. It now also requires the `#area_code` input to exist, so the PIN-code lookup only runs on a page that actually has AO fields.

## [0.15.2] — 2026-07-26

### Added

- Progress labels for the correction form's step-3 fields. `passport_num` and `tin_num` were missing a label all along — they're used by `pan_card.json` too, so that step showed raw field ids there as well.

## [0.15.1] — 2026-07-25

### Added

- Progress labels for the correction form's step-2 fields, including the per-section "mark for change" ticks NSDL requires on the correction application.
- `UserData.wants_physical_pan` (`"yes"` | `"no"`) — physical PAN + ePAN (₹101) vs ePAN only (₹66). `correction_pan_card` step 2 reads it. There's no wizard question for it yet, so it stays at the `"yes"` default and behaviour is unchanged.

## [0.15.0] — 2026-07-25

### Added

- **Application chooser screen.** "Start — it takes 5 minutes" no longer jumps straight into the new-PAN wizard; it opens a list of PAN applications to pick from — New PAN card, Correct existing PAN, and PAN for a minor (shown as "Soon"). The home screen keeps its single message and trust lines; the branch happens after the user commits, not before. Adding a variant later is one `PAN_OPTIONS` entry in `panel/chooserScreen.ts`.
- **PAN correction flow.** Picking "Correct existing PAN" runs the same details wizard and payment, then fills NSDL's "Changes or Correction in existing PAN Data" application (`correction_pan_card`) instead of a new one.
- Unbuilt options render as greyed rows rather than being hidden, and taps on them fire a `locked_form_clicked` event — so demand for a variant is measurable before its config is written.
- Friendly progress label for `citizen_of_india`, the one field `correction_pan_card` introduces that the other PAN forms don't have. Without it the filling screen would have shown the raw field id.

### Changed

- `UserData` gained `application_intent` (`"new"` | `"correction"`), and `resolveFormSlug()` now checks it before the existing Aadhaar-address branch. The intent comes from which home-screen entry point was tapped rather than a wizard question, so it's threaded through `showUserForm(form)` into `collectFormData()` — keeping every autofill kick-off point (payment, session resume, page-load resume) reading the same single source of truth.
- The pre-payment eligibility modal's second confirmation inverts for the correction flow: "I confirm I already have a PAN card and want to change or correct its details" replaces "I confirm I do not already have a PAN card", which was exactly backwards for someone correcting one.
- Backing out of the details wizard now returns to the chooser instead of skipping to the home screen.
- New telemetry: `chooser_shown`, `form_selected` (with the chosen slug), `locked_form_clicked`. `panel_opened` no longer carries a form, since at that point the user hasn't picked one.

## [0.14.2] — 2026-07-25

### Fixed

- **Maintenance countdown now counts days.** Days were being rolled into the hours slot, so a maintenance window set five days out displayed as `133:48:57` — closer to a glitch than a wait. It now reads `5d 13:48:57`, with the clock tightening slightly while a day count is on screen so the line still fits the panel.

### Added

- **The maintenance screen says when it's actually coming back.** Under the countdown it now shows "Expected back · Today, 6:30 PM" — `Today` / `Tomorrow` for the two nearest days, weekday + date beyond that (e.g. "Fri, 31 Jul, 12:01 AM"). A running timer alone made a multi-day pause hard to plan around.

## [0.14.1] — 2026-07-19

### Fixed

- Clicking checkboxes/buttons inside the eligibility or AO-availability confirmation modals no longer collapses the panel. Those modals render on `<body>` outside the panel element, so the panel's click-outside-to-close handler treated clicks on them as "outside" — it now stays open while any `.fy-modal-guard` modal is on screen.

## [0.14.0] — 2026-07-19

### Added

- **Eligibility confirmation modal before payment.** After step 5 of 5 in the user details wizard, the panel now shows a red-flagged caution modal requiring the applicant to check two boxes — "I am over 18 years old" (PAN is not currently offered for minors) and "I do not already have a PAN card" — before they can proceed. Shown every time, in addition to the existing AO-code-availability confirmation.

## [0.13.3] — 2026-07-19

### Changed

- The panel step shown right after document upload/confirm (PAN `fullFormSave` page) now says "95% complete!" and walks the user through entering Aadhaar's first 8 digits, reviewing the application, clicking Proceed, and paying — instead of the generic "Step complete" message.

## [0.13.2] — 2026-07-18

### Changed

- Renamed "creator" → "distributor" in the payment screen's coupon copy ("Have a distributor's code?"), matching the project-wide rename of the referral program.

## [0.13.1] — 2026-07-17

### Changed

- Standard price shown as **₹39** on the remaining panel screens (home screen, user-form pre-payment note) to match the new base price. The payment screen's coupon field still offers ₹29 with a valid creator code.

## [0.13.0] — 2026-07-17

### Added

- **Creator coupon codes on the payment screen.** The panel now shows the ₹39 base price with a "Have a creator's code?" field. Applying a valid code drops the price to ₹29 (a receipt-style −₹10 discount line), and the code is passed through to order creation so the sale is attributed to that creator. Price and pay button update live; the discount is server-enforced (the panel's check is UX-only — `create-order` re-validates and sets the real amount). Fires a `coupon_applied` telemetry event.

## [0.12.3] — 2026-07-14

### Added

- **Form configs are now validated before they run.** Configs are fetched live from the backend and executed against a real government form after the user has paid, but nothing checked them first — a malformed push (bad/missing selector, truncated payload, wrong shape) would run and silently mis-fill or half-fill the form. New `formConfig.ts` structurally validates every config (form → steps → fields → selector/value_source) and **fails closed**: an invalid backend config is rejected and we fall back to the bundled copy, and a critical `autofill_error` telemetry event fires so a bad push is caught immediately. Validation is intentionally lenient about the rest — unknown field `type`s and extra keys are preserved, so a forward-compatible config pushed to newer builds doesn't hard-fail older ones.

### Changed

- Replaced the stale hand-written config interfaces (which described a schema the real configs didn't use, forcing ~11 `(field as any)` / `(step as any)` casts) with the accurate types from `formConfig.ts`. The autofill engine is now fully type-checked against the real config shape.

## [0.12.2] — 2026-07-13

### Fixed

- **Fields that failed to fill were shown as a green check (falsely "done").** The progress line hardcoded `ok ? "done" : "done"`, so a missing/disabled selector still rendered as success — the user never knew to fill it manually. Failed fills now show as a muted, struck-through "skipped" row (new `skipped` progress state). Still non-fatal; the flow continues.
- **`field_fill_failed` / `ao_code_failed` telemetry was hardcoded to `pan_card`** even though autofill runs for any form, so non-PAN failures were mis-attributed. Now reports the actual form.
- **`BACKEND_URL` fallback was missing its `https://` scheme** — if `VITE_BACKEND_URL` were unset at build, every request would target a broken URL. Added the scheme (matches `wxt.config.ts`).

## [0.12.1] — 2026-07-11

### Added

- **Post-upload review step** (supporting-documents flow) — after clicking Confirm/Proceed on `fullFormSave.html`, the site re-renders the same URL into a review state (editable first-8-Aadhaar-digits field, no upload widgets). New guidance-only step in `adult_new_pan_card_supporting_docs.json` tells the user to enter their Aadhaar's first 8 digits (we only collect the last 4, so this can't be autofilled), double-check the page, then click Proceed manually — everything after that (payment, e-Sign) is manual.

### Fixed

- **`guidance_only` steps showed a blank generic "Step complete!" card instead of their actual guidance** — `runAutofill` called `showVerifyScreen()` with no arguments on the early-return path for guidance-only steps, silently dropping whatever `completion` (title/subtitle/manual_steps) the config defined. Now passes `step.completion` through, matching the non-guidance-only code path. No effect on `pan_card.json`'s existing guidance-only steps, which never defined a `completion` object — this only changes behavior for steps that actually have one.
- **`isDocUploadPage` mistook the post-upload review state for the still-uploading state** — both live at the same `fullFormSave.html` pathname, so the review page (which needs the guidance above) was being swallowed by the generic upload screen instead. Discriminates on `#confirmSubmit` (the review page's "Proceed"/"Edit" buttons — never present while still uploading). `#aadhaarNo_1` was tried first but rejected after live testing: it's present, just `readonly`, on the upload page too, since the whole flow is one single-page app.

## [0.12.0] — 2026-07-11

### Added

- **Photo & Signature auto-prep on the upload screen** — the document-upload guidance screen now has two dropzones (drop or click to browse) that crop/resize a raw photo or signature to NSDL's exact spec (Photo: 2.5×3.5cm portrait ≈ 197×276px; Signature: 4.5×2cm landscape ≈ 354×157px, both JPEG ≤50KB) entirely client-side via Canvas — nothing is uploaded anywhere. Center-crop-to-cover keeps the subject centered without distorting the aspect ratio; JPEG quality steps down automatically until the file fits under 50KB. Result shows the final dimensions/size and a Download button; the user then uploads that downloaded file manually via NSDL's own existing Upload button, same as always — no attempt to auto-inject files into the government site's own file input. New `imagePrep.ts` module (`processImageToSpec`, `downloadBlob`) holds the reusable logic; document compression (proof of identity/address/DOB, reusing `compress.html`'s existing PDF pipeline) is a follow-up.
- Removed the non-functional placeholder "drop files" boxes from the details form (Proof of Identity/Address/DOB) — that capability now lives on the upload screen instead, where the file is actually needed, rather than earlier during details collection.

### Fixed

- **Panel fell back to the home screen after clicking the Photo/Signature "Upload" button** — clicking Upload on `photoUploadForm`/`signUploadForm` navigates to `uploadFile.html?ID=...&type=1|2`, a URL pattern `isDocUploadPage`'s pathname check (`index.ts`) didn't recognize (it only matched `fullFormSave`/`uploadDocument`), so the panel didn't know it was still on the upload flow and reset. Added `uploadFile` to the match list — same fix category as the `fullFormSave`/`uploadDocument` case already handled.

## [0.11.0] — 2026-07-10

### Added

- **PAN application with supporting documents** — a second PAN flow (`adult_new_pan_card_supporting_docs`) for applicants who want a different photo/signature than their Aadhaar card, or whose current address doesn't match Aadhaar. The details form now asks "Is your current address the same as your Aadhaar address?" (always visible, defaults Yes); answering "No" reveals current-address fields (with a proper State dropdown, matching NSDL's own ALL-CAPS state naming) plus Proof of Identity / Proof of Address document-type pickers, each with a visual-only "drop files" placeholder (upload wiring is separate future work).
- **Defence-personnel question is now always visible and answered by default** — was previously tucked inside a collapsed "+ Optional" section alongside passport/TIN, which meant many users skipped past a question the AO Code lookup actually depends on.
- `resolveFormSlug(userData)` in `userData.ts` — single source of truth for which config to run, based on the address-match answer above.

### Fixed

- **Source of income only ever saved one selection** — the panel rendered it as radio buttons and `UserData.income_source` was a single string, so picking e.g. "Salary" + "Capital Gains" silently kept only whichever was clicked last, and the NSDL page ended up with just one checkbox ticked no matter what the user intended. `income_source` is now `IncomeSource[]`, the panel uses checkboxes (with "No income" mutually exclusive against the rest, mirroring the government form's own rule), and the NSDL-page checkbox fill now checks array membership instead of exact equality.
- **The address-match answer wasn't actually changing which application NSDL saw** — the toggle only hid/showed panel fields; payment initiation and the post-payment autofill kickoff were both still hardcoded to `"pan_card"`, so choosing "No" still ran the Aadhaar-eKYC flow. `paymentScreen.ts` and `index.ts`'s `PAYMENT_VERIFIED` handler now both resolve the real form via `resolveFormSlug`.
- **"Name as per Aadhaar" wasn't being filled on the supporting-documents flow** — NSDL's page disables that field in a one-time page-load check that only looks at whichever submission-mode radio is checked _by default_ (Aadhaar eKYC), and never re-enables it after our script switches the radio to "supporting documents". `fillField` now supports an explicit per-field `force_enable` opt-in, used for this field, which clears `.disabled` before filling.

## [0.10.4] — 2026-07-09

### Fixed

- **eKYC photo-consent dropdown reset on the document-upload page** — the NSDL upload page self-reloads after every Upload, which resets the select2 "photo visible on Aadhaar" consent (`#consentEkyc`) back to "-----Please Select-----"; clicking Submit then errored with "please select a consent", confusing users into thinking their upload failed. `index.ts` now re-selects "Y" on every load of the upload page (`reapplyEkycConsent`), setting the native `<select>` value and triggering a jQuery change so select2's visible label updates too. Polls briefly to win the race with select2's own init.

## [0.10.3] — 2026-07-09

### Changed

- **CAPTCHA coach mark on the registration page** now reads "Solve the CAPTCHA, wait for the green check ✓, then click Submit" (was "Solve the CAPTCHA first, then click Submit") — so users wait for reCAPTCHA to verify before submitting instead of clicking Submit immediately. Updated in both `public/configs/pan_card.json` (bundled) and `formyaar-backend/configs/pan_card.json` (live).

## [0.10.2] — 2026-07-09

### Fixed

- **"Continue →" resume card disappeared after reaching the document-upload page** — `showUploadScreen()` always called `markSessionCompleted()`, which was fine when it only ran at the true end of the flow. Now that it also drives the mid-flow `fullFormSave`/`uploadDocument` pages (0.10.0), every visit was flipping `fy_active_session.completed = true` and permanently hiding the home-screen resume card. `showUploadScreen` now takes `{ markCompleted }` (autofill's final step passes `true`; the doc-upload trigger doesn't) and, mid-flow, calls the new `markSessionActive()` to keep the session resumable — which also repairs sessions an earlier build wrongly marked completed.

## [0.10.1] — 2026-07-09

### Changed

- **Upload screen restyled to the current panel design system** (`uploadScreen.ts`) — replaced the old navy/tricolor header + warm-yellow warning boxes with the near-monochrome language used across the rest of the panel: `renderHeader` + `renderProgress` chrome, `--fy-*` tokens, borderless `--fy-field` cards, and a single blue accent (`--fy-btn-primary`) reserved for the one primary action (Merge & compress). Emoji swapped for quiet line-icon `fy-quietrow`s; FAQ chips, chat input and chat bubbles re-skinned to the shared tokens. Content unchanged.

## [0.10.0] — 2026-07-09

### Added

- **Document-upload guidance on the `fullFormSave.html` / `uploadDocument.html` pages** — after "Save draft" the user lands on `fullFormSave.html` (which the config treats as a `guidance_only` step, so the panel used to show a bare "Step complete!" verify screen — or the home screen once the session was cleared); each uploaded file then reloads the page with a fresh `?ID=` (sometimes as `uploadDocument.html`), which previously flipped the panel to "page not recognized". The panel now keys off the pathname (`isDocUploadPage` in `index.ts`, matching `fullFormSave`/`uploadDocument`), so it opens straight to the upload screen on every reload regardless of the changing ID, and the autofill auto-run is skipped there.

### Changed

- **Upload screen rewritten** (`uploadScreen.ts`) — now shown as standalone page guidance rather than the post-fill "one step remaining" success card. Warns that the page accepts only ONE PDF and to merge multiple documents into a single PDF first via the FormYaar compress tool (add all documents on one page → compress & download). Adds explicit two-step instructions: (1) click the orange ＋ button to select the PDF, (2) click Upload. Adds a reassurance note that the page reloads after each upload. AI-help context and FAQ chips updated to match. Companion change in `formyaar-website/compress.html`: the "Convert to grayscale" toggle now defaults **off**.

## [0.9.0] — 2026-07-08

### Changed

- **Panel redesign** — migrated all in-page panel screens to the new design (`panel-mockup/`): home, user form, payment, filling/verify, recover, maintenance, celebration, panel shell, and operator login/queue/review. Quieter white header (`renderHeader`) with a hairline progress bar (`renderProgress`) replacing the old 3-step map; new `shared.ts` helpers (`renderHeader`, `renderProgress`, `renderSteps`, `BRAND_PEN_SVG`). Presentation only — no behavior change: telemetry events, backend endpoints (`/pincode`, `/payment/resume`, `/operator/*`, `/maintenance/status`), autofill triggers, operator session-token auth, and sensitive-field handling (`aadhaar_number`/`passport_number`/`tin_number`) are all preserved. Verified via `tsc --noEmit` + `wxt build`.

### Fixed

- **Panel was rendered flattened (zero-padding buttons, fields jammed to the edge)** — the base reset `#formyaar-panel * { margin: 0; padding: 0 }` (specificity 1,0,0) out-specified every one of the design's single-class rules (0,1,0) such as `.fy-btn { padding: 14px 18px }` and `.fy-userform-field input { padding: 12px 14px }`, zeroing their padding in production. The standalone preview hid this because its harness rescopes the reset to the `.fy-frame` _class_ (0,1,0), letting the design classes win by source order. Fixed by dropping the reset to zero specificity via `:where(#formyaar-panel) *`, so the panel's own class rules always win — matching the preview exactly. Also added `line-height` on the panel root and kept a small form-control isolation block (`text-transform`/`appearance`/`font-family`) for native-chrome/host-font leaks. Verified with headless Chrome by rendering the real home + user-form screens under formyaar.in's actual global CSS, before/after.

## [0.8.3] — 2026-07-08

### Chore

- Split `entrypoints/content/panel.ts` (2,911 lines) into `entrypoints/content/panel/` — one module per screen (home, payment, user form, filling/verify, recover, operator login/queue/review) plus shared panel shell, maintenance, and celebration modules. Pure refactor, no behavior change; `showContextualBanner`, `showFillingScreen`, `showVerifyScreen`, `updateFillProgress`, `celebrateTimeSaved` still import from `./panel` unchanged.

## [0.8.1] — 2026-06-13

### Changed

- `fullFormSave` step (`#confirmSubmit`) is no longer auto-clicked — it's now `guidance_only`, requiring the user to manually click Confirm after uploading proof-of-DOB/Aadhaar/photo/signature documents. Prevents the autofill from advancing past the document-upload page before uploads are done.

## [0.7.0] — 2026-05-30 (UNRELEASED — on branch `fixes/operator-audit`, not yet merged)

> Operator-flow security/data audit fixes + a delight feature. Pairs with the
> backend `fixes/operator-audit` branch (operator session-token auth).
> **Requires** the `operator_sessions` Supabase table (see backend changelog)
> and forces existing operators to re-login once.

### Security

- **X1** — operator queue/review now HTML-escape all customer-supplied fields; a malicious QR submission could previously inject markup into the operator's extension (stored XSS)
- **C1** — in-progress submissions are scoped per `operator_id` instead of one global key, so operators sharing a browser can no longer see each other's customer PII; `signOut()` clears transient operator keys
- **H1** — operator API calls now send a Bearer session token (issued at login); pairs with backend auth on `/operator/*`

### Fixed

- **C2** — "Done ✓" marks the submission `completed` on the backend (was local-only), so it no longer stays stuck at `filling` and dashboard completed-stats now increment
- **H2** — subscription check has explicit active / expired / unknown states; a failed verify shows a Retry screen instead of silently granting access (no more fail-open)

### Added

- 🎉 **Time-saved celebration** — tricolor confetti + a "⚡ Saved you ~Xm · Yh Zm total 💜" pill when a step finishes filling; cumulative total persisted locally

### Chore

- **X2** — removed unused `tabs` permission (CWS minimization); kept storage/activeTab/alarms

## [0.6.1] — 2026-05-30

### Fixed

- Operator queue stuck on "Loading queue…" — backend calls (`/operator/subscription`, `/operator/queue`) now wrapped in try/catch so a failed request no longer leaves the screen frozen; queue falls back gracefully
- Corrected backend URL — `.env.development` / `.env.production` were pointing at the old `formyaar-backend-production.up.railway.app` host (now `-a43e`), which caused 404s and apparent CORS failures on the operator dashboard

### Added

- Open the panel from any formyaar.in button via a custom DOM event (`fy:open-panel`) — zero server load
- DOB field auto-formats to DD/MM/YYYY (auto-inserts slashes, clamps day ≤ 31 and month ≤ 12)

### Changed

- F·Y tab shake interval 12s → 10s, scales from the right edge (no longer clipped by the screen)
- Maintenance status check moved to run after panel creation so it never delays autofill on page load

## [0.6.0] — 2026-05-30

### Added

- Operator in-progress resume flow — when an operator accepts a submission and closes the tab mid-fill, the submission is saved to `storage.local` (`fy_op_inprogress`). Reopening the panel shows an amber "In Progress" section above the queue with Resume and Done buttons. Resume re-prepares the submission data and opens NSDL in a new tab; Done manually clears it.
- `prepareOperatorSubmission` extracted from `runAutofillFromSubmission` — shared by both the accept handler and the resume button so submission data is always staged before navigation

### Fixed

- Autofill panel jitter — programmatic clicks dispatched by the autofill engine (radio buttons, checkboxes, next-step buttons) were bubbling to `document` and triggering the click-outside handler, causing the panel to rapidly slide out and back in during fills with many skipped fields. Click-outside handler now ignores all clicks while `#fy-filling` is visible.
- Operator accept/resume now opens NSDL in a new tab (`window.open`) instead of navigating the current page
- Maintenance check no longer delays panel creation — panel is created immediately so autofill screen transitions work on page load; maintenance status is checked in the background and swaps content only if ON

## [0.5.0] — 2026-05-28

### Added

- Defence personnel AO code selection — Army (PNE/W/55/3) and Air Force (DEL/W/72/2) hardcoded; filled directly based on `defence_branch` when `is_defence` is true
- Defence branch radio selector in user data form (shown only when "Defence personnel" is checked)

### Changed

- AO code step completely reworked: backend already resolves the exact AO code from city configs (`/pincode/:pin`), so the state dropdown → city dropdown → Fetch button → table selection dance is gone — values are written directly into `#area_code`, `#ao_type`, `#range_code`, `#ao_num`
- Shake animation on F·Y tab icon: amplitude doubled (±4px → ±8px) and interval halved (25s → 12s) for more visibility

## [0.4.9] — 2026-05-27

### Fixed

- Operator submission flow set `autofillActive` without a `done` array — caused a crash on every page load (`TypeError: Cannot read properties of undefined (reading 'includes')`), silently breaking auto-run for the token page and first step of `endUserLogin.html`
- Token page (`input.tokenButton`) was skipped by the URL deduplication logic because it reloads at the same URL as step 1 — added DOM-state detection to always run autofill on the token page regardless of `done`

## [0.4.8] — 2026-05-25

### Added

- Clear data (trash) button on home screen — wipes `fy_user_data`, `fy_active_session`, and session-only sensitive fields in one tap with confirmation prompt

### Changed

- Real Razorpay payment flow now live and tested end-to-end
- `flex-wrap` on home screen footer action buttons to prevent overflow on narrow panels
- `position: relative` on home container to anchor the clear-data button

## [0.4.5] — 2026-05-24

### Added

- Bundled `pan_card.json` in `public/configs/` as offline fallback; backend remains primary source so live updates still apply
- Back button on the operator queue screen → returns to home screen
- Form-data guard on the "Continue" button — if no local form details exist (e.g. recovered on a new browser), shows a message instead of starting a broken autofill
- Telemetry disclosure in the panel footer
- VERSION displayed in panel header for quick build-verification

### Fixed

- Click-outside handler closing the panel when a button removed itself from the DOM (form back button) — added `document.contains(e.target)` check
- Post-payment flow no longer races storage writes against `window.location.href` — now awaits both `autofillActive` and `fy_active_session` writes before navigating
- Post-payment now navigates to NSDL only when not already there (avoids infinite-loop opening of NSDL tab from the PAN card click)
- AO code autofill: waits for `#state_aoCode` dropdown to populate via MutationObserver instead of fixed delay
- Misleading "we never store your information" copy → now accurately reads "saved only on your device — never on our servers"
- Unsupported-site popup: replaced specific government form list with a single formyaar.in link (less misleading, simpler)

### Changed

- `aadhaar_number` removed from `UserData` interface — extension never collects or stores full Aadhaar; only `aadhaar_last_4` (session-only)
- `aadhaar_last_4` moved into `SENSITIVE_FIELDS` (session-only storage)
- `runAutofillFromSubmission` derives `aadhaar_last_4` from any `aadhaar_number` field in operator submissions and discards the rest
- `save-session` request body trimmed: only `order_id`, `mobile`, `form_type` sent to backend — never form data
- Recover-session flow no longer restores `form_data` from server (server doesn't store it anymore)
- Config fetch is backend-first with bundled fallback (was backend-only)

### Removed

- `scripting` permission from manifest (never used)
- Dead `aadhaar_first_8` derived-field logic in autofill

## [0.3.0] — 2026-05-23

### Added

- Version number displayed in panel header (`v{VERSION}`)
- Pending sessions card in home screen — shows in-progress forms with **Continue** and **Discard** buttons
- Cross-device session recovery by phone number now lands back on home screen and shows the pending card
- Local AO code resolver: backend returns resolved `ao_code` for known cities, extension uses it to match the exact NSDL table row instead of guessing the first valid one

### Fixed

- Subscription check treated `NULL` `subscription_expires_at` as expired — now treated as never-expiring
- AO code autofill: added MutationObserver wait for `#state_aoCode` dropdown to populate before selecting (was failing silently due to 150ms timing race)
- Pincode API: wraps `response.json()` in its own try-catch so an HTML error page from `postalpincode.in` no longer causes an unhandled 500

### Changed

- Sensitive fields (`aadhaar_number`, `passport_number`, `tin_number`) now stored in `sessionStorage` only — cleared when browser closes, never sent to backend
- `form_data` sent to backend on `save-session` no longer includes sensitive fields
- Resume system fully reworked: removed the old auto-popup resume screen that appeared on NSDL visits; replaced with a persistent "In Progress" card on the main panel home screen
- `autofillActive` in extension session storage still auto-runs autofill within an active browser session (navigating between NSDL steps); only cross-session resume requires user action

### Removed

- `renderResumeScreen` and `showResumeScreen` — replaced by `refreshPendingSessions` inline card
- Auto-show of resume screen on NSDL page load
