import fs from "fs";
import path from "path";

// Defaults to ./data next to the server for local/offline use. In a cloud
// deployment with a persistent volume (see fly.toml), set DATA_DIR to that
// volume's mount path — otherwise all data is lost on every restart/redeploy.
export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

export function readJSON(name) {
  const fp = filePath(name);
  if (!fs.existsSync(fp)) return [];
  const raw = fs.readFileSync(fp, "utf8");
  if (!raw.trim()) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to parse ${name}.json`, e);
    return [];
  }
}

export function writeJSON(name, data) {
  const fp = filePath(name);
  const tmp = fp + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, fp); // atomic-ish replace, avoids partial writes
  return data;
}

export function appendLog(entry) {
  const logs = readJSON("systemLogs");
  logs.unshift({
    id: cryptoRandomId(),
    timestamp: new Date().toISOString(),
    ...entry,
  });
  // keep log file from growing unbounded in this demo (cap 5000 entries)
  writeJSON("systemLogs", logs.slice(0, 5000));
}

export function cryptoRandomId() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
}
