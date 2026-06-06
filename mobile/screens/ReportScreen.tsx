import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Switch, Alert, StyleSheet, ActivityIndicator, Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import NetInfo from "@react-native-community/netinfo";
import { supabase } from "../utils/supabase";
import { ensureSession } from "../utils/auth";
import { enqueueReport } from "../utils/offlineQueue";
import { uploadPhoto } from "../utils/photo";
import { ruleSeverity } from "../utils/severity";
import { CATEGORIES, Category } from "../utils/types";
import { useT } from "../utils/i18n";
import { theme } from "../utils/theme";

export default function ReportScreen({ onDone }: { onDone?: () => void }) {
  const { t } = useT();
  const [category, setCategory] = useState<Category>("infrastructure");
  const [subType, setSubType] = useState("pothole");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    const launch = perm.granted
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
    const result = await launch({ quality: 0.5, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const reset = () => {
    setDescription("");
    setPhotoUri(null);
    setIsAnonymous(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("report.locationDenied"));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      const net = await NetInfo.fetch();

      // Offline → queue (photo upload needs network, so defer it).
      if (!net.isConnected) {
        await enqueueReport({
          category, sub_type: subType, description,
          lat, lng, is_anonymous: isAnonymous,
          severity_score: ruleSeverity(subType),
          queued_at: new Date().toISOString(),
        });
        Alert.alert(t("report.queued"));
        reset();
        onDone?.();
        return;
      }

      await ensureSession();
      let photo_url: string | undefined;
      if (photoUri) photo_url = (await uploadPhoto(photoUri)) ?? undefined;

      const { data, error } = await supabase
        .from("reports")
        .insert({
          category, sub_type: subType, description,
          lat, lng, photo_url, is_anonymous: isAnonymous,
        })
        .select()
        .single();
      if (error) throw error;

      // Fire-and-forget AI severity scoring.
      supabase.functions
        .invoke("score-report", {
          body: { report_id: data.id, description, category, sub_type: subType },
        })
        .catch(() => {});

      Alert.alert(t("report.success"));
      reset();
      onDone?.();
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>{t("report.title")}</Text>

      <Text style={styles.label}>{t("report.category")}</Text>
      <View style={styles.row}>
        {(Object.keys(CATEGORIES) as Category[]).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, category === cat && styles.chipActive]}
            onPress={() => { setCategory(cat); setSubType(CATEGORIES[cat][0]); }}
          >
            <Text style={category === cat ? styles.chipTextActive : styles.chipText}>
              {t(`categories.${cat}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t("report.subType")}</Text>
      <View style={styles.row}>
        {CATEGORIES[category].map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.chip, subType === st && styles.chipActive]}
            onPress={() => setSubType(st)}
          >
            <Text style={subType === st ? styles.chipTextActive : styles.chipText}>
              {t(`subTypes.${st}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t("report.description")}</Text>
      <TextInput
        style={styles.input}
        multiline
        value={description}
        onChangeText={setDescription}
        placeholder={t("report.descriptionPlaceholder")}
        placeholderTextColor="#aaa"
      />

      <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.preview} />
        ) : (
          <Text style={styles.photoBtnText}>📷 {t("report.photo")}</Text>
        )}
      </TouchableOpacity>
      {photoUri ? <Text style={styles.photoAdded}>{t("report.photoAdded")}</Text> : null}

      <View style={styles.switchRow}>
        <Text style={styles.label}>{t("report.anonymous")}</Text>
        <Switch value={isAnonymous} onValueChange={setIsAnonymous} trackColor={{ true: theme.primary }} />
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>{t("report.submit")}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: theme.bg },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8, color: theme.text },
  label: { fontSize: 14, color: theme.muted, marginTop: 14, marginBottom: 8, fontWeight: "600" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: theme.border, backgroundColor: "#fff" },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText: { color: theme.text, fontSize: 13 },
  chipTextActive: { color: "#fff", fontSize: 13, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 96, textAlignVertical: "top", backgroundColor: "#fff", color: theme.text },
  photoBtn: { borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 14, alignItems: "center", marginTop: 14, borderStyle: "dashed", backgroundColor: "#fff", overflow: "hidden" },
  photoBtnText: { color: theme.muted, fontSize: 14 },
  preview: { width: "100%", height: 180, borderRadius: 8 },
  photoAdded: { color: theme.primary, fontSize: 12, marginTop: 6, fontWeight: "600" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  submitBtn: { backgroundColor: theme.primary, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 22 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
