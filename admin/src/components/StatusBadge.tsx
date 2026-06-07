import { STATUS_COLORS } from "../lib/supabase";

// Utility to create a faint background version of a hex color
const getSoftColor = (hex: string) => {
  return `${hex}20`; // adds ~12% opacity to a valid 6-char hex
};

export default function StatusBadge({ status }: { status: string }) {
  const baseColor = STATUS_COLORS[status] ?? "#64748b";
  return (
    <span
      style={{
        background: getSoftColor(baseColor),
        color: baseColor,
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        textTransform: "capitalize",
        border: `1px solid ${getSoftColor(baseColor)}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      {status.replace("_", " ")}
    </span>
  );
}
