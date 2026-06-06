import { File } from "expo-file-system";
import { supabase } from "./supabase";

// Reliable Expo → Supabase Storage upload. FormData uploads silently produce
// 0-byte files in Expo; the SDK 56 File API reads the local URI straight to an
// ArrayBuffer, which Supabase Storage accepts directly.
export const uploadPhoto = async (uri: string): Promise<string | null> => {
  try {
    const ext = (uri.split(".").pop() || "jpg").toLowerCase().split("?")[0];
    const contentType = ext === "png" ? "image/png" : "image/jpeg";
    const filename = `${Date.now()}-${Math.floor(performance.now())}.${ext}`;

    const buffer = await new File(uri).arrayBuffer();

    const { error } = await supabase.storage
      .from("report-photos")
      .upload(filename, buffer, { contentType, upsert: false });

    if (error) {
      console.warn("photo upload failed:", error.message);
      return null;
    }

    const { data } = supabase.storage.from("report-photos").getPublicUrl(filename);
    return data.publicUrl;
  } catch (e) {
    console.warn("photo upload error:", e);
    return null;
  }
};
