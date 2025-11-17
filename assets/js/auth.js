// ===== FIREBASE AUTHENTICATION =====
// Make sure to include Firebase SDK in your HTML:
// <script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js"></script>

let currentUser = null;

// Initialize Firebase Auth State - Wait for Firebase to load
setTimeout(() => {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                // Load player data from Firebase
                loadPlayerDataFromFirebase(user.uid);
            } else {
                currentUser = null;
                showLoginScreen();
            }
        });
    } else {
        // Retry if Firebase not ready
        console.warn("Firebase not loaded yet, retrying...");
        setTimeout(arguments.callee, 200);
    }
}, 500);

// Show Login Screen
const showLoginScreen = () => {
    if (document.querySelector("#auth-screen")) {
        document.querySelector("#auth-screen").style.display = "flex";
    }
    if (document.querySelector("#title-screen")) {
        document.querySelector("#title-screen").style.display = "none";
    }
    if (document.querySelector("#character-creation")) {
        document.querySelector("#character-creation").style.display = "none";
    }
    if (document.querySelector("#dungeon-main")) {
        document.querySelector("#dungeon-main").style.display = "none";
    }
};

// Show Game Screens
const hideLoginScreen = () => {
    if (document.querySelector("#auth-screen")) {
        document.querySelector("#auth-screen").style.display = "none";
    }
};

// Register User
const registerUser = async (email, password, confirmPassword) => {
    // Check if Firebase is loaded
    if (typeof firebase === 'undefined' || !firebase.auth) {
        showAuthError("Firebase chưa load. Vui lòng làm mới trang!");
        return false;
    }

    if (password !== confirmPassword) {
        showAuthError("Mật khẩu không trùng khớp!");
        return false;
    }

    if (password.length < 6) {
        showAuthError("Mật khẩu phải ít nhất 6 ký tự!");
        return false;
    }

    try {
        const result = await firebase.auth().createUserWithEmailAndPassword(email, password);
        currentUser = result.user;
        
        // Create user document in Firestore
        await firebase.firestore().collection('gamePlayers').doc(result.user.uid).set({
            email: email,
            createdAt: new Date(),
            lastUpdated: new Date(),
            playerName: null,
            allocated: false
        });

        hideLoginScreen();
        return true;
    } catch (error) {
        showAuthError(error.message);
        return false;
    }
};

// Login User
const loginUser = async (email, password) => {
    // Check if Firebase is loaded
    if (typeof firebase === 'undefined' || !firebase.auth) {
        showAuthError("Firebase chưa load. Vui lòng làm mới trang!");
        return false;
    }

    try {
        const result = await firebase.auth().signInWithEmailAndPassword(email, password);
        currentUser = result.user;
        hideLoginScreen();
        return true;
    } catch (error) {
        showAuthError(error.message);
        return false;
    }
};

// Logout User
const logoutUser = async () => {
    try {
        await firebase.auth().signOut();
        currentUser = null;
        showLoginScreen();
    } catch (error) {
        console.error("Logout error:", error);
    }
};

// Show Auth Error
const showAuthError = (message) => {
    const alertElements = document.querySelectorAll("#auth-alert");
    alertElements.forEach(el => {
        if (el && el.offsetParent !== null) { // Only update visible form
            el.innerHTML = message;
        }
    });
};

// Check if player name exists
const checkPlayerNameExists = async (playerName) => {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.error("Firebase not loaded");
        return false;
    }

    try {
        const snapshot = await firebase.firestore()
            .collection('playernames')
            .where('name', '==', playerName)
            .get();
        
        return !snapshot.empty;
    } catch (error) {
        console.error("Error checking player name:", error);
        return false;
    }
};

// Save player name to Firestore
const savePlayerNameToFirebase = async (playerName) => {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.error("Firebase not loaded");
        return false;
    }

    try {
        if (!currentUser) {
            console.error("User not authenticated");
            return false;
        }

        // Check if name exists
        const exists = await checkPlayerNameExists(playerName);
        if (exists) {
            document.querySelector("#alert").innerHTML = "Đã có người sử dụng tên này!";
            return false;
        }

        // Save to playernames collection
        await firebase.firestore().collection('playernames').doc(currentUser.uid).set({
            uid: currentUser.uid,
            name: playerName,
            createdAt: new Date()
        });

        // Update gamePlayers document
        await firebase.firestore().collection('gamePlayers').doc(currentUser.uid).update({
            playerName: playerName,
            lastUpdated: new Date()
        });

        return true;
    } catch (error) {
        console.error("Error saving player name:", error);
        return false;
    }
};

// Load player data from Firebase
const loadPlayerDataFromFirebase = async (uid) => {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.error("Firebase not loaded");
        document.querySelector("#character-creation").style.display = "flex";
        return;
    }

    try {
        const doc = await firebase.firestore().collection('gamePlayers').doc(uid).get();
        
        if (doc.exists) {
            const data = doc.data();
            
            if (data.playerName && data.allocated && data.gameData) {
                // Player exists and has completed setup, continue game
                player = data.gameData;
                dungeon = data.dungeonData || dungeon;
                enemy = data.enemyData || enemy;
                
                // Update localStorage as well
                localStorage.setItem("playerData", JSON.stringify(player));
                localStorage.setItem("dungeonData", JSON.stringify(dungeon));
                if (enemy) localStorage.setItem("enemyData", JSON.stringify(enemy));
                
                enterDungeon();
            } else if (data.playerName && !data.allocated) {
                // Player exists but needs to allocate stats
                document.querySelector("#title-screen").style.display = "flex";
                allocationPopup();
            } else {
                // New player, show character creation
                document.querySelector("#character-creation").style.display = "flex";
            }
        } else {
            // New player, show character creation
            document.querySelector("#character-creation").style.display = "flex";
        }
    } catch (error) {
        console.error("Error loading player data:", error);
        document.querySelector("#character-creation").style.display = "flex";
    }
};

// Save all game data to Firebase
const saveGameDataToFirebase = async () => {
    if (!currentUser || !player || typeof firebase === 'undefined' || !firebase.firestore) {
        return;
    }

    try {
        // Only save data from memory (player, dungeon, enemy)
        // This ensures data cannot be tampered with via localStorage
        await firebase.firestore().collection('gamePlayers').doc(currentUser.uid).update({
            gameData: player,
            dungeonData: dungeon,
            enemyData: enemy || null,
            lastUpdated: new Date()
        });

        // Update gameStatistics for leaderboard
        await firebase.firestore().collection('gameStatistics').doc(currentUser.uid).set({
            uid: currentUser.uid,
            playerName: player.name,
            level: player.lvl,
            gold: player.gold,
            currentFloor: dungeon.progress.floor || 0,
            lastUpdated: new Date()
        });

    } catch (error) {
        console.error("Error saving game data to Firebase:", error);
    }
};

// Update allocated stats
const updatePlayerAllocated = async () => {
    if (!currentUser || typeof firebase === 'undefined' || !firebase.firestore) return;

    try {
        await firebase.firestore().collection('gamePlayers').doc(currentUser.uid).update({
            allocated: true,
            lastUpdated: new Date()
        });
    } catch (error) {
        console.error("Error updating allocated status:", error);
    }
};

// Delete all player data
const deletePlayerDataFromFirebase = async () => {
    if (!currentUser || typeof firebase === 'undefined' || !firebase.firestore) return;

    try {
        // Delete game data
        await firebase.firestore().collection('gamePlayers').doc(currentUser.uid).delete();
        
        // Delete from playernames
        await firebase.firestore().collection('playernames').doc(currentUser.uid).delete();
        
        // Delete from statistics
        await firebase.firestore().collection('gameStatistics').doc(currentUser.uid).delete();
        
        // Reset local variables
        player = null;
        dungeon = null;
        enemy = null;
        localStorage.clear();

        // Sign out user
        await logoutUser();

    } catch (error) {
        console.error("Error deleting player data:", error);
    }
};

// Get leaderboards
const getLeaderboards = async () => {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.error("Firebase not loaded");
        return { gold: [], level: [], floor: [] };
    }

    try {
        const goldTop = await firebase.firestore()
            .collection('gameStatistics')
            .orderBy('gold', 'desc')
            .limit(3)
            .get();

        const levelTop = await firebase.firestore()
            .collection('gameStatistics')
            .orderBy('level', 'desc')
            .limit(3)
            .get();

        const floorTop = await firebase.firestore()
            .collection('gameStatistics')
            .orderBy('currentFloor', 'desc')
            .limit(3)
            .get();

        return {
            gold: goldTop.docs.map(doc => ({ name: doc.data().playerName, value: doc.data().gold })),
            level: levelTop.docs.map(doc => ({ name: doc.data().playerName, value: doc.data().level })),
            floor: floorTop.docs.map(doc => ({ name: doc.data().playerName, value: doc.data().currentFloor }))
        };
    } catch (error) {
        console.error("Error getting leaderboards:", error);
        return { gold: [], level: [], floor: [] };
    }
};
