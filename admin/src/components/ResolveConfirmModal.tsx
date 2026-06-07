import { useEffect, useRef } from "react";
import { STATUS_COLORS } from "../lib/supabase";
import type { Report } from "../lib/supabase";
import { LockIcon, XIcon, CheckIcon } from "./icons";

const cap = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

interface Props {
  report: Report;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ResolveConfirmModal({ report, onConfirm, onCancel }: Props) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const currentColor = STATUS_COLORS[report.status] ?? "#888";
  const resolvedColor = STATUS_COLORS["resolved"] ?? "#27ae60";

  return (
    <>
      {/* Backdrop */}
      <div onClick={onCancel} style={{
        position: "fixed", inset: 0,
        background: "rgba(16,32,28,0.5)",
        zIndex: 200,
        animation: "fadeIn 0.15s ease",
      }} />

      {/* Modal — same glass surface as the detail drawer */}
      <div
        role="dialog" aria-modal="true" aria-labelledby="resolve-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 201,
          width: "min(480px, calc(100vw - 32px))",
          background: "rgba(244,246,245,0.94)",
          backdropFilter: "blur(22px) saturate(160%)",
          WebkitBackdropFilter: "blur(22px) saturate(160%)",
          borderRadius: "var(--radius)",
          border: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "var(--shadow-lg)",
          animation: "modalPop 0.2s cubic-bezier(0.34,1.36,0.64,1)",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: "18px 20px 14px",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
          background: "rgba(255,255,255,0.5)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "var(--primary-soft)",
              border: "1px solid rgba(22,115,77,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--primary)", flexShrink: 0,
            }}>
              <LockIcon size={16} />
            </div>
            <div>
              <div id="resolve-modal-title" style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                Permanently Resolve Issue
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, fontWeight: 500 }}>
                This action is irreversible and cannot be undone
              </div>
            </div>
          </div>
          <button onClick={onCancel} aria-label="Cancel" style={{
            border: "1px solid var(--border)", background: "rgba(255,255,255,0.8)",
            width: 30, height: 30, borderRadius: 8,
            color: "var(--muted)", display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer", flexShrink: 0,
          }}>
            <XIcon size={13} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Issue card — same visual style as IssueQueue cards */}
          <div style={{
            background: "rgba(255,255,255,0.66)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.5)", borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow)",
            padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "var(--primary-soft)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, flexShrink: 0,
            }}>
              {report.category === "safety" ? "🛡️" : report.category === "utility" ? "💧" : "🔧"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", textTransform: "capitalize" }}>
                {report.sub_type.replace(/_/g, " ")}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, fontWeight: 500, textTransform: "capitalize" }}>
                {report.category}{report.department ? ` · ${report.department}` : ""}
              </div>
            </div>
            {report.is_sos && (
              <span style={{ background: "var(--danger)", color: "#fff", padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700 }}>
                SOS
              </span>
            )}
          </div>

          {/* Status transition chips */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: "4px 0" }}>
            <span style={{
              background: `${currentColor}18`, color: currentColor,
              border: `1px solid ${currentColor}30`,
              padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, textTransform: "capitalize",
            }}>
              {cap(report.status)}
            </span>
            <span style={{ color: "var(--muted)", fontSize: 16 }}>→</span>
            <span style={{
              background: `${resolvedColor}18`, color: resolvedColor,
              border: `1px solid ${resolvedColor}30`,
              padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
              display: "inline-flex", alignItems: "center", gap: 5,
            }}>
              <LockIcon size={11} /> Resolved · Final
            </span>
          </div>

          {/* Warning callout — matches the app's warm-amber tone */}
          <div style={{
            background: "rgba(230,134,46,0.08)",
            border: "1px solid rgba(230,134,46,0.3)",
            borderRadius: "var(--radius-sm)",
            padding: "12px 14px",
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>
                Permanent action — no undo
              </div>
              <div style={{ fontSize: 12, color: "#78350f", lineHeight: 1.55 }}>
                Confirming marks this issue as <strong>fully verified, addressed, and permanently closed</strong>.
                Once saved, no admin can reopen or edit it — enforced at the database level.
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: "12px 20px",
          borderTop: "1px solid var(--border)",
          display: "flex", gap: 10, justifyContent: "flex-end",
          background: "rgba(255,255,255,0.4)",
        }}>
          <button onClick={onCancel} className="btn btn-ghost" style={{ fontSize: 13, padding: "8px 18px" }}>
            Cancel
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            className="btn btn-primary"
            style={{ fontSize: 13, padding: "8px 18px", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <CheckIcon size={14} />
            Permanently Resolve
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalPop {
          from { opacity: 0; transform: translate(-50%, -46%) scale(0.95); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
}
