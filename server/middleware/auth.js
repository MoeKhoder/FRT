import { readJSON, writeJSON } from "../utils/store.js";
import { hasAccess } from "../utils/permissions.js";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8h hard cap; inactivity handled client-side + soft check below
const INACTIVITY_TTL_MS = 20 * 60 * 1000; // 20 min server-side inactivity cutoff

function loadSessions() {
  return readJSON("sessions");
}
function saveSessions(sessions) {
  writeJSON("sessions", sessions);
}

export function createSession(token, user) {
  const sessions = loadSessions();
  sessions.push({
    token,
    userId: user.id,
    username: user.username,
    role: user.role,
    createdAt: Date.now(),
    lastSeen: Date.now(),
  });
  saveSessions(sessions);
}

export function destroySession(token) {
  const sessions = loadSessions().filter((s) => s.token !== token);
  saveSessions(sessions);
}

// Revokes every active session for a user — used when a password changes,
// so a token stolen before the change (e.g. via network sniffing on plain
// HTTP) doesn't stay valid afterward. Pass exceptToken to keep the session
// making the request itself alive (self-service password change); admin-
// triggered resets pass no exception, since the admin isn't that session.
export function destroyAllSessionsForUser(userId, exceptToken = null) {
  const sessions = loadSessions().filter(
    (s) => s.userId !== userId || s.token === exceptToken
  );
  saveSessions(sessions);
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const headerToken = header.startsWith("Bearer ") ? header.slice(7) : null;
  return authenticateToken(headerToken, req, res, next);
}

// Same session check as requireAuth, but also accepts the token via
// ?token=... query param. Used only for /uploads: <img>/<a> tags issue plain
// GET requests and cannot attach an Authorization header, so this is how
// uploaded documents/photos stay behind login instead of being open static
// files, while still respecting logout/inactivity/password-change revocation.
export function requireAuthAny(req, res, next) {
  const header = req.headers.authorization || "";
  const headerToken = header.startsWith("Bearer ") ? header.slice(7) : null;
  const token = headerToken || req.query.token || null;
  return authenticateToken(token, req, res, next);
}

function authenticateToken(token, req, res, next) {
  if (!token) return res.status(401).json({ error: "غير مصرح - يرجى تسجيل الدخول" });

  const sessions = loadSessions();
  const session = sessions.find((s) => s.token === token);
  if (!session) return res.status(401).json({ error: "الجلسة غير صالحة" });

  const now = Date.now();
  if (now - session.createdAt > SESSION_TTL_MS) {
    destroySession(token);
    return res.status(401).json({ error: "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً" });
  }
  if (now - session.lastSeen > INACTIVITY_TTL_MS) {
    destroySession(token);
    return res.status(401).json({ error: "تم تسجيل الخروج بسبب عدم النشاط" });
  }

  session.lastSeen = now;
  const idx = sessions.findIndex((s) => s.token === token);
  sessions[idx] = session;
  saveSessions(sessions);

  const users = readJSON("users");
  const account = users.find((u) => u.id === session.userId);
  if (!account || account.active === false) {
    destroySession(token);
    return res.status(401).json({ error: "تم إيقاف هذا الحساب" });
  }

  req.user = { id: session.userId, username: session.username, role: session.role };
  req.token = token;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "لا تملك الصلاحية للقيام بهذا الإجراء" });
    }
    next();
  };
}

// Checks a user's effective per-feature permission (role default, overridden
// by any explicit grant/revoke IT has set for that specific user).
export function requireFeature(featureKey, level = "view") {
  return (req, res, next) => {
    const users = readJSON("users");
    const fullUser = users.find((u) => u.id === req.user.id);
    if (!fullUser) return res.status(401).json({ error: "المستخدم غير موجود" });
    if (!hasAccess(fullUser, featureKey, level)) {
      return res.status(403).json({ error: "لا تملك الصلاحية للوصول إلى هذه الميزة" });
    }
    next();
  };
}
