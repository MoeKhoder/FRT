import { buildCrudRouter } from "../utils/crudFactory.js";
import { requireAuth, requireFeature } from "../middleware/auth.js";
import { readJSON, writeJSON, appendLog } from "../utils/store.js";

// Assigns the next sequential FRT-#### number when a member is created.
// Uses the highest number ever issued (not just current count), so a
// deleted member's number is never reused — avoids confusion with any
// paperwork/ID cards already printed with that number.
function assignFrtNumber(body, existingMembers) {
  const nums = existingMembers
    .map((m) => parseInt(String(m.frtNumber || "").replace("FRT-", ""), 10))
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return { ...body, frtNumber: "FRT-" + String(next).padStart(4, "0") };
}

const router = buildCrudRouter({
  file: "members",
  moduleLabel: "الأعضاء",
  feature: "members",
  uniqueFields: ["nationalId"],
  beforeCreate: assignFrtNumber,
  protectedFields: ["frtNumber"],
});

router.post(
  "/:id/photo",
  requireAuth,
  requireFeature("members", "manage"),
  (req, res) => {
    // Photo is stored as a base64 data URL directly on the member record —
    // see the base64-photo change from earlier; kept here for completeness
    // if this route still receives a multipart upload from an older client.
    const { photoDataUrl } = req.body || {};
    const members = readJSON("members");
    const idx = members.findIndex((m) => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "العضو غير موجود" });

    const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
    const DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp|heic|heif|gif);base64,([A-Za-z0-9+/=]+)$/;
    if (!photoDataUrl || typeof photoDataUrl !== "string") {
      return res.status(400).json({ error: "لم يتم إرفاق صورة صالحة" });
    }
    const match = photoDataUrl.match(DATA_URL_RE);
    if (!match) {
      return res.status(400).json({ error: "صيغة الصورة غير مدعومة (jpg, png, webp, heic)" });
    }
    const approxBytes = (match[2].length * 3) / 4;
    if (approxBytes > MAX_PHOTO_BYTES) {
      return res.status(400).json({ error: "حجم الصورة كبير جداً (الحد الأقصى 3 ميغابايت)" });
    }

    members[idx].photoUrl = photoDataUrl;
    members[idx].updatedAt = new Date().toISOString();
    members[idx].updatedBy = req.user.username;
    writeJSON("members", members);

    appendLog({
      username: req.user.username,
      role: req.user.role,
      action: "تحديث صورة العضو",
      module: "الأعضاء",
      recordId: members[idx].id,
      oldValue: null,
      newValue: { photoUpdated: true },
      result: "نجاح",
      ip: req.ip,
    });

    res.json(members[idx]);
  }
);

export default router;
