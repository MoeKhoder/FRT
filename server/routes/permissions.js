import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { FEATURES, ROLE_DEFAULTS } from "../utils/permissions.js";

const router = express.Router();

router.get("/", requireAuth, requireRole("IT"), (req, res) => {
  res.json({ features: FEATURES, roleDefaults: ROLE_DEFAULTS });
});

export default router;
