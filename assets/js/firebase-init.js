// Firebase initialization for saving/loading player data.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
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

// ====================== LOGIN ======================
window.logInWithEmail = async function(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred;
  } catch (e) {
    throw e;
  }
};

// ====================== REGISTER ======================
window.registerWithEmail = async function(email, password, displayName, username) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    await updateProfile(user, { displayName });

    const uid = user.uid;

    await fbSetDoc(fbDoc(db, "players", uid), {
      player: null,
      dungeon: null,
      enemy: null,
      volume: null,
      updatedAt: Date.now()
    });

    await fbSetDoc(fbDoc(db, "users", uid), {
      name: displayName,
      email: email,
      username: username,
      createdAt: Date.now()
    });

    return cred;
  } catch (e) {
    throw e;
  }
};

// =================== ANONYMOUS SIGN IN ===================
signInAnonymously(auth)
  .then(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        window.currentUid = user.uid;

        try {
          const snap = await fbGetDoc(fbDoc(db, "players", user.uid));
          if (snap.exists()) {
            const data = snap.data();
            if (data.player) localStorage.setItem("playerData", JSON.stringify(data.player));
            if (data.dungeon) localStorage.setItem("dungeonData", JSON.stringify(data.dungeon));
            if (data.enemy) localStorage.setItem("enemyData", JSON.stringify(data.enemy));
            if (data.volume) localStorage.setItem("volumeData", JSON.stringify(data.volume));

            if (!localStorage.getItem("__cloud_loaded")) {
              localStorage.setItem("__cloud_loaded", "1");
              window.location.reload();
            }
          }
        } catch (e) {
          console.warn("Error loading player:", e);
        }
      }
    });
  })
  .catch(err => console.warn("Anonymous sign-in failed:", err));
