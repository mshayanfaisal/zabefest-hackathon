import { useState } from "react";
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
  const [saved, setSaved] = useState(false);

  const handleUpdate = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
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
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px", fontWeight: 600 }}>NIC Number</span>
                <span style={{ fontSize: "14px", color: "#111827", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                  {report.user_nic || "Not provided"} 
                  {report.user_nic && <span style={{ color: "#9CA3AF", display: "flex" }}><LockIcon size={14} /></span>}
                </span>
              </div>
              <DetailItem label="Neighborhood" value={report.area || "Not provided"} />
              <div style={{ gridColumn: "1 / -1" }}>
                <DetailItem label="Detailed Address" value={report.address || "Not provided"} />
              </div>
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
                  value={report.status}
                  onChange={(v) => { onStatusChange(report.id, v); setSaved(true); setTimeout(() => setSaved(false), 1500); }}
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
          <button onClick={handleUpdate} style={{ flex: 2, backgroundColor: "#047857", color: "#ffffff", padding: "10px 16px", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: "14px", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", boxShadow: "0 2px 8px rgba(4, 120, 87, 0.2)", transition: "transform 0.1s" }}>
            {saved ? <><CheckIcon size={16} /> Saved</> : "Update Status"}
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
