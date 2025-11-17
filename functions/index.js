// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Config caps
const CAPS = {
  GOLD_MAX: 1_000_000_000,
  LVL_MAX: 1000,
  INVENTORY_MAX: 1000,
  ATK_MAX: 999999,
  DEF_MAX: 999999,
  HP_MAX: 99_999_999
};

// Utility: simple rate limit (X calls per minute)
async function checkRateLimit(uid, action, limit = 10, periodSeconds = 60) {
  const ref = db.collection('rateLimits').doc(uid);
  const doc = await ref.get();
  const now = Date.now();
  let data = doc.exists ? doc.data() : { actions: [] };

  // purge old
  data.actions = (data.actions || []).filter(a => (now - a.t) < (periodSeconds * 1000));
  data.actions.push({ action, t: now });
  await ref.set({ actions: data.actions }, { merge: true });

  const count = data.actions.filter(a => a.action === action).length;
  return count <= limit;
}

function clampPlayerFields(player) {
  if (player.gold && player.gold > CAPS.GOLD_MAX) player.gold = CAPS.GOLD_MAX;
  if (player.lvl && player.lvl > CAPS.LVL_MAX) player.lvl = CAPS.LVL_MAX;
  if (player.stats) {
    if (player.stats.atk > CAPS.ATK_MAX) player.stats.atk = CAPS.ATK_MAX;
    if (player.stats.def > CAPS.DEF_MAX) player.stats.def = CAPS.DEF_MAX;
    if (player.stats.hpMax > CAPS.HP_MAX) player.stats.hpMax = CAPS.HP_MAX;
  }
  if (player.inventory && player.inventory.equipment && player.inventory.equipment.length > CAPS.INVENTORY_MAX) {
    player.inventory.equipment = player.inventory.equipment.slice(0, CAPS.INVENTORY_MAX);
  }
  return player;
}

// Audit logger
async function auditLog(uid, action, payload, result, suspicious=false) {
  const doc = db.collection('adminLogs').doc();
  await doc.set({
    uid, action, payload, result, suspicious, ts: admin.firestore.FieldValue.serverTimestamp()
  });
}

// ======================= Combat resolution (callable) =======================
exports.resolveCombat = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated','Auth required');

  const uid = context.auth.uid;
  // Simple rate limit
  const okRate = await checkRateLimit(uid, 'resolveCombat', 20, 60);
  if (!okRate) {
    await auditLog(uid, 'resolveCombat', data, {error:'rate_limited'}, true);
    throw new functions.https.HttpsError('resource-exhausted','Too many combat calls');
  }

  // data should contain minimal info: { enemyId, playerStateChecksum, clientTimestamp, clientSeed? }
  const { enemyId, clientSummary } = data;
  if (!enemyId || !clientSummary) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing params');
  }

  const playerRef = db.collection('players').doc(uid);
  const playerSnap = await playerRef.get();
  if (!playerSnap.exists) {
    throw new functions.https.HttpsError('not-found','Player not found');
  }
  let player = playerSnap.data();

  // anti-cheat checks
  // Example: if clientSummary.lvl > server lvl + 2 → suspicious
  if (clientSummary.lvl && clientSummary.lvl > (player.lvl + 2)) {
    await auditLog(uid, 'resolveCombat', {clientSummary, player}, {error:'lvl_delta_too_high'}, true);
    // flag but continue with server-side data
    await playerRef.update({ flagged: true });
  }

  // Server-side enemy lookup (should be in server DB)
  // For example purposes, create deterministic simple enemy
  const enemy = { id: enemyId, hp: 100 + (player.lvl || 1) * 10, atk: 5 + (player.lvl || 1) * 2, xp: 10 + (player.lvl || 1) * 2, gold: 5 + (player.lvl || 1) * 2 };

  // Server resolves combat deterministically
  // Very simple resolution: compute victory if player.atk > enemy.atk (replace with your real logic)
  const playerAtk = (player.stats && player.stats.atk) ? player.stats.atk : 1;
  const playerDef = (player.stats && player.stats.def) ? player.stats.def : 0;
  let victory = (playerAtk - enemy.atk) > 0;

  // compute rewards
  let goldGain = victory ? Math.min(Math.floor(enemy.gold * (1 + (player.lvl||1)/100)), CAPS.GOLD_MAX) : 0;
  let xpGain = victory ? enemy.xp : 0;

  // Apply and clamp
  player.gold = Math.min((player.gold || 0) + goldGain, CAPS.GOLD_MAX);
  player.xp = (player.xp || 0) + xpGain;
  // Level up simple example:
  if (player.xp >= ((player.lvl || 1) * 100)) {
    player.xp = player.xp - ((player.lvl || 1) * 100);
    player.lvl = (player.lvl || 1) + 1;
  }

  player = clampPlayerFields(player);

  // Update by admin SDK (bypass rules)
  await playerRef.set({
    ...player,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  const result = { victory, goldGain, xpGain, lvl: player.lvl, gold: player.gold };
  await auditLog(uid, 'resolveCombat', {enemyId, clientSummary}, result, false);

  return result;
});

// ======================= Gacha roll (callable) =======================
exports.rollGacha = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated','Auth required');
  const uid = context.auth.uid;

  // rate limit gacha: e.g., 5 per minute
  const okRate = await checkRateLimit(uid, 'rollGacha', 10, 60);
  if (!okRate) {
    await auditLog(uid, 'rollGacha', data, {error:'rate_limited'}, true);
    throw new functions.https.HttpsError('resource-exhausted','Too many rolls per minute');
  }

  const playerRef = db.collection('players').doc(uid);
  const snap = await playerRef.get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found','Player not found');
  let player = snap.data();

  // cost check
  const cost = 1000; // example cost
  if ((player.gold || 0) < cost) {
    await auditLog(uid, 'rollGacha', {cost}, {error:'not_enough_gold'}, true);
    throw new functions.https.HttpsError('failed-precondition','Not enough gold');
  }

  // perform roll securely server-side
  // use server random
  const r = Math.random();
  let reward;
  if (r < 0.005) reward = { rarity: 'Heirloom', name: 'Blade of Legends', atk: 5000 };
  else if (r < 0.05) reward = { rarity: 'Legendary', name: 'Legend Sword', atk: 1000 };
  else if (r < 0.25) reward = { rarity: 'Epic', name: 'Epic Sword', atk: 300 };
  else reward = { rarity: 'Common', name: 'Common Sword', atk: 10 };

  // Deduct cost and add item
  player.gold = Math.max(0, (player.gold || 0) - cost);
  player.inventory = player.inventory || { equipment: [] };
  player.inventory.equipment = player.inventory.equipment || [];
  player.inventory.equipment.push(reward);
  player = clampPlayerFields(player);

  // persist
  await playerRef.set({
    ...player,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  const result = { reward, gold: player.gold };
  await auditLog(uid, 'rollGacha', {cost}, result, false);
  return result;
});

// ======================= Save progress (callable) =======================
exports.saveProgress = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated','Auth required');
  const uid = context.auth.uid;
  // minimal rate limit
  const okRate = await checkRateLimit(uid, 'saveProgress', 60, 60);
  if (!okRate) {
    await auditLog(uid, 'saveProgress', data, {error:'rate_limited'}, true);
    throw new functions.https.HttpsError('resource-exhausted','Too many saves');
  }

  // data expected: a small delta or summary (not raw full client state)
  // server must validate / clamp before applying
  const delta = data.delta;
  if (!delta) throw new functions.https.HttpsError('invalid-argument','Missing delta');

  const playerRef = db.collection('players').doc(uid);
  const snap = await playerRef.get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found','Player not found');

  let player = snap.data();

  // Example: only allow saving cosmetics or volume via this endpoint
  const allowedClientFields = ['volumeSettings', 'displayName'];
  const disallowed = Object.keys(delta).filter(k => !allowedClientFields.includes(k));
  if (disallowed.length > 0) {
    // suspicious attempt to directly set game fields
    await auditLog(uid, 'saveProgress', {delta}, {error:'attempt_write_game_fields'}, true);
    throw new functions.https.HttpsError('permission-denied','Attempted to modify protected fields');
  }

  // apply safe fields
  const updates = {};
  if (delta.volumeSettings) updates.volumeSettings = delta.volumeSettings;
  if (delta.displayName) updates.displayName = delta.displayName;

  updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  await playerRef.set(updates, { merge: true });

  await auditLog(uid, 'saveProgress', {delta}, {ok:true}, false);
  return { ok: true };
});
