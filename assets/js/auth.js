// Authentication Module
let isAuthReady = false;

// Check authentication state
auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    
    if (user) {
        console.log("User logged in:", user.email);
        // Load player data from Firestore
        await loadPlayerDataFromFirestore(user.uid);
        isAuthReady = true;
        
        // Check if player has character created
        if (player === null || !player.name) {
            showScreen("character-creation");
        } else {
            showScreen("title-screen");
        }
    } else {
        console.log("No user logged in");
        isAuthReady = true;
        showScreen("auth-screen");
    }
});

// Show specific screen
const showScreen = (screenId) => {
    const screens = ["auth-screen", "character-creation", "title-screen", "dungeon-main", "loading"];
    screens.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = id === screenId ? "flex" : "none";
        }
    });
};

// Login form handler
document.getElementById("login-submit").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const alertElement = document.getElementById("login-alert");
    
    try {
        alertElement.textContent = "Đang đăng nhập...";
        await auth.signInWithEmailAndPassword(email, password);
        alertElement.textContent = "";
    } catch (error) {
        console.error("Login error:", error);
        switch (error.code) {
            case "auth/user-not-found":
                alertElement.textContent = "Tài khoản không tồn tại!";
                break;
            case "auth/wrong-password":
                alertElement.textContent = "Sai mật khẩu!";
                break;
            case "auth/invalid-email":
                alertElement.textContent = "Email không hợp lệ!";
                break;
            case "auth/too-many-requests":
                alertElement.textContent = "Quá nhiều lần thử. Vui lòng thử lại sau!";
                break;
            default:
                alertElement.textContent = "Đăng nhập thất bại: " + error.message;
        }
    }
});

// Register form handler
document.getElementById("register-submit").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById("register-confirm").value;
    const alertElement = document.getElementById("register-alert");
    
    // Validate passwords match
    if (password !== confirmPassword) {
        alertElement.textContent = "Mật khẩu không khớp!";
        return;
    }
    
    // Validate password length
    if (password.length < 6) {
        alertElement.textContent = "Mật khẩu phải có ít nhất 6 ký tự!";
        return;
    }
    
    try {
        alertElement.textContent = "Đang tạo tài khoản...";
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        alertElement.textContent = "";
        // Player data will be created when they submit their name
    } catch (error) {
        console.error("Register error:", error);
        switch (error.code) {
            case "auth/email-already-in-use":
                alertElement.textContent = "Email đã được sử dụng!";
                break;
            case "auth/invalid-email":
                alertElement.textContent = "Email không hợp lệ!";
                break;
            case "auth/weak-password":
                alertElement.textContent = "Mật khẩu quá yếu!";
                break;
            default:
                alertElement.textContent = "Đăng ký thất bại: " + error.message;
        }
    }
});

// Toggle between login and register forms
document.getElementById("show-register").addEventListener("click", () => {
    document.getElementById("login-form").style.display = "none";
    document.getElementById("register-form").style.display = "block";
    document.getElementById("register-alert").textContent = "";
});

document.getElementById("show-login").addEventListener("click", () => {
    document.getElementById("register-form").style.display = "none";
    document.getElementById("login-form").style.display = "block";
    document.getElementById("login-alert").textContent = "";
});

// Logout function
const logoutUser = async () => {
    try {
        await auth.signOut();
        player = null;
        dungeon = null;
        enemy = null;
        console.log("User logged out");
    } catch (error) {
        console.error("Logout error:", error);
    }
};

// Load player data from Firestore
const loadPlayerDataFromFirestore = async (userId) => {
    try {
        const docRef = db.collection("players").doc(userId);
        const doc = await docRef.get();
        
        if (doc.exists) {
            player = doc.data();
            player.gold = Number(player.gold) || 0;
            console.log("Player data loaded from Firestore");
            
            // Load dungeon data if exists
            const dungeonDoc = await docRef.collection("dungeon").doc("current").get();
            if (dungeonDoc.exists) {
                dungeon = dungeonDoc.data();
            }
            
            // Load volume settings
            const settingsDoc = await docRef.collection("settings").doc("volume").get();
            if (settingsDoc.exists) {
                volume = settingsDoc.data();
            }
        } else {
            player = null;
            console.log("No player data found in Firestore");
        }
    } catch (error) {
        console.error("Error loading player data:", error);
        player = null;
    }
};

// Save player data to Firestore
const savePlayerDataToFirestore = async () => {
    if (!currentUser) {
        console.error("No user logged in");
        return;
    }
    
    try {
        const userId = currentUser.uid;
        const docRef = db.collection("players").doc(userId);
        
        // Save player data
        await docRef.set(player, { merge: true });
        
        // Save dungeon data
        if (dungeon) {
            await docRef.collection("dungeon").doc("current").set(dungeon);
        }
        
        // Save volume settings
        if (volume) {
            await docRef.collection("settings").doc("volume").set(volume);
        }
        
        // Update leaderboards
        await updateLeaderboards();
        
        console.log("Data saved to Firestore");
    } catch (error) {
        console.error("Error saving to Firestore:", error);
    }
};

// Check if player name is already taken
const isPlayerNameTaken = async (name) => {
    try {
        const doc = await db.collection("dungeonPlayerNames").doc(name).get();
        return doc.exists;
    } catch (error) {
        console.error("Error checking name:", error);
        return false;
    }
};

// Register player name
const registerPlayerName = async (name) => {
    if (!currentUser) return false;
    
    try {
        await db.collection("dungeonPlayerNames").doc(name).set({
            userId: currentUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error("Error registering name:", error);
        return false;
    }
};

// Delete player name registration (for name changes or account deletion)
const unregisterPlayerName = async (name) => {
    try {
        await db.collection("dungeonPlayerNames").doc(name).delete();
    } catch (error) {
        console.error("Error unregistering name:", error);
    }
};

// Update leaderboards
const updateLeaderboards = async () => {
    if (!currentUser || !player) return;
    
    try {
        const userId = currentUser.uid;
        
        // Update gold leaderboard
        await db.collection("dungeonLeaderboards").doc("gold").set({
            [userId]: {
                name: player.name,
                value: player.gold || 0,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }
        }, { merge: true });
        
        // Update level leaderboard
        await db.collection("dungeonLeaderboards").doc("level").set({
            [userId]: {
                name: player.name,
                value: player.lvl || 1,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }
        }, { merge: true });
        
        // Update floor leaderboard
        const maxFloor = dungeon && dungeon.progress && dungeon.progress.floor ? dungeon.progress.floor : 0;
        await db.collection("dungeonLeaderboards").doc("floor").set({
            [userId]: {
                name: player.name,
                value: maxFloor,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }
        }, { merge: true });
        
    } catch (error) {
        console.error("Error updating leaderboards:", error);
    }
};

// Get top 3 players for a category
const getTopPlayers = async (category) => {
    try {
        const doc = await db.collection("dungeonLeaderboards").doc(category).get();
        
        if (!doc.exists) return [];
        
        const data = doc.data();
        const players = Object.entries(data).map(([userId, playerData]) => ({
            userId,
            name: playerData.name,
            value: playerData.value
        }));
        
        // Sort by value descending and get top 3
        return players.sort((a, b) => b.value - a.value).slice(0, 3);
    } catch (error) {
        console.error("Error getting top players:", error);
        return [];
    }
};

// Show leaderboard modal
const showLeaderboard = async () => {
    const leaderboardModal = document.getElementById("leaderboardModal");
    const menuModal = document.getElementById("menuModal");
    const dimDungeon = document.querySelector('#dungeon-main');
    
    dimDungeon.style.filter = "brightness(50%)";
    leaderboardModal.style.display = "flex";
    
    // Fetch top players
    const topGold = await getTopPlayers("gold");
    const topLevel = await getTopPlayers("level");
    const topFloor = await getTopPlayers("floor");
    
    leaderboardModal.innerHTML = `
    <div class="content">
        <div class="content-head">
            <h3>Xếp Hạng</h3>
            <p id="close-leaderboard"><i class="fa fa-xmark"></i></p>
        </div>
        <div class="leaderboard-section">
            <h4>🏆 Top Vàng</h4>
            ${topGold.map((p, i) => `<p>${i + 1}. ${p.name}: ${nFormatter(p.value)} vàng</p>`).join('') || '<p>Chưa có dữ liệu</p>'}
        </div>
        <div class="leaderboard-section">
            <h4>⭐ Top Cấp Độ</h4>
            ${topLevel.map((p, i) => `<p>${i + 1}. ${p.name}: Level ${p.value}</p>`).join('') || '<p>Chưa có dữ liệu</p>'}
        </div>
        <div class="leaderboard-section">
            <h4>🏰 Top Tầng</h4>
            ${topFloor.map((p, i) => `<p>${i + 1}. ${p.name}: Tầng ${p.value}</p>`).join('') || '<p>Chưa có dữ liệu</p>'}
        </div>
        <button id="back-to-menu" style="margin-top: 15px;">Quay Lại Menu</button>
    </div>`;
    
    document.getElementById("close-leaderboard").onclick = () => {
        leaderboardModal.style.display = "none";
        menuModal.style.display = "flex";
    };
    
    document.getElementById("back-to-menu").onclick = () => {
        leaderboardModal.style.display = "none";
        menuModal.style.display = "flex";
    };
};

// Delete all player data
const deleteAllPlayerData = async () => {
    if (!currentUser) return;
    
    try {
        const userId = currentUser.uid;
        const docRef = db.collection("players").doc(userId);
        
        // Delete player name registration
        if (player && player.name) {
            await unregisterPlayerName(player.name);
        }
        
        // Delete dungeon subcollection
        const dungeonDocs = await docRef.collection("dungeon").get();
        for (const doc of dungeonDocs.docs) {
            await doc.ref.delete();
        }
        
        // Delete settings subcollection
        const settingsDocs = await docRef.collection("settings").get();
        for (const doc of settingsDocs.docs) {
            await doc.ref.delete();
        }
        
        // Delete main player document
        await docRef.delete();
        
        // Reset local data
        player = null;
        dungeon = null;
        enemy = null;
        
        console.log("All player data deleted");
        
        // Show character creation
        showScreen("character-creation");
    } catch (error) {
        console.error("Error deleting player data:", error);
    }
};
