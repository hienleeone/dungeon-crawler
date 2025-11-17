// =============================
// Firebase Config
// =============================
const firebaseConfig = {
    apiKey: "AIzaSyAW-FtufPxI9mCuZDuTgxRUjHOGtgJ2hgc",
    authDomain: "soulmc-account.firebaseapp.com",
    projectId: "soulmc-account",
    storageBucket: "soulmc-account.firebasestorage.app",
    messagingSenderId: "508725790521",
    appId: "1:508725790521:web:a58b2f0608b028baaccae8",
    measurementId: "G-NW033BL7PW"
};

// =============================
// Init
// =============================
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

window.auth = auth;
window.db = db;

// =============================
// DEFAULT PLAYER STRUCTURE
// =============================
function buildDefaultPlayer(uid, name) {
    return {
        uid,
        name,
        gold: 0,
        lvl: 1,
        blessing: 1,
        allocated: false,

        stats: {
            atk: 10,
            def: 5,
            hp: 100,
            hpMax: 100,
            atkSpd: 1,
            critRate: 5,
            critDmg: 150,
            vamp: 0
        },

        baseStats: {
            hp: 100,
            atk: 10,
            def: 5,
            atkSpd: 1,
            vamp: 0,
            critRate: 5,
            critDmg: 50
        },

        bonusStats: {
            hp: 0,
            atk: 0,
            def: 0,
            atkSpd: 0,
            vamp: 0,
            critRate: 0,
            critDmg: 0
        },

        equippedStats: {
            hp: 0,
            atk: 0,
            def: 0,
            atkSpd: 0,
            vamp: 0,
            critRate: 0,
            critDmg: 0
        },

        tempStats: {
            atk: 0,
            atkSpd: 0
        },

        skills: [],
        inventory: {
            equipment: []
        },

        exp: {
            expCurr: 0,
            expMax: 100,
            expCurrLvl: 0,
            expMaxLvl: 100,
            lvlGained: 0
        },

        playtime: 0,
        inCombat: false,

        dungeon: {
            progress: { floor: 1, room: 1 },
            status: { exploring: false, paused: false, event: false },
            statistics: {
                kills: 0,
                deaths: 0,
                runtime: 0
            },
            backlog: [],
            action: 0,
            settings: {
                enemyBaseLvl: 1,
                enemyLvlGap: 5,
                enemyBaseStats: 1,
                enemyScaling: 1.1
            }
        },

        volumeSettings: {
            master: 0.5,
            bgm: 0.25,
            sfx: 0.5
        },

        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
}

// =============================
// SANITIZER
// =============================
function sanitizePlayerData(p) {
    if (!p) return null;
    p.gold = Math.min(Math.max(p.gold ?? 0, 0), 1e9);
    p.lvl = Math.min(Math.max(p.lvl ?? 1, 1), 1000);
    return p;
}

// =============================
// CREATE PLAYER
// =============================
async function createPlayerData(playerName) {
    const user = auth.currentUser;
    if (!user) throw new Error("Chưa đăng nhập");

    const ref = db.collection("players").doc(user.uid);
    const snap = await ref.get();

    if (snap.exists) return snap.data();

    const player = buildDefaultPlayer(user.uid, playerName);
    const sanitized = sanitizePlayerData(player);

    await ref.set(sanitized, { merge: true });
    return sanitized;
}

// =============================
// GET PLAYER
// =============================
async function getPlayerData(uid) {
    const doc = await db.collection("players").doc(uid).get();
    return doc.exists ? doc.data() : null;
}

// =============================
// UPDATE PLAYER
// =============================
async function updatePlayerData(uid, data) {
    const sanitized = sanitizePlayerData(data);
    return db.collection("players").doc(uid).set(sanitized, { merge: true });
}

// =============================
// AUTO SAVE
// =============================
let autoSaveInterval;

function startAutoSave(uid, getLocalPlayer) {
    autoSaveInterval = setInterval(async () => {
        const p = getLocalPlayer();
        if (!p) return;
        await updatePlayerData(uid, p);
        console.log("Auto-saved");
    }, 30000);
}

function stopAutoSave() {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
}

// =============================
console.log("🔥 Firebase ready (NO CLOUD FUNCTIONS)");
