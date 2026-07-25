import { BACKEND_URL } from "../../constants";
import {
  getOperatorSession,
  getOperatorAuthHeaders,
  signOut,
} from "../../supabase";
import { prepareOperatorSubmission } from "../../autofill";
import { escapeHtml } from "../shared";
import { showReviewScreen } from "./reviewScreen";

export function renderOperatorQueueScreen(): string {
  return `
    <div id="fy-operator-queue" class="fy-screen" style="display:none;flex-direction:column;height:100%;background:var(--fy-bg-alt);">
      <div class="fy-hdr">
        <button class="fy-hdr-back" id="fy-queue-back" aria-label="Back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div class="fy-hdr-brand">
          <span class="fy-brandmark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5l4 4L8 20l-4.6 1 1-4.6z"/><path d="M12.5 7.5l4 4"/></svg></span>
          <div style="min-width:0;">
            <div class="fy-hdr-name">Operator queue</div>
            <div id="fy-op-email" class="fy-hdr-sub" style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></div>
          </div>
        </div>
        <button class="fy-hdr-back" id="fy-queue-refresh" title="Refresh queue" aria-label="Refresh queue">
          <svg id="fy-refresh-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
        <button class="fy-hdr-link" id="fy-operator-signout">Sign out</button>
      </div>
      <div class="fy-accentbar"></div>

      <div style="flex:1;overflow-y:auto;padding:12px;">
        <div id="fy-queue-list" style="display:flex;flex-direction:column;gap:8px;">
          <div style="text-align:center;color:var(--fy-muted);font-size:13px;padding:40px 20px;">
            Loading queue…
          </div>
        </div>
      </div>
    </div>
  `;
}

const OP_INPROGRESS_KEY = "fy_op_inprogress";

// In-progress submissions are tagged with the operator who accepted them and
// only ever surfaced back to that same operator. This prevents operator B from
// seeing operator A's customer PII when they share a browser (audit C1).
async function getAllInProgress(): Promise<any[]> {
  const result = await browser.storage.local.get(OP_INPROGRESS_KEY);
  return (result[OP_INPROGRESS_KEY] as any[]) ?? [];
}

async function getInProgressSubmissions(operatorId: string): Promise<any[]> {
  const all = await getAllInProgress();
  return all.filter((s) => s._operator_id === operatorId);
}

export async function addInProgressSubmission(
  operatorId: string,
  sub: any,
): Promise<void> {
  const all = await getAllInProgress();
  if (all.some((s) => s.id === sub.id && s._operator_id === operatorId)) return;
  all.unshift({ ...sub, _operator_id: operatorId, _accepted_at: Date.now() });
  await browser.storage.local.set({ [OP_INPROGRESS_KEY]: all });
}

export async function removeInProgressSubmission(
  operatorId: string,
  id: string,
): Promise<void> {
  const all = await getAllInProgress();
  await browser.storage.local.set({
    [OP_INPROGRESS_KEY]: all.filter(
      (s) => !(s.id === id && s._operator_id === operatorId),
    ),
  });
}

export async function showOperatorPanel(): Promise<void> {
  const session = await getOperatorSession();

  const screens = [
    "fy-home",
    "fy-chooser",
    "fy-payment",
    "fy-filling",
    "fy-verify",
    "fy-upload",
    "fy-recover",
  ];
  screens.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  if (!session) {
    document.getElementById("fy-operator-login")!.style.display = "flex";
    return;
  }

  // Has session — show queue
  document.getElementById("fy-operator-login")!.style.display = "none";
  document.getElementById("fy-operator-queue")!.style.display = "flex";
  const emailEl = document.getElementById("fy-op-email");
  if (emailEl && session.email) emailEl.textContent = session.email;
  await loadQueue(session.id);
}

export async function loadQueue(operatorId: string): Promise<void> {
  const list = document.getElementById("fy-queue-list");
  if (!list) return;

  const session = await getOperatorSession();
  if (!session) {
    document.getElementById("fy-operator-login")!.style.display = "flex";
    document.getElementById("fy-operator-queue")!.style.display = "none";
    return;
  }

  const authHeaders = await getOperatorAuthHeaders();

  // Three explicit states — never fail open (would give expired operators free
  // access) and never mislabel a network error as "expired" (audit H2).
  let subStatus: "active" | "expired" | "unknown" = "unknown";
  try {
    const subRes = await fetch(
      `${BACKEND_URL}/operator/subscription/${session.id}`,
      { headers: authHeaders },
    );
    if (subRes.ok) {
      const subData = await subRes.json();
      subStatus = subData?.is_active ? "active" : "expired";
    }
  } catch {
    /* leave as unknown — handled below */
  }

  if (subStatus === "expired") {
    list.innerHTML = `
      <div style="text-align:center;padding:40px 20px;">
        <div style="width:50px;height:50px;border-radius:14px;background:var(--fy-warn-bg);border:1px solid var(--fy-warn-line);display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8a6100" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <div style="font-size:15px;font-weight:800;color:var(--fy-ink);margin-bottom:8px;">Subscription expired</div>
        <div style="font-size:12.5px;color:var(--fy-muted);line-height:1.6;margin-bottom:16px;">Your FormYaar subscription has expired. Renew to keep filling forms for your customers.</div>
        <a href="https://formyaar.in/operator-dashboard.html" target="_blank" class="fy-btn fy-btn-primary" style="text-decoration:none;padding:10px 20px;font-size:13px;">Renew subscription</a>
      </div>
    `;
    return;
  }

  if (subStatus === "unknown") {
    list.innerHTML = `
      <div style="text-align:center;padding:40px 20px;">
        <div style="width:50px;height:50px;border-radius:14px;background:var(--fy-accent-soft);display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#305eff" stroke-width="2" stroke-linecap="round"><path d="M5 12.5a7 7 0 0 1 14 0M8.5 15.5a3.5 3.5 0 0 1 7 0"/><circle cx="12" cy="19" r="1.2"/></svg>
        </div>
        <div style="font-size:15px;font-weight:800;color:var(--fy-ink);margin-bottom:8px;">Couldn't verify subscription</div>
        <div style="font-size:12.5px;color:var(--fy-muted);line-height:1.6;margin-bottom:16px;">We couldn't reach FormYaar to confirm your subscription. Check your connection and try again.</div>
        <button id="fy-sub-retry" class="fy-btn fy-btn-primary" style="padding:10px 20px;font-size:13px;">Retry</button>
      </div>
    `;
    document
      .getElementById("fy-sub-retry")
      ?.addEventListener("click", () => loadQueue(operatorId));
    return;
  }

  let queueRes: Response | null = null;
  try {
    queueRes = await fetch(`${BACKEND_URL}/operator/queue/${operatorId}`, {
      headers: authHeaders,
    });
  } catch {
    /* network/CORS failure */
  }

  const inProgress = await getInProgressSubmissions(operatorId);
  const { data, error } = queueRes?.ok
    ? { data: await queueRes.json(), error: null }
    : { data: null, error: true };

  const FORM_ICONS: Record<string, string> = {
    pan_card: "🪪",
    driving_license: "🚗",
    passport: "📘",
    voter_id: "🗳️",
  };

  const inProgressHTML =
    inProgress.length > 0
      ? `
    <div style="margin-bottom:10px;">
      <div style="font-size:10px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:#8a6100;margin-bottom:7px;padding:0 2px;">In progress</div>
      ${inProgress
        .map((sub: any) => {
          const name = escapeHtml(
            [sub.first_name, sub.middle_name, sub.last_name]
              .filter(Boolean)
              .join(" ") ||
              sub.name ||
              "Unknown",
          );
          const formLabel = escapeHtml(
            String(sub.form_type ?? "")
              .replace("_", " ")
              .toUpperCase(),
          );
          const accepted = sub._accepted_at
            ? new Date(sub._accepted_at).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";
          return `
        <div style="background:var(--fy-warn-bg);border:1px solid var(--fy-warn-line);border-radius:12px;padding:12px 13px;margin-bottom:6px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <span style="font-size:18px;">${FORM_ICONS[sub.form_type] ?? "📄"}</span>
            <div>
              <div style="font-size:13px;font-weight:700;color:var(--fy-ink);">${name}</div>
              <div style="font-size:11px;color:#8a6100;margin-top:2px;">${formLabel}${accepted ? " · Started " + accepted : ""}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="fy-ip-done" data-id="${escapeHtml(sub.id)}" style="flex:1;padding:8px 0;background:var(--fy-bg);color:var(--fy-muted);border:1px solid var(--fy-line);border-radius:9px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">Done ✓</button>
            <button class="fy-ip-resume" data-id="${escapeHtml(sub.id)}" style="flex:2;padding:8px 0;background:var(--fy-accent);color:#fff;border:none;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Resume →</button>
          </div>
        </div>`;
        })
        .join("")}
    </div>`
      : "";

  if (error || !data || data.length === 0) {
    list.innerHTML =
      inProgressHTML +
      `
      <div style="text-align:center;color:var(--fy-muted);font-size:12.5px;padding:${inProgress.length > 0 ? "20px" : "40px"} 20px;">
        <div style="width:44px;height:44px;border-radius:50%;background:var(--fy-good-bg);display:inline-flex;align-items:center;justify-content:center;margin-bottom:11px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#157347" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></svg>
        </div>
        <div>No pending forms. Queue is clear.</div>
      </div>
    `;
  } else {
    list.innerHTML =
      inProgressHTML +
      data
        .map(
          (sub: any) => `
      <button class="fy-queue-tile fy-card-hover" data-id="${escapeHtml(sub.id)}" style="width:100%;background:var(--fy-bg);border:1px solid var(--fy-line);border-radius:12px;padding:13px 14px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;font-family:inherit;text-align:left;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:20px;">${FORM_ICONS[sub.form_type] ?? "📄"}</span>
          <div>
            <div style="font-size:13.5px;font-weight:700;color:var(--fy-ink);">${escapeHtml([sub.first_name, sub.middle_name, sub.last_name].filter(Boolean).join(" ") || sub.name || "Unknown")}</div>
            <div style="font-size:11px;color:var(--fy-muted);margin-top:2px;">${escapeHtml(
              String(sub.form_type ?? "")
                .replace("_", " ")
                .toUpperCase(),
            )} · ${new Date(sub.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9aa3b5" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    `,
        )
        .join("");

    list
      .querySelectorAll<HTMLButtonElement>(".fy-queue-tile")
      .forEach((tile) => {
        tile.addEventListener("click", () => {
          const sub = data.find((s: any) => s.id === tile.dataset.id);
          if (sub) showReviewScreen(sub);
        });
      });
  }

  // In-progress: Done button — mark completed on the backend (C2: keeps
  // submission status accurate so dashboard "completed" stats increment and
  // the row doesn't stay stuck at "filling" forever), then drop it locally.
  list.querySelectorAll<HTMLButtonElement>(".fy-ip-done").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id!;
      btn.textContent = "Saving…";
      btn.disabled = true;
      try {
        await fetch(`${BACKEND_URL}/operator/submission/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ status: "completed" }),
        });
        await removeInProgressSubmission(operatorId, id);
        await loadQueue(operatorId);
      } catch (err: any) {
        if (err?.message?.includes("Extension context invalidated")) {
          btn.textContent = "Refresh page ↺";
          btn.style.color = "#8a6100";
          btn.disabled = false;
        } else {
          await removeInProgressSubmission(operatorId, id).catch(() => {});
          await loadQueue(operatorId).catch(() => {});
        }
      }
    });
  });

  // In-progress: Resume button
  list.querySelectorAll<HTMLButtonElement>(".fy-ip-resume").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const sub = inProgress.find((s: any) => s.id === btn.dataset.id);
      if (!sub) return;
      await browser.storage.session.set({
        autofillActive: {
          form: sub.form_type,
          submission_id: sub.id,
          done: [],
        },
      });
      await prepareOperatorSubmission(sub);
      window.open(
        "https://onlineservices.proteantech.in/paam/endUserRegisterContact.html",
        "_blank",
      );
    });
  });
}

export function attachOperatorQueueHandlers() {
  document.getElementById("fy-queue-back")?.addEventListener("click", () => {
    document.getElementById("fy-operator-queue")!.style.display = "none";
    document.getElementById("fy-home")!.style.display = "flex";
  });

  document
    .getElementById("fy-operator-signout")
    ?.addEventListener("click", async () => {
      await signOut();
      document.getElementById("fy-operator-queue")!.style.display = "none";
      document.getElementById("fy-operator-login")!.style.display = "flex";
    });

  document
    .getElementById("fy-queue-refresh")
    ?.addEventListener("click", async () => {
      const icon = document.getElementById("fy-refresh-icon");
      if (icon) {
        icon.style.transition = "transform 0.5s ease";
        icon.style.transform = "rotate(360deg)";
        setTimeout(() => {
          icon.style.transition = "none";
          icon.style.transform = "rotate(0deg)";
        }, 500);
      }
      const session = await getOperatorSession();
      if (session) await loadQueue(session.id);
    });
}
