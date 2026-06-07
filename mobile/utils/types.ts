export type Category = "infrastructure" | "safety" | "utility";

export const CATEGORIES: Record<Category, string[]> = {
  infrastructure: ["pothole", "garbage", "streetlight", "sewerage"],
  safety: ["unsafe_zone", "harassment", "disaster", "fire"],
  utility: ["water", "load_shedding", "gas"],
};

export type Report = {
  id: string;
  category: Category;
  sub_type: string;
  description: string | null;
  area?: string;
  address?: string;
  user_name?: string;
  user_phone?: string;
  user_nic?: string;
  photo_url: string | null;
  lat: number;
  lng: number;
  severity_score: number | null;
  severity_reason: string | null;
  department: string | null;
  status: string;
  verification_count: number;
  is_sos: boolean;
  is_fire: boolean;
  created_at: string;
};
