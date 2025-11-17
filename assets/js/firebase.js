// =============================
// Firebase Configuration
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
// SERVICES
// =============================
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.app().functions("asia-southeast1");

// EXPORT GLOBAL
window.auth = auth;
window.db = db;
window.functions = functions;


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

const verifyChecksum = (d, c) => generateChecksum(d) === c;


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
// CLOUD FUNCTIONS
// =============================
const createPlayerData = async (name) => {
    const fn = window.functions.httpsCallable("createPlayer");
    const res = await fn({ name });
    return res.data.player;
};

const updatePlayerData = async (uid, data) => {
    const valid = validateBeforeSave(data);
    const fn = window.functions.httpsCallable("serverUpdatePlayer");
    return fn({ player: valid });
};


// =============================
// FIRESTORE
// =============================
const getPlayerData = (uid) =>
    db.collection("players").doc(uid).get()
        .then(doc => doc.exists ? doc.data() : null);


// =============================
// AUTH SHORTCUTS
// =============================
const firebaseLogin = (email, pass) =>
    auth.signInWithEmailAndPassword(email, pass);

const firebaseRegister = (email, pass) =>
    auth.createUserWithEmailAndPassword(email, pass);

const firebaseLogout = () => auth.signOut();

const getCurrentUser = () => auth.currentUser;


// =============================
console.log("🔥 Firebase initialized");
