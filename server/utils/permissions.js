// Feature-level permissions. Each feature has an access level per user:
//   "none"   - no access at all
//   "view"   - read-only
//   "manage" - full read/write
//
// A user's effective permission for a feature = their explicit override
// (user.permissions[feature]) if set, otherwise their role's default below.
//
// IT can never be restricted (matches the original role spec), and Users/
// Audit Log/Settings stay hard-locked to IT only — they are intentionally
// NOT part of this governable feature list, since exposing them as
// toggleable would let IT accidentally hand out audit-log or user-management
// access, which the system's security model treats as IT-exclusive.

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

const ALL_MANAGE = Object.fromEntries(FEATURES.map((f) => [f.key, "manage"]));

export const ROLE_DEFAULTS = {
  IT: ALL_MANAGE,
  Administrator: {
    map: "manage",
    members: "manage",
    missions: "manage",
    inventory: "manage",
    hazards: "manage",
    facilities: "manage",
    announcements: "manage",
    reports: "manage",
    ratings: "manage",
    surveys: "manage",
    documents: "manage",
  },
  Assistant: {
    map: "view",
    members: "view",
    missions: "view",
    inventory: "view",
    hazards: "view",
    facilities: "view",
    announcements: "view",
    reports: "none",
    ratings: "none",
    surveys: "none",
    // Assistants upload mission files/documents per the original role spec.
    documents: "manage",
  },
};

export function effectivePermissions(user) {
  const defaults = ROLE_DEFAULTS[user.role] || {};
  return { ...defaults, ...(user.permissions || {}) };
}

export function hasAccess(user, featureKey, level = "view") {
  if (user.role === "IT") return true;
  const perms = effectivePermissions(user);
  const val = perms[featureKey] || "none";
  if (level === "view") return val === "view" || val === "manage";
  if (level === "manage") return val === "manage";
  return false;
}
