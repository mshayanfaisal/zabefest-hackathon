import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { supabase, CATEGORY_COLORS } from "../lib/supabase";
import type { Report } from "../lib/supabase";
import PageHeader from "../components/PageHeader";
import { SeverityLegend } from "../components/SeverityIndicator";
import "leaflet/dist/leaflet.css";

const FILTERS = ["all", "infrastructure", "safety", "utility"];

export default function HeatmapView() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchReports = async () => {
      let q = supabase
        .from("reports")
        .select("id,lat,lng,category,sub_type,severity_score,status,is_sos")
        .neq("status", "duplicate")
        .limit(500);
      if (filter !== "all") q = q.eq("category", filter);
      const { data } = await q;
      setReports((data as Report[]) ?? []);
    };
    fetchReports();
  }, [filter]);

  return (
    <div style={{ padding: 28, maxWidth: 1100, margin: "0 auto" }}>
      <PageHeader
        title="Heatmap"
        subtitle="Issue density across Karachi · marker size reflects severity"
        right={<SeverityLegend />}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {FILTERS.map((f) => (
          <button key={f} className={`chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      <div className="card" style={{ padding: 8 }}>
        <MapContainer center={[24.8607, 67.0011]} zoom={11} style={{ height: 600, borderRadius: 12 }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {reports.map((r) => {
            const color = r.is_sos ? "#d64545" : CATEGORY_COLORS[r.category] ?? "#888";
            return (
              <CircleMarker key={r.id} center={[r.lat, r.lng]}
                radius={Math.max(6, (r.severity_score ?? 5) * 1.5)}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.55, weight: r.is_sos ? 3 : 1 }}>
                <Popup>
                  <strong style={{ textTransform: "capitalize" }}>{r.sub_type.replace("_", " ")}</strong><br />
                  Severity: {r.severity_score ?? "pending"}<br />
                  Status: {r.status}
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
