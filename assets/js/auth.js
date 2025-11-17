// ===== FIREBASE AUTHENTICATION =====
// Make sure to include Firebase SDK in your HTML:
// <script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js"></script>

let currentUser = null;

// Helper function to get Firestore
const getDb = () => {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        return firebase.firestore();
    }
    return null;
};

// Wait for Firebase to load before initializing
const initializeFirebaseAuth = () => {
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                loadPlayerDataFromFirebase(user.uid);
            } else {
                currentUser = null;
                showLoginScreen();
            }
        });
        console.log("Firebase Auth initialized");
    } else {
        console.warn("Firebase not ready, retrying...");
        setTimeout(initializeFirebaseAuth, 500);
    }
};

setTimeout(initializeFirebaseAuth, 1000);

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

const hideLoginScreen = () => {
    if (document.querySelector("#auth-screen")) {
        document.querySelector("#auth-screen").style.display = "none";
    }
};

const registerUser = async (email, password, confirmPassword) => {
    let attempts = 0;
    while ((typeof firebase === 'undefined' || !firebase.auth) && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 300));
        attempts++;
    }
    
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
        
        const db = getDb();
        if (db) {
            await db.collection('gamePlayers').doc(result.user.uid).set({
                email: email,
                createdAt: new Date(),
                lastUpdated: new Date(),
                playerName: null,
                allocated: false
            });
        }

        hideLoginScreen();
        return true;
    } catch (error) {
        showAuthError(error.message);
        return false;
    }
};

const loginUser = async (email, password) => {
    let attempts = 0;
    while ((typeof firebase === 'undefined' || !firebase.auth) && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 300));
        attempts++;
    }
    
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

const logoutUser = async () => {
    try {
        await firebase.auth().signOut();
        currentUser = null;
        showLoginScreen();
    } catch (error) {
        console.error("Logout error:", error);
    }
};

const showAuthError = (message) => {
    const alertElements = document.querySelectorAll("#auth-alert");
    alertElements.forEach(el => {
        if (el && el.offsetParent !== null) {
            el.innerHTML = message;
        }
    });
};

const checkPlayerNameExists = async (playerName) => {
    const db = getDb();
    if (!db) {
        console.error("Firebase not loaded");
        return false;
    }

    try {
        const snapshot = await db
            .collection('playernames')
            .where('name', '==', playerName)
            .get();
        
        return !snapshot.empty;
    } catch (error) {
        console.error("Error checking player name:", error);
        return false;
    }
};

const savePlayerNameToFirebase = async (playerName) => {
    const db = getDb();
    if (!db) {
        console.error("Firebase not loaded");
        return false;
    }

    try {
        if (!currentUser) {
            console.error("User not authenticated");
            return false;
        }

        const exists = await checkPlayerNameExists(playerName);
        if (exists) {
            document.querySelector("#alert").innerHTML = "Đã có người sử dụng tên này!";
            return false;
        }

        await db.collection('playernames').doc(currentUser.uid).set({
            uid: currentUser.uid,
            name: playerName,
            createdAt: new Date()
        });

        await db.collection('gamePlayers').doc(currentUser.uid).update({
            playerName: playerName,
            lastUpdated: new Date()
        });

        return true;
    } catch (error) {
        console.error("Error saving player name:", error);
        return false;
    }
};

const loadPlayerDataFromFirebase = async (uid) => {
    const db = getDb();
    if (!db) {
        console.error("Firebase not loaded");
        document.querySelector("#character-creation").style.display = "flex";
        return;
    }

    try {
        const doc = await db.collection('gamePlayers').doc(uid).get();
        
        if (doc.exists) {
            const data = doc.data();
            
            if (data.playerName && data.allocated && data.gameData) {
                player = data.gameData;
                dungeon = data.dungeonData || dungeon;
                enemy = data.enemyData || enemy;
                
                localStorage.setItem("playerData", JSON.stringify(player));
                localStorage.setItem("dungeonData", JSON.stringify(dungeon));
                if (enemy) localStorage.setItem("enemyData", JSON.stringify(enemy));
                
                enterDungeon();
            } else if (data.playerName && !data.allocated) {
                document.querySelector("#title-screen").style.display = "flex";
                allocationPopup();
            } else {
                document.querySelector("#character-creation").style.display = "flex";
            }
        } else {
            document.querySelector("#character-creation").style.display = "flex";
        }
    } catch (error) {
        console.error("Error loading player data:", error);
        document.querySelector("#character-creation").style.display = "flex";
    }
};

const saveGameDataToFirebase = async () => {
    if (!currentUser || !player) {
        return;
    }

    const db = getDb();
    if (!db) {
        return;
    }

    try {
        await db.collection('gamePlayers').doc(currentUser.uid).update({
            gameData: player,
            dungeonData: dungeon,
            enemyData: enemy || null,
            lastUpdated: new Date()
        });

        await db.collection('gameStatistics').doc(currentUser.uid).set({
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

const updatePlayerAllocated = async () => {
    if (!currentUser) return;

    const db = getDb();
    if (!db) return;

    try {
        await db.collection('gamePlayers').doc(currentUser.uid).update({
            allocated: true,
            lastUpdated: new Date()
        });
    } catch (error) {
        console.error("Error updating allocated status:", error);
    }
};

const deletePlayerDataFromFirebase = async () => {
    if (!currentUser) return;

    const db = getDb();
    if (!db) return;

    try {
        await db.collection('gamePlayers').doc(currentUser.uid).delete();
        await db.collection('playernames').doc(currentUser.uid).delete();
        await db.collection('gameStatistics').doc(currentUser.uid).delete();
        
        player = null;
        dungeon = null;
        enemy = null;
        localStorage.clear();

        await logoutUser();

    } catch (error) {
        console.error("Error deleting player data:", error);
    }
};

const getLeaderboards = async () => {
    const db = getDb();
    if (!db) {
        console.error("Firebase not loaded");
        return { gold: [], level: [], floor: [] };
    }

    try {
        const goldTop = await db
            .collection('gameStatistics')
            .orderBy('gold', 'desc')
            .limit(3)
            .get();

        const levelTop = await db
            .collection('gameStatistics')
            .orderBy('level', 'desc')
            .limit(3)
            .get();

        const floorTop = await db
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
