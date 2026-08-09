import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import fs from "fs";
import https from "https";
import http from "http";
import path from "path";

import { ensureSecretKey } from "./utils/crypto.js";
import { DATA_DIR } from "./utils/store.js";
import { startKeepAlivePing } from "./utils/keepAlive.js";
import { requireAuthAny } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import membersRoutes from "./routes/members.js";
import missionsRoutes from "./routes/missions.js";
import inventoryRoutes from "./routes/inventory.js";
import announcementsRoutes from "./routes/announcements.js";
import documentsRoutes from "./routes/documents.js";
import ratingsRoutes from "./routes/ratings.js";
import missionLogsRoutes from "./routes/missionLogs.js";
import auditRoutes from "./routes/audit.js";
import systemRoutes from "./routes/system.js";
import surveysRoutes from "./routes/surveys.js";
import hazardsRoutes from "./routes/hazards.js";
import facilitiesRoutes from "./routes/facilities.js";
import geoRoutes from "./routes/geo.js";
import permissionsRoutes from "./routes/permissions.js";
import warningsRoutes from "./routes/warnings.js";

dotenv.config();

ensureSecretKey();

const app = express();

// Only trust X-Forwarded-* headers (for correct req.ip in audit logs) if you
// are actually running behind a reverse proxy (nginx/Caddy/Fly.io/Render).
// Enabling this without a real proxy in front lets clients spoof their own
// IP via that header.
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

// This app is designed to be deployed as ONE server: the built frontend is
// served as static files from this same Express process (see the bottom of
// this file), so almost all real traffic is same-origin — no CORS needed at
// all, which is the most restrictive/secure setting.
//
// ALLOWED_ORIGIN is only for hosting the frontend somewhere other than this
// server — e.g. each user running a local copy of the built client on their
// own machine, all pointed at this one central server. Accepts a
// comma-separated list since each such machine has a different origin
// (different local IP/port). This is a strict allowlist match, never a
// wildcard — an origin not on the list is rejected, same as if CORS were
// off entirely. Example:
//   ALLOWED_ORIGIN=http://192.168.1.20:4173,http://192.168.1.31:4173
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const isCrossOriginDeployment = ALLOWED_ORIGINS.length > 0;

app.use(
  helmet({
    // CSP is tuned for a same-origin SPA served by this same server. If you
    // run the frontend on a separate domain (ALLOWED_ORIGIN set), tighten
    // this further to that specific origin as needed.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https://*.basemaps.cartocdn.com", "https://*.tile.openstreetmap.org"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "https://nominatim.openstreetmap.org"],
      },
    },
    // Only relax to cross-origin if the frontend genuinely lives elsewhere;
    // default (same-origin) is strictly safer and is the recommended setup.
    crossOriginResourcePolicy: { policy: isCrossOriginDeployment ? "cross-origin" : "same-origin" },
  })
);
if (isCrossOriginDeployment) {
  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header = non-browser request (curl, health checks) — allow.
        // Otherwise, reject anything not explicitly on the list, same as if
        // CORS were disabled entirely — this is never a blanket allow.
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error("غير مسموح بهذا المصدر"));
      },
      credentials: true,
    })
  );
}
app.use(express.json({ limit: "10mb" }));

// Slows down brute-force login attempts. PBKDF2 already makes each guess
// computationally expensive; this caps how many guesses can even be tried.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "محاولات تسجيل دخول كثيرة جداً، يرجى المحاولة لاحقاً" },
});

// A looser general limit so the API can't be hammered to fill disk/JSON
// files with junk records or exhaust the server.
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "عدد الطلبات كبير جداً، يرجى المحاولة بعد قليل" },
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth/login", loginLimiter);
app.use("/api", apiLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/members", membersRoutes);
app.use("/api/missions", missionsRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/announcements", announcementsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/ratings", ratingsRoutes);
app.use("/api/mission-logs", missionLogsRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/surveys", surveysRoutes);
app.use("/api/hazards", hazardsRoutes);
app.use("/api/facilities", facilitiesRoutes);
app.use("/api/geo", geoRoutes);
app.use("/api/permissions", permissionsRoutes);
app.use("/api/warnings", warningsRoutes);

// Uploaded member documents/photos — requires a valid, still-active login
// session (via Authorization header OR ?token=, since <img>/<a> tags can't
// send custom headers). This means logout, session expiry, and password
// changes all correctly cut off access to previously shared file links too.
app.use("/uploads", requireAuthAny, express.static(path.join(process.cwd(), "uploads")));

// Serve the built React frontend from this same server (the recommended,
// single-service deployment). CLIENT_DIST_PATH defaults to ../client/dist,
// matching this repo's layout — override it if you deploy differently.
const CLIENT_DIST = process.env.CLIENT_DIST_PATH || path.join(process.cwd(), "..", "client", "dist");
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  // SPA fallback: any non-API, non-upload route serves index.html so
  // client-side routing (React Router) works on a hard refresh/direct link.
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
} else {
  console.log(`Note: no built frontend found at ${CLIENT_DIST} — API-only mode. Run "npm run build" in client/ to serve it from here.`);
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "خطأ في الخادم الداخلي" });
});

const PORT = process.env.PORT || 5000;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;

if (SSL_CERT_PATH && SSL_KEY_PATH) {
  // Direct HTTPS in Node, for setups without a reverse proxy in front.
  // Most cloud platforms (Fly.io, Render, etc.) already terminate TLS for
  // you — this is only needed for a bare VPS/self-hosted setup.
  const options = {
    cert: fs.readFileSync(SSL_CERT_PATH),
    key: fs.readFileSync(SSL_KEY_PATH),
  };
  https.createServer(options, app).listen(PORT, () => {
    console.log(`First Rescue Log server running (HTTPS) on port ${PORT}`);
    if (process.env.KEEP_ALIVE === "true") startKeepAlivePing();
  });
} else {
  http.createServer(app).listen(PORT, () => {
    console.log(`First Rescue Log server running (HTTP) on port ${PORT}`);
    if (process.env.KEEP_ALIVE === "true") startKeepAlivePing();
  });
}
