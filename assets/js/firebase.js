// ===============================
// Firebase v9 Modular (CHUẨN)
// ===============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// ========================================
// Firebase Config (LẤY TỪ FIREBASE CONSOLE)
// ========================================
const firebaseConfig = {
    apiKey: "AIzaSyAW-FtufPxI9mCuZDuTgxRUjHOGtgJ2hgc",
    authDomain: "soulmc-account.firebaseapp.com",
    projectId: "soulmc-account",
    storageBucket: "soulmc-account.firebasestorage.app",
    messagingSenderId: "508725790521",
    appId: "1:508725790521:web:a58b2f0608b028baaccae8",
    measurementId: "G-NW033BL7PW"
};

// ========================================
// Init Firebase
// ========================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.auth = auth;
window.db = db;

// =======================================================
// AUTH FUNCTIONS
// =======================================================

export function firebaseLogin(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

export function firebaseRegister(email, password) {
    return createUserWithEmailAndPassword(auth, email, password)
        .then((cred) => cred.user);
}

export function firebaseLogout() {
    return signOut(auth);
}

export function getCurrentUser() {
    return auth.currentUser;
}

// =======================================================
// FIRESTORE FUNCTIONS
// =======================================================

// Lấy player
export async function getPlayerData(uid) {
    const ref = doc(db, "players", uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
}

// Tạo player
export async function createPlayerData(uid, name, data) {
    const ref = doc(db, "players", uid);
    await setDoc(ref, data);
    return true;
}

// Update player (auto-save)
export async function updatePlayerData(uid, playerData) {
    const ref = doc(db, "players", uid);
    return updateDoc(ref, playerData);
}

// Xoá player
export async function deletePlayerData(uid) {
    const ref = doc(db, "players", uid);
    return setDoc(ref, {}); // xoá sạch dữ liệu
}

// Volume settings
export async function getVolumeData(uid) {
    const ref = doc(db, "volume", uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
}

export async function saveVolumeData(uid, volume) {
    const ref = doc(db, "volume", uid);
    return setDoc(ref, volume);
}

// =======================================================
// AUTO SAVE SYSTEM
// =======================================================

let autoSaveInterval = null;

export function startAutoSave(uid, getPlayerFunc) {
    if (autoSaveInterval) clearInterval(autoSaveInterval);

    autoSaveInterval = setInterval(async () => {
        const player = getPlayerFunc();
        if (player) {
            try {
                await updatePlayerData(uid, player);
            } catch (err) {
                console.error("Auto-save error:", err);
            }
        }
    }, 5000);
}

export function stopAutoSave() {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    autoSaveInterval = null;
}
