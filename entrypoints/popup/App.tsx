import "./App.css";

function App() {
  async function openPanel() {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tab = tabs[0];
    if (!tab?.id) return;
    await browser.tabs.sendMessage(tab.id, { type: "OPEN_PANEL" });
    window.close();
  }

  return (
    <div className="popup">
      <div className="header">
        <h1>
          <span className="form">Form</span>
          <span className="dot">·</span>
          <span className="yaar">Yaar</span>
        </h1>
        <p>Your dost for every sarkari kaam</p>
      </div>
      <button className="open-btn" onClick={openPanel}>
        Open FormYaar
      </button>
      <div className="footer">
        <p>v0.1.0 — Beta</p>
      </div>
    </div>
  );
}

export default App;
