// ===== FIREBASE CONFIGURATION =====
// Update these with your Firebase project details

const firebaseConfig = {
    apiKey: "AIzaSyAW-FtufPxI9mCuZDuTgxRUjHOGtgJ2hgc",
    authDomain: "soulmc-account.firebaseapp.com",
    projectId: "soulmc-account",
    storageBucket: "soulmc-account.firebasestorage.app",
    messagingSenderId: "508725790521",
    appId: "1:508725790521:web:a58b2f0608b028baaccae8",
    measurementId: "G-NW033BL7PW"
};

// Wait for Firebase SDK to load, then initialize
const initFirebaseConfig = () => {
    if (typeof firebase !== 'undefined') {
        try {
            firebase.initializeApp(firebaseConfig);
            window.db = firebase.firestore();
            console.log("Firebase initialized successfully");
        } catch (error) {
            console.error("Firebase already initialized or error:", error);
        }
    } else {
        setTimeout(initFirebaseConfig, 100);
    }
};

// Start initialization
initFirebaseConfig();
