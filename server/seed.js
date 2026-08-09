import fs from "fs";
import path from "path";
import { ensureSecretKey, hashPassword } from "./utils/crypto.js";
import { readJSON, writeJSON, cryptoRandomId, DATA_DIR } from "./utils/store.js";

const files = [
  "users",
  "members",
  "missions",
  "inventory",
  "missionLogs",
  "systemLogs",
  "ratings",
  "announcements",
  "documents",
  "settings",
  "surveyResponses",
  "hazards",
  "facilities",
  "villages",
  "warnings",
];

for (const f of files) {
  const fp = path.join(DATA_DIR, `${f}.json`);
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, "[]", "utf8");
    console.log(`created data/${f}.json`);
  }
}

// settings.json is an object, not an array
const settingsPath = path.join(DATA_DIR, "settings.json");
const settingsRaw = fs.readFileSync(settingsPath, "utf8").trim();
if (!settingsRaw || settingsRaw === "[]") {
  fs.writeFileSync(
    settingsPath,
    JSON.stringify(
      {
        orgName: "فريق المستجيب الأول - الجومة",
        theme: "dark",
        sessionTimeoutMinutes: 15,
      },
      null,
      2
    )
  );
  console.log("initialized data/settings.json");
}

ensureSecretKey();

const users = readJSON("users");
const DEFAULT_USERNAME = "mohamad.khoder";
const DEFAULT_PASSWORD = "Luna18122001";

const exists = users.find(
  (u) => u.username.toLowerCase() === DEFAULT_USERNAME.toLowerCase()
);

if (!exists) {
  const { hash, salt } = hashPassword(DEFAULT_PASSWORD);
  users.push({
    id: cryptoRandomId(),
    username: DEFAULT_USERNAME,
    fullName: "Mohamad Khoder",
    passwordHash: hash,
    salt,
    role: "IT",
    active: true,
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
    lastLogin: null,
  });
  writeJSON("users", users);
  console.log(`Default IT user created: ${DEFAULT_USERNAME}`);
} else {
  console.log("Default IT user already exists, skipping.");
}

console.log("Seed complete.");
