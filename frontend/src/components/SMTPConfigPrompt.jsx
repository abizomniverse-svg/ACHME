import React, { useState, useEffect } from "react";
import axios from "axios";
import { Mail, Lock, Server, X, ShieldAlert, KeyRound, Check, ExternalLink } from "lucide-react";
import { API } from "../config/api";

export default function SMTPConfigPrompt({ email, onClose }) {
  const [provider, setProvider] = useState("gmail");
  const [emailPass, setEmailPass] = useState("");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch existing SMTP configuration on mount
  useEffect(() => {
    const fetchExistingConfig = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/api/auth/check-email-config`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.hasConfig && res.data.config) {
          const { smtp_host, smtp_port } = res.data.config;
          setSmtpHost(smtp_host || "smtp.gmail.com");
          setSmtpPort(String(smtp_port) || "587");
          
          // Auto-detect provider based on host
          if (smtp_host === "smtp.gmail.com") {
            setProvider("gmail");
          } else if (smtp_host === "smtp.mail.yahoo.com") {
            setProvider("yahoo");
          } else {
            setProvider("custom");
            setShowAdvanced(true);
          }
        }
      } catch (err) {
        console.error("Failed to load existing SMTP config", err);
      }
    };
    fetchExistingConfig();
  }, []);

  const handleProviderChange = (prov) => {
    setProvider(prov);
    if (prov === "gmail") {
      setSmtpHost("smtp.gmail.com");
      setSmtpPort("587");
      setShowAdvanced(false);
    } else if (prov === "yahoo") {
      setSmtpHost("smtp.mail.yahoo.com");
      setSmtpPort("465");
      setShowAdvanced(false);
    } else {
      setSmtpHost("");
      setSmtpPort("");
      setShowAdvanced(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailPass.trim()) {
      setMessage({ type: "error", text: "Email App Password is required" });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/api/auth/save-email-config`,
        {
          email_pass: emailPass.trim(),
          smtp_host: smtpHost.trim(),
          smtp_port: parseInt(smtpPort) || 587
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setMessage({ type: "success", text: "SMTP Email configured successfully!" });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to save SMTP configuration" });
    } finally {
      setLoading(false);
    }
  };

  const handleSnooze = () => {
    localStorage.setItem("smtp_prompt_last_closed", Date.now().toString());
    sessionStorage.setItem("smtp_prompt_snoozed", "true");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 transition-all transform scale-100 duration-200">
        
        {/* Header Section */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 px-6 py-5 relative text-white">
          <button 
            type="button"
            onClick={handleSnooze}
            className="absolute top-4 right-4 p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Snooze for this session"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Mail size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-wide">Configure Email SMTP</h3>
              <p className="text-blue-100 text-xs mt-0.5">Send invoice documents & reports securely from your own email</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {message.text && (
            <div className={`p-3 rounded-xl flex items-start gap-2.5 text-sm transition-all duration-200 ${
              message.type === "error" 
                ? "bg-rose-50 text-rose-600 border border-rose-100" 
                : "bg-emerald-50 text-emerald-600 border border-emerald-100"
            }`}>
              {message.type === "success" ? <Check size={18} className="shrink-0 mt-0.5" /> : <ShieldAlert size={18} className="shrink-0 mt-0.5" />}
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          {/* Sender Email Display */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Your Sender Account</label>
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700">
              <Mail size={18} className="text-slate-400" />
              <span className="font-semibold text-sm select-all">{email}</span>
            </div>
          </div>

          {/* Provider Selection Row */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Mail Provider</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleProviderChange("gmail")}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-200 outline-none ${
                  provider === "gmail"
                    ? "border-blue-600 bg-blue-50/50 text-blue-700 font-bold shadow-sm shadow-blue-50/50"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-500 font-medium"
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center rounded-lg bg-red-50 text-red-500 text-xs font-black">
                  G
                </div>
                <span className="text-[11px]">Gmail / Workspace</span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange("yahoo")}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-200 outline-none ${
                  provider === "yahoo"
                    ? "border-purple-600 bg-purple-50/50 text-purple-700 font-bold shadow-sm shadow-purple-50/50"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-500 font-medium"
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center rounded-lg bg-purple-50 text-purple-600 text-xs font-black">
                  Y!
                </div>
                <span className="text-[11px]">Yahoo Mail</span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange("custom")}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-200 outline-none ${
                  provider === "custom"
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 font-bold shadow-sm shadow-indigo-50/50"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-500 font-medium"
                }`}
              >
                <Server size={18} className={provider === "custom" ? "text-indigo-600 animate-pulse" : "text-slate-400"} />
                <span className="text-[11px]">Custom SMTP</span>
              </button>
            </div>
          </div>

          {/* Secure App Password Field */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {provider === "gmail" ? "Gmail App Password" : provider === "yahoo" ? "Yahoo App Password" : "SMTP Password / App Password"}
              </label>
              {provider !== "custom" && (
                <a 
                  href={provider === "gmail" ? "https://myaccount.google.com/apppasswords" : "https://login.yahoo.com/account/security"} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline font-bold flex items-center gap-0.5"
                >
                  Setup Guide <ExternalLink size={10} />
                </a>
              )}
            </div>
            
            <div className="relative">
              <input 
                type="password" 
                value={emailPass} 
                onChange={(e) => setEmailPass(e.target.value)} 
                className="w-full border border-slate-300 focus:border-blue-500 focus:ring focus:ring-blue-100 rounded-xl px-4 py-3 pl-10 text-sm focus:outline-none transition-all font-mono" 
                placeholder="•••• •••• •••• ••••"
                required
              />
              <KeyRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Dynamic Step-by-Step Security Instructions */}
            <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 text-[11px] text-slate-500 leading-relaxed mt-1.5 space-y-1.5">
              {provider === "gmail" && (
                <>
                  <p className="font-semibold text-slate-700">🔒 Google Workspace / Gmail Requirements:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Ensure <span className="font-bold text-indigo-600">2-Step Verification</span> is enabled on your Google account.</li>
                    <li>Generate a new 16-character <span className="font-bold text-indigo-600">App Password</span> under Security.</li>
                    <li>Paste the 16-character code above (do not use your primary login password).</li>
                  </ul>
                </>
              )}
              {provider === "yahoo" && (
                <>
                  <p className="font-semibold text-slate-700">🔒 Yahoo Mail Requirements (e.g. for Malarvannan):</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Enable <span className="font-bold text-purple-600">2-Step Verification</span> on your Yahoo Account.</li>
                    <li>Go to Yahoo Account Security page, click <span className="font-bold text-purple-600">Generate app password</span>.</li>
                    <li>Choose "Other App", name it "Achme Communication" and click Generate.</li>
                    <li>Paste the generated 16-letter code above. Yahoo uses port <span className="font-bold text-purple-600">465 (SSL)</span> for ultra-secure delivery.</li>
                  </ul>
                </>
              )}
              {provider === "custom" && (
                <>
                  <p className="font-semibold text-slate-700">⚙️ Custom SMTP Details:</p>
                  <p>Input your business SMTP server host name, security port, and the custom credentials provided by your hosting administrator below.</p>
                </>
              )}
            </div>
          </div>

          {/* Advanced Section Toggle */}
          <div className="pt-1">
            <button 
              type="button" 
              onClick={() => setShowAdvanced(!showAdvanced)} 
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition-colors outline-none"
            >
              {showAdvanced ? "Hide Connection Details" : "Show Advanced Server Settings (Host/Port)"}
            </button>
          </div>

          {/* Host & Port Configuration Inputs */}
          {showAdvanced && (
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 animate-fade-in">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">SMTP Host</label>
                <input 
                  type="text" 
                  value={smtpHost} 
                  onChange={(e) => setSmtpHost(e.target.value)} 
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 transition-all bg-slate-50 focus:bg-white font-medium" 
                  placeholder="smtp.gmail.com"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">SMTP Port</label>
                <input 
                  type="text" 
                  value={smtpPort} 
                  onChange={(e) => setSmtpPort(e.target.value)} 
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 transition-all bg-slate-50 focus:bg-white font-medium" 
                  placeholder="587"
                  required
                />
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-3 border-t border-slate-100 flex gap-3">
            <button 
              type="button" 
              onClick={handleSnooze}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 font-bold text-xs uppercase tracking-wider transition-colors outline-none"
            >
              Skip / Snooze
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-blue-400 font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-100 transition-all flex items-center justify-center gap-1.5 outline-none"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Save Config"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

