import {
  startGuide,
  nextField,
  stopGuide,
  getCurrentIndex,
  getTotalFields,
  type Field,
  type Guide,
} from "./guide";

const TEST_GUIDE: Guide = {
  form: "test",
  fields: [
    {
      id: "field_1",
      selector: 'input[type="text"]',
      explanation:
        "Enter your full name exactly as it appears on your Aadhaar card. Do not use short forms or initials.",
      required: true,
    },
    {
      id: "field_2",
      selector: 'input[type="tel"]',
      explanation:
        "Enter your 10-digit mobile number. You will receive an OTP on this number.",
      required: true,
    },
    {
      id: "field_3",
      selector: 'input[type="email"]',
      explanation:
        "Enter your email address. A confirmation will be sent here. You can skip this if you do not have one.",
      required: false,
    },
  ],
};

export default defineContentScript({
  matches: ["*://*/*"],
  async main() {
    console.log("FormYaar loaded on:", window.location.href);
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === "START_GUIDE")
        beginGuide(message.form ?? "pan_card");
      if (message.type === "OPEN_PANEL") showContextualBanner();
      if (message.type === "STOP_GUIDE") {
        stopGuide();
        stopOverlay();
      }
      if (message.type === "PAYMENT_VERIFIED") {
        const panel = document.getElementById("formyaar-panel");
        if (panel) panel.style.right = "-400px";
        setTimeout(() => {
          panel?.remove();
          document.getElementById("formyaar-tab")?.remove();
          beginGuide();
        }, 300);
      }
    });
    // Watch for page navigation
    let lastUrl = window.location.href;
    const navigationObserver = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        console.log("FormYaar: page changed to", lastUrl);
        handlePageChange();
      }
    });
    navigationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also handle back/forward
    window.addEventListener("popstate", () => {
      handlePageChange();
    });
    // Show contextual banner on supported sites
    const hostname = window.location.hostname;
    if (SITE_CONFIGS[hostname]) {
      setTimeout(() => showContextualBanner(), 1500);
    }
  },
});
async function fetchGuide(form: string): Promise<Guide | null> {
  try {
    const res = await fetch(
      `https://formyaar-backend-production.up.railway.app/configs/${form}/latest`,
    );
    if (!res.ok) return null;
    const config = await res.json();

    // Convert backend config format to Guide format
    const fields: Field[] = [];
    for (const step of config.steps) {
      for (const field of step.fields) {
        fields.push({
          id: field.field_id,
          selector: field.selectors?.[0]?.value ?? field.selector,
          explanation: field.explanation,
          required: field.required ?? true,
        });
      }
    }

    return { form: config.form, fields };
  } catch (err) {
    console.warn(
      "FormYaar: could not fetch config, falling back to test guide",
      err,
    );
    return null;
  }
}
function handlePageChange() {
  // If guide is active, check if current page matches next step
  const currentGuideIndex = getCurrentIndex();
  const totalFields = getTotalFields();

  if (currentGuideIndex >= totalFields) return; // guide finished

  // Small delay to let new page DOM load
  setTimeout(() => {
    const field = TEST_GUIDE.fields[currentGuideIndex];
    if (!field) return;

    // Try to find the current field on new page
    const target = document.querySelector(field.selector);
    if (target) {
      console.log("FormYaar: found field on new page, continuing guide");
      stopOverlay();
      startOverlay(field.selector, field.explanation, field.required ?? true);
    }
  }, 1000);
}
async function beginGuide(form = "pan_card") {
  const guide = await fetchGuide(form);

  if (!guide || guide.fields.length === 0) {
    showErrorMessage(
      "Couldn't load the form guide. Please refresh and try again.",
    );
    return;
  }
  startGuide(
    guide,
    (field: Field) =>
      startOverlay(field.selector, field.explanation, field.required ?? true),
    () => {
      stopOverlay();
      showCompletionMessage();
    },
  );
}

// ---- OVERLAY ENGINE ----

let scrollListener: (() => void) | null = null;
let resizeListener: (() => void) | null = null;
let activeTarget: HTMLElement | null = null;

function startOverlay(
  selector: string,
  explanation: string,
  required: boolean,
) {
  stopOverlay();

  const target = document.querySelector(selector) as HTMLElement;
  if (!target) {
    console.warn("FormYaar: element not found:", selector);
    nextField();
    return;
  }
  activeTarget = target;

  // Check if already filled — skip with checkmark
  const currentValue = (target as HTMLInputElement).value?.trim();
  const isRequired = required;
  if (currentValue && currentValue.length > 0) {
    showSkipFlash(target);
    setTimeout(() => nextField(), 600);
    return;
  }

  target.scrollIntoView({ behavior: "smooth", block: "center" });

  setTimeout(() => {
    drawOverlay(target, explanation, required);
    scrollListener = () => repositionOverlay(target);
    resizeListener = () => repositionOverlay(target);
    window.addEventListener("scroll", scrollListener, true);
    window.addEventListener("resize", resizeListener);
  }, 400);
}

function createBar(id: string): HTMLElement {
  const bar = document.createElement("div");
  bar.id = id;
  bar.style.cssText = `
    position: fixed;
    background: rgba(0, 0, 0, 0.55);
    z-index: 999997;
    pointer-events: none;
    transition: all 0.08s ease;
  `;
  return bar;
}

function drawOverlay(
  target: HTMLElement,
  explanation: string,
  required: boolean,
) {
  const rect = target.getBoundingClientRect();
  const pad = 8;
  const top = rect.top - pad;
  const left = rect.left - pad;
  const right = rect.right + pad;
  const bottom = rect.bottom + pad;
  const W = window.innerWidth;
  const H = window.innerHeight;

  const barTop = createBar("fy-bar-top");
  barTop.style.cssText += `top:0;left:0;width:${W}px;height:${top}px;`;
  const barBottom = createBar("fy-bar-bottom");
  barBottom.style.cssText += `top:${bottom}px;left:0;width:${W}px;height:${H - bottom}px;`;
  const barLeft = createBar("fy-bar-left");
  barLeft.style.cssText += `top:${top}px;left:0;width:${left}px;height:${bottom - top}px;`;
  const barRight = createBar("fy-bar-right");
  barRight.style.cssText += `top:${top}px;left:${right}px;width:${W - right}px;height:${bottom - top}px;`;

  const spotlight = document.createElement("div");
  spotlight.id = "formyaar-spotlight";
  spotlight.style.cssText = `
    position: fixed;
    top: ${top}px;
    left: ${left}px;
    width: ${right - left}px;
    height: ${bottom - top}px;
    border-radius: 6px;
   border: 2.5px solid #000080;
    box-shadow: 0 0 0 4px rgba(0,0,128,0.08);
    z-index: 999998;
    pointer-events: none;
    transition: all 0.08s ease;
  `;

  // Check if already filled
  const isFilled = (target as HTMLInputElement).value?.trim().length > 0;
  const isDisabled = required && !isFilled;

  const tooltip = document.createElement("div");
  tooltip.id = "formyaar-tooltip";
  const { top: tTop, left: tLeft } = getTooltipPosition(rect);
  tooltip.style.cssText = `
    position: fixed;
    top: ${tTop}px;
    left: ${tLeft}px;
    width: 340px;
    z-index: 999999;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 6px 28px rgba(0,0,0,0.18);
    pointer-events: auto;
    font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
  `;
  const totalFields = getTotalFields();
  const currentIdx = getCurrentIndex();

  // Build progress dots HTML
  const dotsHTML = Array.from({ length: totalFields }, (_, i) => {
    const done = i < currentIdx;
    const active = i === currentIdx;
    return `<div style="
      width:${active ? "16px" : "6px"};
      height:6px;
      border-radius:3px;
      background:${done ? "#4ade80" : active ? "#fff" : "rgba(255,255,255,0.25)"};
      transition:all 0.25s ease;
      display:flex;align-items:center;justify-content:center;
    ">${done ? `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : ""}</div>`;
  }).join("");

  tooltip.innerHTML = `
    <!-- HEADER -->
    <div style="
      background:#000080;
      padding:9px 13px;
      display:flex;
      align-items:center;
      gap:8px;
    ">
      <!-- Logo -->
      <div style="display:flex;align-items:baseline;letter-spacing:-0.5px;line-height:1;flex-shrink:0;">
        <span style="font-weight:200;font-size:15px;color:#fff;">Form</span>
        <span style="font-weight:800;font-size:11px;color:#E8930A;margin:0 1.5px 0 0.5px;position:relative;top:-1.5px;">·</span>
        <span style="font-weight:800;font-size:15px;color:#fff;">Yaar</span>
      </div>

      <div style="flex:1;"></div>

      <!-- Progress dots -->
      <div style="display:flex;align-items:center;gap:4px;">
        ${dotsHTML}
        <span style="font-size:10px;color:rgba(255,255,255,0.6);font-weight:600;margin-left:3px;">${currentIdx + 1}/${totalFields}</span>
      </div>

      <!-- Required badge -->
      ${
        required
          ? `<span style="font-size:9.5px;font-weight:700;background:#E8930A;color:#fff;padding:2.5px 8px;border-radius:4px;letter-spacing:0.2px;flex-shrink:0;">Required</span>`
          : `<span style="font-size:9.5px;font-weight:700;background:rgba(255,255,255,0.15);color:rgba(255,255,255,0.7);padding:2.5px 8px;border-radius:4px;flex-shrink:0;">Optional</span>`
      }

      <!-- Pause button -->
      <button id="fy-pause-btn" style="
        background:rgba(255,255,255,0.12);
        border:1px solid rgba(255,255,255,0.2);
        border-radius:6px;
        padding:4px 9px;
        cursor:pointer;
        display:flex;align-items:center;gap:4px;
        color:#fff;font-size:10.5px;font-weight:700;
        flex-shrink:0;
        font-family:'Plus Jakarta Sans','DM Sans',sans-serif;
      ">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        Pause
      </button>
    </div>

    <!-- BODY -->
    <div style="background:#fff;padding:14px 16px 12px;">
      <p style="font-size:13.5px;color:#222;line-height:1.65;">${explanation}</p>

      <!-- Chat area -->
      <div id="fy-chat-area" style="display:none;margin-top:12px;">
        <div id="fy-chat-response" style="
          background:#f8f9fa;border:1px solid #e0e0e0;border-radius:6px;
          padding:8px 10px;font-size:12px;color:#333;margin-bottom:8px;
          min-height:36px;line-height:1.5;display:none;
        "></div>
        <div style="display:flex;gap:6px;">
          <input id="fy-chat-input" type="text" placeholder="Ask anything about this field..." style="
            flex:1;background:#f8f9fa;border:1px solid #ddd;border-radius:6px;
            padding:7px 10px;font-size:12px;color:#333;outline:none;
            font-family:'Plus Jakarta Sans','DM Sans',sans-serif;
          "/>
          <button id="fy-chat-send" style="
            background:#000080;color:#fff;border:none;border-radius:6px;
            padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;
            font-family:'Plus Jakarta Sans','DM Sans',sans-serif;
          ">Ask</button>
        </div>
      </div>

      ${
        required && isDisabled
          ? '<div id="fy-warning" style="font-size:11px;color:#dc3545;margin-top:8px;display:none;">Please fill this field before continuing.</div>'
          : ""
      }
    </div>

    <!-- FOOTER -->
    <div style="
      background:#fff;
      padding:8px 13px 12px;
      display:flex;align-items:center;justify-content:space-between;
      border-top:1px solid #f0edf8;
    ">
      <button id="formyaar-help-btn" style="
        background:#fff;border:1.5px solid #000080;border-radius:7px;
        padding:6px 16px;cursor:pointer;font-size:13px;font-weight:700;
        color:#000080;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;
      ">Help</button>

      <button id="formyaar-next-btn" style="
        background:${isDisabled ? "#e8e6f0" : "#000080"};
        color:${isDisabled ? "#b0aac4" : "#ffffff"};
        border:none;border-radius:7px;
        padding:6px 18px;
        cursor:${isDisabled ? "not-allowed" : "pointer"};
        font-size:13px;font-weight:700;
        font-family:'Plus Jakarta Sans','DM Sans',sans-serif;
        transition:all 0.2s ease;
      " ${isDisabled ? 'data-disabled="true"' : ""}>Next →</button>
    </div>

    <!-- TRICOLOR STRIP -->
    <div style="height:3px;display:flex;">
      <div style="flex:1;background:#FF9933;"></div>
      <div style="flex:1;background:#ffffff;border-top:1px solid #eee;"></div>
      <div style="flex:1;background:#138808;"></div>
    </div>
  `;

  document.body.appendChild(barTop);
  document.body.appendChild(barBottom);
  document.body.appendChild(barLeft);
  document.body.appendChild(barRight);
  document.body.appendChild(spotlight);
  document.body.appendChild(tooltip);

  document.getElementById("formyaar-tooltip")!.style.pointerEvents = "auto";

  // Next button
  document
    .getElementById("formyaar-next-btn")
    ?.addEventListener("click", () => {
      const btn = document.getElementById(
        "formyaar-next-btn",
      ) as HTMLButtonElement;
      if (btn.dataset.disabled === "true") {
        const warning = document.getElementById("fy-warning");
        if (warning) warning.style.display = "block";
        tooltip.style.transform = "translateX(-6px)";
        setTimeout(() => {
          tooltip.style.transform = "translateX(6px)";
        }, 80);
        setTimeout(() => {
          tooltip.style.transform = "translateX(-4px)";
        }, 160);
        setTimeout(() => {
          tooltip.style.transform = "translateX(0)";
        }, 240);
        return;
      }
      if (required) target.removeEventListener("input", onInputChange);
      nextField();
    });

  document.getElementById("fy-pause-btn")?.addEventListener("click", () => {
    // Hide tooltip
    document.getElementById("formyaar-tooltip")?.remove();
    // Hide bars and spotlight but keep them in DOM so we can restore
    [
      "fy-bar-top",
      "fy-bar-bottom",
      "fy-bar-left",
      "fy-bar-right",
      "formyaar-spotlight",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
    showResumeButton();
  });

  // Help button — toggle chat area
  document
    .getElementById("formyaar-help-btn")
    ?.addEventListener("click", () => {
      const chatArea = document.getElementById("fy-chat-area");
      if (!chatArea) return;
      const isOpen = chatArea.style.display !== "none";
      chatArea.style.display = isOpen ? "none" : "block";
      if (!isOpen) {
        setTimeout(() => document.getElementById("fy-chat-input")?.focus(), 50);
      }
    });

  // Send button
  document
    .getElementById("fy-chat-send")
    ?.addEventListener("click", () => sendHelpMessage(explanation));

  // Enter key in input
  document.getElementById("fy-chat-input")?.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") sendHelpMessage(explanation);
  });
  // Watch for input to enable Next button
  if (required) {
    target.addEventListener("input", onInputChange);
    target.addEventListener("keyup", onInputChange);
  }
}

function onInputChange(e: Event) {
  const field = e.target as HTMLInputElement;
  const isFilled = field.value?.trim().length > 0;
  const btn = document.getElementById("formyaar-next-btn") as HTMLButtonElement;
  const warning = document.getElementById("fy-warning");
  if (!btn) return;

  if (isFilled) {
    btn.style.background = "#000080";
    btn.style.color = "#ffffff";
    btn.style.cursor = "pointer";
    btn.dataset.disabled = "false";
    if (warning) warning.style.display = "none";
  } else {
    btn.style.background = "#003087";
    btn.style.color = "#888888";
    btn.style.cursor = "not-allowed";
    btn.dataset.disabled = "true";
  }
}

function repositionOverlay(target: HTMLElement) {
  const spotlight = document.getElementById("formyaar-spotlight");
  const tooltip = document.getElementById("formyaar-tooltip");
  const barTop = document.getElementById("fy-bar-top");
  const barBottom = document.getElementById("fy-bar-bottom");
  const barLeft = document.getElementById("fy-bar-left");
  const barRight = document.getElementById("fy-bar-right");
  if (!spotlight || !tooltip || !barTop || !barBottom || !barLeft || !barRight)
    return;

  const rect = target.getBoundingClientRect();
  const pad = 8;
  const top = rect.top - pad;
  const left = rect.left - pad;
  const right = rect.right + pad;
  const bottom = rect.bottom + pad;
  const W = window.innerWidth;
  const H = window.innerHeight;

  barTop.style.height = `${top}px`;
  barBottom.style.top = `${bottom}px`;
  barBottom.style.height = `${H - bottom}px`;
  barLeft.style.top = `${top}px`;
  barLeft.style.width = `${left}px`;
  barLeft.style.height = `${bottom - top}px`;
  barRight.style.top = `${top}px`;
  barRight.style.left = `${right}px`;
  barRight.style.width = `${W - right}px`;
  barRight.style.height = `${bottom - top}px`;
  spotlight.style.top = `${top}px`;
  spotlight.style.left = `${left}px`;
  spotlight.style.width = `${right - left}px`;
  spotlight.style.height = `${bottom - top}px`;

  const { top: tTop, left: tLeft } = getTooltipPosition(rect);
  tooltip.style.top = `${tTop}px`;
  tooltip.style.left = `${tLeft}px`;
}

function getTooltipPosition(rect: DOMRect) {
  const spaceBelow = window.innerHeight - rect.bottom;
  const top = spaceBelow > 120 ? rect.bottom + 14 : rect.top - 120;
  const left = Math.min(Math.max(rect.left - 8, 12), window.innerWidth - 320);
  return { top, left };
}

function stopOverlay() {
  [
    "formyaar-spotlight",
    "formyaar-tooltip",
    "fy-bar-top",
    "fy-bar-bottom",
    "fy-bar-left",
    "fy-bar-right",
    "fy-resume-btn",
  ].forEach((id) => document.getElementById(id)?.remove());
  if (scrollListener)
    window.removeEventListener("scroll", scrollListener, true);
  if (resizeListener) window.removeEventListener("resize", resizeListener);
  if (activeTarget) activeTarget.removeEventListener("input", onInputChange);
  if (activeTarget) activeTarget.removeEventListener("keyup", onInputChange);
  scrollListener = null;
  resizeListener = null;
  activeTarget = null;
}
async function sendHelpMessage(fieldExplanation: string) {
  const input = document.getElementById("fy-chat-input") as HTMLInputElement;
  const responseDiv = document.getElementById("fy-chat-response");
  const sendBtn = document.getElementById("fy-chat-send") as HTMLButtonElement;
  if (!input || !responseDiv) return;

  const userMessage = input.value.trim();
  if (!userMessage) return;

  input.value = "";
  sendBtn.textContent = "...";
  sendBtn.style.opacity = "0.6";
  responseDiv.style.display = "block";
  responseDiv.textContent = "Thinking...";

  try {
    const response = await browser.runtime.sendMessage({
      type: "AI_CHAT",
      fieldExplanation,
      userMessage,
    });

    if (response?.success) {
      responseDiv.textContent = response.response;
    } else {
      responseDiv.textContent = "Could not get a response. Please try again.";
    }
  } catch {
    responseDiv.textContent = "Could not connect to FormYaar server.";
  } finally {
    sendBtn.textContent = "Ask";
    sendBtn.style.opacity = "1";
  }
}
const SITE_CONFIGS: Record<string, { title: string; form: string }> = {
  "onlineservices.nsdl.com": {
    title: "Looks like you're applying for a PAN card.",
    form: "pan_card",
  },
  "onlineservices.proteantech.in": {
    title: "Looks like you're applying for a PAN card.",
    form: "pan_card",
  },
  "www.utiitsl.com": {
    title: "Looks like you're on the PAN card portal.",
    form: "pan_card",
  },
  "passporthub.gov.in": {
    title: "Looks like you're applying for a Passport.",
    form: "passport",
  },
  "sarathi.parivahan.gov.in": {
    title: "Looks like you're on the Driving License portal.",
    form: "driving_license",
  },
  "trimzy.in": {
    title: "Testing FormYaar banner.",
    form: "test",
  },
};

function showContextualBanner() {
  if (sessionStorage.getItem("formyaar-dismissed")) return;
  if (document.getElementById("formyaar-panel")) return;

  const panel = document.createElement("div");
  panel.id = "formyaar-panel";
  panel.style.cssText = `
    position: fixed;
    top: 0;
    right: -400px;
    width: 400px;
    height: 100vh;
    background: #ffffff;
    z-index: 2147483647;
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    box-shadow: -4px 0 32px rgba(0,0,0,0.18);
    transition: right 0.3s ease;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;

  panel.innerHTML = `
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@200;400;800&display=swap" rel="stylesheet">
    <style>
      #formyaar-panel * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', -apple-system, sans-serif; }
      #formyaar-panel input { font-family: inherit; }
      #formyaar-panel button { font-family: inherit; }
      @keyframes fy-fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes fy-spin { to { transform: rotate(360deg); } }
      @keyframes fy-successPop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
      .fy-card-hover { transition: transform 0.15s ease, box-shadow 0.15s ease; cursor: pointer; }
      .fy-card-hover:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(130,28,255,0.18) !important; }
      .fy-screen { animation: fy-fadeIn 0.2s ease; }
      .fy-method-btn { transition: all 0.15s ease; }
      .fy-pay-btn:hover { opacity: 0.92; }
    </style>

    <!-- HOME SCREEN -->
    <div id="fy-home" class="fy-screen" style="display:flex;flex-direction:column;height:100%;">

      <!-- Header -->
      <div style="position:relative;background:#000080;overflow:hidden;flex-shrink:0;">
        <!-- Ashoka Chakra watermark -->
        <div style="position:absolute;right:-8px;top:-8px;pointer-events:none;opacity:0.07;">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="33" fill="none" stroke="white" stroke-width="4.3"/>
            <circle cx="36" cy="36" r="8.6" fill="white"/>
            ${Array.from({ length: 24 }, (_, i) => {
              const a = (i * 15 * Math.PI) / 180;
              return `<line x1="${36 + 9 * Math.cos(a)}" y1="${36 + 9 * Math.sin(a)}" x2="${36 + 27 * Math.cos(a)}" y2="${36 + 27 * Math.sin(a)}" stroke="white" stroke-width="2.5"/>`;
            }).join("")}
          </svg>
        </div>

        <div style="padding:13px 16px;display:flex;align-items:center;gap:10px;position:relative;z-index:1;">
          <!-- India Flag -->
          <div style="width:40px;height:27px;border-radius:5px;overflow:hidden;border:1.5px solid rgba(255,255,255,0.25);flex-shrink:0;">
            <svg viewBox="0 0 900 600" width="40" height="27">
              <rect width="900" height="200" fill="#FF9933"/>
              <rect y="200" width="900" height="200" fill="#FFFFFF"/>
              <rect y="400" width="900" height="200" fill="#138808"/>
              <circle cx="450" cy="300" r="90" fill="none" stroke="#000080" stroke-width="22"/>
              <circle cx="450" cy="300" r="14" fill="#000080"/>
              ${Array.from({ length: 24 }, (_, i) => {
                const a = (i * 15 * Math.PI) / 180;
                return `<line x1="${450 + 14 * Math.cos(a)}" y1="${300 + 14 * Math.sin(a)}" x2="${450 + 82 * Math.cos(a)}" y2="${300 + 82 * Math.sin(a)}" stroke="#000080" stroke-width="9"/>`;
              }).join("")}
            </svg>
          </div>
          <div style="flex:1;">
          <div style="font-weight:800;font-size:16px;letter-spacing:-0.5px;color:#ffffff;line-height:1.2;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
  <span style="font-weight:200;color:rgba(255,255,255,0.7);">Form</span><span style="color:#E8930A;font-weight:800;">·</span><span style="font-weight:800;color:#ffffff;">Yaar</span>
</div>
            <div style="font-size:10.5px;color:#aabbd4;font-weight:500;letter-spacing:0.3px;">Your dost for every sarkari kaam</div>
          </div>
          <a href="https://formyaar.in/help" target="_blank" style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.13);border-radius:7px;padding:5px 10px;text-decoration:none;border:1px solid rgba(255,255,255,0.18);">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span style="font-size:11px;color:white;font-weight:700;opacity:0.9;">Help</span>
          </a>
        </div>
        <!-- Tricolor strip -->
        <div style="height:3px;display:flex;">
          <div style="flex:1;background:#FF9933;"></div>
          <div style="flex:1;background:#ffffff;"></div>
          <div style="flex:1;background:#138808;"></div>
        </div>
      </div>

      <!-- Body -->
      <div style="flex:1;overflow-y:auto;padding:18px 16px 20px;position:relative;">
        <!-- Flag watermark -->
        <svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 640">
          <defs>
            <radialGradient id="fy-wm1" cx="0%" cy="0%"><stop offset="0%" stop-color="#FF9933" stop-opacity="0.07"/><stop offset="100%" stop-color="#FF9933" stop-opacity="0"/></radialGradient>
            <radialGradient id="fy-wm2" cx="100%" cy="100%"><stop offset="0%" stop-color="#138808" stop-opacity="0.07"/><stop offset="100%" stop-color="#138808" stop-opacity="0"/></radialGradient>
          </defs>
          <ellipse cx="0" cy="0" rx="220" ry="160" fill="url(#fy-wm1)"/>
          <ellipse cx="400" cy="640" rx="220" ry="160" fill="url(#fy-wm2)"/>
        </svg>

        <div style="position:relative;z-index:1;">
          <p style="text-align:center;font-size:12.5px;color:#50507a;margin-bottom:16px;font-weight:500;letter-spacing:0.2px;">
            Select a government document to get started
          </p>

          <!-- Document grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">

            <!-- PAN Card (active) -->
            <button id="fy-pan-card" class="fy-card-hover" style="background:#ffffff;border:1.5px solid #821cff;border-radius:13px;padding:14px 6px 12px;display:flex;flex-direction:column;align-items:center;gap:8px;box-shadow:0 2px 14px rgba(130,28,255,0.1);position:relative;text-align:center;width:100%;">
              <svg viewBox="0 0 84 54" width="62" height="40">
                <defs>
                  <linearGradient id="fy-pcBg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#7bbde8"/><stop offset="55%" stop-color="#a8c8f0"/><stop offset="100%" stop-color="#c0a8e8"/>
                  </linearGradient>
                  <linearGradient id="fy-pcGold" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#f5d060"/><stop offset="100%" stop-color="#b8850a"/>
                  </linearGradient>
                </defs>
                <rect width="84" height="54" rx="4" fill="url(#fy-pcBg)"/>
                <rect width="84" height="54" rx="4" fill="none" stroke="#5aadd4" stroke-width="0.8"/>
                <rect width="84" height="18" rx="4" fill="#72c0e4" opacity="0.45"/>
                <rect y="14" width="84" height="4" fill="#72c0e4" opacity="0.45"/>
                <text x="3" y="7" font-size="4.2" fill="#00205b" font-weight="bold" font-family="Arial">INCOME TAX</text>
                <text x="3" y="13" font-size="3.4" fill="#00307a" font-family="Arial">DEPARTMENT</text>
                <text x="81" y="7" font-size="4.2" fill="#00205b" font-weight="bold" font-family="Arial" text-anchor="end">GOVT. OF INDIA</text>
                <circle cx="42" cy="9" r="7" fill="url(#fy-pcGold)"/>
                <circle cx="42" cy="9" r="6" fill="none" stroke="#7a5500" stroke-width="0.7"/>
                <text x="42" y="23" font-size="3.2" fill="#003087" font-family="Arial" text-anchor="middle" font-style="italic">Permanent Account Number Card</text>
                <text x="36" y="32" font-size="8.5" fill="#00205b" font-weight="bold" font-family="'Courier New'" letter-spacing="0.8">AAAAA1234A</text>
                <text x="3" y="38" font-size="2.8" fill="#336688" font-family="Arial">Name / नाम</text>
                <rect x="3" y="39.5" width="44" height="2.2" rx="1.1" fill="#003087" opacity="0.2"/>
                <text x="3" y="45" font-size="2.4" fill="#336688" font-family="Arial">Father's Name</text>
                <rect x="3" y="46.5" width="40" height="1.8" rx="0.9" fill="#003087" opacity="0.2"/>
                <text x="3" y="52" font-size="2.4" fill="#336688" font-family="Arial">DOB: DD/MM/YYYY</text>
                <rect x="65" y="22" width="16" height="20" rx="2" fill="white" stroke="#7aafc8" stroke-width="0.9"/>
                <text x="73" y="31" font-size="2.4" fill="#bbb" text-anchor="middle" font-family="Arial">CARD</text>
                <text x="73" y="34.5" font-size="2.4" fill="#bbb" text-anchor="middle" font-family="Arial">HOLDER</text>
                <text x="73" y="38" font-size="2.4" fill="#bbb" text-anchor="middle" font-family="Arial">PHOTO</text>
              </svg>
              <div>
                <div style="font-size:10.5px;font-weight:700;color:#0a0a2e;line-height:1.25;">PAN Card</div>
                <div style="font-size:9.5px;color:#821cff;margin-top:2px;font-weight:600;">New / Correction</div>
              </div>
            </button>

            <!-- Aadhaar (locked) -->
            <button style="background:#f2f2f8;border:1.5px solid #e0e0f0;border-radius:13px;padding:14px 6px 12px;display:flex;flex-direction:column;align-items:center;gap:8px;opacity:0.6;cursor:not-allowed;position:relative;text-align:center;width:100%;">
              <div style="position:absolute;top:7px;right:7px;color:#b0b0c0;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <svg width="38" height="38" viewBox="0 0 38 38" fill="none"><rect x="4" y="5" width="30" height="28" rx="3.5" stroke="#c0c0d0" stroke-width="2"/><path d="M13 22 Q19 15 25 22" stroke="#c0c0d0" stroke-width="1.8" stroke-linecap="round" fill="none"/><path d="M15 22 Q19 19 23 22" stroke="#c0c0d0" stroke-width="1.5" stroke-linecap="round" fill="none"/><circle cx="19" cy="17" r="1.5" fill="#c0c0d0"/><line x1="9" y1="27" x2="29" y2="27" stroke="#c0c0d0" stroke-width="1.4" stroke-linecap="round" stroke-dasharray="2 2"/></svg>
              <div><div style="font-size:10.5px;font-weight:700;color:#a0a0b8;">Aadhaar</div><div style="font-size:9.5px;color:#b8b8cc;margin-top:2px;font-weight:600;">Coming Soon</div></div>
            </button>

            <!-- Driving License (locked) -->
            <button style="background:#f2f2f8;border:1.5px solid #e0e0f0;border-radius:13px;padding:14px 6px 12px;display:flex;flex-direction:column;align-items:center;gap:8px;opacity:0.6;cursor:not-allowed;position:relative;text-align:center;width:100%;">
              <div style="position:absolute;top:7px;right:7px;color:#b0b0c0;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
              <svg width="38" height="38" viewBox="0 0 38 38" fill="none"><rect x="4" y="9" width="30" height="21" rx="3.5" stroke="#c0c0d0" stroke-width="2"/><circle cx="19" cy="19.5" r="6" stroke="#c0c0d0" stroke-width="1.8"/><circle cx="19" cy="19.5" r="2" stroke="#c0c0d0" stroke-width="1.5"/><line x1="19" y1="13.5" x2="19" y2="15.5" stroke="#c0c0d0" stroke-width="1.8" stroke-linecap="round"/><line x1="19" y1="23.5" x2="19" y2="25.5" stroke="#c0c0d0" stroke-width="1.8" stroke-linecap="round"/><line x1="13" y1="19.5" x2="15" y2="19.5" stroke="#c0c0d0" stroke-width="1.8" stroke-linecap="round"/><line x1="23" y1="19.5" x2="25" y2="19.5" stroke="#c0c0d0" stroke-width="1.8" stroke-linecap="round"/></svg>
              <div><div style="font-size:10.5px;font-weight:700;color:#a0a0b8;">Driving License</div><div style="font-size:9.5px;color:#b8b8cc;margin-top:2px;font-weight:600;">Coming Soon</div></div>
            </button>

            <!-- Voter ID (locked) -->
            <button style="background:#f2f2f8;border:1.5px solid #e0e0f0;border-radius:13px;padding:14px 6px 12px;display:flex;flex-direction:column;align-items:center;gap:8px;opacity:0.6;cursor:not-allowed;position:relative;text-align:center;width:100%;">
              <div style="position:absolute;top:7px;right:7px;color:#b0b0c0;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
              <svg width="38" height="38" viewBox="0 0 38 38" fill="none"><rect x="6" y="5" width="26" height="30" rx="3.5" stroke="#c0c0d0" stroke-width="2"/><line x1="11" y1="14" x2="27" y2="14" stroke="#c0c0d0" stroke-width="1.8" stroke-linecap="round"/><line x1="11" y1="19" x2="27" y2="19" stroke="#c0c0d0" stroke-width="1.8" stroke-linecap="round"/><line x1="11" y1="24" x2="20" y2="24" stroke="#c0c0d0" stroke-width="1.8" stroke-linecap="round"/></svg>
              <div><div style="font-size:10.5px;font-weight:700;color:#a0a0b8;">Voter ID</div><div style="font-size:9.5px;color:#b8b8cc;margin-top:2px;font-weight:600;">Coming Soon</div></div>
            </button>

            <!-- Passport (locked) -->
            <button style="background:#f2f2f8;border:1.5px solid #e0e0f0;border-radius:13px;padding:14px 6px 12px;display:flex;flex-direction:column;align-items:center;gap:8px;opacity:0.6;cursor:not-allowed;position:relative;text-align:center;width:100%;">
              <div style="position:absolute;top:7px;right:7px;color:#b0b0c0;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
              <svg width="38" height="38" viewBox="0 0 38 38" fill="none"><rect x="7" y="4" width="24" height="31" rx="3.5" stroke="#c0c0d0" stroke-width="2"/><circle cx="19" cy="17" r="5.5" stroke="#c0c0d0" stroke-width="1.8"/><line x1="13.5" y1="17" x2="24.5" y2="17" stroke="#c0c0d0" stroke-width="1.2" stroke-linecap="round"/><path d="M19 11.5 Q21.5 14 21.5 17 Q21.5 20 19 22.5" stroke="#c0c0d0" stroke-width="1.2" stroke-linecap="round" fill="none"/><path d="M19 11.5 Q16.5 14 16.5 17 Q16.5 20 19 22.5" stroke="#c0c0d0" stroke-width="1.2" stroke-linecap="round" fill="none"/><line x1="11" y1="27" x2="27" y2="27" stroke="#c0c0d0" stroke-width="1.6" stroke-linecap="round"/><line x1="11" y1="30" x2="22" y2="30" stroke="#c0c0d0" stroke-width="1.4" stroke-linecap="round"/></svg>
              <div><div style="font-size:10.5px;font-weight:700;color:#a0a0b8;">Passport</div><div style="font-size:9.5px;color:#b8b8cc;margin-top:2px;font-weight:600;">Coming Soon</div></div>
            </button>

            <!-- Visa (locked) -->
            <button style="background:#f2f2f8;border:1.5px solid #e0e0f0;border-radius:13px;padding:14px 6px 12px;display:flex;flex-direction:column;align-items:center;gap:8px;opacity:0.6;cursor:not-allowed;position:relative;text-align:center;width:100%;">
              <div style="position:absolute;top:7px;right:7px;color:#b0b0c0;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
              <svg width="38" height="38" viewBox="0 0 38 38" fill="none"><rect x="4" y="10" width="30" height="19" rx="3.5" stroke="#c0c0d0" stroke-width="2"/><line x1="4" y1="16.5" x2="34" y2="16.5" stroke="#c0c0d0" stroke-width="1.5"/><line x1="4" y1="22.5" x2="34" y2="22.5" stroke="#c0c0d0" stroke-width="1.5"/><line x1="8" y1="25.5" x2="16" y2="25.5" stroke="#c0c0d0" stroke-width="1.5" stroke-linecap="round"/><line x1="8" y1="13.5" x2="14" y2="13.5" stroke="#c0c0d0" stroke-width="2" stroke-linecap="round"/></svg>
              <div><div style="font-size:10.5px;font-weight:700;color:#a0a0b8;">Visa</div><div style="font-size:9.5px;color:#b8b8cc;margin-top:2px;font-weight:600;">Coming Soon</div></div>
            </button>

          </div>

          <div style="margin-top:12px;text-align:center;">
            <span style="font-size:10.5px;color:#50507a;font-weight:500;opacity:0.7;">+ More services coming soon — Passport, VISA &amp; more</span>
          </div>

          <!-- Onboarding info box -->
          <div style="margin-top:14px;background:rgba(130,28,255,0.05);border:1.5px solid rgba(130,28,255,0.13);border-radius:12px;padding:12px 13px;display:flex;gap:10px;align-items:flex-start;">
            <div style="flex-shrink:0;margin-top:1px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#821cff" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </div>
            <div>
              <div style="font-size:12px;color:#0a0a2e;font-weight:600;margin-bottom:3px;">New to FormYaar?</div>
              <div style="font-size:11px;color:#50507a;line-height:1.5;">We guide you through every field — no agent, no confusion. Takes 10 mins.</div>
              <a href="https://formyaar.in" target="_blank" style="font-size:11px;color:#821cff;font-weight:700;text-decoration:none;margin-top:5px;display:inline-block;">Visit formyaar.in to learn more →</a>
            </div>
          </div>

          <!-- Trust footer -->
          <div style="margin-top:12px;background:#f0f8ff;border:1px solid #bfd4ec;border-radius:10px;padding:9px 13px;display:flex;align-items:center;gap:8px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            <span style="font-size:11px;color:#50507a;font-weight:500;">We <strong style="color:#0a0a2e;">never store your information</strong></span>
          </div>
        </div>
        <div style="margin-top:10px;padding:6px 4px;text-align:center;display:flex;align-items:flex-start;gap:6px;justify-content:center;">
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2.2" stroke-linecap="round" style="flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
  <p style="font-size:9.5px;color:#aaa;line-height:1.5;font-weight:400;text-align:left;">Not affiliated with any government entity. FormYaar is a private service that helps you fill forms with ease.</p>
</div>
      </div>
    </div>

    <!-- PAYMENT SCREEN -->
    <div id="fy-payment" class="fy-screen" style="display:none;flex-direction:column;height:100%;">

      <!-- Header -->
      <div style="position:relative;background:#000080;overflow:hidden;flex-shrink:0;">
        <div style="position:absolute;right:-8px;top:-8px;pointer-events:none;opacity:0.07;">
          <svg width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="33" fill="none" stroke="white" stroke-width="4.3"/><circle cx="36" cy="36" r="8.6" fill="white"/>${Array.from(
            { length: 24 },
            (_, i) => {
              const a = (i * 15 * Math.PI) / 180;
              return `<line x1="${36 + 9 * Math.cos(a)}" y1="${36 + 9 * Math.sin(a)}" x2="${36 + 27 * Math.cos(a)}" y2="${36 + 27 * Math.sin(a)}" stroke="white" stroke-width="2.5"/>`;
            },
          ).join("")}</svg>
        </div>
        <div style="padding:13px 16px;display:flex;align-items:center;gap:10px;position:relative;z-index:1;">
          <button id="fy-back-btn" style="background:none;border:none;cursor:pointer;color:white;display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:600;opacity:0.9;padding:4px 0;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <div style="flex:1;text-align:center;">
            <div style="font-weight:800;font-size:16px;letter-spacing:-0.5px;color:#ffffff;line-height:1.2;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
  <span style="font-weight:200;color:rgba(255,255,255,0.7);">Form</span><span style="color:#E8930A;font-weight:800;">·</span><span style="font-weight:800;color:#ffffff;">Yaar</span>
</div>
            <div style="font-size:10.5px;color:#aabbd4;font-weight:500;">Secure Payment</div>
          </div>
          <div style="width:60px;"></div>
        </div>
        <div style="height:3px;display:flex;">
          <div style="flex:1;background:#FF9933;"></div>
          <div style="flex:1;background:#ffffff;"></div>
          <div style="flex:1;background:#138808;"></div>
        </div>
      </div>

      <!-- Payment body -->
      <div style="flex:1;overflow-y:auto;padding:18px 16px 24px;position:relative;">
        <svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 640">
          <defs>
            <radialGradient id="fy-wm3" cx="0%" cy="0%"><stop offset="0%" stop-color="#FF9933" stop-opacity="0.07"/><stop offset="100%" stop-color="#FF9933" stop-opacity="0"/></radialGradient>
            <radialGradient id="fy-wm4" cx="100%" cy="100%"><stop offset="0%" stop-color="#138808" stop-opacity="0.07"/><stop offset="100%" stop-color="#138808" stop-opacity="0"/></radialGradient>
          </defs>
          <ellipse cx="0" cy="0" rx="220" ry="160" fill="url(#fy-wm3)"/>
          <ellipse cx="400" cy="640" rx="220" ry="160" fill="url(#fy-wm4)"/>
        </svg>

        <div style="position:relative;z-index:1;">
         <!-- Amount hero -->
          <div style=\"background:linear-gradient(135deg,#000080 0%,#000060 100%);border-radius:14px;padding:22px 20px;color:#fff;margin-bottom:20px;position:relative;overflow:hidden;\">
            <div style=\"position:absolute;right:-14px;top:-14px;pointer-events:none;opacity:0.1;\">
              <svg width=\"90\" height=\"90\" viewBox=\"0 0 90 90\"><circle cx=\"45\" cy=\"45\" r=\"41\" fill=\"none\" stroke=\"white\" stroke-width=\"5.4\"/><circle cx=\"45\" cy=\"45\" r=\"10.8\" fill=\"white\"/></svg>
            </div>
            <div style=\"font-size:11px;opacity:0.8;font-weight:500;letter-spacing:0.3px;\">PAN CARD — NEW APPLICATION</div>
            <div style=\"font-size:36px;font-weight:800;margin-top:6px;letter-spacing:-0.5px;\">₹107</div>
            <div style=\"font-size:10.5px;opacity:0.72;margin-top:6px;\">Govt. fee ₹93 + Service fee ₹14 (incl. GST)</div>
            <div style=\"margin-top:12px;display:flex;gap:10px;\">
              <div style=\"display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.15);border-radius:20px;padding:4px 10px;\">
                <svg width=\"11\" height=\"11\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"white\" stroke-width=\"2.2\" stroke-linecap=\"round\"><path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"/><polyline points=\"9 12 11 14 15 10\"/></svg>
                <span style=\"font-size:10px;font-weight:600;\">PCI Compliant</span>
              </div>
              <div style=\"display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.15);border-radius:20px;padding:4px 10px;\">
                <span style=\"font-size:10px;font-weight:600;\">🔒 SSL Secured</span>
              </div>
            </div>
          </div>

          <p style=\"font-size:12.5px;color:#50507a;text-align:center;margin-bottom:16px;\">You will be redirected to a secure Razorpay page to complete payment.</p>

          <!-- Pay button -->
          <button id=\"fy-pay-btn\" class=\"fy-pay-btn\" style=\"width:100%;padding:14px;background:#000080;color:#fff;border:none;border-radius:12px;font-weight:800;font-size:15px;cursor:pointer;box-shadow:0 5px 20px rgba(0,0,128,0.27);transition:all 0.2s ease;letter-spacing:0.3px;display:flex;align-items:center;justify-content:center;gap:8px;\">
            <svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"white\" stroke-width=\"2.2\" stroke-linecap=\"round\"><path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"/><polyline points=\"9 12 11 14 15 10\"/></svg>
            Pay ₹107 Securely
          </button>

          <div style=\"text-align:center;margin-top:10px;font-size:10.5px;color:#aaa;font-weight:500;\">
            By paying you agree to FormYaar's Terms &amp; Privacy Policy
          </div>
        </div>
      </div>
    </div>

    <!-- SUCCESS SCREEN -->
    <div id="fy-success" class="fy-screen" style="display:none;flex-direction:column;height:100%;">
      <div style="position:relative;background:#000080;overflow:hidden;flex-shrink:0;">
        <div style="padding:13px 16px;display:flex;align-items:center;gap:10px;position:relative;z-index:1;">
          <div style="flex:1;text-align:center;">
           <div style="font-weight:800;font-size:16px;letter-spacing:-0.5px;color:#ffffff;line-height:1.2;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
  <span style="font-weight:200;color:rgba(255,255,255,0.7);">Form</span><span style="color:#E8930A;font-weight:800;">·</span><span style="font-weight:800;color:#ffffff;">Yaar</span>
</div>
            <div style="font-size:10.5px;color:#aabbd4;font-weight:500;">Application Submitted</div>
          </div>
        </div>
        <div style="height:3px;display:flex;"><div style="flex:1;background:#FF9933;"></div><div style="flex:1;background:#ffffff;"></div><div style="flex:1;background:#138808;"></div></div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 32px;gap:0;">
        <div id="fy-success-icon" style="width:68px;height:68px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;animation:fy-successPop 0.5s ease forwards;box-shadow:0 8px 24px rgba(34,197,94,0.27);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div style="margin-top:20px;font-size:20px;font-weight:800;color:#0a0a2e;text-align:center;">Payment Successful!</div>
        <div style="margin-top:8px;font-size:13px;color:#50507a;text-align:center;line-height:1.6;max-width:260px;">Your PAN Card application has been submitted and is being processed.</div>
        <div style="margin-top:6px;font-size:12.5px;color:#821cff;font-weight:700;">Expected: 7–10 working days</div>
        <div style="margin-top:24px;background:#f0f8ff;border:1px solid #bfd4ec;border-radius:10px;padding:10px 16px;font-size:11px;color:#50507a;text-align:center;">A confirmation has been sent to your registered email.</div>
        <button id="fy-back-home" style="margin-top:20px;background:#821cff;color:#fff;border:none;border-radius:11px;padding:12px 36px;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 16px rgba(130,28,255,0.27);">Back to Home</button>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  // Slide in after a tick
  setTimeout(() => {
    panel.style.right = "0px";
  }, 100);

  // Tab trigger
  const tab = document.createElement("div");
  tab.id = "formyaar-tab";
  tab.style.cssText = `
    position: fixed;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    background: #000080;
    color: white;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    padding: 14px 8px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1.5px;
    cursor: pointer;
    z-index: 999998;
    border-radius: 8px 0 0 8px;
    box-shadow: -2px 0 12px rgba(0,0,0,0.15);
    font-family: 'DM Sans', sans-serif;
  `;
  tab.innerHTML =
    '<span style="font-weight:200;opacity:0.7;">F</span><span style="color:#E8930A;font-weight:800;">·</span><span style="font-weight:800;">Y</span>';
  // Attention pulse every 25 seconds
  const pulseTab = () => {
    const t = document.getElementById("formyaar-tab");
    if (!t) return;

    // Phase 1: grow big
    t.style.transition = "transform 0.2s ease, box-shadow 0.2s ease";
    t.style.transform = "translateY(-50%) scale(1.4)";
    t.style.boxShadow = "-6px 0 24px rgba(0,0,128,0.5)";

    // Phase 2: shake while big
    setTimeout(() => {
      t.style.transition = "transform 0.06s ease";
      t.style.transform = "translateY(-50%) scale(1.4) translateX(-4px)";
    }, 220);
    setTimeout(() => {
      t.style.transform = "translateY(-50%) scale(1.4) translateX(4px)";
    }, 280);
    setTimeout(() => {
      t.style.transform = "translateY(-50%) scale(1.4) translateX(-4px)";
    }, 340);
    setTimeout(() => {
      t.style.transform = "translateY(-50%) scale(1.4) translateX(4px)";
    }, 400);
    setTimeout(() => {
      t.style.transform = "translateY(-50%) scale(1.4) translateX(-3px)";
    }, 460);
    setTimeout(() => {
      t.style.transform = "translateY(-50%) scale(1.4) translateX(3px)";
    }, 520);
    setTimeout(() => {
      t.style.transform = "translateY(-50%) scale(1.4) translateX(0)";
    }, 580);

    // Phase 3: stay big for 2 seconds total then shrink back
    setTimeout(() => {
      t.style.transition = "transform 0.3s ease, box-shadow 0.3s ease";
      t.style.transform = "translateY(-50%) scale(1)";
      t.style.boxShadow = "-2px 0 12px rgba(0,0,0,0.15)";
    }, 2000);
  };

  // First pulse after 5 seconds, then every 25 seconds
  setTimeout(pulseTab, 5000);
  const pulseInterval = setInterval(pulseTab, 25000);

  // Store interval ID so we can clear it if tab is removed
  (tab as any)._pulseInterval = pulseInterval;
  document.body.appendChild(tab);

  document.addEventListener("click", (e) => {
    const p = document.getElementById("formyaar-panel");
    const t = document.getElementById("formyaar-tab");
    if (!p || !t) return;
    if (
      p.style.right === "0px" &&
      !p.contains(e.target as Node) &&
      !t.contains(e.target as Node)
    ) {
      p.style.right = "-400px";
    }
  });

  tab.addEventListener("click", () => {
    const p = document.getElementById("formyaar-panel");
    if (p) p.style.right = p.style.right === "0px" ? "-400px" : "0px";
  });

  // PAN Card click → show payment
  document.getElementById("fy-pan-card")?.addEventListener("click", () => {
    document.getElementById("fy-home")!.style.display = "none";
    const payment = document.getElementById("fy-payment")!;
    payment.style.display = "flex";
  });

  // Back button
  document.getElementById("fy-back-btn")?.addEventListener("click", () => {
    document.getElementById("fy-payment")!.style.display = "none";
    document.getElementById("fy-home")!.style.display = "flex";
  });

  // Pay button → success then start guide
  document.getElementById("fy-pay-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("fy-pay-btn") as HTMLButtonElement;

    // Loading state
    btn.innerHTML = `<div style="width:16px;height:16px;border:2.5px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:fy-spin 0.8s linear infinite;"></div> Processing...`;
    btn.style.opacity = "0.7";
    btn.style.cursor = "default";

    // Create order via backend
    const orderRes = await browser.runtime.sendMessage({
      type: "CREATE_PAYMENT",
      form: "pan_card",
    });

    if (!orderRes?.success) {
      btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg> Pay ₹107 Securely`;
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
      alert("Could not initiate payment. Please try again.");
      return;
    }

    await browser.runtime.sendMessage({
      type: "OPEN_RAZORPAY",
      order_id: orderRes.order_id,
      amount: orderRes.amount,
    });

    // Reset button
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg> Pay ₹107 Securely`;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
  });
  // Back to home from success
  document.getElementById("fy-back-home")?.addEventListener("click", () => {
    document.getElementById("fy-success")!.style.display = "none";
    document.getElementById("fy-home")!.style.display = "flex";
  });
}
function showSkipFlash(target: HTMLElement) {
  const rect = target.getBoundingClientRect();
  const flash = document.createElement("div");
  flash.style.cssText = `
    position: fixed;
    top: ${rect.top - 4}px;
    left: ${rect.left - 4}px;
    width: ${rect.width + 8}px;
    height: ${rect.height + 8}px;
    border: 2.5px solid #4ade80;
    border-radius: 6px;
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(74, 222, 128, 0.08);
    pointer-events: none;
    transition: opacity 0.3s ease;
  `;
  flash.innerHTML = `
    <div style="
      background:#4ade80;
      border-radius:50%;
      width:20px;height:20px;
      display:flex;align-items:center;justify-content:center;
    ">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
  `;
  document.body.appendChild(flash);
  setTimeout(() => {
    flash.style.opacity = "0";
    setTimeout(() => flash.remove(), 300);
  }, 400);
}

function showResumeButton() {
  if (document.getElementById("fy-resume-btn")) return;

  const btn = document.createElement("div");
  btn.id = "fy-resume-btn";
  btn.style.cssText = `
    position: fixed;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 999999;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'DM Sans', 'Plus Jakarta Sans', sans-serif;
  `;

  btn.innerHTML = `
    <div style="
      background: #000080;
      border-radius: 12px 0 0 12px;
      padding: 14px 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      box-shadow: -3px 0 16px rgba(0,0,128,0.25);
      border: 1px solid rgba(255,255,255,0.1);
      border-right: none;
    ">
      <!-- Form·Yaar logo vertical -->
      <div style="writing-mode:vertical-rl;text-orientation:mixed;font-size:11px;letter-spacing:1.5px;color:white;font-weight:800;line-height:1;">
        <span style="font-weight:200;opacity:0.7;">Form</span><span style="color:#E8930A;">·</span><span>Yaar</span>
      </div>
      <!-- Divider -->
      <div style="width:20px;height:1px;background:rgba(255,255,255,0.2);"></div>
      <!-- Step indicator -->
      <div style="
        background: #E8930A;
        border-radius: 50%;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 800;
        color: white;
      ">${getCurrentIndex() + 1}</div>
      <!-- Play icon -->
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white" style="opacity:0.8;">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    </div>
  `;

  document.body.appendChild(btn);

  btn.addEventListener("click", () => {
    btn.remove();
    // Restore bars and spotlight
    [
      "fy-bar-top",
      "fy-bar-bottom",
      "fy-bar-left",
      "fy-bar-right",
      "formyaar-spotlight",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "block";
    });
    // Redraw tooltip since we removed it
    const field = TEST_GUIDE.fields[getCurrentIndex()];
    if (field)
      startOverlay(field.selector, field.explanation, field.required ?? true);
  });
}
function showErrorMessage(message: string) {
  const existing = document.getElementById("fy-error-msg");
  if (existing) existing.remove();

  const msg = document.createElement("div");
  msg.id = "fy-error-msg";
  msg.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #ff4444;
    color: white;
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    z-index: 2147483647;
    font-family: 'DM Sans', sans-serif;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  `;
  msg.textContent = message;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 5000);
}
function showCompletionMessage() {
  // Make sure tab is visible
  if (!document.getElementById("formyaar-tab")) {
    const tab = document.createElement("div");
    tab.id = "formyaar-tab";
    tab.style.cssText = `
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      background: #000080;
      color: white;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      padding: 14px 8px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      cursor: pointer;
      z-index: 999998;
      border-radius: 8px 0 0 8px;
      box-shadow: -2px 0 12px rgba(0,0,0,0.15);
      font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
    `;
    tab.innerHTML =
      '<span style="font-weight:200;opacity:0.7;">F</span><span style="color:#E8930A;font-weight:800;">·</span><span style="font-weight:800;">Y</span>';
    document.body.appendChild(tab);

    tab.addEventListener("click", () => {
      showContextualBanner();
    });
  }

  const msg = document.createElement("div");
  msg.style.cssText = `
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #ffffff;
    border: 1px solid #e0e0f0;
    border-top: 3px solid #138808;
    border-radius: 12px;
    padding: 18px 24px;
    z-index: 1000000;
    font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    text-align: center;
    min-width: 300px;
  `;
  msg.innerHTML = `
    <div style="font-size:28px;margin-bottom:8px;">✅</div>
    <div style="font-size:15px;font-weight:800;color:#000080;margin-bottom:4px;">All fields completed!</div>
    <div style="font-size:12px;color:#50507a;font-weight:400;margin-bottom:16px;">You are good to go. Submit the form now.</div>
    <button id="fy-dismiss-btn" style="
      background:#f5f5f5;color:#666;border:1px solid #e0e0e0;border-radius:8px;
      padding:8px 18px;font-size:12px;font-weight:600;cursor:pointer;
      font-family:'Plus Jakarta Sans','DM Sans',sans-serif;
    ">Dismiss</button>
  `;

  document.body.appendChild(msg);

  document.getElementById("fy-dismiss-btn")?.addEventListener("click", () => {
    msg.remove();
  });

  setTimeout(() => msg?.remove(), 10000);
}
