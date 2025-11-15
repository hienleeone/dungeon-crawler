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

        if (window.player && window.player.gold !== serverData.gold) {
            console.warn("⚠ Phát hiện bug vàng — reset!");
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

function attachAuthListener() {
  onAuthStateChanged(window.firebaseAuth, async (user) => {

    if (!user) {
      window.currentPlayerData = null;
      window.player = null;
      try { localStorage.removeItem('playerData'); } catch(e){}
      if (window.startGameInit) window.startGameInit();
      return;
    }

    try {
      const ref = doc(window.firebaseDb, 'players', user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        window.currentPlayerData = null;
        window.player = null;
        try { localStorage.removeItem('playerData'); } catch(e){}
      } else {
        window.currentPlayerData = snap.data().playerData ?? null;
        try { window.player = window.currentPlayerData ? JSON.parse(JSON.stringify(window.currentPlayerData)) : null; } catch(e) { window.player = window.currentPlayerData; }
        if (window.currentPlayerData) {
          try { localStorage.setItem('playerData', JSON.stringify(window.currentPlayerData)); } catch(e){}
        }
      }
    } catch(e) {
      console.error('attachAuthListener error', e);
      window.currentPlayerData = null;
      window.player = null;
    }

    if (window.startGameInit) window.startGameInit();
  });
}

// LOGIN
window.firebaseLogin = async (email, password) => {
  const res = await signInWithEmailAndPassword(window.firebaseAuth, email, password);
  const user = res.user;

  const ref = doc(window.firebaseDb, "players", user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
      window.currentPlayerData = snap.data().playerData ?? null;
  }

  return user;
};

// REGISTER (1 bản duy nhất, không trùng)
window.firebaseRegister = async (email, password) => {
  const res = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
  const ref = doc(window.firebaseDb, "players", res.user.uid);

  await setDoc(ref, { playerData: null });

  window.justRegistered = true;

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
