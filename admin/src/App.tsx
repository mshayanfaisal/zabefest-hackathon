import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase, isConfigured } from "./lib/supabase";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import IssueQueue from "./pages/IssueQueue";
import HeatmapView from "./pages/HeatmapView";
import Analytics from "./pages/Analytics";
import SOSAlerts from "./pages/SOSAlerts";
import PublicDashboard from "./pages/PublicDashboard";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isConfigured) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f2e22", padding: 24 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 36, maxWidth: 560, lineHeight: 1.6 }}>
          <h1 style={{ color: "#1a6b4a", marginTop: 0 }}>KarachiPulse — setup needed</h1>
          <p>The admin app can't find its Supabase credentials, so it has nothing to connect to.</p>
          <p>Create <code>admin/.env</code> with:</p>
          <pre style={{ background: "#f4f7f5", padding: 16, borderRadius: 8, overflowX: "auto" }}>{`VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY`}</pre>
          <p>Then restart the dev server (<code>npm run dev</code>). Find both values in your Supabase dashboard under <strong>Settings → API</strong>.</p>
        </div>
      </div>
    );
  }

  if (!ready) return <div style={{ padding: 40 }}>Loading…</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" /> : <Login />} />
        <Route path="/public" element={<PublicDashboard />} />

        {session ? (
          <Route element={<Layout />}>
            <Route path="/" element={<IssueQueue />} />
            <Route path="/heatmap" element={<HeatmapView />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/sos" element={<SOSAlerts />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
