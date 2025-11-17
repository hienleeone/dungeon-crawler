// Firebase Configuration
// QUAN TRỌNG: Thay thế các giá trị bên dưới bằng config từ Firebase Console của bạn
const firebaseConfig = {
    apiKey: "AIzaSyAW-FtufPxI9mCuZDuTgxRUjHOGtgJ2hgc",
    authDomain: "soulmc-account.firebaseapp.com",
    projectId: "soulmc-account",
    storageBucket: "soulmc-account.firebasestorage.app",
    messagingSenderId: "508725790521",
    appId: "1:508725790521:web:a58b2f0608b028baaccae8",
    measurementId: "G-NW033BL7PW"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);

// Khởi tạo services
const auth = firebase.auth();
const db = firebase.firestore();

// Biến global để lưu user hiện tại
let currentUser = null;
