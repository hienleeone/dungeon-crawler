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
    setDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

window.firebaseAuth = getAuth();
window.firebaseDb = getFirestore();

// ==== UI elements ====
const loginScreen = document.querySelector("#login-screen");
const nameScreen = document.querySelector("#character-creation");
const menuScreen = document.querySelector("#menu");
const nameInput = document.querySelector("#name-input");
const nameAlert = document.querySelector("#alert");

// ===============================
// LOGIN
// ===============================
document.querySelector("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = loginEmail.value;
    const pw = loginPassword.value;

    try {
        await signInWithEmailAndPassword(firebaseAuth, email, pw);
    } catch (err) {
        alert("Sai tài khoản hoặc mật khẩu!");
    }
});

// ===============================
// REGISTER
// ===============================
document.querySelector("#register-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = regEmail.value;
    const pw = regPassword.value;

    try {
        await createUserWithEmailAndPassword(firebaseAuth, email, pw);

        // ❗ Không cho auto-login sau khi tạo tài khoản
        await signOut(firebaseAuth);

        alert("Đăng ký thành công! Hãy đăng nhập.");
        loginScreen.style.display = "flex";
        registerScreen.style.display = "none";

    } catch (err) {
        alert("Không thể đăng ký.");
    }
});

// ===============================
// AUTH STATE LISTENER
// ===============================
onAuthStateChanged(firebaseAuth, async (user) => {
    if (!user) {
        showLogin();
        return;
    }

    const ref = doc(firebaseDb, "players", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        // 🆕 Tài khoản mới lần đầu đăng nhập → hỏi tên
        showNameCreation();
        return;
    }

    // 🟢 Có playerData → vào menu
    window.player = snap.data().playerData;
    showMenu();
});

// ===============================
// SUBMIT NAME
// ===============================
document.querySelector("#name-submit").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();

    if (name.length < 3) {
        nameAlert.textContent = "Tên phải dài hơn 3 ký tự";
        return;
    }

    // Check duplicate name
    const q = query(collection(firebaseDb, "players"), where("playerData.name", "==", name));
    const check = await getDocs(q);

    if (!check.empty) {
        nameAlert.textContent = "Tên đã bị trùng!";
        return;
    }

    const user = firebaseAuth.currentUser;
    if (!user) return;

    await setDoc(doc(firebaseDb, "players", user.uid), {
        playerData: {
            name,
            gold: 0,
            blessing: 1,
            createdAt: Date.now(),
        }
    });

    nameAlert.textContent = "";
    nameInput.value = "";

    showMenu();
});

// ===============================
// LOGOUT BUTTON (thay export/import)
// ===============================
document.querySelector("#export-import").textContent = "Đăng Xuất";
document.querySelector("#export-import").onclick = async () => {
    await signOut(firebaseAuth);
};

// ===============================
// UI CONTROL FUNCTIONS
// ===============================
function showLogin() {
    loginScreen.style.display = "flex";
    nameScreen.style.display = "none";
    menuScreen.style.display = "none";
}

function showNameCreation() {
    loginScreen.style.display = "none";
    nameScreen.style.display = "flex";
    menuScreen.style.display = "none";
}

function showMenu() {
    loginScreen.style.display = "none";
    nameScreen.style.display = "none";
    menuScreen.style.display = "flex";
}
