import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { supabase, CATEGORY_COLORS, STATUS_COLORS } from "../lib/supabase";
import PageHeader from "../components/PageHeader";

const COLORS = ["#16734d", "#e6862e", "#d64545", "#2980b9", "#8e44ad", "#27ae60"];

export default function Analytics() {
  const [byCategory, setByCategory] = useState<{ name: string; value: number }[]>([]);
  const [byStatus, setByStatus] = useState<{ name: string; value: number }[]>([]);
  const [stats, setStats] = useState({ total: 0, resolved: 0, sos: 0, avgSeverity: 0 });

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.from("reports").select("category,status,severity_score,is_sos").neq("status", "duplicate");
      if (!data) return;
      const cat: Record<string, number> = {};
      const stat: Record<string, number> = {};
      let sevSum = 0, sevCount = 0, resolved = 0, sos = 0;
      data.forEach((r) => {
        cat[r.category] = (cat[r.category] ?? 0) + 1;
        stat[r.status] = (stat[r.status] ?? 0) + 1;
        if (r.severity_score) { sevSum += r.severity_score; sevCount++; }
        if (r.status === "resolved") resolved++;
        if (r.is_sos) sos++;
      });
      setByCategory(Object.entries(cat).map(([name, value]) => ({ name, value })));
      setByStatus(Object.entries(stat).map(([name, value]) => ({ name, value })));
      setStats({ total: data.length, resolved, sos, avgSeverity: sevCount ? Math.round((sevSum / sevCount) * 10) / 10 : 0 });
    };
    run();
  }, []);

  return (
    <div style={{ padding: 28, maxWidth: 1100, margin: "0 auto" }}>
      <PageHeader title="Analytics" subtitle="Civic issue trends across Karachi" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <Stat label="Total Reports" value={stats.total} />
        <Stat label="Resolved" value={stats.resolved} color="#27ae60" />
        <Stat label="Active SOS" value={stats.sos} color="var(--danger)" />
        <Stat label="Avg Severity" value={stats.avgSeverity} color="var(--warn)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card title="Reports by category">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byCategory}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} /><Tooltip />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {byCategory.map((c) => <Cell key={c.name} fill={CATEGORY_COLORS[c.name] ?? "#16734d"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Reports by status">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {byStatus.map((s, i) => <Cell key={s.name} fill={STATUS_COLORS[s.name] ?? COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, color = "var(--text)" }: { label: string; value: number; color?: string }) {
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: 32, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <h2 style={{ fontSize: 16, marginTop: 0, marginBottom: 14 }}>{title}</h2>
      {children}
    </div>
  );
}
