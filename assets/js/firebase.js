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

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAW-FtufPxI9mCuZDuTgxRUjHOGtgJ2hgc",
  authDomain: "soulmc-account.firebaseapp.com",
  projectId: "soulmc-account",
  storageBucket: "soulmc-account.firebasestorage.app",
  messagingSenderId: "508725790521",
  appId: "1:508725790521:web:a58b2f0608b028baaccae8",
  measurementId: "G-NW033BL7PW"
};

// Init Firebase
(function(){
  const app = initializeApp(firebaseConfig);
  window.firebaseAuth = getAuth(app);
  window.firebaseDb = getFirestore(app);
  console.log("Firebase initialized");

  attachAuthListener();
})();
 
// -----------------------------
// AUTH LISTENER (CHỈ 1 CÁI)
// -----------------------------
function attachAuthListener() {

  onAuthStateChanged(window.firebaseAuth, async (user) => {

    console.log("Auth state changed:", user ? user.uid : "signed out");

    if (!user) {
      // signed out
      window.currentPlayerData = null;
      localStorage.clear();
      return;
    }

    // signed in → load cloud save
    const ref = doc(window.firebaseDb, "players", user.uid);
    const snap = await getDoc(ref);

    // Nếu chưa có profile → tạo profile rỗng
    if (!snap.exists()) {
      console.log("Creating new empty profile...");
      await setDoc(ref, { playerData: local ?? defaultPlayerProfile() });
      window.currentPlayerData = null;
    } 
    else {
      window.currentPlayerData = snap.data().playerData;
    }

    // cập nhật local
    if (window.currentPlayerData)
      localStorage.setItem("playerData", JSON.stringify(window.currentPlayerData));
    else
      localStorage.removeItem("playerData");

    // báo cho main.js khởi động
    if (window.startGameInit) window.startGameInit();
  });
}

// -----------------------------
// REGISTER
// -----------------------------
window.firebaseRegister = async (email, password) => {
  const res = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);

  // tạo hồ sơ trống (sẽ hỏi tên sau)
  const ref = doc(window.firebaseDb, "players", res.user.uid);
  await setDoc(ref, { playerData: null });

  return res.user;
};

// -----------------------------
// LOGIN
// -----------------------------
window.firebaseLogin = async (email, password) => {

  const res = await signInWithEmailAndPassword(window.firebaseAuth, email, password);
  const user = res.user;

  const ref = doc(window.firebaseDb, "players", user.uid);
  const snap = await getDoc(ref);

  // Nếu user đăng nhập lần đầu và có local save → import lên cloud
  const local = JSON.parse(localStorage.getItem("playerData"));

  if (!snap.exists()) {
    await setDoc(ref, { playerData: local ?? null });
  } 
  else if (snap.data().playerData == null) {
      if(local){
          await setDoc(ref, { playerData: local });
      } else {
          // user cũ, đăng nhập lại, KHÔNG được hỏi tên
          // giữ nguyên null → nhưng không xem như user mới
          // => tạo player mặc định
          await setDoc(ref, { playerData: defaultPlayerProfile() });
      }
  }

  return user;
};

// -----------------------------
// SAVE
// -----------------------------
window.firebaseSetPlayer = async (uid, playerObj) => {
  const ref = doc(window.firebaseDb, "players", uid);
  await setDoc(ref, { playerData: playerObj });
};

// -----------------------------
// LOGOUT
// -----------------------------
window.firebaseLogout = async () => {
  await signOut(window.firebaseAuth);
};

function defaultPlayerProfile() {
    return {
        name: "Player",
        lvl: 1,

        stats: {
            hp: 500,
            hpMax: 500,
            atk: 100,
            def: 50,
            pen: 0,
            atkSpd: 0.6,
            vamp: 0,
            critRate: 0,
            critDmg: 50
        },

        baseStats: {
            hp: 500,
            atk: 100,
            def: 50,
            pen: 0,
            atkSpd: 0.6,
            vamp: 0,
            critRate: 0,
            critDmg: 50
        },

        equippedStats: {
            hp: 0, atk: 0, def: 0, pen: 0,
            atkSpd: 0, vamp: 0,
            critRate: 0, critDmg: 0,
            hpPct: 0, atkPct: 0, defPct: 0, penPct: 0
        },

        bonusStats: {
            hp: 0, atk: 0, def: 0,
            atkSpd: 0, vamp: 0,
            critRate: 0, critDmg: 0
        },

        exp: {
            expCurr: 0,
            expMax: 100,
            expCurrLvl: 0,
            expMaxLvl: 100,
            lvlGained: 0
        },

        inventory: {
            consumables: [],
            equipment: []
        },

        equipped: [],
        gold: 0,
        playtime: 0,
        kills: 0,
        deaths: 0,
        inCombat: false
    };
}