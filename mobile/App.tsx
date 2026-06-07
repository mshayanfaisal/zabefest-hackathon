import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform, StatusBar } from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { ensureSession } from "./utils/auth";
import { initOfflineSync, flushQueue } from "./utils/offlineQueue";
import { useT, toggleLocale } from "./utils/i18n";
import { theme } from "./utils/theme";
import FeedScreen from "./screens/FeedScreen";
import ReportScreen from "./screens/ReportScreen";
import MapScreen from "./screens/MapScreen";
import SOSScreen from "./screens/SOSScreen";
import { Feather } from '@expo/vector-icons';

type Tab = "feed" | "report" | "map" | "sos";
const TABS: { key: Tab; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "feed", icon: "list" },
  { key: "report", icon: "plus-circle" },
  { key: "map", icon: "map" },
  { key: "sos", icon: "alert-triangle" },
];

export default function App() {
  const { t, locale, isRTL } = useT();
  const [tab, setTab] = useState<Tab>("feed");

  useEffect(() => {
    ensureSession();
    flushQueue();
    const sub = initOfflineSync();
    return () => sub();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ExpoStatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.brand}>{t("app.name")}</Text>
        <TouchableOpacity style={styles.langBtn} onPress={toggleLocale}>
          <Text style={styles.langText}>{locale === "ur" ? "EN" : "اردو"}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.body, isRTL && { direction: "rtl" }]}>
        {tab === "feed" && <FeedScreen />}
        {tab === "report" && <ReportScreen onDone={() => setTab("feed")} />}
        {tab === "map" && <MapScreen />}
        {tab === "sos" && <SOSScreen />}
      </View>

      <View style={styles.tabBar}>
        {TABS.map((item) => (
          <TouchableOpacity key={item.key} style={styles.tabItem} onPress={() => setTab(item.key)}>
            <Feather 
              name={item.icon} 
              size={24} 
              color={item.key === "sos" ? theme.danger : (tab === item.key ? theme.primary : theme.muted)} 
            />
            <Text
              style={[
                styles.tabLabel,
                tab === item.key && styles.tabLabelActive,
                item.key === "sos" && styles.tabLabelSos,
              ]}
            >
              {t(`tabs.${item.key}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: theme.primary, paddingHorizontal: 16, paddingVertical: 14 },
  brand: { color: "#fff", fontSize: 20, fontWeight: "800" },
  langBtn: { borderWidth: 1, borderColor: "rgba(255,255,255,0.6)", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5 },
  langText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  body: { flex: 1 },
  tabBar: { flexDirection: "row", backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: theme.border, paddingBottom: Platform.OS === "ios" ? 24 : 12, paddingTop: 12 },
  tabItem: { flex: 1, alignItems: "center" },
  tabLabel: { fontSize: 11, color: theme.muted, marginTop: 4, fontWeight: "500" },
  tabLabelActive: { color: theme.primary, fontWeight: "700" },
  tabLabelSos: { color: theme.danger, fontWeight: "700" },
});
