// Render's FREE tier spins a service down after ~15 minutes with no inbound
// traffic. This periodically pings the service's own public URL to keep it
// warm — but read this before relying on it:
//
// 1. It is NOT officially supported by Render. Their own guidance is to use
//    a paid instance if cold starts matter — an external ping is described
//    by their community support as "a workaround, not a guaranteed fix."
// 2. IMPORTANT: this does NOT solve data loss. Render's free tier still has
//    no persistent disk, and the container can still be restarted/redeployed
//    independent of the inactivity timer (platform maintenance, deploys,
//    etc.) — wiping data-on-disk regardless of whether pings kept it "awake."
//    If you need your data to actually survive, you need Render's paid
//    Starter plan + a persistent disk (see README) — which also has the
//    side effect of never spinning down in the first place, making this
//    file unnecessary.
//
// This is opt-in (KEEP_ALIVE=true) specifically because it only makes sense
// on Render free tier — it's a no-op cost elsewhere and shouldn't run by
// default.
export function startKeepAlivePing() {
  const target = process.env.RENDER_EXTERNAL_URL || process.env.KEEP_ALIVE_URL;
  if (!target) {
    console.log("KEEP_ALIVE=true but no RENDER_EXTERNAL_URL/KEEP_ALIVE_URL found — skipping.");
    return;
  }

  const url = `${target.replace(/\/$/, "")}/api/health`;
  const INTERVAL_MS = 10 * 60 * 1000; // 10 min — under Render's ~15 min threshold

  console.log(`Keep-alive ping enabled: pinging ${url} every 10 minutes.`);
  setInterval(async () => {
    try {
      const res = await fetch(url);
      console.log(`[keep-alive] ping ${res.status} @ ${new Date().toISOString()}`);
    } catch (err) {
      console.log(`[keep-alive] ping failed: ${err.message}`);
    }
  }, INTERVAL_MS);
}
