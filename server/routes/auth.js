import express from "express";
import { readJSON, writeJSON, appendLog } from "../utils/store.js";
import { verifyPassword, hashPassword, generateToken } from "../utils/crypto.js";
import { createSession, destroySession, destroyAllSessionsForUser, requireAuth } from "../middleware/auth.js";
import { effectivePermissions } from "../utils/permissions.js";

const router = express.Router();

router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "الرجاء إدخال اسم المستخدم وكلمة المرور" });
  }
  const users = readJSON("users");
  const user = users.find(
    (u) => u.username.toLowerCase() === String(username).toLowerCase()
  );

  const fail = () => {
    appendLog({
      username: username || "unknown",
      role: "-",
      action: "محاولة تسجيل دخول فاشلة",
      module: "المصادقة",
      recordId: null,
      oldValue: null,
      newValue: null,
      result: "فشل",
      computerName: req.headers["x-computer-name"] || null,
      ip: req.ip,
    });
    return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
  };

  if (!user || !user.active) return fail();

  let ok = false;
  try {
    ok = verifyPassword(password, user.salt, user.passwordHash);
  } catch (e) {
    return res.status(500).json({ error: "خطأ في مفتاح التشفير (secret.key) - راجع مسؤول تقنية المعلومات" });
  }
  if (!ok) return fail();

  const token = generateToken();
  createSession(token, user);

  user.lastLogin = new Date().toISOString();
  const idx = users.findIndex((u) => u.id === user.id);
  users[idx] = user;
  writeJSON("users", users);

  appendLog({
    username: user.username,
    role: user.role,
    action: "تسجيل دخول",
    module: "المصادقة",
    recordId: user.id,
    oldValue: null,
    newValue: null,
    result: "نجاح",
    computerName: req.headers["x-computer-name"] || null,
    ip: req.ip,
  });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      mustChangePassword: !!user.mustChangePassword,
      permissions: effectivePermissions(user),
    },
  });
});

router.post("/logout", requireAuth, (req, res) => {
  destroySession(req.token);
  appendLog({
    username: req.user.username,
    role: req.user.role,
    action: "تسجيل خروج",
    module: "المصادقة",
    recordId: req.user.id,
    oldValue: null,
    newValue: null,
    result: "نجاح",
    computerName: req.headers["x-computer-name"] || null,
    ip: req.ip,
  });
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  const users = readJSON("users");
  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
  res.json({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    mustChangePassword: !!user.mustChangePassword,
    permissions: effectivePermissions(user),
  });
});

router.post("/change-password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل" });
  }
  const users = readJSON("users");
  const idx = users.findIndex((u) => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: "المستخدم غير موجود" });
  const user = users[idx];

  if (!verifyPassword(currentPassword, user.salt, user.passwordHash)) {
    return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
  }
  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.salt = salt;
  user.mustChangePassword = false;
  users[idx] = user;
  writeJSON("users", users);

  // A token stolen before this change (e.g. via unsecured HTTP) should not
  // remain valid — keep only the session that made this request.
  destroyAllSessionsForUser(user.id, req.token);

  appendLog({
    username: user.username,
    role: user.role,
    action: "تغيير كلمة المرور",
    module: "المصادقة",
    recordId: user.id,
    oldValue: null,
    newValue: null,
    result: "نجاح",
    computerName: req.headers["x-computer-name"] || null,
    ip: req.ip,
  });

  res.json({ ok: true });
});

export default router;
