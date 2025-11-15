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
  collection,
  getDocs
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

// SAVE TO FIRESTORE
window.firebaseSetPlayer = async (uid, obj) => {
  const ref = doc(window.firebaseDb, "players", uid);
  await setDoc(ref, { playerData: obj });
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
