import express from "express";
import { readJSON, writeJSON, appendLog, cryptoRandomId } from "../utils/store.js";
import { hashPassword } from "../utils/crypto.js";
import { requireAuth, requireRole, destroySession, destroyAllSessionsForUser } from "../middleware/auth.js";
import { FEATURES, effectivePermissions } from "../utils/permissions.js";

const router = express.Router();
const ROLES = ["IT", "Administrator", "Assistant"];

function sanitize(u) {
  const { passwordHash, salt, ...rest } = u;
  return { ...rest, effectivePermissions: effectivePermissions(u) };
}

router.get("/", requireAuth, requireRole("IT"), (req, res) => {
  res.json(readJSON("users").map(sanitize));
});

router.post("/", requireAuth, requireRole("IT"), (req, res) => {
  const { username, fullName, password, role } = req.body || {};
  if (!username || !password || !role) {
    return res.status(400).json({ error: "اسم المستخدم وكلمة المرور والدور مطلوبة" });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: "دور غير صالح" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" });
  }
  const users = readJSON("users");
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: "اسم المستخدم مستخدم مسبقاً" });
  }
  const { hash, salt } = hashPassword(password);
  const newUser = {
    id: cryptoRandomId(),
    username,
    fullName: fullName || username,
    passwordHash: hash,
    salt,
    role,
    active: true,
    mustChangePassword: true,
    createdAt: new Date().toISOString(),
    lastLogin: null,
  };
  users.push(newUser);
  writeJSON("users", users);
  appendLog({
    username: req.user.username,
    role: req.user.role,
    action: "إنشاء مستخدم",
    module: "إدارة المستخدمين",
    recordId: newUser.id,
    oldValue: null,
    newValue: { username, role },
    result: "نجاح",
    ip: req.ip,
  });
  res.status(201).json(sanitize(newUser));
});

router.put("/:id", requireAuth, requireRole("IT"), (req, res) => {
  const users = readJSON("users");
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "غير موجود" });
  const { fullName, role, active } = req.body || {};
  const oldValue = sanitize(users[idx]);
  if (role && ROLES.includes(role)) users[idx].role = role;
  if (typeof fullName === "string") users[idx].fullName = fullName;
  if (typeof active === "boolean") users[idx].active = active;
  users[idx].updatedAt = new Date().toISOString();
  writeJSON("users", users);
  if (active === false) destroyAllSessionsForUser(users[idx].id);
  appendLog({
    username: req.user.username,
    role: req.user.role,
    action: "تعديل مستخدم",
    module: "إدارة المستخدمين",
    recordId: users[idx].id,
    oldValue,
    newValue: sanitize(users[idx]),
    result: "نجاح",
    ip: req.ip,
  });
  res.json(sanitize(users[idx]));
});

router.post("/:id/reset-password", requireAuth, requireRole("IT"), (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" });
  }
  const users = readJSON("users");
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "غير موجود" });
  const { hash, salt } = hashPassword(newPassword);
  users[idx].passwordHash = hash;
  users[idx].salt = salt;
  users[idx].mustChangePassword = true;
  writeJSON("users", users);
  // Admin-initiated reset: this session isn't the target user's, so revoke
  // every one of theirs — they must log in fresh with the new password.
  destroyAllSessionsForUser(users[idx].id);
  appendLog({
    username: req.user.username,
    role: req.user.role,
    action: "إعادة تعيين كلمة المرور",
    module: "إدارة المستخدمين",
    recordId: users[idx].id,
    oldValue: null,
    newValue: null,
    result: "نجاح",
    ip: req.ip,
  });
  res.json({ ok: true });
});

router.get("/:id/permissions", requireAuth, requireRole("IT"), (req, res) => {
  const users = readJSON("users");
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "غير موجود" });
  res.json({
    role: user.role,
    overrides: user.permissions || {},
    effective: effectivePermissions(user),
  });
});

const VALID_LEVELS = ["none", "view", "manage"];

router.put("/:id/permissions", requireAuth, requireRole("IT"), (req, res) => {
  const { permissions } = req.body || {};
  if (!permissions || typeof permissions !== "object") {
    return res.status(400).json({ error: "بيانات الصلاحيات غير صالحة" });
  }
  const users = readJSON("users");
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "غير موجود" });

  if (users[idx].role === "IT") {
    return res.status(400).json({ error: "لا يمكن تقييد صلاحيات مستخدم من تقنية المعلومات" });
  }

  const validKeys = new Set(FEATURES.map((f) => f.key));
  const cleaned = {};
  for (const [key, level] of Object.entries(permissions)) {
    if (!validKeys.has(key) || !VALID_LEVELS.includes(level)) {
      return res.status(400).json({ error: `قيمة صلاحية غير صالحة للميزة: ${key}` });
    }
    cleaned[key] = level;
  }

  const oldOverrides = users[idx].permissions || {};
  users[idx].permissions = cleaned;
  writeJSON("users", users);

  appendLog({
    username: req.user.username,
    role: req.user.role,
    action: "تعديل صلاحيات المستخدم",
    module: "إدارة المستخدمين",
    recordId: users[idx].id,
    oldValue: oldOverrides,
    newValue: cleaned,
    result: "نجاح",
    ip: req.ip,
  });

  res.json({ overrides: cleaned, effective: effectivePermissions(users[idx]) });
});

router.delete("/:id", requireAuth, requireRole("IT"), (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: "لا يمكنك حذف حسابك الخاص" });
  }
  const users = readJSON("users");
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "غير موجود" });
  const [removed] = users.splice(idx, 1);
  writeJSON("users", users);
  appendLog({
    username: req.user.username,
    role: req.user.role,
    action: "حذف مستخدم",
    module: "إدارة المستخدمين",
    recordId: removed.id,
    oldValue: sanitize(removed),
    newValue: null,
    result: "نجاح",
    ip: req.ip,
  });
  res.json({ ok: true });
});

export default router;
