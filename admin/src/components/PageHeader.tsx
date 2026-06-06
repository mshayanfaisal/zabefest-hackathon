export default function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: React.ReactNode;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      gap: 16, marginBottom: 22, flexWrap: "wrap",
    }}>
      <div>
        <h1 style={{ margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 14 }}>{subtitle}</p>}
      </div>
      {right && <div style={{ display: "flex", alignItems: "center", gap: 12 }}>{right}</div>}
    </div>
  );
}
