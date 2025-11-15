/*
  firebase.js - Minimal Firebase scaffolding (modular SDK)
  HOW TO USE:
  - Replace the firebaseConfig placeholder with your Firebase project config.
  - This file initialises Firebase Auth and Firestore and exposes helper functions:
      window.firebaseEnabled = true/false
      window.firebaseAuth, window.firebaseDb
      window.firebaseRegister(email,password)
      window.firebaseLogin(email,password)
      window.firebaseGetPlayer(uid) -> Promise resolving to player object or null
      window.firebaseSetPlayer(uid, playerObj) -> Promise
  - The code also listens for auth state changes and, if a player profile exists,
    writes it to localStorage as "playerData" and reloads the page to preserve existing flow.
  NOTE: This is scaffolding — you must provide valid firebaseConfig values for it to work.
*/
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

window.firebaseEnabled = false;
window.firebaseAuth = null;
window.firebaseDb = null;

const firebaseConfig = {
  // <-- REPLACE THESE WITH YOUR FIREBASE PROJECT CONFIG VALUES
  apiKey: "AIzaSyAW-FtufPxI9mCuZDuTgxRUjHOGtgJ2hgc",
  authDomain: "soulmc-account.firebaseapp.com",
  projectId: "soulmc-account",
  storageBucket: "soulmc-account.firebasestorage.app",
  messagingSenderId: "508725790521",
  appId: "1:508725790521:web:a58b2f0608b028baaccae8",
  measurementId: "G-NW033BL7PW"
};

function tryInit() {
  try {
    const app = initializeApp(firebaseConfig);
    window.firebaseAuth = getAuth(app);
    window.firebaseDb = getFirestore(app);
    window.firebaseEnabled = true;
    console.log("Firebase initialized (placeholder config). Replace firebaseConfig with your values.");
    attachAuthListener();
  } catch (e) {
    console.warn("Firebase init failed:", e);
    window.firebaseEnabled = false;
  }
}

function attachAuthListener() {
  onAuthStateChanged(window.firebaseAuth, async (user) => {
    if (user) {
      console.log("Auth signed in:", user.uid);
      // Try to load player profile from Firestore
      const player = await window.firebaseGetPlayer(user.uid);
      if (player) {
        // write to localStorage so existing code continues to work
        localStorage.setItem("playerData", JSON.stringify(player));
        // reload to let existing initialization read from localStorage
        // But avoid infinite reload loops: check a flag
        if (!sessionStorage.getItem("firebase_reloaded")) {
          sessionStorage.setItem("firebase_reloaded", "1");
          location.reload();
        }
      } else {
        // no profile yet -- leave flow for character creation to run and then save will push to firestore
        console.log("No player profile found for user:", user.uid);
      }
    } else {
      console.log("Auth signed out");
      // clear firebase flag but keep localStorage
      sessionStorage.removeItem("firebase_reloaded");
    }
  });
}

// Auth wrappers
window.firebaseRegister = async (email, password) => {
  if (!window.firebaseEnabled) throw new Error("Firebase not initialized");
  return createUserWithEmailAndPassword(window.firebaseAuth, email, password);
};

window.firebaseLogin = async (email, password) => {
  if (!window.firebaseEnabled) throw new Error("Firebase not initialized");
  return signInWithEmailAndPassword(window.firebaseAuth, email, password);
};

window.firebaseGetPlayer = async (uid) => {
  if (!window.firebaseEnabled) return null;
  try {
    const ref = doc(window.firebaseDb, "players", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data().profile || null;
    }
    return null;
  } catch (e) {
    console.error("firebaseGetPlayer error", e);
    return null;
  }
};

window.firebaseSetPlayer = async (uid, playerObj) => {
  if (!window.firebaseEnabled) throw new Error("Firebase not initialized");
  try {
    const ref = doc(window.firebaseDb, "players", uid);
    // store under { profile: playerObj, updatedAt: timestamp }
    await setDoc(ref, { profile: playerObj });
    return true;
  } catch (e) {
    console.error("firebaseSetPlayer error", e);
    return false;
  }
};

tryInit();