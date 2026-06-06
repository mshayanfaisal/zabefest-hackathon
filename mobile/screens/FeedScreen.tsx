import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { supabase } from "../utils/supabase";
import { Report } from "../utils/types";
import { useT } from "../utils/i18n";
import { theme } from "../utils/theme";
import ReportCard from "../components/ReportCard";

export default function FeedScreen() {
  const { t } = useT();
  const [reports, setReports] = useState<Report[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = useCallback(async () => {
    const { data } = await supabase
      .from("reports")
      .select("*")
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
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, fetchReports)
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
      <FlatList
        data={reports}
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
});
