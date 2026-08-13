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
        // Dropdown option lists IT can edit from Settings -> "قوائم الخيارات"
        // without ever touching code. These defaults match what was
        // previously hardcoded, so nothing changes until IT edits one.
        lists: {
          missionTypes: ["إنقاذ جبلي", "إنقاذ مائي", "إسعاف أولي", "إخلاء", "بحث وإنقاذ", "أخرى"],
          missionPriorities: ["منخفضة", "متوسطة", "عالية", "طارئة"],
          hazardTypes: ["فيضان", "حريق", "انفجار", "انهيار مبنى", "حالة طبية طارئة", "تسرب كيميائي", "حادث سير", "أضرار زلزال", "أضرار عاصفة", "انزلاق تربة", "شخص مفقود", "حريق غابات", "أخرى"],
          hazardSeverities: ["منخفضة", "متوسطة", "عالية", "حرجة"],
          hazardStatuses: ["نشط", "تحت المعالجة", "محلول"],
          facilityTypes: ["مستشفى", "مركز إطفاء", "مركز شرطة", "ملجأ", "نقطة إخلاء", "مركز قيادة", "مصدر مياه", "منطقة هبوط", "حاجز طريق", "منطقة آمنة", "أخرى"],
          inventoryCategories: ["حبال وتسلق", "إسعاف أولي", "غوص وإنقاذ مائي", "اتصالات", "إضاءة", "أدوات قطع", "حماية شخصية", "أخرى"],
          announcementCategories: ["قرار إداري", "إعلان عام", "محضر إجتماع"],
          warningSeverities: ["ملاحظة شفهية", "تنبيه بسيط", "إنذار", "إنذار نهائي"],
          documentTypes: ["هوية", "شهادة ميلاد", "نموذج طبي", "رخصة قيادة", "شهادة تدريب", "شهادة إنقاذ", "تأمين", "أخرى"],
          memberRanks: ["متطوع", "منقذ", "منقذ أول", "قائد فريق", "مدرب"],
        },
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
