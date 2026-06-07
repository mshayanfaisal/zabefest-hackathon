import { NavLink, Outlet, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import {
  QueueIcon, HeatmapIcon, AnalyticsIcon, SosIcon, GlobeIcon,
  LogoutIcon, SearchIcon, PanelIcon,
} from "./icons";

type NavItem = { to: string; label: string; Icon: typeof QueueIcon; end?: boolean; badge?: number };

const STORAGE_KEY = "kp_sidebar_collapsed";

export default function Layout() {
  const nav = useNavigate();
  const loc = useLocation();
  const [params, setParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [sosCount, setSosCount] = useState(0);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === "1");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [toasts, setToasts] = useState<{ id: number; type: "sos" | "standard"; message: string }[]>([]);

  const addToast = useCallback((type: "sos" | "standard", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    
    if (type === "sos") {
      try {
        const audio = new Audio('/alert.mp3');
        audio.play().catch((e) => console.warn('Audio autoplay blocked:', e));
      } catch (e) {
        console.warn('Audio playback error:', e);
      }
    }

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  // Live SOS badge — count active emergencies, keep it current via Realtime.
  useEffect(() => {
    const load = async () => {
      const { count } = await supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("is_sos", true)
        .neq("status", "resolved");
      setSosCount(count ?? 0);
    };
    load();
    const ch = supabase
      .channel("sidebar-sos")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, (payload) => {
        load();
        if (payload.eventType === "INSERT") {
          const report = payload.new;
          if (report.is_sos || report.type === "fire" || report.is_fire || report.sub_type === "fire") {
            addToast("sos", "CRITICAL: New SOS Alert Received");
          } else {
            const categoryLabel = report.category ? report.category.charAt(0).toUpperCase() + report.category.slice(1) : "New";
            addToast("standard", `New ${categoryLabel} report submitted`);
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [addToast]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0"); }, [collapsed]);

  // Keyboard shortcut: ⌘F / Ctrl+F focuses the sidebar search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        document.getElementById("kp-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onSearch = (val: string) => {
    setQ(val);
    if (loc.pathname !== "/") nav(val ? `/?q=${encodeURIComponent(val)}` : "/");
    else {
      const p = new URLSearchParams(params);
      if (val) p.set("q", val); else p.delete("q");
      setParams(p, { replace: true });
    }
  };

  const signOut = async () => { await supabase.auth.signOut(); nav("/login"); };

  const initials = (email.split("@")[0] || "AD").slice(0, 2).toUpperCase();
  const name = email ? email.split("@")[0] : "Admin";

  const MAIN: NavItem[] = [
    { to: "/", label: "Issue Queue", Icon: QueueIcon, end: true },
    { to: "/heatmap", label: "Heatmap", Icon: HeatmapIcon },
    { to: "/analytics", label: "Analytics", Icon: AnalyticsIcon },
  ];
  const MONITOR: NavItem[] = [
    { to: "/sos", label: "SOS Alerts", Icon: SosIcon, badge: sosCount },
    { to: "/public", label: "Public View", Icon: GlobeIcon },
  ];

  const renderLink = ({ to, label, Icon, end, badge }: NavItem) => (
    <NavLink key={to} to={to} end={end} title={collapsed ? label : undefined}
      style={({ isActive }) => ({
        display: "flex", alignItems: "center", gap: 12, textDecoration: "none",
        padding: collapsed ? "10px" : "10px 12px", justifyContent: collapsed ? "center" : "flex-start",
        borderRadius: 11, fontSize: 14, marginBottom: 2, position: "relative",
        color: isActive ? "var(--text)" : "#5d6b64",
        fontWeight: isActive ? 700 : 500,
        background: isActive ? "#fff" : "transparent",
        border: isActive ? "1px solid var(--border)" : "1px solid transparent",
        boxShadow: isActive ? "var(--shadow)" : "none",
        whiteSpace: "nowrap", overflow: "hidden",
      })}>
      {({ isActive }) => (
        <>
          <span style={{ display: "flex", flexShrink: 0, color: isActive ? "var(--primary)" : "#9aa8a2" }}><Icon size={20} /></span>
          {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
          {!!badge && badge > 0 && (
            <span style={{ ...styles.badge, ...(collapsed ? styles.badgeDot : {}) }}>{collapsed ? "" : badge}</span>
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <aside style={{ ...styles.sidebar, width: collapsed ? 78 : 264 }}>
        {/* brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "2px 4px", marginBottom: 16, justifyContent: collapsed ? "center" : "flex-start" }}>
          <div style={styles.logo}>KP</div>
          {!collapsed && (
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Authority</div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>KarachiPulse</div>
            </div>
          )}
        </div>

        {/* search */}
        {collapsed ? (
          <button style={styles.searchCollapsed} title="Search (⌘F)" onClick={() => { setCollapsed(false); setTimeout(() => document.getElementById("kp-search")?.focus(), 220); }}>
            <SearchIcon />
          </button>
        ) : (
          <div style={styles.searchWrap}>
            <span style={{ display: "flex", color: "var(--muted)" }}><SearchIcon /></span>
            <input id="kp-search" value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Search reports" style={styles.searchInput} />
            <kbd style={styles.kbd}>⌘F</kbd>
          </div>
        )}

        {/* nav */}
        {!collapsed && <div style={styles.section}>Main Menu</div>}
        <nav style={{ marginTop: collapsed ? 10 : 0 }}>{MAIN.map(renderLink)}</nav>
        {!collapsed && <div style={{ ...styles.section, marginTop: 16 }}>Monitoring</div>}
        <nav style={{ marginTop: collapsed ? 6 : 0 }}>{MONITOR.map(renderLink)}</nav>

        {/* footer: profile + collapse + version */}
        <div style={{ marginTop: "auto" }}>
          <div style={{ ...styles.profile, justifyContent: collapsed ? "center" : "space-between", padding: collapsed ? 6 : "8px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <div style={styles.avatar}>{initials}</div>
              {!collapsed && (
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 130 }}>{email || "authority"}</div>
                </div>
              )}
            </div>
            {!collapsed && (
              <button onClick={() => setCollapsed(true)} style={styles.iconBtn} title="Collapse sidebar"><PanelIcon /></button>
            )}
          </div>

          {collapsed ? (
            <button onClick={() => setCollapsed(false)} style={{ ...styles.iconBtn, width: "100%", marginTop: 8 }} title="Expand sidebar"><PanelIcon /></button>
          ) : (
            <>
              <button style={styles.signOut} onClick={signOut}><LogoutIcon /><span style={{ marginLeft: 8 }}>Sign out</span></button>
              <div style={styles.footer}>© 2026 KarachiPulse · v1.0</div>
            </>
          )}
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto", height: "100vh" }}>
        <Outlet />
      </main>

      {/* Toast Notifications Container */}
      <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-end", pointerEvents: "none" }}>
        {toasts.map((t) => {
          const isSos = t.type === "sos";
          return (
            <div key={t.id} style={{
              background: isSos ? "rgba(153, 27, 27, 0.95)" : "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              color: isSos ? "#ffffff" : "#111827",
              padding: "16px 20px",
              borderRadius: "12px",
              minWidth: 320,
              maxWidth: 400,
              boxShadow: isSos ? "0 10px 40px -10px rgba(220, 38, 38, 0.4)" : "0 8px 30px -10px rgba(0, 0, 0, 0.1)",
              border: isSos ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(229, 231, 235, 0.8)",
              animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            }}>
              {isSos ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: "50%", background: "rgba(255, 255, 255, 0.15)", color: "#ffffff", flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", color: "#059669", flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>
                  {isSos ? "Emergency Alert" : "System Notification"}
                </span>
                <span style={{ fontSize: 13, color: isSos ? "#FECACA" : "#6B7280", marginTop: 2, fontWeight: 500 }}>
                  {t.message}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: { background: "rgba(251,252,252,0.72)", backdropFilter: "blur(18px) saturate(150%)", WebkitBackdropFilter: "blur(18px) saturate(150%)", borderRight: "1px solid rgba(255,255,255,0.5)", padding: 16, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)" },
  logo: { width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg, var(--primary), var(--accent))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 },
  searchWrap: { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid var(--border)", borderRadius: 11, padding: "9px 11px", marginBottom: 18 },
  searchInput: { flex: 1, border: "none", outline: "none", fontSize: 13.5, fontFamily: "inherit", background: "transparent", color: "var(--text)", minWidth: 0 },
  searchCollapsed: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: "1px solid var(--border)", borderRadius: 11, padding: "10px", color: "var(--muted)", cursor: "pointer", marginBottom: 8 },
  kbd: { fontSize: 11, color: "var(--muted)", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 6px", fontFamily: "inherit" },
  section: { fontSize: 11, fontWeight: 700, color: "#9aa8a2", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px 4px" },
  badge: { background: "var(--danger)", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 999, minWidth: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px" },
  badgeDot: { position: "absolute", top: 6, right: 8, minWidth: 8, width: 8, height: 8, padding: 0 },
  profile: { display: "flex", alignItems: "center", background: "#fff", border: "1px solid var(--border)", borderRadius: 13, marginBottom: 10, boxShadow: "var(--shadow)" },
  avatar: { width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, var(--primary), #1f8f63)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 },
  iconBtn: { width: 32, height: 32, borderRadius: 9, border: "1px solid var(--border)", background: "#fff", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
  signOut: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 11, padding: "10px", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  footer: { fontSize: 11, color: "#aab6b0", textAlign: "center", marginTop: 12 },
};
