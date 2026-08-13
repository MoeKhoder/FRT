import express from "express";
import { readJSON, writeJSON, appendLog, cryptoRandomId } from "../utils/store.js";
import { requireAuth, requireFeature } from "../middleware/auth.js";

const router = express.Router();
const readGuard = [requireAuth, requireFeature("surveys", "view")];
const writeGuard = [requireAuth, requireFeature("surveys", "manage")];

// --- matching helpers -------------------------------------------------

function normalizePhone(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  // compare the last 8 digits to absorb country codes (+961), leading 0, spaces, dashes
  return digits.slice(-8);
}

function normalizeName(name) {
  if (!name) return "";
  return String(name)
    .replace(/[\u064B-\u065F\u0670]/g, "") // strip Arabic diacritics
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findMatchingMember(response, members) {
  const respPhone = normalizePhone(response.phone);
  if (respPhone) {
    const byPhone = members.find((m) => normalizePhone(m.phone) === respPhone);
    if (byPhone) return byPhone;
  }
  const respName = normalizeName(response.responderName);
  if (respName) {
    const byExactName = members.find(
      (m) => normalizeName(`${m.firstName} ${m.lastName}`) === respName
    );
    if (byExactName) return byExactName;
    // fallback: substring containment either direction, catches minor formatting differences
    const byPartialName = members.find((m) => {
      const full = normalizeName(`${m.firstName} ${m.lastName}`);
      return full && (full.includes(respName) || respName.includes(full));
    });
    if (byPartialName) return byPartialName;
  }
  return null;
}

// --- routes -------------------------------------------------------------

router.get("/", readGuard, (req, res) => {
  const { missionId } = req.query;
  let responses = readJSON("surveyResponses");
  if (missionId) responses = responses.filter((r) => r.missionId === missionId);
  res.json(responses);
});

// Replaces any prior import for the same mission (re-uploading a corrected sheet is expected).
router.post("/import", writeGuard, (req, res) => {
  const { missionId, missionName, responses } = req.body || {};
  if (!missionId || !Array.isArray(responses) || responses.length === 0) {
    return res.status(400).json({ error: "بيانات الاستيراد غير صالحة" });
  }
  const all = readJSON("surveyResponses").filter((r) => r.missionId !== missionId);
  const imported = responses.map((r) => ({
    id: cryptoRandomId(),
    missionId,
    missionName: missionName || "",
    responderName: r.responderName || "",
    phone: r.phone || "",
    village: r.village || "",
    approved: !!r.approved,
    rawAnswers: r.rawAnswers || {},
    importedAt: new Date().toISOString(),
    importedBy: req.user.username,
  }));
  writeJSON("surveyResponses", [...all, ...imported]);

  appendLog({
    username: req.user.username,
    role: req.user.role,
    action: "استيراد استبيان",
    module: "الاستبيانات",
    recordId: missionId,
    oldValue: null,
    newValue: { count: imported.length, missionName },
    result: "نجاح",
    ip: req.ip,
  });

  res.status(201).json({ imported: imported.length });
});

router.delete("/:id", writeGuard, (req, res) => {
  const all = readJSON("surveyResponses");
  const idx = all.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "غير موجود" });
  const [removed] = all.splice(idx, 1);
  writeJSON("surveyResponses", all);
  appendLog({
    username: req.user.username,
    role: req.user.role,
    action: "حذف رد استبيان",
    module: "الاستبيانات",
    recordId: removed.id,
    oldValue: removed,
    newValue: null,
    result: "نجاح",
    ip: req.ip,
  });
  res.json({ ok: true });
});

// Matches approved respondents to existing members (by phone, then name). By
// default adds everyone matched; if `randomCount` is given, randomly selects
// that many from the matched pool instead (useful when more people approve
// than a mission actually needs — a fair way to pick who goes). Unmatched
// respondents are returned either way so IT/Administrator can add them as
// new members manually.
router.post("/auto-generate-team", writeGuard, (req, res) => {
  const { missionId, randomCount } = req.body || {};
  if (!missionId) return res.status(400).json({ error: "missionId مطلوب" });

  const missions = readJSON("missions");
  const missionIdx = missions.findIndex((m) => m.id === missionId);
  if (missionIdx === -1) return res.status(404).json({ error: "المهمة غير موجودة" });

  const members = readJSON("members");
  const approvedResponses = readJSON("surveyResponses").filter(
    (r) => r.missionId === missionId && r.approved
  );

  if (approvedResponses.length === 0) {
    return res.status(400).json({ error: "لا توجد ردود موافقة على المشاركة في هذا الاستبيان" });
  }

  const matchedMembers = [];
  const unmatched = [];

  for (const r of approvedResponses) {
    const member = findMatchingMember(r, members);
    if (member) {
      if (!matchedMembers.some((m) => m.id === member.id)) matchedMembers.push(member);
    } else {
      unmatched.push({ responderName: r.responderName, phone: r.phone });
    }
  }

  let selectedMembers = matchedMembers;
  let notSelected = [];
  const count = Number(randomCount);

  if (Number.isFinite(count) && count > 0 && count < matchedMembers.length) {
    // Fisher-Yates shuffle, then take the first `count` — fair random pick.
    const shuffled = [...matchedMembers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    selectedMembers = shuffled.slice(0, count);
    notSelected = shuffled.slice(count);
  }

  const finalIds = new Set(missions[missionIdx].members || []);
  selectedMembers.forEach((m) => finalIds.add(m.id));

  missions[missionIdx].members = Array.from(finalIds);
  missions[missionIdx].updatedAt = new Date().toISOString();
  missions[missionIdx].updatedBy = req.user.username;
  writeJSON("missions", missions);

  appendLog({
    username: req.user.username,
    role: req.user.role,
    action: count ? "اختيار عشوائي للفريق من الاستبيان" : "توليد فريق تلقائي من الاستبيان",
    module: "المهام",
    recordId: missionId,
    oldValue: null,
    newValue: { matched: matchedMembers.length, selected: selectedMembers.length, unmatched: unmatched.length },
    result: "نجاح",
    ip: req.ip,
  });

  res.json({
    matchedCount: finalIds.size,
    poolSize: matchedMembers.length,
    selectedCount: selectedMembers.length,
    notSelected: notSelected.map((m) => `${m.firstName} ${m.lastName}`),
    unmatched,
    mission: missions[missionIdx],
  });
});

export default router;
