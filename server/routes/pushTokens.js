import express from "express";
import { readJSON, writeJSON, cryptoRandomId } from "../utils/store.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Register (or re-register) this device's Expo push token for the current
// user. Upsert by token - re-registering the same token (e.g. app reopened)
// just updates userId/updatedAt rather than creating a duplicate entry that
// would otherwise cause the same device to receive the same notification
// multiple times.
router.post("/", requireAuth, (req, res) => {
  const { token, platform } = req.body || {};
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "رمز الإشعارات مطلوب" });
  }
  const tokens = readJSON("pushTokens");
  const idx = tokens.findIndex((t) => t.token === token);
  const entry = {
    id: idx === -1 ? cryptoRandomId() : tokens[idx].id,
    token,
    userId: req.user.id,
    platform: platform || "unknown",
    updatedAt: new Date().toISOString(),
  };
  if (idx === -1) tokens.push(entry);
  else tokens[idx] = entry;
  writeJSON("pushTokens", tokens);
  res.json({ ok: true });
});

// Unregister a specific device token (called on logout) so a signed-out
// device stops receiving notifications for whoever was previously using it.
router.delete("/:token", requireAuth, (req, res) => {
  const tokens = readJSON("pushTokens");
  const remaining = tokens.filter((t) => t.token !== req.params.token);
  writeJSON("pushTokens", remaining);
  res.json({ ok: true });
});

export default router;
