import { readJSON, writeJSON } from "./store.js";
import { hasAccess } from "./permissions.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK_SIZE = 100; // Expo's push API limit per request

// Sends a push notification to every registered device belonging to a user
// who currently has at least "view" access to `feature` - re-checked at
// send time (not just at token-registration time) so a permission revoked
// after registration is respected immediately, same as every other access
// check in this app.
export async function notifyUsersWithAccess({ feature, title, body, data = {} }) {
  const tokens = readJSON("pushTokens");
  const users = readJSON("users");

  const eligibleTokens = tokens.filter((t) => {
    const user = users.find((u) => u.id === t.userId);
    return user && hasAccess(user, feature, "view");
  });

  if (eligibleTokens.length === 0) return { sent: 0, removed: 0 };

  const messages = eligibleTokens.map((t) => ({
    to: t.token,
    sound: "default",
    title,
    body,
    data,
  }));

  const staleTokens = new Set();

  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(chunk),
      });
      const result = await res.json();
      (result.data || []).forEach((ticket, idx) => {
        // A device that's uninstalled the app or disabled notifications
        // reports this specific error - worth pruning so we stop trying.
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          staleTokens.add(chunk[idx].to);
        }
      });
    } catch (err) {
      console.error("Push notification chunk failed:", err.message);
    }
  }

  if (staleTokens.size > 0) {
    const remaining = tokens.filter((t) => !staleTokens.has(t.token));
    writeJSON("pushTokens", remaining);
  }

  return { sent: eligibleTokens.length, removed: staleTokens.size };
}
