export type Category = "infrastructure" | "safety" | "utility";

export const CATEGORIES: Record<Category, string[]> = {
  infrastructure: ["pothole", "garbage", "streetlight", "sewerage"],
  safety: ["unsafe_zone", "harassment", "disaster"],
  utility: ["water", "load_shedding"],
};

export type Report = {
  id: string;
  category: Category;
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
  created_at: string;
};
