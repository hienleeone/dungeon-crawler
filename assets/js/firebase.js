// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Auth & Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// Cloud Functions (đúng region bạn deploy)
const functions = firebase.app().functions("asia-southeast1");

// Xuất global để file khác có thể dùng
window.auth = auth;
window.db = db;
window.functions = functions;

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

// Global variables
let currentUser = null;
let volume = {
    master: 0.5,
    bgm: 0.5,
    sfx: 0.5
};

// ===== SECURITY FUNCTIONS =====

/**
 * Validate player data before saving
 */
const validateBeforeSave = (playerData) => {
    const issues = [];

    // Kiểm tra vàng (max 1 tỷ)
    if (playerData.gold > 1000000000) {
        issues.push('Gold exceeds maximum (1B)');
        playerData.gold = 1000000000; // Cap at max
    }

    if (playerData.gold < 0) {
        issues.push('Gold is negative');
        playerData.gold = 0;
    }

    // Kiểm tra level (max 1000)
    if (playerData.lvl > 1000) {
        issues.push('Level exceeds maximum (1000)');
        playerData.lvl = 1000;
    }

    if (playerData.lvl < 1) {
        issues.push('Level is too low');
        playerData.lvl = 1;
    }

    // Kiểm tra stats
    if (playerData.stats) {
        if (playerData.stats.atk > 999999) {
            issues.push('ATK too high');
            playerData.stats.atk = 999999;
        }
        if (playerData.stats.def > 999999) {
            issues.push('DEF too high');
            playerData.stats.def = 999999;
        }
        if (playerData.stats.atkSpd > 10) {
            issues.push('ATK.SPD too high');
            playerData.stats.atkSpd = 10;
        }
        if (playerData.stats.hp > playerData.stats.hpMax) {
            playerData.stats.hp = playerData.stats.hpMax;
        }
        if (playerData.stats.hpMax > 99999999) {
            issues.push('HP Max too high');
            playerData.stats.hpMax = 99999999;
        }
        if (playerData.stats.vamp > 100) {
            issues.push('Vamp too high');
            playerData.stats.vamp = 100;
        }
        if (playerData.stats.critRate > 100) {
            issues.push('Crit Rate too high');
            playerData.stats.critRate = 100;
        }
        if (playerData.stats.critDmg > 1000) {
            issues.push('Crit Damage too high');
            playerData.stats.critDmg = 1000;
        }
    }

    // Kiểm tra inventory
    if (playerData.inventory && playerData.inventory.equipment) {
        if (playerData.inventory.equipment.length > 1000) {
            issues.push('Too many items in inventory');
            playerData.inventory.equipment = playerData.inventory.equipment.slice(0, 1000);
        }
    }

    // Log issues nếu có
    if (issues.length > 0) {
        console.warn('⚠️ Data validation issues found and fixed:', issues);
        
        // Nếu có quá nhiều issues, có thể là cheat
        if (issues.length > 5) {
            console.error('❌ Too many validation issues - possible cheating detected');
            return null; // Trả về null để từ chối lưu
        }
    }

    return playerData;
};

/**
 * Generate checksum để verify data integrity
 */
const generateChecksum = (data) => {
    const str = JSON.stringify({
        gold: data.gold,
        lvl: data.lvl,
        stats: data.stats ? {
            atk: data.stats.atk,
            def: data.stats.def,
            hp: data.stats.hp,
            hpMax: data.stats.hpMax
        } : null
    });
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
};

/**
 * Verify checksum
 */
const verifyChecksum = (data, checksum) => {
    const calculated = generateChecksum(data);
    return calculated === checksum;
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
 * Create new player in Firestore with validation
 */
const createPlayerData = async (...args) => {
  // Normalize args
  let playerName = null;
  let playerData = null;

  if (args.length === 1) {
    playerName = args[0];
  } else if (args.length >= 2) {
    // main.js passes (userId, playerName, defaultPlayer)
    playerName = args[1];
    playerData = args[2] || null;
  } else {
    throw new Error("createPlayerData: invalid arguments");
  }

  try {
    if (typeof window.functions === 'undefined') {
      throw new Error('Firebase Functions not initialized. Make sure firebase-functions-compat is loaded and you set const functions = firebase.app().functions("<region>");');
    }

    // Use httpsCallable to call server createPlayer (onCall)
    const createFn = window.functions.httpsCallable("createPlayer");

    // server only needs name; do not send authoritative player fields you don't trust
    const payload = { name: playerName };
    // optionally include playerData if server expects it:
    if (playerData) payload.playerData = playerData;

    const res = await createFn(payload);

    // res.data expected { status: "ok", player }
    if (res && res.data && res.data.player) {
      console.log("Player created server-side:", res.data.player);
      return res.data.player;
    } else {
      console.warn("createPlayerData: unexpected response", res);
      return res.data || null;
    }
  } catch (err) {
    console.error("Lỗi tạo người chơi server-side:", err);
    // Surface Firebase HttpsError code if exists
    if (err && err.code) {
      // e.g. 'already-exists', 'unauthenticated'
      console.warn("Function error code:", err.code);
    }
    throw err;
  }
};

/**
 * Get player data from Firestore
 */
const getPlayerData = (userId) => {
    return db.collection("players").doc(userId).get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                
                // Verify checksum nếu có
                if (data.checksum) {
                    const isValid = verifyChecksum(data, data.checksum);
                    if (!isValid) {
                        console.warn("⚠️ Checksum mismatch - data may be corrupted");
                    }
                }
                
                console.log("✅ Lấy dữ liệu người chơi thành công");
                return data;
            } else {
                console.log("Không tìm thấy dữ liệu người chơi");
                return null;
            }
        })
        .catch((error) => {
            console.error("❌ Lỗi lấy dữ liệu:", error);
            throw error;
        });
};

/**
 * Update player data in Firestore with validation
 */
const updatePlayerData = async (userId, playerData) => {
  // Validate trước khi gửi
  const validatedData = validateBeforeSave(playerData);

  if (!validatedData) {
    console.error("Invalid player data - cannot update");
    return Promise.reject(new Error("Invalid player data"));
  }

  try {
    if (typeof window.functions === 'undefined') {
      throw new Error('Firebase Functions not initialized. Make sure functions variable is set.');
    }

    const updateFn = window.functions.httpsCallable("serverUpdatePlayer");

    // Build minimal payload server expects (here server expects { player: newData })
    const payload = { player: validatedData };

    const res = await updateFn(payload);
    if (res && res.data && res.data.status === "ok") {
      console.log("✅ serverUpdatePlayer succeeded");
      return res.data;
    } else {
      console.warn("serverUpdatePlayer: unexpected response", res);
      return res.data || null;
    }
  } catch (err) {
    console.error("❌ Lỗi cập nhật dữ liệu (server):", err);
    throw err;
  }
};

/**
 * Delete player data from Firestore
 */
const deletePlayerData = (userId) => {
    return db.collection("players").doc(userId).delete()
        .then(() => {
            console.log("✅ Xóa dữ liệu người chơi thành công");
        })
        .catch((error) => {
            console.error("❌ Lỗi xóa dữ liệu:", error);
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
            console.error("❌ Lỗi lấy xếp hạng:", error);
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
            console.error("❌ Lỗi lưu cài đặt âm thanh:", error);
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
            console.error("❌ Lỗi lấy cài đặt âm thanh:", error);
            return null;
        });
};

// ===== Auto-save Function with Security =====

let autoSaveInterval;

/**
 * Setup auto-save function with validation
 */
const startAutoSave = (userId, getPlayerDataFunc) => {
  autoSaveInterval = setInterval(async () => {
    const currentPlayer = getPlayerDataFunc();
    if (currentPlayer && getCurrentUser()) {
      // Validate
      const validated = validateBeforeSave(currentPlayer);
      if (!validated) {
        console.error('Validation failed, skipping auto-save');
        return;
      }
      try {
        await updatePlayerData(userId, validated);
        console.log('Auto-save OK');
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }
  }, 30000);
};

const stopAutoSave = () => {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
};

console.log("🔥 Firebase initialized with security features");
const functions = firebase.functions();