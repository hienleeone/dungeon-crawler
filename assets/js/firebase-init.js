// assets/js/firebase-init.js
// Replace whole file with this. Make sure index.html loads this BEFORE main.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import {
  getFirestore,
  doc as fbDoc,
  setDoc as fbSetDoc,
  getDoc as fbGetDoc
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAW-FtufPxI9mCuZDuTgxRUjHOGtgJ2hgc",
  authDomain: "soulmc-account.firebaseapp.com",
  projectId: "soulmc-account",
  storageBucket: "soulmc-account.appspot.com",
  messagingSenderId: "508725790521",
  appId: "1:508725790521:web:a58b2f0608b028baaccae8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// expose to global scope so other scripts can use them
window.db = db;
window.firebaseDoc = fbDoc;
window.firebaseSetDoc = fbSetDoc;
window.firebaseGetDoc = fbGetDoc;
window.auth = auth;
window.currentUid = window.currentUid || null;
window.currentUser = window.currentUser || null;

// helper: sign in anonymously to have a UID for guests (optional)
signInAnonymously(auth)
  .catch((err) => {
    // anonymous sign-in is optional; if fails, we still allow email login flows
    console.warn("Anonymous sign-in failed (ok if you don't use it):", err);
  });

// Register with email + displayName + optional username
window.registerWithEmail = async function(email, password, displayName, username) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;
    try { await updateProfile(user, { displayName: displayName }); } catch(e){ console.warn('updateProfile', e); }

    const uid = user.uid;
    // create empty player doc
    await fbSetDoc(fbDoc(db, "players", uid), {
      player: null,
      dungeon: null,
      enemy: null,
      volume: null,
      updatedAt: Date.now()
    });
    // create users doc
    await fbSetDoc(fbDoc(db, "users", uid), {
      name: displayName || null,
      email: email || null,
      username: username || null,
      createdAt: Date.now()
    });
    return cred;
  } catch (e) {
    throw e;
  }
};

// Login with email
window.logInWithEmail = async function(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred;
  } catch (e) {
    throw e;
  }
};

// Sign out
window.signOutFirebase = async function() {
  try {
    await fbSignOut(auth);
    window.currentUid = null;
    window.currentUser = null;
    // Optionally clear localStorage if you want
    // localStorage.removeItem("playerData");
    // localStorage.removeItem("dungeonData");
    // localStorage.removeItem("enemyData");
    // localStorage.removeItem("volumeData");
    if (window.onAuthStateChange) window.onAuthStateChange(null);
    return true;
  } catch (e) {
    throw e;
  }
};

// Mirror Firestore -> localStorage helper
async function mirrorFirestoreToLocal(uid) {
  try {
    const snap = await fbGetDoc(fbDoc(db, "players", uid));
    if (snap.exists()) {
      const data = snap.data();
      if (data.player) localStorage.setItem("playerData", JSON.stringify(data.player));
      if (data.dungeon) localStorage.setItem("dungeonData", JSON.stringify(data.dungeon));
      if (data.enemy) localStorage.setItem("enemyData", JSON.stringify(data.enemy));
      if (data.volume) localStorage.setItem("volumeData", JSON.stringify(data.volume));
    }
  } catch (e) {
    console.warn("mirrorFirestoreToLocal error:", e);
  }
}

// onAuth state change: keep global vars and call any subscriber
onAuthStateChanged(auth, async (user) => {
  if (user) {
    window.currentUid = user.uid;
    window.currentUser = user;
    try { await mirrorFirestoreToLocal(user.uid); } catch(e){/*ignore*/}

    // expose a legacy hook if other code expects it
    if (typeof window.onAuthStateChange === "function") {
      try { window.onAuthStateChange(user); } catch(e){console.warn(e);}
    }

    // call startGameAfterLogin if defined (ensures we start after auth)
    if (typeof window.startGameAfterLogin === "function") {
      try { window.startGameAfterLogin(); } catch(e){ console.warn("startGameAfterLogin error", e); }
    }
  } else {
    window.currentUid = null;
    window.currentUser = null;
    if (typeof window.onAuthStateChange === "function") {
      try { window.onAuthStateChange(null); } catch(e){console.warn(e);}
    }
  }
});
