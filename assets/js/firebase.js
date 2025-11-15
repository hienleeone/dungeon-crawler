import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

window.firebaseEnabled = false;
window.firebaseAuth = null;
window.firebaseDb = null;

const firebaseConfig = {
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
    console.log("Firebase initialized");
    attachAuthListener();
  } catch (e) {
    console.warn("Firebase init failed:", e);
    window.firebaseEnabled = false;
  }
}

// LOGIN (IMPORT LOCAL → FIREBASE NẾU LẦN ĐẦU)
window.firebaseLogin = async (email, password) => {

  const result = await signInWithEmailAndPassword(window.firebaseAuth, email, password);
  const user = result.user;

  const ref = doc(window.firebaseDb, "players", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const local = JSON.parse(localStorage.getItem("playerData"));

    if (local) {
      console.log("🔥 Importing local data to Firebase");
      await setDoc(ref, { playerData: local });
      localStorage.removeItem("playerData");
    } else {
      console.log("🔥 Creating new Firebase profile");
      await setDoc(ref, { playerData: null });
    }
  }

  return user;
};

function attachAuthListener() {
  onAuthStateChanged(window.firebaseAuth, async (user) => {
    if (user) {
      console.log("Auth signed in:", user.uid);

      const player = await window.firebaseGetPlayer(user.uid);

      if (player) {
          window.currentPlayerData = player;   // ★ lưu global
          localStorage.setItem("playerData", JSON.stringify(player));
      } else {
          window.currentPlayerData = null;
      }

      if (!sessionStorage.getItem("firebase_reloaded")) {
        sessionStorage.setItem("firebase_reloaded", "1");
        location.reload();
      }

    } else {
      console.log("Auth signed out");
      sessionStorage.removeItem("firebase_reloaded");
    }
  });
}

// REGISTER
window.firebaseRegister = async (email, password) => {
  return createUserWithEmailAndPassword(window.firebaseAuth, email, password);
};

// LOGOUT
window.firebaseLogout = async () => {
  await signOut(window.firebaseAuth);
  location.reload();
};

// LOAD
window.firebaseGetPlayer = async (uid) => {
  try {
    const ref = doc(window.firebaseDb, "players", uid);
    const snap = await getDoc(ref);

    if (snap.exists()) return snap.data().playerData;
    return null;
  } catch (e) {
    console.error("firebaseGetPlayer error", e);
    return null;
  }
};

// SAVE
window.firebaseSetPlayer = async (uid, playerObj) => {
  try {
    const ref = doc(window.firebaseDb, "players", uid);
    await setDoc(ref, { playerData: playerObj });
    return true;
  } catch (e) {
    console.error("firebaseSetPlayer error", e);
    return false;
  }
};

tryInit();
