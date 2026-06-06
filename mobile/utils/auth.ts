import { supabase } from "./supabase";

// Ensure every device has a session. Anonymous sign-in gives a real auth.uid()
// that satisfies RLS, anchors per-device spam control, and works offline after
// the first successful sign-in (session is persisted in AsyncStorage).
export const ensureSession = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) return data.session.user.id;

  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn("anonymous sign-in failed:", error.message);
    return null;
  }
  return anon.user?.id ?? null;
};

// Optional trust-boost: link a phone number to the anonymous account later.
export const startPhoneVerify = (phone: string) =>
  supabase.auth.updateUser({ phone });

export const confirmPhoneVerify = (phone: string, token: string) =>
  supabase.auth.verifyOtp({ phone, token, type: "phone_change" });
