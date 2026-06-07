import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Switch, StyleSheet, ActivityIndicator, Image, Modal
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

const isFire = (subType: string) => subType === "fire";

export default function ReportScreen({ onDone }: { onDone?: () => void }) {
  const { t } = useT();
  const [category, setCategory] = useState<Category>("infrastructure");
  const [subType, setSubType] = useState("pothole");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const showError = (msg: string) => { setErrorMsg(msg); setErrorVisible(true); };
  
  const handleSuccessClose = () => {
    setSuccessVisible(false);
    reset();
    onDone?.();
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    const launch = perm.granted
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
    const result = await launch({ quality: 0.5, allowsEditing: false });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const reset = () => {
    setDescription("");
    setPhotoUri(null);
    setIsAnonymous(false);
  };

  const handleSubmit = async () => {
    if (!category || !subType) {
      showError("Please select a category and type.");
      return;
    }
    if (!description.trim()) {
      showError("Please provide a description of the issue.");
      return;
    }

    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showError(t("report.locationDenied"));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      const net = await NetInfo.fetch();
      
      const userArea = await AsyncStorage.getItem("user_area");
      const userAddress = await AsyncStorage.getItem("user_address");
      const userName = await AsyncStorage.getItem("user_name");
      const userPhone = await AsyncStorage.getItem("user_phone");
      const userNic = await AsyncStorage.getItem("user_nic");

      // Offline → queue (photo upload needs network, so defer it).
      if (!net.isConnected) {
        await enqueueReport({
          category, sub_type: subType, description,
          lat, lng, is_anonymous: isAnonymous,
          severity_score: ruleSeverity(subType),
          queued_at: new Date().toISOString(),
          area: userArea || "Unknown",
          address: userAddress || "",
          user_name: userName || "",
          user_phone: userPhone || "",
          user_nic: userNic || "",
        });
        setSuccessVisible(true);
        return;
      }

      await ensureSession();
      let photo_url: string | undefined;
      
      if (photoUri) {
        photo_url = await uploadPhoto(photoUri) ?? undefined;
        if (!photo_url) {
          showError("Could not upload the image. Please try again.");
          setLoading(false);
          return;
        }
      }

      await ensureSession();

      const { data, error } = await supabase
        .from("reports")
        .insert({
          category, sub_type: subType, description,
          lat, lng, photo_url, is_anonymous: isAnonymous,
          is_fire: isFire(subType),
          severity_score: isFire(subType) ? 10 : ruleSeverity(subType),
          area: userArea || "Unknown",
          address: userAddress || "",
          user_name: userName || "",
          user_phone: userPhone || "",
          user_nic: userNic || "",
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

      if (isFire(subType)) {
        // Trigger simulated webhook for Admin/Community notification
        supabase.functions
          .invoke("emergency-webhook", {
            body: { type: "fire", issue_id: data.id, lat, lng }
          })
          .catch(e => console.error("Emergency webhook failed", e));
      }

      setSuccessVisible(true);
    } catch (err: any) {
      showError(err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainWrapper}>
      <ScrollView style={[styles.container, isFire(subType) && styles.containerFire]} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t("report.title")}</Text>

        {/* Category Card */}
        <View style={[styles.card, isFire(subType) && styles.cardFire]}>
          <Text style={[styles.label, { paddingHorizontal: 16 }]}>{t("report.category")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollWrapper} contentContainerStyle={styles.scrollRow}>
            {(Object.keys(CATEGORIES) as Category[]).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, category === cat && (isFire(subType) ? styles.chipActiveFire : styles.chipActive)]}
                onPress={() => { setCategory(cat); setSubType(CATEGORIES[cat][0]); }}
                activeOpacity={0.7}
              >
                <Text style={category === cat ? styles.chipTextActive : styles.chipText}>
                  {t(`categories.${cat}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.label, { marginTop: 16, paddingHorizontal: 16 }]}>{t("report.subType")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollWrapper} contentContainerStyle={styles.scrollRow}>
            {CATEGORIES[category].map((st) => (
              <TouchableOpacity
                key={st}
                style={[
                  styles.chip, 
                  subType === st && (isFire(st) ? styles.chipActiveFire : styles.chipActive),
                  st === "fire" && subType !== "fire" && styles.chipOutlineFire
                ]}
                onPress={() => setSubType(st)}
                activeOpacity={0.7}
              >
                <Text style={[
                  subType === st ? styles.chipTextActive : styles.chipText,
                  st === "fire" && subType !== "fire" && styles.chipTextFire
                ]}>
                  {st === "fire" ? "🔥 Fire" : t(`subTypes.${st}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Details Card */}
        <View style={[styles.card, isFire(subType) && styles.cardFire, { padding: 16 }]}>
          <Text style={styles.label}>{t("report.description")}</Text>
          <View style={[styles.inputContainer, isFire(subType) && styles.inputContainerFire]}>
            <TextInput
              style={styles.input}
              multiline
              value={description}
              onChangeText={setDescription}
              placeholder={t("report.descriptionPlaceholder")}
              placeholderTextColor={theme.muted}
            />
          </View>

          <TouchableOpacity style={[styles.photoBtnCompact, isFire(subType) && styles.photoBtnFire]} onPress={pickPhoto} activeOpacity={0.7}>
            <Text style={styles.photoIconCompact}>📷</Text>
            <View style={styles.photoBtnTextContainer}>
              <Text style={styles.photoBtnText}>{photoUri ? "Photo Attached" : t("report.photo")}</Text>
              <Text style={styles.photoBtnSubtext}>{photoUri ? "Tap to change" : "Upload evidence"}</Text>
            </View>
          </TouchableOpacity>
          {photoUri && <Image source={{ uri: photoUri }} style={styles.previewCompact} />}
        </View>

        {/* Settings Card */}
        <View style={[styles.card, isFire(subType) && styles.cardFire, { marginBottom: 24, padding: 16 }]}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>{t("report.anonymous")}</Text>
              <Text style={styles.switchSubtext}>Hide my identity</Text>
            </View>
            <Switch value={isAnonymous} onValueChange={setIsAnonymous} trackColor={{ true: isFire(subType) ? theme.danger : theme.primary }} />
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Button */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity style={[styles.submitBtn, isFire(subType) && styles.submitBtnFire]} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitText}>{isFire(subType) ? "REPORT FIRE" : t("report.submit")}</Text>}
        </TouchableOpacity>
      </View>

      {/* Premium Success Modal */}
      <Modal visible={successVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBox}>
              <Text style={styles.modalIconText}>✅</Text>
            </View>
            <Text style={styles.modalTitle}>Success</Text>
            <Text style={styles.modalText}>Your report has been successfully submitted to city authorities.</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={handleSuccessClose} activeOpacity={0.8}>
              <Text style={styles.modalBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Premium Error Modal */}
      <Modal visible={errorVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Text style={styles.modalIconText}>⚠️</Text>
            </View>
            <Text style={[styles.modalTitle, { color: '#DC2626' }]}>Error</Text>
            <Text style={styles.modalText}>{errorMsg}</Text>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#DC2626' }]} onPress={() => setErrorVisible(false)} activeOpacity={0.8}>
              <Text style={styles.modalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: theme.bg },
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  containerFire: { backgroundColor: "#FEF2F2" },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 16, color: theme.text, letterSpacing: -0.5, paddingHorizontal: 4 },
  card: { backgroundColor: theme.card, borderRadius: 16, paddingVertical: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  cardFire: { borderColor: "#FECACA", borderWidth: 1 },
  label: { fontSize: 11, color: theme.muted, marginBottom: 8, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  scrollWrapper: { marginHorizontal: 0 },
  scrollRow: { gap: 8, paddingBottom: 4, paddingHorizontal: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: "#F3F4F6", height: 36, justifyContent: "center" },
  chipActive: { backgroundColor: theme.text },
  chipActiveFire: { backgroundColor: theme.danger },
  chipOutlineFire: { backgroundColor: "transparent", borderWidth: 1, borderColor: theme.danger },
  chipText: { color: theme.text, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#fff", fontSize: 13, fontWeight: "700" },
  chipTextFire: { color: theme.danger },
  inputContainer: { backgroundColor: "#F9FAFB", borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 0, marginBottom: 16 },
  inputContainerFire: { borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
  input: { padding: 12, fontSize: 14, height: 80, textAlignVertical: "top", color: theme.text },
  photoBtnCompact: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, borderStyle: "dashed" },
  photoBtnFire: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  photoIconCompact: { fontSize: 20, marginRight: 12 },
  photoBtnTextContainer: { flex: 1 },
  photoBtnText: { color: theme.text, fontSize: 14, fontWeight: "600" },
  photoBtnSubtext: { color: theme.muted, fontSize: 12 },
  previewCompact: { width: "100%", height: 120, borderRadius: 10, marginTop: 12 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switchLabel: { fontSize: 14, fontWeight: "600", color: theme.text },
  switchSubtext: { fontSize: 12, color: theme.muted, marginTop: 2 },
  stickyFooter: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, backgroundColor: theme.bg, borderTopWidth: 1, borderColor: theme.border },
  submitBtn: { backgroundColor: theme.primary, borderRadius: 12, height: 50, justifyContent: "center", alignItems: "center" },
  submitBtnFire: { backgroundColor: theme.danger },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "800", letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', backgroundColor: '#FAFAFA', borderRadius: 24, padding: 32, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  modalIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalIconText: { fontSize: 28 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#047857', marginBottom: 8, letterSpacing: -0.5 },
  modalText: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  modalBtn: { width: '100%', backgroundColor: '#047857', borderRadius: 14, height: 56, justifyContent: 'center', alignItems: 'center' },
  modalBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});
