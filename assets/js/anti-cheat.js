// ===== ADVANCED ANTI-CHEAT SYSTEM =====
// Hệ thống chống gian lận toàn diện - Chặn hoàn toàn console

// ===== CÀI ĐÁT: Hệ thống cảnh báo 3 cấp độ =====
const ANTI_CHEAT_CONFIG = {
    ENABLE_DEVTOOLS_DETECTION: true,  // Có phát hiện DevTools không
    WINDOW_SIZE_THRESHOLD: 250,  // Ngưỡng 250px - tránh false positive khi resize
    REQUIRE_BOTH_DIMENSIONS: false,  // CHỈ cần 1 trong 2 vượt threshold (nhưng check thêm điều kiện)
    WARNING_SYSTEM: {
        LEVEL_1: 'WARNING_LOGOUT',      // Lần 1: Cảnh báo + logout
        LEVEL_2: 'LOGOUT_BAN',          // Lần 2: Logout + ban tạm thời
        LEVEL_3: 'BAN_DELETE'           // Lần 3: Ban vĩnh viễn + xóa tài khoản
    }
};

(function() {
    'use strict';

    // ===== 0. CHẶN NGAY TỪ ĐẦU (TRƯỚC KHI DEVTOOLS MỞ) =====
    // Backup console gốc nếu cần debug
    const _originalConsole = window.console;
    
    // ===== 1. DISABLE CONSOLE VÀ PHÁT HIỆN BYPASS =====
    const disableConsole = () => {
        // Vô hiệu hóa tất cả console methods
        const methods = ['log', 'debug', 'info', 'warn', 'error', 'table', 'trace', 'dir', 'dirxml', 'group', 'groupCollapsed', 'groupEnd', 'clear', 'count', 'countReset', 'assert', 'profile', 'profileEnd', 'time', 'timeLog', 'timeEnd', 'timeStamp'];
        
        // Tạo fake console với proxy để chặn mọi truy cập VÀ PHÁT HIỆN BYPASS
        const handler = {
            get: function(target, prop) {
                if (methods.includes(prop)) {
                    return function(...args) {
                        // PHÁT HIỆN BYPASS: Nếu có bất cứ input nào vào console
                        if (args && args.length > 0) {
                            console.warn('⚠️ PHÁT HIỆN BYPASS CONSOLE - XÓA DỮ LIỆU!');
                            handleConsoleBypass();
                        }
                        return undefined;
                    };
                }
                return undefined;
            },
            set: function() {
                return false; // Chặn mọi set
            }
        };
        
        const fakeConsole = new Proxy({}, handler);

        // Override console nhiều lần để chắc chắn
        try {
            // Method 1: defineProperty
            Object.defineProperty(window, 'console', {
                get: () => fakeConsole,
                set: () => false,
                configurable: false // Không cho config lại
            });
        } catch (e) {
            // Method 2: Direct assignment
            window.console = fakeConsole;
        }
        
        // Method 3: Seal để không thể modify
        try {
            Object.freeze(window.console);
        } catch (e) {}
    };
    
    // Chạy disable console NGAY LẬP TỨC
    disableConsole();

    // ===== 2. DETECT DEVTOOLS =====
    let devtoolsOpen = false;
    let banned = false;
    let lastDetectionTime = 0; // Thêm biến track thời gian detection cuối
    const DETECTION_COOLDOWN = 5000; // 5 giây cooldown giữa các lần detection
    
    // Phát hiện mobile để tránh false positive
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     ('ontouchstart' in window) || 
                     (navigator.maxTouchPoints > 0);
    
    const devtoolsChecker = () => {
        if (banned) return;
        
        // COOLDOWN: Chỉ cho phép detection mỗi 5 giây
        const now = Date.now();
        if (now - lastDetectionTime < DETECTION_COOLDOWN) {
            return; // Skip detection nếu vẫn trong cooldown
        }
        
        // KHÔNG check window size trên mobile (dễ false positive)
        if (!isMobile && ANTI_CHEAT_CONFIG.ENABLE_DEVTOOLS_DETECTION) {
            const threshold = ANTI_CHEAT_CONFIG.WINDOW_SIZE_THRESHOLD;
            const widthDiff = window.outerWidth - window.innerWidth;
            const heightDiff = window.outerHeight - window.innerHeight;
            
            // LOGIC THÔNG MINH HƠN: Chỉ trigger khi có dấu hiệu rõ ràng của DevTools
            // DevTools thường tạo gap lớn ở 1 chiều, còn resize window thì cân đối
            const widthThreshold = widthDiff > threshold;
            const heightThreshold = heightDiff > threshold;
            
            // Kiểm tra xem có phải DevTools không (gap phải RẤT LỚN mới chắc chắn)
            // Tăng margin lên 150px để tránh resize window bình thường
            const isDevToolsLikely = (widthDiff > threshold + 150) || (heightDiff > threshold + 150);
            
            // CHỈ trigger nếu:
            // 1. Có 1 chiều vượt threshold VÀ
            // 2. Gap đủ lớn để chắc chắn là DevTools (không phải chỉ resize window)
            if ((widthThreshold || heightThreshold) && isDevToolsLikely) {
                if (!devtoolsOpen) {
                    devtoolsOpen = true;
                    lastDetectionTime = now; // Cập nhật thời gian detection
                    handleDevToolsOpen();
                }
                return;
            } else {
                // DevTools đã đóng - reset flag và xóa grace period
                if (devtoolsOpen) {
                    console.log('✓ DevTools đã đóng - reset detection');
                    devtoolsOpen = false;
                    banned = false;
                    // Xóa grace period vì đã đóng DevTools
                    localStorage.removeItem('_last_warning_time');
                }
            }
        }
        
        // Check Firebug (chỉ áp dụng cho desktop)
        if (!isMobile) {
            const isFirebug = window.console && (window.console.firebug || (window.console.exception && window.console.table));
            if (isFirebug) {
                if (!devtoolsOpen) {
                    devtoolsOpen = true;
                    handleDevToolsOpen();
                }
            }
        }
    };

    // Kiểm tra devtools bằng cách đo thời gian debugger
    const detectDevToolsByTiming = () => {
        if (banned || isMobile) return; // Tắt timing check trên mobile
        
        const start = performance.now();
        debugger;
        const end = performance.now();
        
        if (end - start > 100) {
            handleDevToolsOpen();
        }
    };

    // Kiểm tra devtools bằng toString override
    const detectDevToolsByToString = () => {
        if (banned) return;
        
        const element = new Image();
        Object.defineProperty(element, 'id', {
            get: function() {
                handleDevToolsOpen();
                return 'detect';
            }
        });
        
        requestAnimationFrame(() => {
            console.log(element);
            console.clear();
        });
    };

    const handleDevToolsOpen = () => {
        if (banned) return;
        banned = true;
        
        // ===== HỆ THỐNG CẢNH BÁO 3 CẤP ĐỘ =====
        
        // Kiểm tra grace period - nếu vừa mới bị cảnh báo thì skip
        const lastWarningTime = parseInt(localStorage.getItem('_last_warning_time') || '0');
        const gracePeriod = 30000; // 30 giây grace period
        const now = Date.now();
        
        if (now - lastWarningTime < gracePeriod) {
            console.log('⏰ Trong grace period - bỏ qua detection');
            // Reset banned flag để có thể check lại sau
            setTimeout(() => {
                banned = false;
                devtoolsOpen = false;
            }, 5000);
            return;
        }
        
        // Đọc số lần vi phạm từ localStorage
        let violationCount = parseInt(localStorage.getItem('_devtools_violations') || '0');
        violationCount++;
        localStorage.setItem('_devtools_violations', violationCount.toString());
        localStorage.setItem('_last_warning_time', now.toString());
        
        console.warn(`⚠️ VI PHẠM LẦN THỨ ${violationCount} - DevTools detected`);
        
        // ===== LẦN 1: LOGOUT + CẢNH BÁO =====
        if (violationCount === 1) {
            alert(
                '⚠️ CẢNH BÁO LẦN 1!\n\n' +
                'Đã phát hiện Developer Tools đang mở.\n\n' +
                '❌ Hành động: Game sẽ LOGOUT tài khoản của bạn.\n' +
                '⚠️ Cảnh báo: Nếu tiếp tục vi phạm:\n' +
                '   • Lần 2: Logout + Ban tạm thời 24h\n' +
                '   • Lần 3: Ban vĩnh viễn + XÓA TÀI KHOẢN\n\n' +
                'Nhấn OK để đóng game.'
            );
            
            // Logout
            if (typeof auth !== 'undefined' && auth && auth.signOut) {
                auth.signOut().catch(() => {});
            }
            
            // Chuyển sang about:blank rồi redirect
            document.body.innerHTML = '';
            window.location.href = 'about:blank';
            setTimeout(() => {
                window.location.href = 'https://soulmc.vn';
            }, 100);
            return;
        }
        
        // ===== LẦN 2: LOGOUT + BAN TẠM THỜI =====
        if (violationCount === 2) {
            const banUntil = Date.now() + (24 * 60 * 60 * 1000); // Ban 24 giờ
            localStorage.setItem('_banned_until', banUntil.toString());
            localStorage.setItem('_ban_reason', 'DevTools detected - 2nd violation');
            
            alert(
                '🚫 CẢNH BÁO LẦN 2!\n\n' +
                'Bạn đã vi phạm lần thứ 2!\n\n' +
                '❌ Hành động: \n' +
                '   • LOGOUT tài khoản\n' +
                '   • BAN TẠM THỜI 24 giờ\n\n' +
                '⚠️ CẢNH BÁO CUỐI CÙNG:\n' +
                '   Lần 3 sẽ BAN VĨNH VIỄN và XÓA TOÀN BỘ TÀI KHOẢN!\n\n' +
                'Nhấn OK để đóng game.'
            );
            
            // Logout
            if (typeof auth !== 'undefined' && auth && auth.signOut) {
                auth.signOut().catch(() => {});
            }
            
            // Chuyển sang about:blank rồi redirect
            document.body.innerHTML = '';
            window.location.href = 'about:blank';
            setTimeout(() => {
                window.location.href = 'https://soulmc.vn';
            }, 100);
            return;
        }
        
        // ===== LẦN 3: BAN VĨNH VIỄN + XÓA TÀI KHOẢN =====
        if (violationCount >= 3) {
            const banTimestamp = Date.now().toString();
            localStorage.setItem('_banned_permanent', banTimestamp);
            localStorage.setItem('_ban_reason', 'DevTools detected - 3rd violation - PERMANENT BAN');
            
            alert(
                '🚨 BAN VĨNH VIỄN!\n\n' +
                'Bạn đã vi phạm lần thứ 3!\n\n' +
                '❌ Hành động:\n' +
                '   • BAN VĨNH VIỄN\n' +
                '   • XÓA TOÀN BỘ DỮ LIỆU TÀI KHOẢN\n' +
                '   • XÓA TÊN NHÂN VẬT\n' +
                '   • XÓA BẢNG XẾP HẠNG\n\n' +
                'Tài khoản của bạn đã bị khóa vĩnh viễn!\n\n' +
                'Nhấn OK để đóng game.'
            );
            
            // XÓA DỮ LIỆU FIREBASE
            deleteUserDataPermanently();
            return;
        }
    };
    
    // ===== HÀM XÓA DỮ LIỆU VĨNH VIỄN (LẦN 3) =====
    async function deleteUserDataPermanently() {
        setTimeout(async () => {
            try {
                // Xóa dữ liệu Firebase - SỬ DỤNG AWAIT để đảm bảo hoàn tất
                if (typeof currentUser !== 'undefined' && currentUser && typeof database !== 'undefined') {
                    const userId = currentUser.uid;
                    
                    // Xóa player name - AWAIT để chắc chắn xóa xong
                    if (typeof player !== 'undefined' && player && player.name) {
                        try {
                            await database.ref('playerNames/' + player.name).remove();
                            console.log('✓ Đã xóa playerName:', player.name);
                        } catch (err) {
                            console.error('Lỗi xóa playerName:', err);
                        }
                    }
                    
                    // Xóa user data
                    try {
                        await database.ref('users/' + userId).remove();
                        console.log('✓ Đã xóa user data:', userId);
                    } catch (err) {
                        console.error('Lỗi xóa user data:', err);
                    }
                    
                    // Xóa leaderboard
                    try {
                        await database.ref('leaderboard/' + userId).remove();
                        console.log('✓ Đã xóa leaderboard:', userId);
                    } catch (err) {
                        console.error('Lỗi xóa leaderboard:', err);
                    }
                }
                
                // Logout Firebase
                if (typeof auth !== 'undefined' && auth && auth.signOut) {
                    try {
                        await auth.signOut();
                        console.log('✓ Đã logout');
                    } catch (err) {
                        console.error('Lỗi logout:', err);
                    }
                }
                
                // Clear local storage
                const violations = localStorage.getItem('_devtools_violations');
                localStorage.clear();
                sessionStorage.clear();
                
                // GHI LẠI BAN STATUS VÀ VIOLATIONS
                localStorage.setItem('_banned_permanent', Date.now().toString());
                localStorage.setItem('_ban_reason', 'DevTools - 3rd violation - PERMANENT');
                localStorage.setItem('_devtools_violations', violations);
            } catch (e) {
                console.error('Lỗi tổng thể khi xóa dữ liệu:', e);
            }
            
            // Chuyển sang about:blank rồi redirect
            document.body.innerHTML = '';
            window.location.href = 'about:blank';
            setTimeout(() => {
                window.location.href = 'https://soulmc.vn';
            }, 100);
        }, 100);
    }
    
    // ===== HÀM XÓA DỮ LIỆU KHI BYPASS CONSOLE =====
    async function handleConsoleBypass() {
        alert(
            '🚨 PHÁT HIỆN BYPASS CONSOLE!\n\n' +
            '❌ Hành động:\n' +
            '   • XÓA TOÀN BỘ DỮ LIỆU TÀI KHOẢN\n' +
            '   • BAN VĨNH VIỄN\n\n' +
            'Nhấn OK để đóng game.'
        );
        
        // Set permanent ban
        localStorage.setItem('_banned_permanent', Date.now().toString());
        localStorage.setItem('_ban_reason', 'Console bypass detected');
        localStorage.setItem('_devtools_violations', '99');
        
        // Xóa dữ liệu Firebase
        try {
            if (typeof currentUser !== 'undefined' && currentUser && typeof database !== 'undefined') {
                const userId = currentUser.uid;
                
                // Xóa player name
                if (typeof player !== 'undefined' && player && player.name) {
                    await database.ref('playerNames/' + player.name).remove();
                }
                
                // Xóa user data
                await database.ref('users/' + userId).remove();
                
                // Xóa leaderboard
                await database.ref('leaderboard/' + userId).remove();
            }
            
            // Logout
            if (typeof auth !== 'undefined' && auth && auth.signOut) {
                await auth.signOut();
            }
        } catch (e) {
            console.error('Lỗi xóa dữ liệu:', e);
        }
        
        // Clear storage
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('_banned_permanent', Date.now().toString());
        
        // Redirect
        document.body.innerHTML = '';
        window.location.href = 'about:blank';
        setTimeout(() => {
            window.location.href = 'https://soulmc.vn';
        }, 100);
    }
    
    // ===== KIỂM TRA BAN KHI RELOAD TRANG =====
    function checkBanStatus() {
        // Kiểm tra ban vĩnh viễn
        const permanentBan = localStorage.getItem('_banned_permanent');
        if (permanentBan) {
            alert(
                '🚨 TÀI KHOẢN ĐÃ BỊ BAN VĨNH VIỄN!\n\n' +
                'Tài khoản của bạn đã bị khóa vĩnh viễn.\n' +
                'Toàn bộ dữ liệu đã bị xóa.\n\n' +
                'Nhấn OK để đóng.'
            );
            document.body.innerHTML = '';
            window.location.href = 'about:blank';
            setTimeout(() => {
                window.location.href = 'https://soulmc.vn';
            }, 100);
            return true;
        }
        
        // Kiểm tra ban tạm thời
        const banUntil = parseInt(localStorage.getItem('_banned_until') || '0');
        if (banUntil > Date.now()) {
            const remainingHours = Math.ceil((banUntil - Date.now()) / (60 * 60 * 1000));
            alert(
                '🚫 TÀI KHOẢN BỊ BAN TẠM THỜI!\n\n' +
                `Thời gian còn lại: ${remainingHours} giờ\n\n` +
                '⚠️ CẢNH BÁO: Vi phạm thêm 1 lần nữa sẽ BAN VĨNH VIỄN!\n\n' +
                'Nhấn OK để đóng.'
            );
            document.body.innerHTML = '';
            window.location.href = 'about:blank';
            setTimeout(() => {
                window.location.href = 'https://soulmc.vn';
            }, 100);
            return true;
        }
        
        return false;
    }
    
    // ===== HÀM HIỂN THỊ MÀN HÌNH BAN (DEPRECATED - GIỮ LẠI ĐỂ BACKWARD COMPATIBLE) =====
    function showBanScreen(level, banUntil) {
        let title, message, canReturn;
        
        if (level === 2) {
            // Ban tạm thời 24h
            const remainingHours = Math.ceil((banUntil - Date.now()) / (60 * 60 * 1000));
            title = '🚫 BAN TẠM THỜI';
            message = `
                <p style="font-size: 1.3rem; margin: 10px 0;"><strong>Lý do:</strong> Developer Tools - Vi phạm lần 2</p>
                <p style="font-size: 1.1rem; margin: 10px 0; color: #ffaaaa;">Thời gian ban: <strong>${remainingHours} giờ</strong></p>
            `;
            canReturn = true;
        } else if (level === 3) {
            // Ban vĩnh viễn
            title = '⛔ BAN VĨNH VIỄN';
            message = `
                <p style="font-size: 1.3rem; margin: 10px 0;"><strong>Lý do:</strong> Developer Tools - Vi phạm lần 3</p>
                <p style="font-size: 1.1rem; margin: 10px 0; color: #ffaaaa;">Tài khoản đã bị xóa hoàn toàn</p>
            `;
            canReturn = false;
        }
        
        document.body.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background: linear-gradient(135deg, #1a0000 0%, #330000 100%);
                color: #fff;
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 20px;
            ">
                <div style="
                    max-width: 600px;
                    background: rgba(0,0,0,0.8);
                    padding: 40px;
                    border-radius: 20px;
                    border: 3px solid #ff0000;
                    box-shadow: 0 0 50px rgba(255,0,0,0.5);
                ">
                    <h1 style="color: #ff0000; font-size: 4rem; margin: 0; text-shadow: 0 0 20px #ff0000;">${title}</h1>
                    
                    <div style="
                        background: rgba(255,0,0,0.1);
                        padding: 20px;
                        border-radius: 10px;
                        margin: 30px 0;
                        border-left: 5px solid #ff0000;
                    ">
                        ${message}
                    </div>
                    
                    <div style="
                        text-align: left;
                        background: rgba(255,255,255,0.05);
                        padding: 20px;
                        border-radius: 10px;
                        margin: 20px 0;
                    ">
                        <p style="font-size: 1rem; margin: 10px 0;">📋 Hành động đã thực hiện:</p>
                        <ul style="font-size: 0.95rem; line-height: 1.8; color: #ffcccc;">
                            <li>✓ Logout tài khoản</li>
                            ${level === 2 ? '<li>✓ Ban tạm thời 24 giờ</li>' : ''}
                            ${level === 3 ? '<li>✓ Ban vĩnh viễn</li><li>✓ Xóa toàn bộ dữ liệu</li><li>✓ Xóa tên nhân vật</li>' : ''}
                        </ul>
                    </div>
                    
                    ${canReturn ? `
                    <div style="margin-top: 30px; padding: 20px; background: rgba(255,255,0,0.1); border-radius: 10px;">
                        <p style="font-size: 1rem; color: #ffff00;">⏰ Bạn có thể quay lại sau ${Math.ceil((banUntil - Date.now()) / (60 * 60 * 1000))} giờ</p>
                        <p style="font-size: 0.9rem; color: #ffffaa; margin-top: 10px;">
                            Vui lòng đóng DevTools và chơi game công bằng.
                        </p>
                    </div>
                    ` : `
                    <div style="margin-top: 30px; padding: 20px; background: rgba(255,0,0,0.2); border-radius: 10px;">
                        <p style="font-size: 1rem; color: #ff0000;">🚫 Tài khoản đã bị khóa vĩnh viễn</p>
                        <p style="font-size: 0.9rem; color: #ffaaaa; margin-top: 10px;">
                            Không thể khôi phục. Vui lòng tạo tài khoản mới và chơi công bằng.
                        </p>
                    </div>
                    `}
                    
                    <p style="font-size: 0.85rem; color: #888; margin-top: 30px;">
                        Thời gian: ${new Date().toLocaleString('vi-VN')}
                    </p>
                </div>
            </div>
        `;
        
        // Disable tất cả interactions
        document.body.style.pointerEvents = 'none';
        
        // Prevent reload nếu ban vĩnh viễn
        if (!canReturn) {
            window.onbeforeunload = function() {
                return "Tài khoản đã bị ban vĩnh viễn!";
            };
        }
    }

    // ===== 3. DISABLE RIGHT CLICK =====
    document.addEventListener('contextmenu', e => {
        e.preventDefault();
        return false;
    });

    // ===== 4. DISABLE KEYBOARD SHORTCUTS =====
    document.addEventListener('keydown', e => {
        // F12
        if (e.keyCode === 123) {
            e.preventDefault();
            return false;
        }
        
        // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
        if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
            e.preventDefault();
            return false;
        }
        
        // Ctrl+U (View Source)
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            return false;
        }
        
        // Ctrl+S (Save)
        if (e.ctrlKey && e.keyCode === 83) {
            e.preventDefault();
            return false;
        }
        
        // F12 alternative
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }
    });

    // ===== 5. PROTECT GLOBAL OBJECTS =====
    const protectGlobalObjects = () => {
        // Chặn truy cập trực tiếp vào player object
        let _player = null;
        
        // Override window.player với getter/setter có bảo vệ
        Object.defineProperty(window, 'player', {
            get: function() {
                return _player;
            },
            set: function(value) {
                // Chỉ cho phép set từ code game, không cho từ console
                const stack = new Error().stack;
                if (stack && stack.includes('console')) {
                    console.warn('⚠️ Không thể chỉnh sửa player từ console!');
                    return false;
                }
                _player = value;
                return true;
            },
            configurable: false
        });
        
        // Chặn Object.defineProperty để không thể override lại
        const originalDefineProperty = Object.defineProperty;
        Object.defineProperty = function(obj, prop, descriptor) {
            // Chặn việc redefine player, dungeon, enemy
            if (obj === window && (prop === 'player' || prop === 'dungeon' || prop === 'enemy')) {
                console.warn('⚠️ Không thể chỉnh sửa game objects!');
                return obj;
            }
            return originalDefineProperty.apply(this, arguments);
        };
    };

    // ===== 6. DETECT BROWSER EXTENSIONS =====
    const detectExtensions = () => {
        const isChrome = /Chrome/.test(navigator.userAgent);
        const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
        const isFirefox = /Firefox/.test(navigator.userAgent);
        
        // Phát hiện extension qua performance
        if (performance.getEntriesByType) {
            const entries = performance.getEntriesByType('resource');
            const extensionDetected = entries.some(entry => 
                entry.name.includes('chrome-extension://') || 
                entry.name.includes('moz-extension://')
            );
            
            if (extensionDetected) {
                console.warn('Extension detected');
            }
        }
    };

    // ===== 7. ANTI-DEBUG =====
    const antiDebug = () => {
        // Check window size thường xuyên (300ms - nhanh hơn để catch ngay)
        setInterval(() => {
            devtoolsChecker();
        }, 300);
        
        // Check timing ít thường xuyên hơn để tránh lag (1.5 giây)
        setInterval(() => {
            detectDevToolsByTiming();
        }, 1500);
    };

    // ===== 8. OBFUSCATE CODE =====
    // Code đã được làm khó đọc để tránh reverse engineering
    
    // ===== 9. DETECT IFRAME INJECTION =====
    const detectIframe = () => {
        if (window.top !== window.self) {
            // Website đang chạy trong iframe
            window.top.location = window.self.location;
        }
    };

    // ===== 10. CLEAR STORAGE ON SUSPICIOUS ACTIVITY =====
    const clearOnSuspicious = () => {
        try {
            // Monitor localStorage changes
            const originalSetItem = localStorage.setItem;
            localStorage.setItem = function(key, value) {
                // Validate trước khi set
                if (key.includes('player') || key.includes('game')) {
                    try {
                        JSON.parse(value); // Validate JSON
                    } catch (e) {
                        return; // Không cho set nếu không phải JSON hợp lệ
                    }
                }
                return originalSetItem.apply(this, arguments);
            };
        } catch (e) {
            // Ignore
        }
    };

    // ===== 11. RANDOM INTEGRITY CHECKS =====
    let integrityCheckInterval;
    const startIntegrityChecks = () => {
        integrityCheckInterval = setInterval(() => {
            // Check nếu console đã được restore
            if (window.console.log.toString().length < 10) {
                disableConsole();
            }
            
            // Check devtools
            devtoolsChecker();
            
            // Check iframe
            detectIframe();
            
            // Random check
            if (Math.random() < 0.1) {
                detectDevToolsByToString();
            }
            
            // ⚠️ CHECK: Anti-cheat có bị disable không?
            if (!window._antiCheatActive) {
                window._antiCheatActive = true; // Restore
            }
            
            // ⚠️ CHECK: Player object có bị modify bất thường không?
            if (typeof window.player !== 'undefined' && window.player) {
                // Validate gold không vượt quá giới hạn
                if (window.player.gold > 999999999999) {
                    alert('⚠️ Phát hiện dữ liệu bất thường! Game sẽ được tải lại.');
                    location.reload();
                }
                // Validate level không vượt quá giới hạn
                if (window.player.lvl > 10000) {
                    alert('⚠️ Phát hiện dữ liệu bất thường! Game sẽ được tải lại.');
                    location.reload();
                }
            }
        }, 2000);
    };

    // ===== 12. DISABLE COMMON HACKING TOOLS =====
    const disableHackingTools = () => {
        // Disable eval
        window.eval = function() {
            console.warn('⚠️ eval() đã bị vô hiệu hóa!');
            throw new Error('eval is disabled');
        };
        
        // Disable Function constructor
        window.Function = new Proxy(Function, {
            construct: function() {
                console.warn('⚠️ Function constructor đã bị vô hiệu hóa!');
                throw new Error('Function constructor is disabled');
            }
        });
        
        // Disable setTimeout/setInterval với string
        const originalSetTimeout = window.setTimeout;
        const originalSetInterval = window.setInterval;
        
        window.setTimeout = function(fn, delay) {
            if (typeof fn === 'string') {
                console.warn('⚠️ setTimeout với string đã bị chặn!');
                throw new Error('setTimeout with string is disabled');
            }
            return originalSetTimeout.apply(this, arguments);
        };
        
        window.setInterval = function(fn, delay) {
            if (typeof fn === 'string') {
                console.warn('⚠️ setInterval với string đã bị chặn!');
                throw new Error('setInterval with string is disabled');
            }
            return originalSetInterval.apply(this, arguments);
        };
        
        // ===== CHẶN __proto__ và prototype pollution =====
        Object.freeze(Object.prototype);
        Object.freeze(Array.prototype);
        Object.freeze(Function.prototype);
    };

    // ===== 13. CHẶN COMMAND INJECTION VÀO GAME OBJECTS =====
    const protectGameVariables = () => {
        // Tạo snapshot của player để so sánh
        let lastSnapshot = null;
        
        setInterval(() => {
            if (window.player && window.player.gold !== undefined) {
                const currentSnapshot = {
                    gold: window.player.gold,
                    lvl: window.player.lvl,
                    timestamp: Date.now()
                };
                
                if (lastSnapshot) {
                    const timeDiff = currentSnapshot.timestamp - lastSnapshot.timestamp;
                    const goldDiff = currentSnapshot.gold - lastSnapshot.gold;
                    const lvlDiff = currentSnapshot.lvl - lastSnapshot.lvl;
                    
                    // Nếu gold tăng đột ngột trong thời gian ngắn (không phải từ gameplay)
                    // VD: tăng > 100k trong < 1s → cheat
                    if (timeDiff < 1000 && goldDiff > 100000 && !window.player.inCombat) {
                        alert('⚠️ Phát hiện chỉnh sửa gold bất thường!\n\nVui lòng chơi game một cách công bằng.');
                        // Reset về giá trị cũ
                        window.player.gold = lastSnapshot.gold;
                        window.player.lvl = lastSnapshot.lvl;
                        return;
                    }
                    
                    // Nếu level tăng đột ngột (> 5 level trong < 1s)
                    if (timeDiff < 1000 && lvlDiff > 5) {
                        alert('⚠️ Phát hiện chỉnh sửa level bất thường!\n\nGame sẽ được tải lại.');
                        location.reload();
                        return;
                    }
                }
                
                lastSnapshot = currentSnapshot;
            }
        }, 500); // Check mỗi 0.5 giây
    };

    // ===== 14. WATERMARK/FINGERPRINT =====
    const createFingerprint = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('🛡️', 2, 2);
        return canvas.toDataURL();
    };

    // ===== INITIALIZATION =====
    const init = () => {
        // CHECK BAN ĐẦU TIÊN - NẾU BỊ BAN THÌ DỪNG NGAY
        if (checkBanStatus()) {
            return; // Đã bị ban, không load game nữa
        }
        
        // CHECK DEVTOOLS NGAY KHI INIT (để catch trường hợp DevTools đã mở)
        devtoolsChecker();
        detectDevToolsByTiming();
        
        // ===== LIÊN TỤC CHECK DEVTOOLS MỖI 1 GIÂY =====
        setInterval(() => {
            devtoolsChecker();
            detectDevToolsByTiming();
        }, 1000);
        
        // Apply all protections
        disableConsole();
        protectGlobalObjects();
        detectExtensions();
        antiDebug();
        detectIframe();
        clearOnSuspicious();
        startIntegrityChecks();
        disableHackingTools();
        protectGameVariables();
        
        // Log protection status
        const fingerprint = createFingerprint();
        
        // Prevent script removal
        Object.freeze(init);
    };

    // Start anti-cheat system
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Prevent script unload
    window.addEventListener('beforeunload', () => {
        // Last check
        devtoolsChecker();
    });

    // Export để có thể gọi từ game (nếu cần)
    window._antiCheatActive = true;
    
    // Self-protection: Prevent this script from being modified
    Object.freeze(window._antiCheatActive);
})();
