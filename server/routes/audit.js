import express from "express";
import { readJSON } from "../utils/store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Only IT can view the audit / security log, per spec.
router.get("/", requireAuth, requireRole("IT"), (req, res) => {
  const logs = readJSON("systemLogs");
  const { module, username, from, to, result } = req.query;
  let filtered = logs;
  if (module) filtered = filtered.filter((l) => l.module === module);
  if (username) filtered = filtered.filter((l) => l.username === username);
  if (result) filtered = filtered.filter((l) => l.result === result);
  if (from) filtered = filtered.filter((l) => new Date(l.timestamp) >= new Date(from));
  if (to) filtered = filtered.filter((l) => new Date(l.timestamp) <= new Date(to));
  res.json(filtered);
});

router.get("/login-history", requireAuth, requireRole("IT"), (req, res) => {
  const logs = readJSON("systemLogs").filter((l) => l.module === "المصادقة");
  res.json(logs);
});

export default router;
