import { useState } from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { supabase } from "../utils/supabase";
import { ensureSession } from "../utils/auth";
import { useT } from "../utils/i18n";
import { theme } from "../utils/theme";

export default function VerifyButton({
  reportId,
  initialCount,
}: {
  reportId: string;
  initialCount: number;
}) {
  const { t } = useT();
  const [count, setCount] = useState(initialCount);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleVerify = async () => {
    if (verified || busy) return;
    setBusy(true);
    const uid = await ensureSession();
    // The DB trigger bumps reports.verification_count; we just insert.
    const { error } = await supabase
      .from("verifications")
      .insert({ report_id: reportId, user_id: uid });
    setBusy(false);
    if (!error) {
      setVerified(true);
      setCount((c) => c + 1);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.btn, verified && styles.btnVerified]}
      onPress={handleVerify}
      disabled={verified || busy}
    >
      <Text style={[styles.text, verified && styles.textVerified]}>
        {verified ? `Acknowledged · ${count}` : `Acknowledge · ${count}`}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: "#fff",
  },
  btnVerified: { backgroundColor: "#e8f5e9", borderColor: theme.primary },
  text: { fontSize: 13, color: theme.text, fontWeight: "600" },
  textVerified: { color: theme.primary },
});
