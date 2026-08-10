import express from "express";
import { readJSON, writeJSON } from "../utils/store.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
// Nominatim's usage policy requires a descriptive User-Agent and no more than
// ~1 request/second — we respect both below.
const USER_AGENT = "FirstResponderTeam-AlJoumeh/1.0 (internal rescue-ops tool)";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Free-text location search (map search box). Results are not persisted.
router.get("/search", requireAuth, async (req, res) => {
  const { q } = req.query;
  if (!q || String(q).trim().length < 2) {
    return res.status(400).json({ error: "أدخل نص بحث لا يقل عن حرفين" });
  }
  try {
    const url = `${NOMINATIM_BASE}/search?format=json&limit=6&accept-language=ar&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!r.ok) throw new Error(`Nominatim returned ${r.status}`);
    const data = await r.json();
    res.json(
      data.map((d) => ({
        displayName: d.display_name,
        lat: parseFloat(d.lat),
        lng: parseFloat(d.lon),
      }))
    );
  } catch (err) {
    res.status(502).json({
      error: "تعذر الاتصال بخدمة تحديد المواقع (OpenStreetMap). تأكد من اتصال الخادم بالإنترنت.",
    });
  }
});

// Geocodes a list of village/district names, caching results in data/villages.json
// so repeated survey imports for the same area don't re-hit the geocoding service.
router.post("/geocode-villages", requireAuth, async (req, res) => {
  const { names } = req.body || {};
  if (!Array.isArray(names) || names.length === 0) {
    return res.status(400).json({ error: "لا توجد أسماء لتحديد مواقعها" });
  }
  const cache = readJSON("villages"); // [{ name, lat, lng }]
  const cacheMap = new Map(cache.map((v) => [v.name.trim().toLowerCase(), v]));
  const uniqueNames = [...new Set(names.map((n) => String(n || "").trim()).filter(Boolean))];
  const toFetch = uniqueNames.filter((n) => !cacheMap.has(n.toLowerCase()));

  let failed = [];
  for (const name of toFetch) {
    try {
      const url = `${NOMINATIM_BASE}/search?format=json&limit=1&accept-language=ar&q=${encodeURIComponent(
        name + ", لبنان"
      )}`;
      const r = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      const data = await r.json();
      if (data[0]) {
        const entry = { name, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        cache.push(entry);
        cacheMap.set(name.toLowerCase(), entry);
      } else {
        failed.push(name);
      }
    } catch (err) {
      failed.push(name);
    }
    await sleep(1100); // respect Nominatim's ~1 req/sec policy
  }

  writeJSON("villages", cache);

  const results = uniqueNames
    .map((n) => cacheMap.get(n.toLowerCase()))
    .filter(Boolean);

  res.json({ resolved: results, failed });
});

// Returns the cached village/district -> coordinates lookup (for the survey heatmap layer).
router.get("/villages", requireAuth, (req, res) => {
  res.json(readJSON("villages"));
});

export default router;
