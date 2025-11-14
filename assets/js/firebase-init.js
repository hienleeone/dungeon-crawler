// Firebase init + auth helpers (copy nguyên file này)
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

window.db = db;
window.firebaseDoc = fbDoc;
window.firebaseSetDoc = fbSetDoc;
window.firebaseGetDoc = fbGetDoc;

// --- Login function (call from UI) ---
window.logInWithEmail = async function(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred;
  } catch (e) {
    throw e;
  }
};

// --- Register function (call from UI) ---
// displayName: tên hiển thị trong game
window.registerWithEmail = async function(email, password, displayName, username) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    // set displayName on auth user
    try { await updateProfile(user, { displayName: displayName }); } catch(e){ console.warn('updateProfile', e); }

    const uid = user.uid;

    // create player doc (empty)
    await fbSetDoc(fbDoc(db, "players", uid), {
      player: null,
      dungeon: null,
      enemy: null,
      volume: null,
      updatedAt: Date.now()
    });

    // create users doc (store display name + username if needed)
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

// --- Sign out helper (used by logout) ---
window.signOutFirebase = async function() {
  try {
    await fbSignOut(auth);
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

// --- Mirror Firestore -> localStorage when auth state changes (keeps app compatible) ---
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

signInAnonymously(auth)
  .then(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        window.currentUid = user.uid;
        await mirrorFirestoreToLocal(user.uid);
        if (window.onAuthStateChange) try{ window.onAuthStateChange(user); }catch(e){}
      } else {
        window.currentUid = null;
        if (window.onAuthStateChange) try{ window.onAuthStateChange(null); }catch(e){}
      }
    });
  })
  .catch((err) => {
    console.warn("Anonymous sign-in failed:", err);
  });
