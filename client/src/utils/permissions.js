export const FEATURES = [
  { key: "map", label: "الخريطة" },
  { key: "members", label: "الأعضاء" },
  { key: "missions", label: "المهام" },
  { key: "inventory", label: "المخزون" },
  { key: "hazards", label: "المخاطر" },
  { key: "facilities", label: "المرافق" },
  { key: "announcements", label: "الإعلانات" },
  { key: "reports", label: "التقارير" },
  { key: "ratings", label: "تقييم الأعضاء" },
  { key: "surveys", label: "استبيانات المهام" },
  { key: "documents", label: "مستندات الأعضاء" },
];

// user.permissions is the already-merged effective permission map returned
// by the backend on login/me (role defaults + that user's explicit overrides).
export function can(user, featureKey, level = "view") {
  if (!user) return false;
  if (user.role === "IT") return true;
  const val = user.permissions?.[featureKey] || "none";
  if (level === "view") return val === "view" || val === "manage";
  if (level === "manage") return val === "manage";
  return false;
}
