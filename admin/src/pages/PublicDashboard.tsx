import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { supabase, CATEGORY_COLORS } from "../lib/supabase";
import type { Report } from "../lib/supabase";
import StatusBadge from "../components/StatusBadge";
import { ShieldIcon, DropletIcon, WrenchIcon, QueueIcon, CheckIcon, MapPinIcon, SearchIcon, AlertIcon } from "../components/icons";
import "leaflet/dist/leaflet.css";

// Read-only transparency dashboard — no login required.
export default function PublicDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0, verified: 0, critical: 0 });

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest"); // 'latest' | 'severity'

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
        pending: list.filter((r) => r.status === "pending").length,
        resolved: list.filter((r) => r.status === "resolved").length,
        verified: list.filter((r) => ["verified", "assigned", "in_progress", "resolved"].includes(r.status)).length,
        critical: list.filter((r) => (r.severity_score ?? 0) >= 8 || r.is_sos).length,
      });
    };
    run();
  }, []);

  const filteredReports = useMemo(() => {
    let result = reports;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r => 
        r.sub_type.toLowerCase().includes(q) || 
        r.description?.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== "all") {
      result = result.filter(r => r.category === categoryFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter(r => r.status === statusFilter);
    }
    if (sortBy === "severity") {
      result = [...result].sort((a, b) => {
        const scoreA = a.is_sos ? 10 : (a.severity_score ?? 0);
        const scoreB = b.is_sos ? 10 : (b.severity_score ?? 0);
        return scoreB - scoreA;
      });
    } else {
      // already sorted by latest
      result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return result;
  }, [reports, search, categoryFilter, statusFilter, sortBy]);

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'safety': return <ShieldIcon size={16} />;
      case 'utility': return <DropletIcon size={16} />;
      case 'infrastructure': return <WrenchIcon size={16} />;
      default: return <QueueIcon size={16} />;
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", fontFamily: "Inter, sans-serif", overflow: "hidden" }}>
      {/* Premium Government Header (Compact) */}
      <header style={{
        flexShrink: 0,
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        padding: "12px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        zIndex: 100,
        boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#16734d", letterSpacing: "-0.02em" }}>
            KarachiPulse
          </h1>
          <div style={{ height: 18, width: 2, background: "#e2e8f0", borderRadius: 2 }}></div>
          <p style={{ margin: 0, color: "#64748b", fontSize: 13, fontWeight: 600, letterSpacing: "0.01em" }}>Civic Transparency Portal</p>
        </div>
        <Link to="/login" style={{
          background: "#16734d", color: "#ffffff", fontSize: 13, fontWeight: 600, textDecoration: "none",
          padding: "8px 16px", borderRadius: 6, transition: "all 0.2s ease",
          boxShadow: "0 2px 4px rgba(22, 115, 77, 0.2)"
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#0f5538"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 6px rgba(22, 115, 77, 0.25)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#16734d"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 4px rgba(22, 115, 77, 0.2)"; }}
        >
          Authority Login
        </Link>
      </header>

      <main style={{ flex: 1, padding: "16px 24px", display: "flex", flexDirection: "column", gap: 16, overflow: "hidden", maxWidth: 1600, margin: "0 auto", width: "100%" }}>
        {/* Premium Stats Section (Compact) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, flexShrink: 0 }}>
          <StatCard label="Total Reports" value={stats.total} icon={<QueueIcon size={20} />} color="#64748b" />
          <StatCard label="Pending" value={stats.pending} icon={<MapPinIcon size={20} />} color="#f59e0b" />
          <StatCard label="Verified / Active" value={stats.verified} icon={<ShieldIcon size={20} />} color="#0ea5e9" />
          <StatCard label="Fully Resolved" value={stats.resolved} icon={<CheckIcon size={20} />} color="#10b981" />
          <StatCard label="Critical Issues" value={stats.critical} icon={<AlertIcon size={20} />} color="#ef4444" />
        </div>

        <div style={{ flex: 1, display: "flex", gap: 16, minHeight: 0 }}>
          {/* Map Section (60%) */}
          <div style={{ flex: "0 0 60%", background: "#ffffff", borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px -1px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }}>
            <MapContainer center={[24.8607, 67.0011]} zoom={11.5} style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap contributors" />
              {filteredReports.map((r) => {
                const isSos = r.is_sos || r.category === 'safety';
                const color = isSos ? "#ef4444" : CATEGORY_COLORS[r.category] ?? "#64748b";
                return (
                  <CircleMarker key={r.id} center={[r.lat, r.lng]} radius={Math.max(6, (r.severity_score ?? 5) * 1.5)}
                    pathOptions={{ color, fillColor: color, fillOpacity: isSos ? 0.7 : 0.5, weight: isSos ? 2 : 1 }}>
                    <Popup className="custom-popup">
                      <strong style={{ textTransform: "capitalize", fontSize: 13, color: "#0f172a" }}>{r.sub_type.replace("_", " ")}</strong><br />
                      <span style={{ color: "#64748b", fontSize: 11, fontWeight: 500 }}>{r.status}</span>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>

          {/* Feed Section (40%) */}
          <div style={{ flex: "0 0 calc(40% - 16px)", background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 2px 4px -1px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            
            {/* Controls Header */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", background: "#ffffff", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <MapPinIcon size={18} />
                  <h2 style={{ fontSize: 16, margin: 0, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>Live Feed</h2>
                </div>
                <span style={{ background: "#f1f5f9", color: "#475569", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                  {filteredReports.length} Reports
                </span>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1, position: "relative" }}>
                    <div style={{ position: "absolute", left: 10, top: 7, color: "#94a3b8" }}><SearchIcon size={14} /></div>
                    <input 
                      type="text" placeholder="Search issues..." 
                      value={search} onChange={e => setSearch(e.target.value)}
                      style={{ width: "100%", padding: "6px 10px 6px 30px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", outline: "none", color: "#0f172a", fontWeight: 500, transition: "border-color 0.2s" }}
                      onFocus={e => { e.currentTarget.style.borderColor = "#94a3b8"; }}
                      onBlur={e => { e.currentTarget.style.borderColor = "#cbd5e1"; }}
                    />
                  </div>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: "6px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", outline: "none", cursor: "pointer", color: "#334155", fontWeight: 500 }}>
                    <option value="latest">Sort by Latest</option>
                    <option value="severity">Sort by Severity</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ flex: 1, padding: "6px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", outline: "none", cursor: "pointer", color: "#334155", fontWeight: 500 }}>
                    <option value="all">All Categories</option>
                    <option value="safety">Safety</option>
                    <option value="utility">Utility</option>
                    <option value="infrastructure">Infrastructure</option>
                  </select>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ flex: 1, padding: "6px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", outline: "none", cursor: "pointer", color: "#334155", fontWeight: 500 }}>
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Scrollable Feed */}
            <div className="report-feed" style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 10, background: "#f8fafc" }}>
              {filteredReports.map((r) => {
                const color = r.is_sos ? "#ef4444" : CATEGORY_COLORS[r.category] || "#64748b";
                return (
                  <div key={r.id} style={{
                    flexShrink: 0, /* CRITICAL: prevents card from squishing vertically */
                    background: "#ffffff", borderRadius: 8, padding: "12px 14px",
                    border: "1px solid #e2e8f0", 
                    boxShadow: "0 1px 2px 0 rgba(0,0,0,0.02)",
                    transition: "all 0.15s ease",
                    display: "flex", flexDirection: "column", gap: 8,
                    cursor: "pointer", position: "relative", overflow: "hidden"
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.boxShadow = "0 4px 8px -2px rgba(0,0,0,0.05)"; 
                    e.currentTarget.style.borderColor = "#cbd5e1";
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.boxShadow = "0 1px 2px 0 rgba(0,0,0,0.02)"; 
                    e.currentTarget.style.borderColor = "#e2e8f0";
                  }}
                  >
                    {/* Color-coded left border */}
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: color }}></div>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingLeft: 4 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ color, display: "flex", alignItems: "center", justifyContent: "center", background: `${color}15`, padding: 8, borderRadius: 8, marginTop: 1 }}>
                           {getCategoryIcon(r.category)}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <strong style={{ textTransform: "capitalize", fontSize: 14, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em", lineHeight: 1.2 }}>{r.sub_type.replace("_", " ")}</strong>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ color: color, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{r.category}</span>
                            <span style={{ color: "#cbd5e1", fontSize: 10 }}>•</span>
                            <span style={{ color: "#64748b", fontSize: 11, fontWeight: 500 }}>
                              {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ transform: "scale(0.9)", transformOrigin: "top right" }}>
                         <StatusBadge status={r.status} />
                      </div>
                    </div>
                    {r.description && <p style={{ margin: "2px 0 0 6px", fontSize: 12, color: "#475569", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.description}</p>}
                  </div>
                );
              })}
              {filteredReports.length === 0 && (
                <div style={{ padding: "40px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <div style={{ color: "#94a3b8" }}><SearchIcon size={32} /></div>
                  <div style={{ color: "#64748b", fontSize: 13, fontWeight: 500 }}>No reports found matching your criteria.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Custom styles for map popups and scrollbars */}
      <style>{`
        .report-feed::-webkit-scrollbar { width: 6px; }
        .report-feed::-webkit-scrollbar-track { background: transparent; }
        .report-feed::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .report-feed::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .leaflet-container { background: #f1f5f9; font-family: 'Inter', sans-serif; }
        .leaflet-popup-content-wrapper { border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); padding: 0; border: 1px solid #e2e8f0; }
        .leaflet-popup-content { margin: 10px 14px; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (value === 0) { setCount(0); return; }
    let start = 0;
    const duration = 800;
    const increment = value / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: 12, padding: "16px",
      border: "1px solid #e2e8f0",
      boxShadow: "0 1px 2px 0 rgba(0,0,0,0.02)",
      display: "flex", alignItems: "center", gap: 12,
      transition: "box-shadow 0.2s ease, transform 0.2s ease",
      cursor: "default"
    }}
    onMouseEnter={(e) => { 
      e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.05)"; 
      e.currentTarget.style.transform = "translateY(-1px)"; 
    }}
    onMouseLeave={(e) => { 
      e.currentTarget.style.boxShadow = "0 1px 2px 0 rgba(0,0,0,0.02)"; 
      e.currentTarget.style.transform = "translateY(0)"; 
    }}
    >
      <div style={{
        background: `${color}10`, color: color,
        width: 40, height: 40, borderRadius: 10,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `1px solid ${color}20`,
        flexShrink: 0
      }}>
        {icon}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, letterSpacing: "0.01em" }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", lineHeight: 1.1, letterSpacing: "-0.02em" }}>{count}</div>
      </div>
    </div>
  );
}
