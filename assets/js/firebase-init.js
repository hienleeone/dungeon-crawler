import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAW-FtufPxI9mCuZDuTgxRUjHOGtgJ2hgc",
  authDomain: "soulmc-account.firebaseapp.com",
  projectId: "soulmc-account",
  storageBucket: "soulmc-account.firebasestorage.app",
  messagingSenderId: "508725790521",
  appId: "1:508725790521:web:a58b2f0608b028baaccae8",
  measurementId: "G-NW033BL7PW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window._fb = {app,auth,db,doc,getDoc,setDoc,updateDoc,onSnapshot,
  createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,onAuthStateChanged};
