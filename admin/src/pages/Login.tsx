import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message);
    else nav("/");
  };

  return (
    <div style={styles.wrap}>
      <form onSubmit={submit} style={styles.card}>
        <h1 style={styles.brand}>KarachiPulse</h1>
        <p style={styles.sub}>Authority Admin Console</p>
        <input style={styles.input} type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <input style={styles.input} type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)} required />
        {error && <p style={styles.err}>{error}</p>}
        <button style={styles.btn} disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <Link to="/public" style={styles.link}>View public dashboard →</Link>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f2e22" },
  card: { background: "#fff", borderRadius: 16, padding: 36, width: 360, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.25)" },
  brand: { margin: 0, fontSize: 28, color: "#1a6b4a", fontWeight: 800 },
  sub: { margin: "0 0 12px", color: "#6b7672", fontSize: 14 },
  input: { padding: "12px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14 },
  btn: { padding: "12px 14px", borderRadius: 8, border: "none", background: "#1a6b4a", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 4 },
  err: { color: "#c0392b", fontSize: 13, margin: 0 },
  link: { textAlign: "center", color: "#2980b9", fontSize: 13, marginTop: 8, textDecoration: "none" },
};
