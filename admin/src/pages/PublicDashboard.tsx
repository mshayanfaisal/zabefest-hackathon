import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { Link } from "react-router-dom";
import { supabase, CATEGORY_COLORS } from "../lib/supabase";
import type { Report } from "../lib/supabase";
import StatusBadge from "../components/StatusBadge";
import "leaflet/dist/leaflet.css";

// Read-only transparency dashboard — no login required.
export default function PublicDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({ total: 0, resolved: 0, verified: 0 });

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .neq("status", "duplicate")
        .order("created_at", { ascending: false })
        .limit(300);
      const list = (data as Report[]) ?? [];
      setReports(list);
      setStats({
        total: list.length,
        resolved: list.filter((r) => r.status === "resolved").length,
        verified: list.filter((r) => ["verified", "assigned", "in_progress", "resolved"].includes(r.status)).length,
      });
    };
    run();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7f6" }}>
      <header style={{ background: "#1a6b4a", color: "#fff", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>KarachiPulse — Public Transparency</h1>
          <p style={{ margin: "4px 0 0", opacity: 0.8, fontSize: 14 }}>Live civic issue reporting across Karachi</p>
        </div>
        <Link to="/login" style={{ color: "#fff", fontSize: 13, textDecoration: "none", border: "1px solid rgba(255,255,255,0.5)", padding: "8px 14px", borderRadius: 8 }}>
          Authority login →
        </Link>
      </header>

      <div style={{ padding: 28 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
          <Stat label="Total Reports" value={stats.total} />
          <Stat label="Verified / In Action" value={stats.verified} color="#2980b9" />
          <Stat label="Resolved" value={stats.resolved} color="#27ae60" />
        </div>

        <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid #e2e8e5", marginBottom: 24 }}>
          <MapContainer center={[24.8607, 67.0011]} zoom={11} style={{ height: 460 }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {reports.map((r) => {
              const color = r.is_sos ? "#c0392b" : CATEGORY_COLORS[r.category] ?? "#888";
              return (
                <CircleMarker key={r.id} center={[r.lat, r.lng]} radius={Math.max(5, (r.severity_score ?? 5) * 1.3)}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.5, weight: 1 }}>
                  <Popup>
                    <strong style={{ textTransform: "capitalize" }}>{r.sub_type.replace("_", " ")}</strong><br />
                    Status: {r.status}
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        <h2 style={{ fontSize: 18 }}>Recent reports</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reports.slice(0, 20).map((r) => (
            <div key={r.id} style={{ background: "#fff", borderRadius: 12, padding: 14, border: "1px solid #e2e8e5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ textTransform: "capitalize" }}>{r.sub_type.replace("_", " ")}</strong>
                <span style={{ color: CATEGORY_COLORS[r.category], fontSize: 13, marginLeft: 8, fontWeight: 600 }}>{r.category}</span>
                {r.description && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#666" }}>{r.description}</p>}
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color = "#1a6b4a" }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #e2e8e5" }}>
      <div style={{ fontSize: 32, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 13, color: "#6b7672", marginTop: 4 }}>{label}</div>
    </div>
  );
}
