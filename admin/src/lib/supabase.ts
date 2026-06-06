import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Whether the app has real credentials. App.tsx shows a setup screen if not,
// instead of letting createClient throw (which white-screens the whole app).
export const isConfigured = Boolean(url && anonKey);

export const supabase = createClient(
  url || "http://localhost:54321",
  anonKey || "placeholder-anon-key",
);

export type Report = {
  id: string;
  category: "infrastructure" | "safety" | "utility";
  sub_type: string;
  description: string | null;
  photo_url: string | null;
  lat: number;
  lng: number;
  severity_score: number | null;
  severity_reason: string | null;
  department: string | null;
  status: string;
  verification_count: number;
  is_sos: boolean;
  is_anonymous: boolean;
  created_at: string;
};

export const STATUS_ORDER = [
  "pending", "verified", "assigned", "in_progress", "resolved", "rejected",
];

export const STATUS_COLORS: Record<string, string> = {
  pending: "#95a5a6",
  verified: "#2980b9",
  assigned: "#8e44ad",
  in_progress: "#e67e22",
  resolved: "#27ae60",
  rejected: "#7f8c8d",
  duplicate: "#bdc3c7",
};

export const CATEGORY_COLORS: Record<string, string> = {
  infrastructure: "#e67e22",
  safety: "#c0392b",
  utility: "#2980b9",
};

export const severityColor = (score?: number | null): string => {
  if (!score) return "#888";
  if (score >= 8) return "#c0392b";
  if (score >= 6) return "#e67e22";
  if (score >= 4) return "#f1c40f";
  return "#27ae60";
};
