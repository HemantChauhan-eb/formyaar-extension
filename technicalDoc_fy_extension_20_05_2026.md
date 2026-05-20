# FormYaar Extension — Technical Documentation

## Overview

FormYaar is a Chrome/Firefox browser extension that auto-fills Indian government forms (PAN Card, Passport, Driving License) using user-provided personal data. It uses a config-driven approach — form field selectors and fill logic live in JSON files served by the backend, so the extension doesn't need rebuilding when government sites change their layouts.

**Architecture**: Chrome MV3 (Manifest V3), built with [WXT](https://wxt.dev/) and React.

---

## Project Structure

```
formyaar-extension/
├── entrypoints/
│   ├── background.ts          # Service worker — API proxy + payment polling
│   ├── content/
│   │   ├── index.ts           # Content script entry — detects supported sites
│   │   ├── autofill.ts        # Core form-filling engine
│   │   ├── panel.ts           # Side panel UI (all screens, HTML/CSS inline)
│   │   ├── userData.ts        # Local storage + session management
│   │   ├── supabase.ts        # Operator token authentication
│   │   ├── telemetry.ts       # Analytics event tracking
│   │   ├── uploadScreen.ts    # Document upload helper screen
│   │   ├── constants.ts       # Config constants, site map
│   │   ├── fonts.ts           # DM Sans font loader
│   │   └── types.ts           # Shared message type definitions
│   └── popup/
│       ├── App.tsx            # Extension popup (React)
│       └── main.tsx           # React entry point
├── wxt.config.ts              # Manifest + build config
├── package.json
└── tsconfig.json
```

---

## Extension Permissions

Declared in [wxt.config.ts](wxt.config.ts):

| Permission  | Reason                                                                        |
| ----------- | ----------------------------------------------------------------------------- |
| `storage`   | Persist user data and sessions                                                |
| `activeTab` | Detect current tab URL in popup                                               |
| `scripting` | Inject content scripts dynamically                                            |
| `alarms`    | Payment status polling (MV3 replacement for `setInterval` in service workers) |
| `tabs`      | Open payment page in new tab                                                  |

**Host permissions** (sites where content scripts run):

- `https://onlineservices.proteantech.in/*` — PAN (Protean)
- `https://onlineservices.nsdl.com/*` — PAN (NSDL)
- `https://www.utiitsl.com/*` — PAN (UTI)
- `https://passporthub.gov.in/*` — Passport
- `https://sarathi.parivahan.gov.in/*` — Driving License
- `https://formyaar.in/*` — Payment page
- `https://formyaar-backend-production.up.railway.app/*` — Backend API

---

## Message Bus

All cross-component communication goes through `browser.runtime.sendMessage`. Message types are defined in [entrypoints/content/types.ts](entrypoints/content/types.ts).

```typescript
type ExtensionMessage =
  | { type: "OPEN_PANEL" }
  | { type: "START_GUIDE"; form: string }
  | { type: "STOP_GUIDE" }
  | { type: "PAYMENT_VERIFIED"; order_id?: string }
  | {
      type: "AI_CHAT";
      fieldId: string;
      fieldExplanation: string;
      userMessage: string;
    }
  | { type: "CREATE_PAYMENT"; form: string }
  | { type: "OPEN_RAZORPAY"; order_id: string; amount: number }
  | { type: "OPEN_URL"; url: string }
  | {
      type: "TELEMETRY_EVENT";
      payload: {
        event: string;
        form: string;
        metadata: Record<string, unknown>;
      };
    };
```

**Why route everything through the service worker?**  
Government sites enforce strict CSPs that block `fetch()` from content scripts. The service worker is the only context that can call external APIs freely, so all network requests are proxied through `background.ts`.

---

## Components

### background.ts — Service Worker

The central hub. Listens for messages from content scripts and the popup, then either handles them locally or forwards to the backend.

**Handlers:**

| Message            | Action                                                              |
| ------------------ | ------------------------------------------------------------------- |
| `AI_CHAT`          | `POST /ai/chat` → returns `{ response: string }`                    |
| `CREATE_PAYMENT`   | `POST /payment/create-order` → returns `{ order_id, amount }`       |
| `OPEN_RAZORPAY`    | Opens `formyaar.in/pay?order_id=…` in new tab; starts polling alarm |
| `PAYMENT_VERIFIED` | Stores `ActiveSession` in local storage; notifies content script    |
| `TELEMETRY_EVENT`  | `POST /telemetry/event` (fire-and-forget)                           |

**Payment polling** uses `browser.alarms` (required in MV3 — service workers are not persistent):

```
Interval: 0.1 min (~6 seconds)
Max attempts: 60 (5 minute timeout)
Endpoint: GET /payment/status/{orderId}
On success: clear alarm, send PAYMENT_VERIFIED to origin tab
On timeout: clear alarm, surface error
```

State during polling is kept in `browser.storage.session` under the key `pendingPayment: { orderId, originTabId, attempts }`.

---

### content/index.ts — Content Script Entry

Injected into every configured government site. Responsibilities:

1. Reads hostname → looks up `SITE_CONFIGS` in [constants.ts](entrypoints/content/constants.ts)
2. After 1500ms delay, calls `showContextualBanner()` from `panel.ts`
3. Listens for `OPEN_PANEL` (from popup) → renders side panel
4. Listens for `PAYMENT_VERIFIED` → calls `runAutofill(form)`
5. Watches for "next step" button clicks via `MutationObserver` on `.stepy-step` — waits 300ms for the next page section to render, then re-runs autofill

---

### content/autofill.ts — Form-Filling Engine

The most complex file (~569 lines). Entry points:

**`runAutofill(form: string)`**

1. Fetches `FormConfig` from `GET /configs/{form}/latest`
2. Loads `UserData` from storage
3. Calls `matchStep(config)` to identify which config step matches the current URL
4. Iterates fields in the matched step and fills each one
5. For PAN step 4: calls `autoFillAOCode(pinCode)` to select AO automatically
6. Shows verify/upload screens on completion

**`runAutofillFromSubmission(submission: any)`**  
Operator variant. Converts a queue submission object to `UserData`, saves it to session storage (overrides regular user data), then calls `runAutofill`.

**Step matching (`matchStep`):**

- Checks for NSDL token page first (special case)
- Matches `window.location.pathname + search` against `step.page_pattern`
- For `endUserLogin` pages: detects the currently visible `.stepy-step` by index

**Field filling (`fillField`):**

| Field type     | Strategy                                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `text`         | Native input value setter bypass + `input`, `change`, `blur` events (React/Angular apps ignore direct value assignment) |
| `select`       | Match option by `.value` or `.text`; falls back to Select2 trigger                                                      |
| `checkbox`     | Set `checked`, fire `change` + `click`                                                                                  |
| `radio`        | Find matching `value`, set `checked`, fire `change` + `click`                                                           |
| `date`         | Same as `text` with format string applied                                                                               |
| `button_click` | Click with 2500ms wait for element to become enabled                                                                    |

**Value resolution (`resolveValue`):**

`value_source` in the config is a dot-path into `UserData` (e.g. `user.first_name`) or a special token:

- `user.aadhaar_first_8` → `aadhaar_number.slice(0, 8)` (derived)
- `static` → use `field.static_value` directly
- For checkboxes: value resolves to `user.is_defence === field.static_value`

**AO Code auto-fill (`autoFillAOCode`):**

1. `GET /pincode/{pinCode}` → `{ state, city }`
2. Select state dropdown, wait for AJAX to populate city list
3. Select city dropdown
4. Click "Fetch" button
5. Wait for AO table to appear
6. Auto-select first row that is not "EXEMPTION" or "COMPANY"

---

### content/panel.ts — Side Panel UI

~1787 lines of HTML/CSS/JS rendered as strings and injected into the page. Uses `innerHTML` to mount React-free UI (avoids conflicts with page's own React/Angular instances).

**Screens:**

| Function                                       | Screen                                  |
| ---------------------------------------------- | --------------------------------------- |
| `showContextualBanner()`                       | Slide-in panel, home screen             |
| `renderHomeScreen()`                           | 6 form cards, start button              |
| `renderUserFormScreen()`                       | Personal details collection             |
| `renderPaymentScreen()`                        | ₹29 pricing + Razorpay button           |
| `showFillingScreen()` / `updateFillProgress()` | Real-time fill progress                 |
| `showVerifyScreen()`                           | "All done" + manual step instructions   |
| `showResumeScreen(session)`                    | Welcome back after payment confirmation |
| `showUploadScreen()`                           | Document upload helper (last PAN step)  |
| Operator screens                               | Login, queue list, submission review    |

**Z-index layering** (from [constants.ts](entrypoints/content/constants.ts)):

```
BARS:      999997
SPOTLIGHT: 999998
TOOLTIP:   999999
PANEL:     2147483647  (max int — always on top)
```

**Styling notes:**

- Font: DM Sans (loaded by `fonts.ts` before render)
- All CSS is inline in template literal strings
- No external stylesheets or shadow DOM — designed to override site styles at max z-index

---

### content/userData.ts — Storage Manager

Handles all user data persistence.

**`UserData` interface (key fields):**

```typescript
{
  (first_name, middle_name, last_name);
  date_of_birth; // DD/MM/YYYY
  gender; // "M" | "F" | "T"
  (email, mobile); // validated at input
  aadhaar_number; // 12 digits
  aadhaar_pin_code; // 6 digits
  father_first / middle / last_name;
  mother_first / middle / last_name;
  (parent_on_card_is_father, parent_on_card_is_mother);
  proof_of_dob; // dropdown value
  is_defence; // boolean
  income_source; // "salary" | "business" | ...
  place; // city
}
```

**Storage keys:**

| Key                      | Store     | Contents                                                         |
| ------------------------ | --------- | ---------------------------------------------------------------- |
| `fy_user_data`           | `local`   | Regular user's personal data                                     |
| `fy_active_session`      | `local`   | Current payment session `{ form, order_id, paid_at, completed }` |
| `fy_operator_session`    | `local`   | Operator auth `{ id, email, subscription_status }`               |
| `fy_operator_submission` | `session` | Active submission (takes priority over `fy_user_data`)           |
| `pendingPayment`         | `session` | Payment polling state `{ orderId, originTabId, attempts }`       |

`local` = persists across browser restarts. `session` = cleared when all extension contexts close.

**`getUserData()`** checks session storage first (operator override), then falls back to local storage. This is how the operator flow transparently replaces user data without touching the autofill logic.

---

### content/supabase.ts — Operator Auth

Operators use short-lived tokens (generated in their dashboard) to authenticate the extension without a full login flow.

```
Operator generates token in dashboard
  → Enters token in extension
  → POST /operator/verify-token
  → Backend returns OperatorSession
  → Stored in browser.storage.local under "fy_operator_session"
```

Token lifetime: 5 minutes (enforced server-side).

**`OperatorSession` type:**

```typescript
{
  id: string;
  email: string;
  subscription_status: "active" | "inactive" | "expired";
  subscription_expires_at: string | null;
}
```

---

### content/telemetry.ts

Single exported function `trackEvent(event, form, metadata)`. Routes through background service worker (CSP bypass). Never throws — analytics must never interrupt the fill flow.

**Events emitted:**

| Event               | When                                     |
| ------------------- | ---------------------------------------- |
| `banner_shown`      | Panel first appears on a supported site  |
| `guide_started`     | Autofill begins                          |
| `guide_completed`   | Autofill finishes all fields             |
| `step_match_failed` | Current URL didn't match any config step |
| `field_fill_failed` | A single field couldn't be filled        |
| `ao_code_failed`    | AO auto-selection failed                 |

---

### popup/App.tsx — Extension Popup

React component shown when the user clicks the extension icon.

**States:**

1. **Loading** — querying active tab URL
2. **Supported** — green checkmark + "Open FormYaar" button → sends `OPEN_PANEL` to content script, then closes popup
3. **Unsupported** — lists supported government sites

---

## User Flows

### Regular User

```
1. Land on supported government site
2. Extension auto-shows side panel after 1.5s
3. User fills personal details form in panel
4. Clicks "Continue to Pay ₹29"
5. Payment page opens in new tab (Razorpay)
6. Background polls /payment/status every 6s
7. On payment captured → PAYMENT_VERIFIED sent to content script
8. runAutofill() fetches config, fills all fields
9. showVerifyScreen() guides user through manual steps (upload, CAPTCHA, submit)
```

### Cafe Operator

```
1. Operator enters token → signInWithToken() → session stored
2. Opens queue → GET /operator/queue/{id} → lists pending submissions
3. Clicks submission → review screen shows customer data
4. Clicks "Accept & Fill"
5. runAutofillFromSubmission() converts submission → UserData → session storage
6. runAutofill() fills form with customer's data
7. Operator oversees and submits
```

---

## Build & Development

```bash
# Install dependencies
npm install

# Development (hot reload)
npm run dev

# Production build (Chrome MV3)
npm run build

# Firefox build
npm run build:firefox

# Create distributable ZIP
npm run zip

# TypeScript type checking only
npm run compile
```

Built output goes to `.output/chrome-mv3/` (Chrome) or `.output/firefox-mv3/`.

---

## Backend API Reference

Base URL: `https://formyaar-backend-production.up.railway.app`

| Method | Path                        | Called By     | Purpose                    |
| ------ | --------------------------- | ------------- | -------------------------- |
| `POST` | `/ai/chat`                  | background.ts | Claude AI field assistance |
| `POST` | `/payment/create-order`     | background.ts | Create Razorpay order      |
| `GET`  | `/payment/status/:order_id` | background.ts | Poll payment status        |
| `POST` | `/payment/confirm`          | pay.html      | Verify Razorpay signature  |
| `GET`  | `/configs/:form/latest`     | autofill.ts   | Fetch form fill config     |
| `GET`  | `/pincode/:pincode`         | autofill.ts   | PIN code → state/city      |
| `POST` | `/operator/verify-token`    | supabase.ts   | Authenticate operator      |
| `GET`  | `/operator/queue/:id`       | panel.ts      | List pending submissions   |
| `POST` | `/telemetry/event`          | telemetry.ts  | Track analytics event      |

---

## Form Config Schema

Configs drive all autofill behavior. Fetched at runtime from `/configs/:form/latest`.

```typescript
interface FormConfig {
  form: string; // "pan_card" | "passport" | "driving_license"
  version: number;
  site: string;
  steps: {
    step: number;
    page_pattern: string; // matched against pathname+search
    stop_message: string;
    fields: {
      field_id: string;
      type: "text" | "select" | "checkbox" | "date" | "radio" | "button_click";
      selector: string; // CSS selector
      value_source: string; // "user.first_name" | "static" | ...
      static_value?: string | boolean;
      match_by?: "value" | "text"; // for selects
      format?: string; // for dates
      explanation: string; // shown in panel + used in AI prompts
    }[];
  }[];
}
```

To add support for a new form step or site layout change: update the relevant JSON config in the backend (`configs/` directory) — no extension rebuild required.

---

## Key Design Decisions

**Config-driven autofill** — Form field selectors live in JSON on the backend. When a government site changes its HTML, only the config needs updating, not the extension (which requires Chrome Web Store review).

**No content-script fetch** — All `fetch()` calls go through the service worker to avoid CSP violations on government sites.

**MV3 alarms for payment polling** — Service workers in MV3 don't stay alive. `browser.alarms` fires the worker periodically to poll `/payment/status`, eliminating the need for a persistent connection.

**Operator session override** — Storing operator submission data in `session` storage (vs `local`) means it automatically disappears when the browser session ends, and it takes priority over personal data without any conditional logic in `autofill.ts`.

**Inline CSS/HTML in panel.ts** — Avoids style injection into the page's `<head>` (which can break government site layouts) and prevents conflicts with page-level CSS by using explicit z-index and fixed positioning.
