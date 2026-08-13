import {
  FiGrid,
  FiUsers,
  FiFlag,
  FiPackage,
  FiBarChart2,
  FiShield,
  FiSettings,
  FiUserCheck,
  FiBell,
  FiMap,
  FiAlertTriangle,
  FiHome,
} from "react-icons/fi";

// `feature` (nullable) ties a nav item to the governable permission system —
// IT can grant/revoke access per user (see /users -> "الصلاحيات"). Items
// without a `feature` (Users/Audit/Settings) stay hard-locked to the IT role.
export const NAV_ITEMS = [
  { to: "/", label: "لوحة التحكم", icon: FiGrid, roles: ["IT", "Administrator", "Assistant"], feature: null },
  { to: "/map", label: "الخريطة", icon: FiMap, roles: ["IT", "Administrator", "Assistant"], feature: "map" },
  { to: "/members", label: "الأعضاء", icon: FiUsers, roles: ["IT", "Administrator", "Assistant"], feature: "members" },
  { to: "/missions", label: "المهام", icon: FiFlag, roles: ["IT", "Administrator", "Assistant"], feature: "missions" },
  { to: "/inventory", label: "المخزون", icon: FiPackage, roles: ["IT", "Administrator", "Assistant"], feature: "inventory" },
  { to: "/hazards", label: "المخاطر", icon: FiAlertTriangle, roles: ["IT", "Administrator", "Assistant"], feature: "hazards" },
  { to: "/facilities", label: "المرافق", icon: FiHome, roles: ["IT", "Administrator", "Assistant"], feature: "facilities" },
  { to: "/announcements", label: "الإعلانات", icon: FiBell, roles: ["IT", "Administrator", "Assistant"], feature: "announcements" },
  { to: "/warnings-overview", label: "الإنذارات", icon: FiAlertTriangle, roles: ["IT", "Administrator"], feature: "members" },
  { to: "/reports", label: "التقارير", icon: FiBarChart2, roles: ["IT", "Administrator", "Assistant"], feature: "reports" },
  { to: "/users", label: "إدارة المستخدمين", icon: FiUserCheck, roles: ["IT"], feature: null },
  { to: "/audit", label: "سجل التدقيق", icon: FiShield, roles: ["IT"], feature: null },
  { to: "/settings", label: "الإعدادات", icon: FiSettings, roles: ["IT"], feature: null },
];

export const ROLE_LABELS = {
  IT: "تقنية المعلومات",
  Administrator: "مسؤول العمليات",
  Assistant: "مساعد",
};
