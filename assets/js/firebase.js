// ===== Firebase Configuration =====
// Bạn cần thay thế các giá trị này bằng cấu hình Firebase của bạn
const firebaseConfig = {
    apiKey: "AIzaSyAcw_6krS2s3-14T98SZSEhGQcNDdLME1w",
    authDomain: "data-dc-soulmc.firebaseapp.com",
    databaseURL: "https://data-dc-soulmc-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "data-dc-soulmc",
    storageBucket: "data-dc-soulmc.firebasestorage.app",
    messagingSenderId: "539439303064",
    appId: "1:539439303064:web:b2038f2bfe81d95a6603ed",
    measurementId: "G-FKGXSSW90C"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

let currentUser = null;
let isNewUser = false;

// ===== Authentication Functions =====

// Đăng ký tài khoản mới
async function registerUser(email, password, confirmPassword) {
    if (password !== confirmPassword) {
        showAlert("Mật khẩu không khớp!");
        return false;
    }

    if (password.length < 6) {
        showAlert("Mật khẩu phải có ít nhất 6 ký tự!");
        return false;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        isNewUser = true;
        return true;
    } catch (error) {
        console.error("Register error:", error); // Log đầy đủ cho dev
        handleAuthError(error); // Hiển thị message ngắn cho user
        return false;
    }
}

// Đăng nhập
async function loginUser(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        await loadPlayerData();
        return true;
    } catch (error) {
        console.error("Login error:", error); // Log đầy đủ cho dev
        handleAuthError(error); // Hiển thị message ngắn cho user
        return false;
    }
}

// Đăng xuất
async function logoutUser() {
    try {
        await savePlayerData();
        await auth.signOut();
        currentUser = null;
        player = null;
        dungeon = null;
        enemy = null;
        showLoginScreen();
        return true;
    } catch (error) {
        console.error("Lỗi đăng xuất:", error);
        return false;
    }
}

// Xử lý lỗi xác thực
function handleAuthError(error) {
    console.log("Auth error:", error); // Debug
    
    // Kiểm tra error code
    const errorCode = error.code || '';
    const errorMessage = error.message || '';
    
    switch (errorCode) {
        case 'auth/email-already-in-use':
            showAlert("Email này đã được sử dụng!");
            break;
        case 'auth/invalid-email':
        case 'auth/invalid-credential':
            showAlert("Email không hợp lệ!");
            break;
        case 'auth/weak-password':
            showAlert("Mật khẩu quá yếu! (Tối thiểu 6 ký tự)");
            break;
        case 'auth/user-not-found':
        case 'auth/invalid-login-credentials':
            showAlert("Tài khoản không tồn tại!");
            break;
        case 'auth/wrong-password':
            showAlert("Mật khẩu không đúng!");
            break;
        case 'auth/too-many-requests':
            showAlert("Bạn đã thử quá nhiều lần. Vui lòng thử lại sau!");
            break;
        case 'auth/network-request-failed':
            showAlert("Lỗi kết nối mạng. Vui lòng kiểm tra internet!");
            break;
        default:
            // Hiển thị thông báo ngắn gọn thay vì JSON dài
            if (errorMessage.includes('INVALID_LOGIN_CREDENTIALS')) {
                showAlert("Email hoặc mật khẩu không đúng!");
            } else if (errorMessage.includes('invalid')) {
                showAlert("Thông tin đăng nhập không hợp lệ!");
            } else {
                showAlert("Đăng nhập thất bại. Vui lòng thử lại!");
            }
    }
}

// ===== Security Functions =====

// Tạo checksum SHA-256 cho dữ liệu quan trọng
async function generateChecksum(data) {
    const msgBuffer = new TextEncoder().encode(JSON.stringify(data));
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Kiểm tra tính toàn vẹn dữ liệu
async function validateDataIntegrity(data, checksum) {
    const calculatedChecksum = await generateChecksum(data);
    return calculatedChecksum === checksum;
}

// Kiểm tra giới hạn hợp lý cho các chỉ số
function validatePlayerStats(playerData) {
    const limits = {
        gold: 999999999999,
        level: 10000,
        hp: 999999999,
        atk: 999999999,
        def: 999999999
    };
    
    if (playerData.gold > limits.gold) return false;
    if (playerData.lvl > limits.level) return false;
    if (playerData.stats && playerData.stats.hpMax > limits.hp) return false;
    if (playerData.stats && playerData.stats.atk > limits.atk) return false;
    if (playerData.stats && playerData.stats.def > limits.def) return false;
    
    return true;
}

// Rate limiting - giới hạn số lần save
let lastSaveTime = 0;
let saveTimeout = null;
const SAVE_COOLDOWN = 1000; // 1 giây giữa các lần save
const SAVE_DEBOUNCE = 3000; // Debounce 3 giây

function canSave(isAutoSave = false) {
    const now = Date.now();
    // Auto-save luôn được phép (đã có interval 30s)
    if (isAutoSave) {
        lastSaveTime = now;
        return true;
    }
    // Manual save phải chờ cooldown
    if (lastSaveTime > 0 && now - lastSaveTime < SAVE_COOLDOWN) {
        return false; // Không log warning nữa
    }
    lastSaveTime = now;
    return true;
}

// Debounced save - gom nhiều lần save thành 1
function debouncedSave() {
    // Clear timeout cũ
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    
    // Đặt timeout mới
    saveTimeout = setTimeout(() => {
        if (currentUser && player) {
            savePlayerData(false);
        }
    }, SAVE_DEBOUNCE);
}

// Bảo vệ object player khỏi chỉnh sửa trực tiếp - PHIÊN BẢN ĐƠN GIẢN NHƯNG HIỆU QUẢ
function protectPlayerObject() {
    if (typeof player !== 'undefined' && player !== null && !player._isProtected) {
        // Lưu giá trị thực
        let _realGold = player.gold || 0;
        let _realLvl = player.lvl || 1;
        let _lastGoldUpdate = Date.now();
        let _lastLvlUpdate = Date.now();
        
        // Override gold với getter/setter có validation
        Object.defineProperty(player, 'gold', {
            get: function() {
                return _realGold;
            },
            set: function(value) {
                const now = Date.now();
                const timeDiff = now - _lastGoldUpdate;
                const goldDiff = value - _realGold;
                
                // Nếu thay đổi quá lớn trong thời gian quá ngắn → Cheat
                if (timeDiff < 100 && Math.abs(goldDiff) > 50000 && goldDiff > 0) {
                    console.error('🚫 CHẶN: Tăng gold bất thường!');
                    alert('⚠️ Phát hiện gian lận!\n\nTăng gold quá nhanh. Vui lòng chơi công bằng.');
                    return; // Không cho set
                }
                
                // Validate giới hạn
                if (value > 999999999999) {
                    console.warn('⚠️ Gold vượt quá giới hạn, đã clamp về 999 tỷ');
                    value = 999999999999;
                }
                if (value < 0) {
                    value = 0;
                }
                
                _realGold = value;
                _lastGoldUpdate = now;
            },
            configurable: false,
            enumerable: true
        });
        
        // Override lvl với getter/setter có validation
        Object.defineProperty(player, 'lvl', {
            get: function() {
                return _realLvl;
            },
            set: function(value) {
                const now = Date.now();
                const timeDiff = now - _lastLvlUpdate;
                const lvlDiff = value - _realLvl;
                
                // Nếu tăng quá nhiều level trong thời gian ngắn → Cheat
                if (timeDiff < 100 && lvlDiff > 5) {
                    console.error('🚫 CHẶN: Tăng level bất thường!');
                    alert('⚠️ Phát hiện gian lận!\n\nTăng level quá nhanh. Game sẽ reload.');
                    setTimeout(() => location.reload(), 1000);
                    return; // Không cho set
                }
                
                // Validate giới hạn
                if (value > 10000) {
                    console.warn('⚠️ Level vượt quá giới hạn, đã clamp về 10000');
                    value = 10000;
                }
                if (value < 1) {
                    value = 1;
                }
                
                _realLvl = value;
                _lastLvlUpdate = now;
            },
            configurable: false,
            enumerable: true
        });
        
        player._isProtected = true;
    }
}

// ===== Database Functions =====

// Lưu dữ liệu người chơi lên Firebase
async function savePlayerData(isAutoSave = false) {
    if (!currentUser) return;
    if (!canSave(isAutoSave)) return; // Rate limiting

    try {
        // Sanitize dữ liệu trước khi validate (đọc từ getter để có giá trị clamped)
        const sanitizedPlayer = JSON.parse(JSON.stringify(player));
        
        // Force clamp các giá trị quan trọng
        sanitizedPlayer.gold = Math.min(player.gold || 0, 999999999999);
        sanitizedPlayer.lvl = Math.min(player.lvl || 1, 10000);
        
        // Validate dữ liệu đã sanitize
        if (!validatePlayerStats(sanitizedPlayer)) {
            console.error("Dữ liệu không hợp lệ! Đã phát hiện giá trị bất thường.");
            showAlert("Lỗi: Dữ liệu không hợp lệ!");
            return;
        }

        const userId = currentUser.uid;
        
        // Lưu sanitizedPlayer thay vì player gốc
        const playerData = JSON.stringify(sanitizedPlayer);
        const dungeonData = JSON.stringify(dungeon);
        const enemyData = JSON.stringify(enemy);
        const volumeData = JSON.stringify(volume);
        
        // Tạo checksum cho dữ liệu đã sanitize
        const criticalData = {
            gold: sanitizedPlayer.gold,
            level: sanitizedPlayer.lvl,
            stats: sanitizedPlayer.stats
        };
        const checksum = await generateChecksum(criticalData);

        await database.ref('users/' + userId).set({
            playerData: playerData,
            dungeonData: dungeonData,
            enemyData: enemyData,
            volumeData: volumeData,
            checksum: checksum,
            lastUpdated: Date.now()
        });

        // Cập nhật leaderboard
        if (player && player.name) {
            await updateLeaderboard();
        }
    } catch (error) {
        console.error("Lỗi lưu dữ liệu:", error);
    }
}

// Tải dữ liệu người chơi từ Firebase
async function loadPlayerData() {
    if (!currentUser) return;

    try {
        const userId = currentUser.uid;
        const snapshot = await database.ref('users/' + userId).once('value');
        const data = snapshot.val();

        if (data && data.playerData) {
            const loadedPlayer = JSON.parse(data.playerData);
            
            // Kiểm tra checksum nếu có
            if (data.checksum) {
                const criticalData = {
                    gold: loadedPlayer.gold,
                    level: loadedPlayer.lvl,
                    stats: loadedPlayer.stats
                };
                const isValid = await validateDataIntegrity(criticalData, data.checksum);
                
                if (!isValid) {
                    // ⚠️ PHÁT HIỆN GIAN LẬN - Reset dữ liệu
                    alert("🚨 Phát hiện dữ liệu đã bị chỉnh sửa!\n\nDữ liệu của bạn đã bị reset về mặc định.\nNếu đây là lỗi, vui lòng liên hệ admin.");
                    
                    // Xóa dữ liệu trên Firebase
                    await database.ref('users/' + userId).remove();
                    
                    // Đăng xuất và reload
                    await auth.signOut();
                    location.reload();
                    return; // Dừng load
                }
            }
            
            // Validate dữ liệu
            if (!validatePlayerStats(loadedPlayer)) {
                console.error("Dữ liệu vượt giới hạn cho phép!");
                showAlert("Dữ liệu không hợp lệ! Đã reset về giá trị an toàn.");
                // Reset về giá trị an toàn
                if (loadedPlayer.gold > 999999999999) loadedPlayer.gold = 999999999999;
                if (loadedPlayer.lvl > 10000) loadedPlayer.lvl = 10000;
            }
            
            player = loadedPlayer;
            if (player) { player.gold = Number(player.gold) || 0; }
            
            // Áp dụng protection sau khi load
            protectPlayerObject();
            
            if (data.dungeonData) {
                dungeon = JSON.parse(data.dungeonData);
            } else {
                // Khởi tạo dungeon mặc định nếu chưa có
                initializeDefaultDungeon();
            }
            
            if (data.enemyData) {
                enemy = JSON.parse(data.enemyData);
            }
            
            if (data.volumeData) {
                volume = JSON.parse(data.volumeData);
            }
            isNewUser = false;
        } else {
            isNewUser = true;
            initializeDefaultDungeon();
        }
    } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
        isNewUser = true;
        initializeDefaultDungeon();
    }
}

// Khởi tạo dungeon mặc định
function initializeDefaultDungeon() {
    if (typeof dungeon === 'undefined' || dungeon === null) {
        window.dungeon = {
            rating: 500,
            grade: "E",
            progress: {
                floor: 1,
                room: 1,
                floorLimit: 100,
                roomLimit: 5,
            },
            settings: {
                enemyBaseLvl: 1,
                enemyLvlGap: 5,
                enemyBaseStats: 1,
                enemyScaling: 1.1,
            },
            status: {
                exploring: false,
                paused: true,
                event: false,
            },
            statistics: {
                kills: 0,
                runtime: 0,
            },
            backlog: [],
            action: 0,
        };
    } else {
        // Reset dungeon về giá trị mặc định
        dungeon.rating = 500;
        dungeon.grade = "E";
        dungeon.progress = {
            floor: 1,
            room: 1,
            floorLimit: 100,
            roomLimit: 5,
        };
        dungeon.settings = {
            enemyBaseLvl: 1,
            enemyLvlGap: 5,
            enemyBaseStats: 1,
            enemyScaling: 1.1,
        };
        dungeon.status = {
            exploring: false,
            paused: true,
            event: false,
        };
        dungeon.statistics = {
            kills: 0,
            runtime: 0,
        };
        dungeon.backlog = [];
        dungeon.action = 0;
    }
}

// Kiểm tra tên người chơi có bị trùng không
async function checkPlayerNameExists(playerName) {
    try {
        const snapshot = await database.ref('playerNames/' + playerName).once('value');
        if (!snapshot.exists()) {
            return false; // Tên chưa tồn tại - có thể sử dụng
        }
        
        const ownerUserId = snapshot.val();
        
        // Tên đã tồn tại - kiểm tra xem có phải của user hiện tại không
        if (currentUser && ownerUserId === currentUser.uid) {
            console.log("Tên này đã thuộc về bạn");
            return false; // Cho phép (trường hợp load lại game)
        }
        
        // Tên thuộc về người khác - KHÔNG cho phép
        console.log("Tên đã được sử dụng bởi user khác:", ownerUserId);
        return true; // Chặn - tên đã có người dùng
    } catch (error) {
        console.error("Lỗi kiểm tra tên:", error);
        // NẾU CÓ LỖI, CHẶN ĐỂ AN TOÀN
        alert("Lỗi kết nối Firebase. Vui lòng thử lại!");
        return true; // Chặn vào game
    }
}

// Đăng ký tên người chơi với transaction để ngăn race condition
async function registerPlayerName(playerName) {
    if (!currentUser) {
        console.error("Chưa đăng nhập!");
        return false;
    }

    try {
        const userId = currentUser.uid;
        const nameRef = database.ref('playerNames/' + playerName);
        
        // Sử dụng transaction để đảm bảo atomic operation
        const result = await nameRef.transaction((currentValue) => {
            // CHỈ cho phép claim nếu tên CHƯA tồn tại
            if (currentValue !== null) {
                // Tên đã có người sử dụng (kể cả chính mình) - KHÔNG cho phép
                console.error("Transaction abort: Tên đã tồn tại với owner:", currentValue);
                return; // abort transaction - QUAN TRỌNG: return undefined để abort
            }
            
            // Tên chưa tồn tại, claim nó
            console.log("Transaction: Claiming tên mới:", playerName);
            return userId;
        });
        
        // Kiểm tra kết quả transaction
        if (result.committed) {
            // Verify lại một lần nữa để chắc chắn
            const snapshot = await nameRef.once('value');
            if (snapshot.val() === userId) {
                console.log("✓ Đăng ký tên thành công và đã verify:", playerName);
                return true;
            } else {
                console.error("✗ Verify thất bại - tên không khớp uid!");
                return false;
            }
        } else {
            console.error("✗ Transaction không committed - tên đã bị sử dụng");
            return false;
        }
        
    } catch (error) {
        console.error("Lỗi đăng ký tên:", error);
        return false;
    }
}

// Xóa tên người chơi cũ (khi đổi tên)
async function removePlayerName(playerName) {
    try {
        await database.ref('playerNames/' + playerName).remove();
        return true;
    } catch (error) {
        console.error("Lỗi xóa tên:", error);
        return false;
    }
}

// Xóa toàn bộ dữ liệu game
async function deleteAllGameData() {
    if (!currentUser) return false;

    try {
        const userId = currentUser.uid;
        
        // Xóa tên người chơi khỏi danh sách (QUAN TRỌNG!)
        if (player && player.name) {
            await database.ref('playerNames/' + player.name).remove();
            console.log("Đã xóa tên:", player.name);
        }

        // Xóa dữ liệu game
        await database.ref('users/' + userId).remove();
        console.log("Đã xóa dữ liệu user:", userId);
        
        // Xóa leaderboard entry
        await database.ref('leaderboard/' + userId).remove();
        console.log("Đã xóa leaderboard entry:", userId);
        
        // Reset local variables
        player = null;
        dungeon = null;
        enemy = null;
        isNewUser = true;
        
        return true;
    } catch (error) {
        console.error("Lỗi xóa dữ liệu:", error);
        return false;
    }
}

// ===== Leaderboard Functions =====

// Cập nhật bảng xếp hạng
async function updateLeaderboard() {
    if (!currentUser || !player || !player.name) return;

    try {
        const userId = currentUser.uid;
        const leaderboardData = {
            name: player.name,
            gold: player.gold || 0,
            level: player.lvl || 1,
            floor: dungeon && dungeon.progress ? dungeon.progress.floor : 1,
            lastUpdated: Date.now()
        };

        await database.ref('leaderboard/' + userId).set(leaderboardData);
    } catch (error) {
        console.error("Lỗi cập nhật bảng xếp hạng:", error);
    }
}

// Lấy top 3 người chơi có vàng cao nhất
async function getTopGoldPlayers(limit = 3) {
    try {
        const snapshot = await database.ref('leaderboard')
            .orderByChild('gold')
            .limitToLast(limit)
            .once('value');
        
        const players = [];
        snapshot.forEach((child) => {
            players.unshift(child.val());
        });
        return players;
    } catch (error) {
        console.error("Lỗi lấy top vàng:", error);
        return [];
    }
}

// Lấy top 3 người chơi có level cao nhất
async function getTopLevelPlayers(limit = 3) {
    try {
        const snapshot = await database.ref('leaderboard')
            .orderByChild('level')
            .limitToLast(limit)
            .once('value');
        
        const players = [];
        snapshot.forEach((child) => {
            players.unshift(child.val());
        });
        return players;
    } catch (error) {
        console.error("Lỗi lấy top level:", error);
        return [];
    }
}

// Lấy top 3 người chơi đi đến tầng cao nhất
async function getTopFloorPlayers(limit = 3) {
    try {
        const snapshot = await database.ref('leaderboard')
            .orderByChild('floor')
            .limitToLast(limit)
            .once('value');
        
        const players = [];
        snapshot.forEach((child) => {
            players.unshift(child.val());
        });
        return players;
    } catch (error) {
        console.error("Lỗi lấy top tầng:", error);
        return [];
    }
}

// ===== UI Functions =====

// Hiển thị màn hình đăng nhập
function showLoginScreen() {
    const loginScreen = document.querySelector('#login-screen');
    const titleScreen = document.querySelector('#title-screen');
    const characterCreation = document.querySelector('#character-creation');
    const dungeonMain = document.querySelector('#dungeon-main');
    
    if (loginScreen) loginScreen.style.display = "flex";
    if (titleScreen) titleScreen.style.display = "none";
    if (characterCreation) characterCreation.style.display = "none";
    if (dungeonMain) dungeonMain.style.display = "none";
}

// Hiển thị thông báo
function showAlert(message) {
    const alertElement = document.querySelector("#auth-alert");
    if (alertElement) {
        // Chỉ hiển thị string, không hiển thị object hoặc JSON
        let displayMessage = message;
        if (typeof message === 'object') {
            displayMessage = "Đã có lỗi xảy ra. Vui lòng thử lại!";
        } else if (typeof message === 'string' && message.includes('{')) {
            // Nếu message có dạng JSON string
            displayMessage = "Đã có lỗi xảy ra. Vui lòng thử lại!";
        }
        
        alertElement.innerHTML = displayMessage;
        setTimeout(() => {
            alertElement.innerHTML = "";
        }, 5000); // Tăng thời gian hiển thị lên 5 giây
    }
}

// ===== Auto-save =====
// Tự động lưu mỗi 30 giây
setInterval(() => {
    if (currentUser && player) {
        savePlayerData(true); // Đánh dấu là auto-save
    }
}, 30000);

// Lưu khi người dùng rời khỏi trang
window.addEventListener('beforeunload', () => {
    if (currentUser && player) {
        savePlayerData(true); // Đánh dấu là auto-save
    }
});

// ===== Auth State Observer =====
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
    } else {
        currentUser = null;
        showLoginScreen();
    }
});
