import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

window.firebaseAuth = null;
window.firebaseDb = null;
window.currentPlayerData = null;

// minimal rate-limit guard for sync calls
window._lastServerSync = 0;
window._serverSyncCooldown = 2000; // ms

const firebaseConfig = {
  apiKey: "AIzaSyAW-FtufPxI9mCuZDuTgxRUjHOGtgJ2hgc",
  authDomain: "soulmc-account.firebaseapp.com",
  projectId: "soulmc-account",
  storageBucket: "soulmc-account.firebasestorage.app",
  messagingSenderId: "508725790521",
  appId: "1:508725790521:web:a58b2f0608b028baaccae8",
  measurementId: "G-NW033BL7PW"
};

(async function() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  // GIỮ ĐĂNG NHẬP khi reload
  await setPersistence(auth, browserLocalPersistence);

  window.firebaseAuth = auth;
  window.firebaseDb = getFirestore(app);

  attachAuthListener();
})();

// LẮNG NGHE LOGIN
function attachAuthListener() {
  onAuthStateChanged(window.firebaseAuth, async (user) => {

    if (!user) {
      window.currentPlayerData = null;
      localStorage.removeItem("playerData");
      // show auth modal (auth-ui handles display)
      if (window.startGameInit) window.startGameInit();
      return;
    }

    const ref = doc(window.firebaseDb, "players", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      window.currentPlayerData = null;       // lần đầu đăng nhập → chưa có nhân vật
    } else {
      window.currentPlayerData = snap.data().playerData ?? null;
    }

    if (window.currentPlayerData)
      localStorage.setItem("playerData", JSON.stringify(window.currentPlayerData));
    else
      localStorage.removeItem("playerData");

    if (window.startGameInit) window.startGameInit();
  });
}

// LOGIN
window.firebaseLogin = async (email, password) => {
  const res = await signInWithEmailAndPassword(window.firebaseAuth, email, password);
  return res.user;
};

// REGISTER → KHÔNG auto login
window.firebaseRegister = async (email, password) => {
  const res = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);

  const ref = doc(window.firebaseDb, "players", res.user.uid);
  await setDoc(ref, { playerData: null });

  await signOut(window.firebaseAuth);  // BẮT BUỘC ĐĂNG NHẬP LẠI

  return res.user;
};

// SAVE TO FIRESTORE — FIXED
window.firebaseSetPlayer = async (uid, obj) => {
  const ref = doc(window.firebaseDb, "players", uid);
  await updateDoc(ref, { playerData: obj });   // <-- FIX
};

// CHECK NAME TRÙNG
window.firebaseCheckNameExists = async function(name) {
  const playersRef = collection(window.firebaseDb, "players");
  const snap = await getDocs(playersRef);

  for (let docu of snap.docs) {
    const data = docu.data().playerData;
    if (data && data.name && data.name.toLowerCase() === name.toLowerCase()) {
      return true; // tên trùng
    }
  }
  return false;
};

// LOGOUT
window.firebaseLogout = async () => {
  await signOut(window.firebaseAuth);
};

// Sync player data from server and enforce server gold/critical fields
window.syncPlayerFromServer = async function(uid) {
  const now = Date.now();
  if (now - (window._lastServerSync || 0) < window._serverSyncCooldown) return null;
  window._lastServerSync = now;
  try {
    const ref = doc(window.firebaseDb, "players", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const serverData = snap.data().playerData;
    if (!serverData) return null;
    // enforce gold/allocated/skills integrity
    if (window.player && typeof window.player.gold === 'number' && serverData.gold !== undefined) {
      if (window.player.gold !== serverData.gold) {
        console.warn("⚠ Phát hiện gold client khác server — reset local gold to server value.");
        window.player.gold = serverData.gold;
      }
    }
    // enforce allocated flag
    if (serverData.allocated && window.player && !window.player.allocated) {
      window.player.allocated = true;
    }
    // update currentPlayerData snapshot
    window.currentPlayerData = JSON.parse(JSON.stringify(serverData));
    localStorage.setItem("playerData", JSON.stringify(window.currentPlayerData));
    return serverData;
  } catch (e) {
    console.warn("syncPlayerFromServer error", e);
    return null;
  }
};