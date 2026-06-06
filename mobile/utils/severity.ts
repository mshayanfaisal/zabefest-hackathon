// Mirrors the DB rule-based severity default (prepare_report()) for optimistic UI.
export const ruleSeverity = (subType: string, isSos = false): number => {
  if (isSos) return 10;
  if (["sewerage", "water", "harassment", "disaster"].includes(subType)) return 7;
  if (["pothole", "streetlight", "unsafe_zone"].includes(subType)) return 5;
  if (["garbage", "load_shedding"].includes(subType)) return 4;
  return 5;
};

export const severityColor = (score?: number): string => {
  if (!score) return "#888";
  if (score >= 8) return "#c0392b";
  if (score >= 6) return "#e67e22";
  if (score >= 4) return "#f1c40f";
  return "#27ae60";
};
