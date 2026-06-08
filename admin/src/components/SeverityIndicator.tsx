import { severityColor } from "../lib/supabase";

const label = (s: number | null) => {
  if (!s) return "—";
  if (s >= 8) return "Critical";
  if (s >= 6) return "High";
  if (s >= 4) return "Medium";
  return "Low";
};

export default function SeverityIndicator({
  score,
  showLabel = true,
}: {
  score: number | null;
  showLabel?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
      <div
        title={`Severity: ${score ?? "pending"}/10`}
        style={{
          width: 44, height: 44, borderRadius: 14, background: severityColor(score),
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 17, boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
        }}
      >
        {score ?? "–"}
      </div>
      {showLabel && (
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label(score)}
        </span>
      )}
    </div>
  );
}

/** Compact severity pill — just the level, color-coded. Number is in the tooltip. */
export function SeverityChip({ score }: { score: number | null }) {
  const color = severityColor(score);
  const isMedium = score != null && score >= 4 && score < 6; // yellow → needs dark text
  return (
    <span
      title={`Severity: ${score ?? "pending"}/10`}
      style={{
        display: "inline-flex", alignItems: "center", flexShrink: 0,
        background: color, color: isMedium ? "#3d3000" : "#fff",
        padding: "4px 11px", borderRadius: 999,
        fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em",
        whiteSpace: "nowrap",
      }}
    >
      {label(score)}
    </span>
  );
}

export function SeverityLegend() {
  const items = [
    { c: "#d64545", t: "Critical 8–10" },
    { c: "#e6862e", t: "High 6–7" },
    { c: "#f1c40f", t: "Medium 4–5" },
    { c: "#27ae60", t: "Low 1–3" },
  ];
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Severity</span>
      {items.map((i) => (
        <span key={i.t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}>
          <span style={{ width: 12, height: 12, borderRadius: 4, background: i.c }} />
          {i.t}
        </span>
      ))}
    </div>
  );
}
