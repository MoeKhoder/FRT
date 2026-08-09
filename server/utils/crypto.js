import crypto from "crypto";
import fs from "fs";
import path from "path";

// The secret key file location is configurable via SECRET_KEY_PATH env var.
// In production, the administrator places this file manually on every
// authorized computer (see README). It must NEVER be committed to git
// or synced anywhere the JSON data files are synced.
const SECRET_KEY_PATH =
  process.env.SECRET_KEY_PATH || path.join(process.cwd(), "secret.key");

const ITERATIONS = 210000; // PBKDF2 iterations
const KEY_LENGTH = 64; // bytes
const DIGEST = "sha512";

export function ensureSecretKey() {
  if (!fs.existsSync(SECRET_KEY_PATH)) {
    const key = crypto.randomBytes(32).toString("hex"); // 256-bit key
    fs.writeFileSync(SECRET_KEY_PATH, key, { mode: 0o600 });
    console.log(`[secret.key] generated new secret key at ${SECRET_KEY_PATH}`);
  }
  return fs.readFileSync(SECRET_KEY_PATH, "utf8").trim();
}

export function getSecretKey() {
  if (!fs.existsSync(SECRET_KEY_PATH)) {
    throw new Error(
      `secret.key not found at ${SECRET_KEY_PATH}. The administrator must generate/place this file before the app can authenticate users.`
    );
  }
  return fs.readFileSync(SECRET_KEY_PATH, "utf8").trim();
}

export function hashPassword(plainPassword, saltHex) {
  const secretKey = getSecretKey();
  const salt = saltHex || crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(plainPassword + secretKey, salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString("hex");
  return { hash, salt };
}

export function verifyPassword(plainPassword, salt, expectedHash) {
  const { hash } = hashPassword(plainPassword, salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export { SECRET_KEY_PATH };
