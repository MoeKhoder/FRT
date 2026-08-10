import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
const DOCS_DIR = path.join(UPLOADS_DIR, "documents");
const PHOTOS_DIR = path.join(UPLOADS_DIR, "photos");

for (const dir of [UPLOADS_DIR, DOCS_DIR, PHOTOS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Upload filenames double as the only thing standing between "logged in"
// and "can view this specific file" once /uploads is auth-gated (any valid
// session, not just this record's owner, can reach a URL it knows) — so
// unlike record IDs elsewhere, these need to be cryptographically
// unguessable, not just unique.
function secureToken() {
  return crypto.randomBytes(16).toString("hex");
}

function safeExt(originalName) {
  const ext = path.extname(originalName || "").toLowerCase();
  // allowlist to avoid weird/executable extensions ending up on disk
  const allowed = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".heic"];
  return allowed.includes(ext) ? ext : "";
}

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DOCS_DIR),
  filename: (req, file, cb) => cb(null, `${secureToken()}${safeExt(file.originalname)}`),
});

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PHOTOS_DIR),
  filename: (req, file, cb) => cb(null, `${secureToken()}${safeExt(file.originalname)}`),
});

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const DOC_TYPES = [...IMAGE_TYPES, "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, DOC_TYPES.includes(file.mimetype)),
});

export const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, IMAGE_TYPES.includes(file.mimetype)),
});

export { DOCS_DIR, PHOTOS_DIR, UPLOADS_DIR };
