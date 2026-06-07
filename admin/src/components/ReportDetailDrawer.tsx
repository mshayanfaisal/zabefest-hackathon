import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";
import { supabase, STATUS_ORDER, CATEGORY_COLORS, severityColor } from "../lib/supabase";
import type { Report } from "../lib/supabase";
import StatusBadge from "./StatusBadge";
import Select from "./Select";
import { XIcon, ExternalLinkIcon, CheckIcon, LockIcon } from "./icons";
import "leaflet/dist/leaflet.css";

type HistoryRow = { id: string; old_status: string | null; new_status: string; changed_at: string };

export default function ReportDetailDrawer({
  report,
  onClose,
  onStatusChange,
}: {
  report: Report;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [dept, setDept] = useState(report.department ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from("status_history")
      .select("id,old_status,new_status,changed_at")
      .eq("report_id", report.id)
      .order("changed_at", { ascending: false })
      .then(({ data }) => setHistory((data as HistoryRow[]) ?? []));
  }, [report.id]);

  const assign = async () => {
    await supabase.from("reports").update({ department: dept, status: report.status === "pending" ? "assigned" : report.status }).eq("id", report.id);
    if (report.status === "pending") onStatusChange(report.id, "assigned");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(16,32,28,0.45)",
      zIndex: 100, animation: "fadeIn 0.15s ease",
    }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute", top: 0, right: 0, height: "100%", width: "min(560px, 100%)",
          background: "rgba(244,246,245,0.82)", backdropFilter: "blur(22px) saturate(150%)", WebkitBackdropFilter: "blur(22px) saturate(150%)",
          boxShadow: "var(--shadow-lg)", overflowY: "auto",
          animation: "slideIn 0.22s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* header */}
        <div style={{
          position: "sticky", top: 0, background: "rgba(255,255,255,0.75)", backdropFilter: "blur(18px) saturate(150%)", WebkitBackdropFilter: "blur(18px) saturate(150%)",
          borderBottom: "1px solid rgba(255,255,255,0.5)",
          padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {report.is_sos && <span style={sosBadge}>SOS</span>}
            <strong style={{ fontSize: 18, textTransform: "capitalize" }}>{report.sub_type.replace("_", " ")}</strong>
            <span style={{ color: CATEGORY_COLORS[report.category], fontWeight: 600, fontSize: 13 }}>{report.category}</span>
          </div>
          <button onClick={onClose} aria-label="Close" style={closeBtn}><XIcon size={16} /></button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* photo */}
          {report.photo_url ? (
            <img src={report.photo_url} alt="" style={{ width: "100%", borderRadius: "var(--radius)", maxHeight: 280, objectFit: "cover" }} />
          ) : (
            <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              No photo attached
            </div>
          )}

          {/* severity + status */}
          <div className="card" style={{ padding: 18, display: "flex", gap: 18, alignItems: "center" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, background: severityColor(report.severity_score),
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 22, flexShrink: 0,
            }}>{report.severity_score ?? "–"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>AI Severity</div>
              <div style={{ fontSize: 14, color: "var(--text)", marginTop: 2 }}>
                {report.severity_reason || "Awaiting AI analysis — rule-based score shown."}
              </div>
            </div>
          </div>

          {/* description */}
          {report.description && (
            <Section title="Description">
              <p style={{ margin: 0, lineHeight: 1.6, fontSize: 14 }}>{report.description}</p>
            </Section>
          )}

          {/* meta */}
          <Section title="Details">
            <Row label="Status"><StatusBadge status={report.status} /></Row>
            <Row label="Department">{report.department || "Unassigned"}</Row>
            <Row label="Verifications">{report.verification_count}</Row>
            <Row label="Reported">{new Date(report.created_at).toLocaleString()}</Row>
            <Row label="Anonymous">{report.is_anonymous ? "Yes" : "No"}</Row>
          </Section>

          {/* location */}
          <Section title="Location">
            <div style={{ height: 180, borderRadius: "var(--radius-sm)", overflow: "hidden", marginBottom: 8 }}>
              <MapContainer center={[report.lat, report.lng]} zoom={15} style={{ height: "100%" }} scrollWheelZoom={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <CircleMarker center={[report.lat, report.lng]} radius={10}
                  pathOptions={{ color: severityColor(report.severity_score), fillColor: severityColor(report.severity_score), fillOpacity: 0.7 }} />
              </MapContainer>
            </div>
            <a href={`https://www.google.com/maps?q=${report.lat},${report.lng}`} target="_blank" rel="noreferrer"
              style={{ color: "var(--primary)", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
              {report.lat.toFixed(5)}, {report.lng.toFixed(5)} · Open in Google Maps <ExternalLinkIcon size={13} />
            </a>
          </Section>

          {/* workflow */}
          <Section title="Authority Workflow">
            {report.status === "resolved" ? (
              /* Permanently locked — no controls rendered */
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                background: "#f0fdf4", border: "1px solid #bbf7d0",
                borderRadius: "var(--radius-sm)", padding: "14px 16px",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "#dcfce7", border: "1px solid #86efac",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#16a34a", flexShrink: 0,
                }}>
                  <LockIcon size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>Issue Permanently Closed</div>
                  <div style={{ fontSize: 12, color: "#166534", marginTop: 2, lineHeight: 1.4 }}>
                    This issue has been fully resolved and is now locked. No further changes can be made.
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <label style={{ fontSize: 13, color: "var(--muted)" }}>Status</label>
                  <Select
                    ariaLabel="Change status"
                    minWidth={180}
                    value={report.status}
                    onChange={(v) => onStatusChange(report.id, v)}
                    options={STATUS_ORDER.map((s) => ({ value: s, label: cap(s) }))}
                  />
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
                  <input className="input" placeholder="Department (e.g. KMC)" value={dept}
                    onChange={(e) => setDept(e.target.value)} style={{ flex: 1 }} />
                  <button className="btn btn-primary" onClick={assign} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {saved ? <><CheckIcon size={15} /> Saved</> : "Assign"}
                  </button>
                </div>
              </>
            )}
          </Section>

          {/* timeline */}
          <Section title="Status History">
            {history.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>No status changes yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {history.map((h, i) => (
                  <div key={h.id} style={{ display: "flex", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 10, height: 10, borderRadius: 5, background: "var(--primary)", marginTop: 5 }} />
                      {i < history.length - 1 && <div style={{ width: 2, flex: 1, background: "var(--border)" }} />}
                    </div>
                    <div style={{ paddingBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>
                        {h.old_status ? `${h.old_status.replace("_", " ")} → ` : ""}{h.new_status.replace("_", " ")}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(h.changed_at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", fontSize: 14, borderBottom: "1px solid var(--border)" }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{children}</span>
    </div>
  );
}

const cap = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const sosBadge: React.CSSProperties = { background: "var(--danger)", color: "#fff", padding: "3px 9px", borderRadius: 6, fontSize: 12, fontWeight: 700 };
const closeBtn: React.CSSProperties = { border: "1px solid var(--border)", background: "#fff", width: 34, height: 34, borderRadius: 10, color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };
