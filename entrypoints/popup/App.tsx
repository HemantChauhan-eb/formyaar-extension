import "./App.css";

function App() {
  async function startGuide(form: string) {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) return;
    await browser.tabs.sendMessage(tab.id, { type: "START_GUIDE", form });
    window.close();
  }

  return (
    <div className="popup">
      <div className="header">
        <h1>FormYaar</h1>
        <p>Your friend who fills government forms with you</p>
      </div>
      <div className="form-list">
        <p className="section-title">SELECT A FORM</p>
        <button
          className="form-btn active"
          onClick={() => startGuide("pan_card")}
        >
          🪪 PAN Card
          <span className="badge">Available</span>
        </button>
        <button className="form-btn" disabled>
          🚗 Driving License
          <span className="coming-soon">Coming Soon</span>
        </button>
        <button className="form-btn" disabled>
          📘 Passport
          <span className="coming-soon">Coming Soon</span>
        </button>
      </div>
      <div className="footer">
        <p>v0.1.0 — Beta</p>
      </div>
    </div>
  );
}

export default App;
