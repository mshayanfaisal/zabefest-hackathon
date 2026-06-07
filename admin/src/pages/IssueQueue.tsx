import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase, STATUS_ORDER, CATEGORY_COLORS, STATUS_COLORS } from "../lib/supabase";
import type { Report } from "../lib/supabase";
import { SeverityChip, SeverityLegend } from "../components/SeverityIndicator";
import PageHeader from "../components/PageHeader";
import ReportDetailDrawer from "../components/ReportDetailDrawer";
import ResolveConfirmModal from "../components/ResolveConfirmModal";
import Select from "../components/Select";
import MultiSelect from "../components/MultiSelect";
import { SearchIcon, ShieldIcon, DropletIcon, WrenchIcon, XIcon, UpvoteIcon, ClockIcon, ChevronDownIcon, LockIcon } from "../components/icons";

export default function IssueQueue() {
  const [reports, setReports] = useState<Report[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [severities, setSeverities] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Report | null>(null);
  const [pendingResolve, setPendingResolve] = useState<{ id: string; report: Report } | null>(null);
  const [params] = useSearchParams();

  // Keep the in-page search in sync with the sidebar's global search (?q=).
  const urlQuery = params.get("q") ?? "";
  useEffect(() => { setSearchInput(urlQuery); }, [urlQuery]);

  // Debounce the search box so we hit the DB at most ~3×/sec while typing.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchReports = useCallback(async () => {
    console.log("[fetchReports] Triggered");
    let query = supabase
      .from("reports")
      .select("*")
      .neq("status", "duplicate");

    if (statuses.length) query = query.in("status", statuses);
    if (categories.length) query = query.in("category", categories);
    if (areas.length) query = query.in("area", areas);

    // Each selected severity bucket becomes one OR'd range condition, so
    // non-adjacent picks (e.g. Critical + Low) still work.
    if (severities.length) {
      query = query.or(severities.map((s) => SEVERITY_FILTERS[s]).join(","));
    }

    if (search) {
      // strip PostgREST `or()` delimiters so user input can't break the filter
      const q = search.replace(/[%,()]/g, " ");
      query = query.or(
        `sub_type.ilike.%${q}%,description.ilike.%${q}%,department.ilike.%${q}%,category.ilike.%${q}%`,
      );
    }

    // Cap the page so the queue stays fast even with millions of rows.
    query = query
      .order("is_sos", { ascending: false })
      .order("severity_score", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(100);

    const { data, error } = await query;
    if (error) console.error("[fetchReports] Error", error);
    console.log("[fetchReports] Received", data?.length ?? 0, "reports");
    // Push resolved to the end — priority issues (SOS/severity) float to the top
    const sorted = sortWithResolvedLast((data as Report[]) ?? []);
    setReports(sorted);
    setLoading(false);
  }, [statuses, severities, categories, areas, search]);

  useEffect(() => {
    fetchReports();
    const channel = supabase
      .channel("queue-reports")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, (payload) => {
        console.log('[realtime] payload', payload);
        const newReport = payload.new as Report;
        // Re-sort after each realtime update so resolved sinks to the bottom immediately
        setReports((prev) => {
          if (payload.eventType === "INSERT") {
            return sortWithResolvedLast([newReport, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            return sortWithResolvedLast(prev.map((r) => (r.id === newReport.id ? newReport : r)));
          } else if (payload.eventType === "DELETE") {
            return sortWithResolvedLast(prev.filter((r) => r.id !== payload.old.id));
          }
          return prev;
        });
        setSelected((s) => (s && s.id === newReport.id ? newReport : s));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchReports]);

  // Gate: intercept 'resolved' transitions and show the confirmation modal.
  // Any other status change proceeds immediately.
  const updateStatus = (id: string, status: string) => {
    if (status === "resolved") {
      const report = reports.find((r) => r.id === id) ?? selected;
      if (!report) return;
      // Guard: already resolved — silently ignore (belt-and-suspenders on top of DB policy)
      if (report.status === "resolved") return;
      setPendingResolve({ id, report });
      return;
    }
    executeStatusUpdate(id, status);
  };

  // Performs the actual Supabase update with optimistic UI rollback on failure.
  const executeStatusUpdate = async (id: string, status: string) => {
    console.log(`[updateStatus] Initiating status change`, { id, newStatus: status });
    const previousReports = reports;
    const previousSelected = selected;
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    setSelected((s) => (s && s.id === id ? { ...s, status } : s));

    const { data, error } = await supabase.from("reports").update({ status }).eq("id", id).neq("status", "resolved");
    console.log(`[updateStatus] Supabase response`, { data, error });
    if (error) {
      console.error("[updateStatus] Failed to update status:", error);
      setReports(previousReports);
      setSelected(previousSelected);
    } else {
      console.log('[updateStatus] Update succeeded, refetching reports');
      await fetchReports();
    }
  };

  const handleConfirmResolve = async () => {
    if (!pendingResolve) return;
    setPendingResolve(null);
    await executeStatusUpdate(pendingResolve.id, "resolved");
  };

  const handleCancelResolve = () => setPendingResolve(null);

  const counts = {
    total: reports.length,
    sos: reports.filter((r) => r.is_sos).length,
    critical: reports.filter((r) => (r.severity_score ?? 0) >= 8).length,
    pending: reports.filter((r) => r.status === "pending").length,
  };

  const areaCounts = reports.reduce((acc, r) => {
    if (r.area) acc[r.area] = (acc[r.area] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topAreas = Object.entries(areaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div style={{ padding: 28, maxWidth: 1240, margin: "0 auto" }}>
      <PageHeader
        title="Issue Queue"
        subtitle="Sorted by SOS → severity → recency · live via Realtime"
        right={<SeverityLegend />}
      />

      {/* Top 3 Areas Analytics */}
      {topAreas.length > 0 && (
        <div style={{ display: "flex", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
          {topAreas.map(([area, count], idx) => (
             <div key={area} className="card" style={{ padding: "16px 18px", flex: 1, minWidth: 200, borderLeft: idx === 0 ? "4px solid var(--danger)" : "4px solid var(--primary)" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>Top Issue Area #{idx + 1}</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: "var(--text)" }}>{area}</div>
                <div style={{ fontSize: 13, color: "var(--primary)", fontWeight: 700, marginTop: 4 }}>{count} Active Reports</div>
             </div>
          ))}
        </div>
      )}

      {/* stat strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "24px" }}>
        <Stat label="Open issues" value={counts.total} accent="#10B981" />
        <Stat label="Active SOS" value={counts.sos} accent="#EF4444" bg={counts.sos > 0 ? "#FEF2F2" : "#ffffff"} />
        <Stat label="Critical (8–10)" value={counts.critical} accent="#F59E0B" />
        <Stat label="Awaiting triage" value={counts.pending} accent="#3B82F6" />
      </div>

      {/* Sleek Filter & Search Bar */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", alignItems: "center", flexWrap: "wrap" }}>
        
        {/* Search Bar */}
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 360 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", display: "flex", pointerEvents: "none" }}>
            <SearchIcon size={16} />
          </span>
          <input
            className="input"
            placeholder="Search reports..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ 
              width: "100%", paddingLeft: 36, paddingRight: 32,
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
            }}
          />
          {searchInput && (
            <button onClick={() => setSearchInput("")} aria-label="Clear search" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9CA3AF", padding: 0 }}>
              <XIcon size={14} />
            </button>
          )}
        </div>

        <MultiSelect
          ariaLabel="Filter by status"
          placeholder="All statuses"
          noun="status"
          nounPlural="statuses"
          values={statuses}
          onChange={setStatuses}
          options={STATUS_ORDER.map((s) => ({ value: s, label: cap(s) }))}
        />
        <MultiSelect
          ariaLabel="Filter by severity"
          placeholder="All severities"
          noun="severity"
          nounPlural="severities"
          minWidth={160}
          values={severities}
          onChange={setSeverities}
          options={SEVERITY_OPTIONS}
        />
        <MultiSelect
          ariaLabel="Filter by category"
          placeholder="All categories"
          noun="category"
          nounPlural="categories"
          values={categories}
          onChange={setCategories}
          options={[
            { value: "infrastructure", label: "Infrastructure" },
            { value: "safety", label: "Public Safety" },
            { value: "utility", label: "Utilities" }
          ]}
        />
        <MultiSelect
          ariaLabel="Filter by area"
          placeholder="All Areas"
          noun="area"
          nounPlural="areas"
          values={areas}
          onChange={setAreas}
          options={KARACHI_AREAS.map(a => ({ value: a, label: a }))}
        />
        
        {(statuses.length > 0 || severities.length > 0 || categories.length > 0 || areas.length > 0 || search) && (
          <button onClick={() => { setStatuses([]); setSeverities([]); setCategories([]); setAreas([]); setSearchInput(""); }}
            style={{ background: "none", border: "none", color: "#EF4444", fontWeight: 700, fontSize: 13, cursor: "pointer", padding: "8px" }}
          >
            Clear Filters
          </button>
        )}
      </div>

      <div style={{ fontSize: 13, color: "#6B7280", fontWeight: 600, marginBottom: 16 }}>
        {loading ? "Searching..." : `${reports.length}${reports.length === 100 ? "+" : ""} report${reports.length === 1 ? "" : "s"} found`}
      </div>

      {loading ? <p>Loading…</p> : reports.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No reports in this view.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))", gap: 14, alignItems: "start" }}>
          {reports.map((r) => (
            <div key={r.id} className="card issue-card"
              onClick={() => setSelected(r)}
              style={{ padding: 15, display: "flex", flexDirection: "column", gap: 10, borderColor: r.is_sos ? "var(--danger)" : undefined, borderWidth: r.is_sos ? 2 : 1 }}>
              {/* top: thumbnail · title/desc · severity */}
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {r.photo_url ? (
                  <img src={r.photo_url} alt="" style={{ width: 46, height: 46, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 46, height: 46, borderRadius: 10, background: "var(--primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: CATEGORY_COLORS[r.category], flexShrink: 0 }}>
                    <CategoryIcon category={r.category} size={22} />
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {r.is_sos && <span style={sosBadge}>SOS</span>}
                    <strong style={{ fontSize: 15, textTransform: "capitalize" }}>{r.sub_type.replace("_", " ")}</strong>
                    <span style={{ color: CATEGORY_COLORS[r.category], fontSize: 12, fontWeight: 600 }}>{r.category}</span>
                    {r.department && <span style={deptPill}>{r.department}</span>}
                    {r.area && <span style={areaPill}>{r.area}</span>}
                  </div>
                  {r.description && (
                    <p style={{ margin: "5px 0 0", color: "#46544e", fontSize: 13, lineHeight: 1.45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{r.description}</p>
                  )}
                </div>

                <SeverityChip score={r.severity_score} />
              </div>

              {/* footer: status changer · meta */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
                  {r.status === "resolved" ? (
                    /* Locked resolved badge — no dropdown, no interaction */
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      background: `${STATUS_COLORS.resolved}18`, color: STATUS_COLORS.resolved,
                      padding: "5px 10px 5px 10px", borderRadius: 999,
                      fontSize: 12, fontWeight: 700, textTransform: "capitalize",
                      border: `1px solid ${STATUS_COLORS.resolved}35`,
                      userSelect: "none", cursor: "default",
                    }}>
                      <LockIcon size={11} />
                      Resolved · Final
                    </span>
                  ) : (
                    /* Show all statuses including Resolved — selecting it triggers the confirmation modal */
                    <Select
                      ariaLabel="Change status"
                      value={r.status}
                      onChange={(v) => updateStatus(r.id, v)}
                      options={STATUS_ORDER.map((s) => ({ value: s, label: cap(s) }))}
                      trigger={(cur, open) => <StatusChipTrigger status={cur?.value ?? r.status} label={cur?.label ?? cap(r.status)} open={open} />}
                    />
                  )}
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                  <span title={`${r.verification_count} upvotes`} style={{ fontSize: 12, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                    <UpvoteIcon size={14} /> {r.verification_count}
                  </span>
                  <span title={new Date(r.created_at).toLocaleString()} style={{ fontSize: 12, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                    <ClockIcon size={13} /> {timeAgo(r.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <ReportDetailDrawer report={selected} onClose={() => setSelected(null)} onStatusChange={updateStatus} />
      )}

      {pendingResolve && (
        <ResolveConfirmModal
          report={pendingResolve.report}
          onConfirm={handleConfirmResolve}
          onCancel={handleCancelResolve}
        />
      )}
    </div>
  );
}

function Stat({ label, value, accent = "#111827", bg = "rgba(255, 255, 255, 0.66)" }: { label: string; value: number; accent?: string; bg?: string }) {
  return (
    <div className="card" style={{ 
      padding: "16px 18px", 
      backgroundColor: bg, 
      display: "flex", flexDirection: "column", gap: "2px",
      position: "relative", overflow: "hidden",
      borderTop: `4px solid ${accent}`
    }}>
      <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: "28px", fontWeight: 800, color: "#111827", lineHeight: 1 }}>{value}</div>
    </div>
  );
}

// PostgREST range conditions per severity bucket, OR'd together when several
// are selected. `low` uses lt.4 (also excludes null/unscored rows).
const SEVERITY_FILTERS: Record<string, string> = {
  critical: "severity_score.gte.8",
  high: "and(severity_score.gte.6,severity_score.lt.8)",
  medium: "and(severity_score.gte.4,severity_score.lt.6)",
  low: "severity_score.lt.4",
};

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical (8–10)" },
  { value: "high", label: "High (6–7)" },
  { value: "medium", label: "Medium (4–5)" },
  { value: "low", label: "Low (1–3)" },
];

const cap = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** Colored status pill that doubles as the dropdown trigger (chevron appears on the chip). */
function StatusChipTrigger({ status, label, open }: { status: string; label: string; open: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: STATUS_COLORS[status] ?? "#999", color: "#fff",
      padding: "4px 9px 4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700,
      textTransform: "capitalize", whiteSpace: "nowrap",
    }}>
      {label}
      <span style={{ display: "flex", opacity: 0.85, transition: "transform 0.15s ease", transform: open ? "rotate(180deg)" : "none" }}>
        <ChevronDownIcon size={13} />
      </span>
    </span>
  );
}

function CategoryIcon({ category, size = 32 }: { category: string; size?: number }) {
  if (category === "safety") return <ShieldIcon size={size} />;
  if (category === "utility") return <DropletIcon size={size} />;
  return <WrenchIcon size={size} />;
}

const timeAgo = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};
const sosBadge: React.CSSProperties = { background: "var(--danger)", color: "#fff", padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700 };
const deptPill: React.CSSProperties = { background: "var(--primary-soft)", color: "var(--primary-dark)", padding: "2px 9px", borderRadius: 6, fontSize: 11, fontWeight: 600 };
const areaPill: React.CSSProperties = { background: "#F3F4F6", color: "#374151", padding: "2px 9px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "1px solid #E5E7EB" };

/**
 * Keeps the existing SOS → severity → recency ordering for all non-resolved issues,
 * then appends all resolved issues at the very end (sorted by recency within themselves).
 */
function sortWithResolvedLast(reports: import("../lib/supabase").Report[]) {
  const active = reports
    .filter((r) => r.status !== "resolved")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const resolved = reports
    .filter((r) => r.status === "resolved")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return [...active, ...resolved];
}

const KARACHI_AREAS = [
  "Agra Taj Colony", "Azizabad", "Bahadurabad", "Baldia Town", "Banaras Colony", "Bath Island", "Bihar Colony", 
  "Bin Qasim Town", "Boat Basin", "Buffer Zone", "Civil Lines", "Clifton", "DHA", "Dalmia", "Daryaabad", "Essa Nagri", 
  "Federal B Area", "Gadap Town", "Garden", "Gulistan-e-Johar", "Gulshan-e-Hadeed", "Gulshan-e-Iqbal", "Gulzar-e-Hijri", 
  "Hyderi", "Ibrahim Hyderi", "Kalri", "Karimabad", "Karsaz", "Khadda", "Kharadar", "Korangi", "Landhi", "Liaquatabad", 
  "Lyari", "Malir", "Malir Cantt", "Malir Halt", "Manghopir", "Metroville", "Mithadar", "Model Colony", 
  "Muhammad Ali Society", "Nazimabad", "North Nazimabad", "Nursery", "Orangi Town", "PECHS", "PIB Colony", "Pak Colony", 
  "Pehlwan Goth", "Qasba Colony", "Quaidabad", "Rehri Goth", "SITE Area", "Saddar", "Safoora Goth", "Sakhi Hassan", 
  "Scheme 33", "Shah Faisal Colony", "Shahrah-e-Faisal", "Shanti Nagar", "Steel Town", "Tariq Road", "Tipu Sultan"
];

