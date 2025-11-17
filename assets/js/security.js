// ===== SECURITY PROTECTION =====
// Thêm file này vào index.html trước các file script khác

(function() {
    'use strict';

    // 1. Vô hiệu hóa console trong production
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        // Ghi đè các hàm console
        const noop = function() {};
        const methods = ['log', 'debug', 'info', 'warn', 'error', 'table', 'trace', 'dir', 'dirxml', 'group', 'groupCollapsed', 'groupEnd', 'clear', 'count', 'assert', 'profile', 'profileEnd'];
        
        methods.forEach(method => {
            window.console[method] = noop;
        });
    }

    // 2. Phát hiện DevTools mở
    let devtoolsOpen = false;
    const detectDevTools = () => {
        const threshold = 160;
        if (window.outerWidth - window.innerWidth > threshold || 
            window.outerHeight - window.innerHeight > threshold) {
            if (!devtoolsOpen) {
                devtoolsOpen = true;
                handleDevToolsOpen();
            }
        } else {
            devtoolsOpen = false;
        }
    };

    const handleDevToolsOpen = () => {
        // Cảnh báo người chơi
        alert('⚠️ Phát hiện công cụ phát triển! Vui lòng đóng để tiếp tục chơi.');
        
        // Tự động lưu và đăng xuất
        if (typeof saveData === 'function') {
            saveData();
        }
        
        // Reload trang sau 3 giây
        setTimeout(() => {
            window.location.reload();
        }, 3000);
    };

    // Kiểm tra mỗi giây
    setInterval(detectDevTools, 1000);

    // 3. Bảo vệ các biến quan trọng
    const protectedVars = ['player', 'dungeon', 'enemy'];
    const originalValues = {};

    // Lưu giá trị ban đầu
    protectedVars.forEach(varName => {
        if (window[varName]) {
            originalValues[varName] = JSON.stringify(window[varName]);
        }
    });

    // Kiểm tra thay đổi bất thường mỗi 5 giây
    setInterval(() => {
        if (!window.player) return;

        // Kiểm tra vàng
        if (window.player.gold > 999999999) {
            console.warn('⚠️ Phát hiện giá trị bất thường!');
            if (typeof logoutPlayer === 'function') {
                alert('Phát hiện hành vi gian lận! Tài khoản sẽ bị đăng xuất.');
                logoutPlayer();
            }
        }

        // Kiểm tra level
        if (window.player.lvl > 9999) {
            console.warn('⚠️ Phát hiện level bất thường!');
            if (typeof logoutPlayer === 'function') {
                alert('Phát hiện hành vi gian lận! Tài khoản sẽ bị đăng xuất.');
                logoutPlayer();
            }
        }

        // Kiểm tra HP
        if (window.player.stats && window.player.stats.hpMax > 999999999) {
            console.warn('⚠️ Phát hiện HP bất thường!');
            if (typeof logoutPlayer === 'function') {
                alert('Phát hiện hành vi gian lận! Tài khoản sẽ bị đăng xuất.');
                logoutPlayer();
            }
        }
    }, 5000);

    // 4. Vô hiệu hóa right-click và shortcuts
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });

    // Chặn F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    document.addEventListener('keydown', (e) => {
        // F12
        if (e.keyCode === 123) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+I
        if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+J
        if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
            e.preventDefault();
            return false;
        }
        // Ctrl+U
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+C
        if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
            e.preventDefault();
            return false;
        }
    });

    // 5. Phát hiện debugger
    setInterval(() => {
        const before = Date.now();
        debugger; // eslint-disable-line no-debugger
        const after = Date.now();
        
        if (after - before > 100) {
            handleDevToolsOpen();
        }
    }, 1000);

    // 6. Bảo vệ Object.freeze
    const freezeObject = (obj) => {
        if (obj && typeof obj === 'object') {
            Object.freeze(obj);
            Object.keys(obj).forEach(key => {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    freezeObject(obj[key]);
                }
            });
        }
    };

    // 7. Kiểm tra tính toàn vẹn của dữ liệu
    window.validatePlayerData = function() {
        if (!window.player) return true;

        const issues = [];

        // Kiểm tra vàng hợp lý (max 1 tỷ)
        if (window.player.gold > 1000000000) {
            issues.push('Số vàng bất thường');
        }

        // Kiểm tra level hợp lý (max 1000)
        if (window.player.lvl > 1000) {
            issues.push('Level bất thường');
        }

        // Kiểm tra stats hợp lý
        if (window.player.stats) {
            if (window.player.stats.atk > 999999) {
                issues.push('ATK bất thường');
            }
            if (window.player.stats.def > 999999) {
                issues.push('DEF bất thường');
            }
            if (window.player.stats.atkSpd > 10) {
                issues.push('ATK.SPD bất thường');
            }
        }

        if (issues.length > 0) {
            console.error('❌ Phát hiện dữ liệu bất thường:', issues);
            alert('Phát hiện dữ liệu bất thường! Vui lòng không cheat.');
            
            if (typeof logoutPlayer === 'function') {
                logoutPlayer();
            }
            return false;
        }

        return true;
    };

    // Kiểm tra mỗi 10 giây
    setInterval(() => {
        window.validatePlayerData();
    }, 10000);

    // 8. Ghi đè các hàm nguy hiểm
    const originalEval = window.eval;
    window.eval = function() {
        console.warn('⚠️ eval() bị chặn!');
        return null;
    };

    const originalFunction = window.Function;
    window.Function = function() {
        console.warn('⚠️ Function() constructor bị chặn!');
        return function() {};
    };

    // 9. Bảo vệ Firebase functions
    const protectFunction = (obj, funcName) => {
        if (obj && typeof obj[funcName] === 'function') {
            const original = obj[funcName];
            obj[funcName] = function() {
                // Kiểm tra xem có đang trong combat không
                if (window.player && window.player.inCombat) {
                    // Chỉ cho phép một số hàm nhất định
                    const allowedDuringCombat = ['saveData', 'playerLoadStats', 'updatePlayerData'];
                    if (!allowedDuringCombat.includes(funcName)) {
                        console.warn(`⚠️ Không thể gọi ${funcName} trong combat!`);
                        return;
                    }
                }
                return original.apply(this, arguments);
            };
        }
    };

    // 10. Monitoring console commands
    const commandHistory = [];
    const maxCommands = 10;

    const logCommand = (cmd) => {
        commandHistory.push({
            cmd: cmd,
            time: Date.now()
        });

        if (commandHistory.length > maxCommands) {
            commandHistory.shift();
        }

        // Phát hiện các lệnh đáng ngờ
        const suspiciousPatterns = [
            /player\.gold/i,
            /player\.lvl/i,
            /player\.stats/i,
            /\.gold\s*=|\.gold\s*\+=|\.gold\s*\*=/i,
            /\.hp\s*=/i,
            /\.atk\s*=/i,
        ];

        const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(cmd));
        
        if (isSuspicious) {
            console.warn('⚠️ Phát hiện lệnh đáng ngờ:', cmd);
            // Có thể gửi log về server hoặc đăng xuất user
            setTimeout(() => {
                if (typeof logoutPlayer === 'function') {
                    alert('Phát hiện hành vi gian lận! Bạn sẽ bị đăng xuất.');
                    logoutPlayer();
                }
            }, 1000);
        }
    };

    // Hook vào console để monitor
    const originalLog = console.log;
    console.log = function() {
        logCommand(Array.from(arguments).join(' '));
        return originalLog.apply(console, arguments);
    };

    console.info('🔒 Hệ thống bảo mật đã được kích hoạt!');
})();