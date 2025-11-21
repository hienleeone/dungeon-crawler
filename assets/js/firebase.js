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
        
        // Cleanup chat system
        if (typeof window.cleanupChat === 'function') {
            window.cleanupChat();
        }
        
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
        
        // Tạo checksum cho dữ liệu quan trọng - MỞ RỘNG BẢO VỆ
        const criticalData = {
            gold: sanitizedPlayer.gold,
            level: sanitizedPlayer.lvl,
            stats: sanitizedPlayer.stats,
            exp: sanitizedPlayer.exp,
            bonusStats: sanitizedPlayer.bonusStats,
            // THÊM: Bảo vệ inventory và equipped để ngăn cheat
            inventoryCount: sanitizedPlayer.inventory ? {
                consumables: (sanitizedPlayer.inventory.consumables || []).length,
                equipment: (sanitizedPlayer.inventory.equipment || []).length
            } : { consumables: 0, equipment: 0 },
            equippedCount: (sanitizedPlayer.equipped || []).length,
            playtime: sanitizedPlayer.playtime || 0,
            kills: sanitizedPlayer.kills || 0,
            deaths: sanitizedPlayer.deaths || 0
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

        // Cập nhật leaderboard CHỈ KHI AUTO-SAVE (giảm tải)
        // Manual save không update leaderboard để tiết kiệm quota
        if (isAutoSave && player && player.name) {
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
            
            // Kiểm tra checksum - QUAN TRỌNG cho bảo mật
            if (data.checksum) {
                const criticalData = {
                    gold: loadedPlayer.gold,
                    level: loadedPlayer.lvl,
                    stats: loadedPlayer.stats,
                    exp: loadedPlayer.exp,
                    bonusStats: loadedPlayer.bonusStats,
                    inventoryCount: loadedPlayer.inventory ? {
                        consumables: (loadedPlayer.inventory.consumables || []).length,
                        equipment: (loadedPlayer.inventory.equipment || []).length
                    } : { consumables: 0, equipment: 0 },
                    equippedCount: (loadedPlayer.equipped || []).length,
                    playtime: loadedPlayer.playtime || 0,
                    kills: loadedPlayer.kills || 0,
                    deaths: loadedPlayer.deaths || 0
                };
                const isValid = await validateDataIntegrity(criticalData, data.checksum);
                
                if (!isValid) {
                    console.error("🚨 CHECKSUM KHÔNG KHỚP - Dữ liệu có thể bị chỉnh sửa!");
                    alert(
                        "⚠️ PHÁT HIỆN DỮ LIỆU BẤT THƯỜNG!\n\n" +
                        "Dữ liệu của bạn có thể đã bị chỉnh sửa bất hợp pháp.\n\n" +
                        "Để bảo vệ tài khoản của bạn, game sẽ logout.\n" +
                        "Vui lòng liên hệ admin để kiểm tra."
                    );
                    
                    // KHÔNG xóa dữ liệu - chỉ logout để admin kiểm tra
                    await auth.signOut();
                    location.reload();
                    return;
                }
                
                console.log("✓ Checksum hợp lệ - dữ liệu an toàn");
            } else {
                // Người chơi cũ không có checksum - tạo checksum mới cho lần save sau
                console.warn("⚠️ Dữ liệu cũ không có checksum - sẽ tự động tạo khi save");
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
            
            // ⚠️ QUAN TRỌNG: Verify và claim lại tên khi load game
            if (player && player.name) {
                await verifyAndClaimPlayerName(player.name);
            }
            
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

// ===== FUNCTION MỚI: Kiểm tra VÀ đăng ký tên trong 1 transaction atomic =====
async function checkAndRegisterPlayerName(playerName) {
    if (!currentUser) {
        console.error("Chưa đăng nhập!");
        return { success: false, error: "NOT_LOGGED_IN" };
    }

    try {
        const userId = currentUser.uid;
        const nameRef = database.ref('playerNames/' + playerName);
        
        // Sử dụng transaction để đảm bảo atomic operation - ngăn race condition
        const result = await nameRef.transaction((currentValue) => {
            // Nếu tên đã tồn tại
            if (currentValue !== null) {
                // Kiểm tra xem có phải của user hiện tại không
                if (currentValue === userId) {
                    console.log("Tên này đã thuộc về bạn - cho phép load lại");
                    return userId; // Giữ nguyên - người chơi đang load lại game
                }
                // Tên thuộc về người khác - ABORT transaction
                console.error("Transaction abort: Tên đã được sử dụng bởi:", currentValue);
                return; // abort - return undefined
            }
            
            // Tên chưa tồn tại - claim nó
            console.log("Transaction: Claiming tên mới:", playerName);
            return userId;
        });
        
        // Kiểm tra kết quả transaction
        if (!result.committed) {
            console.error("✗ Transaction không committed - tên đã bị sử dụng");
            return { success: false, error: "NAME_TAKEN" };
        }
        
        // Verify lại để chắc chắn
        const snapshot = await nameRef.once('value');
        if (snapshot.val() === userId) {
            console.log("✓ Tên hợp lệ và đã verify:", playerName);
            return { success: true };
        } else {
            console.error("✗ Verify thất bại - tên không khớp uid!");
            return { success: false, error: "VERIFY_FAILED" };
        }
        
    } catch (error) {
        console.error("Lỗi kiểm tra/đăng ký tên:", error);
        return { success: false, error: "NETWORK_ERROR" };
    }
}

// ===== GIỮ LẠI 2 FUNCTION CŨ để backward compatibility =====
async function checkPlayerNameExists(playerName) {
    console.warn("⚠️ checkPlayerNameExists() đã deprecated - sử dụng checkAndRegisterPlayerName()");
    const result = await checkAndRegisterPlayerName(playerName);
    return !result.success && result.error === "NAME_TAKEN";
}

async function registerPlayerName(playerName) {
    console.warn("⚠️ registerPlayerName() đã deprecated - sử dụng checkAndRegisterPlayerName()");
    const result = await checkAndRegisterPlayerName(playerName);
    return result.success;
}

// Verify và claim lại tên khi load game - BẢN CẢI TIẾN AN TOÀN
async function verifyAndClaimPlayerName(playerName) {
    if (!currentUser) {
        console.error("Chưa đăng nhập!");
        return false;
    }

    try {
        const userId = currentUser.uid;
        const nameRef = database.ref('playerNames/' + playerName);
        
        // Đọc giá trị hiện tại
        const snapshot = await nameRef.once('value');
        const currentValue = snapshot.val();
        
        // Nếu tên vẫn thuộc về mình - OK
        if (currentValue === userId) {
            console.log("✓ Tên vẫn thuộc về bạn:", playerName);
            return true;
        }
        
        // Nếu tên đã bị xóa/mất (null) - CHỈ claim lại nếu đây là tên của player
        if (currentValue === null && player && player.name === playerName) {
            console.log("Attempting to reclaim lost name:", playerName);
            // Sử dụng transaction để tránh race condition khi claim lại
            const result = await nameRef.transaction((val) => {
                if (val === null) {
                    return userId;
                }
                return; // abort nếu có người khác vừa claim
            });
            
            if (result.committed && result.snapshot.val() === userId) {
                console.log("✓ Đã claim lại tên thành công");
                return true;
            }
            console.error("✗ Không thể claim lại tên - có người khác đã claim");
        }
        
        // Nếu tên bị người khác chiếm - ĐÂY LÀ VẤN ĐỀ NGHIÊM TRỌNG
        console.error("🚨 CẢNH BÁO NGHIÊM TRỌNG: Tên bị chiếm bởi uid khác:", currentValue);
        console.error("Player name:", playerName, "| Your UID:", userId, "| Owner UID:", currentValue);
        
        // KHÔNG cho load game - hiển thị thông báo rõ ràng cho user
        alert(
            `⚠️ PHÁT HIỆN XUNG ĐỘT TÊN NHÂN VẬT!\n\n` +
            `Tên "${playerName}" hiện đang được sử dụng bởi tài khoản khác.\n\n` +
            `Điều này có thể xảy ra do:\n` +
            `• Lỗi đồng bộ dữ liệu\n` +
            `• Xung đột khi tạo nhân vật\n\n` +
            `Vui lòng liên hệ admin để xử lý.\n` +
            `Game sẽ tự động logout để bảo vệ dữ liệu của bạn.`
        );
        
        // Logout an toàn để user không mất dữ liệu
        await auth.signOut();
        location.reload();
        return false;
        
    } catch (error) {
        console.error("Lỗi verify tên:", error);
        // Nếu có lỗi network - vẫn cho load nhưng log warning
        console.warn("⚠️ Không thể verify tên do lỗi network - cho phép load tạm thời");
        return true; // Cho phép load để không block user do lỗi mạng
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

// Rate limiting cho leaderboard updates
let lastLeaderboardUpdate = 0;
const LEADERBOARD_COOLDOWN = 300000; // 5 phút (giảm số lần update)

// Cập nhật bảng xếp hạng (CHỈ KHI CẦN THIẾT)
async function updateLeaderboard(force = false) {
    if (!currentUser || !player || !player.name) return;

    // Rate limiting - chỉ update mỗi 5 phút (trừ khi force)
    const now = Date.now();
    if (!force && lastLeaderboardUpdate > 0 && now - lastLeaderboardUpdate < LEADERBOARD_COOLDOWN) {
        return; // Skip update để tiết kiệm quota
    }

    try {
        const userId = currentUser.uid;
        const leaderboardData = {
            name: player.name,
            gold: player.gold || 0,
            level: player.lvl || 1,
            floor: dungeon && dungeon.progress ? dungeon.progress.floor : 1,
            lastUpdated: now
        };

        await database.ref('leaderboard/' + userId).set(leaderboardData);
        lastLeaderboardUpdate = now;
        console.log("✓ Đã cập nhật leaderboard");
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
// Tự động lưu mỗi 2 PHÚT (tối ưu quota Firebase)
const AUTO_SAVE_INTERVAL = 120000; // 2 phút = 120,000ms (thay vì 30s)

setInterval(() => {
    if (currentUser && player) {
        savePlayerData(true); // Đánh dấu là auto-save
    }
}, AUTO_SAVE_INTERVAL);

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
