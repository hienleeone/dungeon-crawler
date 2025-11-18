// Firebase Authentication and Data Management

// Elements
const authScreen = document.querySelector("#auth-screen");
const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const showRegisterBtn = document.querySelector("#show-register-btn");
const showLoginBtn = document.querySelector("#show-login-btn");
const loginBtn = document.querySelector("#login-btn");
const registerBtn = document.querySelector("#register-btn");
const loginEmail = document.querySelector("#login-email");
const loginPassword = document.querySelector("#login-password");
const loginError = document.querySelector("#login-error");
const registerEmail = document.querySelector("#register-email");
const registerPassword = document.querySelector("#register-password");
const registerConfirmPassword = document.querySelector("#register-confirm-password");
const registerError = document.querySelector("#register-error");

// Switch between login and register forms
showRegisterBtn.addEventListener("click", function() {
    loginForm.style.display = "none";
    registerForm.style.display = "flex";
    loginError.textContent = "";
});

showLoginBtn.addEventListener("click", function() {
    registerForm.style.display = "none";
    loginForm.style.display = "flex";
    registerError.textContent = "";
});

// Login function
loginBtn.addEventListener("click", async function() {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
        loginError.textContent = "Vui lòng nhập đầy đủ thông tin!";
        return;
    }

    try {
        loginBtn.disabled = true;
        loginBtn.textContent = "Đang đăng nhập...";
        loginError.textContent = "";

        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        
        // Load player data from Firebase
        await loadPlayerDataFromFirebase(currentUser.uid);
        
    } catch (error) {
        console.error("Login error:", error);
        switch (error.code) {
            case 'auth/invalid-email':
                loginError.textContent = "Email không hợp lệ!";
                break;
            case 'auth/user-not-found':
                loginError.textContent = "Tài khoản không tồn tại!";
                break;
            case 'auth/wrong-password':
                loginError.textContent = "Mật khẩu không đúng!";
                break;
            case 'auth/too-many-requests':
                loginError.textContent = "Quá nhiều lần thử. Vui lòng thử lại sau!";
                break;
            default:
                loginError.textContent = "Đăng nhập thất bại: " + error.message;
        }
        loginBtn.disabled = false;
        loginBtn.textContent = "Đăng Nhập";
    }
});

// Register function
registerBtn.addEventListener("click", async function() {
    const email = registerEmail.value.trim();
    const password = registerPassword.value;
    const confirmPassword = registerConfirmPassword.value;

    if (!email || !password || !confirmPassword) {
        registerError.textContent = "Vui lòng nhập đầy đủ thông tin!";
        return;
    }

    if (password !== confirmPassword) {
        registerError.textContent = "Mật khẩu không khớp!";
        return;
    }

    if (password.length < 6) {
        registerError.textContent = "Mật khẩu phải có ít nhất 6 ký tự!";
        return;
    }

    try {
        registerBtn.disabled = true;
        registerBtn.textContent = "Đang đăng ký...";
        registerError.textContent = "";

        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        
        // Initialize new player data (will be created when they enter their name)
        player = null;
        
        // Switch to character creation
        authScreen.style.display = "none";
        document.querySelector("#character-creation").style.display = "flex";
        
    } catch (error) {
        console.error("Register error:", error);
        switch (error.code) {
            case 'auth/email-already-in-use':
                registerError.textContent = "Email đã được sử dụng!";
                break;
            case 'auth/invalid-email':
                registerError.textContent = "Email không hợp lệ!";
                break;
            case 'auth/weak-password':
                registerError.textContent = "Mật khẩu quá yếu!";
                break;
            default:
                registerError.textContent = "Đăng ký thất bại: " + error.message;
        }
        registerBtn.disabled = false;
        registerBtn.textContent = "Đồng Ý";
    }
});

// Load player data from Firebase
async function loadPlayerDataFromFirebase(uid) {
    try {
        const snapshot = await database.ref('players/' + uid).once('value');
        const data = snapshot.val();
        
        if (data) {
            // Player exists, load their data
            player = data.playerData;
            dungeon = data.dungeonData || createDefaultDungeon();
            enemy = data.enemyData || null;
            
            // Hide auth screen and show title screen
            authScreen.style.display = "none";
            document.querySelector("#title-screen").style.display = "flex";
        } else {
            // New player, go to character creation
            player = null;
            authScreen.style.display = "none";
            document.querySelector("#character-creation").style.display = "flex";
        }
    } catch (error) {
        console.error("Error loading player data:", error);
        loginError.textContent = "Lỗi tải dữ liệu: " + error.message;
    }
}

// Save player data to Firebase
async function saveDataToFirebase() {
    if (!currentUser) {
        console.error("No user logged in!");
        return;
    }

    try {
        const saveData = {
            playerData: player,
            dungeonData: dungeon,
            enemyData: enemy,
            lastSaved: Date.now()
        };

        await database.ref('players/' + currentUser.uid).set(saveData);
        
        // Update leaderboard
        if (player && player.name) {
            await updateLeaderboard(currentUser.uid);
        }
    } catch (error) {
        console.error("Error saving to Firebase:", error);
    }
}

// Update leaderboard
async function updateLeaderboard(uid) {
    try {
        const leaderboardData = {
            name: player.name,
            level: player.lvl,
            gold: player.gold,
            floor: dungeon ? (dungeon.floorCount || 1) : 1,
            timestamp: Date.now()
        };

        await database.ref('leaderboard/' + uid).set(leaderboardData);
    } catch (error) {
        console.error("Error updating leaderboard:", error);
    }
}

// Get leaderboard data
async function getLeaderboard() {
    try {
        const snapshot = await database.ref('leaderboard').once('value');
        const data = snapshot.val();
        
        if (!data) return { gold: [], level: [], floor: [] };

        const players = Object.values(data);

        // Sort by gold (top 3)
        const topGold = players
            .sort((a, b) => (b.gold || 0) - (a.gold || 0))
            .slice(0, 3);

        // Sort by level (top 3)
        const topLevel = players
            .sort((a, b) => (b.level || 0) - (a.level || 0))
            .slice(0, 3);

        // Sort by floor (top 3)
        const topFloor = players
            .sort((a, b) => (b.floor || 0) - (a.floor || 0))
            .slice(0, 3);

        return {
            gold: topGold,
            level: topLevel,
            floor: topFloor
        };
    } catch (error) {
        console.error("Error getting leaderboard:", error);
        return { gold: [], level: [], floor: [] };
    }
}

// Show leaderboard modal
async function showLeaderboard() {
    sfxOpen.play();
    const leaderboard = await getLeaderboard();
    
    defaultModalElement.style.display = "flex";
    defaultModalElement.innerHTML = `
    <div class="content" style="max-width: 30rem;">
        <div class="content-head">
            <h3>Xếp Hạng</h3>
            <p id="leaderboard-close"><i class="fa fa-xmark"></i></p>
        </div>
        
        <div class="leaderboard-container">
            <div class="leaderboard-section">
                <h4><i class="fas fa-coins" style="color: #FFD700;"></i> Top Vàng</h4>
                <div class="leaderboard-list" id="gold-leaderboard"></div>
            </div>
            
            <div class="leaderboard-section">
                <h4><i class="fas fa-star" style="color: #FFD700;"></i> Top Level</h4>
                <div class="leaderboard-list" id="level-leaderboard"></div>
            </div>
            
            <div class="leaderboard-section">
                <h4><i class="fa-solid fa-dungeon" style="color: #FFD700;"></i> Top Tầng</h4>
                <div class="leaderboard-list" id="floor-leaderboard"></div>
            </div>
        </div>
    </div>`;

    // Populate gold leaderboard
    const goldList = document.querySelector("#gold-leaderboard");
    if (leaderboard.gold.length > 0) {
        leaderboard.gold.forEach((p, index) => {
            goldList.innerHTML += `
                <div class="leaderboard-item">
                    <span class="leaderboard-rank">#${index + 1}</span>
                    <span class="leaderboard-name">${p.name}</span>
                    <span class="leaderboard-value">${nFormatter(p.gold || 0)}</span>
                </div>`;
        });
    } else {
        goldList.innerHTML = '<p style="text-align: center; color: #666;">Chưa có dữ liệu</p>';
    }

    // Populate level leaderboard
    const levelList = document.querySelector("#level-leaderboard");
    if (leaderboard.level.length > 0) {
        leaderboard.level.forEach((p, index) => {
            levelList.innerHTML += `
                <div class="leaderboard-item">
                    <span class="leaderboard-rank">#${index + 1}</span>
                    <span class="leaderboard-name">${p.name}</span>
                    <span class="leaderboard-value">Lv.${p.level || 1}</span>
                </div>`;
        });
    } else {
        levelList.innerHTML = '<p style="text-align: center; color: #666;">Chưa có dữ liệu</p>';
    }

    // Populate floor leaderboard
    const floorList = document.querySelector("#floor-leaderboard");
    if (leaderboard.floor.length > 0) {
        leaderboard.floor.forEach((p, index) => {
            floorList.innerHTML += `
                <div class="leaderboard-item">
                    <span class="leaderboard-rank">#${index + 1}</span>
                    <span class="leaderboard-name">${p.name}</span>
                    <span class="leaderboard-value">Tầng ${p.floor || 1}</span>
                </div>`;
        });
    } else {
        floorList.innerHTML = '<p style="text-align: center; color: #666;">Chưa có dữ liệu</p>';
    }

    document.querySelector("#leaderboard-close").onclick = function() {
        sfxDecline.play();
        defaultModalElement.style.display = "none";
        defaultModalElement.innerHTML = "";
        if (menuModalElement.style.display === "flex") {
            // If called from menu, show menu again
        }
    };
}

// Logout function
async function logout() {
    try {
        await auth.signOut();
        currentUser = null;
        player = null;
        dungeon = null;
        enemy = null;
        
        // Stop music
        if (typeof bgmDungeon !== 'undefined') bgmDungeon.stop();
        if (typeof bgmBattleMain !== 'undefined') bgmBattleMain.stop();
        
        // Clear intervals
        if (typeof dungeonTimer !== 'undefined') clearInterval(dungeonTimer);
        if (typeof playTimer !== 'undefined') clearInterval(playTimer);
        
        // Reset UI
        document.querySelector("#dungeon-main").style.display = "none";
        document.querySelector("#title-screen").style.display = "none";
        document.querySelector("#character-creation").style.display = "none";
        authScreen.style.display = "flex";
        loginForm.style.display = "flex";
        registerForm.style.display = "none";
        
        // Clear form fields
        loginEmail.value = "";
        loginPassword.value = "";
        registerEmail.value = "";
        registerPassword.value = "";
        registerConfirmPassword.value = "";
        loginError.textContent = "";
        registerError.textContent = "";
        
        // Reset buttons
        loginBtn.disabled = false;
        loginBtn.textContent = "Đăng Nhập";
        registerBtn.disabled = false;
        registerBtn.textContent = "Đồng Ý";
        
    } catch (error) {
        console.error("Logout error:", error);
    }
}

// Delete all player data
async function deletePlayerData() {
    if (!currentUser) return;
    
    try {
        // Delete from players
        await database.ref('players/' + currentUser.uid).remove();
        
        // Delete from leaderboard
        await database.ref('leaderboard/' + currentUser.uid).remove();
        
        // Reset player data
        player = null;
        dungeon = null;
        enemy = null;
        
        // Go to character creation
        document.querySelector("#dungeon-main").style.display = "none";
        document.querySelector("#title-screen").style.display = "none";
        document.querySelector("#character-creation").style.display = "flex";
        
        // Close all modals
        if (menuModalElement) {
            menuModalElement.style.display = "none";
            menuModalElement.innerHTML = "";
        }
        if (defaultModalElement) {
            defaultModalElement.style.display = "none";
            defaultModalElement.innerHTML = "";
        }
        if (confirmationModalElement) {
            confirmationModalElement.style.display = "none";
            confirmationModalElement.innerHTML = "";
        }
        
    } catch (error) {
        console.error("Error deleting player data:", error);
    }
}

// Check if player name exists
async function checkPlayerNameExists(playerName) {
    try {
        const snapshot = await database.ref('playerNames/' + playerName.toLowerCase()).once('value');
        return snapshot.exists();
    } catch (error) {
        console.error("Error checking player name:", error);
        return false;
    }
}

// Register player name
async function registerPlayerName(playerName) {
    if (!currentUser) return false;
    
    try {
        await database.ref('playerNames/' + playerName.toLowerCase()).set({
            uid: currentUser.uid,
            name: playerName,
            timestamp: Date.now()
        });
        return true;
    } catch (error) {
        console.error("Error registering player name:", error);
        return false;
    }
}

// Helper function to create default dungeon object
function createDefaultDungeon() {
    return {
        floorCount: 1,
        roomCount: 1,
        status: {
            exploring: false
        },
        statistics: {
            kills: 0,
            runtime: 0
        },
        settings: {
            enemyScaling: 1
        }
    };
}

// Override the original saveData function
const originalSaveData = typeof saveData !== 'undefined' ? saveData : null;
saveData = function() {
    // Save to Firebase instead of localStorage
    if (currentUser) {
        saveDataToFirebase();
    }
    // Don't save to localStorage to prevent cheating
};

// Check authentication state on page load
auth.onAuthStateChanged(function(user) {
    if (user) {
        currentUser = user;
        // User is already logged in, but we'll let them click the screen to continue
    }
});

// Auto-save every 30 seconds
setInterval(function() {
    if (currentUser && player) {
        saveDataToFirebase();
    }
}, 30000);
