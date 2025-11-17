const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Chỉ khởi tạo 1 lần
admin.initializeApp();
const db = admin.firestore();

/* ======================================================
 * CHECKSUM – chống sửa client
 * ==================================================== */
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
        hash = ((hash << 5) - hash) + core.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

/* ======================================================
 * VALIDATION ANTI-CHEAT SERVER-SIDE
 * ==================================================== */
function validatePlayerData(player) {
    if (!player) return false;

    if (player.gold > 1000000000) return false;
    if (player.lvl > 1000) return false;

    if (player.stats) {
        if (player.stats.atk > 999999) return false;
        if (player.stats.def > 999999) return false;
        if (player.stats.hpMax > 99999999) return false;
        if (player.stats.hp > player.stats.hpMax) return false;
        if (player.stats.critRate > 100) return false;
        if (player.stats.critDmg > 1000) return false;
    }

    return true;
}

/* ======================================================
 * CREATE PLAYER (onCall) - tạo nhân vật lần đầu
 * ==================================================== */
exports.createPlayer = functions
    .region("asia-southeast1")
    .https.onCall(async (data, context) => {

        if (!context.auth) {
            throw new functions.https.HttpsError(
                "unauthenticated",
                "Bạn chưa đăng nhập."
            );
        }

        const uid = context.auth.uid;
        const name = data.name?.trim();

        if (!name || name.length < 3) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Tên quá ngắn."
            );
        }

        // Check name exists
        const exist = await db.collection("players")
            .where("name", "==", name)
            .limit(1)
            .get();

        if (!exist.empty) {
            throw new functions.https.HttpsError(
                "already-exists",
                "Tên đã tồn tại."
            );
        }

        // Default player data
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
                progress: {
                    floor: 1
                }
            },
            volumeSettings: {
                master: 0.5,
                bgm: 0.5,
                sfx: 0.5
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        player.checksum = generateChecksum(player);

        await db.collection("players").doc(uid).set(player);

        return {
            status: "ok",
            player
        };
    });

/* ======================================================
 * UPDATE PLAYER (server-only update)
 * ==================================================== */
exports.serverUpdatePlayer = functions
    .region("asia-southeast1")
    .https.onCall(async (data, context) => {

        if (!context.auth) {
            throw new functions.https.HttpsError(
                "unauthenticated",
                "Bạn chưa đăng nhập."
            );
        }

        const uid = context.auth.uid;
        const newData = data.player;

        if (!validatePlayerData(newData)) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Dữ liệu không hợp lệ hoặc nghi có cheat."
            );
        }

        newData.checksum = generateChecksum(newData);

        await db.collection("players")
            .doc(uid)
            .update(newData);

        return { status: "ok" };
    });

