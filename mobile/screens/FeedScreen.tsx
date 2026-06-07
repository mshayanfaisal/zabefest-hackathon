import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, ScrollView, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../utils/supabase";
import { Report } from "../utils/types";
import { useT } from "../utils/i18n";
import { theme } from "../utils/theme";
import ReportCard from "../components/ReportCard";

export default function FeedScreen() {
  const { t } = useT();
  const [reports, setReports] = useState<Report[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [activeArea, setActiveArea] = useState<string>("All Areas");

  useEffect(() => {
    AsyncStorage.getItem("user_area").then((area) => {
      if (area) setActiveArea(area);
    });
  }, []);

  const displayedReports = reports.filter(r => {
    if (activeCategory !== "All") {
      if (activeCategory === "Infrastructure" && r.category !== "infrastructure") return false;
      if (activeCategory === "Public Safety" && r.category !== "safety") return false;
      if (activeCategory === "Utilities" && r.category !== "utility") return false;
    }
    if (activeArea !== "All Areas" && r.area !== activeArea) return false;
    return true;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const fetchReports = useCallback(async () => {
    const { data } = await supabase
      .from("reports")
      .select("id, category, sub_type, description, photo_url, lat, lng, severity_score, severity_reason, department, status, verification_count, is_sos, is_fire, created_at, area")
      .neq("status", "duplicate")
      .order("is_sos", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    setReports((data as Report[]) ?? []);
  }, []);

  useEffect(() => {
    fetchReports();
    const channel = supabase
      .channel("feed-reports")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setReports((prev) => [payload.new as Report, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setReports((prev) => prev.map((r) => (r.id === payload.new.id ? (payload.new as Report) : r)));
        } else if (payload.eventType === "DELETE") {
          setReports((prev) => prev.filter((r) => r.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchReports]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("feed.title")}</Text>

      <View style={{ marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillContainer}>
          {["All", "Infrastructure", "Public Safety", "Utilities"].map((cat) => (
            <TouchableOpacity 
              key={cat} 
              onPress={() => setActiveCategory(cat)}
              style={[styles.pill, activeCategory === cat ? styles.pillActive : styles.pillInactive]}
            >
              <Text style={[styles.pillText, activeCategory === cat ? styles.pillTextActive : styles.pillTextInactive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={{ marginBottom: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillContainer}>
          {[
            "All Areas",
            "Clifton", "DHA", "Saddar", "Civil Lines", "Kharadar", "Mithadar", "Garden", "Boat Basin", "Bath Island",
            "Gulshan-e-Iqbal", "Gulistan-e-Johar", "Scheme 33", "PIB Colony", "Gulzar-e-Hijri", "Safoora Goth", "Pehlwan Goth", "Dalmia", "Karsaz", "Shanti Nagar", "Essa Nagri",
            "PECHS", "Bahadurabad", "Shahrah-e-Faisal", "Tipu Sultan", "Nursery", "Tariq Road", "Muhammad Ali Society",
            "Nazimabad", "North Nazimabad", "Federal B Area", "Liaquatabad", "Buffer Zone", "Hyderi", "Sakhi Hassan", "Karimabad", "Azizabad",
            "Orangi Town", "Baldia Town", "SITE Area", "Qasba Colony", "Banaras Colony", "Pak Colony", "Metroville", "Manghopir",
            "Korangi", "Landhi", "Shah Faisal Colony", "Model Colony", "Malir Halt", "Quaidabad",
            "Malir", "Malir Cantt", "Gadap Town", "Bin Qasim Town", "Ibrahim Hyderi", "Gulshan-e-Hadeed", "Steel Town", "Rehri Goth",
            "Lyari", "Kalri", "Agra Taj Colony", "Bihar Colony", "Khadda", "Daryaabad"
          ].map((area) => (
            <TouchableOpacity 
              key={area} 
              onPress={() => setActiveArea(area)}
              style={[styles.pillArea, activeArea === area ? styles.pillActiveArea : styles.pillInactive]}
            >
              <Text style={[styles.pillText, activeArea === area ? styles.pillTextActive : styles.pillTextInactive]}>{area}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={displayedReports}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <ReportCard report={item} />}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>{t("feed.empty")}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  title: { fontSize: 24, fontWeight: "700", color: theme.text, padding: 16, paddingBottom: 8 },
  empty: { textAlign: "center", color: theme.muted, marginTop: 60, paddingHorizontal: 32, lineHeight: 22 },
  pillContainer: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  pillArea: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  pillActive: { backgroundColor: '#047857' },
  pillActiveArea: { backgroundColor: theme.primary },
  pillInactive: { backgroundColor: '#e5e7eb' },
  pillText: { fontWeight: '600', fontSize: 13 },
  pillTextActive: { color: '#ffffff' },
  pillTextInactive: { color: '#374151' },
});
