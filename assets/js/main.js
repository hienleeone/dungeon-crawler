window.addEventListener("load", function () {
    // Password visibility toggle functionality
    const setupPasswordToggle = (inputId, iconId) => {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);
        if (input && icon) {
            icon.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        }
    };
    
    // Wait for DOM to be fully ready
    setTimeout(() => {
        setupPasswordToggle('login-password', 'toggle-login-password');
        setupPasswordToggle('register-password', 'toggle-register-password');
        setupPasswordToggle('register-confirm-password', 'toggle-register-confirm-password');
    }, 100);
    
    // Xử lý đăng nhập/đăng ký
    const loginForm = document.querySelector("#login-form");
    const registerForm = document.querySelector("#register-form");
    const showRegisterBtn = document.querySelector("#show-register");
    const showLoginBtn = document.querySelector("#show-login");
    const loginPanel = document.querySelector("#login-panel");
    const registerPanel = document.querySelector("#register-panel");

    // Chuyển đổi giữa đăng nhập và đăng ký
    showRegisterBtn.addEventListener("click", function() {
        loginPanel.style.display = "none";
        registerPanel.style.display = "block";
        document.querySelector("#auth-alert").innerHTML = "";
    });

    showLoginBtn.addEventListener("click", function() {
        registerPanel.style.display = "none";
        loginPanel.style.display = "block";
        document.querySelector("#register-alert").innerHTML = "";
    });

    // Xử lý đăng nhập
    loginForm.addEventListener("submit", async function(e) {
        e.preventDefault();
        const email = document.querySelector("#login-email").value;
        const password = document.querySelector("#login-password").value;

        const success = await loginUser(email, password);
        if (success) {
            document.querySelector("#login-screen").style.display = "none";
            if (isNewUser || player === null) {
                runLoad("character-creation", "flex");
            } else {
                let target = document.querySelector("#title-screen");
                target.style.display = "flex";
            }
        }
    });

    // Xử lý đăng ký
    registerForm.addEventListener("submit", async function(e) {
        e.preventDefault();
        const email = document.querySelector("#register-email").value;
        const password = document.querySelector("#register-password").value;
        const confirmPassword = document.querySelector("#register-confirm-password").value;

        if (password !== confirmPassword) {
            document.querySelector("#register-alert").innerHTML = "Mật khẩu không khớp!";
            return;
        }

        const success = await registerUser(email, password, confirmPassword);
        if (success) {
            document.querySelector("#login-screen").style.display = "none";
            runLoad("character-creation", "flex");
        }
    });

    // Title Screen Validation
    document.querySelector("#title-screen").addEventListener("click", function () {
        if (player && player.allocated) {
            enterDungeon();
        } else {
            allocationPopup();
        }
    });

    // Prevent double-click zooming on mobile devices
    document.ondblclick = function (e) {
        e.preventDefault();
    }

    // Submit Name
    document.querySelector("#name-submit").addEventListener("submit", async function (e) {
        e.preventDefault();
        let playerName = document.querySelector("#name-input").value;

        var format = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
        if (format.test(playerName)) {
            document.querySelector("#alert").innerHTML = "Tên của bạn không được chứa ký tự đặc biệt!";
        } else {
            if (playerName.length < 3 || playerName.length > 15) {
                document.querySelector("#alert").innerHTML = "Tên phải dài từ 3-15 ký tự!";
            } else {
                // Kiểm tra tên có bị trùng không
                const nameExists = await checkPlayerNameExists(playerName);
                if (nameExists) {
                    document.querySelector("#alert").innerHTML = "Đã có người sử dụng tên này!";
                    return;
                }

                player = {
                    name: playerName,
                    lvl: 1,
                    stats: {
                        hp: null,
                        hpMax: null,
                        atk: null,
                        def: null,
                        pen: null,
                        atkSpd: null,
                        vamp: null,
                        critRate: null,
                        critDmg: null
                    },
                    baseStats: {
                        hp: 500,
                        atk: 100,
                        def: 50,
                        pen: 0,
                        atkSpd: 0.6,
                        vamp: 0,
                        critRate: 0,
                        critDmg: 50
                    },
                    equippedStats: {
                        hp: 0,
                        atk: 0,
                        def: 0,
                        pen: 0,
                        atkSpd: 0,
                        vamp: 0,
                        critRate: 0,
                        critDmg: 0,
                        hpPct: 0,
                        atkPct: 0,
                        defPct: 0,
                        penPct: 0,
                    },
                    bonusStats: {
                        hp: 0,
                        atk: 0,
                        def: 0,
                        atkSpd: 0,
                        vamp: 0,
                        critRate: 0,
                        critDmg: 0
                    },
                    exp: {
                        expCurr: 0,
                        expMax: 100,
                        expCurrLvl: 0,
                        expMaxLvl: 100,
                        lvlGained: 0
                    },
                    inventory: {
                        consumables: [],
                        equipment: []
                    },
                    equipped: [],
                    // Số ô trang bị người chơi được phép sử dụng (mặc định 6, tối đa 9)
                    maxEquippedSlots: 6,
                    gold: 0,
                    playtime: 0,
                    kills: 0,
                    deaths: 0,
                    inCombat: false
                };
                
                // Đăng ký tên người chơi với transaction (tránh race condition)
                const registered = await registerPlayerName(playerName);
                if (!registered) {
                    // Đăng ký thất bại (tên đã bị chiếm trong lúc đó)
                    document.querySelector("#alert").innerHTML = "Tên này vừa được người khác sử dụng! Vui lòng chọn tên khác.";
                    return;
                }
                
                calculateStats();
                player.stats.hp = player.stats.hpMax;
                
                // Khởi tạo dungeon object cho nhân vật mới
                if (typeof initializeDefaultDungeon === 'function') {
                    initializeDefaultDungeon();
                }
                
                // Áp dụng protection sau khi tạo player
                if (typeof protectPlayerObject === 'function') {
                    protectPlayerObject();
                }
                
                await savePlayerData();
                document.querySelector("#character-creation").style.display = "none";
                runLoad("title-screen", "flex");
            }
        }
    });

    // Unequip all items
    document.querySelector("#unequip-all").addEventListener("click", function () {
        sfxOpen.play();

        dungeon.status.exploring = false;
        let dimTarget = document.querySelector('#inventory');
        dimTarget.style.filter = "brightness(50%)";
        defaultModalElement.style.display = "flex";
        defaultModalElement.innerHTML = `
        <div class="content">
            <p>Bỏ hết vật phẩm của bạn?</p>
            <div class="button-container">
                <button id="unequip-confirm">Bỏ Vật Phẩm</button>
                <button id="unequip-cancel">Hủy Bỏ</button>
            </div>
        </div>`;
        let confirm = document.querySelector('#unequip-confirm');
        let cancel = document.querySelector('#unequip-cancel');
        confirm.onclick = function () {
            sfxUnequip.play();
            unequipAll();
            continueExploring();
            defaultModalElement.style.display = "none";
            defaultModalElement.innerHTML = "";
            dimTarget.style.filter = "brightness(100%)";
        };
        cancel.onclick = function () {
            sfxDecline.play();
            continueExploring();
            defaultModalElement.style.display = "none";
            defaultModalElement.innerHTML = "";
            dimTarget.style.filter = "brightness(100%)";
        };
    });

    document.querySelector("#menu-btn").addEventListener("click", function () {
        closeInventory();

        dungeon.status.exploring = false;
        let dimDungeon = document.querySelector('#dungeon-main');
        dimDungeon.style.filter = "brightness(50%)";
        menuModalElement.style.display = "flex";

        // Menu tab
        menuModalElement.innerHTML = `
        <div class="content">
            <div class="content-head">
                <h3>Menu</h3>
                <p id="close-menu"><i class="fa fa-xmark"></i></p>
            </div>
            <button id="player-menu"><i class="fas fa-user"></i>${player.name}</button>
            <button id="stats">Chỉ Số Chính</button>
            <button id="leaderboard-btn">Xếp Hạng</button>
            <button id="volume-btn">Âm Thanh</button>
            <button id="change-password-btn">Đổi Mật Khẩu</button>
            <button id="logout-btn">Đăng Xuất</button>
            <button id="quit-run">Xóa Dữ Liệu</button>
        </div>`;

        let close = document.querySelector('#close-menu');
        let playerMenu = document.querySelector('#player-menu');
        let runMenu = document.querySelector('#stats');
        let quitRun = document.querySelector('#quit-run');
        let leaderboardBtn = document.querySelector('#leaderboard-btn');
        let changePasswordBtn = document.querySelector('#change-password-btn');
        let logoutBtn = document.querySelector('#logout-btn');
        let volumeSettings = document.querySelector('#volume-btn');

        // Player profile click function
        playerMenu.onclick = function () {
            sfxOpen.play();
            let playTime = new Date(player.playtime * 1000).toISOString().slice(11, 19);
            menuModalElement.style.display = "none";
            defaultModalElement.style.display = "flex";
            defaultModalElement.innerHTML = `
            <div class="content" id="profile-tab">
                <div class="content-head">
                    <h3>Thông Tin</h3>
                    <p id="profile-close"><i class="fa fa-xmark"></i></p>
                </div>
                <p>${player.name} Lv.${player.lvl}</p>
                <p>Giết: ${nFormatter(player.kills)}</p>
                <p>Chết: ${nFormatter(player.deaths)}</p>
                <p>Chơi: ${playTime}</p>
            </div>`;
            let profileTab = document.querySelector('#profile-tab');
            profileTab.style.width = "15rem";
            let profileClose = document.querySelector('#profile-close');
            profileClose.onclick = function () {
                sfxDecline.play();
                defaultModalElement.style.display = "none";
                defaultModalElement.innerHTML = "";
                menuModalElement.style.display = "flex";
            };
        };

        // Dungeon run click function
        runMenu.onclick = function () {
            sfxOpen.play();
            let runTime = new Date(dungeon.statistics.runtime * 1000).toISOString().slice(11, 19);
            menuModalElement.style.display = "none";
            defaultModalElement.style.display = "flex";
            defaultModalElement.innerHTML = `
            <div class="content" id="run-tab">
                <div class="content-head">
                    <h3>Chỉ Số</h3>
                    <p id="run-close"><i class="fa fa-xmark"></i></p>
                </div>
                <p>${player.name} Lv.${player.lvl} (${player.skills})</p>
                <p>Phước Lành Lvl.${player.blessing}</p>
                <p>Lời Nguyền Lvl.${Math.round((dungeon.settings.enemyScaling - 1) * 10)}</p>
                <p>Giết Được: ${nFormatter(dungeon.statistics.kills)}</p>
                <p>Hoạt Động: ${runTime}</p>
            </div>`;
            let runTab = document.querySelector('#run-tab');
            runTab.style.width = "15rem";
            let runClose = document.querySelector('#run-close');
            runClose.onclick = function () {
                sfxDecline.play();
                defaultModalElement.style.display = "none";
                defaultModalElement.innerHTML = "";
                menuModalElement.style.display = "flex";
            };
        };

        // Quit the current run / Delete all data
        quitRun.onclick = function () {
            sfxOpen.play();
            menuModalElement.style.display = "none";
            defaultModalElement.style.display = "flex";
            defaultModalElement.innerHTML = `
            <div class="content">
                <p>Bạn có muốn xóa toàn bộ dữ liệu game?</p>
                <p style="color: #ff4444; font-size: 0.9rem;">Cảnh báo: Hành động này không thể hoàn tác!</p>
                <div class="button-container">
                    <button id="quit-run">Đồng Ý</button>
                    <button id="cancel-quit">Hủy Bỏ</button>
                </div>
            </div>`;
            let quit = document.querySelector('#quit-run');
            let cancel = document.querySelector('#cancel-quit');
            quit.onclick = async function () {
                sfxConfirm.play();
                // Xóa toàn bộ dữ liệu
                const success = await deleteAllGameData();
                if (success) {
                    bgmDungeon.stop();
                    let dimDungeon = document.querySelector('#dungeon-main');
                    dimDungeon.style.filter = "brightness(100%)";
                    dimDungeon.style.display = "none";
                    menuModalElement.style.display = "none";
                    menuModalElement.innerHTML = "";
                    defaultModalElement.style.display = "none";
                    defaultModalElement.innerHTML = "";
                    runLoad("character-creation", "flex");
                    clearInterval(dungeonTimer);
                    clearInterval(playTimer);
                }
            };
            cancel.onclick = function () {
                sfxDecline.play();
                defaultModalElement.style.display = "none";
                defaultModalElement.innerHTML = "";
                menuModalElement.style.display = "flex";
            };
        };

        // Leaderboard button
        leaderboardBtn.onclick = async function () {
            sfxOpen.play();
            menuModalElement.style.display = "none";
            defaultModalElement.style.display = "flex";
            defaultModalElement.innerHTML = `
            <div class="content" id="leaderboard-tab">
                <div class="content-head">
                    <h3>Bảng Xếp Hạng</h3>
                    <p id="leaderboard-close"><i class="fa fa-xmark"></i></p>
                </div>
                <div id="leaderboard-content" style="max-height: 60vh; overflow-y: auto; overflow-x: hidden;">
                    <p style="text-align: center;">Đang tải...</p>
                </div>
            </div>`;
            
            let leaderboardTab = document.querySelector('#leaderboard-tab');
            leaderboardTab.style.width = "22rem";
            leaderboardTab.style.maxHeight = "80vh";
            let leaderboardClose = document.querySelector('#leaderboard-close');
            let leaderboardContent = document.querySelector('#leaderboard-content');
            
            // Trạng thái hiển thị (top 3 hay top 10)
            if (!leaderboardContent.dataset.expanded) {
                leaderboardContent.dataset.expanded = 'false';
            }
            const isExpanded = leaderboardContent.dataset.expanded === 'true';
            const limit = isExpanded ? 10 : 3;
            
            // Lấy dữ liệu leaderboard
            const topGold = await getTopGoldPlayers(limit);
            const topLevel = await getTopLevelPlayers(limit);
            const topFloor = await getTopFloorPlayers(limit);
            
            const medals = ['🥇', '🥈', '🥉'];
            
            // Hàm tạo danh sách
            const createList = (players, valueKey, label, color) => {
                let list = `<div style="background: ${color}; padding: 12px; border-radius: 8px; margin-bottom: 12px;">`;
                list += `<h4 style="margin: 0 0 8px 0; color: #fff; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">${label}</h4>`;
                
                if (players.length === 0) {
                    list += '<p style="color: #ddd; font-style: italic; margin: 5px 0;">Chưa có dữ liệu</p>';
                } else {
                    players.forEach((player, index) => {
                        const medal = index < 3 ? medals[index] + ' ' : `${index + 1}. `;
                        const nameStyle = index < 3 ? 'font-weight: bold; font-size: 1.05em;' : '';
                        
                        let value;
                        let valueColor = '#ffd700'; // Mặc định màu vàng
                        if (valueKey === 'gold') {
                            value = nFormatter(player.gold) + ' vàng';
                            valueColor = '#ffeb3b'; // Vàng sáng hơn
                        } else if (valueKey === 'level') {
                            value = 'Level ' + player.level;
                            valueColor = '#66ff66'; // Xanh lá sáng hơn
                        } else if (valueKey === 'floor') {
                            value = 'Tầng ' + player.floor;
                            valueColor = '#e0b3ff'; // Tím sáng hơn
                        }
                        
                        list += `<div style="background: rgba(255,255,255,0.15); padding: 6px 8px; margin: 4px 0; border-radius: 5px; ${nameStyle}">`;
                        list += `${medal}<span style="color: #fff; text-shadow: 1px 1px 3px rgba(0,0,0,0.8);">${player.name}</span> - <span style="color: ${valueColor}; font-weight: 700; text-shadow: 1px 1px 3px rgba(0,0,0,0.7);">${value}</span>`;
                        list += '</div>';
                    });
                }
                
                list += '</div>';
                return list;
            };
            
            let content = '';
            content += createList(topGold, 'gold', '💰 Top Vàng', 'linear-gradient(135deg, #d4a855 0%, #8b6914 100%)');
            content += createList(topLevel, 'level', '⚔️ Top Level', 'linear-gradient(135deg, #52b788 0%, #2d6a4f 100%)');
            content += createList(topFloor, 'floor', '🏆 Top Tầng Cao Nhất', 'linear-gradient(135deg, #c77dff 0%, #9d4edd 100%)');
            
            // Nút toggle
            const toggleText = isExpanded ? 'Thu gọn (Top 3)' : 'Xem thêm (Top 10)';
            content += `<div style="text-align: center; margin-top: 15px;">`;
            content += `<button id="toggle-leaderboard-btn" style="background: rgba(255,255,255,0.1); color: #fff; border: 2px solid rgba(255,255,255,0.3); padding: 8px 20px; border-radius: 8px; cursor: pointer; font-size: 0.9em; font-weight: 600; transition: all 0.3s; backdrop-filter: blur(5px);">${toggleText}</button>`;
            content += '</div>';
            
            leaderboardContent.innerHTML = content;
            
            // Sự kiện cho nút toggle
            const toggleBtn = document.getElementById("toggle-leaderboard-btn");
            toggleBtn.onmouseover = function() {
                this.style.background = 'rgba(255,255,255,0.2)';
                this.style.borderColor = 'rgba(255,255,255,0.5)';
                this.style.transform = 'translateY(-2px)';
            };
            toggleBtn.onmouseout = function() {
                this.style.background = 'rgba(255,255,255,0.1)';
                this.style.borderColor = 'rgba(255,255,255,0.3)';
                this.style.transform = 'translateY(0)';
            };
            toggleBtn.onclick = async function() {
                // Đọc trạng thái hiện tại
                const currentExpanded = leaderboardContent.dataset.expanded === 'true';
                const newExpanded = !currentExpanded;
                leaderboardContent.dataset.expanded = newExpanded.toString();
                
                // Reload dữ liệu
                const newLimit = newExpanded ? 10 : 3;
                leaderboardContent.innerHTML = '<p style="text-align: center;">Đang tải...</p>';
                
                const [newTopGold, newTopLevel, newTopFloor] = await Promise.all([
                    getTopGoldPlayers(newLimit),
                    getTopLevelPlayers(newLimit),
                    getTopFloorPlayers(newLimit)
                ]);
                
                let newContent = '';
                newContent += createList(newTopGold, 'gold', '💰 Top Vàng', 'linear-gradient(135deg, #d4a855 0%, #8b6914 100%)');
                newContent += createList(newTopLevel, 'level', '⚔️ Top Level', 'linear-gradient(135deg, #52b788 0%, #2d6a4f 100%)');
                newContent += createList(newTopFloor, 'floor', '🏆 Top Tầng Cao Nhất', 'linear-gradient(135deg, #c77dff 0%, #9d4edd 100%)');
                
                const newToggleText = newExpanded ? 'Thu gọn (Top 3)' : 'Xem thêm (Top 10)';
                newContent += `<div style="text-align: center; margin-top: 15px;">`;
                newContent += `<button id="toggle-leaderboard-btn" style="background: rgba(255,255,255,0.1); color: #fff; border: 2px solid rgba(255,255,255,0.3); padding: 8px 20px; border-radius: 8px; cursor: pointer; font-size: 0.9em; font-weight: 600; transition: all 0.3s; backdrop-filter: blur(5px);">${newToggleText}</button>`;
                newContent += '</div>';
                
                leaderboardContent.innerHTML = newContent;
                
                // Re-attach sự kiện
                const newToggleBtn = document.getElementById("toggle-leaderboard-btn");
                newToggleBtn.onmouseover = function() { 
                    this.style.background = 'rgba(255,255,255,0.2)';
                    this.style.borderColor = 'rgba(255,255,255,0.5)';
                    this.style.transform = 'translateY(-2px)';
                };
                newToggleBtn.onmouseout = function() { 
                    this.style.background = 'rgba(255,255,255,0.1)';
                    this.style.borderColor = 'rgba(255,255,255,0.3)';
                    this.style.transform = 'translateY(0)';
                };
                newToggleBtn.onclick = toggleBtn.onclick;
            };
            
            leaderboardClose.onclick = function () {
                sfxDecline.play();
                defaultModalElement.style.display = "none";
                defaultModalElement.innerHTML = "";
                menuModalElement.style.display = "flex";
            };
        };

        // Change Password button
        changePasswordBtn.onclick = function () {
            sfxOpen.play();
            menuModalElement.style.display = "none";
            defaultModalElement.style.display = "flex";
            defaultModalElement.innerHTML = `
            <div class="content">
                <h3>Đổi Mật Khẩu</h3>
                <form id="change-password-form" style="display: flex; flex-direction: column; gap: 10px;">
                    <div style="position: relative;">
                        <input type="password" id="current-password" placeholder="Mật khẩu hiện tại" required style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #444; background: #222; color: #fff;">
                        <i class="fas fa-eye" id="toggle-current-password" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #999;"></i>
                    </div>
                    <div style="position: relative;">
                        <input type="password" id="new-password" placeholder="Mật khẩu mới" required style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #444; background: #222; color: #fff;">
                        <i class="fas fa-eye" id="toggle-new-password" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #999;"></i>
                    </div>
                    <div style="position: relative;">
                        <input type="password" id="confirm-new-password" placeholder="Xác nhận mật khẩu mới" required style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #444; background: #222; color: #fff;">
                        <i class="fas fa-eye" id="toggle-confirm-new-password" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #999;"></i>
                    </div>
                    <p id="change-password-alert" style="color: #ff4444; min-height: 20px; margin: 5px 0;"></p>
                    <div class="button-container">
                        <button type="submit">Đổi Mật Khẩu</button>
                        <button type="button" id="cancel-change-password">Hủy Bỏ</button>
                    </div>
                </form>
            </div>`;
            
            // Toggle password visibility for change password form
            const togglePasswordVisibility = (inputId, iconId) => {
                const input = document.getElementById(inputId);
                const icon = document.getElementById(iconId);
                if (input && icon) {
                    icon.onclick = () => {
                        if (input.type === 'password') {
                            input.type = 'text';
                            icon.classList.remove('fa-eye');
                            icon.classList.add('fa-eye-slash');
                        } else {
                            input.type = 'password';
                            icon.classList.remove('fa-eye-slash');
                            icon.classList.add('fa-eye');
                        }
                    };
                }
            };
            
            togglePasswordVisibility('current-password', 'toggle-current-password');
            togglePasswordVisibility('new-password', 'toggle-new-password');
            togglePasswordVisibility('confirm-new-password', 'toggle-confirm-new-password');
            
            const changePasswordForm = document.getElementById('change-password-form');
            const cancelBtn = document.getElementById('cancel-change-password');
            const alertEl = document.getElementById('change-password-alert');
            
            changePasswordForm.onsubmit = async function(e) {
                e.preventDefault();
                const currentPassword = document.getElementById('current-password').value;
                const newPassword = document.getElementById('new-password').value;
                const confirmNewPassword = document.getElementById('confirm-new-password').value;
                
                if (newPassword !== confirmNewPassword) {
                    alertEl.textContent = 'Mật khẩu mới không khớp!';
                    return;
                }
                
                if (newPassword.length < 6) {
                    alertEl.textContent = 'Mật khẩu phải có ít nhất 6 ký tự!';
                    return;
                }
                
                alertEl.textContent = 'Đang xử lý...';
                alertEl.style.color = '#ffcc00';
                
                try {
                    // Re-authenticate user
                    const credential = firebase.auth.EmailAuthProvider.credential(
                        currentUser.email,
                        currentPassword
                    );
                    await currentUser.reauthenticateWithCredential(credential);
                    
                    // Change password
                    await currentUser.updatePassword(newPassword);
                    
                    alertEl.textContent = 'Đổi mật khẩu thành công! Đang đăng xuất...';
                    alertEl.style.color = '#00ff00';
                    
                    // Logout after 2 seconds
                    setTimeout(async () => {
                        await logoutUser();
                        bgmDungeon.stop();
                        let dimDungeon = document.querySelector('#dungeon-main');
                        dimDungeon.style.filter = "brightness(100%)";
                        dimDungeon.style.display = "none";
                        menuModalElement.style.display = "none";
                        menuModalElement.innerHTML = "";
                        defaultModalElement.style.display = "none";
                        defaultModalElement.innerHTML = "";
                        clearInterval(dungeonTimer);
                        clearInterval(playTimer);
                    }, 2000);
                } catch (error) {
                    alertEl.style.color = '#ff4444';
                    if (error.code === 'auth/wrong-password') {
                        alertEl.textContent = 'Mật khẩu hiện tại không đúng!';
                    } else if (error.code === 'auth/too-many-requests') {
                        alertEl.textContent = 'Quá nhiều yêu cầu! Vui lòng thử lại sau.';
                    } else {
                        alertEl.textContent = 'Lỗi: ' + error.message;
                    }
                }
            };
            
            cancelBtn.onclick = function () {
                sfxDecline.play();
                defaultModalElement.style.display = "none";
                defaultModalElement.innerHTML = "";
                menuModalElement.style.display = "flex";
            };
        };

        // Logout button
        logoutBtn.onclick = function () {
            sfxOpen.play();
            menuModalElement.style.display = "none";
            defaultModalElement.style.display = "flex";
            defaultModalElement.innerHTML = `
            <div class="content">
                <p>Bạn có muốn đăng xuất?</p>
                <div class="button-container">
                    <button id="confirm-logout">Đồng Ý</button>
                    <button id="cancel-logout">Hủy Bỏ</button>
                </div>
            </div>`;
            let confirmLogout = document.querySelector('#confirm-logout');
            let cancelLogout = document.querySelector('#cancel-logout');
            confirmLogout.onclick = async function () {
                sfxConfirm.play();
                await logoutUser();
                bgmDungeon.stop();
                let dimDungeon = document.querySelector('#dungeon-main');
                dimDungeon.style.filter = "brightness(100%)";
                dimDungeon.style.display = "none";
                menuModalElement.style.display = "none";
                menuModalElement.innerHTML = "";
                defaultModalElement.style.display = "none";
                defaultModalElement.innerHTML = "";
                clearInterval(dungeonTimer);
                clearInterval(playTimer);
            };
            cancelLogout.onclick = function () {
                sfxDecline.play();
                defaultModalElement.style.display = "none";
                defaultModalElement.innerHTML = "";
                menuModalElement.style.display = "flex";
            };
        };

        // Opens the volume settings
        volumeSettings.onclick = function () {
            sfxOpen.play();

            let master = volume.master * 100;
            let bgm = (volume.bgm * 100) * 2;
            let sfx = volume.sfx * 100;
            menuModalElement.style.display = "none";
            defaultModalElement.style.display = "flex";
            defaultModalElement.innerHTML = `
            <div class="content" id="volume-tab">
                <div class="content-head">
                    <h3>Âm Thanh</h3>
                    <p id="volume-close"><i class="fa fa-xmark"></i></p>
                </div>
                <label id="master-label" for="master-volume">Tổng (${master}%)</label>
                <input type="range" id="master-volume" min="0" max="100" value="${master}">
                <label id="bgm-label" for="bgm-volume">Nhạc Nền (${bgm}%)</label>
                <input type="range" id="bgm-volume" min="0" max="100" value="${bgm}">
                <label id="sfx-label" for="sfx-volume">Hiệu Ứng (${sfx}%)</label>
                <input type="range" id="sfx-volume" min="0" max="100" value="${sfx}">
                <button id="apply-volume">Áp Dụng</button>
            </div>`;
            let masterVol = document.querySelector('#master-volume');
            let bgmVol = document.querySelector('#bgm-volume');
            let sfxVol = document.querySelector('#sfx-volume');
            let applyVol = document.querySelector('#apply-volume');
            let volumeTab = document.querySelector('#volume-tab');
            volumeTab.style.width = "15rem";
            let volumeClose = document.querySelector('#volume-close');
            volumeClose.onclick = function () {
                sfxDecline.play();
                defaultModalElement.style.display = "none";
                defaultModalElement.innerHTML = "";
                menuModalElement.style.display = "flex";
            };

            // Volume Control
            masterVol.oninput = function () {
                master = this.value;
                document.querySelector('#master-label').innerHTML = `Tổng (${master}%)`;
            };

            bgmVol.oninput = function () {
                bgm = this.value;
                document.querySelector('#bgm-label').innerHTML = `Nhạc Nền (${bgm}%)`;
            };

            sfxVol.oninput = function () {
                sfx = this.value;
                document.querySelector('#sfx-label').innerHTML = `Hiệu Ứng (${sfx}%)`;
            };

            applyVol.onclick = function () {
                volume.master = master / 100;
                volume.bgm = (bgm / 100) / 2;
                volume.sfx = sfx / 100;
                bgmDungeon.stop();
                setVolume();
                bgmDungeon.play();
                saveData();
            };
        };

        // Close menu
        close.onclick = function () {
            sfxDecline.play();
            continueExploring();
            menuModalElement.style.display = "none";
            menuModalElement.innerHTML = "";
            dimDungeon.style.filter = "brightness(100%)";
        };
    });
});

// Loading Screen
const runLoad = (id, display) => {
    let loader = document.querySelector("#loading");
    loader.style.display = "flex";
    setTimeout(async () => {
        loader.style.display = "none";
        document.querySelector(`#${id}`).style.display = `${display}`;
    }, 1000);
}

// Start the game
const enterDungeon = () => {
    sfxConfirm.play();
    document.querySelector("#title-screen").style.display = "none";
    runLoad("dungeon-main", "flex");
    if (player.inCombat) {
        // enemy will already be loaded from Firebase
        showCombatInfo();
        startCombat(bgmBattleMain);
    } else {
        bgmDungeon.play();
    }
    if (player.stats.hp == 0) {
        progressReset();
    }
    initialDungeonLoad();
    playerLoadStats();
}

// Save all the data to Firebase (replacing localStorage)
const saveData = async () => {
    // Sử dụng debounced save thay vì save ngay lập tức
    if (typeof debouncedSave === 'function') {
        debouncedSave();
    }
}

// Calculate every player stat
const calculateStats = () => {
    let equipmentAtkSpd = player.baseStats.atkSpd * (player.equippedStats.atkSpd / 100);
    let playerHpBase = player.baseStats.hp;
    let playerAtkBase = player.baseStats.atk;
    let playerDefBase = player.baseStats.def;
    let playerAtkSpdBase = player.baseStats.atkSpd;
    let playerVampBase = player.baseStats.vamp;
    let playerCRateBase = player.baseStats.critRate;
    let playerCDmgBase = player.baseStats.critDmg;

    player.stats.hpMax = Math.round((playerHpBase + playerHpBase * (player.bonusStats.hp / 100)) + player.equippedStats.hp);
    player.stats.atk = Math.round((playerAtkBase + playerAtkBase * (player.bonusStats.atk / 100)) + player.equippedStats.atk);
    player.stats.def = Math.round((playerDefBase + playerDefBase * (player.bonusStats.def / 100)) + player.equippedStats.def);
    player.stats.atkSpd = (playerAtkSpdBase + playerAtkSpdBase * (player.bonusStats.atkSpd / 100)) + equipmentAtkSpd + (equipmentAtkSpd * (player.equippedStats.atkSpd / 100));
    player.stats.vamp = playerVampBase + player.bonusStats.vamp + player.equippedStats.vamp;
    player.stats.critRate = playerCRateBase + player.bonusStats.critRate + player.equippedStats.critRate;
    player.stats.critDmg = playerCDmgBase + player.bonusStats.critDmg + player.equippedStats.critDmg;

    // Caps attack speed to 2.5
    if (player.stats.atkSpd > 2.5) {
        player.stats.atkSpd = 2.5;
    }
}

// Resets the progress back to start
const progressReset = () => {
    player.stats.hp = player.stats.hpMax;
    player.lvl = 1;
    player.blessing = 1;
    player.exp = {
        expCurr: 0,
        expMax: 100,
        expCurrLvl: 0,
        expMaxLvl: 100,
        lvlGained: 0
    };
    player.bonusStats = {
        hp: 0,
        atk: 0,
        def: 0,
        atkSpd: 0,
        vamp: 0,
        critRate: 0,
        critDmg: 0
    };
    player.skills = [];
    player.inCombat = false;
    dungeon.progress.floor = 1;
    dungeon.progress.room = 1;
    dungeon.statistics.kills = 0;
    dungeon.status = {
        exploring: false,
        paused: true,
        event: false,
    };
    dungeon.settings = {
        enemyBaseLvl: 1,
        enemyLvlGap: 5,
        enemyBaseStats: 1,
        enemyScaling: 1.1,
    };
    delete dungeon.enemyMultipliers;
    delete player.allocated;
    dungeon.backlog.length = 0;
    dungeon.action = 0;
    dungeon.statistics.runtime = 0;
    combatBacklog.length = 0;
    saveData();
}

// Export and Import Save Data
const exportData = () => {
    const exportedData = btoa(JSON.stringify(player));
    return exportedData;
}

const importData = (importedData) => {
    try {
        let playerImport = JSON.parse(atob(importedData));
        if (playerImport.inventory !== undefined) {
            sfxOpen.play();
            defaultModalElement.style.display = "none";
            confirmationModalElement.style.display = "flex";
            confirmationModalElement.innerHTML = `
            <div class="content">
                <p>Bạn có chắc chắn muốn nhập dữ liệu này không? Thao tác này sẽ xóa dữ liệu hiện tại và đặt lại tiến trình hầm ngục của bạn.</p>
                <div class="button-container">
                    <button id="import-btn">Đồng Ý</button>
                    <button id="cancel-btn">Hủy Bỏ</button>
                </div>
            </div>`;
            let confirm = document.querySelector("#import-btn");
            let cancel = document.querySelector("#cancel-btn");
            confirm.onclick = function () {
                sfxConfirm.play();
                player = playerImport;
                saveData();
                bgmDungeon.stop();
                let dimDungeon = document.querySelector('#dungeon-main');
                dimDungeon.style.filter = "brightness(100%)";
                dimDungeon.style.display = "none";
                menuModalElement.style.display = "none";
                menuModalElement.innerHTML = "";
                confirmationModalElement.style.display = "none";
                confirmationModalElement.innerHTML = "";
                defaultModalElement.style.display = "none";
                defaultModalElement.innerHTML = "";
                runLoad("title-screen", "flex");
                clearInterval(dungeonTimer);
                clearInterval(playTimer);
                progressReset();
            }
            cancel.onclick = function () {
                sfxDecline.play();
                confirmationModalElement.style.display = "none";
                confirmationModalElement.innerHTML = "";
                defaultModalElement.style.display = "flex";
            }
        } else {
            sfxDeny.play();
        }
    } catch (err) {
        sfxDeny.play();
    }
}

// Player Stat Allocation
const allocationPopup = () => {
    let allocation = {
        hp: 5,
        atk: 5,
        def: 5,
        atkSpd: 5
    }
    const updateStats = () => {
        stats = {
            hp: 50 * allocation.hp,
            atk: 10 * allocation.atk,
            def: 10 * allocation.def,
            atkSpd: 0.4 + (0.02 * allocation.atkSpd)
        }
    }
    updateStats();
    let points = 20;
    const loadContent = function () {
        defaultModalElement.innerHTML = `
        <div class="content" id="allocate-stats">
            <div class="content-head">
                <h3>Allocate Stats</h3>
                <p id="allocate-close"><i class="fa fa-xmark"></i></p>
            </div>
            <div class="row">
                <p><i class="fas fa-heart"></i><span id="hpDisplay">HP: ${stats.hp}</span></p>
                <div class="row">
                    <button id="hpMin">-</button>
                    <span id="hpAllo">${allocation.hp}</span>
                    <button id="hpAdd">+</button>
                </div>
            </div>
            <div class="row">
                <p><i class="ra ra-sword"></i><span id="atkDisplay">ATK: ${stats.atk}</span></p>
                <div class="row">
                    <button id="atkMin">-</button>
                    <span id="atkAllo">${allocation.atk}</span>
                    <button id="atkAdd">+</button>
                </div>
            </div>
            <div class="row">
                <p><i class="ra ra-round-shield"></i><span id="defDisplay">DEF: ${stats.def}</span></p>
                <div class="row">
                    <button id="defMin">-</button>
                    <span id="defAllo">${allocation.def}</span>
                    <button id="defAdd">+</button>
                </div>
            </div>
            <div class="row">
                <p><i class="ra ra-plain-dagger"></i><span id="atkSpdDisplay">ATK.SPD: ${stats.atkSpd}</span></p>
                <div class="row">
                    <button id="atkSpdMin">-</button>
                    <span id="atkSpdAllo">${allocation.atkSpd}</span>
                    <button id="atkSpdAdd">+</button>
                </div>
            </div>
            <div class="row">
                <p id="alloPts">Stat Points: ${points}</p>
                <button id="allocate-reset">Đặt Lại</button>
            </div>
            <div class="row">
                <p>Kỹ Năng</p>
                <select id="select-skill">
                    <option value="Remnant Razor">Remnant Razor</option>
                    <option value="Titan's Will">Titan's Will</option>
                    <option value="Devastator">Devastator</option>
                    <option value="Blade Dance">Blade Dance</option>
                    <option value="Paladin's Heart">Paladin's Heart</option>
                    <option value="Aegis Thorns">Aegis Thorns</option>
                </select>
            </div>
            <div class="row primary-panel pad">
                <p id="skill-desc">Các đòn tấn công gây thêm 8% lượng máu hiện tại của kẻ địch khi đánh trúng.</p>
            </div>
            <button id="allocate-confirm">Tiến Hành</button>
        </div>`;
    }
    defaultModalElement.style.display = "flex";
    document.querySelector("#title-screen").style.filter = "brightness(50%)";
    loadContent();

    // Stat Allocation
    const handleStatButtons = (e) => {
        let rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
        if (e.includes("Add")) {
            let stat = e.split("Add")[0];
            if (points > 0) {
                sfxConfirm.play();
                allocation[stat]++;
                points--;
                updateStats();
                document.querySelector(`#${stat}Display`).innerHTML = `${stat.replace(/([A-Z])/g, ' $1').trim().replace(/ /g, '.').toUpperCase()}: ${stats[stat].toFixed(2).replace(rx, "$1")}`;
                document.querySelector(`#${stat}Allo`).innerHTML = allocation[stat];
                document.querySelector(`#alloPts`).innerHTML = `Stat Points: ${points}`;
            } else {
                sfxDeny.play();
            }
        } else if (e.includes("Min")) {
            let stat = e.split("Min")[0];
            if (allocation[stat] > 5) {
                sfxConfirm.play();
                allocation[stat]--;
                points++;
                updateStats();
                document.querySelector(`#${stat}Display`).innerHTML = `${stat.replace(/([A-Z])/g, ' $1').trim().replace(/ /g, '.').toUpperCase()}: ${stats[stat].toFixed(2).replace(rx, "$1")}`;
                document.querySelector(`#${stat}Allo`).innerHTML = allocation[stat];
                document.querySelector(`#alloPts`).innerHTML = `Stat Points: ${points}`;
            } else {
                sfxDeny.play();
            }
        }
    }
    document.querySelector("#hpAdd").onclick = function () {
        handleStatButtons("hpAdd")
    };
    document.querySelector("#hpMin").onclick = function () {
        handleStatButtons("hpMin")
    };
    document.querySelector("#atkAdd").onclick = function () {
        handleStatButtons("atkAdd")
    };
    document.querySelector("#atkMin").onclick = function () {
        handleStatButtons("atkMin")
    };
    document.querySelector("#defAdd").onclick = function () {
        handleStatButtons("defAdd")
    };
    document.querySelector("#defMin").onclick = function () {
        handleStatButtons("defMin")
    };
    document.querySelector("#atkSpdAdd").onclick = function () {
        handleStatButtons("atkSpdAdd")
    };
    document.querySelector("#atkSpdMin").onclick = function () {
        handleStatButtons("atkSpdMin")
    };

    // Passive skills
    let selectSkill = document.querySelector("#select-skill");
    let skillDesc = document.querySelector("#skill-desc");
    selectSkill.onclick = function () {
        sfxConfirm.play();
    }
    selectSkill.onchange = function () {
        if (selectSkill.value == "Remnant Razor") {
            skillDesc.innerHTML = "Các đòn tấn công gây thêm 8% lượng máu hiện tại của kẻ địch khi đánh trúng.";
        }
        if (selectSkill.value == "Titan's Will") {
            skillDesc.innerHTML = "Các đòn tấn công gây thêm 5% lượng máu tối đa của bạn khi đánh trúng.";
        }
        if (selectSkill.value == "Devastator") {
            skillDesc.innerHTML = "Gây thêm 30% sát thương nhưng bạn mất 30% tốc độ đánh cơ bản.";
        }
        if (selectSkill.value == "Rampager") {
            skillDesc.innerHTML = "Tăng 5 điểm tấn công sau mỗi đòn đánh. Điểm cộng dồn sẽ được đặt lại sau trận chiến.";
        }
        if (selectSkill.value == "Blade Dance") {
            skillDesc.innerHTML = "Tăng tốc độ tấn công sau mỗi đòn đánh. Cộng dồn sẽ được đặt lại sau trận chiến.";
        }
        if (selectSkill.value == "Paladin's Heart") {
            skillDesc.innerHTML = "Bạn sẽ nhận ít hơn 25% sát thương vĩnh viễn.";
        }
        if (selectSkill.value == "Aegis Thorns") {
            skillDesc.innerHTML = "Kẻ địch phải chịu 15% sát thương mà chúng gây ra.";
        }
    }

    // Operation Buttons
    let confirm = document.querySelector("#allocate-confirm");
    let reset = document.querySelector("#allocate-reset");
    let close = document.querySelector("#allocate-close");
    confirm.onclick = function () {
        // Set allocated stats to player base stats
        player.baseStats = {
            hp: stats.hp,
            atk: stats.atk,
            def: stats.def,
            pen: 0,
            atkSpd: stats.atkSpd,
            vamp: 0,
            critRate: 0,
            critDmg: 50
        }

        // Set player skill
        objectValidation();
        if (selectSkill.value == "Remnant Razor") {
            player.skills.push("Remnant Razor");
        }
        if (selectSkill.value == "Titan's Will") {
            player.skills.push("Titan's Will");
        }
        if (selectSkill.value == "Devastator") {
            player.skills.push("Devastator");
            player.baseStats.atkSpd = player.baseStats.atkSpd - ((30 * player.baseStats.atkSpd) / 100);
        }
        if (selectSkill.value == "Rampager") {
            player.skills.push("Rampager");
        }
        if (selectSkill.value == "Blade Dance") {
            player.skills.push("Blade Dance");
        }
        if (selectSkill.value == "Paladin's Heart") {
            player.skills.push("Paladin's Heart");
        }
        if (selectSkill.value == "Aegis Thorns") {
            player.skills.push("Aegis Thorns");
        }

        // Proceed to dungeon
        player.allocated = true;
        enterDungeon();
        player.stats.hp = player.stats.hpMax;
        playerLoadStats();
        defaultModalElement.style.display = "none";
        defaultModalElement.innerHTML = "";
        document.querySelector("#title-screen").style.filter = "brightness(100%)";
    }
    reset.onclick = function () {
        sfxDecline.play();
        allocation = {
            hp: 5,
            atk: 5,
            def: 5,
            atkSpd: 5
        };
        points = 20;
        updateStats();

        // Display Reset
        document.querySelector(`#hpDisplay`).innerHTML = `HP: ${stats.hp}`;
        document.querySelector(`#atkDisplay`).innerHTML = `ATK: ${stats.atk}`;
        document.querySelector(`#defDisplay`).innerHTML = `DEF: ${stats.def}`;
        document.querySelector(`#atkSpdDisplay`).innerHTML = `ATK.SPD: ${stats.atkSpd}`;
        document.querySelector(`#hpAllo`).innerHTML = allocation.hp;
        document.querySelector(`#atkAllo`).innerHTML = allocation.atk;
        document.querySelector(`#defAllo`).innerHTML = allocation.def;
        document.querySelector(`#atkSpdAllo`).innerHTML = allocation.atkSpd;
        document.querySelector(`#alloPts`).innerHTML = `Stat Points: ${points}`;
    }
    close.onclick = function () {
        sfxDecline.play();
        defaultModalElement.style.display = "none";
        defaultModalElement.innerHTML = "";
        document.querySelector("#title-screen").style.filter = "brightness(100%)";
    }
}

const objectValidation = () => {
    if (player.skills == undefined) {
        player.skills = [];
    }
    if (player.tempStats == undefined) {
        player.tempStats = {};
        player.tempStats.atk = 0;
        player.tempStats.atkSpd = 0;
    }
    saveData();
}

// ===== ANTI-CHEAT INTEGRITY CHECK =====
// Kiểm tra xem anti-cheat có được load đúng không
window.addEventListener('load', function() {
    // Đợi 500ms để đảm bảo tất cả scripts đã load
    setTimeout(function() {
        if (!window._antiCheatActive) {
            document.body.innerHTML = `
                <div style="
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: #fff;
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 20px;
                ">
                    <h1 style="font-size: 2.5rem; margin-bottom: 20px;">🛡️ Lỗi Bảo Mật</h1>
                    <p style="font-size: 1.2rem; max-width: 600px; margin-bottom: 30px;">
                        Hệ thống phát hiện một số file bảo mật không được tải đúng cách.
                        Điều này có thể do:
                    </p>
                    <ul style="text-align: left; font-size: 1rem; margin-bottom: 30px;">
                        <li>Trình chặn quảng cáo (AdBlock, uBlock)</li>
                        <li>Extensions trình duyệt can thiệp</li>
                        <li>Kết nối mạng không ổn định</li>
                    </ul>
                    <p style="font-size: 1.1rem; margin-bottom: 20px;">Vui lòng:</p>
                    <ol style="text-align: left; font-size: 1rem; margin-bottom: 30px;">
                        <li>Tắt AdBlock/uBlock cho trang này</li>
                        <li>Tắt các extensions đáng ngờ</li>
                        <li>Tải lại trang (Ctrl+F5)</li>
                    </ol>
                    <button onclick="location.reload()" style="
                        padding: 15px 40px;
                        font-size: 1.2rem;
                        background: #fff;
                        color: #667eea;
                        border: none;
                        border-radius: 50px;
                        cursor: pointer;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">🔄 Tải Lại Trang</button>
                </div>
            `;
            throw new Error('Anti-cheat system not loaded');
        }
    }, 500);
});
