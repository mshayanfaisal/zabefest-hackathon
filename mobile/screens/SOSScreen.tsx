import { useState } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet, Vibration } from "react-native";
import * as Location from "expo-location";
import { supabase } from "../utils/supabase";
import { ensureSession } from "../utils/auth";
import { useT } from "../utils/i18n";
import { theme } from "../utils/theme";

export default function SOSScreen() {
  const { t } = useT();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    setSending(true);
    Vibration.vibrate([0, 400, 150, 400]);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("report.locationDenied"));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      await ensureSession();

      const { data, error } = await supabase
        .from("reports")
        .insert({
          category: "safety",
          sub_type: "sos",
          description: "EMERGENCY SOS — immediate assistance required",
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          is_sos: true,
          severity_score: 10,
        })
        .select()
        .single();
      if (error) throw error;

      setSent(true);
      Alert.alert(t("sos.sent"));
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message ?? String(err));
    } finally {
      setSending(false);
    }
  };

  const confirm = () => {
    Alert.alert(t("sos.title"), t("sos.confirm"), [
      { text: t("sos.cancel"), style: "cancel" },
      { text: t("sos.send"), style: "destructive", onPress: send },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("sos.title")}</Text>
      <Text style={styles.subtitle}>{t("sos.subtitle")}</Text>

      <TouchableOpacity
        style={[styles.sosBtn, (sending || sent) && styles.sosBtnDisabled]}
        onPress={confirm}
        disabled={sending || sent}
        activeOpacity={0.8}
      >
        <Text style={styles.sosBtnText}>{sent ? "✓" : t("sos.button")}</Text>
      </TouchableOpacity>

      {sent ? <Text style={styles.sentNote}>{t("sos.sentNote")}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: theme.bg },
  title: { fontSize: 26, fontWeight: "800", marginBottom: 12, color: theme.danger },
  subtitle: { fontSize: 14, color: theme.muted, textAlign: "center", marginBottom: 48, lineHeight: 22 },
  sosBtn: { width: 210, height: 210, borderRadius: 105, backgroundColor: theme.danger, alignItems: "center", justifyContent: "center", borderWidth: 8, borderColor: "#e74c3c", elevation: 6, shadowColor: "#c0392b", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  sosBtnDisabled: { backgroundColor: "#888", borderColor: "#aaa" },
  sosBtnText: { color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "center", paddingHorizontal: 16 },
  sentNote: { marginTop: 28, fontSize: 14, color: theme.primary, textAlign: "center", lineHeight: 22, paddingHorizontal: 20 },
});
