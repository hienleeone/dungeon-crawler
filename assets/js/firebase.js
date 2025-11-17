// =============================
//  Firebase Config
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
// Initialize Firebase
// =============================
firebase.initializeApp(firebaseConfig);


// =============================
// Firebase Services
// =============================
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.app().functions("asia-southeast1");

// Export global (file khác sẽ dùng)
window.auth = auth;
window.db = db;
window.functions = functions;

console.log("🔥 Firebase initialized");


// =============================
// SECURITY – Validate Before Save
// =============================
const validateBeforeSave = (p) => {
    if (!p) return p;

    // Basic sanity limits
    if (p.gold > 1_000_000_000) p.gold = 1_000_000_000;
    if (p.gold < 0) p.gold = 0;

    if (p.lvl > 1000) p.lvl = 1000;
    if (p.lvl < 1) p.lvl = 1;

    if (p.stats) {
        if (p.stats.atk > 999999) p.stats.atk = 999999;
        if (p.stats.def > 999999) p.stats.def = 999999;
        if (p.stats.atkSpd > 10) p.stats.atkSpd = 10;
        if (p.stats.hp > p.stats.hpMax) p.stats.hp = p.stats.hpMax;
        if (p.stats.hpMax > 99999999) p.stats.hpMax = 99999999;
        if (p.stats.vamp > 100) p.stats.vamp = 100;
        if (p.stats.critRate > 100) p.stats.critRate = 100;
        if (p.stats.critDmg > 1000) p.stats.critDmg = 1000;
    }

    if (p.inventory?.equipment?.length > 1000) {
        p.inventory.equipment = p.inventory.equipment.slice(0, 1000);
    }

    return p;
};


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
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
};

const verifyChecksum = (data, checksum) =>
    generateChecksum(data) === checksum;


// =============================
// AUTH
// =============================
const firebaseLogin = (email, password) =>
    auth.signInWithEmailAndPassword(email, password);

const firebaseRegister = (email, password) =>
    auth.createUserWithEmailAndPassword(email, password);

const firebaseLogout = () =>
    auth.signOut();

const getCurrentUser = () => auth.currentUser;


// =============================
// CREATE PLAYER (Cloud Function)
// =============================
const createPlayerData = async (playerName) => {
    try {
        const fn = window.functions.httpsCallable("createPlayer");
        const res = await fn({ name: playerName });
        return res.data.player;
    } catch (err) {
        console.error("❌ createPlayer error:", err);
        throw err;
    }
};


// =============================
// PLAYER DATA
// =============================
const getPlayerData = async (uid) => {
    try {
        const doc = await db.collection("players").doc(uid).get();
        return doc.exists ? doc.data() : null;
    } catch (err) {
        console.error("❌ getPlayerData error:", err);
        return null;
    }
};

const updatePlayerData = async (uid, playerData) => {
    try {
        const validated = validateBeforeSave(playerData);
        const fn = window.functions.httpsCallable("serverUpdatePlayer");
        return await fn({ player: validated });
    } catch (err) {
        console.error("❌ updatePlayerData error:", err);
        throw err;
    }
};


// =============================
// VOLUME DATA
// =============================
const saveVolumeData = (uid, volumeData) =>
    db.collection("players").doc(uid).update({
        volumeSettings: volumeData
    });

const getVolumeData = async (uid) => {
    const doc = await db.collection("players").doc(uid).get();
    return doc.exists ? doc.data().volumeSettings || null : null;
};


// =============================
// AUTO SAVE
// =============================
let autoSaveInterval = null;

const startAutoSave = (uid, getPlayerDataFunc) => {
    if (autoSaveInterval) clearInterval(autoSaveInterval);

    autoSaveInterval = setInterval(async () => {
        try {
            const p = getPlayerDataFunc();
            if (p && getCurrentUser()) {
                const validated = validateBeforeSave(p);
                await updatePlayerData(uid, validated);
                console.log("💾 Auto-save OK");
            }
        } catch (err) {
            console.error("❌ Auto-save error:", err);
        }
    }, 30000);
};

const stopAutoSave = () => {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
};
