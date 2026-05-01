import { Z_INDEX, COMPLETION_AUTO_DISMISS_MS } from "./constants";

export function showErrorMessage(message: string) {
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
    z-index: ${Z_INDEX.PANEL};
    font-family: 'DM Sans', sans-serif;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  `;
  msg.textContent = message;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 5000);
}

export function showCompletionMessage() {
  if (!document.getElementById("fy-tab")) {
    const tab = document.createElement("div");
    tab.id = "fy-tab";
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
      z-index: ${Z_INDEX.SPOTLIGHT};
      border-radius: 8px 0 0 8px;
      box-shadow: -2px 0 12px rgba(0,0,0,0.15);
      font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
    `;
    tab.innerHTML =
      '<span style="font-weight:200;opacity:0.7;">F</span><span style="color:#E8930A;font-weight:800;">·</span><span style="font-weight:800;">Y</span>';
    document.body.appendChild(tab);
    tab.addEventListener("click", () => {
      // Will be wired up by index.ts after all modules load
      document.dispatchEvent(new CustomEvent("fy:open-panel"));
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
    z-index: ${Z_INDEX.PANEL};
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

  setTimeout(() => msg?.remove(), COMPLETION_AUTO_DISMISS_MS);
}
