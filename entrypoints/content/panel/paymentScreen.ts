import { trackEvent } from "../telemetry";

export function renderPaymentScreen(): string {
  const ashokaChakra = Array.from({ length: 24 }, (_, i) => {
    const a = (i * 15 * Math.PI) / 180;
    return `<line x1="${36 + 9 * Math.cos(a)}" y1="${36 + 9 * Math.sin(a)}" x2="${36 + 27 * Math.cos(a)}" y2="${36 + 27 * Math.sin(a)}" stroke="white" stroke-width="2.5"/>`;
  }).join("");

  return `
    <div id="fy-payment" class="fy-screen" style="display:none;flex-direction:column;height:100%;">
      <div style="position:relative;background:#000080;overflow:hidden;flex-shrink:0;">
        <div style="position:absolute;right:-8px;top:-8px;pointer-events:none;opacity:0.07;">
          <svg width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="33" fill="none" stroke="white" stroke-width="4.3"/><circle cx="36" cy="36" r="8.6" fill="white"/>${ashokaChakra}</svg>
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
      <div style="flex:1;overflow-y:auto;padding:18px 16px 24px;position:relative;">
        <div style="position:relative;z-index:1;">
          <div style="background:linear-gradient(135deg,#000080 0%,#000060 100%);border-radius:14px;padding:22px 20px;color:#fff;margin-bottom:20px;position:relative;overflow:hidden;">
            <div style="position:absolute;right:-14px;top:-14px;pointer-events:none;opacity:0.1;">
              <svg width="90" height="90" viewBox="0 0 90 90"><circle cx="45" cy="45" r="41" fill="none" stroke="white" stroke-width="5.4"/><circle cx="45" cy="45" r="10.8" fill="white"/></svg>
            </div>
            <div style="font-size:11px;opacity:0.8;font-weight:500;letter-spacing:0.3px;">PAN CARD — NEW APPLICATION</div>
            <div style="font-size:36px;font-weight:800;margin-top:6px;letter-spacing:-0.5px;">₹29</div>

            <div style="margin-top:12px;display:flex;gap:10px;">
              <div style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.15);border-radius:20px;padding:4px 10px;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                <span style="font-size:10px;font-weight:600;">PCI Compliant</span>
              </div>
              <div style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.15);border-radius:20px;padding:4px 10px;">
                <span style="font-size:10px;font-weight:600;">🔒 SSL Secured</span>
              </div>
            </div>
          </div>
          <p style="font-size:12.5px;color:#50507a;text-align:center;margin-bottom:16px;">You will be redirected to a secure Razorpay page to complete payment.</p>
          <button id="fy-pay-btn" class="fy-pay-btn" style="width:100%;padding:14px;background:#000080;color:#fff;border:none;border-radius:12px;font-weight:800;font-size:15px;cursor:pointer;box-shadow:0 5px 20px rgba(0,0,128,0.27);transition:all 0.2s ease;letter-spacing:0.3px;display:flex;align-items:center;justify-content:center;gap:8px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            Pay ₹29 Securely
          </button>
          <div style="text-align:center;margin-top:10px;font-size:10.5px;color:#aaa;font-weight:500;">
            By paying you agree to FormYaar's Terms &amp; Privacy Policy
          </div>
        </div>
      </div>
    </div>
  `;
}

export function attachPaymentScreenHandlers() {
  document.getElementById("fy-back-btn")?.addEventListener("click", () => {
    document.getElementById("fy-payment")!.style.display = "none";
    document.getElementById("fy-home")!.style.display = "flex";
  });

  document.getElementById("fy-pay-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("fy-pay-btn") as HTMLButtonElement;
    btn.innerHTML = `<div style="width:16px;height:16px;border:2.5px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:fy-spin 0.8s linear infinite;"></div> Processing...`;
    btn.style.opacity = "0.7";
    btn.style.cursor = "default";

    const orderRes = await browser.runtime.sendMessage({
      type: "CREATE_PAYMENT",
      form: "pan_card",
    });

    if (!orderRes?.success) {
      btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg> Pay ₹29 Securely`;
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
      alert("Could not initiate payment. Please try again.");
      return;
    }
    trackEvent("payment_started", "pan_card");
    await browser.runtime.sendMessage({
      type: "OPEN_RAZORPAY",
      order_id: orderRes.order_id,
      amount: orderRes.amount,
    });

    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg> Pay ₹29 Securely`;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
  });
}
