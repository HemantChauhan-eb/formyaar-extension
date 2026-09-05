import { trackEvent } from "./telemetry";
import { markSessionCompleted, markSessionActive } from "./userData";
import { renderHeader, renderProgress } from "./panel/shared";
import { setView } from "./panel/router";
import {
  processImageToSpec,
  downloadBlob,
  formatKb,
  PHOTO_SPEC,
  SIGNATURE_SPEC,
  type ImageSpec,
} from "./imagePrep";

const FAQ_ITEMS: { q: string }[] = [
  { q: "How do I merge multiple documents into one PDF?" },
  { q: "Where do I get my proof of DOB document?" },
  { q: "Which documents are accepted as proof of DOB?" },
  { q: "My PDF is over 300kb — how do I compress it?" },
  { q: "I uploaded but it's not working — what now?" },
];

const COMPRESSOR_URL = "https://formyaar.in/compress";

// Quiet line icon, matching the home screen's fy-quietrow treatment.
const quietIcon = (path: string) =>
  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

function renderImageDropzone(id: string, spec: ImageSpec): string {
  return `
    <div class="fy-imgdrop" data-kind="${spec.kind}">
      <input type="file" accept="image/*" id="fy-imgdrop-input-${id}" style="display:none;">
      <div class="fy-imgdrop-zone" id="fy-imgdrop-zone-${id}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <strong>${spec.label}</strong>
        <span>${spec.siteSpecText}</span>
      </div>
      <div class="fy-imgdrop-result" id="fy-imgdrop-result-${id}" style="display:none;"></div>
    </div>
  `;
}

export function renderUploadScreen(): string {
  return `
    <div id="fy-upload" class="fy-screen" style="display:none;flex-direction:column;height:100%;background:var(--fy-bg);">
      ${renderHeader({ subtitle: "Last step — upload your document" })}
      ${renderProgress(0.92)}

      <div style="flex:1;overflow-y:auto;padding:22px 24px 20px;">

        <!-- Heading -->
        <div style="text-align:center;margin-bottom:22px;">
          <div style="width:46px;height:46px;border-radius:13px;background:var(--fy-field);display:inline-flex;align-items:center;justify-content:center;margin-bottom:13px;color:var(--fy-body);">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div style="font-size:19px;font-weight:800;color:var(--fy-ink);letter-spacing:-0.4px;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">Upload your proof of DOB</div>
          <div style="margin-top:7px;font-size:12.5px;color:var(--fy-muted);line-height:1.6;max-width:280px;margin-left:auto;margin-right:auto;">Your form is filled. Just upload the document to finish.</div>
        </div>

        <!-- Photo & Signature — auto-prep to NSDL's exact spec -->
        <div style="background:var(--fy-field);border-radius:13px;padding:15px;margin-bottom:20px;">
          <div style="font-size:13.5px;font-weight:800;color:var(--fy-ink);margin-bottom:5px;letter-spacing:-0.2px;">Photo &amp; Signature — sized automatically</div>
          <div style="font-size:12px;color:var(--fy-body);line-height:1.6;margin-bottom:14px;">FormYaar prepares these to NSDL's exact size for you — drop a file, download the ready-to-upload version, then upload it below like normal.</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            ${renderImageDropzone("photo", PHOTO_SPEC)}
            ${renderImageDropzone("signature", SIGNATURE_SPEC)}
          </div>
        </div>

        <!-- One PDF only — merge callout (single primary action on the screen) -->
        <div style="background:var(--fy-field);border-radius:13px;padding:15px;margin-bottom:20px;">
          <div style="font-size:13.5px;font-weight:800;color:var(--fy-ink);margin-bottom:5px;letter-spacing:-0.2px;">Combine everything into one PDF</div>
          <div style="font-size:12px;color:var(--fy-body);line-height:1.6;margin-bottom:14px;">This page accepts <strong>only a single PDF</strong>. Have more than one document? Merge them first — add them all on one page, then download the combined file (max <strong>300&nbsp;KB per page</strong>).</div>
          <a href="${COMPRESSOR_URL}" target="_blank" id="fy-open-compressor" class="fy-btn fy-btn-primary fy-btn-block" style="text-decoration:none;font-size:13.5px;padding:12px;">
            Merge &amp; compress my documents →
          </a>
        </div>

        <!-- On-page steps -->
        <div style="margin-bottom:22px;">
          <div style="font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:var(--fy-muted);margin-bottom:14px;">Then, on this page</div>
          <div style="display:flex;flex-direction:column;gap:13px;">
            <div style="display:flex;gap:11px;align-items:flex-start;">
              <span style="width:20px;height:20px;border-radius:50%;background:var(--fy-field);color:var(--fy-ink);font-size:10.5px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">1</span>
              <span style="font-size:13px;color:var(--fy-body);line-height:1.55;">Click the <strong style="color:var(--fy-ink);">orange&nbsp;<span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:#ff5722;border-radius:3px;color:#fff;font-weight:800;font-size:12px;line-height:1;vertical-align:-3px;">＋</span>&nbsp;button</strong> to pick your PDF from your device.</span>
            </div>
            <div style="display:flex;gap:11px;align-items:flex-start;">
              <span style="width:20px;height:20px;border-radius:50%;background:var(--fy-field);color:var(--fy-ink);font-size:10.5px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">2</span>
              <span style="font-size:13px;color:var(--fy-body);line-height:1.55;">Then click the <strong style="color:var(--fy-ink);">Upload</strong> button to submit it.</span>
            </div>
          </div>
          <button id="fy-scroll-to-upload" class="fy-btn fy-btn-ghost fy-btn-block" style="margin-top:15px;font-size:13px;padding:12px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
            Take me to the upload box
          </button>
        </div>

        <!-- Quiet reassurance rows -->
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px;">
          <div class="fy-quietrow">
            ${quietIcon('<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3.5V8h4.5"/>')}
            <span>The page refreshes after each upload — <strong>that's normal</strong>. FormYaar stays with you.</span>
          </div>
          <div class="fy-quietrow">
            ${quietIcon('<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.2 2.2 4.8-4.8"/>')}
            <span>Once uploaded, click <strong>Submit</strong> at the bottom of the page to continue.</span>
          </div>
        </div>

        <!-- Help section -->
        <div style="border-top:1px solid var(--fy-line);padding-top:16px;">
          <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:var(--fy-muted);margin-bottom:11px;">Need help?</div>

          <!-- FAQ chips -->
          <div id="fy-faq-list" style="display:flex;flex-direction:column;gap:7px;margin-bottom:13px;">
            ${FAQ_ITEMS.map(
              (item, i) => `
              <button class="fy-faq-chip" data-faq-index="${i}">
                <span style="flex:1;">${item.q}</span>
                <svg style="flex-shrink:0;color:var(--fy-faint);" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            `,
            ).join("")}
          </div>

          <!-- Chat thread -->
          <div id="fy-chat-thread" style="display:none;flex-direction:column;gap:8px;margin-bottom:11px;max-height:280px;overflow-y:auto;padding:4px 2px;"></div>

          <!-- Chat input -->
          <div style="display:flex;gap:7px;align-items:stretch;">
            <input id="fy-chat-input" type="text" placeholder="Ask anything about uploading…" maxlength="500" />
            <button id="fy-chat-send" class="fy-btn fy-btn-primary" aria-label="Send" style="flex-shrink:0;width:40px;padding:0;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>

      </div>
    </div>

    <style>
      #fy-upload .fy-faq-chip {
        text-align:left; background:var(--fy-bg); border:1px solid var(--fy-line);
        border-radius:10px; padding:11px 13px; font-size:12.5px; color:var(--fy-ink);
        cursor:pointer; font-family:inherit; display:flex; align-items:center; gap:10px;
        transition:border-color 0.15s, background 0.15s;
      }
      #fy-upload .fy-faq-chip:hover { border-color:var(--fy-accent-line); background:var(--fy-accent-soft); }
      #fy-upload #fy-chat-input {
        flex:1; padding:11px 13px; border:1px solid var(--fy-line); border-radius:10px;
        font-size:12.5px; font-family:inherit; outline:none; color:var(--fy-ink); background:var(--fy-bg);
        transition:border-color 0.15s, box-shadow 0.15s;
      }
      #fy-upload #fy-chat-input::placeholder { color:var(--fy-faint); }
      #fy-upload #fy-chat-input:focus { border-color:var(--fy-accent); box-shadow:0 0 0 3px var(--fy-accent-soft); }
      #fy-upload .fy-chat-bubble-user {
        align-self:flex-end; max-width:85%; background:var(--fy-accent); color:#fff;
        padding:9px 12px; border-radius:12px 12px 2px 12px;
        font-size:12.5px; line-height:1.5; word-wrap:break-word;
      }
      #fy-upload .fy-chat-bubble-bot {
        align-self:flex-start; max-width:90%; background:var(--fy-field); color:var(--fy-ink);
        padding:9px 12px; border-radius:12px 12px 12px 2px;
        font-size:12.5px; line-height:1.55; word-wrap:break-word;
      }
      #fy-upload .fy-chat-bubble-bot.loading { color:var(--fy-muted); font-style:italic; }
      #fy-upload .fy-imgdrop-zone {
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        gap:3px; padding:14px 8px; border:1.5px dashed var(--fy-line); border-radius:10px;
        color:var(--fy-muted); font-size:11px; text-align:center; cursor:pointer;
        transition:border-color 0.15s, background 0.15s;
      }
      #fy-upload .fy-imgdrop-zone:hover,
      #fy-upload .fy-imgdrop-zone.fy-imgdrop-drag {
        border-color:var(--fy-accent-line); background:var(--fy-accent-soft);
      }
      #fy-upload .fy-imgdrop-zone strong { color:var(--fy-ink); font-size:12px; }
      #fy-upload .fy-imgdrop-result {
        border:1px solid var(--fy-line); border-radius:10px; padding:10px;
        font-size:11.5px; color:var(--fy-body); text-align:center;
      }
      #fy-upload .fy-imgdrop-result strong { display:block; color:var(--fy-ink); margin-bottom:2px; }
      #fy-upload .fy-imgdrop-result .fy-imgdrop-warn { color:#b45309; }
      #fy-upload .fy-imgdrop-result a.fy-btn { margin-top:8px; text-decoration:none; padding:8px; font-size:12px; }
      #fy-upload .fy-imgdrop-result button.fy-textlink { margin-top:6px; font-size:11px; }
    </style>
  `;
}

export function showUploadScreen(opts?: { markCompleted?: boolean }): void {
  setView("upload");

  trackEvent("upload_screen_shown", "pan_card");

  // Only mark the session completed when we're genuinely at the end of the
  // flow (autofill's final step). The document-upload page trigger shows this
  // same screen mid-flow on every self-reload; marking there would flip
  // fy_active_session.completed = true and permanently hide the "Continue →"
  // resume card on the home screen. In that mid-flow case we instead ensure the
  // session stays active — this also repairs sessions an earlier build wrongly
  // marked completed here.
  if (opts?.markCompleted) {
    markSessionCompleted().catch(() => {});
  } else {
    markSessionActive().catch(() => {});
  }
}

function setupImageDropzone(id: string, spec: ImageSpec): void {
  const input = document.getElementById(
    `fy-imgdrop-input-${id}`,
  ) as HTMLInputElement | null;
  const zone = document.getElementById(`fy-imgdrop-zone-${id}`);
  const result = document.getElementById(`fy-imgdrop-result-${id}`);
  if (!input || !zone || !result) return;

  let currentBlob: Blob | null = null;
  const filename = `${spec.kind}.jpg`;

  const showZone = () => {
    result.style.display = "none";
    zone.style.display = "flex";
    input.value = "";
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      zone.style.display = "none";
      result.style.display = "block";
      result.innerHTML = `<span class="fy-imgdrop-warn">Please choose an image file (JPG/PNG).</span>`;
      return;
    }

    zone.style.display = "none";
    result.style.display = "block";
    result.innerHTML = `<span>Processing…</span>`;

    try {
      const processed = await processImageToSpec(file, spec);
      currentBlob = processed.blob;
      const warn = processed.overBudget
        ? `<div class="fy-imgdrop-warn">Still over 50KB — try a photo with a plainer background</div>`
        : "";
      result.innerHTML = `
        <strong>✓ ${processed.width}×${processed.height}px · ${formatKb(processed.sizeBytes)}</strong>
        ${warn}
        <a href="#" class="fy-btn fy-btn-primary fy-btn-block" id="fy-imgdrop-download-${id}">Download ${spec.label} →</a>
        <button class="fy-textlink" id="fy-imgdrop-retry-${id}">Try a different file</button>
      `;
      document
        .getElementById(`fy-imgdrop-download-${id}`)
        ?.addEventListener("click", (e) => {
          e.preventDefault();
          if (currentBlob) downloadBlob(currentBlob, filename);
          trackEvent(`${spec.kind}_prep_downloaded`, "pan_card");
        });
      document
        .getElementById(`fy-imgdrop-retry-${id}`)
        ?.addEventListener("click", showZone);
      trackEvent(`${spec.kind}_prep_completed`, "pan_card", {
        size_bytes: processed.sizeBytes,
      });
    } catch {
      result.innerHTML = `
        <span class="fy-imgdrop-warn">Couldn't process that file — try a different image.</span>
        <button class="fy-textlink" id="fy-imgdrop-retry-${id}">Try again</button>
      `;
      document
        .getElementById(`fy-imgdrop-retry-${id}`)
        ?.addEventListener("click", showZone);
    }
  };

  zone.addEventListener("click", () => input.click());
  input.addEventListener("change", () => handleFile(input.files?.[0]));

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("fy-imgdrop-drag");
  });
  zone.addEventListener("dragleave", () =>
    zone.classList.remove("fy-imgdrop-drag"),
  );
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("fy-imgdrop-drag");
    handleFile((e as DragEvent).dataTransfer?.files?.[0]);
  });
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

  setupImageDropzone("photo", PHOTO_SPEC);
  setupImageDropzone("signature", SIGNATURE_SPEC);

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
        "User is on the NSDL PAN document-upload page (uploadDocument.html) and needs to upload proof of date of birth as a PDF, max 300kb per page. They cannot use Aadhaar as proof of DOB here. This page accepts only ONE PDF, so if they have multiple documents they must merge them into a single PDF first using the FormYaar compress tool at formyaar.in/compress (add all documents on one page, then compress and download). To upload on this page they first click the orange plus (+) button to select the PDF, then click the Upload button. The page reloads after each upload.",
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
