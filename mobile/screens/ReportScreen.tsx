import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Switch, StyleSheet, ActivityIndicator, Image, Modal, Platform
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
import { KARACHI_EXHAUSTIVE_DATA } from "../utils/karachi_data";
import CascadingLocationSelector from "../components/CascadingLocationSelector";

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
  
  const [incidentDistrict, setIncidentDistrict] = useState("");
  const [incidentTown, setIncidentTown] = useState("");
  const [incidentArea, setIncidentArea] = useState("");
  const [incidentAddress, setIncidentAddress] = useState("");
  
  const [gpsLocation, setGpsLocation] = useState<{lat: number, lng: number} | null>(null);
  const [gpsFetching, setGpsFetching] = useState(true);
  
  const [locationSelectorVisible, setLocationSelectorVisible] = useState(false);

  useEffect(() => {
    const loadDefaultLocation = async () => {
      const area = await AsyncStorage.getItem("user_area");
      const address = await AsyncStorage.getItem("user_address");
      if (area) {
        setIncidentArea(area);
        for (const d of KARACHI_EXHAUSTIVE_DATA) {
          for (const t of d.towns) {
            if (t.areas.includes(area)) {
              setIncidentDistrict(d.district);
              setIncidentTown(t.name);
            }
          }
        }
      }
      if (address) setIncidentAddress(address);
    };
    loadDefaultLocation();
    fetchGpsLocation();
  }, []);

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

  const fetchGpsLocation = async () => {
    setGpsFetching(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsLocation(null);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setGpsLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch (e: any) {
      setGpsLocation(null);
    } finally {
      setGpsFetching(false);
    }
  };

  const handleSubmit = async () => {
    if (!category || !subType) {
      showError("Please select a category and type.");
      return;
    }
    if (!incidentArea) {
      showError("Please select your neighborhood area context.");
      return;
    }
    if (!description.trim()) {
      showError("Please provide a description of the issue.");
      return;
    }

    setLoading(true);
    try {
      let finalLat = gpsLocation?.lat || 0;
      let finalLng = gpsLocation?.lng || 0;

      // Fallback if GPS wasn't caught
      if (!gpsLocation) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          finalLat = loc.coords.latitude;
          finalLng = loc.coords.longitude;
        }
      }

      const net = await NetInfo.fetch();
      
      const userName = await AsyncStorage.getItem("user_name");
      const userPhone = await AsyncStorage.getItem("user_phone");
      const userNic = await AsyncStorage.getItem("user_nic");
      
      const payload = {
        category, sub_type: subType, description,
        lat: finalLat, lng: finalLng, // Legacy columns
        area: incidentArea, address: incidentAddress, // Legacy columns
        selected_neighborhood_id: incidentArea, // Using the string name for now as context
        user_manual_address: incidentAddress,
        incident_lat: finalLat,
        incident_lng: finalLng,
        is_anonymous: isAnonymous,
        severity_score: isFire(subType) ? 10 : ruleSeverity(subType),
        user_name: userName || "",
        user_phone: userPhone || "",
        user_nic: userNic || "",
        is_fire: isFire(subType)
      };

      if (!net.isConnected) {
        await enqueueReport({ ...payload, queued_at: new Date().toISOString() });
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
        .insert({ ...payload, photo_url })
        .select()
        .single();
      if (error) throw error;

      supabase.functions
        .invoke("score-report", {
          body: { report_id: data.id, description, category, sub_type: subType },
        })
        .catch(() => {});

      if (isFire(subType)) {
        supabase.functions
          .invoke("emergency-webhook", {
            body: { type: "fire", issue_id: data.id, lat: finalLat, lng: finalLng }
          })
          .catch(() => {});
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
      <Text style={styles.mainTitle}>Report an Issue</Text>
      <ScrollView style={[styles.container, isFire(subType) && styles.containerFire]} contentContainerStyle={styles.scrollContent}>
        
        {/* Category Card */}
        <View style={[styles.modernCard, isFire(subType) && styles.cardFire]}>
          <Text style={styles.modernLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow}>
            {(Object.keys(CATEGORIES) as Category[]).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.modernChip, category === cat && (isFire(subType) ? styles.chipActiveFire : styles.chipActive)]}
                onPress={() => { setCategory(cat); setSubType(CATEGORIES[cat][0]); }}
                activeOpacity={0.7}
              >
                <Text style={category === cat ? styles.chipTextActive : styles.chipText}>
                  {t(`categories.${cat}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.modernLabel, { marginTop: 20 }]}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow}>
            {CATEGORIES[category].map((st) => (
              <TouchableOpacity
                key={st}
                style={[
                  styles.modernChip, 
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

        {/* Dual-Location Context Card */}
        <View style={[styles.modernCard, isFire(subType) && styles.cardFire]}>
          <Text style={styles.modernLabel}>Incident Location (Precision)</Text>
          
          <View style={styles.gpsContainer}>
            <View style={{ flex: 1 }}>
               <Text style={styles.gpsTitle}>Precision Coordinates</Text>
               {gpsFetching ? (
                 <Text style={styles.gpsTextFetching}>Acquiring GPS lock...</Text>
               ) : gpsLocation ? (
                 <Text style={styles.gpsTextSuccess}>Captured ✅ {gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)}</Text>
               ) : (
                 <Text style={styles.gpsTextError}>GPS Unavailable ❌</Text>
               )}
            </View>
            <TouchableOpacity onPress={fetchGpsLocation} style={styles.gpsRetakeBtn} activeOpacity={0.7}>
               <Text style={{ fontSize: 18 }}>🔄</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.modernLabel, { marginTop: 16 }]}>Neighborhood Context</Text>
          <View style={{ marginBottom: 16 }}>
             <TouchableOpacity style={styles.modernSelectBtn} onPress={() => setLocationSelectorVisible(true)} activeOpacity={0.8}>
               <Text style={incidentArea ? styles.dropdownText : styles.dropdownPlaceholder}>
                 {incidentArea ? `${incidentArea}, ${incidentTown}` : "Select Neighborhood Context"}
               </Text>
               <Text style={styles.dropdownChevron}>▼</Text>
             </TouchableOpacity>
          </View>

          <Text style={styles.modernLabel}>Detailed Address (Optional)</Text>
          <TextInput 
            style={[styles.modernInput, { height: 48 }]} 
            value={incidentAddress} 
            onChangeText={setIncidentAddress} 
            placeholder="Street, building..." 
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Details Card */}
        <View style={[styles.modernCard, isFire(subType) && styles.cardFire]}>
          <Text style={styles.modernLabel}>Describe the problem</Text>
          <TextInput
            style={[styles.modernInput, { height: 100, textAlignVertical: "top" }]}
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Provide context on the issue..."
            placeholderTextColor="#9CA3AF"
          />

          <TouchableOpacity style={[styles.photoBtn, isFire(subType) && styles.photoBtnFire]} onPress={pickPhoto} activeOpacity={0.7}>
            <Text style={styles.photoIcon}>📷</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.photoBtnText}>{photoUri ? "Photo Attached" : "Add Evidence"}</Text>
              <Text style={styles.photoBtnSubtext}>{photoUri ? "Tap to change image" : "Upload clear photo of the incident"}</Text>
            </View>
          </TouchableOpacity>
          {photoUri && <Image source={{ uri: photoUri }} style={styles.previewImage} />}
        </View>

        {/* Settings Card */}
        <View style={[styles.modernCard, isFire(subType) && styles.cardFire, { marginBottom: 16 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>Report anonymously</Text>
              <Text style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>Hide my identity</Text>
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
            : <Text style={styles.submitText}>{isFire(subType) ? "Report Emergency" : "Submit Report"}</Text>}
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <Modal visible={successVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBox}><Text style={styles.modalIconText}>✅</Text></View>
            <Text style={styles.modalTitle}>Success</Text>
            <Text style={styles.modalText}>Report successfully submitted to authorities.</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={handleSuccessClose} activeOpacity={0.8}>
              <Text style={styles.modalBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal visible={errorVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIconBox, { backgroundColor: '#FEE2E2' }]}><Text style={styles.modalIconText}>⚠️</Text></View>
            <Text style={[styles.modalTitle, { color: '#DC2626' }]}>Error</Text>
            <Text style={styles.modalText}>{errorMsg}</Text>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#DC2626' }]} onPress={() => setErrorVisible(false)} activeOpacity={0.8}>
              <Text style={styles.modalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={locationSelectorVisible} transparent animationType="fade">
        <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]}>
           <CascadingLocationSelector 
             onSelectArea={(area) => {
               setIncidentArea(area);
               for (const d of KARACHI_EXHAUSTIVE_DATA) {
                 for (const t of d.towns) {
                   if (t.areas.includes(area)) {
                     setIncidentDistrict(d.district);
                     setIncidentTown(t.name);
                   }
                 }
               }
               setLocationSelectorVisible(false);
             }}
             onClose={() => setLocationSelectorVisible(false)}
           />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#F3F4F6' },
  mainTitle: { fontSize: 24, fontWeight: "800", color: "#111827", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  containerFire: { backgroundColor: "#FEF2F2" },
  modernCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  cardFire: { borderColor: "#FECACA", borderWidth: 1, shadowColor: "#EF4444" },
  modernLabel: { fontSize: 11, fontWeight: "800", color: "#111827", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 },
  scrollRow: { gap: 10, paddingBottom: 4 },
  modernChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: "#F3F4F6", justifyContent: "center" },
  chipActive: { backgroundColor: "#111827" },
  chipActiveFire: { backgroundColor: "#EF4444" },
  chipOutlineFire: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#EF4444" },
  chipText: { color: "#4B5563", fontSize: 14, fontWeight: "600" },
  chipTextActive: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  chipTextFire: { color: "#EF4444" },
  
  gpsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 16 },
  gpsTitle: { fontSize: 11, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 },
  gpsTextFetching: { fontSize: 13, color: '#374151', fontWeight: '500' },
  gpsTextSuccess: { fontSize: 13, color: '#111827', fontWeight: '700' },
  gpsTextError: { fontSize: 13, color: '#DC2626', fontWeight: '700' },
  gpsRetakeBtn: { padding: 8, backgroundColor: 'transparent' },

  modernSelectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6', padding: 14 },
  dropdownText: { fontSize: 15, color: '#111827', fontWeight: '600' },
  dropdownPlaceholder: { fontSize: 15, color: '#9CA3AF' },
  dropdownChevron: { color: '#9CA3AF', fontSize: 12 },
  
  modernInput: { backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6', padding: 14, fontSize: 14, color: '#111827' },
  
  photoBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 16, borderStyle: "dashed", marginTop: 12 },
  photoBtnFire: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  photoIcon: { fontSize: 24, marginRight: 16 },
  photoBtnText: { color: "#111827", fontSize: 15, fontWeight: "700" },
  photoBtnSubtext: { color: "#6B7280", fontSize: 13, marginTop: 2 },
  previewImage: { width: "100%", height: 160, borderRadius: 12, marginTop: 16 },
  
  stickyFooter: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, backgroundColor: 'transparent' },
  submitBtn: { backgroundColor: "#115E59", borderRadius: 12, height: 50, justifyContent: "center", alignItems: "center" },
  submitBtnFire: { backgroundColor: "#EF4444" },
  submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 20, alignSelf: 'center' },
  modalIconText: { fontSize: 28 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#047857', marginBottom: 12, letterSpacing: -0.5, textAlign: 'center' },
  modalText: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  modalBtn: { width: '100%', backgroundColor: '#047857', borderRadius: 14, height: 56, justifyContent: 'center', alignItems: 'center' },
  modalBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});
