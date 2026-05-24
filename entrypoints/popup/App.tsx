import { useEffect, useState } from "react";

type SiteStatus = "supported" | "unsupported" | "loading";

const SUPPORTED_SITES: Record<string, string> = {
  "onlineservices.proteantech.in": "PAN Card",
  "onlineservices.nsdl.com": "PAN Card",
  "www.utiitsl.com": "PAN Card",
  "passporthub.gov.in": "Passport",
  "sarathi.parivahan.gov.in": "Driving License",
};

export default function App() {
  const [status, setStatus] = useState<SiteStatus>("loading");
  const [formName, setFormName] = useState<string>("");
  const [hostname, setHostname] = useState<string>("");

  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const tab = tabs[0];
      if (!tab?.url) {
        setStatus("unsupported");
        return;
      }
      try {
        const host = new URL(tab.url).hostname;
        setHostname(host);
        if (SUPPORTED_SITES[host]) {
          setStatus("supported");
          setFormName(SUPPORTED_SITES[host]);
        } else {
          setStatus("unsupported");
        }
      } catch {
        setStatus("unsupported");
      }
    });
  }, []);

  const openPanel = () => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        browser.tabs.sendMessage(tab.id, { type: "OPEN_PANEL" });
        window.close();
      }
    });
  };

  return (
    <div
      style={{
        width: 280,
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        background: "#fff",
        overflow: "hidden",
        borderRadius: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#000080",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: -0.5,
              fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
            }}
          >
            <span style={{ fontWeight: 200, opacity: 0.7 }}>Form</span>
            <span style={{ color: "#E8930A" }}>·</span>
            <span>Yaar</span>
          </div>
          <div style={{ fontSize: 10, color: "#aabbd4", fontWeight: 500 }}>
            Your dost for every sarkari kaam
          </div>
        </div>
      </div>

      {/* Tricolor */}
      <div style={{ height: 3, display: "flex" }}>
        <div style={{ flex: 1, background: "#FF9933" }} />
        <div
          style={{
            flex: 1,
            background: "#ffffff",
            borderTop: "1px solid #eee",
          }}
        />
        <div style={{ flex: 1, background: "#138808" }} />
      </div>

      {/* Body */}
      <div style={{ padding: "16px" }}>
        {status === "loading" && (
          <div
            style={{
              textAlign: "center",
              color: "#888",
              fontSize: 13,
              padding: "12px 0",
            }}
          >
            Checking this page...
          </div>
        )}

        {status === "supported" && (
          <div>
            <div
              style={{
                background: "#f0fff4",
                border: "1.5px solid #86efac",
                borderRadius: 10,
                padding: "10px 13px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#22c55e"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
              <div>
                <div
                  style={{ fontSize: 12, fontWeight: 700, color: "#15803d" }}
                >
                  FormYaar is active
                </div>
                <div style={{ fontSize: 11, color: "#166534" }}>
                  {formName} form detected
                </div>
              </div>
            </div>

            <button
              onClick={openPanel}
              style={{
                width: "100%",
                background: "#000080",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 0",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Open FormYaar
            </button>
          </div>
        )}

        {status === "unsupported" && (
          <div>
            <div
              style={{
                background: "#fafafa",
                border: "1.5px solid #e0e0e0",
                borderRadius: 10,
                padding: "10px 13px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#aaa"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#555" }}>
                  Not active on this page
                </div>
                <div style={{ fontSize: 11, color: "#888" }}>
                  Visit a supported government form site
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>
              Visit{" "}
              <a
                href="https://formyaar.in"
                target="_blank"
                rel="noreferrer"
                style={{ color: "#000080", fontWeight: 700, textDecoration: "underline" }}
              >
                formyaar.in
              </a>{" "}
              to learn more about our services and get started.
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "8px 16px 12px",
          textAlign: "center",
          fontSize: 10,
          color: "#bbb",
        }}
      >
        Not affiliated with any government entity
      </div>
    </div>
  );
}
