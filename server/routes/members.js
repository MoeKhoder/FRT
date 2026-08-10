import { buildCrudRouter } from "../utils/crudFactory.js";
import { requireAuth, requireFeature } from "../middleware/auth.js";
import { readJSON, writeJSON, appendLog } from "../utils/store.js";
import { uploadPhoto } from "../utils/uploads.js";

const router = buildCrudRouter({
  file: "members",
  moduleLabel: "الأعضاء",
  feature: "members",
  uniqueFields: ["nationalId"],
});

router.post(
  "/:id/photo",
  requireAuth,
  requireFeature("members", "manage"),
  uploadPhoto.single("photo"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "لم يتم إرفاق صورة صالحة (jpg, png, webp)" });
    }
    const members = readJSON("members");
    const idx = members.findIndex((m) => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "العضو غير موجود" });

    members[idx].photoUrl = `/uploads/photos/${req.file.filename}`;
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
      newValue: { photoUrl: members[idx].photoUrl },
      result: "نجاح",
      ip: req.ip,
    });

    res.json(members[idx]);
  }
);

export default router;
