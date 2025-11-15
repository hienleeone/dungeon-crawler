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

async function syncPlayerFromServer(uid) {
    const ref = doc(window.firebaseDb, "players", uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
        const serverData = snap.data().playerData;

        // Nếu client cố bug vàng vượt mức hợp lệ → reset server value
        if (window.player && window.player.gold !== serverData.gold) {
            console.warn("⚠ Phát hiện thao tác vàng bất thường — reset!");
            window.player.gold = serverData.gold;
        }

        return serverData;
    }
}

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

function attachAuthListener()
 {
  onAuthStateChanged(window.firebaseAuth, async (user) => {

    // 1. Chưa đăng nhập → reset và gọi startGameInit
    if (!user) {
      window.currentPlayerData = null;
      localStorage.removeItem("playerData");

      if (window.startGameInit) window.startGameInit();
      return;
    }

    // 2. Đã đăng nhập → chờ firebase tải dữ liệu player xong rồi mới xử lý
    const ref = doc(window.firebaseDb, "players", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        // mới lần đầu đăng ký → chưa có profile → hỏi tên
        window.currentPlayerData = null;
    } else {
        window.currentPlayerData = snap.data().playerData ?? null;
    }

    // set window.player to server copy (detached)
    if (window.currentPlayerData) {
      localStorage.setItem("playerData", JSON.stringify(window.currentPlayerData));
      try { window.player = JSON.parse(JSON.stringify(window.currentPlayerData)); } catch(e) { window.player = window.currentPlayerData; }
    } else {
      localStorage.removeItem("playerData");
      window.player = null;
    }

    // CHỈ GỌI Ở ĐÂY → ĐẢM BẢO DỮ LIỆU SẴN SÀNG
    if (window.startGameInit) window.startGameInit();
  });
}
// LOGIN
window.firebaseLogin = async (email, password) => {
  const res = await signInWithEmailAndPassword(window.firebaseAuth, email, password);
  const user = res.user;

  const ref = doc(window.firebaseDb, "players", user.uid);
  const snap = await getDoc(ref);

  // Không được ghi đè profile bằng null!
  if (snap.exists()) {
      window.currentPlayerData = snap.data().playerData ?? null;
  }

  return user;
};

// REGISTER
window.firebaseRegister = async (email, password) => {
  const res = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
  const ref = doc(window.firebaseDb, "players", res.user.uid);

  // Tạo playerData rỗng lần đầu → để main.js kích hoạt màn hình đặt tên
  await setDoc(ref, { playerData: null });

  return res.user;
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


// --- Anti-hack helpers: sync and save ---
window.getCurrentUid = function() {
  try {
    return window.firebaseAuth && window.firebaseAuth.currentUser ? window.firebaseAuth.currentUser.uid : null;
  } catch(e) { return null; }
};

window.syncPlayerFromServer = async function(uid) {
  if (!uid) uid = window.getCurrentUid();
  if (!uid) return null;
  const ref = doc(window.firebaseDb, "players", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const serverData = snap.data().playerData ?? null;
  // set global
  window.currentPlayerData = serverData;
  window.player = JSON.parse(JSON.stringify(serverData)); // detach copy for client use
  // also update localStorage for backward compatibility
  if (window.currentPlayerData) localStorage.setItem("playerData", JSON.stringify(window.currentPlayerData));
  else localStorage.removeItem("playerData");
  return serverData;
};

window.savePlayerToFirebase = async function(uid, playerObj) {
  if (!uid) uid = window.getCurrentUid();
  if (!uid) throw new Error("No uid to save");
  // sanitize minimal data
  const copy = JSON.parse(JSON.stringify(playerObj || window.player || {}));
  const ref = doc(window.firebaseDb, "players", uid);
  await setDoc(ref, { playerData: copy }, { merge: true });
  // update cached
  window.currentPlayerData = copy;
  localStorage.setItem("playerData", JSON.stringify(copy));
  return copy;
};

// perform server-validated action: sync -> validate -> run action -> save
window.performServerAction = async function(actionFn) {
  const uid = window.getCurrentUid();
  if (!uid) throw new Error("Not authenticated");
  const server = await window.syncPlayerFromServer(uid);
  if (!server) throw new Error("No server data");
  // update window.player to server copy
  window.player = JSON.parse(JSON.stringify(server));
  // run action (may modify window.player)
  const res = await actionFn(window.player);
  // after action, save back
  await window.savePlayerToFirebase(uid, window.player);
  return res;
};
