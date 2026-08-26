import express from "express";
import { readJSON, writeJSON, appendLog, cryptoRandomId } from "./store.js";
import { requireAuth, requireFeature } from "../middleware/auth.js";

// Prototype pollution guard: with data stored as flat JSON and merged via
// spread (`{...oldValue, ...req.body}`), a body containing a literal
// "__proto__"/"constructor"/"prototype" key must never reach that merge.
// Also caps string length and body size shape so the API can't be used to
// stuff oversized/garbage values into the JSON store.
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const MAX_STRING_LEN = 20000; // generous — comfortably covers notes/descriptions

export function sanitizeInput(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "صيغة البيانات غير صالحة" };
  }
  const clean = {};
  for (const [key, value] of Object.entries(body)) {
    if (DANGEROUS_KEYS.has(key)) continue; // silently drop, not an error — nothing legitimate needs these keys
    if (typeof value === "string" && value.length > MAX_STRING_LEN) {
      return { ok: false, error: `القيمة طويلة جداً في الحقل: ${key}` };
    }
    clean[key] = value;
  }
  return { ok: true, value: clean };
}

/**
 * Builds a standard CRUD router backed by a JSON file, gated by a governable
 * feature permission (see server/utils/permissions.js). Read requires "view"
 * level, write (create/update/delete) requires "manage" level. IT can adjust
 * any user's effective level for `feature` individually via the Users page.
 *
 * options:
 *  - file: json file name (without .json)
 *  - moduleLabel: Arabic label used in audit logs
 *  - feature: key from FEATURES this module is governed by
 *  - uniqueFields: array of field names that must be unique (case-insensitive)
 *  - beforeCreate: optional (body, existingItems) => body — lets a specific
 *    module inject server-computed fields (e.g. an auto-numbered ID) before
 *    a new record is saved, without baking that logic into every module.
 *  - protectedFields: field names (e.g. produced by beforeCreate) that must
 *    never change via a later edit, same reasoning as id/createdAt/createdBy.
 */
export function buildCrudRouter({ file, moduleLabel, feature, uniqueFields = [], beforeCreate = null, protectedFields = [] }) {
  const router = express.Router();

  const readGuard = [requireAuth, requireFeature(feature, "view")];
  const writeGuard = [requireAuth, requireFeature(feature, "manage")];

  router.get("/", readGuard, (req, res) => {
    res.json(readJSON(file));
  });

  router.get("/:id", readGuard, (req, res) => {
    const item = readJSON(file).find((x) => x.id === req.params.id);
    if (!item) return res.status(404).json({ error: "غير موجود" });
    res.json(item);
  });

  router.post("/", writeGuard, (req, res) => {
    const clean = sanitizeInput(req.body);
    if (!clean.ok) return res.status(400).json({ error: clean.error });
    let body = clean.value;

    const items = readJSON(file);

    if (typeof beforeCreate === "function") {
      body = beforeCreate(body, items) || body;
    }

    for (const f of uniqueFields) {
      const val = body[f];
      if (val && items.some((x) => String(x[f]).toLowerCase() === String(val).toLowerCase())) {
        return res.status(409).json({ error: `القيمة مستخدمة مسبقاً في الحقل: ${f}` });
      }
    }
    const newItem = {
      ...body,
      // These come AFTER the spread so a client-supplied id/createdAt/
      // createdBy can never override them — id colliding with an existing
      // record would let one request shadow/corrupt another's data.
      id: cryptoRandomId(),
      createdAt: new Date().toISOString(),
      createdBy: req.user.username,
    };
    items.push(newItem);
    writeJSON(file, items);
    appendLog({
      username: req.user.username,
      role: req.user.role,
      action: "إضافة سجل",
      module: moduleLabel,
      recordId: newItem.id,
      oldValue: null,
      newValue: newItem,
      result: "نجاح",
      ip: req.ip,
    });
    res.status(201).json(newItem);
  });

  router.put("/:id", writeGuard, (req, res) => {
    const clean = sanitizeInput(req.body);
    if (!clean.ok) return res.status(400).json({ error: clean.error });
    const body = clean.value;

    const items = readJSON(file);
    const idx = items.findIndex((x) => x.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "غير موجود" });
    const oldValue = items[idx];
    for (const f of uniqueFields) {
      const val = body[f];
      if (
        val &&
        items.some(
          (x, i) => i !== idx && String(x[f]).toLowerCase() === String(val).toLowerCase()
        )
      ) {
        return res.status(409).json({ error: `القيمة مستخدمة مسبقاً في الحقل: ${f}` });
      }
    }
    const updated = {
      ...oldValue,
      ...body,
      // Same protection as above: id/creation metadata (including any
      // beforeCreate-generated field like frtNumber) is never client-
      // editable via a later PUT, even accidentally.
      id: oldValue.id,
      createdAt: oldValue.createdAt,
      createdBy: oldValue.createdBy,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.username,
    };
    for (const f of protectedFields) {
      updated[f] = oldValue[f];
    }
    items[idx] = updated;
    writeJSON(file, items);
    appendLog({
      username: req.user.username,
      role: req.user.role,
      action: "تعديل سجل",
      module: moduleLabel,
      recordId: updated.id,
      oldValue,
      newValue: updated,
      result: "نجاح",
      ip: req.ip,
    });
    res.json(updated);
  });

  router.delete("/:id", writeGuard, (req, res) => {
    const items = readJSON(file);
    const idx = items.findIndex((x) => x.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "غير موجود" });
    const [removed] = items.splice(idx, 1);
    writeJSON(file, items);
    appendLog({
      username: req.user.username,
      role: req.user.role,
      action: "حذف سجل",
      module: moduleLabel,
      recordId: removed.id,
      oldValue: removed,
      newValue: null,
      result: "نجاح",
      ip: req.ip,
    });
    res.json({ ok: true });
  });

  return router;
}
