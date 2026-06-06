import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Report } from "../lib/supabase";
import PageHeader from "../components/PageHeader";
import Select from "../components/Select";
import { AlertIcon, MapPinIcon, ExternalLinkIcon } from "../components/icons";

export default function SOSAlerts() {
  const [alerts, setAlerts] = useState<Report[]>([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .eq("is_sos", true)
        .order("created_at", { ascending: false });
      setAlerts((data as Report[]) ?? []);
    };
    fetchAlerts();

    const channel = supabase
      .channel("sos-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reports", filter: "is_sos=eq.true" },
        (payload) => { setAlerts((prev) => [payload.new as Report, ...prev]); beep(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const beep = () => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "square"; osc.frequency.value = 880; gain.gain.value = 0.2;
      osc.start();
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.2);
      osc.stop(ctx.currentTime + 0.4);
    } catch { /* ignore */ }
  };

  const setStatus = async (id: string, status: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    await supabase.from("reports").update({ status }).eq("id", id);
  };

  const active = alerts.filter((a) => a.status !== "resolved");

  return (
    <div style={{ padding: 28, maxWidth: 900, margin: "0 auto" }}>
      <PageHeader
        title={<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><span style={{ display: "flex", color: "var(--danger)" }}><AlertIcon size={26} /></span>SOS Alerts</span>}
        subtitle={`${active.length} active emergency ${active.length === 1 ? "alert" : "alerts"} · live via Realtime`}
      />

      {alerts.length === 0 && <p style={{ color: "var(--muted)" }}>No SOS alerts.</p>}
      {alerts.map((a) => (
        <div key={a.id} className="card" style={{
          border: "2px solid var(--danger)", padding: 20, marginBottom: 14,
          background: a.status === "resolved" ? "#fff" : "var(--danger-soft)",
          opacity: a.status === "resolved" ? 0.65 : 1,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ color: "var(--danger)", fontSize: 17, letterSpacing: "0.02em" }}>EMERGENCY SOS</strong>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{new Date(a.created_at).toLocaleString()}</span>
          </div>
          <p style={{ margin: "10px 0", fontSize: 14, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ display: "flex", color: "var(--danger)", flexShrink: 0 }}><MapPinIcon size={15} /></span>
            {a.lat.toFixed(5)}, {a.lng.toFixed(5)} ·{" "}
            <a href={`https://www.google.com/maps?q=${a.lat},${a.lng}`} target="_blank" rel="noreferrer" style={{ color: "#2980b9", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
              Open in Google Maps <ExternalLinkIcon size={13} />
            </a>
          </p>
          <Select
            ariaLabel="Change SOS status"
            minWidth={180}
            value={a.status}
            onChange={(v) => setStatus(a.id, v)}
            options={[
              { value: "pending", label: "Pending" },
              { value: "assigned", label: "Assigned" },
              { value: "in_progress", label: "In Progress" },
              { value: "resolved", label: "Resolved" },
            ]}
          />
        </div>
      ))}
    </div>
  );
}
