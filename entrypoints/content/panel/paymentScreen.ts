import { trackEvent } from "../telemetry";
import { renderHeader, renderProgress } from "./shared";
import { getUserData, resolveFormSlug } from "../userData";
import { BACKEND_URL } from "../constants";

// Price / coupon state for this screen. The panel is rendered once, so these
// persist across shows — an applied code stays applied.
const BASE_PRICE = 39;
const COUPON_PRICE = 29;
let appliedCoupon: string | null = null;
let couponIsFree = false;
let currentTotal = BASE_PRICE;
const payBtnLabel = () =>
  couponIsFree ? "Start filling — free" : `Pay ₹${currentTotal} securely`;

// ── Inline brand marks (extension-safe: no external requests) ──────────
const LOGO_UPI = `<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path fill="#EE7C22" d="M9.5 2.5 19 12l-9.5 9.5-2.1-2.1L14.8 12 7.4 4.6z"/><path fill="#1B8F3A" d="M13.6 2.5 23.1 12l-9.5 9.5-2.1-2.1L18.9 12l-7.4-7.4z"/></svg>`;

const LOGO_GPAY = `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.17 3.57-8.81z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC04" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12 12 0 0 0 0 10.76z"/><path fill="#EA4335" d="M12 4.76c1.76 0 3.34.6 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.87 8.87 4.76 12 4.76z"/></svg>`;

const LOGO_PHONEPE = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect width="24" height="24" rx="7" fill="#5F259F"/><text x="12" y="16.5" font-size="11" font-weight="bold" fill="#fff" text-anchor="middle" font-family="Arial,sans-serif">पे</text></svg>`;

const LOGO_PAYTM = `<svg viewBox="0 0 46 16" width="40" height="14" aria-hidden="true"><text x="0" y="12.5" font-family="Arial,sans-serif" font-weight="800" font-size="13" fill="#002E6E">pay</text><text x="23" y="12.5" font-family="Arial,sans-serif" font-weight="800" font-size="13" fill="#00BAF2">tm</text></svg>`;

const LOGO_VISA = `<svg viewBox="0 0 40 14" width="34" height="12" aria-hidden="true"><text x="0" y="11.5" font-family="Arial,sans-serif" font-weight="800" font-style="italic" font-size="13" letter-spacing="0.5" fill="#1A1F71">VISA</text></svg>`;

const LOGO_MASTERCARD = `<svg viewBox="0 0 24 16" width="20" height="14" aria-hidden="true"><circle cx="9" cy="8" r="7" fill="#EB001B"/><circle cx="15" cy="8" r="7" fill="#F79E1B"/><path d="M12 2.6a7 7 0 0 1 0 10.8 7 7 0 0 1 0-10.8z" fill="#FF5F00"/></svg>`;

const LOGO_RAZORPAY = `<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path fill="#3395FF" d="M22.436 0l-11.91 7.773-1.174 4.276 6.625-4.297L11.65 24h4.391l6.395-24z"/><path fill="#072654" d="M14.26 10.098 3.389 17.166 1.564 24h9.008l3.688-13.902Z"/></svg>`;

export function renderPaymentScreen(): string {
  const methodTile = (logo: string, name: string) => `
    <div style="display:flex;align-items:center;justify-content:center;gap:6px;background:var(--fy-field);border-radius:9px;padding:8px 6px;">
      ${logo}
      <span style="font-size:10px;font-weight:700;color:var(--fy-body);">${name}</span>
    </div>`;

  const afterStep = (n: number, text: string) => `
    <div style="display:flex;gap:11px;align-items:flex-start;">
      <span style="width:19px;height:19px;border-radius:50%;background:var(--fy-field);color:var(--fy-ink);font-size:10.5px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">${n}</span>
      <span style="font-size:12.5px;color:var(--fy-body);line-height:1.55;">${text}</span>
    </div>`;

  return `
    <div id="fy-payment" class="fy-screen" style="display:none;flex-direction:column;height:100%;background:var(--fy-bg);">
      ${renderHeader({
        subtitle: "Payment",
        leftHtml: `
          <button class="fy-hdr-back" id="fy-back-btn" aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>`,
      })}
      ${renderProgress(0.66)}

      <div style="flex:1;overflow-y:auto;padding:28px 24px 18px;">

        <!-- Price hero -->
        <div style="text-align:center;">
          <div style="font-size:10px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:var(--fy-muted);">PAN card · full form fill</div>
          <div id="fy-price-hero" style="font-size:44px;font-weight:800;color:var(--fy-ink);letter-spacing:-1.5px;margin-top:8px;line-height:1;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;">₹39</div>
          <div style="font-size:11.5px;color:var(--fy-muted);margin-top:6px;">One-time payment · includes GST</div>
        </div>

        <!-- Receipt-style summary: looks like a real bill -->
        <div style="background:var(--fy-field);border-radius:13px;padding:14px 16px;margin-top:22px;">
          <div style="display:flex;justify-content:space-between;gap:10px;font-size:12.5px;color:var(--fy-body);">
            <span>Complete PAN form filling</span>
            <span style="font-weight:700;color:var(--fy-ink);flex-shrink:0;">₹39.00</span>
          </div>
          <div id="fy-discount-row" style="display:none;justify-content:space-between;gap:10px;font-size:12.5px;color:var(--fy-body);margin-top:8px;">
            <span>Distributor code <b id="fy-discount-code" style="color:var(--fy-ink);"></b></span>
            <span id="fy-discount-amount" style="font-weight:700;color:#0e9f6e;flex-shrink:0;">−₹10.00</span>
          </div>
          <div style="border-top:1px dashed #d7dbe4;margin:11px 0;"></div>
          <div style="display:flex;justify-content:space-between;gap:10px;font-size:13px;font-weight:800;color:var(--fy-ink);">
            <span>Total</span>
            <span id="fy-receipt-total">₹39.00</span>
          </div>
          <div style="display:flex;align-items:center;gap:7px;margin-top:11px;font-size:11px;color:var(--fy-muted);">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3.5V8h4.5"/></svg>
            100% refund if the government rejects your form
          </div>
        </div>

        <!-- Coupon — pay ₹29 instead of ₹39 with a distributor's code -->
        <div style="margin-top:16px;">
          <div id="fy-coupon-prompt">
            <div style="font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:var(--fy-muted);margin-bottom:9px;">Have a distributor's code?</div>
            <div style="display:flex;gap:8px;">
              <input id="fy-coupon-input" placeholder="ENTER CODE" autocomplete="off" spellcheck="false" style="flex:1;min-width:0;padding:11px 13px;border:1.5px solid #e2e6ef;border-radius:9px;background:var(--fy-bg);color:var(--fy-ink);font-size:13px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;font-family:inherit;outline:none;" />
              <button id="fy-coupon-apply" style="border:none;background:var(--fy-field);color:var(--fy-ink);font-weight:800;font-size:12.5px;padding:0 17px;border-radius:9px;cursor:pointer;font-family:inherit;">Apply</button>
            </div>
            <div id="fy-coupon-msg" style="font-size:11px;margin-top:7px;line-height:1.45;"></div>
            <div style="font-size:11px;color:var(--fy-muted);margin-top:5px;">Pay <b style="color:var(--fy-accent,#305eff);">₹29</b> instead of ₹39 — save ₹10.</div>
          </div>
          <div id="fy-coupon-applied" style="display:none;align-items:center;gap:9px;background:#e7f7f0;border-radius:10px;padding:11px 13px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0e9f6e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M20 6 9 17l-5-5"/></svg>
            <span style="font-size:12px;font-weight:700;color:#0b7a54;"><b id="fy-applied-code"></b> <span id="fy-applied-saved">applied · you saved ₹10</span></span>
          </div>
        </div>

        <!-- What happens next — removes post-payment uncertainty -->
        <div style="margin-top:22px;">
          <div style="font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:var(--fy-muted);margin-bottom:11px;">After you pay</div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${afterStep(1, "A secure Razorpay page opens — pay like any recharge")}
            ${afterStep(2, "We fill your entire form in about a minute")}
            ${afterStep(3, "You check everything, then submit it yourself")}
          </div>
        </div>

        <button id="fy-pay-btn" class="fy-pay-btn fy-btn fy-btn-primary fy-btn-block" style="margin-top:24px;">
          ${payBtnLabel()}
        </button>

        <!-- Pay using: real brand marks people recognise -->
        <div style="margin-top:16px;">
          <div style="font-size:9.5px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:var(--fy-faint);text-align:center;margin-bottom:8px;">Pay using</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;">
            ${methodTile(LOGO_UPI, "UPI")}
            ${methodTile(LOGO_GPAY, "GPay")}
            ${methodTile(LOGO_PHONEPE, "PhonePe")}
            ${methodTile(LOGO_PAYTM, "")}
            ${methodTile(LOGO_VISA, "")}
            ${methodTile(LOGO_MASTERCARD, "")}
          </div>
        </div>

        <!-- Secured-by line with the real Razorpay mark -->
        <div style="margin-top:14px;display:flex;align-items:center;justify-content:center;gap:6px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#8a92a3" stroke-width="2" stroke-linecap="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/></svg>
          <span style="font-size:10.5px;color:var(--fy-muted);">Secured by</span>
          ${LOGO_RAZORPAY}
          <span style="font-size:10.5px;font-weight:800;color:#072654;">Razorpay</span>
          <span style="font-size:10.5px;color:var(--fy-muted);">· RBI-authorised</span>
        </div>

        <div style="text-align:center;font-size:9.5px;color:var(--fy-faint);margin-top:8px;line-height:1.6;">
          We never see your card number, CVV or UPI PIN.<br/>
          By paying you agree to our <a href="https://formyaar.in/terms" target="_blank" style="color:var(--fy-muted);">Terms</a> &amp; <a href="https://formyaar.in/privacy-policy" target="_blank" style="color:var(--fy-muted);">Privacy Policy</a>.
        </div>
      </div>
    </div>
  `;
}

// Reflect an applied coupon across the price hero, receipt, and pay button.
// `free` codes take the total to ₹0 and skip checkout entirely.
function applyCouponUI(code: string, free = false): void {
  appliedCoupon = code;
  couponIsFree = free;
  currentTotal = free ? 0 : COUPON_PRICE;
  const saved = BASE_PRICE - currentTotal;

  const hero = document.getElementById("fy-price-hero");
  if (hero)
    hero.innerHTML =
      `<span style="font-size:26px;color:var(--fy-faint);text-decoration:line-through;font-weight:600;margin-right:8px;vertical-align:5px;">₹${BASE_PRICE}</span>${free ? "FREE" : `₹${COUPON_PRICE}`}`;

  const drow = document.getElementById("fy-discount-row");
  if (drow) drow.style.display = "flex";
  const dcode = document.getElementById("fy-discount-code");
  if (dcode) dcode.textContent = code;
  const damount = document.getElementById("fy-discount-amount");
  if (damount) damount.textContent = `−₹${saved}.00`;
  const total = document.getElementById("fy-receipt-total");
  if (total) total.textContent = `₹${currentTotal}.00`;

  const prompt = document.getElementById("fy-coupon-prompt");
  if (prompt) prompt.style.display = "none";
  const applied = document.getElementById("fy-coupon-applied");
  if (applied) applied.style.display = "flex";
  const appliedCode = document.getElementById("fy-applied-code");
  if (appliedCode) appliedCode.textContent = code;
  const savedLabel = document.getElementById("fy-applied-saved");
  if (savedLabel)
    savedLabel.textContent = free ? "applied · this one's free" : `applied · you saved ₹${saved}`;

  const payBtn = document.getElementById("fy-pay-btn");
  if (payBtn) payBtn.innerHTML = payBtnLabel();
}

export function attachPaymentScreenHandlers() {
  document.getElementById("fy-back-btn")?.addEventListener("click", () => {
    document.getElementById("fy-payment")!.style.display = "none";
    document.getElementById("fy-home")!.style.display = "flex";
  });

  // ── Coupon apply ──────────────────────────────────────────────────
  const couponInput = document.getElementById(
    "fy-coupon-input",
  ) as HTMLInputElement | null;
  const applyBtn = document.getElementById(
    "fy-coupon-apply",
  ) as HTMLButtonElement | null;
  const couponMsg = document.getElementById("fy-coupon-msg");

  async function applyCoupon() {
    if (!couponInput || !applyBtn || !couponMsg) return;
    const code = couponInput.value.trim().toUpperCase();
    if (!code) return;
    applyBtn.disabled = true;
    applyBtn.textContent = "…";
    couponMsg.textContent = "";

    try {
      const res = await fetch(
        `${BACKEND_URL}/payment/coupon/${encodeURIComponent(code)}`,
      );
      const data = await res.json();
      if (data?.valid) {
        applyCouponUI(data.coupon ?? code, Boolean(data.free));
        trackEvent("coupon_applied", "pan_card", { coupon: data.coupon ?? code });
      } else {
        couponMsg.textContent =
          "That code isn't valid. Check it, or continue at ₹39.";
        couponMsg.style.color = "#c0392b";
        applyBtn.disabled = false;
        applyBtn.textContent = "Apply";
      }
    } catch {
      couponMsg.textContent = "Couldn't check the code. Please try again.";
      couponMsg.style.color = "#c0392b";
      applyBtn.disabled = false;
      applyBtn.textContent = "Apply";
    }
  }

  applyBtn?.addEventListener("click", applyCoupon);
  couponInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyCoupon();
  });

  // ── Pay ───────────────────────────────────────────────────────────
  document.getElementById("fy-pay-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("fy-pay-btn") as HTMLButtonElement;
    btn.innerHTML = `<div style="width:15px;height:15px;border:2.5px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:fy-spin 0.8s linear infinite;"></div> ${couponIsFree ? "Getting started…" : "Opening secure checkout…"}`;
    btn.style.opacity = "0.7";
    btn.style.cursor = "default";

    const formSlug = resolveFormSlug(await getUserData());

    const orderRes = await browser.runtime.sendMessage({
      type: "CREATE_PAYMENT",
      form: formSlug,
      coupon: appliedCoupon ?? "",
    });

    if (!orderRes?.success) {
      btn.innerHTML = payBtnLabel();
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
      alert("Could not initiate payment. Please try again.");
      return;
    }
    trackEvent("payment_started", formSlug);
    await browser.runtime.sendMessage({
      type: "OPEN_RAZORPAY",
      order_id: orderRes.order_id,
      amount: orderRes.amount,
    });

    btn.innerHTML = payBtnLabel();
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
  });
}
