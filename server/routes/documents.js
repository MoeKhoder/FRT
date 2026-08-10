import { buildCrudRouter } from "../utils/crudFactory.js";
import { requireAuth, requireFeature } from "../middleware/auth.js";
import { readJSON, writeJSON, appendLog, cryptoRandomId } from "../utils/store.js";
import { uploadDocument } from "../utils/uploads.js";

// Standard CRUD (list/get/edit metadata/delete) — file upload itself is a
// dedicated multipart route added below, since JSON-body CRUD can't carry
// binary file data.
const router = buildCrudRouter({
  file: "documents",
  moduleLabel: "المستندات",
  feature: "documents",
});

router.post(
  "/upload",
  requireAuth,
  requireFeature("documents", "manage"),
  uploadDocument.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "لم يتم إرفاق ملف صالح (PDF أو صورة أو Word)" });
    }
    const { memberId, documentType, expirationDate, notes } = req.body || {};
    if (!memberId) {
      return res.status(400).json({ error: "معرف العضو مطلوب" });
    }
    const documents = readJSON("documents");
    const newDoc = {
      id: cryptoRandomId(),
      memberId,
      documentType: documentType || "أخرى",
      originalName: req.file.originalname,
      storedName: req.file.filename,
      url: `/uploads/documents/${req.file.filename}`,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadDate: new Date().toISOString(),
      expirationDate: expirationDate || null,
      notes: notes || "",
      status: "ساري",
      createdAt: new Date().toISOString(),
      createdBy: req.user.username,
    };
    documents.push(newDoc);
    writeJSON("documents", documents);
    appendLog({
      username: req.user.username,
      role: req.user.role,
      action: "رفع مستند",
      module: "المستندات",
      recordId: newDoc.id,
      oldValue: null,
      newValue: { memberId, documentType, originalName: req.file.originalname },
      result: "نجاح",
      ip: req.ip,
    });
    res.status(201).json(newDoc);
  }
);

export default router;
