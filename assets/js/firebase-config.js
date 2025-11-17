// Firebase Configuration
// QUAN TRỌNG: Thay thế các giá trị bên dưới bằng config từ Firebase Console của bạn
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);

// Khởi tạo services
const auth = firebase.auth();
const db = firebase.firestore();

// Biến global để lưu user hiện tại
let currentUser = null;
