// Firebase Configuration
// QUAN TRỌNG: Thay thế các giá trị bên dưới bằng config từ Firebase Console của bạn
const firebaseConfig = {
    apiKey: "AIzaSyAcw_6krS2s3-14T98SZSEhGQcNDdLME1w",
    authDomain: "data-dc-soulmc.firebaseapp.com",
    projectId: "data-dc-soulmc",
    storageBucket: "data-dc-soulmc.firebasestorage.app",
    messagingSenderId: "539439303064",
    appId: "1:539439303064:web:b2038f2bfe81d95a6603ed",
    measurementId: "G-FKGXSSW90C"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);

// Khởi tạo services
const auth = firebase.auth();
const db = firebase.firestore();

// Biến global để lưu user hiện tại
let currentUser = null;

// Biến global để track unsaved changes
let hasUnsavedChanges = false;
let isSaving = false;
