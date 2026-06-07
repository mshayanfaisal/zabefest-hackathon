import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ShieldIcon } from "../components/icons";

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
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: "#f1f5f9",
      fontFamily: "Inter, sans-serif"
    }}>
      <div style={{
        background: "#ffffff", borderRadius: 12, padding: "40px", width: "100%", maxWidth: 380,
        display: "flex", flexDirection: "column",
        border: "1px solid #eaeaea",
        boxShadow: "0 4px 14px 0 rgba(0,0,0,0.05)"
      }}>
        
        {/* Header with Green Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32, gap: 12 }}>
          <div style={{
            background: "#16734d10", color: "#16734d",
            width: 44, height: 44, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid #16734d20"
          }}>
            <ShieldIcon size={20} />
          </div>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ margin: 0, fontSize: 24, color: "#16734d", fontWeight: 700, letterSpacing: "-0.04em" }}>
              KarachiPulse
            </h1>
            <p style={{ margin: "6px 0 0", color: "#0f172a", fontSize: 14, fontWeight: 600 }}>
              Authority Admin Console
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Email Address</label>
            <input 
              type="email" placeholder="admin@kp.dev" value={email}
              onChange={(e) => setEmail(e.target.value)} required 
              style={{
                height: 40, padding: "0 12px", borderRadius: 6, border: "1px solid #eaeaea", 
                fontSize: 14, color: "#0f172a", outline: "none", transition: "border-color 0.15s ease",
                background: "#fff", WebkitAppearance: "none", fontWeight: 500
              }}
              onFocus={e => { e.currentTarget.style.borderColor = "#16734d"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "#eaeaea"; }}
            />
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Password</label>
            <input 
              type="password" placeholder="••••••••" value={password}
              onChange={(e) => setPassword(e.target.value)} required 
              style={{
                height: 40, padding: "0 12px", borderRadius: 6, border: "1px solid #eaeaea", 
                fontSize: 14, color: "#0f172a", outline: "none", transition: "border-color 0.15s ease",
                background: "#fff", WebkitAppearance: "none", fontWeight: 500
              }}
              onFocus={e => { e.currentTarget.style.borderColor = "#16734d"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "#eaeaea"; }}
            />
          </div>

          {error && (
            <div style={{ color: "#e53e3e", fontSize: 13, fontWeight: 500, marginTop: "-4px" }}>
              {error}
            </div>
          )}

          <button 
            disabled={busy}
            style={{ 
              height: 40, borderRadius: 6, border: "none", 
              background: busy ? "#ccc" : "#16734d", 
              color: "#ffffff", fontWeight: 600, fontSize: 14, 
              cursor: busy ? "not-allowed" : "pointer", 
              marginTop: 4, transition: "background 0.15s ease"
            }}
            onMouseEnter={e => { if (!busy) e.currentTarget.style.background = "#0f5538"; }}
            onMouseLeave={e => { if (!busy) e.currentTarget.style.background = "#16734d"; }}
          >
            {busy ? "Sign In" : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link to="/public" style={{
            color: "#0f172a", fontSize: 13, textDecoration: "none", transition: "opacity 0.15s ease", fontWeight: 700
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            Public Dashboard
          </Link>
        </div>
      </div>
      
      {/* Global override to remove browser autofill blue background if possible */}
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px white inset !important;
            -webkit-text-fill-color: #0f172a !important;
        }
      `}</style>
    </div>
  );
}
