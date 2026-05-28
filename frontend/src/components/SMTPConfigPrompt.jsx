import React, { useState, useEffect } from "react";
import axios from "axios";
import { Mail, Lock, Server, X, ShieldAlert, KeyRound, Check, ExternalLink, Eye, EyeOff, Send, HelpCircle, CheckSquare, Settings2, SlidersHorizontal, ToggleLeft, ToggleRight } from "lucide-react";
import { API } from "../config/api";

export default function SMTPConfigPrompt({ email, onClose }) {
  const [provider, setProvider] = useState("google"); // google, yahoo, custom
  const [emailUser, setEmailUser] = useState("");
  const [emailPass, setEmailPass] = useState("");
  const [senderName, setSenderName] = useState("");
  const [fromEmailAddress, setFromEmailAddress] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("465");
  const [smtpSecure, setSmtpSecure] = useState("true");
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showTestInput, setShowTestInput] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Fetch existing SMTP configuration on mount
  useEffect(() => {
    const fetchExistingConfig = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/api/auth/check-email-config`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.hasConfig && res.data.config) {
          const c = res.data.config;
          setEmailUser(c.email_user || "");
          setEmailPass("••••••••••••••••"); // Password placeholder
          setSenderName(c.sender_name || "");
          setFromEmailAddress(c.from_email_address || "");
          setIsEnabled(c.is_enabled === 1 || c.is_enabled === true);
          setSmtpHost(c.smtp_host || "smtp.gmail.com");
          setSmtpPort(String(c.smtp_port) || "465");
          setSmtpSecure(c.smtp_secure || "true");
          setProvider(c.provider || "google");
          
          if (c.provider === "custom") {
            setShowAdvanced(true);
          }
        } else {
          setEmailUser(email || "");
          setFromEmailAddress(email || "");
          setSenderName("Achme Communication");
        }
      } catch (err) {
        console.error("Failed to load existing SMTP config", err);
      }
    };
    fetchExistingConfig();
  }, [email]);

  const handleProviderChange = (prov) => {
    setProvider(prov);
    if (prov === "google") {
      setSmtpHost("smtp.gmail.com");
      setSmtpPort("465");
      setSmtpSecure("true");
      setShowAdvanced(false);
    } else if (prov === "yahoo") {
      setSmtpHost("smtp.mail.yahoo.com");
      setSmtpPort("465");
      setSmtpSecure("true");
      setShowAdvanced(false);
    } else {
      setSmtpHost("");
      setSmtpPort("587");
      setSmtpSecure("STARTTLS");
      setShowAdvanced(true);
    }
  };

  const handleTestConnection = async () => {
    if (!emailUser.trim()) {
      setMessage({ type: "error", text: "Email Address is required to test connection" });
      return;
    }
    if (!emailPass.trim()) {
      setMessage({ type: "error", text: "App Password is required to test connection" });
      return;
    }

    setTestLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API}/api/auth/test-smtp-connection`,
        {
          email_user: emailUser.trim(),
          email_pass: emailPass.trim(),
          smtp_host: smtpHost.trim(),
          smtp_port: parseInt(smtpPort) || 465,
          smtp_secure: smtpSecure,
          provider: provider
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ type: "success", text: res.data.message || "SMTP connection verified successfully!" });
    } catch (err) {
      setMessage({ 
        type: "error", 
        text: err.response?.data?.message || "SMTP verification failed. Please verify your host and password settings." 
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    if (!emailUser.trim()) {
      setMessage({ type: "error", text: "Email Address is required to send test email" });
      return;
    }
    if (!emailPass.trim()) {
      setMessage({ type: "error", text: "App Password is required to send test email" });
      return;
    }
    if (!testRecipient.trim()) {
      setMessage({ type: "error", text: "Recipient email address is required" });
      return;
    }

    setTestEmailLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API}/api/auth/send-test-email`,
        {
          email_user: emailUser.trim(),
          email_pass: emailPass.trim(),
          smtp_host: smtpHost.trim(),
          smtp_port: parseInt(smtpPort) || 465,
          smtp_secure: smtpSecure,
          from_email_address: fromEmailAddress.trim() || emailUser.trim(),
          sender_name: senderName.trim(),
          provider: provider,
          recipient_email: testRecipient.trim()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ type: "success", text: res.data.message || "Test email sent successfully!" });
      setShowTestInput(false);
    } catch (err) {
      setMessage({ 
        type: "error", 
        text: err.response?.data?.message || "Failed to send test email. Please verify your connection settings." 
      });
    } finally {
      setTestEmailLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailUser.trim()) {
      setMessage({ type: "error", text: "Email Address is required" });
      return;
    }
    if (!emailPass.trim()) {
      setMessage({ type: "error", text: "App Password is required" });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API}/api/auth/save-email-config`,
        {
          email_user: emailUser.trim(),
          email_pass: emailPass.trim(),
          smtp_host: smtpHost.trim(),
          smtp_port: parseInt(smtpPort) || 465,
          smtp_secure: smtpSecure,
          from_email_address: fromEmailAddress.trim() || emailUser.trim(),
          sender_name: senderName.trim(),
          provider: provider,
          is_enabled: isEnabled
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ type: "success", text: res.data.message || "SMTP verified and saved successfully!" });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setMessage({ 
        type: "error", 
        text: err.response?.data?.message || "Verification failed. Configuration was not saved." 
      });
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 transition-all transform scale-100 duration-200 max-h-[92vh] flex flex-col">
        
        {/* Header Section */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 px-6 py-5 relative text-white shrink-0">
          <button 
            type="button"
            onClick={handleSnooze}
            className="absolute top-4 right-4 p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close / Skip Setup"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Mail size={24} className="text-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-wide">SMTP Settings Wizard</h3>
              <p className="text-blue-100 text-xs mt-0.5">Configure tenant SMTP to deliver professional outgoing emails</p>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          {message.text && (
            <div className={`p-3 rounded-xl flex items-start gap-2.5 text-sm transition-all duration-200 ${
              message.type === "error" 
                ? "bg-rose-50 text-rose-600 border border-rose-100" 
                : "bg-emerald-50 text-emerald-600 border border-emerald-100"
            }`}>
              {message.type === "success" ? <Check size={18} className="shrink-0 mt-0.5" /> : <ShieldAlert size={18} className="shrink-0 mt-0.5" />}
              <span className="font-medium leading-relaxed">{message.text}</span>
            </div>
          )}

          {/* Enable/Disable SMTP toggle */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl">
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">SMTP Outgoing Service Status</span>
              <span className="text-[11px] text-slate-400">Enable or disable your custom SMTP outgoing configurations</span>
            </div>
            <button
              type="button"
              onClick={() => setIsEnabled(!isEnabled)}
              className="focus:outline-none transition-transform active:scale-95"
            >
              {isEnabled ? (
                <ToggleRight size={44} className="text-indigo-600 cursor-pointer" />
              ) : (
                <ToggleLeft size={44} className="text-slate-300 cursor-pointer" />
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Provider Selection */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Mail Provider</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleProviderChange("google")}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-200 outline-none ${
                    provider === "google"
                      ? "border-blue-600 bg-blue-50/50 text-blue-700 font-bold shadow-sm shadow-blue-50/50"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-500 font-medium"
                  }`}
                >
                  <div className="w-5 h-5 flex items-center justify-center rounded-lg bg-red-50 text-red-500 text-[10px] font-black">
                    G
                  </div>
                  <span className="text-[11px]">Google Workspace</span>
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
                  <div className="w-5 h-5 flex items-center justify-center rounded-lg bg-purple-50 text-purple-600 text-[10px] font-black">
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
                  <Server size={18} className={provider === "custom" ? "text-indigo-600" : "text-slate-400"} />
                  <span className="text-[11px]">Custom SMTP</span>
                </button>
              </div>
            </div>

            {/* Email Address & Sender Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <input 
                    type="email" 
                    value={emailUser} 
                    onChange={(e) => setEmailUser(e.target.value)} 
                    className="w-full border border-slate-300 focus:border-blue-500 focus:ring focus:ring-blue-100 rounded-xl px-3 py-2.5 pl-9 text-sm focus:outline-none transition-all" 
                    placeholder="e.g. info@yourdomain.com"
                    required
                  />
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sender Display Name</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={senderName} 
                    onChange={(e) => setSenderName(e.target.value)} 
                    className="w-full border border-slate-300 focus:border-blue-500 focus:ring focus:ring-blue-100 rounded-xl px-3 py-2.5 pl-9 text-sm focus:outline-none transition-all" 
                    placeholder="e.g. Acme Billing"
                    required
                  />
                  <Settings2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Default Sender Email (From Address) */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Default Sender Email (Reply-To / From)</label>
              <input 
                type="email" 
                value={fromEmailAddress} 
                onChange={(e) => setFromEmailAddress(e.target.value)} 
                className="w-full border border-slate-300 focus:border-blue-500 focus:ring focus:ring-blue-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-all" 
                placeholder="Leave blank to use primary Email Address"
              />
              <p className="text-[10px] text-slate-400">Normally same as your Email Address. Used in the outgoing "From:" email field.</p>
            </div>

            {/* Secure App Password Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {provider === "google" ? "Google Workspace App Password" : provider === "yahoo" ? "Yahoo App Password" : "SMTP App Password / Password"}
                </label>
                {provider !== "custom" && (
                  <a 
                    href={provider === "google" ? "https://myaccount.google.com/apppasswords" : "https://login.yahoo.com/account/security"} 
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
                  type={showPass ? "text" : "password"} 
                  value={emailPass} 
                  onChange={(e) => setEmailPass(e.target.value)} 
                  onClick={() => { if (emailPass === "••••••••••••••••") setEmailPass(""); }}
                  className="w-full border border-slate-300 focus:border-blue-500 focus:ring focus:ring-blue-100 rounded-xl px-3 py-2.5 pl-9 pr-9 text-sm focus:outline-none transition-all font-mono" 
                  placeholder="•••• •••• •••• ••••"
                  required
                />
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Security Warnings / Setup Guides */}
              <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 text-[11px] text-slate-500 leading-relaxed mt-1.5">
                {provider === "google" && (
                  <>
                    <p className="font-semibold text-slate-700">🔒 Gmail & Google Workspace requirements:</p>
                    <ul className="list-disc pl-4 space-y-0.5 mt-1">
                      <li>Enable <span className="font-bold text-indigo-600">2-Step Verification</span> in Google Security tab.</li>
                      <li>Select "App Passwords", select "Mail" and select "Other" to generate a secure <span className="font-bold text-indigo-600">16-character code</span>.</li>
                      <li>Paste the generated app password above (do not use your default Gmail login password).</li>
                    </ul>
                  </>
                )}
                {provider === "yahoo" && (
                  <>
                    <p className="font-semibold text-slate-700">🔒 Yahoo Mail requirements:</p>
                    <ul className="list-disc pl-4 space-y-0.5 mt-1">
                      <li>Ensure <span className="font-bold text-purple-600">2-Step Verification</span> is turned on.</li>
                      <li>Navigate to Yahoo Account Security page, click <span className="font-bold text-purple-600">Generate app password</span>.</li>
                      <li>Create one named "Achme" and copy/paste it into the field above.</li>
                    </ul>
                  </>
                )}
                {provider === "custom" && (
                  <>
                    <p className="font-semibold text-slate-700">⚙️ Custom SMTP Host settings:</p>
                    <p className="mt-1">Provide your custom server credentials below. Timeout protection, error reporting, and retry logic are automatically applied.</p>
                  </>
                )}
              </div>
            </div>

            {/* Toggle Advanced settings */}
            <div className="pt-1">
              <button 
                type="button" 
                onClick={() => setShowAdvanced(!showAdvanced)} 
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition-colors outline-none"
              >
                <SlidersHorizontal size={12} />
                {showAdvanced ? "Hide Advanced Server Details" : "Show Advanced Server Settings (Host/Port/SSL)"}
              </button>
            </div>

            {/* Host & Port Configuration Inputs */}
            {showAdvanced && (
              <div className="grid grid-cols-3 gap-3.5 p-4 bg-slate-50 border border-slate-200/50 rounded-xl animate-fade-in">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">SMTP Host</label>
                  <input 
                    type="text" 
                    value={smtpHost} 
                    onChange={(e) => setSmtpHost(e.target.value)} 
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 transition-all bg-white" 
                    placeholder="smtp.gmail.com"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">SMTP Port</label>
                  <input 
                    type="text" 
                    value={smtpPort} 
                    onChange={(e) => setSmtpPort(e.target.value)} 
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 transition-all bg-white" 
                    placeholder="465"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">SSL/TLS Mode</label>
                  <select
                    value={smtpSecure}
                    onChange={(e) => setSmtpSecure(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 transition-all bg-white"
                    required
                  >
                    <option value="true">SSL/TLS (Secure Port 465)</option>
                    <option value="STARTTLS">STARTTLS (Secure Port 587)</option>
                    <option value="false">None (Insecure Port 25)</option>
                  </select>
                </div>
              </div>
            )}

            {/* SMTP Test Connection Panel */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-700 uppercase block">Verify Settings</span>
                  <span className="text-[10px] text-slate-400">Test configuration viability before committing saves</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={testLoading}
                    onClick={handleTestConnection}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50 text-[11px] font-bold uppercase rounded-lg transition-colors outline-none shrink-0"
                  >
                    {testLoading ? "Testing..." : "Test Connection"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTestInput(!showTestInput)}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-bold uppercase rounded-lg transition-colors outline-none shrink-0 flex items-center gap-1"
                  >
                    <Send size={10} /> Test Email
                  </button>
                </div>
              </div>

              {/* Inline Send Test Email Form */}
              {showTestInput && (
                <div className="p-3 bg-white border border-slate-200 rounded-lg flex gap-2 items-center animate-scale-in">
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="Recipient email address"
                    className="flex-1 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    disabled={testEmailLoading}
                    onClick={handleSendTestEmail}
                    className="px-3.5 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 text-xs font-bold rounded-lg transition-colors outline-none flex items-center gap-1 shrink-0"
                  >
                    {testEmailLoading ? "Sending..." : "Send"}
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex gap-3">
              <button 
                type="button" 
                onClick={handleSnooze}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 font-bold text-xs uppercase tracking-wider transition-colors outline-none"
              >
                Snooze Wizard
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-blue-400 font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-100 transition-all flex items-center justify-center gap-1.5 outline-none"
              >
                {loading ? "Verifying & Saving..." : "Save Configuration"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
