// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAW-FtufPxI9mCuZDuTgxRUjHOGtgJ2hgc",
    authDomain: "soulmc-account.firebaseapp.com",
    projectId: "soulmc-account",
    storageBucket: "soulmc-account.firebasestorage.app",
    messagingSenderId: "508725790521",
    appId: "1:508725790521:web:a58b2f0608b028baaccae8",
    measurementId: "G-NW033BL7PW"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions();

// Global variables
let currentUser = null;
let volume = {
    master: 0.5,
    bgm: 0.5,
    sfx: 0.5
};

// ===== Authentication Functions =====

/**
 * Login user with email and password
 */
const firebaseLogin = (email, password) => {
    return auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log("Đăng nhập thành công:", userCredential.user.email);
            return userCredential.user;
        })
        .catch((error) => {
            console.error("Lỗi đăng nhập:", error.message);
            throw error;
        });
};

/**
 * Register new user with email and password
 */
const firebaseRegister = (email, password) => {
    return auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log("Đăng ký thành công:", userCredential.user.email);
            return userCredential.user;
        })
        .catch((error) => {
            console.error("Lỗi đăng ký:", error.message);
            throw error;
        });
};

/**
 * Logout current user
 */
const firebaseLogout = () => {
    return auth.signOut()
        .then(() => {
            console.log("Đăng xuất thành công");
        })
        .catch((error) => {
            console.error("Lỗi đăng xuất:", error.message);
            throw error;
        });
};

/**
 * Get current authenticated user
 */
const getCurrentUser = () => {
    return auth.currentUser;
};

/**
 * Check if player name exists
 */
const checkPlayerNameExists = (playerName) => {
    return db.collection("players")
        .where("name", "==", playerName)
        .get()
        .then((querySnapshot) => {
            return !querySnapshot.empty;
        })
        .catch((error) => {
            console.error("Lỗi kiểm tra tên:", error);
            throw error;
        });
};

// ===== Player Data Functions =====

/**
 * Create new player in Firestore
 */
const createPlayerData = (userId, playerName, playerData) => {
    const playerDocData = {
        ...playerData,
        userId: userId,
        name: playerName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Debug: log attempt to create player doc
    console.log("[firebase] createPlayerData -> creating player doc for uid:", userId, "name:", playerName);
    console.log("[firebase] createPlayerData -> payload keys:", Object.keys(playerDocData));

    return db.collection("players").doc(userId).set(playerDocData)
        .then(() => {
            console.log("Tạo dữ liệu người chơi thành công for uid:", userId);
            return playerDocData;
        })
        .catch((error) => {
            console.error("Lỗi tạo dữ liệu:", error);
            throw error;
        });
};

/**
 * Get player data from Firestore
 */
const getPlayerData = (userId) => {
    return db.collection("players").doc(userId).get()
        .then((doc) => {
            if (doc.exists) {
                console.log("Lấy dữ liệu người chơi thành công");
                return doc.data();
            } else {
                console.log("Không tìm thấy dữ liệu người chơi");
                return null;
            }
        })
        .catch((error) => {
            console.error("Lỗi lấy dữ liệu:", error);
            throw error;
        });
};

/**
 * Update player data in Firestore
 */
const updatePlayerData = async (userId, playerData) => {
    // Whitelist keys allowed in snapshot (keep in sync with function)
    const allowedKeys = ['inventory', 'equipped', 'playtime', 'kills', 'deaths', 'inCombat', 'dungeon', 'stats', 'equippedStats', 'bonusStats', 'gold', 'lvl'];

    const snapshot = {};
    Object.keys(playerData).forEach(k => {
        if (allowedKeys.includes(k)) snapshot[k] = playerData[k];
    });

    try {
        const saveFn = functions.httpsCallable('savePlayerSnapshot');
        const res = await saveFn({ snapshot });
        console.log('savePlayerSnapshot result:', res.data);
        return res.data;
    } catch (error) {
        console.error('Error calling savePlayerSnapshot:', error);
        throw error;
    }
};

// Cloud Function helpers for common operations
const addGold = async (amount) => {
    try {
        const fn = functions.httpsCallable('addGold');
        const res = await fn({ amount });
        console.log('addGold result:', res.data);
        return res.data;
    } catch (err) {
        console.error('addGold error:', err);
        throw err;
    }
};

const addLevel = async (amount) => {
    try {
        const fn = functions.httpsCallable('addLevel');
        const res = await fn({ amount });
        console.log('addLevel result:', res.data);
        return res.data;
    } catch (err) {
        console.error('addLevel error:', err);
        throw err;
    }
};

const spendGold = async (amount) => {
    try {
        const fn = functions.httpsCallable('spendGold');
        const res = await fn({ amount });
        console.log('spendGold result:', res.data);
        return res.data;
    } catch (err) {
        console.error('spendGold error:', err);
        throw err;
    }
};

/**
 * Delete player data from Firestore
 */
const deletePlayerData = (userId) => {
    return db.collection("players").doc(userId).delete()
        .then(() => {
            console.log("Xóa dữ liệu người chơi thành công");
        })
        .catch((error) => {
            console.error("Lỗi xóa dữ liệu:", error);
            throw error;
        });
};

/**
 * Get leaderboard data
 * @param {string} type - 'gold', 'level', or 'floor'
 * @param {number} limit - number of results (default 3)
 */
const getLeaderboard = (type, limit = 3) => {
    let query;

    if (type === 'gold') {
        query = db.collection("players")
            .orderBy("gold", "desc")
            .limit(limit);
    } else if (type === 'level') {
        query = db.collection("players")
            .orderBy("lvl", "desc")
            .limit(limit);
    } else if (type === 'floor') {
        query = db.collection("players")
            .orderBy("dungeon.progress.floor", "desc")
            .limit(limit);
    }

    return query.get()
        .then((querySnapshot) => {
            const leaderboard = [];
            querySnapshot.forEach((doc) => {
                leaderboard.push({
                    name: doc.data().name,
                    value: type === 'gold' ? doc.data().gold : 
                           type === 'level' ? doc.data().lvl : 
                           doc.data().dungeon.progress.floor
                });
            });
            return leaderboard;
        })
        .catch((error) => {
            console.error("Lỗi lấy xếp hạng:", error);
            throw error;
        });
};

// ===== Volume Data Functions =====

/**
 * Save volume settings to Firestore
 */
const saveVolumeData = (userId, volumeData) => {
    return db.collection("players").doc(userId).update({
        volumeSettings: volumeData
    })
        .catch((error) => {
            console.error("Lỗi lưu cài đặt âm thanh:", error);
        });
};

/**
 * Get volume settings from Firestore
 */
const getVolumeData = (userId) => {
    return db.collection("players").doc(userId).get()
        .then((doc) => {
            if (doc.exists && doc.data().volumeSettings) {
                return doc.data().volumeSettings;
            }
            return null;
        })
        .catch((error) => {
            console.error("Lỗi lấy cài đặt âm thanh:", error);
            return null;
        });
};

// ===== Auto-save Function =====

/**
 * Setup auto-save function
 */
let autoSaveInterval;

const startAutoSave = (userId, getPlayerDataFunc) => {
    // Auto-save every 30 seconds
    autoSaveInterval = setInterval(() => {
        const currentPlayer = getPlayerDataFunc();
        if (currentPlayer && getCurrentUser()) {
            updatePlayerData(userId, currentPlayer).catch((error) => {
                console.error("Lỗi auto-save:", error);
            });
        }
    }, 30000);
};

const stopAutoSave = () => {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
};
