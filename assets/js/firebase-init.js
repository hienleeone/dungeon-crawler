
// Firebase initialization for saving/loading player data.
// IMPORTANT: Fill in your firebaseConfig object below with your project's values.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc as fbDoc, setDoc as fbSetDoc, getDoc as fbGetDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

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

// expose helpers on window for use in saveData
window.db = db;
window.firebaseDoc = fbDoc;
window.firebaseSetDoc = fbSetDoc;
window.firebaseGetDoc = fbGetDoc;

// Sign in anonymously so we have a UID to use as document id
signInAnonymously(auth)
  .then(() => {
    
window.registerWithEmail = async function(email, password, displayName, username) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;
    try { await updateProfile(user, { displayName: displayName }); } catch(e){ console.warn('updateProfile', e); }
    const uid = user.uid;
    const playerRef = fbDoc(db, "players", uid);
    await fbSetDoc(playerRef, {
      player: null,
      dungeon: null,
      enemy: null,
      volume: null,
      updatedAt: Date.now()
    });
    const userRef = fbDoc(db, "users", uid);
    await fbSetDoc(userRef, {
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


onAuthStateChanged(auth, async (user) => {
      if (user) {
        window.currentUid = user.uid;
        console.log("Firebase anonymous signed in, uid:", user.uid);
        // Try to load existing data for this uid; if exists, mirror into localStorage so app can use it
        try {
          const docRef = fbDoc(db, "players", user.uid);
          const snap = await fbGetDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data.player) {
              localStorage.setItem("playerData", JSON.stringify(data.player));
            }
            if (data.dungeon) {
              localStorage.setItem("dungeonData", JSON.stringify(data.dungeon));
            }
            if (data.enemy) {
              localStorage.setItem("enemyData", JSON.stringify(data.enemy));
            }
            if (data.volume) {
              localStorage.setItem("volumeData", JSON.stringify(data.volume));
            }
            console.log("Loaded player data from Firestore into localStorage (uid):", user.uid);
            // reload page so scripts that read localStorage get the cloud data
            // Only reload if this is the first load (avoid loop) by using a flag
            if (!localStorage.getItem("__cloud_loaded")) {
              localStorage.setItem("__cloud_loaded", "1");
              window.location.reload();
            }
          } else {
            console.log("No existing Firestore data for uid:", user.uid);
          }
        } catch (e) {
          console.warn("Error loading from Firestore:", e);
        }
      } else {
        console.log("Signed out");
      }
    });
  })
  .catch((err) => {
    console.warn("Anonymous sign-in failed:", err);
  });
