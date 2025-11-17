window.addEventListener("load", function () {
    console.log('[main] window.load fired, player=', player);
    // Wait for player to be loaded from Firebase in auth.js
    // If player already loaded, show title screen. If not, auth.js will display
    // the appropriate screen later. Do NOT return here — we must attach
    // event listeners even when `player` is null so form handlers work.
    if (player !== null) {
        let target = document.querySelector("#title-screen");
        target.style.display = "flex";
    } else {
        document.querySelector("#title-screen").style.display = "none";
    }

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
    const nameForm = document.querySelector("#name-submit");
    console.log('[main] attaching name-submit listener, form=', nameForm);
    if (nameForm) {
        nameForm.addEventListener("submit", function (e) {
            console.log('[main] name-submit event fired');
            e.preventDefault();
            
            // also log click on the submit button if present
            try {
                const submitBtn = nameForm.querySelector('button[type=submit]');
                if (submitBtn) {
                    submitBtn.addEventListener('click', () => console.log('[main] name-submit button clicked'));
                }
            } catch (err) {
                console.warn('[main] error attaching click logger to submit button', err);
            }

            
            e.preventDefault();
            let playerName = document.querySelector("#name-input").value;

        var format = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
        if (format.test(playerName)) {
            document.querySelector("#alert").innerHTML = "Tên của bạn không được chứa ký tự đặc biệt!";
        } else {
            if (playerName.length < 3 || playerName.length > 15) {
                document.querySelector("#alert").innerHTML = "Tên phải dài từ 3-15 ký tự!";
            } else {
                // Check if player name exists
                checkPlayerNameExists(playerName).then((exists) => {
                    if (exists) {
                        document.querySelector("#alert").innerHTML = "Đã có người sử dụng tên này!";
                    } else {
                        // Create player with allocated stats
                        const defaultPlayer = createDefaultPlayerData(playerName);
                        player = defaultPlayer;
                        
                        // Save to Firebase (use auth.currentUser as fallback)
                        const authUser = currentUser || getCurrentUser();
                        console.log("[main] name-submit -> authUser:", authUser && authUser.uid, authUser && authUser.email);
                        if (authUser) {
                            createPlayerData(authUser.uid, playerName, defaultPlayer)
                                .then((doc) => {
                                    console.log("[main] createPlayerData succeeded for uid:", authUser.uid);
                                    document.querySelector("#alert").innerHTML = "";
                                    // Load the player document we just created to ensure canonical structure
                                    try {
                                        loadPlayerDataFromFirebase(authUser.uid);
                                    } catch (e) {
                                        console.warn("loadPlayerDataFromFirebase not available yet:", e);
                                    }
                                    // Hide character creation before showing title screen
                                    document.querySelector("#character-creation").style.display = "none";
                                    // Show title screen; allocation happens when player clicks
                                    runLoad("title-screen", "flex");
                                })
                                .catch((error) => {
                                    console.error("Error creating player:", error);
                                    document.querySelector("#alert").innerHTML = "Lỗi tạo người chơi!";
                                });
                        } else {
                            document.querySelector("#alert").innerHTML = "Bạn cần đăng nhập trước!";
                        }
                    }
                }).catch((error) => {
                    console.error("Error checking name:", error);
                    document.querySelector("#alert").innerHTML = "Lỗi kiểm tra tên!";
                });
            }
        }
        });
    } else {
        console.warn('[main] #name-submit form not found on page');
    }
    

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
            <button id="leaderboard-btn"><i class="ra ra-crown"></i>Xếp Hạng</button>
            <button id="volume-btn">Âm Thanh</button>
            <button id="logout-btn">Đăng Xuất</button>
            <button id="reset-data">Xóa Dữ Liệu</button>
        </div>`;

        let close = document.querySelector('#close-menu');
        let playerMenu = document.querySelector('#player-menu');
        let runMenu = document.querySelector('#stats');
        let leaderboardBtn = document.querySelector('#leaderboard-btn');
        let resetData = document.querySelector('#reset-data');
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

        // Leaderboard click function
        leaderboardBtn.onclick = function () {
            showLeaderboard();
        };

        // Reset data
        resetData.onclick = function () {
            sfxOpen.play();
            menuModalElement.style.display = "none";
            defaultModalElement.style.display = "flex";
            defaultModalElement.innerHTML = `
            <div class="content">
                <p>Bạn có muốn xóa toàn bộ dữ liệu và chơi lại từ đầu?</p>
                <div class="button-container">
                    <button id="confirm-reset">Đồng Ý</button>
                    <button id="cancel-reset">Hủy Bỏ</button>
                </div>
            </div>`;
            let confirmReset = document.querySelector('#confirm-reset');
            let cancelReset = document.querySelector('#cancel-reset');
            confirmReset.onclick = function () {
                sfxConfirm.play();
                // Delete player data from Firebase
                if (currentUser) {
                    deletePlayerData(currentUser.uid).then(() => {
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
                        player = null;
                        dungeon = null;
                    }).catch((error) => {
                        console.error("Error deleting data:", error);
                    });
                }
            };
            cancelReset.onclick = function () {
                sfxDecline.play();
                defaultModalElement.style.display = "none";
                defaultModalElement.innerHTML = "";
                menuModalElement.style.display = "flex";
            };
        };

        // Logout
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
            confirmLogout.onclick = function () {
                sfxConfirm.play();
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
                logoutPlayer();
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
        // Hide other main screens to avoid showing multiple screens at once
        const screens = ["login-screen", "register-screen", "title-screen", "character-creation", "dungeon-main", "loading"];
        screens.forEach(s => {
            try { const el = document.querySelector(`#${s}`); if (el) el.style.display = "none"; } catch(e){}
        });
        const target = document.querySelector(`#${id}`);
        if (target) target.style.display = `${display}`;
    }, 1000);
}

// Start the game
const enterDungeon = () => {
    sfxConfirm.play();
    document.querySelector("#title-screen").style.display = "none";
    runLoad("dungeon-main", "flex");
    if (player.inCombat) {
        // Enemy data will be regenerated if needed
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

// Save all the data to Firebase (auto-save will handle this)
const saveData = () => {
    if (currentUser && player) {
        // Data is automatically saved via auto-save in firebase.js
        // This function keeps compatibility with existing code
        updatePlayerData(currentUser.uid, player).catch((error) => {
            console.error("Error saving data:", error);
        });
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
                <h3>Thống Kê</h3>
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
                <p>Passive</p>
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
