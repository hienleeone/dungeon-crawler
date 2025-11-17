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
    if (typeof firebase !== 'undefined' && firebase.initializeApp) {
        try {
            // Check if already initialized
            if (!firebase.apps || firebase.apps.length === 0) {
                firebase.initializeApp(firebaseConfig);
            }
            console.log("Firebase initialized successfully");
        } catch (error) {
            console.log("Firebase config: Already initialized or loaded");
        }
    } else {
        setTimeout(initFirebaseConfig, 100);
    }
};

// Start initialization
initFirebaseConfig();
