import { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, ScrollView } from "react-native";
import { supabase } from "../utils/supabase";
import { Report } from "../utils/types";
import { useT } from "../utils/i18n";
import { theme, CATEGORY_COLORS } from "../utils/theme";
import MapWebView from "../components/MapWebView";

const FILTERS = ["all", "infrastructure", "safety", "utility"] as const;
const { height } = Dimensions.get("window");

export default function MapScreen() {
  const { t } = useT();
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    const fetch = async () => {
      let q = supabase.from("reports").select("*").neq("status", "duplicate").limit(200);
      if (filter !== "all") q = q.eq("category", filter);
      const { data } = await q;
      setReports((data as Report[]) ?? []);
    };
    fetch();
  }, [filter]);

  const handlePinTap = (reportData: any) => {
    setSelectedReport(reportData);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setSelectedReport(null));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("map.title")}</Text>
      
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, filter === f && styles.chipActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
            >
              <Text style={filter === f ? styles.chipTextActive : styles.chipText}>
                {f === "all" ? t("common.all") : t(`categories.${f}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <View style={styles.map}>
        <MapWebView reports={reports} onPinTap={handlePinTap} />
      </View>
      
      {/* Bottom Sheet */}
      <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}>
        {selectedReport && (
          <>
            <View style={styles.sheetHandle} />
            <TouchableOpacity style={styles.closeButton} onPress={closeSheet}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.sheetContent}>
              <View style={styles.sheetHeader}>
                <View style={[styles.statusBadge, { backgroundColor: selectedReport.sos ? theme.danger : (CATEGORY_COLORS[selectedReport.c] || theme.primary) }]}>
                  <Text style={styles.statusText}>{selectedReport.sos ? "EMERGENCY" : "REPORTED"}</Text>
                </View>
                <Text style={styles.severityText}>Severity: {selectedReport.s}/10</Text>
              </View>
              <Text style={styles.sheetTitle}>{t(`subTypes.${selectedReport.t.split(' · ')[0]}`) || selectedReport.t.split(' · ')[0]}</Text>
              <Text style={styles.sheetSubtitle}>{selectedReport.t.split(' · ').slice(1).join(' · ')}</Text>
              <TouchableOpacity style={styles.actionButton} onPress={closeSheet}>
                <Text style={styles.actionButtonText}>Close Details</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  title: { fontSize: 24, fontWeight: "800", color: theme.text, padding: 16, paddingBottom: 8, letterSpacing: -0.5 },
  filterWrapper: { height: 48, marginBottom: 12 },
  filters: { gap: 8, paddingHorizontal: 16, alignItems: "center" },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: "#E5E7EB", height: 36, justifyContent: "center" },
  chipActive: { backgroundColor: theme.text },
  chipText: { color: theme.muted, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#fff", fontSize: 13, fontWeight: "700" },
  map: { flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden", backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  bottomSheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, shadowColor: "#000", shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20, zIndex: 100 },
  sheetHandle: { width: 40, height: 4, backgroundColor: theme.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  closeButton: { position: "absolute", top: 16, right: 16, padding: 8 },
  closeButtonText: { fontSize: 16, color: theme.muted, fontWeight: "600" },
  sheetContent: { gap: 8 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  severityText: { fontSize: 12, color: theme.muted, fontWeight: "600" },
  sheetTitle: { fontSize: 20, fontWeight: "700", color: theme.text },
  sheetSubtitle: { fontSize: 14, color: theme.muted, lineHeight: 20 },
  actionButton: { backgroundColor: theme.bg, padding: 14, borderRadius: 12, alignItems: "center", marginTop: 16 },
  actionButtonText: { color: theme.text, fontSize: 14, fontWeight: "700" }
});
