
// Firebase initialization and auth helpers (module)
// IMPORTANT: replace firebaseConfig with your project's config
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as fbSignOut } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc as fbDoc, setDoc as fbSetDoc, getDoc as fbGetDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAW-FtufPxI9mCuZDuTgxRUjHOGtgJ2hgc",
  authDomain: "soulmc-account.firebaseapp.com",
  projectId: "soulmc-account",
  storageBucket: "soulmc-account.firebasestorage.app",
  messagingSenderId: "508725790521",
  appId: "1:508725790521:web:a58b2f0608b028baaccae8",
  measurementId: "G-NW033BL7PW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// expose core firestore helpers for compatibility with existing code
window.db = db;
window.firebaseDoc = fbDoc;
window.firebaseSetDoc = fbSetDoc;
window.firebaseGetDoc = fbGetDoc;

// helper: mirror firestore doc to localStorage
async function mirrorFirestoreToLocal(uid) {
  try {
    const docRef = fbDoc(db, "players", uid);
    const snap = await fbGetDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.player) localStorage.setItem("playerData", JSON.stringify(data.player));
      if (data.dungeon) localStorage.setItem("dungeonData", JSON.stringify(data.dungeon));
      if (data.enemy) localStorage.setItem("enemyData", JSON.stringify(data.enemy));
      if (data.volume) localStorage.setItem("volumeData", JSON.stringify(data.volume));
      console.log("Mirrored Firestore data to localStorage for uid:", uid);
    } else {
      console.log("No Firestore doc for uid:", uid);
    }
  } catch (e) {
    console.warn("mirrorFirestoreToLocal error:", e);
  }
}

// expose auth functions on window for login page to call
window.signInWithEmail = async function(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred;
  } catch (e) {
    throw e;
  }
};

window.registerWithEmail = async function(email, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // create empty player doc for this uid
    const uid = cred.user.uid;
    const docRef = fbDoc(db, "players", uid);
    await fbSetDoc(docRef, {
      player: null,
      dungeon: null,
      enemy: null,
      volume: null,
      updatedAt: Date.now()
    });
    return cred;
  } catch (e) {
    throw e;
  }
};

window.signOutFirebase = async function() {
  try {
    await fbSignOut(auth);
    // clear currentUid and localStorage mirror
    window.currentUid = null;
    localStorage.removeItem("playerData");
    localStorage.removeItem("dungeonData");
    localStorage.removeItem("enemyData");
    localStorage.removeItem("volumeData");
    return true;
  } catch (e) {
    throw e;
  }
};

// Listen for auth state changes
onAuthStateChanged(auth, async (user) => {
  if (user) {
    window.currentUid = user.uid;
    console.log("Auth state: signed in uid=", user.uid);
    // mirror data from Firestore to localStorage so existing game code (which reads localStorage) works
    await mirrorFirestoreToLocal(user.uid);
    // If currently on login page, redirect to index.html
    if (location.pathname.endsWith('/login.html') || location.pathname.endsWith('/login')) {
      // avoid infinite loops: redirect only if not already on index
      location.href = 'index.html';
    }
  } else {
    window.currentUid = null;
    console.log("Auth state: signed out");
    // If not on login page, redirect to login
    if (!location.pathname.endsWith('/login.html') && !location.pathname.endsWith('/login')) {
      location.href = 'login.html';
    }
  }
});
