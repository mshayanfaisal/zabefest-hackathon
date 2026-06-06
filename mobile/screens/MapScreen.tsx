import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { supabase } from "../utils/supabase";
import { Report } from "../utils/types";
import { useT } from "../utils/i18n";
import { theme } from "../utils/theme";
import MapWebView from "../components/MapWebView";

const FILTERS = ["all", "infrastructure", "safety", "utility"] as const;

export default function MapScreen() {
  const { t } = useT();
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  useEffect(() => {
    const fetch = async () => {
      let q = supabase.from("reports").select("*").neq("status", "duplicate").limit(200);
      if (filter !== "all") q = q.eq("category", filter);
      const { data } = await q;
      setReports((data as Report[]) ?? []);
    };
    fetch();
  }, [filter]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("map.title")}</Text>
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={filter === f ? styles.chipTextActive : styles.chipText}>
              {f === "all" ? t("common.all") : t(`categories.${f}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.map}>
        <MapWebView reports={reports} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  title: { fontSize: 24, fontWeight: "700", color: theme.text, padding: 16, paddingBottom: 8 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: "#fff" },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText: { color: theme.text, fontSize: 13 },
  chipTextActive: { color: "#fff", fontSize: 13, fontWeight: "600" },
  map: { flex: 1, margin: 16, marginTop: 0, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: theme.border },
});
