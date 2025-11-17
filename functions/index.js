const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/** ======= GENERATE CHECKSUM ======= */
function generateChecksum(data) {
    const core = JSON.stringify({
        gold: data.gold,
        lvl: data.lvl,
        stats: data.stats ? {
            atk: data.stats.atk,
            def: data.stats.def,
            hp: data.stats.hp,
            hpMax: data.stats.hpMax,
        } : null,
    });

    let hash = 0;
    for (let i = 0; i < core.length; i++) {
        const char = core.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return hash;
}

/** ======= VALIDATION (Server-Side Anti-Cheat) ======= */
function validatePlayerData(player) {
    if (player.gold > 1000000000) return false;
    if (player.lvl > 1000) return false;
    if (player.stats) {
        if (player.stats.atk > 999999) return false;
        if (player.stats.def > 999999) return false;
        if (player.stats.hpMax > 99999999) return false;
        if (player.stats.critRate > 100) return false;
        if (player.stats.critDmg > 1000) return false;
    }
    return true;
}

/** ======= CREATE NEW PLAYER ======= */
exports.createPlayer = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Not logged in.");
    }

    const uid = context.auth.uid;
    const name = data.name;

    // Kiểm tra tên bị trùng
    const exist = await db.collection("players")
        .where("name", "==", name)
        .get();

    if (!exist.empty) {
        throw new functions.https.HttpsError("already-exists", "Tên đã tồn tại.");
    }

    const player = {
        uid,
        name,
        gold: 0,
        lvl: 1,
        stats: {
            atk: 10,
            def: 5,
            hp: 100,
            hpMax: 100,
            critRate: 5,
            critDmg: 150
        },
        inventory: {
            equipment: []
        },
        dungeon: {
            progress: { floor: 1 }
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    player.checksum = generateChecksum(player);

    // Save player
    await db.collection("players").doc(uid).set(player);

    // Log
    await db.collection("adminLogs").add({
        type: "createPlayer",
        uid,
        name,
        time: admin.firestore.FieldValue.serverTimestamp()
    });

    return { status: "ok", player };
});

/** ===== UPDATE PLAYER (SERVER-SIDE ONLY) ===== */
exports.serverUpdatePlayer = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated");
    }

    const uid = context.auth.uid;
    const newData = data.player;

    // Check valid
    if (!validatePlayerData(newData)) {
        throw new functions.https.HttpsError("invalid-argument", "Cheat detected.");
    }

    newData.checksum = generateChecksum(newData);

    await db.collection("players").doc(uid).update(newData);

    return { status: "ok" };
});
