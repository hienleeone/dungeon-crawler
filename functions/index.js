// Scheduled cleanup for globalChat: remove messages older than 6 hours
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

initializeApp();

// Run every 15 minutes in Asia/Ho_Chi_Minh timezone
exports.pruneGlobalChat = onSchedule(
  {
    schedule: "every 15 minutes",
    timeZone: "Asia/Ho_Chi_Minh",
    region: "asia-southeast1",
  },
  async () => {
    const db = getDatabase();
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    const SAFETY = 5 * 60 * 1000; // 5-minute buffer for clock skew
    const cutoff = Date.now() - SIX_HOURS - SAFETY;

    // Query oldest messages up to cutoff
    const ref = db.ref("globalChat");
    const snap = await ref.orderByChild("timestamp").endAt(cutoff).limitToLast(2000).get();
    if (!snap.exists()) return null;

    const updates = {};
    let count = 0;

    snap.forEach((child) => {
      updates["/globalChat/" + child.key] = null;
      count++;
    });

    if (count > 0) {
      // If many, chunk into batches to avoid large payloads
      const keys = Object.keys(updates);
      const CHUNK = 500;
      for (let i = 0; i < keys.length; i += CHUNK) {
        const batch = {};
        keys.slice(i, i + CHUNK).forEach((k) => (batch[k] = null));
        await db.ref().update(batch);
      }
    }

    return null;
  }
);
