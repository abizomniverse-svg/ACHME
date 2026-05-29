import { useState, useEffect, useCallback } from "react";
import axios from "axios";

// ─────────────────────────────────────────────────────────────────────────────
// NetworkSetupBanner
//
// Shown automatically when a user opens the app via IP address (not achme.com).
// Guides them to download and run employee-hosts-setup.bat so they can use
// http://achme.com instead of the raw IP.
//
// Behaviour:
//  • Dismissed permanently in localStorage after user clicks "Got it" or "Skip"
//  • Re-checks after they say "I've run it" — if domain now resolves, it hides
//  • Completely invisible on the server machine (localhost / achme.com access)
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "achme_setup_dismissed";

function isAccessedViaIp() {
  const hostname = window.location.hostname;
  // Match plain IPv4 address pattern
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

export default function NetworkSetupBanner() {
  const [visible, setVisible] = useState(false);
  const [serverIp, setServerIp] = useState("");
  const [step, setStep] = useState("banner"); // "banner" | "guide" | "checking" | "done"
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    // Only show if accessing via IP AND not previously dismissed
    if (!isAccessedViaIp()) return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed === "true") return;

    // Fetch server info to get the real IP
    axios.get("/api/setup/info")
      .then(res => {
        setServerIp(res.data.serverIp || window.location.hostname);
        setVisible(true);
      })
      .catch(() => {
        setServerIp(window.location.hostname);
        setVisible(true);
      });
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  }, []);

  const handleDownload = useCallback(() => {
    // Trigger file download of employee-hosts-setup.bat from backend
    const link = document.createElement("a");
    link.href = "/api/setup/download";
    link.download = "employee-hosts-setup.bat";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setStep("guide");
  }, []);

  const handleVerify = useCallback(async () => {
    setStep("checking");
    // Wait 3 seconds to let DNS flush take effect, then check
    await new Promise(r => setTimeout(r, 3000));
    try {
      // Try to reach the server via domain name
      const testUrl = `http://achme.com:82/api/health`;
      await axios.get(testUrl, { timeout: 5000 });
      setStep("done");
      setTimeout(() => handleDismiss(), 3000);
    } catch {
      // Domain not yet reachable — still guide user
      setStep("guide");
    }
  }, [handleDismiss]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes slideInBanner {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        .setup-banner { animation: slideInBanner 0.4s cubic-bezier(0.34,1.56,0.64,1); }
        .setup-step { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
        .setup-step-num {
          min-width: 26px; height: 26px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          color: #fff; font-weight: 700; font-size: 12px; margin-top: 1px;
        }
        .setup-step-text { flex: 1; font-size: 13.5px; color: #e2e8f0; line-height: 1.5; }
        .setup-step-text code {
          background: rgba(99,102,241,0.25); padding: 1px 7px;
          border-radius: 4px; font-size: 12px; color: #a5b4fc; font-family: monospace;
        }
        .pulse-dot {
          width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;
          animation: pulse-dot 1.2s ease-in-out infinite; display: inline-block;
          margin-right: 6px; vertical-align: middle;
        }
      `}</style>

      {/* ── Minimized pill ── */}
      {minimized ? (
        <div
          onClick={() => setMinimized(false)}
          style={{
            position: "fixed", top: 12, right: 16, zIndex: 99999,
            background: "linear-gradient(135deg, #1e1b4b, #312e81)",
            border: "1px solid #6366f1",
            borderRadius: 24, padding: "7px 16px",
            display: "flex", alignItems: "center", gap: 8,
            cursor: "pointer", boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
            color: "#a5b4fc", fontSize: 13, fontWeight: 600,
            userSelect: "none",
          }}
        >
          <span className="pulse-dot" />
          Network Setup Needed
        </div>
      ) : (

        /* ── Full Banner ── */
        <div
          className="setup-banner"
          style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 99999,
            background: "linear-gradient(135deg, #0f0c29, #1e1b4b, #24243e)",
            borderBottom: "2px solid #6366f1",
            boxShadow: "0 4px 40px rgba(99,102,241,0.35)",
            padding: "0",
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
          }}
        >
          {/* Header bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 20px",
            borderBottom: step === "banner" ? "none" : "1px solid rgba(99,102,241,0.2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>🔧</span>
              <div>
                <div style={{ color: "#c7d2fe", fontWeight: 700, fontSize: 14 }}>
                  One-time Network Setup Required
                </div>
                <div style={{ color: "#6366f1", fontSize: 12 }}>
                  You're connected via IP{" "}
                  <code style={{
                    background: "rgba(99,102,241,0.2)", padding: "1px 6px",
                    borderRadius: 4, fontSize: 11, color: "#a5b4fc",
                  }}>
                    {window.location.hostname}
                  </code>
                  {" "}— run the setup to use{" "}
                  <code style={{
                    background: "rgba(99,102,241,0.2)", padding: "1px 6px",
                    borderRadius: 4, fontSize: 11, color: "#a5b4fc",
                  }}>
                    achme.com
                  </code>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setMinimized(true)}
                title="Minimise"
                style={{
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#94a3b8", borderRadius: 6, padding: "4px 10px",
                  cursor: "pointer", fontSize: 13,
                }}
              >
                ─
              </button>
              <button
                onClick={handleDismiss}
                title="Dismiss permanently"
                style={{
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#94a3b8", borderRadius: 6, padding: "4px 10px",
                  cursor: "pointer", fontSize: 13,
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: "14px 20px 16px" }}>

            {/* ─── STEP: banner (initial CTA) ─── */}
            {step === "banner" && (
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, color: "#94a3b8", fontSize: 13.5, lineHeight: 1.6, minWidth: 240 }}>
                  <strong style={{ color: "#e2e8f0" }}>Your PC needs a one-time setup</strong> to access the CRM
                  using the name <strong style={{ color: "#a5b4fc" }}>achme.com</strong> instead of a raw IP.
                  It takes about 10 seconds and only needs to be done once.
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    id="setup-download-btn"
                    onClick={handleDownload}
                    style={{
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      border: "none", color: "#fff", fontWeight: 700,
                      padding: "10px 22px", borderRadius: 8, cursor: "pointer",
                      fontSize: 14, boxShadow: "0 4px 15px rgba(99,102,241,0.5)",
                      transition: "transform 0.15s",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={e => e.target.style.transform = "scale(1.03)"}
                    onMouseLeave={e => e.target.style.transform = "scale(1)"}
                  >
                    ⬇ Download Setup Script
                  </button>
                  <button
                    onClick={handleDismiss}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(148,163,184,0.3)",
                      color: "#64748b", padding: "10px 18px", borderRadius: 8,
                      cursor: "pointer", fontSize: 13,
                    }}
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP: guide (after download) ─── */}
            {step === "guide" && (
              <div>
                <div style={{ color: "#c7d2fe", fontWeight: 700, fontSize: 13.5, marginBottom: 12 }}>
                  📂 Run the downloaded file as Administrator:
                </div>
                <div>
                  <div className="setup-step">
                    <div className="setup-step-num">1</div>
                    <div className="setup-step-text">
                      Open your <strong>Downloads</strong> folder and find{" "}
                      <code>employee-hosts-setup.bat</code>
                    </div>
                  </div>
                  <div className="setup-step">
                    <div className="setup-step-num">2</div>
                    <div className="setup-step-text">
                      <strong>Right-click</strong> the file → choose{" "}
                      <code>Run as administrator</code>
                    </div>
                  </div>
                  <div className="setup-step">
                    <div className="setup-step-num">3</div>
                    <div className="setup-step-text">
                      Click <strong>Yes</strong> on the permission prompt. The setup completes in seconds.
                    </div>
                  </div>
                  <div className="setup-step">
                    <div className="setup-step-num">4</div>
                    <div className="setup-step-text">
                      Come back here and click <strong>"I've run it"</strong> below.
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  <button
                    id="setup-verify-btn"
                    onClick={handleVerify}
                    style={{
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      border: "none", color: "#fff", fontWeight: 700,
                      padding: "9px 20px", borderRadius: 8, cursor: "pointer",
                      fontSize: 13.5, boxShadow: "0 4px 15px rgba(16,185,129,0.4)",
                    }}
                  >
                    ✅ I've run it — verify now
                  </button>
                  <button
                    onClick={handleDownload}
                    style={{
                      background: "rgba(99,102,241,0.15)",
                      border: "1px solid rgba(99,102,241,0.4)",
                      color: "#a5b4fc", padding: "9px 18px", borderRadius: 8,
                      cursor: "pointer", fontSize: 13,
                    }}
                  >
                    ⬇ Re-download
                  </button>
                  <button
                    onClick={handleDismiss}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(148,163,184,0.3)",
                      color: "#64748b", padding: "9px 16px", borderRadius: 8,
                      cursor: "pointer", fontSize: 13,
                    }}
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP: checking ─── */}
            {step === "checking" && (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 28, height: 28, border: "3px solid #6366f1",
                  borderTopColor: "transparent", borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
                <div>
                  <div style={{ color: "#c7d2fe", fontWeight: 600, fontSize: 14 }}>
                    Verifying domain setup...
                  </div>
                  <div style={{ color: "#64748b", fontSize: 12.5 }}>
                    Testing if achme.com resolves to the server. Please wait...
                  </div>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {/* ─── STEP: done ─── */}
            {step === "done" && (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontSize: 32 }}>🎉</div>
                <div>
                  <div style={{ color: "#10b981", fontWeight: 700, fontSize: 15 }}>
                    Setup complete! Domain is working.
                  </div>
                  <div style={{ color: "#64748b", fontSize: 12.5 }}>
                    You can now use{" "}
                    <a
                      href={`http://achme.com:82`}
                      style={{ color: "#6366f1", textDecoration: "underline" }}
                    >
                      http://achme.com
                    </a>
                    {" "}to access ACHME CRM. Redirecting...
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
