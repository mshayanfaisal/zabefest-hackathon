import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Report } from "../utils/types";
import { useT } from "../utils/i18n";
import { CATEGORY_COLORS } from "../utils/theme";
import VerifyButton from "./VerifyButton";

const theme = {
  danger: '#EF4444',
  primary: '#10B981',
};

export default function ReportCard({ report }: { report: Report }) {
  const { t } = useT();

  const timeAgo = (dateString: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
    if (diff < 60) return `${diff}m`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  const getSeverityDetails = (score: number, isSos: boolean) => {
    if (isSos || score >= 8) return { label: "Critical", bg: '#EF4444' };
    if (score >= 5) return { label: "High", bg: '#F97316' };
    if (score >= 3) return { label: "Medium", bg: '#EAB308' };
    return { label: "Low", bg: '#3B82F6' };
  };

  const severity = getSeverityDetails(report.severity_score, report.is_sos);

  return (
    <View style={styles.card}>
      {/* 1. Photo (Top) */}
      {report.photo_url ? (
        <Image source={{ uri: report.photo_url }} style={styles.photo} />
      ) : null}

      {/* 2. Title Row: Title + Severity */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t(`subTypes.${report.sub_type}`) || report.sub_type}</Text>
        <View style={[styles.severityBadge, { backgroundColor: severity.bg }]}>
          <Text style={styles.severityText}>{severity.label}</Text>
        </View>
      </View>

      {/* 3. Subtitle Row: Category + Location */}
      <View style={styles.subtitleRow}>
        <Text style={[styles.categoryText, report.category === "safety" && { color: theme.danger }]}>
           {t(`categories.${report.category}`)}
        </Text>
        <View style={styles.locationPill}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationText}>{report.area || "Unknown"}</Text>
        </View>
      </View>

      {/* 4. Description */}
      <Text style={styles.description} numberOfLines={2}>
        {report.description}
      </Text>

      {/* 5. Footer: Status, Time, Verify */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <View style={[styles.statusPill, report.status === 'resolved' && { backgroundColor: theme.primary }]}>
             <Text style={styles.statusText}>{report.status}</Text>
          </View>
          <Text style={styles.timeText}>{timeAgo(report.created_at)}</Text>
        </View>
        <VerifyButton reportId={report.id} initialCount={report.verification_count} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  photo: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#F3F4F6",
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EAB308',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locationIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  locationText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#9CA3AF',
  },
  statusText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
