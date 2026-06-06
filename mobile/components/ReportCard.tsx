import { View, Text, Image, StyleSheet } from "react-native";
import { Report } from "../utils/types";
import { useT } from "../utils/i18n";
import { theme, STATUS_COLORS, CATEGORY_COLORS } from "../utils/theme";
import { severityColor } from "../utils/severity";
import VerifyButton from "./VerifyButton";

const timeAgo = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

export default function ReportCard({ report }: { report: Report }) {
  const { t } = useT();

  return (
    <View style={[styles.card, report.is_sos && styles.cardSos]}>
      {report.photo_url ? (
        <Image source={{ uri: report.photo_url }} style={styles.photo} />
      ) : null}

      <View style={styles.headerRow}>
        <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1 }}>
          {report.is_sos && <Text style={styles.sosBadge}>SOS</Text>}
          <Text style={styles.title}>
            {t(`subTypes.${report.sub_type}`)}
          </Text>
        </View>
        <View style={[styles.severity, { backgroundColor: severityColor(report.severity_score ?? undefined) }]}>
          <Text style={styles.severityText}>{report.severity_score ?? "–"}</Text>
        </View>
      </View>

      <Text style={[styles.category, { color: CATEGORY_COLORS[report.category] }]}>
        {t(`categories.${report.category}`)}
      </Text>

      {report.description ? <Text style={styles.desc}>{report.description}</Text> : null}

      {report.severity_reason ? (
        <Text style={styles.aiReason}>🤖 {report.severity_reason}</Text>
      ) : null}

      <View style={styles.footer}>
        <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[report.status] ?? "#999" }]}>
          <Text style={styles.statusText}>{t(`status.${report.status}`)}</Text>
        </View>
        <Text style={styles.meta}>{timeAgo(report.created_at)}</Text>
        <View style={{ flex: 1 }} />
        {!report.is_sos && (
          <VerifyButton reportId={report.id} initialCount={report.verification_count} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardSos: { borderColor: theme.danger, borderWidth: 2 },
  photo: { width: "100%", height: 160, borderRadius: 10, marginBottom: 10, backgroundColor: "#eee" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sosBadge: {
    backgroundColor: theme.danger,
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
    overflow: "hidden",
  },
  title: { fontSize: 16, fontWeight: "700", color: theme.text },
  severity: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  severityText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  category: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  desc: { fontSize: 14, color: theme.text, marginTop: 6, lineHeight: 20 },
  aiReason: { fontSize: 12, color: theme.muted, marginTop: 6, fontStyle: "italic" },
  footer: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  meta: { fontSize: 12, color: theme.muted },
});
