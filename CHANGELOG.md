# FormYaar Extension — Changelog

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
