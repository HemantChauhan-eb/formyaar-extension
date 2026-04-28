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
      if (message.type === "START_GUIDE") beginGuide();
      if (message.type === "STOP_GUIDE") {
        stopGuide();
        stopOverlay();
      }
    });
  },
});

function beginGuide() {
  startGuide(
    TEST_GUIDE,
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
    border: 2.5px solid #821cff;
    box-shadow: 0 0 12px rgba(130, 28, 255, 0.5);
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
    max-width: 300px;
    background: #111111;
    border: 1px solid #821cff;
    border-radius: 10px;
    padding: 12px 16px;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    color: #ffffff;
    line-height: 1.5;
    box-shadow: 0 4px 24px rgba(0,0,0,0.4);
    pointer-events: auto;
  `;

  tooltip.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
   <span style="font-size:10px;font-weight:700;letter-spacing:1px;color:#821cff;">FORMYAAR</span>
<span style="font-size:10px;color:#555;margin-left:6px;">${getCurrentIndex() + 1} of ${getTotalFields()}</span>
    ${
      required
        ? '<span style="font-size:9px;background:#821cff22;color:#821cff;padding:2px 6px;border-radius:4px;font-weight:600;">Required</span>'
        : '<span style="font-size:9px;background:#ffffff11;color:#888;padding:2px 6px;border-radius:4px;font-weight:600;">Optional</span>'
    }
  </div>
  <div style="margin-bottom:12px;">${explanation}</div>

  <div id="fy-chat-area" style="display:none;margin-bottom:10px;">
    <div id="fy-chat-response" style="
      background:#1a1a1a;
      border-radius:6px;
      padding:8px 10px;
      font-size:12px;
      color:#ccc;
      margin-bottom:8px;
      min-height:36px;
      line-height:1.5;
      display:none;
    "></div>
    <div style="display:flex;gap:6px;">
      <input id="fy-chat-input" type="text" placeholder="Ask anything about this field..." style="
        flex:1;
        background:#1a1a1a;
        border:1px solid #333;
        border-radius:6px;
        padding:7px 10px;
        font-size:12px;
        color:#fff;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        outline:none;
      " />
      <button id="fy-chat-send" style="
        background:#821cff;
        color:#fff;
        border:none;
        border-radius:6px;
        padding:7px 12px;
        font-size:12px;
        font-weight:700;
        cursor:pointer;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      ">Ask</button>
    </div>
  </div>

  ${
    required && isDisabled
      ? '<div id="fy-warning" style="font-size:11px;color:#ff4444;margin-bottom:8px;display:none;">Please fill this field before continuing.</div>'
      : ""
  }
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <button id="formyaar-help-btn" style="
      background:transparent;
      color:#821cff;
      border:1px solid #821cff;
      border-radius:6px;
      padding:7px 14px;
      font-size:12px;
      font-weight:700;
      cursor:pointer;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    ">Help</button>
    <button id="formyaar-next-btn" style="
      background:${isDisabled ? "#444444" : "#821cff"};
      color:${isDisabled ? "#888888" : "#ffffff"};
      border:none;
      border-radius:6px;
      padding:7px 18px;
      font-size:12px;
      font-weight:700;
      cursor:${isDisabled ? "not-allowed" : "pointer"};
      letter-spacing:0.5px;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    " ${isDisabled ? 'data-disabled="true"' : ""}>Next →</button>
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
    btn.style.background = "#821cff";
    btn.style.color = "#ffffff";
    btn.style.cursor = "pointer";
    btn.dataset.disabled = "false";
    if (warning) warning.style.display = "none";
  } else {
    btn.style.background = "#444444";
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
  ].forEach((id) => document.getElementById(id)?.remove());
  if (scrollListener)
    window.removeEventListener("scroll", scrollListener, true);
  if (resizeListener) window.removeEventListener("resize", resizeListener);
  if (activeTarget) activeTarget.removeEventListener("input", onInputChange);
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
function showCompletionMessage() {
  const msg = document.createElement("div");
  msg.style.cssText = `
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #111111;
    border: 1px solid #821cff;
    border-radius: 10px;
    padding: 14px 24px;
    z-index: 1000000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
    box-shadow: 0 4px 24px rgba(130,28,255,0.3);
  `;
  msg.innerText = "✅ All fields completed. You are good to go!";
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 3000);
}
