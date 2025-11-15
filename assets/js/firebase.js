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

window.firebaseAuth = null;
window.firebaseDb = null;
window.currentPlayerData = null;

const firebaseConfig = {
  apiKey: "AIzaSyAW-FtufPxI9mCuZDuTgxRUjHOGtgJ2hgc",
  authDomain: "soulmc-account.firebaseapp.com",
  projectId: "soulmc-account",
  storageBucket: "soulmc-account.firebasestorage.app",
  messagingSenderId: "508725790521",
  appId: "1:508725790521:web:a58b2f0608b028baaccae8",
  measurementId: "G-NW033BL7PW"
};

(function() {
  const app = initializeApp(firebaseConfig);
  window.firebaseAuth = getAuth(app);
  window.firebaseDb = getFirestore(app);

  attachAuthListener();
})();

function attachAuthListener() {
  onAuthStateChanged(window.firebaseAuth, async (user) => {

    if (!user) {
      window.currentPlayerData = null;
      localStorage.removeItem("playerData");
      if (window.startGameInit) window.startGameInit();
      return;
    }

    const ref = doc(window.firebaseDb, "players", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, { playerData: null });
      window.currentPlayerData = null;
    } 
    else {
      window.currentPlayerData = snap.data().playerData ?? null;
    }

    if (window.currentPlayerData)
      localStorage.setItem("playerData", JSON.stringify(window.currentPlayerData));
    else
      localStorage.removeItem("playerData");

    if (window.startGameInit) window.startGameInit();
  });
}

// REGISTER
window.firebaseRegister = async (email, password) => {
  const res = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
  const ref = doc(window.firebaseDb, "players", res.user.uid);
  await setDoc(ref, { playerData: null });
  return res.user;
};

// LOGIN
window.firebaseLogin = async (email, password) => {
  const res = await signInWithEmailAndPassword(window.firebaseAuth, email, password);

  const user = res.user;
  const ref = doc(window.firebaseDb, "players", user.uid);
  const snap = await getDoc(ref);

  // Nếu chưa có profile → tạo MỚI hoàn toàn, KHÔNG lấy localStorage
  if (!snap.exists())
    await setDoc(ref, { playerData: null });

  return user;
};

// SAVE
window.firebaseSetPlayer = async (uid, obj) => {
  const ref = doc(window.firebaseDb, "players", uid);
  await setDoc(ref, { playerData: obj });
};

// LOGOUT
window.firebaseLogout = async () => {
  await signOut(window.firebaseAuth);
};

window.firebaseRegister = async (email, password) => {
  const res = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);

  const ref = doc(window.firebaseDb, "players", res.user.uid);
  await setDoc(ref, { playerData: null });

  window.justRegistered = true; // <— thêm dòng này

  return res.user;
};