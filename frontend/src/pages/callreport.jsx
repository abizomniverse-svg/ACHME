import React, { useState, useEffect, useCallback, useMemo } from "react";
import "../Styles/tailwind.css";
import { Search, Plus, X, Trash2, Edit, ChevronDown, ChevronUp, Download, Eye, AlertCircle, CheckCircle, Clock, Phone, CreditCard, DollarSign, AlertTriangle, MapPin, Phone as PhoneIcon, FileText, Calendar, DollarSign as DollarIcon, User, Tag, MessageSquare, TrendingUp, BarChart3, PieChart as PieChartIcon, Activity, Mail, Wrench, Users, Zap } from "lucide-react";
import axios from "axios";
import socket from "../socket/socket";
import { API } from "../config";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";

const PIE_COLORS = ["#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];

const getAuthConfig = () => {
  const token = localStorage.getItem("token");
  return { headers: { Authorization: `Bearer ${token}` } };
};

const getUserRole = () => {
  try { return JSON.parse(localStorage.getItem("user") || "{}").role || "employee"; } catch { return "employee"; }
};

const ENGINEERS = [
  { value: "Thanapalan AC017", label: "Thanapalan AC017" },
  { value: "Rajesh AC080", label: "Rajesh AC080" },
  { value: "Kandhavel AC086", label: "Kandhavel AC086" },
  { value: "Gopi AC078", label: "Gopi AC078" },
  { value: "Saran raj AC087", label: "Saran raj AC087" },
  { value: "Bharani AC105", label: "Bharani AC105" },
  { value: "Damodaran AC085", label: "Damodaran AC085" },
  { value: "Suresh AC073", label: "Suresh AC073" },
  { value: "Ranjith AC054", label: "Ranjith AC054" },
  { value: "Sivakumar AC036", label: "Sivakumar AC036" },
  { value: "Manikandaraja AC097", label: "Manikandaraja AC097" },
  { value: "Malar vannan AC016", label: "Malar vannan AC016" },
  { value: "Faiz al AC068", label: "Faiz al AC068" },
];

const CALL_REFERRERS = [
  "Krishna kumar", "Jai sankar", "Uma", "Malar vannan", "Vimal",
  "Moorthi", "Priyanka", "Thanapalan", "Princee", "Walkin"
];

const STATUS_OPTIONS = ["Closed", "Pending", "Live", "Observation"];
const CALL_TYPE_OPTIONS = ["AMC", "ALC", "Warranty", "New Installation", "Repeated"];
const PRIORITY_OPTIONS = ["Critical", "High", "Medium"];
const PAYMENT_TYPE_OPTIONS = ["Cash", "Card", "Credit", "Cheque", "UPI"];
const PAYMENT_STATUS_OPTIONS = ["Collected", "Pending"];

const STATUS_COLORS = {
  Closed: { bg: "hsl(142 71% 45% / 0.1)", text: "hsl(142 71% 45%)", border: "hsl(142 71% 45% / 0.2)" },
  Pending: { bg: "hsl(38 92% 50% / 0.1)", text: "hsl(38 92% 50%)", border: "hsl(38 92% 50% / 0.2)" },
  Live: { bg: "hsl(217 91% 60% / 0.1)", text: "hsl(217 91% 60%)", border: "hsl(217 91% 60% / 0.2)" },
  Observation: { bg: "hsl(271 81% 56% / 0.1)", text: "hsl(271 81% 56%)", border: "hsl(271 81% 56% / 0.2)" },
};

const PRIORITY_COLORS = {
  Critical: { bg: "hsl(0 72% 51% / 0.1)", text: "hsl(0 72% 51%)", border: "hsl(0 72% 51% / 0.2)" },
  High: { bg: "hsl(24 94% 50% / 0.1)", text: "hsl(24 94% 50%)", border: "hsl(24 94% 50% / 0.2)" },
  Medium: { bg: "hsl(210 40% 96%)", text: "hsl(215 16% 47%)", border: "hsl(214 32% 91%)" },
};

const PAYMENT_STATUS_COLORS = {
  Collected: { bg: "hsl(142 71% 45% / 0.1)", text: "hsl(142 71% 45%)", border: "hsl(142 71% 45% / 0.2)" },
  Pending: { bg: "hsl(0 72% 51% / 0.1)", text: "hsl(0 72% 51%)", border: "hsl(0 72% 51% / 0.2)" },
};

const SearchableSelect = ({ options, value, onChange, placeholder, label, onSearch, loading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchTimeoutRef = React.useRef(null);

  const filtered = onSearch ? options : options.filter(opt => {
    const val = typeof opt === "string" ? opt : opt.value;
    return val.toLowerCase().includes(search.toLowerCase());
  });

  const selectedLabel = options.find(opt => {
    const val = typeof opt === "string" ? opt : opt.value;
    return val === value;
  });

  const displayValue = selectedLabel ? (typeof selectedLabel === "string" ? selectedLabel : selectedLabel.label) : value;

  const handleSearchChange = (val) => {
    setSearch(val);
    if (onSearch && isOpen) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => { onSearch(val); }, 300);
    }
  };

  React.useEffect(() => {
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, []);

  return (
    <div className="relative">
      {label && <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-slate, #5d5b54)" }}>{label}</label>}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer transition-all duration-150"
        style={{ backgroundColor: "var(--color-canvas, #ffffff)", color: "var(--color-ink, #1a1a1a)", border: `1px solid ${isOpen ? "var(--color-primary, #5645d4)" : "var(--color-hairline-strong, #c8c4be)"}`, borderRadius: "var(--radius-md, 8px)", boxShadow: isOpen ? "0 0 0 2px rgba(86, 69, 212, 0.2)" : "none" }}
        onClick={() => { setIsOpen(!isOpen); setSearch(""); if (onSearch && !isOpen) onSearch(""); }}
      >
        <span className="text-sm truncate" style={{ color: value ? "var(--color-ink, #1a1a1a)" : "var(--color-muted, #bbb8b1)" }}>
          {displayValue || placeholder}
        </span>
        {isOpen ? <ChevronUp size={14} style={{ color: "var(--color-steel, #787671)" }} /> : <ChevronDown size={14} style={{ color: "var(--color-steel, #787671)" }} />}
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 overflow-hidden animate-scale-in" style={{ backgroundColor: "var(--color-canvas, #ffffff)", border: "1px solid var(--color-hairline, #e5e3df)", borderRadius: "var(--radius-md, 8px)", boxShadow: "var(--shadow-level-2, 0 4px 12px rgba(15,15,15,0.08))" }}>
          {onSearch && (
            <div className="p-2" style={{ borderBottom: "1px solid var(--color-hairline, #e5e3df)" }}>
              <input type="text" value={search} onChange={e => handleSearchChange(e.target.value)} placeholder="Type to search..." className="w-full outline-none text-sm bg-transparent" style={{ color: "var(--color-ink, #1a1a1a)" }} autoFocus onClick={e => e.stopPropagation()} />
            </div>
          )}
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-2 text-xs" style={{ color: "var(--color-steel, #787671)" }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs" style={{ color: "var(--color-steel, #787671)" }}>{onSearch ? "Type to search..." : "No results"}</div>
            ) : (
               filtered.map((opt, idx) => {
                 const val = typeof opt === "string" ? opt : opt.value;
                 const lbl = typeof opt === "string" ? opt : opt.label;
                 return (
                   <div key={idx} className="px-3 py-2 text-sm cursor-pointer transition-colors" style={{ backgroundColor: value === val ? "rgba(86, 69, 212, 0.1)" : "var(--color-surface, #f6f5f4)", color: value === val ? "var(--color-primary, #5645d4)" : "var(--color-ink, #1a1a1a)" }} onClick={e => { e.stopPropagation(); onChange(val); setIsOpen(false); }} onMouseEnter={e => { if (value !== val) e.target.style.backgroundColor = "var(--color-surface, #f6f5f4)"; }} onMouseLeave={e => { if (value !== val) e.target.style.backgroundColor = "var(--color-surface, #f6f5f4)"; }}>
                     {lbl}
                   </div>
                 );
               })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const FormField = ({ label, children, className, required, icon }) => (
  <div className={className || ""}>
    {label && (
      <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--color-slate, #5d5b54)", marginBottom: "6px" }}>
        {icon && <icon size={14} style={{ color: "var(--color-primary, #5645d4)" }} />}
        {label}{required && <span style={{ color: "var(--color-error, #e03131)" }}>*</span>}
      </label>
    )}
    <div style={{ marginTop: "6px" }}>{children}</div>
  </div>
);

const inputBase = "w-full p-2.5 text-sm outline-none transition-all duration-150 bg-white text-gray-900 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm";

const SectionDivider = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 py-2" style={{ borderBottom: "1px solid var(--color-hairline, #e5e3df)" }}>
    {Icon && <Icon size={14} style={{ color: "var(--color-primary, #5645d4)" }} />}
    <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-primary, #5645d4)" }}>{title}</h3>
  </div>
);

const Badge = ({ children, bg, text, border }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: bg, color: text, border: `1px solid ${border}` }}>
    {children}
  </span>
);

const safeFormatDate = (dateVal) => {
  if (!dateVal) return "—";
  try {
    const dateStr = typeof dateVal === "string" ? dateVal : new Date(dateVal).toISOString();
    return dateStr.split("T")[0];
  } catch (e) {
    return String(dateVal).split("T")[0] || "—";
  }
};

const formatTimeOnly = (timeVal) => {
  if (!timeVal) return "—";
  const str = String(timeVal);
  return str.includes(" ") ? (str.split(" ")[1] || str) : str;
};

const formatTimeAndDuration = (startTime, endTime, actualDuration) => {
  if (!startTime || !endTime) return "—";
  try {
    const sStr = String(startTime);
    const eStr = String(endTime);
    const startPart = sStr.includes(" ") ? (sStr.split(" ")[1] || sStr) : sStr;
    const endPart = eStr.includes(" ") ? (eStr.split(" ")[1] || eStr) : eStr;
    return `${startPart} - ${endPart} (${actualDuration || 0}m)`;
  } catch (e) {
    return `${startTime} - ${endTime} (${actualDuration || 0}m)`;
  }
};

const DetailModal = ({ call, onClose, formatCurrency }) => {
  if (!call) return null;
  const sc = STATUS_COLORS[call.status] || STATUS_COLORS.Pending;
  const pc = PRIORITY_COLORS[call.priority] || PRIORITY_COLORS.Medium;
  const psc = PAYMENT_STATUS_COLORS[call.payment_status] || PAYMENT_STATUS_COLORS.Pending;

  const DetailItem = ({ icon: Icon, label, value, valueColor }) => (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      {Icon && <Icon size={16} className="text-primary mt-0.5" />}
      <div className="flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-medium mt-0.5" style={{ color: valueColor || "hsl(var(--foreground))" }}>{value || "—"}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto border border-border animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
              <FileText size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-foreground">Call Report Details</h2>
              <p className="text-xs font-mono text-primary">Call #{call.call_sequence || 1} ID: {String(call.id).padStart(3, '0')}</p>
            </div>
          </div>
          <X className="cursor-pointer hover:text-destructive transition-colors text-muted-foreground" onClick={onClose} />
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3 text-primary">Customer Information</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
               <DetailItem icon={User} label="Customer Name" value={call.customer || call.client_name} />
               <DetailItem icon={PhoneIcon} label="Mobile" value={call.mobile_number || call.phone} />
               <DetailItem icon={Mail} label="Email" value={call.email} />
               <DetailItem icon={MapPin} label="Location" value={call.location_city || call.location} />
               <DetailItem icon={FileText} label="GST Number" value={call.gst_number || "—"} />
               <DetailItem icon={FileText} label="Company Name" value={call.company_name || "—"} />
             </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3 text-primary">Call Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <DetailItem icon={Tag} label="Call Type" value={call.call_type} />
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Tag size={16} className="text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Priority</p>
                  <Badge bg={pc.bg} text={pc.text} border={pc.border}>{call.priority || "—"}</Badge>
                </div>
              </div>
              <DetailItem icon={Wrench} label="Engineer" value={call.engineer || call.staff_name} />
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar size={16} className="text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Status</p>
                  <Badge bg={sc.bg} text={sc.text} border={sc.border}>{call.status || "—"}</Badge>
                </div>
              </div>
              <DetailItem icon={MessageSquare} label="Call Referrer" value={call.call_referrer} />
              <DetailItem icon={Calendar} label="Report Date" value={safeFormatDate(call.report_date || call.created_at)} />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3 text-primary">Description</h3>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">{call.call_details || call.complaint || call.description || "—"}</p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3 text-primary">Time & Duration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <DetailItem icon={Clock} label="Start Time" value={formatTimeOnly(call.start_time)} />
              <DetailItem icon={Clock} label="End Time" value={formatTimeOnly(call.end_time)} />
              <div className={`p-3 rounded-lg border ${call.is_exceeded ? "bg-destructive/5 border-destructive/20" : "bg-accent/5 border-accent/20"}`}>
                <Clock size={16} className={`mt-0.5 ${call.is_exceeded ? "text-destructive" : "text-accent"}`} />
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Duration</p>
                  <p className={`text-sm font-bold mt-0.5 ${call.is_exceeded ? "text-destructive" : "text-accent"}`}>{call.actual_duration || 0} min</p>
                  <p className="text-[10px] text-muted-foreground">Limit: {call.duration_limit || call.assigned_time || 30} min</p>
                  {call.is_exceeded && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-destructive">
                      <AlertTriangle size={10} /> Overflow: +{call.actual_duration - (call.duration_limit || call.assigned_time || 30)} min
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3 text-primary">Expenses</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <DetailItem icon={MapPin} label="Kilometers" value={(call.km !== null && call.km !== undefined && call.km !== "") ? `${call.km} km` : "0 km"} />
              <DetailItem icon={DollarIcon} label="Petrol Charges" value={formatCurrency(call.petrol_charges)} />
              <DetailItem icon={DollarIcon} label="Spare Parts" value={formatCurrency(call.spare_parts_price)} />
              <DetailItem icon={DollarIcon} label="Labour Charges" value={formatCurrency(call.labour_charges)} />
            </div>
            <div className="mt-3 p-3 rounded-lg flex justify-between items-center bg-primary/10 border border-primary/20">
              <span className="text-xs font-bold text-primary">Total Expenses</span>
              <span className="text-lg font-bold font-display text-primary">{formatCurrency(call.total_expenses)}</span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3 text-primary">Payment</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <DetailItem icon={DollarIcon} label="Invoice Value" value={formatCurrency(call.invoice_value)} />
              <DetailItem icon={CreditCard} label="Payment Type" value={call.payment_type} />
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <CreditCard size={16} className="text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Payment Status</p>
                  <Badge bg={psc.bg} text={psc.text} border={psc.border}>{call.payment_status || "—"}</Badge>
                </div>
              </div>
            </div>
          </div>

          {call.remarks && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide mb-3 text-primary">Remarks</h3>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">{call.remarks}</p>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-border px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 border border-border rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};

const SessionLogsModal = ({ sessionId, callsList, onClose, formatCurrency, canEdit, onEditCall }) => {
  const sessionCalls = React.useMemo(() => {
    return callsList
      .filter(c => c.session_id === sessionId)
      .sort((a, b) => (a.call_sequence || 1) - (b.call_sequence || 1));
  }, [sessionId, callsList]);

  if (!sessionId) return null;

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto border border-border animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
              <Zap size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-foreground">Session Service Call Logs</h2>
              <p className="text-xs font-mono text-muted-foreground">Session ID: {sessionId}</p>
            </div>
          </div>
          <X className="cursor-pointer hover:text-destructive transition-colors text-muted-foreground" onClick={onClose} />
        </div>

        <div className="p-6 space-y-6">
          {sessionCalls.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No calls found under this session.</div>
          ) : (
            <div className="space-y-4">
              {sessionCalls.map((c, idx) => {
                const sc = STATUS_COLORS[c.status] || STATUS_COLORS.Pending;
                const pc = PRIORITY_COLORS[c.priority] || PRIORITY_COLORS.Medium;
                const psc = PAYMENT_STATUS_COLORS[c.payment_status] || PAYMENT_STATUS_COLORS.Pending;
                const totalExpenses = (parseFloat(c.petrol_charges) || 0) + (parseFloat(c.spare_parts_price) || 0) + (parseFloat(c.labour_charges) || 0);

                return (
                  <div key={c.id} className="border border-border rounded-xl p-4 bg-muted/20 hover:border-primary/20 transition-all shadow-sm">
                    <div className="flex flex-wrap justify-between items-center gap-2 pb-3 mb-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary">
                          Call #{c.call_sequence || (idx + 1)}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">ID: {c.call_id || `#${c.id}`}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge bg={sc.bg} text={sc.text} border={sc.border}>{c.status || "Pending"}</Badge>
                        <Badge bg={pc.bg} text={pc.text} border={pc.border}>{c.priority || "Medium"}</Badge>
                        {canEdit && (
                          <button
                            onClick={() => onEditCall(c)}
                            className="p-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors border border-accent/20 hover:scale-105 active:scale-95 flex items-center justify-center ml-1"
                            title="Edit Details"
                          >
                            <Edit size={12} className="stroke-[2.5px]" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <p className="font-bold text-muted-foreground uppercase tracking-wide text-[9px]">Date</p>
                        <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                          <Calendar size={12} className="text-primary" /> {safeFormatDate(c.report_date || c.created_at)}
                        </p>
                      </div>
                      <div>
                        <p className="font-bold text-muted-foreground uppercase tracking-wide text-[9px]">Engineer Assigned</p>
                        <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                          <User size={12} className="text-primary" /> {c.engineer || c.staff_name || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="font-bold text-muted-foreground uppercase tracking-wide text-[9px]">Time & Duration</p>
                        <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                          <Clock size={12} className="text-primary" /> 
                          {formatTimeAndDuration(c.start_time, c.end_time, c.actual_duration)}
                        </p>
                      </div>
                      <div>
                        <p className="font-bold text-muted-foreground uppercase tracking-wide text-[9px]">Pay Status</p>
                        <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                          <CreditCard size={12} className="text-primary" /> {c.payment_status || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-3 border-t border-dashed border-border text-xs">
                      <div>
                        <p className="font-bold text-muted-foreground uppercase tracking-wide text-[9px]">Call Details</p>
                        <p className="text-muted-foreground mt-1 text-sm bg-white p-2 rounded border border-border">
                          {c.call_details || c.complaint || c.description || "—"}
                        </p>
                      </div>
                      <div className="flex flex-col justify-between">
                        <div>
                          <p className="font-bold text-muted-foreground uppercase tracking-wide text-[9px]">Expenses & Travel</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1 text-[10px] text-muted-foreground">
                            <div>KM: {c.km !== null && c.km !== undefined && c.km !== "" ? `${c.km} km` : "0 km"}</div>
                            <div>Petrol: {formatCurrency(c.petrol_charges)}</div>
                            <div>Spare Parts: {formatCurrency(c.spare_parts_price)}</div>
                            <div>Labour: {formatCurrency(c.labour_charges)}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-between items-center p-2 rounded bg-white border border-border">
                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground block">TOTAL EXPENSES</span>
                            <span className="font-bold text-sm text-foreground">{formatCurrency(totalExpenses)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-muted-foreground block">PAY (INVOICE VALUE)</span>
                            <span className="font-bold text-sm text-accent">{formatCurrency(c.invoice_value)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-border px-6 py-4 flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            Total Session Calls: <span className="font-bold text-foreground">{sessionCalls.length}</span> | 
            Total Session Revenue: <span className="font-bold text-accent">{formatCurrency(sessionCalls.reduce((sum, c) => sum + (parseFloat(c.invoice_value) || 0), 0))}</span>
          </div>
          <button onClick={onClose} className="px-6 py-2.5 border border-border rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};

const CallReport = () => {
  const userRole = getUserRole();
  const canEditDelete = userRole === "admin" || userRole === "subadmin";

  const [activeTab, setActiveTab] = useState("calls");
  const [collapsedMonths, setCollapsedMonths] = useState({});
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [engineerFilter, setEngineerFilter] = useState("All");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [detailCall, setDetailCall] = useState(null);
  const [sessionLogsModalOpen, setSessionLogsModalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [perfEngineerFilter, setPerfEngineerFilter] = useState("All");

  const [basicForm, setBasicForm] = useState({
    customer: "", customer_id: "", mobile_number: "", email: "", location_city: "", duration: "", call_type: "", call_details: "",
    invoice_value: "", priority: "", call_referrer: "", status: "Pending", payment_type: "", payment_status: "Pending",
    gst_number: "", company_name: "", contract_title: "",
    session_id: "", call_sequence: 1
  });

  const [basicContractSearchResults, setBasicContractSearchResults] = useState([]);
  const [basicContractLoading, setBasicContractLoading] = useState(false);
  const [selectedBasicContract, setSelectedBasicContract] = useState(null);

  const [form, setForm] = useState({
    customer: "", customer_id: "", mobile_number: "", email: "", location_city: "", call_details: "",
    priority: "", call_referrer: "", status: "", call_type: "",
    payment_type: "", invoice_value: "", payment_status: "", duration: "", contract_title: "",
    gst_number: "", company_name: "",
  });

  const [step2Form, setStep2Form] = useState({
    engineer: "", start_time: "", end_time: "", km: "",
    petrol_charges: "", spare_parts_price: "", labour_charges: "", remarks: "",
    status: "", invoice_value: "",
  });

  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [contractSearchResults, setContractSearchResults] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [contractLoading, setContractLoading] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [step2CallId, setStep2CallId] = useState(null);
  const [step2ModalOpen, setStep2ModalOpen] = useState(false);

  const fetchCalls = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/call-reports`, getAuthConfig());
      const data = res.data || [];
      setCalls(data);
      localStorage.setItem("cached_calls", JSON.stringify(data));
    } catch (err) {
      console.error("Fetch calls error, loading cache:", err);
      try {
        const cached = localStorage.getItem("cached_calls");
        if (cached) setCalls(JSON.parse(cached));
      } catch (e) { console.error(e); }
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // Instant offline/cached startup before network call resolves
    try {
      const cached = localStorage.getItem("cached_calls");
      if (cached) setCalls(JSON.parse(cached));
    } catch (e) { console.error(e); }

    fetchCalls();
  }, [fetchCalls]);

  useEffect(() => {
    const handler = () => fetchCalls();
    socket.on("data_changed", handler);
    return () => socket.off("data_changed", handler);
  }, [fetchCalls]);

   const mapClientOption = (c) => ({
     value: c.name || c.customer || "",
     customer_id: c.id,
     label: `${c.name || c.customer || ""}${c.company_name ? ` (${c.company_name})` : ""}`,
     mobile_number: c.phone || c.mobile_number || "",
     location_city: c.city || c.lead_city || c.location_city || c.address || "",
     email: c.email || "",
     gst_number: c.gst_number || "",
     company_name: c.company_name || "",
   });

   const mapContractOption = (c) => ({
     value: c.contract_title || "",
     contract_id: c.id,
     label: `${c.contract_title || "Untitled Contract"}${c.client_company ? ` - ${c.client_company}` : ""}`,
     mobile_number: c.mobile_number || "",
     location_city: c.location_city || "",
     email: c.email || "",
     invoice_value: c.amount_value || c.invoice_value || 0,
     contract_type: c.contract_type || "",
     client_company: c.client_company || "",
   });

   const searchCustomers = useCallback(async (q = "") => {
     setCustomerLoading(true);
     try {
       const res = await axios.get(`${API}/api/client/search`, {
         params: { name: q },
         ...getAuthConfig()
       });
       setCustomerSearchResults((res.data || []).map(mapClientOption).filter(c => c.value));
     } catch (err) {
       console.error(err);
       try {
         const res = await axios.get(`${API}/api/call-reports/customers`, {
           params: { q },
           ...getAuthConfig()
         });
         setCustomerSearchResults((res.data || []).map(mapClientOption).filter(c => c.value));
       } catch (fallbackErr) {
         console.error(fallbackErr);
         setCustomerSearchResults([]);
       }
     }
     finally { setCustomerLoading(false); }
   }, []);

   const searchContracts = useCallback(async (type, searchTerm = "", target = "edit") => {
     const setLoadingState = target === "basic" ? setBasicContractLoading : setContractLoading;
     const setResultsState = target === "basic" ? setBasicContractSearchResults : setContractSearchResults;

     if (type !== "AMC" && type !== "ALC") {
       setResultsState([]);
       return;
     }

     setLoadingState(true);
     try {
       const res = await axios.get(`${API}/api/contract/with-usage`, getAuthConfig());
       const q = searchTerm.trim().toLowerCase();
       const filtered = (res.data || []).filter(c => {
         const matchesType = c.contract_type === type;
         const haystack = `${c.contract_title || ""} ${c.client_company || ""} ${c.mobile_number || ""} ${c.email || ""}`.toLowerCase();
         return matchesType && (!q || haystack.includes(q));
       });
       setResultsState(filtered.map(mapContractOption));
     } catch (err) {
       console.error(err);
       setResultsState([]);
     }
     finally { setLoadingState(false); }
   }, []);

  const handleBasicCallTypeChange = (type) => {
    setBasicForm({ ...basicForm, call_type: type });
    setBasicContractSearchResults([]);
    setSelectedBasicContract(null);
    if (type === "AMC" || type === "ALC") {
      searchContracts(type, "", "basic");
    } else {
      setBasicForm(prev => ({
        ...prev,
        call_type: type,
        customer_id: "",
      }));
    }
  };

  const handleCallTypeChange = (type) => {
    setForm({ ...form, call_type: type });
    if (type === "AMC" || type === "ALC") {
      searchContracts(type, "", "edit");
    } else {
      setContractSearchResults([]);
      setSelectedContract(null);
    }
  };

  const handleContractSelect = (contractTitle) => {
    const contract = contractSearchResults.find(c => c.value === contractTitle);
    if (contract) {
      setSelectedContract(contract);
      setForm({
        ...form,
        customer: contract.client_company || contract.label,
        customer_id: contract.contract_id || "",
        contract_title: contract.value || "",
        mobile_number: contract.mobile_number || "",
        email: contract.email || "",
        location_city: contract.location_city || "",
        invoice_value: contract.invoice_value || form.invoice_value,
      });
    }
  };

  const handleCustomerSelect = (customerVal) => {
    const customer = customerSearchResults.find(c => c.value === customerVal);
    if (customer) {
      setForm((prev) => ({
        ...prev,
        customer: customer.value,
        customer_id: customer.customer_id || "",
        mobile_number: customer.mobile_number || "",
        email: customer.email || "",
        location_city: customer.location_city || "",
      }));
    } else {
      setForm((prev) => ({ ...prev, customer: customerVal }));
    }
  };

  const handleBasicCustomerSelect = (customerVal) => {
    const customer = customerSearchResults.find(c => c.value === customerVal);
    if (customer) {
      setBasicForm((prev) => ({
        ...prev,
        customer: customer.value,
        customer_id: customer.customer_id || "",
        contract_title: "",
        mobile_number: customer.mobile_number || "",
        email: customer.email || "",
        location_city: customer.location_city || "",
      }));
      setSelectedBasicContract(null);
    } else {
      setBasicForm((prev) => ({ ...prev, customer: customerVal, contract_title: "" }));
      setSelectedBasicContract(null);
    }
  };

  const calculateDuration = () => {
    if (!form.start_time || !form.end_time) return { actual: 0, limit: 0, exceeded: false, overflow: 0 };
    const [sh, sm] = form.start_time.split(":").map(Number);
    const [eh, em] = form.end_time.split(":").map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    const actual = endMins > startMins ? endMins - startMins : 0;
    const durationMap = { "1hr": 60, "1.5hr": 90, "2hr": 120 };
    const limit = durationMap[form.duration] || selectedContract?.duration_limit || 30;
    const exceeded = actual > limit;
    const overflow = exceeded ? actual - limit : 0;
    return { actual, limit, exceeded, overflow };
  };

  const duration = calculateDuration();

  const calculateStep2Duration = () => {
    if (!step2Form.start_time || !step2Form.end_time) return { actual: 0, limit: 0, exceeded: false, overflow: 0 };
    const currentCall = calls.find(c => c.id === step2CallId);
    const limit = currentCall?.duration_limit || currentCall?.assigned_time || 30;
    const [sh, sm] = step2Form.start_time.split(":").map(Number);
    const [eh, em] = step2Form.end_time.split(":").map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    const actual = endMins > startMins ? endMins - startMins : 0;
    const exceeded = actual > limit;
    const overflow = exceeded ? actual - limit : 0;
    return { actual, limit, exceeded, overflow };
  };

  const step2Duration = calculateStep2Duration();

  const resetForm = () => {
    setForm({
      customer: "", customer_id: "", mobile_number: "", email: "", location_city: "", call_details: "",
      priority: "", call_referrer: "", status: "", call_type: "",
      payment_type: "", invoice_value: "", payment_status: "", duration: "", contract_title: "",
      gst_number: "", company_name: "",
    });
    setStep2Form({
      engineer: "", start_time: "", end_time: "", km: "",
      petrol_charges: "", spare_parts_price: "", labour_charges: "", remarks: "",
      status: "", invoice_value: "",
    });
    setIsEdit(false); setEditId(null);
    setSelectedContract(null);
    setCustomerSearchResults([]);
    setContractSearchResults([]);
    setStep2CallId(null);
    setStep2ModalOpen(false);
  };

  const openAddModal = () => { resetForm(); setModalOpen(true); searchCustomers(""); };

  const openEditModal = (call) => {
    setForm({
      customer: call.customer_name || call.client_name || "",
      customer_id: call.customer_id || "",
      mobile_number: call.mobile_number || call.phone || "",
      email: call.email || "",
      location_city: call.location_city || call.location || "",
      call_details: call.call_details || call.complaint || call.description || "",
      priority: call.priority || "",
      call_referrer: call.call_referrer || "",
      status: call.status || "",
      call_type: call.call_type || "",
      payment_type: call.payment_type || "",
      invoice_value: call.invoice_value || "",
      payment_status: call.payment_status || "",
      contract_title: call.contract_title || "",
      duration: call.duration_limit ? (call.duration_limit == 60 ? "1hr" : call.duration_limit == 90 ? "1.5hr" : call.duration_limit == 120 ? "2hr" : "") : "",
      gst_number: call.gst_number || "",
      company_name: call.company_name || "",
    });
    setStep2Form({
      engineer: call.engineer || call.staff_name || "",
      start_time: call.start_time || "",
      end_time: call.end_time || "",
      km: call.km || "",
      petrol_charges: call.petrol_charges || "",
      spare_parts_price: call.spare_parts_price || "",
      labour_charges: call.labour_charges || "",
      remarks: call.remarks || "",
      status: call.status || "",
      invoice_value: call.invoice_value || "",
    });
    setEditId(call.id);
    setIsEdit(true);
    setModalOpen(true);
  };

  const openStep2Form = async (call) => {
    setStep2CallId(call.id);
    setStep2Form({
      engineer: call.engineer || call.staff_name || "",
      start_time: call.start_time || "",
      end_time: call.end_time || "",
      km: call.km || "",
      petrol_charges: call.petrol_charges || "",
      spare_parts_price: call.spare_parts_price || "",
      labour_charges: call.labour_charges || "",
      remarks: call.remarks || "",
      status: call.status || "Pending",
      invoice_value: call.invoice_value || "",
    });
    setStep2ModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer.trim()) return alert("Customer name is required");
    if (!form.mobile_number?.trim()) return alert("Mobile number is required");
    if (!form.email?.trim()) return alert("Email is required");
    if (!form.location_city?.trim()) return alert("Location/City is required");
    if (!form.call_type) return alert("Call type is required");
    if (!form.call_details?.trim()) return alert("Call details are required");
    if (!form.priority) return alert("Priority is required");
    if (!form.call_referrer) return alert("Call referrer is required");
    if (!form.status) return alert("Status is required");
    if (!form.payment_type) return alert("Payment type is required");
    if (form.invoice_value === "" || isNaN(parseFloat(form.invoice_value))) return alert("Invoice value is required");
    if (!form.payment_status) return alert("Payment status is required");

    try {
      const payload = {
        ...(isEdit ? step2Form : {}),
        ...form,
        invoice_value: parseFloat(form.invoice_value) || 0,
        duration_limit: form.duration === "1hr" ? 60 : form.duration === "1.5hr" ? 90 : form.duration === "2hr" ? 120 : 30,
        assigned_time: form.duration === "1hr" ? 60 : form.duration === "1.5hr" ? 90 : form.duration === "2hr" ? 120 : 30,
      };
      if (isEdit && editId) {
        await axios.put(`${API}/api/call-reports/${editId}`, payload, getAuthConfig());
      } else {
        payload.report_date = new Date().toISOString().split("T")[0];
        payload.session_id = form.session_id || `SES-${Date.now()}`;
        payload.call_sequence = form.call_sequence || 1;
        await axios.post(`${API}/api/call-reports`, payload, getAuthConfig());
      }
      setModalOpen(false); resetForm(); fetchCalls();
    } catch (err) { alert("Error: " + (err.response?.data?.error || err.message)); }
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    if (!step2Form.engineer) return alert("Engineer is required");

    const payVal = parseFloat(step2Form.invoice_value);
    if (isNaN(payVal) || payVal <= 0) {
      return alert("Pay (invoice value) cannot be 0 or empty!");
    }

    const step2Duration = calculateStep2Duration();
    if (step2Duration.exceeded && !step2Form.remarks?.trim()) {
      return alert(`Duration exceeded by ${step2Duration.overflow} min. Please specify the reason why the time was exceeded in the remarks field!`);
    }

    try {
      const payload = {
        engineer: step2Form.engineer,
        staff_name: step2Form.engineer,
        start_time: step2Form.start_time,
        end_time: step2Form.end_time,
        km: step2Form.km,
        petrol_charges: step2Form.petrol_charges,
        spare_parts_price: step2Form.spare_parts_price,
        labour_charges: step2Form.labour_charges,
        remarks: step2Form.remarks,
        status: step2Form.status,
        invoice_value: payVal,
      };
      await axios.put(`${API}/api/call-reports/${step2CallId}`, payload, getAuthConfig());
      setStep2ModalOpen(false);
      setStep2CallId(null);
      fetchCalls();
    } catch (err) { alert("Error: " + (err.response?.data?.error || err.message)); }
  };

  const deleteCall = async (id) => {
    if (!window.confirm("Delete this call record?")) return;
    try { await axios.delete(`${API}/api/call-reports/${id}`, getAuthConfig()); fetchCalls(); } catch (err) { alert("Failed to delete"); }
  };

  const downloadCSV = () => {
    if (!filteredCalls.length) return alert("No data to export");
    const headers = [
      "Call ID",
      "Session ID",
      "Call Sequence",
      "Customer Name",
      "Company Name",
      "Mobile Number",
      "Email",
      "Location/City",
      "GST Number",
      "Call Type",
      "Contract Title",
      "Call Details/Complaint",
      "Priority",
      "Call Referrer",
      "Engineer Assigned",
      "Start Time",
      "End Time",
      "Duration Limit (min)",
      "Actual Duration (min)",
      "Duration Exceeded",
      "Kilometers (KM)",
      "Petrol Charges (₹)",
      "Spare Parts Price (₹)",
      "Labour Charges (₹)",
      "Total Expenses (₹)",
      "Payment Type",
      "Invoice Value (₹)",
      "Payment Status",
      "Call Status",
      "Completion Status",
      "Remarks",
      "Created At"
    ];
    const rows = filteredCalls.map(c => {
      const dur = c.actual_duration || 0;
      return [
        c.call_id || `#${c.id}`,
        c.session_id || "—",
        c.call_sequence || 1,
        c.customer || c.client_name || c.customer_name || "—",
        c.company_name || "—",
        c.mobile_number || c.phone || "—",
        c.email || "—",
        c.location_city || c.location || "—",
        c.gst_number || "—",
        c.call_type || "—",
        c.contract_title || "—",
        c.call_details || c.complaint || c.description || "—",
        c.priority || "Medium",
        c.call_referrer || "—",
        c.engineer || c.staff_name || "—",
        c.start_time || "—",
        c.end_time || "—",
        c.duration_limit || c.assigned_time || 30,
        dur,
        c.is_exceeded ? "Yes" : "No",
        c.km !== "" && c.km != null ? c.km : "—",
        c.petrol_charges || 0,
        c.spare_parts_price || 0,
        c.labour_charges || 0,
        c.total_expenses || 0,
        c.payment_type || "—",
        c.invoice_value || 0,
        c.payment_status || "—",
        c.status || "Pending",
        c.step2_completed ? "Complete" : "Basic",
        c.remarks || "—",
        c.created_at || "—"
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `CallReport_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const filteredCalls = useMemo(() => {
    return calls.filter(c => {
      const matchSearch = !searchTerm || (c.customer_name || c.client_name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (c.call_id || "").includes(searchTerm) || (c.engineer || c.staff_name || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "All" || c.status === statusFilter;
      const matchPriority = priorityFilter === "All" || c.priority === priorityFilter;
      const matchEngineer = engineerFilter === "All" || (c.engineer || c.staff_name) === engineerFilter;
      const matchPayment = paymentStatusFilter === "All" || c.payment_status === paymentStatusFilter;
      return matchSearch && matchStatus && matchPriority && matchEngineer && matchPayment;
    }).sort((a, b) => {
      const dateA = new Date(a.report_date || a.created_at || 0);
      const dateB = new Date(b.report_date || b.created_at || 0);
      if (dateB - dateA !== 0) return dateB - dateA;
      return (b.id || 0) - (a.id || 0);
    });
  }, [calls, searchTerm, statusFilter, priorityFilter, engineerFilter, paymentStatusFilter]);

  const groupedCallsByMonth = useMemo(() => {
    const groups = {};
    filteredCalls.forEach(c => {
      const date = new Date(c.report_date || c.created_at || Date.now());
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!groups[monthKey]) {
        groups[monthKey] = {
          key: monthKey,
          label: monthLabel,
          calls: [],
          totalRevenue: 0,
          totalExpenses: 0,
        };
      }
      groups[monthKey].calls.push(c);
      groups[monthKey].totalRevenue += parseFloat(c.invoice_value) || 0;
      groups[monthKey].totalExpenses += parseFloat(c.total_expenses) || 0;
    });
    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
  }, [filteredCalls]);

  const stats = useMemo(() => ({
    total: calls.length,
    closed: calls.filter(c => c.status === "Closed").length,
    pending: calls.filter(c => c.status === "Pending").length,
    live: calls.filter(c => c.status === "Live").length,
    exceeded: calls.filter(c => c.is_exceeded).length,
    step2Complete: calls.filter(c => c.step2_completed).length,
    step2Pending: calls.filter(c => !c.step2_completed).length,
    totalValue: calls.reduce((sum, c) => sum + (parseFloat(c.invoice_value) || 0), 0),
    collected: calls.filter(c => c.payment_status === "Collected").reduce((sum, c) => sum + (parseFloat(c.invoice_value) || 0), 0),
  }), [calls]);

  const formatCurrency = (v) => `₹${(parseFloat(v) || 0).toLocaleString()}`;

  const busyEngineers = useMemo(() => {
    return calls
      .filter(c => ["Live", "Pending", "Observation"].includes(c.status) && (c.engineer || c.staff_name))
      .map(c => c.engineer || c.staff_name);
  }, [calls]);

  const getEngineerStatus = (engineerName) => {
    const isBusy = busyEngineers.includes(engineerName);
    const currentCall = calls.find(c => (c.engineer || c.staff_name) === engineerName && ["Live", "Pending", "Observation"].includes(c.status));
    return { isBusy, customerName: currentCall ? (currentCall.customer_name || currentCall.client_name) : null };
  };

  const freeEngineers = useMemo(() => {
    return ENGINEERS.filter(e => !busyEngineers.includes(e.value));
  }, [busyEngineers]);

  const openFollowUpCall = async (c) => {
    const sessionCalls = calls.filter(call => call.session_id === c.session_id);
    const maxSeq = sessionCalls.reduce((max, call) => Math.max(max, call.call_sequence || 1), 0);
    const nextSeq = maxSeq + 1;

    try {
      const payload = {
        customer: c.customer || c.client_name || "",
        customer_id: c.customer_id || null,
        mobile_number: c.mobile_number || c.phone || "",
        email: c.email || "",
        location_city: c.location_city || c.location || "",
        call_type: c.call_type || "AMC",
        contract_title: c.contract_title || "",
        call_details: `Follow-up Call #${nextSeq} under session ${c.session_id}`,
        priority: c.priority || "Medium",
        call_referrer: c.call_referrer || "",
        status: "Pending",
        payment_type: c.payment_type || "",
        invoice_value: 0,
        payment_status: "Pending",
        duration_limit: c.duration_limit || 60,
        assigned_time: c.assigned_time || 60,
        service_type: (c.call_type === "AMC" || c.call_type === "ALC") ? c.call_type : "None",
        report_date: new Date().toISOString().split("T")[0],
        session_id: c.session_id,
        call_sequence: nextSeq
      };

      const res = await axios.post(`${API}/api/call-reports`, payload, getAuthConfig());
      const newCallId = res.data.id;

      // Refresh calls list in the background
      await fetchCalls();

      // Open the Step 2 complete modal directly for this newly created follow-up call!
      setStep2CallId(newCallId);
      setStep2Form({
        engineer: "",
        start_time: "",
        end_time: "",
        km: "",
        petrol_charges: "",
        spare_parts_price: "",
        labour_charges: "",
        remarks: "",
        status: "Pending",
      });
      setStep2ModalOpen(true);
    } catch (err) {
      alert("Error creating follow-up call: " + (err.response?.data?.error || err.message));
    }
  };

  const openBasicForm = () => {
    setBasicForm({
      customer: "", customer_id: "", mobile_number: "", email: "", location_city: "", duration: "", call_type: "", call_details: "",
      invoice_value: "", priority: "", call_referrer: "", status: "Pending", payment_type: "", payment_status: "Pending", gst_number: "", company_name: "", contract_title: "",
      session_id: `SES-${Date.now()}`,
      call_sequence: 1
    });
    setSelectedBasicContract(null);
    setBasicContractSearchResults([]);
    setModalOpen(true);
    setIsEdit(false);
    setEditId(null);
  };

  const handleInlineUpdate = async (callId, updatedFields) => {
    try {
      const res = await axios.get(`${API}/api/call-reports/${callId}`, getAuthConfig());
      const currentCall = res.data;
      if (!currentCall) return;

      const payload = {
        customer: currentCall.customer_name || currentCall.client_name || "",
        customer_id: currentCall.customer_id || null,
        mobile_number: currentCall.mobile_number || currentCall.phone || "",
        email: currentCall.email || "",
        location_city: currentCall.location_city || currentCall.location || "",
        call_details: currentCall.call_details || currentCall.complaint || currentCall.description || "",
        priority: currentCall.priority || "Medium",
        engineer: currentCall.engineer || currentCall.staff_name || "",
        call_referrer: currentCall.call_referrer || "",
        status: currentCall.status || "Pending",
        call_type: currentCall.call_type || "AMC",
        payment_type: currentCall.payment_type || "",
        invoice_value: parseFloat(currentCall.invoice_value) || 0,
        payment_status: currentCall.payment_status || "",
        duration_limit: currentCall.duration_limit || currentCall.assigned_time || 30,
        assigned_time: currentCall.duration_limit || currentCall.assigned_time || 30,
        start_time: currentCall.start_time || null,
        end_time: currentCall.end_time || null,
        km: currentCall.km !== "" && currentCall.km != null ? parseFloat(currentCall.km) : null,
        petrol_charges: parseFloat(currentCall.petrol_charges) || 0,
        spare_parts_price: parseFloat(currentCall.spare_parts_price) || 0,
        labour_charges: parseFloat(currentCall.labour_charges) || 0,
        remarks: currentCall.remarks || "",
        step2_completed: currentCall.step2_completed || 0,
        ...updatedFields
      };

      await axios.put(`${API}/api/call-reports/${callId}`, payload, getAuthConfig());
      fetchCalls();
    } catch (err) {
      alert("Error updating: " + (err.response?.data?.error || err.message));
    }
  };

  const handleBasicContractSelect = (contractTitle) => {
    const contract = basicContractSearchResults.find(c => c.value === contractTitle);
    if (contract) {
      setSelectedBasicContract(contract);
      setBasicForm({
        ...basicForm,
        customer: contract.client_company || contract.label,
        customer_id: contract.contract_id || "",
        contract_title: contract.value || "",
        mobile_number: contract.mobile_number || "",
        email: contract.email || "",
        location_city: contract.location_city || "",
        invoice_value: contract.invoice_value || basicForm.invoice_value,
      });
      setBasicContractSearchResults([]);
    }
  };

  const handleBasicSubmit = async (e) => {
    e.preventDefault();
    if (!basicForm.customer.trim()) return alert("Customer name is required");
    if (!basicForm.mobile_number?.trim()) return alert("Mobile number is required");
    if (!basicForm.email?.trim()) return alert("Email is required");
    if (!basicForm.location_city?.trim()) return alert("Location/City is required");
    if (!basicForm.call_type) return alert("Call type is required");
    if (!basicForm.duration) return alert("Duration is required");
    if (!basicForm.priority) return alert("Priority is required");
    if (!basicForm.call_referrer) return alert("Call referrer is required");
    if (!basicForm.call_details?.trim()) return alert("Call details are required");
    if (!basicForm.status) return alert("Status is required");
    if (!basicForm.payment_type) return alert("Payment type is required");

    try {
      const durationMap = { "1hr": 60, "1.5hr": 90, "2hr": 120 };
      const payload = {
        customer: basicForm.customer,
        customer_id: basicForm.customer_id || null,
        mobile_number: basicForm.mobile_number || "",
        email: basicForm.email || "",
        location_city: basicForm.location_city || "",
        call_type: basicForm.call_type,
        contract_title: basicForm.contract_title || "",
        call_details: basicForm.call_details,
        priority: basicForm.priority,
        call_referrer: basicForm.call_referrer,
        status: basicForm.status,
        payment_type: basicForm.payment_type,
        invoice_value: parseFloat(basicForm.invoice_value) || 0,
        payment_status: basicForm.payment_status || "Pending",
        duration_limit: durationMap[basicForm.duration] || 60,
        assigned_time: durationMap[basicForm.duration] || 60,
        service_type: (basicForm.call_type === "AMC" || basicForm.call_type === "ALC") ? basicForm.call_type : "None",
        report_date: new Date().toISOString().split("T")[0],
        session_id: basicForm.session_id || `SES-${Date.now()}`,
        call_sequence: basicForm.call_sequence || 1,
        gst_number: basicForm.gst_number || "",
        company_name: basicForm.company_name || "",
      };
      await axios.post(`${API}/api/call-reports`, payload, getAuthConfig());
      setModalOpen(false);
      fetchCalls();
    } catch (err) { alert("Error: " + (err.response?.data?.error || err.message)); }
  };

  const performanceData = useMemo(() => {
    return ENGINEERS.map(eng => {
      const engCalls = calls.filter(c => (c.engineer || c.staff_name) === eng.value && (c.status === "Closed" || c.status === "Completed"));
      const totalCalls = engCalls.length;
      const totalKM = engCalls.reduce((sum, c) => sum + (parseFloat(c.km) || 0), 0);
      const totalPetrol = engCalls.reduce((sum, c) => sum + (parseFloat(c.petrol_charges) || 0), 0);
      const totalMinutes = engCalls.reduce((sum, c) => sum + (c.actual_duration || 0), 0);
      const totalHours = totalMinutes / 60;
      const totalRevenue = engCalls.reduce((sum, c) => sum + (parseFloat(c.invoice_value) || 0), 0);
      const callsPerHour = totalHours > 0 ? (totalCalls / totalHours).toFixed(2) : "0.00";
      return {
        name: eng.label,
        totalCalls,
        totalKM: totalKM.toFixed(1),
        totalPetrol,
        totalHours: totalHours.toFixed(1),
        totalRevenue,
        callsPerHour: parseFloat(callsPerHour),
      };
    }).sort((a, b) => b.callsPerHour - a.callsPerHour);
  }, [calls]);

  const filteredPerformanceData = useMemo(() => {
    if (perfEngineerFilter === "All") return performanceData;
    return performanceData.filter(p => p.name === perfEngineerFilter);
  }, [performanceData, perfEngineerFilter]);

  const downloadPerformanceCSV = () => {
    if (!filteredPerformanceData.length) return alert("No performance data to export");
    const headers = ["Engineer Name", "Total Calls Completed", "Total KM Driven", "Total Petrol Cost (₹)", "Total Time Spent (Hours)", "Total Revenue Generated (₹)", "Calls per Hour (Efficiency)"];
    const rows = filteredPerformanceData.map(p => [
      p.name,
      p.totalCalls,
      p.totalKM,
      p.totalPetrol,
      p.totalHours,
      p.totalRevenue,
      p.callsPerHour
    ]);
    const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Engineer_Performance_Report_${perfEngineerFilter.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const TABS = [
    { id: "calls", label: "Calls" },
    { id: "engineers", label: "Engineers" },
    { id: "performance", label: "Performance" },
  ];

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
    color: "hsl(var(--foreground))",
  };

  return (
    <div className="w-full p-2 md:p-4" style={{ background: "hsl(var(--background))" }}>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-primary">Call Report</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Dashboard &gt; Services &gt; Call Report</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadCSV} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors">
            <Download size={14} /> Export
          </button>
          <button onClick={openBasicForm} className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 bg-primary hover:bg-primary/90 transition-colors shadow-md hover:shadow-lg">
            <Plus size={16} /> New Call
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-card rounded-xl border border-border p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === tab.id ? "shadow-sm" : "hover:bg-muted/50"}`}
            style={{
              background: activeTab === tab.id ? "hsl(var(--primary))" : "transparent",
              color: activeTab === tab.id ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "calls" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {[
              { label: "Total Calls", value: stats.total, icon: Phone, color: "hsl(var(--primary))", bg: "hsl(var(--primary) / 0.1)" },
              { label: "Closed", value: stats.closed, icon: CheckCircle, color: "hsl(var(--accent))", bg: "hsl(var(--accent) / 0.1)" },
              { label: "Pending", value: stats.pending, icon: Clock, color: "hsl(38 92% 50%)", bg: "hsl(38 92% 50% / 0.1)" },
              { label: "Live", value: stats.live, icon: AlertCircle, color: "hsl(217 91% 60%)", bg: "hsl(217 91% 60% / 0.1)" },
              { label: "Exceeded", value: stats.exceeded, icon: AlertTriangle, color: "hsl(var(--destructive))", bg: "hsl(var(--destructive) / 0.1)" },
              { label: "Complete", value: stats.step2Complete, icon: CheckCircle, color: "hsl(var(--accent))", bg: "hsl(var(--accent) / 0.1)" },
              { label: "Basic Only", value: stats.step2Pending, icon: Clock, color: "hsl(38 92% 50%)", bg: "hsl(38 92% 50% / 0.1)" },
              { label: "Total Value", value: formatCurrency(stats.totalValue), icon: DollarSign, color: "hsl(271 81% 56%)", bg: "hsl(271 81% 56% / 0.1)" },
            ].map((s, i) => (
              <div key={i} className="rounded-xl p-4 border border-border bg-card hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: s.bg }}>
                    <s.icon size={18} style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                    <p className="text-lg font-bold font-display text-foreground">{s.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-xl border border-border p-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-border bg-muted/50">
                <Search size={16} className="text-muted-foreground" />
                <input type="text" placeholder="Search by customer, call ID, engineer..." className="outline-none text-sm w-full bg-transparent text-foreground" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-border rounded-lg px-3 py-2 text-sm outline-none bg-white text-foreground hover:border-primary/30 transition-colors">
                <option value="All">All Status</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="border border-border rounded-lg px-3 py-2 text-sm outline-none bg-white text-foreground hover:border-primary/30 transition-colors">
                <option value="All">All Priority</option>
                {PRIORITY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={engineerFilter} onChange={e => setEngineerFilter(e.target.value)} className="border border-border rounded-lg px-3 py-2 text-sm outline-none bg-white text-foreground hover:border-primary/30 transition-colors">
                <option value="All">All Engineers</option>
                {ENGINEERS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
              <select value={paymentStatusFilter} onChange={e => setPaymentStatusFilter(e.target.value)} className="border border-border rounded-lg px-3 py-2 text-sm outline-none bg-white text-foreground hover:border-primary/30 transition-colors">
                <option value="All">All Payments</option>
                {PAYMENT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-muted-foreground font-bold uppercase text-xs border-b border-border">
                    <th className="px-4 py-3 text-left w-[100px]">ID</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-center w-[90px]">Status</th>
                    <th className="px-4 py-3 text-center w-[90px]">Type</th>
                    <th className="px-4 py-3 text-center w-[110px]">Completion</th>
                    <th className="px-4 py-3 text-center w-[80px]">Duration</th>
                    <th className="px-4 py-3 text-center w-[90px]">Total</th>
                    <th className="px-4 py-3 text-center w-[90px]">Pay</th>
                    <th className="px-4 py-3 text-center w-[100px]">Pay Status</th>
                    <th className="px-4 py-3 text-center w-[140px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="10" className="text-center py-12 text-muted-foreground">Loading...</td></tr>
                  ) : filteredCalls.length === 0 ? (
                    <tr><td colSpan="10" className="text-center py-12 text-muted-foreground">No call records found</td></tr>
                  ) : (
                    groupedCallsByMonth.map((group) => {
                      const isCollapsed = collapsedMonths[group.key];
                      const toggleCollapse = () => {
                        setCollapsedMonths(prev => ({
                          ...prev,
                          [group.key]: !prev[group.key]
                        }));
                      };
                      return (
                        <React.Fragment key={group.key}>
                          <tr 
                            onClick={toggleCollapse} 
                            className="bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer border-b border-border select-none"
                          >
                            <td colSpan="10" className="px-4 py-3 font-semibold text-sm">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {isCollapsed ? <ChevronDown size={16} className="text-primary" /> : <ChevronUp size={16} className="text-primary" />}
                                  <span className="text-primary font-bold text-base font-display">{group.label}</span>
                                  <span className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                                    {group.calls.length} {group.calls.length === 1 ? 'Call' : 'Calls'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-6 text-xs text-muted-foreground mr-4">
                                  <span className="font-medium">Total Expenses: <strong className="text-foreground">{formatCurrency(group.totalExpenses)}</strong></span>
                                  <span className="font-medium">Total Revenue: <strong className="text-accent text-sm font-bold">{formatCurrency(group.totalRevenue)}</strong></span>
                                </div>
                              </div>
                            </td>
                          </tr>
                          {!isCollapsed && group.calls.map((c) => {
                            const sc = STATUS_COLORS[c.status] || STATUS_COLORS.Pending;
                            const pc = PRIORITY_COLORS[c.priority] || PRIORITY_COLORS.Medium;
                            const psc = PAYMENT_STATUS_COLORS[c.payment_status] || PAYMENT_STATUS_COLORS.Pending;
                            const dur = c.actual_duration || 0;
                            const isComplete = c.step2_completed;
                            return (
                              <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onDoubleClick={() => {
                                setSelectedSessionId(c.session_id);
                                setSessionLogsModalOpen(true);
                              }}>
                                <td className="px-4 py-3 font-mono font-bold text-xs text-primary">
                                  <div className="text-primary font-black text-sm">Call #{c.call_sequence || 1}</div>
                                  <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">ID: {String(c.id).padStart(3, '0')}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-sm truncate text-foreground">{c.customer_name || c.client_name || "—"}</p>
                                  <p className="text-[10px] truncate text-muted-foreground">{c.location_city || c.location || ""}</p>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <select
                                    value={c.status || "Pending"}
                                    onChange={(e) => handleInlineUpdate(c.id, { status: e.target.value })}
                                    className="px-2 py-1 text-[11px] font-bold rounded-full border outline-none cursor-pointer shadow-sm transition-all focus:ring-1 focus:ring-primary"
                                    style={{
                                      background: sc.bg,
                                      color: sc.text,
                                      borderColor: sc.border,
                                    }}
                                  >
                                    {STATUS_OPTIONS.map(opt => (
                                      <option key={opt} value={opt} style={{ background: "#ffffff", color: "#1a1a1a" }}>{opt}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-3 text-xs text-center text-muted-foreground">{c.call_type || "—"}</td>
                                <td className="px-4 py-3 text-center">
                                  {isComplete ? (
                                    <div className="flex items-center justify-center gap-1.5">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800 border border-green-200">
                                        Complete
                                      </span>
                                      {canEditDelete && (
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openStep2Form(c);
                                          }} 
                                          className="p-1 rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-colors border border-accent/20 hover:scale-105 active:scale-95 flex items-center justify-center"
                                          title="Edit Details"
                                        >
                                          <Edit size={12} className="stroke-[2.5px]" />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1.5">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                        Basic
                                      </span>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openStep2Form(c);
                                        }} 
                                        className="p-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20 hover:scale-105 active:scale-95 flex items-center justify-center"
                                        title="Complete Details"
                                      >
                                        <Plus size={12} className="stroke-[3px]" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.is_exceeded ? "bg-red-100 text-red-700 border border-red-200" : "bg-accent/10 text-accent"}`}>
                                    {dur}m {c.is_exceeded ? `(+${c.actual_duration - (c.duration_limit || c.assigned_time || 30)}m Extra)` : ""}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs font-bold text-center text-foreground">{c.total_expenses !== null && c.total_expenses !== undefined ? formatCurrency(c.total_expenses) : "—"}</td>
                                <td className="px-4 py-3 text-xs font-bold text-center text-foreground">{c.invoice_value !== null && c.invoice_value !== undefined ? formatCurrency(c.invoice_value) : "—"}</td>
                                <td className="px-4 py-3 text-center">
                                  <select
                                    value={c.payment_status || "Pending"}
                                    onChange={(e) => handleInlineUpdate(c.id, { payment_status: e.target.value })}
                                    className="px-2 py-1 text-[11px] font-bold rounded-full border outline-none cursor-pointer shadow-sm transition-all focus:ring-1 focus:ring-primary"
                                    style={{
                                      background: psc.bg,
                                      color: psc.text,
                                      borderColor: psc.border,
                                    }}
                                  >
                                    {PAYMENT_STATUS_OPTIONS.map(opt => (
                                      <option key={opt} value={opt} style={{ background: "#ffffff", color: "#1a1a1a" }}>{opt}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-1 justify-center items-center">
                                    <button onClick={() => setDetailCall(c)} className="p-1 rounded hover:bg-primary/10 transition-colors" title="View Details"><Eye size={14} className="text-primary" /></button>
                                    <button onClick={() => openFollowUpCall(c)} className="p-1 rounded hover:bg-purple-100 transition-colors text-purple-600" title="Add follow-up call to this session"><Plus size={14} /></button>
                                    {(!isComplete || canEditDelete) && <button onClick={() => openStep2Form(c)} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary text-white hover:bg-primary/90 transition-colors" title={isComplete ? "Edit Details" : "Complete Details"}>{isComplete ? "Edit Details" : "Complete"}</button>}
                                    <button onClick={() => openEditModal(c)} className="p-1 rounded hover:bg-accent/10 transition-colors" title="Edit"><Edit size={14} className="text-accent" /></button>
                                    {canEditDelete && <button onClick={() => deleteCall(c.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors" title="Delete"><Trash2 size={14} className="text-destructive" /></button>}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === "engineers" && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-bold font-display text-foreground">Engineer Status</h2>
            <p className="text-xs text-muted-foreground">Real-time availability of all engineers</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-muted-foreground font-bold uppercase text-xs border-b border-border">
                  <th className="px-4 py-3 text-left">Engineer</th>
                  <th className="px-4 py-3 text-center w-[120px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {ENGINEERS.map((eng) => {
                  const { isBusy } = getEngineerStatus(eng.value);
                  return (
                    <tr key={eng.value} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">{eng.label}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{
                          background: isBusy ? "hsl(var(--destructive) / 0.1)" : "hsl(var(--accent) / 0.1)",
                          color: isBusy ? "hsl(var(--destructive))" : "hsl(var(--accent))",
                        }}>
                          {isBusy ? "On Call" : "Available"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "performance" && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">Filter by Engineer:</span>
              <select
                value={perfEngineerFilter}
                onChange={(e) => setPerfEngineerFilter(e.target.value)}
                className="border border-border rounded-lg px-3 py-1.5 text-sm outline-none bg-white text-foreground hover:border-primary/30 transition-colors"
              >
                <option value="All">All Engineers</option>
                {ENGINEERS.map(e => (
                  <option key={e.value} value={e.label}>{e.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={downloadPerformanceCSV}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 bg-primary text-white hover:bg-primary/95 transition-colors shadow"
            >
              <Download size={14} /> Download Excel Report
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Calls", value: filteredPerformanceData.reduce((s, p) => s + p.totalCalls, 0), icon: Phone, color: "hsl(var(--primary))", bg: "hsl(var(--primary) / 0.1)" },
              { label: "Total Revenue", value: formatCurrency(filteredPerformanceData.reduce((s, p) => s + p.totalRevenue, 0)), icon: DollarSign, color: "hsl(var(--accent))", bg: "hsl(var(--accent) / 0.1)" },
              { label: "Total KM", value: filteredPerformanceData.reduce((s, p) => s + parseFloat(p.totalKM), 0).toFixed(1), icon: MapPin, color: "hsl(38 92% 50%)", bg: "hsl(38 92% 50% / 0.1)" },
              { label: "Avg Calls/Hr", value: (filteredPerformanceData.reduce((s, p) => s + p.callsPerHour, 0) / (filteredPerformanceData.length || 1)).toFixed(2), icon: TrendingUp, color: "hsl(271 81% 56%)", bg: "hsl(271 81% 56% / 0.1)" },
            ].map((s, i) => (
              <div key={i} className="rounded-xl p-4 border border-border bg-card hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: s.bg }}>
                    <s.icon size={18} style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                    <p className="text-lg font-bold font-display text-foreground">{s.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={18} className="text-primary" />
                <h3 className="text-sm font-bold text-foreground">Calls per Engineer</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={filteredPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="totalCalls" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={18} className="text-accent" />
                <h3 className="text-sm font-bold text-foreground">Revenue per Engineer (₹)</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={filteredPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} contentStyle={tooltipStyle} />
                  <Bar dataKey="totalRevenue" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={18} className="text-purple-500" />
                <h3 className="text-sm font-bold text-foreground">Calls/Hour Performance Trend</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={filteredPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="callsPerHour" stroke="hsl(271 81% 56%)" fill="hsl(271 81% 56%)" fillOpacity={0.15} name="Calls/Hour" strokeWidth={2} />
                  <Line type="monotone" dataKey="callsPerHour" stroke="hsl(271 81% 56%)" strokeWidth={2} dot={{ r: 4 }} name="Calls/Hour" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={18} className="text-amber-600" />
                <h3 className="text-sm font-bold text-foreground">KM Driven per Engineer</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={filteredPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip formatter={(v) => `${v} km`} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="totalKM" stroke="hsl(38 92% 50%)" strokeWidth={3} dot={{ r: 5, fill: "hsl(38 92% 50%)" }} name="KM" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <PieChartIcon size={18} className="text-destructive" />
                <h3 className="text-sm font-bold text-foreground">Petrol Cost Distribution</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={filteredPerformanceData.filter(p => p.totalPetrol > 0)} dataKey="totalPetrol" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {filteredPerformanceData.filter(p => p.totalPetrol > 0).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={18} className="text-blue-600" />
                <h3 className="text-sm font-bold text-foreground">Time Spent (Hours)</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={filteredPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip formatter={(v) => `${v} hrs`} contentStyle={tooltipStyle} />
                  <Bar dataKey="totalHours" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-accent" />
                <h3 className="text-sm font-bold text-foreground">Engineer Efficiency Score</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={filteredPerformanceData.slice(0, 8)}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Radar name="Calls/Hour" dataKey="callsPerHour" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.3} strokeWidth={2} />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-bold font-display text-foreground">Detailed Performance Table</h2>
              <p className="text-xs text-muted-foreground">Sorted by Calls/Hour metric (best performance first)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-muted-foreground font-bold uppercase text-xs border-b border-border">
                    <th className="px-4 py-3 text-left">Engineer</th>
                    <th className="px-4 py-3 text-center w-[80px]">Calls</th>
                    <th className="px-4 py-3 text-center w-[80px]">Total KM</th>
                    <th className="px-4 py-3 text-center w-[100px]">Petrol (₹)</th>
                    <th className="px-4 py-3 text-center w-[80px]">Time (hrs)</th>
                    <th className="px-4 py-3 text-center w-[100px]">Revenue (₹)</th>
                    <th className="px-4 py-3 text-center w-[100px]">Calls/Hour</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPerformanceData.length === 0 ? (
                    <tr><td colSpan="7" className="text-center py-12 text-muted-foreground">No performance data available</td></tr>
                  ) : (
                    filteredPerformanceData.map((p, idx) => (
                      <tr key={p.name} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          <span className="inline-flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? "bg-yellow-400 text-yellow-900" : idx === 1 ? "bg-gray-300 text-gray-700" : idx === 2 ? "bg-orange-300 text-orange-900" : "bg-muted text-muted-foreground"}`}>
                              {idx + 1}
                            </span>
                            {p.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-primary">{p.totalCalls}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{p.totalKM}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{formatCurrency(p.totalPetrol)}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{p.totalHours}</td>
                        <td className="px-4 py-3 text-center font-bold text-accent">{formatCurrency(p.totalRevenue)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 rounded-full text-xs font-bold" style={{
                            background: p.callsPerHour >= 1 ? "hsl(var(--accent) / 0.1)" : p.callsPerHour >= 0.5 ? "hsl(38 92% 50% / 0.1)" : "hsl(var(--destructive) / 0.1)",
                            color: p.callsPerHour >= 1 ? "hsl(var(--accent))" : p.callsPerHour >= 0.5 ? "hsl(38 92% 50%)" : "hsl(var(--destructive))",
                          }}>
                            {p.callsPerHour}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {detailCall && <DetailModal call={detailCall} onClose={() => setDetailCall(null)} formatCurrency={formatCurrency} />}

      {sessionLogsModalOpen && (
        <SessionLogsModal
          sessionId={selectedSessionId}
          callsList={calls}
          onClose={() => {
            setSessionLogsModalOpen(false);
            setSelectedSessionId(null);
          }}
          formatCurrency={formatCurrency}
          canEdit={canEditDelete}
          onEditCall={(call) => {
            setSessionLogsModalOpen(false);
            setSelectedSessionId(null);
            openStep2Form(call);
          }}
        />
      )}

      {/* Step 1 - Basic Call Form */}
      {modalOpen && !isEdit && (
        <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto pt-4 pb-4 animate-fade-in" style={{ backgroundColor: "rgba(0, 0, 0, 0.3)", backdropFilter: "blur(4px)" }} onClick={() => { setModalOpen(false); }}>
          <div className="w-[95%] max-w-3xl my-4 relative animate-scale-in" style={{ backgroundColor: "var(--color-canvas, #ffffff)", borderRadius: "var(--radius-xl, 16px)", boxShadow: "var(--shadow-level-4, 0 16px 48px -8px rgba(15,15,15,0.16))", border: "1px solid var(--color-hairline, #e5e3df)" }} onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 px-5 sm:px-6 py-4 flex justify-between items-center z-20" style={{ backgroundColor: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(8px)", borderBottom: "1px solid var(--color-hairline, #e5e3df)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center" style={{ borderRadius: "var(--radius-md, 8px)", backgroundColor: "rgba(86, 69, 212, 0.1)" }}>
                  <Plus size={18} style={{ color: "var(--color-primary, #5645d4)" }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display, Inter), sans-serif", color: "var(--color-ink, #1a1a1a)" }}>
                    New Service Call (Call #{basicForm.call_sequence || 1})
                  </h2>
                  <p className="text-xs" style={{ color: "var(--color-steel, #787671)" }}>Step 1: All fields required</p>
                </div>
              </div>
              <X className="cursor-pointer transition-colors" style={{ color: "var(--color-steel, #787671)", borderRadius: "var(--radius-sm, 6px)", padding: "4px" }} onClick={() => { setModalOpen(false); }} onMouseEnter={e => { e.target.style.backgroundColor = "var(--color-surface, #f6f5f4)"; e.target.style.color = "var(--color-ink, #1a1a1a)"; }} onMouseLeave={e => { e.target.style.backgroundColor = "transparent"; e.target.style.color = "var(--color-steel, #787671)"; }} />
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "calc(90vh - 80px)" }}>
            <form onSubmit={handleBasicSubmit} className="p-5 sm:p-6" style={{ fontFamily: "var(--font-family, Inter), sans-serif" }}>
              <div className="space-y-5">
                <SectionDivider icon={User} title="Customer Details" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="sm:col-span-2">
                     <FormField label="Customer Name" required>
                       <div className="relative">
                         <input 
                           type="text" 
                           value={basicForm.customer || ""} 
                           onChange={(e) => {
                             setBasicForm({ ...basicForm, customer: e.target.value, customer_id: "", contract_title: "" });
                             setSelectedBasicContract(null);
                             if (e.target.value.length >= 2) {
                               searchCustomers(e.target.value);
                             } else if (e.target.value.length === 0) {
                               setCustomerSearchResults([]);
                             }
                           }}
                           onKeyPress={(e) => {
                             if (e.key === 'Enter' && customerSearchResults.length > 0) {
                               // Select first result on Enter
                               const firstCustomer = customerSearchResults[0];
                               setBasicForm({ 
                                 ...basicForm, 
                                 customer: firstCustomer.value,
                                 customer_id: firstCustomer.customer_id || "",
                                 contract_title: "",
                                 mobile_number: firstCustomer.mobile_number || "",
                                 email: firstCustomer.email || "",
                                 location_city: firstCustomer.location_city || "",
                                 gst_number: firstCustomer.gst_number || "",
                                 company_name: firstCustomer.company_name || ""
                               });
                               setCustomerSearchResults([]);
                             }
                           }}
                           onFocus={() => {
                             // When clicked/focused, show all customers (search with empty string)
                             if (basicForm.customer.length === 0) {
                               searchCustomers("");
                             }
                           }}
                           placeholder="Search customer (type and press Enter)..."
                           className={inputBase}
                           style={{ backgroundColor: "var(--color-canvas, #ffffff)", color: "var(--color-ink, #1a1a1a)", border: "1px solid var(--color-hairline-strong, #c8c4be)", borderRadius: "var(--radius-md, 8px)" }}
                         />
                         {customerSearchResults.length > 0 && (
                           <div className="absolute z-50 w-full mt-1 overflow-hidden border border-hairline rounded-md bg-white shadow-lg mt-1">
                             {customerSearchResults.map((customer, idx) => (
                               <div 
                                 key={idx} 
                                 className="px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-muted/50"
                                 onClick={() => {
                                   setBasicForm({ 
                                     ...basicForm, 
                                     customer: customer.value,
                                     customer_id: customer.customer_id || "",
                                     contract_title: "",
                                     mobile_number: customer.mobile_number || "",
                                     email: customer.email || "",
                                     location_city: customer.location_city || "",
                                     gst_number: customer.gst_number || "",
                                     company_name: customer.company_name || ""
                                   });
                                   setCustomerSearchResults([]);
                                 }}
                               >
                                 {customer.label}
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                     </FormField>
                   </div>
                  <FormField label="Mobile Number" icon={PhoneIcon} required>
                    <input type="tel" value={basicForm.mobile_number} onChange={e => setBasicForm({ ...basicForm, mobile_number: e.target.value })} className={inputBase} placeholder="Auto-filled or manual" required style={{ backgroundColor: "var(--color-canvas, #ffffff)", color: "var(--color-ink, #1a1a1a)", border: "1px solid var(--color-hairline-strong, #c8c4be)", borderRadius: "var(--radius-md, 8px)" }} />
                  </FormField>
                  <FormField label="Email" icon={Mail} required>
                    <input type="email" value={basicForm.email} onChange={e => setBasicForm({ ...basicForm, email: e.target.value })} className={inputBase} placeholder="Auto-filled or manual" required style={{ backgroundColor: "var(--color-canvas, #ffffff)", color: "var(--color-ink, #1a1a1a)", border: "1px solid var(--color-hairline-strong, #c8c4be)", borderRadius: "var(--radius-md, 8px)" }} />
                  </FormField>
                  <FormField label="Location/City" icon={MapPin} required>
                    <input type="text" value={basicForm.location_city} onChange={e => setBasicForm({ ...basicForm, location_city: e.target.value })} className={inputBase} placeholder="Auto-filled or manual" required style={{ backgroundColor: "var(--color-canvas, #ffffff)", color: "var(--color-ink, #1a1a1a)", border: "1px solid var(--color-hairline-strong, #c8c4be)", borderRadius: "var(--radius-md, 8px)" }} />
                  </FormField>
                  <FormField label="Company Name" icon={FileText}>
                    <input type="text" value={basicForm.company_name} onChange={e => setBasicForm({ ...basicForm, company_name: e.target.value })} className={inputBase} placeholder="Auto-filled or manual" style={{ backgroundColor: "var(--color-canvas, #ffffff)", color: "var(--color-ink, #1a1a1a)", border: "1px solid var(--color-hairline-strong, #c8c4be)", borderRadius: "var(--radius-md, 8px)" }} />
                  </FormField>
                  <FormField label="GST Number" icon={FileText}>
                    <input type="text" value={basicForm.gst_number} onChange={e => setBasicForm({ ...basicForm, gst_number: e.target.value })} className={inputBase} placeholder="Auto-filled or manual" style={{ backgroundColor: "var(--color-canvas, #ffffff)", color: "var(--color-ink, #1a1a1a)", border: "1px solid var(--color-hairline-strong, #c8c4be)", borderRadius: "var(--radius-md, 8px)" }} />
                  </FormField>
                </div>

                <SectionDivider icon={Tag} title="Call Information" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Call Type" required>
                    <SearchableSelect options={CALL_TYPE_OPTIONS} value={basicForm.call_type} onChange={handleBasicCallTypeChange} placeholder="Select Call Type" />
                  </FormField>
                  <FormField label="Call Duration" required icon={Clock}>
                    <select value={basicForm.duration} onChange={e => setBasicForm({ ...basicForm, duration: e.target.value })} className={inputBase} required style={{ backgroundColor: "var(--color-canvas, #ffffff)", color: "var(--color-ink, #1a1a1a)", border: "1px solid var(--color-hairline-strong, #c8c4be)", borderRadius: "var(--radius-md, 8px)" }}>
                      <option value="">Select duration</option>
                      <option value="1hr">1 Hour</option>
                      <option value="1.5hr">1.5 Hours</option>
                      <option value="2hr">2 Hours</option>
                    </select>
                  </FormField>
       {(basicForm.call_type === "AMC" || basicForm.call_type === "ALC") && (
         <>
            <FormField label={`${basicForm.call_type} Contract`} icon={FileText}>
              <div className="relative">
                <input 
                  type="text" 
                  value={selectedBasicContract?.label || ""} 
                  onChange={(e) => {
                    setBasicForm({ ...basicForm, call_type: basicForm.call_type });
                    setSelectedBasicContract(null);
                    if (e.target.value.length >= 2) {
                      searchContracts(basicForm.call_type, e.target.value, "basic");
                    } else if (e.target.value.length === 0) {
                      setBasicContractSearchResults([]);
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && basicContractSearchResults.length > 0) {
                      // Select first result on Enter
                      const firstContract = basicContractSearchResults[0];
                      handleBasicContractSelect(firstContract.value);
                    }
                  }}
                  onFocus={() => {
                    // When clicked/focused, show all contracts (search with empty string)
                    if (selectedBasicContract?.label?.length === 0) {
                      searchContracts(basicForm.call_type, "", "basic");
                    }
                  }}
                  placeholder={`Search ${basicForm.call_type} contract (type and press Enter)...`}
                  className={inputBase}
                  style={{ backgroundColor: "var(--color-canvas, #ffffff)", color: "var(--color-ink, #1a1a1a)", border: "1px solid var(--color-hairline-strong, #c8c4be)", borderRadius: "var(--radius-md, 8px)" }}
                />
                {basicContractSearchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 overflow-hidden border border-hairline rounded-md bg-white shadow-lg mt-1">
                    {basicContractSearchResults.map((contract, idx) => (
                      <div 
                        key={idx} 
                        className="px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => {
                          handleBasicContractSelect(contract.value);
                        }}
                      >
                        {contract.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FormField>
         </>
       )}
                  <FormField label="Priority" required icon={AlertTriangle}>
                    <SearchableSelect options={PRIORITY_OPTIONS} value={basicForm.priority} onChange={v => setBasicForm({ ...basicForm, priority: v })} placeholder="Select Priority" />
                  </FormField>
                  <FormField label="Call Referrer" required icon={Phone}>
                    <SearchableSelect options={CALL_REFERRERS} value={basicForm.call_referrer} onChange={v => setBasicForm({ ...basicForm, call_referrer: v })} placeholder="Select Referrer" />
                  </FormField>
                  <div className="sm:col-span-2">
                    <FormField label="Call Details" icon={MessageSquare} required>
                      <textarea value={basicForm.call_details} onChange={e => setBasicForm({ ...basicForm, call_details: e.target.value })} className={`${inputBase} resize-none`} placeholder="Describe the issue or service performed" rows={3} required style={{ backgroundColor: "var(--color-canvas, #ffffff)", color: "var(--color-ink, #1a1a1a)", border: "1px solid var(--color-hairline-strong, #c8c4be)", borderRadius: "var(--radius-md, 8px)" }} />
                    </FormField>
                  </div>
                </div>

                <SectionDivider icon={CheckCircle} title="Status & Billing" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Status" required icon={CheckCircle}>
                    <SearchableSelect options={STATUS_OPTIONS} value={basicForm.status} onChange={v => setBasicForm({ ...basicForm, status: v })} placeholder="Select Status" />
                  </FormField>
                  <FormField label="Payment Type" icon={CreditCard} required>
                    <SearchableSelect options={PAYMENT_TYPE_OPTIONS} value={basicForm.payment_type} onChange={v => setBasicForm({ ...basicForm, payment_type: v })} placeholder="Select Payment Type" />
                  </FormField>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4" style={{ borderTop: "1px solid var(--color-hairline, #e5e3df)" }}>
                  <button type="submit" className="flex-1 text-sm font-medium" style={{ padding: "10px 18px", borderRadius: "var(--radius-md, 8px)", backgroundColor: "var(--color-primary, #5645d4)", color: "var(--color-on-primary, #ffffff)", transition: "background-color 0.15s ease" }} onMouseEnter={e => { e.target.style.backgroundColor = "var(--color-primary-pressed, #4534b3)"; }} onMouseLeave={e => { e.target.style.backgroundColor = "var(--color-primary, #5645d4)"; }}>Save Call</button>
                  <button type="button" onClick={() => { setModalOpen(false); }} className="text-sm font-medium" style={{ padding: "10px 18px", borderRadius: "var(--radius-md, 8px)", backgroundColor: "transparent", color: "var(--color-ink, #1a1a1a)", border: "1px solid var(--color-hairline-strong, #c8c4be)", transition: "all 0.15s ease" }} onMouseEnter={e => { e.target.style.backgroundColor = "var(--color-surface, #f6f5f4)"; e.target.style.borderColor = "var(--color-slate, #5d5b54)"; }} onMouseLeave={e => { e.target.style.backgroundColor = "transparent"; e.target.style.borderColor = "var(--color-hairline-strong, #c8c4be)"; }}>Cancel</button>
                </div>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (original full form) */}
      {modalOpen && isEdit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center overflow-y-auto pt-4 pb-4 animate-fade-in" onClick={() => { setModalOpen(false); resetForm(); }}>
          <div className="bg-white rounded-2xl w-[95%] max-w-4xl shadow-2xl my-4 relative border border-border animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-border px-4 sm:px-6 py-4 flex justify-between items-center z-20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-accent/10">
                  <Edit size={18} className="text-accent" />
                </div>
                <h2 className="text-base sm:text-lg font-bold font-display text-foreground">Edit Call Record</h2>
              </div>
              <X className="cursor-pointer hover:text-destructive transition-colors text-muted-foreground p-1 rounded hover:bg-destructive/10" onClick={() => { setModalOpen(false); resetForm(); }} />
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
              <SectionDivider icon={User} title="Customer Details" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2 lg:col-span-3">
                  <FormField label="Customer Name" required>
                    <SearchableSelect options={customerSearchResults} value={form.customer} onChange={handleCustomerSelect} placeholder="Search customer..." onSearch={(q) => searchCustomers(q)} loading={customerLoading} />
                  </FormField>
                </div>
                <FormField label="Mobile Number" icon={PhoneIcon} required>
                  <input type="tel" value={form.mobile_number} onChange={e => setForm({ ...form, mobile_number: e.target.value })} className={inputBase} placeholder="Auto-filled or manual" required />
                </FormField>
                <FormField label="Email" icon={Mail} required>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputBase} placeholder="Auto-filled or manual" required />
                </FormField>
                <FormField label="Location/City" icon={MapPin} required>
                  <input type="text" value={form.location_city} onChange={e => setForm({ ...form, location_city: e.target.value })} className={inputBase} placeholder="Auto-filled or manual" required />
                </FormField>
                <FormField label="Company Name" icon={FileText}>
                  <input type="text" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} className={inputBase} placeholder="Auto-filled or manual" />
                </FormField>
                <FormField label="GST Number" icon={FileText}>
                  <input type="text" value={form.gst_number} onChange={e => setForm({ ...form, gst_number: e.target.value })} className={inputBase} placeholder="Auto-filled or manual" />
                </FormField>
                <FormField label="Call Type" icon={Tag} required>
                  <SearchableSelect options={CALL_TYPE_OPTIONS} value={form.call_type} onChange={handleCallTypeChange} placeholder="Select Call Type" />
                </FormField>
              </div>
              {(form.call_type === "AMC" || form.call_type === "ALC") && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <FormField label={`${form.call_type} Contract (Auto-fill)`} icon={FileText}>
                    <SearchableSelect options={contractSearchResults} value={selectedContract?.value || ""} onChange={handleContractSelect} placeholder={`Select ${form.call_type} contract...`} loading={contractLoading} />
                  </FormField>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2 lg:col-span-3">
                  <FormField label="Call Details" icon={MessageSquare} required>
                    <textarea value={form.call_details} onChange={e => setForm({ ...form, call_details: e.target.value })} className={`${inputBase} resize-none`} placeholder="Describe the issue or service performed" rows={2} required />
                  </FormField>
                </div>
                <FormField label="Priority" icon={AlertTriangle} required>
                  <SearchableSelect options={PRIORITY_OPTIONS} value={form.priority} onChange={v => setForm({ ...form, priority: v })} placeholder="Select Priority" />
                </FormField>
                <FormField label="Engineer" icon={User}>
                  <SearchableSelect options={ENGINEERS} value={form.engineer} onChange={v => setForm({ ...form, engineer: v })} placeholder="Select Engineer" />
                </FormField>
                <FormField label="Call Referrer" icon={Phone} required>
                  <SearchableSelect options={CALL_REFERRERS} value={form.call_referrer} onChange={v => setForm({ ...form, call_referrer: v })} placeholder="Select Referrer" />
                </FormField>
                <FormField label="Status" required icon={CheckCircle}>
                  <SearchableSelect options={STATUS_OPTIONS} value={form.status} onChange={v => setForm({ ...form, status: v })} placeholder="Select Status" />
                </FormField>
              </div>

              <SectionDivider icon={Clock} title="Time & Duration" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField label="Start Time">
                  <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className={inputBase} />
                </FormField>
                <FormField label="End Time">
                  <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className={inputBase} />
                </FormField>
                {duration.actual > 0 && (
                  <div className={`p-3 rounded-lg border flex flex-col justify-center ${duration.exceeded ? "bg-destructive/5 border-destructive/20" : "bg-accent/5 border-accent/20"}`}>
                    <span className={`text-xs font-semibold ${duration.exceeded ? "text-destructive" : "text-accent"}`}>Duration: {duration.actual} min</span>
                    <span className="text-[10px] text-muted-foreground">Limit: {duration.limit} min</span>
                    {duration.exceeded && (
                      <span className="text-[10px] font-bold text-destructive flex items-center gap-1 mt-1">
                        <AlertTriangle size={10} /> Overflow: +{duration.overflow} min
                      </span>
                    )}
                  </div>
                )}
              </div>

              <SectionDivider icon={DollarSign} title="Expenses & Payment" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField label="Kilometers (KM)" icon={MapPin}>
                  <input type="number" value={form.km} onChange={e => setForm({ ...form, km: e.target.value })} className={inputBase} placeholder="0" min="0" step="0.1" />
                </FormField>
                <FormField label="Petrol Charges (₹)">
                  <input type="number" value={form.petrol_charges} onChange={e => setForm({ ...form, petrol_charges: e.target.value })} className={inputBase} placeholder="0.00" min="0" step="0.01" />
                </FormField>
                <FormField label="Spare Parts (₹)">
                  <input type="number" value={form.spare_parts_price} onChange={e => setForm({ ...form, spare_parts_price: e.target.value })} className={inputBase} placeholder="0.00" min="0" step="0.01" />
                </FormField>
                <FormField label="Labour Charges (₹)">
                  <input type="number" value={form.labour_charges} onChange={e => setForm({ ...form, labour_charges: e.target.value })} className={inputBase} placeholder="0.00" min="0" step="0.01" />
                </FormField>
                <FormField label="Payment Type" icon={CreditCard} required>
                  <SearchableSelect options={PAYMENT_TYPE_OPTIONS} value={form.payment_type} onChange={v => setForm({ ...form, payment_type: v })} placeholder="Select Payment Type" />
                </FormField>
                <FormField label="Invoice Value (₹)" icon={DollarSign} required>
                  <input type="number" value={form.invoice_value} onChange={e => setForm({ ...form, invoice_value: e.target.value })} className={inputBase} placeholder="0.00" min="0" step="0.01" required />
                </FormField>
                <FormField label="Payment Status" icon={CheckCircle} required>
                  <SearchableSelect options={PAYMENT_STATUS_OPTIONS} value={form.payment_status} onChange={v => setForm({ ...form, payment_status: v })} placeholder="Select Payment Status" />
                </FormField>
              </div>

              <FormField label="Remarks" icon={MessageSquare}>
                <textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} className={`${inputBase} resize-none`} placeholder="Additional notes" rows={2} />
              </FormField>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                <button type="submit" className="flex-1 py-3 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all hover:opacity-90 active:scale-[0.98] shadow-md">Update Call</button>
                <button type="button" onClick={() => { setModalOpen(false); resetForm(); }} className="px-6 py-3 border border-border rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition-all active:scale-[0.98]">Cancel</button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 - Detail Form (double-click or Complete button) */}
      {step2ModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center overflow-y-auto pt-4 pb-4 animate-fade-in" onClick={() => { setStep2ModalOpen(false); }}>
          <div className="bg-white rounded-2xl w-[95%] max-w-3xl shadow-2xl my-4 relative border border-border animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-border px-4 sm:px-6 py-4 flex justify-between items-center z-20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-500/10">
                  <Clock size={18} className="text-amber-500" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold font-display text-foreground">
                    Call #{calls.find(c => c.id === step2CallId)?.call_sequence || 1} ID: {String(step2CallId).padStart(3, '0')}
                  </h2>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Step 2: Engineer assignment & expenses</p>
                </div>
              </div>
              <X className="cursor-pointer hover:text-destructive transition-colors text-muted-foreground p-1 rounded hover:bg-destructive/10" onClick={() => { setStep2ModalOpen(false); }} />
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            <form onSubmit={handleStep2Submit} className="p-4 sm:p-6 space-y-5">
              <div className="p-3 sm:p-4 rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Customer</p>
                    <p className="font-semibold text-xs sm:text-sm truncate text-foreground">{calls.find(c => c.id === step2CallId)?.customer_name || calls.find(c => c.id === step2CallId)?.client_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Call Type</p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">{calls.find(c => c.id === step2CallId)?.call_type || "—"}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Priority</p>
                    <p className="font-semibold text-xs sm:text-sm text-foreground">{calls.find(c => c.id === step2CallId)?.priority || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Invoice</p>
                    <p className="font-semibold text-xs sm:text-sm text-accent">{formatCurrency(calls.find(c => c.id === step2CallId)?.invoice_value)}</p>
                  </div>
                </div>
                {(calls.find(c => c.id === step2CallId)?.call_details || calls.find(c => c.id === step2CallId)?.complaint || calls.find(c => c.id === step2CallId)?.description) && (
                  <div className="mt-3 pt-3 border-t border-primary/20">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Call Details</p>
                    <p className="text-xs sm:text-sm mt-1 text-muted-foreground">{calls.find(c => c.id === step2CallId)?.call_details || calls.find(c => c.id === step2CallId)?.complaint || calls.find(c => c.id === step2CallId)?.description}</p>
                  </div>
                )}
              </div>

              <SectionDivider icon={Users} title="Engineer Assignment" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FormField label="Engineer" required icon={User}>
                    <select value={step2Form.engineer} onChange={e => setStep2Form({ ...step2Form, engineer: e.target.value })} className={inputBase} required>
                      <option value="">Select engineer</option>
                      {ENGINEERS.map(e => {
                        const isBusy = busyEngineers.includes(e.value);
                        return (
                          <option key={e.value} value={e.value} disabled={isBusy}>
                            {e.label} {isBusy ? "(On Call)" : "(Free)"}
                          </option>
                        );
                      })}
                    </select>
                  </FormField>
                  {freeEngineers.length > 0 && (
                    <p className="text-[10px] mt-1 flex items-center gap-1 text-accent">
                      <CheckCircle size={10} /> {freeEngineers.length} engineer(s) available
                    </p>
                  )}
                  {busyEngineers.length > 0 && (
                    <p className="text-[10px] mt-1 flex items-center gap-1 text-destructive">
                      <AlertCircle size={10} /> {busyEngineers.length} engineer(s) currently on call
                    </p>
                  )}
                </div>
                <FormField label="Status" icon={CheckCircle}>
                  <SearchableSelect options={STATUS_OPTIONS} value={step2Form.status} onChange={v => setStep2Form({ ...step2Form, status: v })} placeholder="Select Status" />
                </FormField>
              </div>

              <SectionDivider icon={Clock} title="Time & Travel" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField label="Start Time">
                  <input type="time" value={step2Form.start_time} onChange={e => setStep2Form({ ...step2Form, start_time: e.target.value })} className={inputBase} />
                </FormField>
                <FormField label="End Time">
                  <input type="time" value={step2Form.end_time} onChange={e => setStep2Form({ ...step2Form, end_time: e.target.value })} className={inputBase} />
                </FormField>
                <FormField label="Kilometers (KM)" icon={MapPin}>
                  <input type="number" value={step2Form.km} onChange={e => setStep2Form({ ...step2Form, km: e.target.value })} className={inputBase} placeholder="0" min="0" step="0.1" />
                </FormField>
                {step2Duration.actual > 0 && (
                  <div className={`p-3 rounded-lg border flex flex-col justify-center sm:col-span-2 lg:col-span-3 ${step2Duration.exceeded ? "bg-red-50 border-red-200 text-red-700" : "bg-accent/5 border-accent/20"}`}>
                    <span className={`text-xs font-semibold ${step2Duration.exceeded ? "text-red-600" : "text-accent"}`}>Actual Duration: {step2Duration.actual} min</span>
                    <span className="text-[10px] text-muted-foreground">Assigned Limit: {step2Duration.limit} min</span>
                    {step2Duration.exceeded && (
                      <span className="text-[10px] font-bold text-red-600 flex items-center gap-1 mt-1">
                        <AlertTriangle size={10} /> Overflow: Exceeded by {step2Duration.overflow} min!
                      </span>
                    )}
                  </div>
                )}
              </div>

              <SectionDivider icon={DollarSign} title="Expenses & Billing" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField label="Petrol (₹)">
                  <input type="number" value={step2Form.petrol_charges} onChange={e => setStep2Form({ ...step2Form, petrol_charges: e.target.value })} className={inputBase} placeholder="0.00" min="0" step="0.01" />
                </FormField>
                <FormField label="Spare Parts (₹)">
                  <input type="number" value={step2Form.spare_parts_price} onChange={e => setStep2Form({ ...step2Form, spare_parts_price: e.target.value })} className={inputBase} placeholder="0.00" min="0" step="0.01" />
                </FormField>
                <FormField label="Labour Charges (₹)">
                  <input type="number" value={step2Form.labour_charges} onChange={e => setStep2Form({ ...step2Form, labour_charges: e.target.value })} className={inputBase} placeholder="0.00" min="0" step="0.01" />
                </FormField>
                <FormField label="Invoice Value (₹)" icon={DollarSign}>
                  <input type="number" value={step2Form.invoice_value} onChange={e => setStep2Form({ ...step2Form, invoice_value: e.target.value })} className={inputBase} placeholder="0.00" min="0" step="0.01" />
                </FormField>
              </div>

              <FormField 
                label={step2Duration.exceeded ? "Why was the time exceeded? (Remarks Required)*" : "Remarks"} 
                icon={MessageSquare}
                required={step2Duration.exceeded}
              >
                <textarea 
                  value={step2Form.remarks} 
                  onChange={e => setStep2Form({ ...step2Form, remarks: e.target.value })} 
                  className={`${inputBase} resize-none ${step2Duration.exceeded ? "border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50/10" : ""}`} 
                  placeholder={step2Duration.exceeded ? "Please explain why the service time exceeded the limit..." : "Additional notes"} 
                  rows={2} 
                  required={step2Duration.exceeded}
                />
              </FormField>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                <button type="submit" className="flex-1 py-3 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all hover:opacity-90 active:scale-[0.98] shadow-md">Save Details</button>
                <button type="button" onClick={() => { setStep2ModalOpen(false); }} className="px-6 py-3 border border-border rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition-all active:scale-[0.98]">Cancel</button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallReport;
