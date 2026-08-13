import express from "express";
import fs from "fs";
import path from "path";
import { readJSON, writeJSON, appendLog, DATA_DIR } from "../utils/store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { sanitizeInput } from "../utils/crudFactory.js";
import { hasAccess } from "../utils/permissions.js";

const router = express.Router();

router.get("/settings", requireAuth, (req, res) => {
  const fp = path.join(DATA_DIR, "settings.json");
  const raw = fs.existsSync(fp) ? fs.readFileSync(fp, "utf8") : "{}";
  res.json(JSON.parse(raw || "{}"));
});

router.put("/settings", requireAuth, requireRole("IT"), (req, res) => {
  const clean = sanitizeInput(req.body);
  if (!clean.ok) return res.status(400).json({ error: clean.error });
  const fp = path.join(DATA_DIR, "settings.json");
  fs.writeFileSync(fp, JSON.stringify(clean.value, null, 2));
  appendLog({
    username: req.user.username,
    role: req.user.role,
    action: "تعديل إعدادات النظام",
    module: "الإعدادات",
    recordId: null,
    oldValue: null,
    newValue: clean.value,
    result: "نجاح",
    ip: req.ip,
  });
  res.json({ ok: true });
});

// Dashboard aggregate stats - available to any authenticated user, but
// document/warning details are only included if the requester actually has
// permission to view those features — otherwise a restricted user could see
// sensitive data through the dashboard that their permissions block them
// from seeing directly.
router.get("/stats", requireAuth, (req, res) => {
  const allUsers = readJSON("users");
  const fullUser = allUsers.find((u) => u.id === req.user.id) || req.user;
  const canViewDocuments = hasAccess(fullUser, "documents", "view");
  const canViewMembers = hasAccess(fullUser, "members", "view");

  const members = readJSON("members");
  const missions = readJSON("missions");
  const inventory = readJSON("inventory");
  const ratings = readJSON("ratings");
  const documents = readJSON("documents");
  const warnings = readJSON("warnings");
  const announcements = readJSON("announcements").sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  const logs = readJSON("systemLogs");

  const activeMissions = missions.filter((m) => m.status === "قيد التنفيذ").length;
  const completedMissions = missions.filter((m) => m.status === "مكتملة").length;
  const pendingMissions = missions.filter((m) => m.status === "قيد الانتظار").length;

  const availableEquipment = inventory.filter((i) => i.status === "متاح").length;
  const maintenanceEquipment = inventory.filter((i) => i.status === "صيانة").length;

  const successRate = missions.length
    ? Math.round((completedMissions / missions.length) * 100)
    : 0;

  const avgRating =
    ratings.length > 0
      ? (
          ratings.reduce((sum, r) => sum + (Number(r.overall) || 0), 0) / ratings.length
        ).toFixed(1)
      : "0.0";

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const memberById = Object.fromEntries(members.map((m) => [m.id, `${m.firstName} ${m.lastName}`]));

  let expiringDocuments = [];
  let expiringDocumentsCount = 0;
  if (canViewDocuments) {
    const allExpiring = documents
      .filter((d) => d.expirationDate && new Date(d.expirationDate) <= in30Days)
      .map((d) => ({
        id: d.id,
        originalName: d.originalName,
        documentType: d.documentType,
        expirationDate: d.expirationDate,
        expired: new Date(d.expirationDate) < now,
        memberId: d.memberId,
        memberName: memberById[d.memberId] || "—",
      }))
      .sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));
    expiringDocuments = allExpiring.slice(0, 8);
    expiringDocumentsCount = allExpiring.length;
  }

  let activeWarningsCount = 0;
  if (canViewMembers) {
    activeWarningsCount = warnings.filter((w) => !w.endDate || new Date(w.endDate) >= now).length;
  }

  res.json({
    totalMembers: members.length,
    activeMissions,
    completedMissions,
    pendingMissions,
    availableEquipment,
    maintenanceEquipment,
    missionSuccessRate: successRate,
    averageRating: avgRating,
    recentActivities: logs.slice(0, 10),
    announcements: announcements.slice(0, 5),
    expiringDocuments,
    expiringDocumentsCount,
    activeWarningsCount,
  });
});

// Backup: bundles all JSON data files into one export object (IT only).
router.get("/backup", requireAuth, requireRole("IT"), (req, res) => {
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  const bundle = {};
  for (const f of files) {
    bundle[f.replace(".json", "")] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf8") || "null");
  }
  appendLog({
    username: req.user.username,
    role: req.user.role,
    action: "إنشاء نسخة احتياطية",
    module: "النظام",
    recordId: null,
    oldValue: null,
    newValue: null,
    result: "نجاح",
    ip: req.ip,
  });
  res.setHeader("Content-Disposition", `attachment; filename="backup-${Date.now()}.json"`);
  res.json({ createdAt: new Date().toISOString(), data: bundle });
});

// Restore: overwrites JSON files from an uploaded backup bundle (IT only).
router.post("/restore", requireAuth, requireRole("IT"), (req, res) => {
  const { data } = req.body || {};
  if (!data || typeof data !== "object") {
    return res.status(400).json({ error: "ملف النسخة الاحتياطية غير صالح" });
  }
  for (const [name, content] of Object.entries(data)) {
    if (name === "sessions") continue; // never restore live sessions
    writeJSON(name, content);
  }
  appendLog({
    username: req.user.username,
    role: req.user.role,
    action: "استعادة نسخة احتياطية",
    module: "النظام",
    recordId: null,
    oldValue: null,
    newValue: null,
    result: "نجاح",
    ip: req.ip,
  });
  res.json({ ok: true });
});

export default router;
