# FormYaar Extension — Technical Documentation

**Last updated:** 2026-05-24
**Version:** 0.4.5
**Stack:** WXT 0.20 · TypeScript · React 19 (popup only) · Vanilla DOM (panel) · Manifest V3

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Setup & Build](#setup--build)
5. [Manifest & Permissions](#manifest--permissions)
6. [Entry Points](#entry-points)
7. [User Data & Storage](#user-data--storage)
8. [Autofill Engine](#autofill-engine)
9. [Payment Flow](#payment-flow)
10. [Session Resume](#session-resume)
11. [Operator (B2B) Flow](#operator-b2b-flow)
12. [Panel UI System](#panel-ui-system)
13. [Telemetry](#telemetry)
14. [Privacy & Chrome Web Store Notes](#privacy--chrome-web-store-notes)
15. [Versioning](#versioning)

---

## Overview

FormYaar is a browser extension that auto-fills Indian government forms (currently NSDL/Protean PAN card) for two audiences:

- **B2C users** — pay once (₹29) per form, fill their own data once, the extension drives the multi-step government form
- **B2B operators** — café/agent operators with an active subscription. They see a queue of customer submissions made via formyaar.in and run autofill on a customer's behalf without re-entering data

The extension is a "guide, not a robot" — it auto-fills what it can, stops at steps that require human attention (OTPs, captchas, file uploads), and walks the user through them via the side panel.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Browser Page                          │
│                                                          │
│  ┌──────────────────────┐  ┌─────────────────────────┐  │
│  │  Government form     │  │  FormYaar Panel (DOM     │  │
│  │  (NSDL, Protean…)    │  │  injection, no iframe)  │  │
│  └──────────┬───────────┘  └─────────┬───────────────┘  │
│             │                         │                  │
│             └──────► Content Script ◄┘                  │
│                    (panel.ts + autofill.ts + …)         │
│                            │                            │
└────────────────────────────┼────────────────────────────┘
                             │ runtime.sendMessage
                             ▼
                  ┌─────────────────────┐
                  │  Background (SW)    │
                  │  Payment polling    │
                  │  Tab opening        │
                  │  Telemetry proxy    │
                  │  AI chat proxy      │
                  └────────┬────────────┘
                           │ fetch
                           ▼
                  ┌─────────────────────┐
                  │  Backend (Railway)  │
                  └─────────────────────┘
```

There is also a small **popup** (React) shown when the user clicks the toolbar icon — its only job is to detect whether the current tab is a supported government site and tell the user, or link them to formyaar.in if not.

---

## Project Structure

```
formyaar-extension/
├── entrypoints/
│   ├── background.ts             ← Service worker
│   ├── popup/
│   │   ├── App.tsx, main.tsx     ← Toolbar popup (React)
│   │   └── index.html, style.css
│   └── content/
│       ├── index.ts              ← Content script entry, message router
│       ├── panel.ts              ← Panel UI (DOM strings, ~1900 lines)
│       ├── autofill.ts           ← Form-filling engine
│       ├── userData.ts           ← Storage layer + types
│       ├── supabase.ts           ← B2B operator session helpers
│       ├── telemetry.ts          ← trackEvent wrapper
│       ├── uploadScreen.ts       ← End-of-flow upload helper UI
│       ├── toasts.ts             ← Toast utility
│       ├── constants.ts          ← VERSION, BACKEND_URL, SITE_CONFIGS, z-indexes
│       ├── fonts.ts              ← Font loader
│       └── types.ts              ← ExtensionMessage union, shared interfaces
├── public/
│   ├── icon/                     ← Toolbar icons
│   └── configs/
│       └── pan_card.json         ← Bundled fallback autofill config
├── wxt.config.ts                 ← Manifest + WXT config
├── package.json
└── CHANGELOG.md
```

The panel is monolithic (`panel.ts` ~1900 lines) by design — keeping all DOM strings, screen rendering, and event wiring in one file lets us reason about screen transitions without chasing imports. UI subsystems like `uploadScreen.ts` are split out only when they ship as a self-contained screen.

---

## Setup & Build

### Scripts

```bash
npm run dev            # Chrome dev build, hot reload
npm run dev:firefox    # Firefox dev build
npm run build          # Chrome production
npm run build:firefox  # Firefox production
npm run zip            # Chrome Web Store-ready zip
npm run compile        # tsc --noEmit (type check only)
```

### Environment variables

`.env.development` / `.env.production`:

```
VITE_BACKEND_URL=https://formyaar-backend-production.up.railway.app
```

Used at build time in `wxt.config.ts` (for `host_permissions`) and at runtime in `constants.ts` (for `fetch`).

> **Important for store submission:** when zipping for the Web Store, `VITE_BACKEND_URL` must be set to production. Defaults in `constants.ts` and `wxt.config.ts` are the production Railway URL, so an unset env var is also safe.

---

## Manifest & Permissions

Defined in `wxt.config.ts`:

| Permission | Why |
|---|---|
| `storage` | `browser.storage.local` and `.session` for user data, sessions |
| `activeTab` | Popup interacts with the current tab |
| `alarms` | Background payment-status polling (~6 s interval) |
| `tabs` | `browser.tabs.create` (open NSDL, payment page); `browser.tabs.query` (popup) |

**Removed**: `scripting` — was listed previously, not used (content scripts are injected via manifest declaration).

### Host permissions

```
https://onlineservices.proteantech.in/*
https://onlineservices.nsdl.com/*
https://www.utiitsl.com/*
https://passporthub.gov.in/*
https://sarathi.parivahan.gov.in/*
https://formyaar.in/*
<backend URL>/*
```

### Content script matches

```
*://*.proteantech.in/*
*://*.nsdl.com/*
*://*.utiitsl.com/*
*://*.passporthub.gov.in/*
*://*.sarathi.parivahan.gov.in/*
*://formyaar.in/*
```

---

## Entry Points

### `entrypoints/background.ts` (service worker)

Handles cross-tab and privileged operations:

| Message | Action |
|---|---|
| `AI_CHAT` | Proxy to `POST /ai/chat` (avoids NSDL CSP) |
| `CREATE_PAYMENT` | Proxy to `POST /payment/create-order` |
| `OPEN_URL` | `browser.tabs.create({ url })` |
| `OPEN_RAZORPAY` | Open `https://formyaar.in/pay?order_id=...`, store `pendingPayment` in session, start `paymentPoll` alarm |
| `TELEMETRY_EVENT` | Proxy to `POST /telemetry/event` |

**Payment polling** — `browser.alarms.create("paymentPoll", { periodInMinutes: 0.1 })` fires every ~6 s. Reads `pendingPayment` from `storage.session`, queries `/payment/status/:orderId`. On `paid: true`: sends `PAYMENT_VERIFIED` to the originating tab, clears the alarm. Hard cap of 60 attempts (~5 min) to prevent runaway polling.

### `entrypoints/content/index.ts`

Top-level content script. Responsibilities:

1. **Message listener** for `OPEN_PANEL` and `PAYMENT_VERIFIED`
   - On `PAYMENT_VERIFIED`: write `autofillActive` to session storage + `fy_active_session` to local storage in parallel, post `mobile`/`order_id`/`form_type` to `/payment/save-session`, then either run autofill directly (already on NSDL) or navigate the tab to `endUserRegisterContact.html` (autofill picks up on page load).
2. **Next-button observer** (`onlineservices.proteantech.in` only) — re-runs autofill when the user moves to the next `stepy` step.
3. **Contextual banner** — auto-opens the side panel after `BANNER_DELAY_MS` (1500 ms) on supported sites and formyaar.in.
4. **Page-load autofill** — if `autofillActive` exists in session storage and `pageKey` (pathname) is not in `done[]`, autofill that step (with 1.5 s delay for page to settle), then add `pageKey` to `done`.

### `entrypoints/popup/App.tsx`

Pure UI. Queries the active tab, classifies it as `supported` or `unsupported`, shows a CTA. On supported sites, the "Open FormYaar" button sends `OPEN_PANEL` to the content script. On unsupported sites, links to formyaar.in.

---

## User Data & Storage

### `UserData` interface

```typescript
{
  first_name, middle_name, last_name
  date_of_birth, email, mobile
  aadhaar_last_4              // sensitive — session only
  gender ('M'|'F'|'T'|'')
  father_*, mother_*          // first/middle/last
  parent_on_card_is_father / _is_mother
  aadhaar_pin_code, place
  is_defence
  passport_number             // sensitive — session only
  tin_number                  // sensitive — session only
  proof_of_dob
  income_source               // enum
}
```

**Note:** the full `aadhaar_number` field was removed from `UserData`. The website's `user-form.html` may still POST a full number to the backend's submission flow, but the extension never stores or uses it — `runAutofillFromSubmission()` derives `aadhaar_last_4` from it on the fly.

### Storage split

| Bucket | Key | Contents | Lifetime |
|---|---|---|---|
| `storage.local` | `fy_user_data` | Non-sensitive fields (name, DOB, address, etc.) | Forever (until uninstall or manual clear) |
| `storage.session` | `fy_sensitive_data` | `aadhaar_last_4`, `passport_number`, `tin_number` | Browser session only |
| `storage.local` | `fy_active_session` | `{ form, order_id, paid_at, completed }` | Until user discards |
| `storage.session` | `autofillActive` | `{ form, done: string[] }` | Browser session |
| `storage.session` | `fy_operator_submission` | Operator-loaded customer data | Browser session |
| `storage.session` | `pendingPayment` | Payment polling state | Browser session |
| `storage.local` | `fy_operator_session` | Operator id + email + subscription | Until sign out |

### Read priority in `getUserData()`

1. **Operator override** (`fy_operator_submission` with `first_name`) — used when operator is filling for a customer
2. **Regular user** — merge `local.fy_user_data` ∪ `session.fy_sensitive_data` over `EMPTY_USER_DATA`

### What goes to the backend

| Endpoint | Payload |
|---|---|
| `/payment/save-session` | `order_id`, `mobile`, `form_type` only — **no form data** |
| `/payment/resume/:mobile` | mobile in URL |
| `/payment/status/:order_id` | order ID in URL |
| `/configs/:form/latest` | none |
| `/pincode/:pin` | PIN in URL |
| `/telemetry/event` | event name, form, URL pathname / step / selector — no PII |
| `/ai/chat` | field ID, field explanation, user's typed question — no PII |

Sensitive identity numbers never leave the device.

---

## Autofill Engine

`entrypoints/content/autofill.ts`

### Main flow (`runAutofill(form)`)

1. Show filling screen in the panel
2. **Fetch config** — backend first (`/configs/:form/latest`), bundled `public/configs/pan_card.json` as fallback
3. **Match step** (`matchStep`):
   - **Token-page short-circuit** — if `input.tokenButton` exists in the DOM, return the step with `is_token_page: true`
   - **Non-`endUserLogin` URLs** — find step whose `page_pattern` is a substring of `pathname + search`
   - **`endUserLogin`** — query `.stepy-step`, find the visible one (display ≠ "none"), match by `stepy_index`
4. **Guidance-only steps** — show verify screen without filling
5. **Fill each field** sequentially with 150 ms delay (2500 ms after button clicks):
   - Resolve value: `static` / `static_value`, `user.<field>` lookup, or special checkbox case where `value_source` is a user field AND `static_value` is provided (used for multi-checkbox enums like `income_source`)
   - Find element via CSS selector
   - Skip if disabled
   - Dispatch via type-specific filler (see below)
6. **Step 4 (AO code)** — if `stepy_index === 3` and user is not defence personnel, run `autoFillAOCode(pinCode)`
7. **Last step of PAN** — show upload helper screen; else generic verify screen
8. **Clear `autofillActive`** if this was the last step in the config (prevents re-running on later visits)

### Field-type fillers

- **text / date** — uses the native `HTMLInputElement.value` setter via `Object.getOwnPropertyDescriptor` to bypass React/framework value tracking. Dispatches `input`, `change`, `blur`.
- **select** — match by `value` (default) or `text`. Triggers Select2 update if jQuery + Select2 are present.
- **checkbox** — sets `.checked` and dispatches `change` + `click`.
- **radio** — handles `defence_selector` indirection (different radio depending on `user.is_defence`).
- **button_click** — waits up to 3 s for `disabled` to clear via MutationObserver, then clicks twice (native `click()` + dispatched `MouseEvent` for jQuery handlers).

### AO Code auto-fill (`autoFillAOCode`)

Multi-step async dance on the NSDL AO code page:

1. `GET /pincode/:pin` — receives `{ state, city, ao_code? }`
2. Wait for `#state_aoCode` to have >1 option (MutationObserver, 5 s timeout)
3. Set the state, dispatch `change`, also trigger jQuery `change` for legacy listeners
4. Wait for `#city_aoCode` to populate via the site's AJAX
5. Select city (exact match → partial match fallback)
6. Click `#fetchAOList`
7. `autoSelectAOCode(ao_code)` — watches for `#table_id` to populate, then:
   - If we have a target AO code from the backend → match exact row by area_code + range_code + ao_number
   - Otherwise → first non-exemption, non-company row

### Operator entry (`runAutofillFromSubmission(sub)`)

Converts a backend submission object → `UserData`, stores it in `storage.session.fy_operator_submission`, then calls `runAutofill(sub.form_type)`. The operator override in `getUserData()` ensures subsequent reads return the customer's data.

---

## Payment Flow

```
User fills panel form
       │
       ▼
Click "Pay ₹29"
       │ runtime.sendMessage(CREATE_PAYMENT)
       ▼
Background → POST /payment/create-order
       │
       │ runtime.sendMessage(OPEN_RAZORPAY)
       ▼
Background opens https://formyaar.in/pay?order_id=...
       │
       │ stores pendingPayment in storage.session
       │ creates alarm "paymentPoll" (every 6s)
       ▼
User completes Razorpay on the website
       │
       ▼
Alarm fires → GET /payment/status/:orderId
       │
       │ when paid:true
       ▼
Background → sendMessage(PAYMENT_VERIFIED) to origin tab
       │
       ▼
Content script:
  1. POST /payment/save-session (mobile + order_id, no form data)
  2. await storage writes for autofillActive + fy_active_session
  3. if on NSDL → runAutofill directly
     else → window.location.href = NSDL_START_URL
            (page-load handler will run autofill)
```

The **payment page itself** lives on formyaar.in (not in the extension). It calls `GET /payment/order/:order_id` to get the authoritative amount (so the extension can't tamper), invokes Razorpay Checkout, then calls `POST /payment/confirm` for signature verification. After confirmation, the page can be closed — the extension's polling will detect `captured` status independently.

---

## Session Resume

A B2C user who pays but doesn't finish the form should be able to resume without paying again, on any browser.

### Save (post-payment)

- Extension writes `fy_active_session` to `storage.local` (this device)
- Extension calls `POST /payment/save-session` with mobile + order_id (server-side, 48-hour TTL)

### Same browser

- "In Progress" card auto-renders on the panel home screen via `refreshPendingSessions()` whenever the panel opens
- Click **Continue** → checks `getUserData().first_name` exists (otherwise alerts user to fill details first), sets `autofillActive`, navigates to NSDL
- Click **Discard** → confirm + clear `fy_active_session`

### Different browser

- User clicks "Already paid? Recover session"
- Enters mobile → `GET /payment/resume/:mobile`
- Server returns `{ order_id, form_type, form_data, created_at, expires_at }` (`form_data` is `{}` for current versions)
- Extension writes `fy_active_session` and shows the "In Progress" card
- From here, same as same-browser flow — but if `getUserData().first_name` is empty (no local data on this browser), Continue blocks with a message asking the user to fill details first

### Mark completed

When the autofill engine reaches the last config step, it calls `markSessionCompleted()` which sets `completed: true`. (A separate `POST /payment/complete-session` exists for the backend side — wired from the website's success page, not from the extension.)

---

## Operator (B2B) Flow

1. Operator signs in on formyaar.in (operator-dashboard)
2. Website calls `POST /operator/generate-token` → 12-char alphanumeric, 5-min TTL
3. Operator enters the token into the extension's operator-login screen
4. Extension calls `POST /operator/verify-token` → returns operator + subscription status; token is one-time
5. Operator session stored in `storage.local.fy_operator_session`
6. Panel switches to Operator Queue (`renderOperatorQueueScreen`)
7. Operator Queue: `GET /operator/queue/:operator_id` returns pending submissions
8. Operator clicks a submission → Accept → `PATCH /operator/submission/:id/status` (`filling`) → `runAutofillFromSubmission(sub)`
9. Subsequent autofill reads use the operator-override `getUserData()` path

Operators currently have **lifetime access** (no `expires_at`); subscription status check treats NULL `expires_at` as "no expiry". The B2C/B2B separation is **incomplete** — operator subscriptions and B2C payments flow through the same conceptual paths, and isolation isn't enforced at the data layer yet (tracked in the project backlog).

---

## Panel UI System

Single file: `entrypoints/content/panel.ts`. Architecture:

- **Screens** — each `render*Screen()` returns an HTML string; all screens live as siblings inside the panel, visibility is toggled by `style.display`
- **Screen list**: home, payment, filling, verify, upload, recover, operator-login, operator-queue, operator-review, user-form (created dynamically per `showUserForm()`)
- **Event handlers** wired in `attachPanelEventHandlers()` after `panel.innerHTML = ...`
- **Pending sessions** rendered into `#fy-pending-sessions` placeholder via `refreshPendingSessions()`

### Open/close

- `showContextualBanner()` injects the panel `div#formyaar-panel` (z-index `2147483647`), slides it in from the right
- Side **tab** (`#fy-tab`) is a thin pill on the right edge — clicking toggles `panel.style.right` between `0px` and `-PANEL_WIDTH px`
- **Click-outside handler** — closes the panel on document clicks outside `#formyaar-panel` and `#fy-tab`. Includes a `document.contains(e.target)` check to avoid false positives when a click handler removes the clicked element from the DOM (fixed in 0.4.4).

### Why monolithic and not React?

- Injection into hostile DOMs (government sites with their own jQuery + CSS resets) — bundling a React tree per content-script context costs ~150 KB and risks style bleed
- Panel is mostly static screens with deterministic transitions, not a reactive tree
- React is reserved for the popup, where the host is the extension itself

---

## Telemetry

`entrypoints/content/telemetry.ts` — `trackEvent(event, form, metadata)`. Posts via the background's `TELEMETRY_EVENT` proxy (avoids NSDL's CSP blocking direct fetches).

Events emitted from the extension:
- `banner_shown`, `panel_opened`, `payment_started`, `payment_completed`
- `guide_started`, `guide_completed`, `guide_paused`
- `field_skipped`, `field_not_found`, `field_fill_failed`, `step_match_failed`
- `help_chat_used`, `upload_screen_shown`, `upload_scroll_clicked`, `compressor_opened`, `faq_clicked`
- `ao_code_failed`, `autofill_error`

Metadata never includes PII — only field IDs, CSS selectors, URL pathnames. Failures in `trackEvent` are swallowed by design (telemetry must never break the user flow).

---

## Privacy & Chrome Web Store Notes

### What we collect locally (never sent)
- Name, DOB, email, mobile, parent names, address, gender, income source → `storage.local`
- Aadhaar last 4, passport, TIN → `storage.session` only

### What we send to our backend
- Mobile + order_id at payment time (for resume)
- Pincode (for AO code lookup)
- Telemetry events with no PII
- AI chat: user's typed question + field context (no name/Aadhaar)

### Disclosed in panel UI
- Home screen badge: *"Your details are saved only on your device — never on our servers"*
- Footer: *"Not affiliated with any government entity. … Anonymous usage events are collected to improve the service."*

### Web Store rejection risks (current state)

| Risk | Status |
|---|---|
| Remote-controlled autofill config | **Mitigated** — `pan_card.json` bundled in `public/configs/`, backend fetch is fallback only |
| `scripting` permission | **Removed** |
| `tabs` permission | Needed; justify in store listing as *"open payment page + detect active tab"* |
| No data-deletion UI | **Open** — `storage.local` data persists forever; needs a "Clear my data" button in the panel |
| Telemetry disclosure | **Done** — disclosed in footer |
| Misleading "never store" copy | **Fixed** — now accurately says "saved only on your device" |

---

## Versioning

`VERSION` lives in three files and **must be kept in sync** on every code change (per project policy in `CLAUDE.md`):

- `entrypoints/content/constants.ts` → `export const VERSION`
- `wxt.config.ts` → `manifest.version`
- `package.json` → `version`

Reason: the panel shows `VERSION` in the header so we can verify users (and ourselves) are seeing the latest build.

Semver:
- **Patch** — bug fixes, copy tweaks
- **Minor** — new features, new flows
- **Major** — only on breaking changes to user data or config schema

See `CHANGELOG.md` for history.
