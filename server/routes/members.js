import { buildCrudRouter } from "../utils/crudFactory.js";
import { requireAuth, requireFeature } from "../middleware/auth.js";
import { readJSON, writeJSON, appendLog } from "../utils/store.js";

const router = buildCrudRouter({
  file: "members",
  moduleLabel: "الأعضاء",
  feature: "members",
  uniqueFields: ["nationalId"],
});

const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // 3MB decoded — generous for a profile photo
const DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp|heic|heif|gif);base64,([A-Za-z0-9+/=]+)$/;

router.post("/:id/photo", requireAuth, requireFeature("members", "manage"), (req, res) => {
  const { photoDataUrl } = req.body || {};
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

  const members = readJSON("members");
  const idx = members.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "العضو غير موجود" });

  members[idx].photoUrl = photoDataUrl; // stored inline — no separate file, no auth-gated URL to break
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
});

export default router;
