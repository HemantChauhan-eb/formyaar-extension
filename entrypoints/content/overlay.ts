import { nextField, getCurrentIndex, getTotalFields } from "./guide";
import {
  Z_INDEX,
  OVERLAY_SCROLL_PAD,
  OVERLAY_TRANSITION_MS,
  SKIP_FLASH_DURATION_MS,
  SKIP_ADVANCE_DELAY_MS,
  SELECT_POLL_INTERVAL_MS,
} from "./constants";
import { trackEvent } from "./telemetry";
let scrollListener: (() => void) | null = null;
let resizeListener: (() => void) | null = null;
let activeTarget: HTMLElement | null = null;

export function startOverlay(
  selector: string,
  explanation: string,
  required: boolean,
) {
  stopOverlay();

  const target = document.querySelector(selector) as HTMLElement;
  if (!target) {
    // Show brief toast then move to next field
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      z-index: ${Z_INDEX.PANEL};
      font-family: 'DM Sans', sans-serif;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;
    toast.textContent = "Skipping field — not found on this page";
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "1";
    }, 10);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 200);
    }, 2000);
    setTimeout(() => nextField(), 600);
    return;
  }
  activeTarget = target;

  const currentValue = (target as HTMLInputElement).value?.trim();
  const emptyValues = ["", "none", "----Please Select------"];
  const isFilled = currentValue && !emptyValues.includes(currentValue);
  if (isFilled) {
    showSkipFlash(target);
    setTimeout(() => nextField(), SKIP_ADVANCE_DELAY_MS);
    return;
  }

  target.scrollIntoView({ behavior: "smooth", block: "center" });

  setTimeout(() => {
    drawOverlay(target, explanation, required);
    let rafId: number | null = null;
    scrollListener = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        repositionOverlay(target);
      });
    };
    window.addEventListener("scroll", scrollListener, true);
    resizeListener = () => repositionOverlay(target);

    window.addEventListener("resize", resizeListener);
  }, OVERLAY_TRANSITION_MS);
}

function createBar(id: string): HTMLElement {
  const bar = document.createElement("div");
  bar.id = id;
  bar.style.cssText = `
    position: fixed;
    background: rgba(0, 0, 0, 0.55);
    z-index: ${Z_INDEX.BARS};
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
  const pad = OVERLAY_SCROLL_PAD;
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
  spotlight.id = "fy-spotlight";
  spotlight.style.cssText = `
    position: fixed;
    top: ${top}px;
    left: ${left}px;
    width: ${right - left}px;
    height: ${bottom - top}px;
    border-radius: 6px;
    border: 2.5px solid #000080;
    box-shadow: 0 0 0 4px rgba(0,0,128,0.08);
    z-index: ${Z_INDEX.SPOTLIGHT};
    pointer-events: none;
    transition: all 0.08s ease;
  `;

  const isFilled = (target as HTMLInputElement).value?.trim().length > 0;
  const isDisabled = required && !isFilled;

  const tooltip = document.createElement("div");
  tooltip.id = "fy-tooltip";
  const { top: tTop, left: tLeft } = getTooltipPosition(rect);
  tooltip.style.cssText = `
    position: fixed;
    top: ${tTop}px;
    left: ${tLeft}px;
    width: 340px;
    z-index: ${Z_INDEX.TOOLTIP};
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 6px 28px rgba(0,0,0,0.18);
    pointer-events: auto;
    font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
  `;

  const totalFields = getTotalFields();
  const currentIdx = getCurrentIndex();

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
    <div style="background:#000080;padding:9px 13px;display:flex;align-items:center;gap:8px;">
      <div style="display:flex;align-items:baseline;letter-spacing:-0.5px;line-height:1;flex-shrink:0;">
        <span style="font-weight:200;font-size:15px;color:#fff;">Form</span>
        <span style="font-weight:800;font-size:11px;color:#E8930A;margin:0 1.5px 0 0.5px;position:relative;top:-1.5px;">·</span>
        <span style="font-weight:800;font-size:15px;color:#fff;">Yaar</span>
      </div>
      <div style="flex:1;"></div>
      <div style="display:flex;align-items:center;gap:4px;">
        ${dotsHTML}
        <span style="font-size:10px;color:rgba(255,255,255,0.6);font-weight:600;margin-left:3px;">${currentIdx + 1}/${totalFields}</span>
      </div>
      ${
        required
          ? `<span style="font-size:9.5px;font-weight:700;background:#E8930A;color:#fff;padding:2.5px 8px;border-radius:4px;letter-spacing:0.2px;flex-shrink:0;">Required</span>`
          : `<span style="font-size:9.5px;font-weight:700;background:rgba(255,255,255,0.15);color:rgba(255,255,255,0.7);padding:2.5px 8px;border-radius:4px;flex-shrink:0;">Optional</span>`
      }
      <button id="fy-pause-btn" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:6px;padding:4px 9px;cursor:pointer;display:flex;align-items:center;gap:4px;color:#fff;font-size:10.5px;font-weight:700;flex-shrink:0;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        Pause
      </button>
    </div>
    <div style="background:#fff;padding:14px 16px 12px;">
      <p style="font-size:13.5px;color:#222;line-height:1.65;">${explanation}</p>
      <div id="fy-chat-area" style="display:none;margin-top:12px;">
        <div id="fy-chat-response" style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:6px;padding:8px 10px;font-size:12px;color:#333;margin-bottom:8px;min-height:36px;line-height:1.5;display:none;"></div>
        <div style="display:flex;gap:6px;">
          <input id="fy-chat-input" type="text" placeholder="Ask anything about this field..." style="flex:1;background:#f8f9fa;border:1px solid #ddd;border-radius:6px;padding:7px 10px;font-size:12px;color:#333;outline:none;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;"/>
          <button id="fy-chat-send" style="background:#000080;color:#fff;border:none;border-radius:6px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">Ask</button>
        </div>
      </div>
      ${
        required && isDisabled
          ? '<div id="fy-warning" style="font-size:11px;color:#dc3545;margin-top:8px;display:none;">Please fill this field before continuing.</div>'
          : ""
      }
    </div>
    <div style="background:#fff;padding:8px 13px 12px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #f0edf8;">
      <button id="fy-help-btn" style="background:#fff;border:1.5px solid #000080;border-radius:7px;padding:6px 16px;cursor:pointer;font-size:13px;font-weight:700;color:#000080;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">Help</button>
      <button id="fy-next-btn" style="background:${isDisabled ? "#e8e6f0" : "#000080"};color:${isDisabled ? "#b0aac4" : "#ffffff"};border:none;border-radius:7px;padding:6px 18px;cursor:${isDisabled ? "not-allowed" : "pointer"};font-size:13px;font-weight:700;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;transition:all 0.2s ease;" ${isDisabled ? 'data-disabled="true"' : ""}>Next →</button>
    </div>
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

  document.getElementById("fy-tooltip")!.style.pointerEvents = "auto";

  document.getElementById("fy-next-btn")?.addEventListener("click", () => {
    const btn = document.getElementById("fy-next-btn") as HTMLButtonElement;
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
    trackEvent("guide_paused");
    document.getElementById("fy-tooltip")?.remove();
    [
      "fy-bar-top",
      "fy-bar-bottom",
      "fy-bar-left",
      "fy-bar-right",
      "fy-spotlight",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
    // Remove input listeners while paused
    if (activeTarget) {
      activeTarget.removeEventListener("input", onInputChange);
      activeTarget.removeEventListener("keyup", onInputChange);
      activeTarget.removeEventListener("change", onInputChange);
    }
    document.dispatchEvent(new CustomEvent("fy:show-resume"));
  });

  document.getElementById("fy-help-btn")?.addEventListener("click", () => {
    const chatArea = document.getElementById("fy-chat-area");
    if (!chatArea) return;
    const isOpen = chatArea.style.display !== "none";
    chatArea.style.display = isOpen ? "none" : "block";
    if (!isOpen) {
      setTimeout(() => document.getElementById("fy-chat-input")?.focus(), 50);
    }
  });

  document
    .getElementById("fy-chat-send")
    ?.addEventListener("click", () => sendHelpMessage(explanation));
  document.getElementById("fy-chat-input")?.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") sendHelpMessage(explanation);
  });

  if (required) {
    target.addEventListener("input", onInputChange);
    target.addEventListener("keyup", onInputChange);
    target.addEventListener("change", onInputChange);

    if (target.tagName === "SELECT") {
      const selectPollInterval = setInterval(() => {
        const val = (target as HTMLSelectElement).value;
        const isEmpty =
          !val || val === "none" || val === "----Please Select------";
        const btn = document.getElementById("fy-next-btn") as HTMLButtonElement;
        if (!btn) {
          clearInterval(selectPollInterval);
          return;
        }
        if (!isEmpty && btn.dataset.disabled === "true") {
          onInputChange({ target } as unknown as Event);
        }
      }, SELECT_POLL_INTERVAL_MS);

      (target as any)._selectPollInterval = selectPollInterval;
    }
  }
}

function onInputChange(e: Event) {
  const field = e.target as HTMLInputElement;
  const isFilled = field.value?.trim().length > 0;
  const btn = document.getElementById("fy-next-btn") as HTMLButtonElement;
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
  const spotlight = document.getElementById("fy-spotlight");
  const tooltip = document.getElementById("fy-tooltip");
  const barTop = document.getElementById("fy-bar-top");
  const barBottom = document.getElementById("fy-bar-bottom");
  const barLeft = document.getElementById("fy-bar-left");
  const barRight = document.getElementById("fy-bar-right");
  if (!spotlight || !tooltip || !barTop || !barBottom || !barLeft || !barRight)
    return;

  const rect = target.getBoundingClientRect();
  const pad = OVERLAY_SCROLL_PAD;
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

export function stopOverlay() {
  [
    "fy-spotlight",
    "fy-tooltip",
    "fy-bar-top",
    "fy-bar-bottom",
    "fy-bar-left",
    "fy-bar-right",
    "fy-resume-btn",
  ].forEach((id) => document.getElementById(id)?.remove());
  if (scrollListener)
    window.removeEventListener("scroll", scrollListener, true);
  if (resizeListener) window.removeEventListener("resize", resizeListener);
  if (activeTarget) {
    activeTarget.removeEventListener("input", onInputChange);
    activeTarget.removeEventListener("keyup", onInputChange);
    activeTarget.removeEventListener("change", onInputChange);
    const pollId = (activeTarget as any)._selectPollInterval;
    if (pollId) clearInterval(pollId);
  }
  scrollListener = null;
  resizeListener = null;
  activeTarget = null;
}

export function showSkipFlash(target: HTMLElement) {
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
    z-index: ${Z_INDEX.TOOLTIP};
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(74, 222, 128, 0.08);
    pointer-events: none;
    transition: opacity 0.3s ease;
  `;
  flash.innerHTML = `
    <div style="background:#4ade80;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
  `;
  document.body.appendChild(flash);
  setTimeout(() => {
    flash.style.opacity = "0";
    setTimeout(() => flash.remove(), 300);
  }, SKIP_FLASH_DURATION_MS);
}

export function showResumeButton() {
  if (document.getElementById("fy-resume-btn")) return;

  const btn = document.createElement("div");
  btn.id = "fy-resume-btn";
  btn.style.cssText = `
    position: fixed;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: ${Z_INDEX.TOOLTIP};
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'DM Sans', 'Plus Jakarta Sans', sans-serif;
  `;

  btn.innerHTML = `
    <div style="background: #000080;border-radius: 12px 0 0 12px;padding: 14px 10px;display: flex;flex-direction: column;align-items: center;gap: 8px;box-shadow: -3px 0 16px rgba(0,0,128,0.25);border: 1px solid rgba(255,255,255,0.1);border-right: none;">
      <div style="writing-mode:vertical-rl;text-orientation:mixed;font-size:11px;letter-spacing:1.5px;color:white;font-weight:800;line-height:1;">
        <span style="font-weight:200;opacity:0.7;">Form</span><span style="color:#E8930A;">·</span><span>Yaar</span>
      </div>
      <div style="width:20px;height:1px;background:rgba(255,255,255,0.2);"></div>
      <div style="background: #E8930A;border-radius: 50%;width: 22px;height: 22px;display: flex;align-items: center;justify-content: center;font-size: 10px;font-weight: 800;color: white;">${getCurrentIndex() + 1}</div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white" style="opacity:0.8;">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    </div>
  `;

  document.body.appendChild(btn);

  btn.addEventListener("click", () => {
    btn.remove();
    [
      "fy-bar-top",
      "fy-bar-bottom",
      "fy-bar-left",
      "fy-bar-right",
      "fy-spotlight",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "block";
    });
    document.dispatchEvent(new CustomEvent("fy:resume-clicked"));
  });
}

async function sendHelpMessage(fieldExplanation: string) {
  const input = document.getElementById("fy-chat-input") as HTMLInputElement;
  const responseDiv = document.getElementById("fy-chat-response");
  const sendBtn = document.getElementById("fy-chat-send") as HTMLButtonElement;
  if (!input || !responseDiv) return;

  const userMessage = input.value.trim();
  trackEvent("help_chat_used");
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

    if (response?.response) {
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
