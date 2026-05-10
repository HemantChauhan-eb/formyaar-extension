import { Z_INDEX } from "./constants";
import { trackEvent } from "./telemetry";
import { markSessionCompleted } from "./userData";

const FAQ_ITEMS: { q: string; emoji: string }[] = [
  { q: "Where do I get my proof of DOB document?", emoji: "📄" },
  { q: "My PDF is over 300kb — how do I compress it?", emoji: "🗜️" },
  { q: "Which documents are accepted as proof of DOB?", emoji: "✅" },
  { q: "How do I upload the file on this page?", emoji: "⬆️" },
  { q: "I uploaded but it's not working — what now?", emoji: "🛠️" },
];

const COMPRESSOR_URL = "https://formyaar.pages.dev/compress";

export function renderUploadScreen(): string {
  return `
    <div id="fy-upload" class="fy-screen" style="display:none;flex-direction:column;height:100%;">
      <div style="position:relative;background:#000080;overflow:hidden;flex-shrink:0;">
        <div style="padding:13px 16px;display:flex;align-items:center;gap:10px;position:relative;z-index:1;">
          <div style="flex:1;text-align:center;">
            <div style="font-weight:800;font-size:16px;letter-spacing:-0.5px;color:#ffffff;line-height:1.2;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">
              <span style="font-weight:200;color:rgba(255,255,255,0.7);">Form</span><span style="color:#E8930A;font-weight:800;">·</span><span style="font-weight:800;color:#ffffff;">Yaar</span>
            </div>
            <div style="font-size:10.5px;color:#aabbd4;font-weight:500;">One step remaining</div>
          </div>
        </div>
        <div style="height:3px;display:flex;"><div style="flex:1;background:#FF9933;"></div><div style="flex:1;background:#ffffff;"></div><div style="flex:1;background:#138808;"></div></div>
      </div>

      <div style="flex:1;overflow-y:auto;padding:18px 16px 12px;">

        <!-- Status: filled -->
        <div style="text-align:center;margin-bottom:14px;">
          <div style="width:48px;height:48px;border-radius:50%;background:#22c55e;display:inline-flex;align-items:center;justify-content:center;margin-bottom:10px;animation:fy-successPop 0.5s ease forwards;box-shadow:0 6px 16px rgba(34,197,94,0.25);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style="font-size:17px;font-weight:800;color:#0a0a2e;">Form filled successfully</div>
          <div style="margin-top:4px;font-size:12.5px;color:#50507a;line-height:1.5;">All text fields are auto-filled. Just one document upload remaining.</div>
        </div>

        <!-- Upload action card -->
        <div style="background:#fff8eb;border:1.5px solid #f5d27a;border-radius:12px;padding:14px;margin-bottom:14px;">
          <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px;">
            <div style="flex-shrink:0;width:28px;height:28px;border-radius:8px;background:#f5d27a;display:flex;align-items:center;justify-content:center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a5a00" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <div style="flex:1;">
              <div style="font-size:13.5px;color:#7a5a00;font-weight:700;margin-bottom:3px;">Upload proof of Date of Birth</div>
              <div style="font-size:11.5px;color:#7a5a00;line-height:1.5;">PDF · max <strong>300kb per page</strong></div>
            </div>
          </div>
          <button id="fy-scroll-to-upload" style="width:100%;padding:10px;background:#000080;color:white;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
            Take me to the upload section
          </button>
        </div>

        <!-- Compressor link -->
        <div style="background:#f0f0ff;border:1px solid #d0d0f0;border-radius:10px;padding:11px 13px;margin-bottom:16px;display:flex;gap:10px;align-items:center;">
          <div style="flex-shrink:0;font-size:18px;">🗜️</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:12.5px;font-weight:700;color:#0a0a2e;margin-bottom:1px;">File too big?</div>
            <div style="font-size:11px;color:#50507a;line-height:1.4;">Compress it in your browser — file never leaves your device.</div>
          </div>
          <a href="${COMPRESSOR_URL}" target="_blank" id="fy-open-compressor" style="flex-shrink:0;padding:6px 12px;background:#000080;color:white;border-radius:6px;font-size:11.5px;font-weight:700;text-decoration:none;font-family:'DM Sans',sans-serif;">Open</a>
        </div>

        <!-- AI Help section -->
        <div style="border-top:1px solid #e8e8f0;padding-top:14px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#94a3b8;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            Need help?
          </div>

          <!-- FAQ chips -->
          <div id="fy-faq-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;">
            ${FAQ_ITEMS.map(
              (item, i) => `
              <button class="fy-faq-chip" data-faq-index="${i}" style="text-align:left;background:#fff;border:1px solid #e0e0f0;border-radius:8px;padding:9px 11px;font-size:12px;color:#0a0a2e;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:8px;transition:all 0.15s ease;">
                <span style="flex-shrink:0;">${item.emoji}</span>
                <span style="flex:1;">${item.q}</span>
                <svg style="flex-shrink:0;opacity:0.4;" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            `,
            ).join("")}
          </div>

          <!-- Chat thread -->
          <div id="fy-chat-thread" style="display:none;flex-direction:column;gap:8px;margin-bottom:10px;max-height:280px;overflow-y:auto;padding:4px 2px;"></div>

          <!-- Chat input -->
          <div style="display:flex;gap:6px;align-items:stretch;">
            <input id="fy-chat-input" type="text" placeholder="Ask anything about uploading…" maxlength="500" style="flex:1;padding:9px 12px;border:1px solid #e0e0f0;border-radius:8px;font-size:12.5px;font-family:'DM Sans',sans-serif;outline:none;color:#0a0a2e;background:#fff;" />
            <button id="fy-chat-send" aria-label="Send" style="flex-shrink:0;width:36px;background:#000080;color:white;border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>

      </div>
    </div>

    <style>
      #fy-upload .fy-faq-chip:hover { border-color:#000080; background:#f8f8ff; }
      #fy-upload #fy-chat-input:focus { border-color:#000080; box-shadow:0 0 0 3px rgba(0,0,128,0.1); }
      #fy-upload .fy-chat-bubble-user {
        align-self:flex-end; max-width:85%; background:#000080; color:white;
        padding:8px 12px; border-radius:12px 12px 2px 12px;
        font-size:12.5px; line-height:1.45; word-wrap:break-word;
      }
      #fy-upload .fy-chat-bubble-bot {
        align-self:flex-start; max-width:90%; background:#f2f2f8; color:#0a0a2e;
        padding:8px 12px; border-radius:12px 12px 12px 2px;
        font-size:12.5px; line-height:1.5; word-wrap:break-word;
      }
      #fy-upload .fy-chat-bubble-bot.loading {
        color:#50507a; font-style:italic;
      }
    </style>
  `;
}

export function showUploadScreen(): void {
  const screens = ["fy-home", "fy-payment", "fy-filling", "fy-verify"];
  screens.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  const upload = document.getElementById("fy-upload");
  if (upload) upload.style.display = "flex";

  const p = document.getElementById("formyaar-panel");
  if (p) p.style.right = "0px";

  trackEvent("upload_screen_shown", "pan_card");

  // Mark this session as completed — user reached the final step
  markSessionCompleted().catch(() => {});
}

export function attachUploadScreenHandlers(): void {
  // Scroll to upload widget on the NSDL page
  const scrollBtn = document.getElementById("fy-scroll-to-upload");
  if (scrollBtn) {
    scrollBtn.addEventListener("click", () => {
      const target =
        document.getElementById("docsUpload") ||
        document.getElementById("addFile");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        // Brief highlight pulse so the user can spot it
        const orig = target.style.boxShadow;
        target.style.transition = "box-shadow 0.4s ease";
        target.style.boxShadow = "0 0 0 4px rgba(232,147,10,0.6)";
        setTimeout(() => {
          target.style.boxShadow = orig || "";
        }, 1800);
      } else {
        // Fallback: scroll to bottom of the form area
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });
      }
      trackEvent("upload_scroll_clicked", "pan_card");
    });
  }

  document
    .getElementById("fy-open-compressor")
    ?.addEventListener("click", () => {
      trackEvent("compressor_opened", "pan_card");
    });

  // FAQ chips → fire chat
  document
    .querySelectorAll<HTMLButtonElement>(".fy-faq-chip")
    .forEach((chip) => {
      chip.addEventListener("click", () => {
        const idx = Number(chip.dataset.faqIndex);
        const item = FAQ_ITEMS[idx];
        if (!item) return;
        sendChatMessage(item.q);
        trackEvent("faq_clicked", "pan_card", { question: item.q });
      });
    });

  // Free-text input
  const input = document.getElementById(
    "fy-chat-input",
  ) as HTMLInputElement | null;
  const sendBtn = document.getElementById("fy-chat-send");

  const submit = () => {
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    sendChatMessage(text);
  };

  sendBtn?.addEventListener("click", submit);
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  });
}

async function sendChatMessage(userMessage: string): Promise<void> {
  const thread = document.getElementById("fy-chat-thread");
  if (!thread) return;
  thread.style.display = "flex";

  // User bubble
  const userBubble = document.createElement("div");
  userBubble.className = "fy-chat-bubble-user";
  userBubble.textContent = userMessage;
  thread.appendChild(userBubble);
  thread.scrollTop = thread.scrollHeight;

  // Loading bubble
  const botBubble = document.createElement("div");
  botBubble.className = "fy-chat-bubble-bot loading";
  botBubble.textContent = "Thinking…";
  thread.appendChild(botBubble);
  thread.scrollTop = thread.scrollHeight;

  try {
    const res = await browser.runtime.sendMessage({
      type: "AI_CHAT",
      fieldId: "upload_proof_dob",
      fieldExplanation:
        "User is on the final step of NSDL PAN application and needs to upload proof of date of birth as a PDF, max 300kb per page. They cannot use Aadhaar as proof of DOB here. They have already filled all other form fields.",
      userMessage,
    });

    botBubble.classList.remove("loading");
    if (res && typeof res.response === "string" && res.response.trim()) {
      botBubble.textContent = res.response;
    } else {
      botBubble.textContent =
        "Couldn't get an answer right now. Please try again in a moment.";
    }
  } catch {
    botBubble.classList.remove("loading");
    botBubble.textContent =
      "Network error. Please check your connection and try again.";
  }

  thread.scrollTop = thread.scrollHeight;
}
