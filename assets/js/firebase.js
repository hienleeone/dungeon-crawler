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
// Initialize Firebase (compat)
// =============================
firebase.initializeApp(firebaseConfig);

// =============================
// Services (compat)
// =============================
const auth = firebase.auth();
const db = firebase.firestore();

// ⚠️ KHỞI TẠO CLOUD FUNCTIONS ĐÚNG REGION
// BẮT BUỘC dùng compat vì project dùng namespace API
const functions = firebase.app().functions("asia-southeast1");

// Expose global
window.auth = auth;
window.db = db;
window.functions = functions;

console.log("🔥 Firebase initialized (compat)");

// =============================
// CHECKSUM
// =============================
const generateChecksum = (data) => {
    const str = JSON.stringify({
        gold: data.gold,
        lvl: data.lvl,
        stats: data.stats ? {
            atk: data.stats.atk,
            def: data.stats.def,
            hp: data.stats.hp,
            hpMax: data.stats.hpMax
        } : null
    });

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
};

const verifyChecksum = (data, checksum) => {
    return generateChecksum(data) === checksum;
};

// =============================
// SECURITY VALIDATION
// =============================
const validateBeforeSave = (p) => {
    if (!p) return null;

    if (p.gold > 1e9) p.gold = 1e9;
    if (p.gold < 0) p.gold = 0;

    if (p.lvl > 1000) p.lvl = 1000;
    if (p.lvl < 1) p.lvl = 1;

    if (p.stats) {
        if (p.stats.atk > 999999) p.stats.atk = 999999;
        if (p.stats.def > 999999) p.stats.def = 999999;
        if (p.stats.hpMax > 99999999) p.stats.hpMax = 99999999;
        if (p.stats.hp > p.stats.hpMax) p.stats.hp = p.stats.hpMax;
        if (p.stats.critRate > 100) p.stats.critRate = 100;
        if (p.stats.critDmg > 1000) p.stats.critDmg = 1000;
    }

    return p;
};

// =============================
// FIREBASE AUTH SHORTCUTS
// =============================
const firebaseLogin = (email, password) =>
    auth.signInWithEmailAndPassword(email, password);

const firebaseRegister = (email, password) =>
    auth.createUserWithEmailAndPassword(email, password);

const firebaseLogout = () => auth.signOut();

const getCurrentUser = () => auth.currentUser;

// =============================
// CHECK PLAYER NAME EXISTS
// =============================
const checkPlayerNameExists = async (name) => {
    const snap = await db
        .collection("players")
        .where("name", "==", name)
        .limit(1)
        .get();

    return !snap.empty;
};

// =============================
// CLOUD FUNCTIONS
// =============================
const createPlayerData = async (playerName) => {
    const fn = window.functions.httpsCallable("createPlayer");
    const res = await fn({ name: playerName });
    return res.data.player;
};

const updatePlayerData = async (uid, data) => {
    const clean = validateBeforeSave(data);
    const fn = window.functions.httpsCallable("serverUpdatePlayer");
    return await fn({ player: clean });
};

// =============================
// FIRESTORE PLAYER GET
// =============================
const getPlayerData = async (uid) => {
    const doc = await db.collection("players").doc(uid).get();
    return doc.exists ? doc.data() : null;
};

// =============================
// AUTO-SAVE
// =============================
let autoSaveInterval = null;

const startAutoSave = (uid, getPlayer) => {
    autoSaveInterval = setInterval(async () => {
        const data = getPlayer();
        if (!data || !getCurrentUser()) return;

        const safe = validateBeforeSave(data);
        try {
            await updatePlayerData(uid, safe);
        } catch (e) {
            console.error("Auto-save failed:", e);
        }
    }, 30000);
};

const stopAutoSave = () => {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
};
