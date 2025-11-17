// assets/js/firebase.js
// Module ES - import this BEFORE main.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc, runTransaction, collection, getDocs
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAW-FtufPxI9mCuZDuTgxRUjHOGtgJ2hgc",
  authDomain: "soulmc-account.firebaseapp.com",
  projectId: "soulmc-account",
  storageBucket: "soulmc-account.firebasestorage.app",
  messagingSenderId: "508725790521",
  appId: "1:508725790521:web:a58b2f0608b028baaccae8",
  measurementId: "G-NW033BL7PW"
  // optional: storageBucket, messagingSenderId, appId
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Sign up: creates Auth user + reserves username + creates user profile + initial gameData
export async function signUpWithEmail({ email, password, username }) {
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCred.user.uid;
  const unameLower = username.trim().toLowerCase();
  const unameRef = doc(db, "usernames", unameLower);
  const userRef = doc(db, "users", uid);
  const gameRef = doc(db, "gameData", uid);

  await runTransaction(db, async (tx) => {
    const unameSnap = await tx.get(unameRef);
    if (unameSnap.exists()) {
      const e = new Error("USERNAME_TAKEN");
      e.code = "USERNAME_TAKEN";
      throw e;
    }
    tx.set(unameRef, { uid: uid, createdAt: Date.now() });
    tx.set(userRef, { email, username, createdAt: Date.now(), role: "player" });
    const initialGame = {
      player: {
        name: username,
        lvl: 1,
        stats: {
          hp: null, hpMax: null, atk: null, def: null,
          pen: null, atkSpd: null, vamp: null, critRate: null, critDmg: null
        },
        baseStats: { hp: 500, atk: 100, def: 50, pen: 0, atkSpd: 0.6, vamp:0, critRate:0, critDmg:50 },
        equippedStats: {},
        bonusStats: {},
        exp: { expCurr:0, expMax:100, expCurrLvl:0, expMaxLvl:100, lvlGained:0 },
        inventory: { consumables: [], equipment: [] },
        equipped: [],
        gold: 0, playtime: 0, kills: 0, deaths: 0, inCombat: false, allocated: false
      },
      dungeon: {
        progress: { floor:1, room:1 },
        statistics: { kills:0, runtime:0 },
        status: { exploring:false, paused:true, event:false },
        settings: { enemyBaseLvl:1, enemyLvlGap:5, enemyBaseStats:1, enemyScaling:1.1 },
        floorMax: 1
      },
      meta: { createdAt: Date.now(), updatedAt: Date.now() }
    };
    tx.set(gameRef, initialGame);
  });

  return { uid };
}

export async function signInWithEmail({ email, password }) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signOut() {
  await fbSignOut(auth);
}

// Load gameData document (returns null if not exists)
export async function loadPlayerData(uid) {
  const gref = doc(db, "gameData", uid);
  const snap = await getDoc(gref);
  return snap.exists() ? snap.data() : null;
}

// Save entire game state into gameData/{uid} (overwrite / merge)
export async function savePlayerData(uid, data) {
  const gref = doc(db, "gameData", uid);
  data.meta = data.meta || {};
  data.meta.updatedAt = Date.now();
  await setDoc(gref, data, { merge: true });
}

// Delete game data (used for "Xóa Dữ Liệu")
export async function deletePlayerData(uid) {
  await deleteDoc(doc(db, "gameData", uid));
}

// Simple leaderboard: client-side sort (works for small userbase)
export async function getTopBy(fieldPath, n = 3) {
  const snaps = await getDocs(collection(db, "gameData"));
  const arr = [];
  snaps.forEach(s => {
    const d = s.data();
    const value = fieldPath.split('.').reduce((acc, k) => acc && acc[k], d) || 0;
    arr.push({ uid: s.id, value, data: d });
  });
  arr.sort((a,b) => b.value - a.value);
  return arr.slice(0, n);
}

// Auth state listener helper
export function onAuthChanged(cb) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return cb(null, null);
    const data = await loadPlayerData(user.uid);
    return cb(user, data);
  });
}
