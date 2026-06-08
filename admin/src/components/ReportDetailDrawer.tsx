import { useState, useEffect } from "react";
import { STATUS_ORDER, CATEGORY_COLORS } from "../lib/supabase";
import type { Report } from "../lib/supabase";
import Select from "./Select";
import { XIcon, LockIcon, CheckIcon } from "./icons";

export default function ReportDetailDrawer({
  report,
  onClose,
  onStatusChange,
}: {
  report: Report;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [localStatus, setLocalStatus] = useState(report.status);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const isDirty = localStatus !== report.status;

  useEffect(() => {
    setLocalStatus(report.status);
  }, [report.status]);

  const handleUpdate = async () => {
    if (!isDirty) return;
    setIsSaving(true);
    try {
      await Promise.resolve(onStatusChange(report.id, localStatus));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)",
      zIndex: 100, animation: "fadeIn 0.2s ease-out",
    }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute", top: 0, right: 0, height: "100%", width: "min(560px, 100%)",
          background: "#ffffff", boxShadow: "-8px 0 30px rgba(0,0,0,0.1)", overflowY: "hidden",
          animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex", flexDirection: "column", fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
        }}
      >
        {/* 1. Header Area */}
        <div style={{
          padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid #F3F4F6", flexShrink: 0, backgroundColor: "#ffffff"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {report.is_sos && <span style={sosBadge}>SOS</span>}
            <strong style={{ fontSize: 18, textTransform: "capitalize", color: "#111827", fontWeight: 800, letterSpacing: "-0.01em" }}>
              {report.sub_type.replace("_", " ")}
            </strong>
            <span style={{ 
              backgroundColor: CATEGORY_COLORS[report.category] + "1A", 
              color: CATEGORY_COLORS[report.category], 
              padding: "4px 10px", borderRadius: "6px", 
              fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em"
            }}>
              {report.category}
            </span>
          </div>
          <button onClick={onClose} aria-label="Close" style={closeBtn}><XIcon size={18} /></button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* 2. Image Area (Fixed Height, Cover, No Shrink) */}
          {report.photo_url ? (
            <div style={{ width: "100%", height: "240px", flexShrink: 0, borderRadius: "12px", overflow: "hidden", backgroundColor: "#F3F4F6", border: "1px solid #E5E7EB", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
              <img src={report.photo_url} alt="Report evidence" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
          ) : (
            <div style={{ flexShrink: 0, padding: 32, textAlign: "center", color: "#9CA3AF", fontSize: 14, backgroundColor: "#F9FAFB", borderRadius: "12px", border: "2px dashed #E5E7EB" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📷</div>
              No photo evidence provided
            </div>
          )}

          {/* 3. Reporter Information Section */}
          <div style={{ backgroundColor: "#F9FAFB", borderRadius: "12px", padding: "20px", border: "1px solid #E5E7EB" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "12px", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
              Reporter Details
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <DetailItem label="Full Name" value={report.user_name || "Not provided"} />
              <DetailItem label="Phone Number" value={report.user_phone || "Not provided"} />
              <div style={{ display: "flex", flexDirection: "column", gridColumn: "1 / -1" }}>
                <span style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px", fontWeight: 600 }}>NIC Number</span>
                <span style={{ fontSize: "14px", color: "#111827", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                  {report.user_nic || "Not provided"} 
                  {report.user_nic && <span style={{ color: "#9CA3AF", display: "flex" }}><LockIcon size={14} /></span>}
                </span>
              </div>
            </div>
          </div>

          {/* Incident Location Section */}
          <div style={{ backgroundColor: "#F9FAFB", borderRadius: "12px", padding: "20px", border: "1px solid #E5E7EB" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "12px", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                Incident Location
              </h3>
              <span style={{ backgroundColor: "#F3F4F6", color: "#4B5563", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 800 }}>
                {report.area || "Unknown Area"}
              </span>
            </div>
            
            <p style={{ margin: "0 0 16px 0", fontSize: "15px", color: "#111827", fontWeight: 600, lineHeight: 1.5 }}>
              {report.address || "No detailed address provided."}
            </p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "#9CA3AF", fontFamily: "monospace", fontWeight: 500 }}>
                {report.lat ? `${report.lat.toFixed(5)}, ${report.lng?.toFixed(5)}` : "Coordinates unavailable"}
              </span>
              {(report.lat && report.lng) ? (
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${report.lat},${report.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    backgroundColor: "#ffffff", color: "#374151", textDecoration: "none", 
                    padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                    display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid #D1D5DB",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F9FAFB")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>
                  Open in Maps
                </a>
              ) : null}
            </div>
          </div>

          {/* 4. Description & Metadata */}
          <div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#111827", fontWeight: 700, letterSpacing: "-0.01em" }}>Description</h3>
            <p style={{ margin: 0, fontSize: "14px", color: "#4B5563", lineHeight: 1.6 }}>{report.description || "No description provided."}</p>
          </div>

          <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "stretch" }}>
            <div style={{ padding: "14px", backgroundColor: "#F9FAFB", borderRadius: "10px", border: "1px solid #F3F4F6", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <span style={{ display: "block", fontSize: "12px", color: "#6B7280", marginBottom: "4px", fontWeight: 600 }}>Submitted</span>
              <span style={{ fontSize: "13px", color: "#111827", fontWeight: 600 }}>
                {new Date(report.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
            
            {report.status !== "resolved" ? (
              <div style={{ padding: "14px", backgroundColor: "#F9FAFB", borderRadius: "10px", border: "1px solid #F3F4F6", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <span style={{ display: "block", fontSize: "12px", color: "#6B7280", marginBottom: "4px", fontWeight: 600 }}>Status Workflow</span>
                <Select
                  ariaLabel="Change status"
                  minWidth={180}
                  value={localStatus}
                  onChange={(v) => setLocalStatus(v)}
                  options={STATUS_ORDER.map((s) => ({ value: s, label: cap(s) }))}
                />
              </div>
            ) : (
              <div style={{ padding: "14px", backgroundColor: "#dcfce7", borderRadius: "10px", border: "1px solid #bbf7d0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <span style={{ display: "block", fontSize: "12px", color: "#166534", marginBottom: "4px", fontWeight: 700 }}>Status Workflow</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#15803d", fontSize: 13, fontWeight: 800 }}>
                  <LockIcon size={14} /> Permanently Resolved
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 5. Action Bar */}
        <div style={{ borderTop: "1px solid #E5E7EB", padding: "16px 24px", display: "flex", gap: "12px", backgroundColor: "#ffffff", flexShrink: 0 }}>
          {report.user_phone ? (
            <a href={`tel:${report.user_phone}`} style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#F3F4F6", color: "#111827", padding: "10px 16px", borderRadius: "8px", textDecoration: "none", fontWeight: 600, fontSize: "14px", transition: "background 0.2s" }}>
              Call Reporter
            </a>
          ) : (
            <div style={{ flex: 1 }} />
          )}
          <button 
            onClick={handleUpdate} 
            disabled={!isDirty || isSaving}
            style={{ 
              flex: 2, 
              backgroundColor: isDirty ? "#047857" : "#F3F4F6", 
              color: isDirty ? "#ffffff" : "#9CA3AF", 
              padding: "10px 16px", borderRadius: "8px", border: "none", 
              fontWeight: 600, fontSize: "14px", 
              cursor: isDirty && !isSaving ? "pointer" : "not-allowed", 
              display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", 
              boxShadow: isDirty && !isSaving ? "0 2px 8px rgba(4, 120, 87, 0.2)" : "none", 
              transition: "all 0.2s" 
            }}
          >
            {isSaving ? "Saving..." : showSuccess ? <><CheckIcon size={16} /> Saved</> : isDirty ? "Save Changes" : "Update Status"}
          </button>
        </div>

      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: "14px", color: "#111827", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

const cap = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const sosBadge: React.CSSProperties = { background: "var(--danger)", color: "#fff", padding: "4px 10px", borderRadius: "6px", fontSize: 11, fontWeight: 800, letterSpacing: "0.02em" };
const closeBtn: React.CSSProperties = { border: "none", background: "#F3F4F6", width: 32, height: 32, borderRadius: "50%", color: "#4B5563", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.2s" };
