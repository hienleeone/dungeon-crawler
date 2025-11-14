// --- Replace previous window.addEventListener("load", ...) block with this ---
window.startGameAfterLogin = async function () {
    try {
        // if not logged in, show auth modal (firebase-init will have set currentUid when logged)
        if (!window.currentUid || !window.auth || !window.auth.currentUser) {
            // hide character creation + title for now, show login
            const charEl = document.querySelector("#character-creation");
            const titleEl = document.querySelector("#title-screen");
            if (charEl) charEl.style.display = "none";
            if (titleEl) titleEl.style.display = "none";
            if (window.showAuthModal) window.showAuthModal();
            return;
        }

        // Ensure UI elements exist
        const charEl = document.querySelector("#character-creation");
        const titleEl = document.querySelector("#title-screen");
        if (charEl) charEl.style.display = "none";

        // Load local player if present
        let localPlayer = localStorage.getItem("playerData");

        if (localPlayer) {
            // already have player data -> show title
            if (titleEl) titleEl.style.display = "flex";
        } else {
            // first login: create default player using displayName
            const name = (window.auth.currentUser && window.auth.currentUser.displayName) ? window.auth.currentUser.displayName : "Người chơi";
            player = {
                name: name,
                lvl: 1,
                stats: { hp: 100, hpMax: 100, atk: 5, def: 3, pen: 0, atkSpd: 1, vamp: 0, critRate: 0, critDmg: 50 },
                baseStats: { hp: 500, atk: 100, def: 50, pen: 0, atkSpd: 0.6, vamp: 0, critRate: 0, critDmg: 50 },
                equippedStats: { hp: 0, atk: 0, def: 0, pen: 0, atkSpd: 0, vamp: 0, critRate: 0, critDmg: 0, hpPct: 0, atkPct: 0, defPct: 0, penPct: 0 },
                bonusStats: { hp: 0, atk: 0, def: 0, atkSpd: 0, vamp: 0, critRate: 0, critDmg: 0 },
                exp: { expCurr: 0, expMax: 100, expCurrLvl: 0, expMaxLvl: 100, lvlGained: 0 },
                inventory: { consumables: [], equipment: [] },
                equipped: [], gold: 0, playtime: 0, kills: 0, deaths: 0, inCombat: false
            };

            // calculate stats and save (saveData will write Firestore if available)
            try { calculateStats(); player.stats.hp = player.stats.hpMax; await saveData(); }
            catch (err) { console.warn("Auto-create player save failed", err); }

            if (titleEl) titleEl.style.display = "flex";
        }

        // Title-screen click behavior (go to dungeon or allocate)
        const titleElNow = document.querySelector("#title-screen");
        if (titleElNow) {
            // remove previous listener if any to avoid duplicates
            const newTitle = document.querySelector("#title-screen");
            newTitle.onclick = function () {
                const p = JSON.parse(localStorage.getItem("playerData") || "{}");
                if (p.allocated) enterDungeon();
                else allocationPopup();
            };
        }

        // prevent double-click zoom on mobile
        document.ondblclick = function (e) { e.preventDefault(); };

    } catch (err) {
        console.error("startGameAfterLogin error:", err);
    }
};

// If firebase already set currentUid before scripts reached here, call it once
if (window.currentUid && typeof window.startGameAfterLogin === "function") {
    try { window.startGameAfterLogin(); } catch(e){ console.warn(e); }
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
            <button id="volume-btn">Âm Thanh</button>
            <button id="export-import">Mã Dữ Liệu</button>
            <button id="quit-run">Xóa Hầm Ngục</button>
        </div>`;

        let close = document.querySelector('#close-menu');
        let playerMenu = document.querySelector('#player-menu');
        let runMenu = document.querySelector('#stats');
        let quitRun = document.querySelector('#quit-run');
        let exportImport = document.querySelector('#export-import');
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

        // Quit the current run
        quitRun.onclick = function () {
            sfxOpen.play();
            menuModalElement.style.display = "none";
            defaultModalElement.style.display = "flex";
            defaultModalElement.innerHTML = `
            <div class="content">
                <p>Bạn có muốn xóa hầm ngục này?</p>
                <div class="button-container">
                    <button id="quit-run">Đồng Ý</button>
                    <button id="cancel-quit">Hủy Bỏ</button>
                </div>
            </div>`;
            let quit = document.querySelector('#quit-run');
            let cancel = document.querySelector('#cancel-quit');
            quit.onclick = function () {
                sfxConfirm.play();
                // Clear out everything, send the player back to meny and clear progress.
                bgmDungeon.stop();
                let dimDungeon = document.querySelector('#dungeon-main');
                dimDungeon.style.filter = "brightness(100%)";
                dimDungeon.style.display = "none";
                menuModalElement.style.display = "none";
                menuModalElement.innerHTML = "";
                defaultModalElement.style.display = "none";
                defaultModalElement.innerHTML = "";
                runLoad("title-screen", "flex");
                clearInterval(dungeonTimer);
                clearInterval(playTimer);
                progressReset();
            };
            cancel.onclick = function () {
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

        // Export/Import Save Data
        exportImport.onclick = function () {
            sfxOpen.play();
            let exportedData = exportData();
            menuModalElement.style.display = "none";
            defaultModalElement.style.display = "flex";
            defaultModalElement.innerHTML = `
            <div class="content" id="ei-tab">
                <div class="content-head">
                    <h3>Mã Dữ Liệu</h3>
                    <p id="ei-close"><i class="fa fa-xmark"></i></p>
                </div>
                <h4>Xuất Dữ Liệu</h4>
                <input type="text" id="export-input" autocomplete="off" value="${exportedData}" readonly>
                <button id="copy-export">Sao Chép</button>
                <h4>Nhập Dữ Liệu</h4>
                <input type="text" id="import-input" autocomplete="off">
                <button id="data-import">Đồng Ý</button>
            </div>`;
            let eiTab = document.querySelector('#ei-tab');
            eiTab.style.width = "15rem";
            let eiClose = document.querySelector('#ei-close');
            let copyExport = document.querySelector('#copy-export')
            let dataImport = document.querySelector('#data-import');
            let importInput = document.querySelector('#import-input');
            copyExport.onclick = function () {
                sfxConfirm.play();
                let copyText = document.querySelector('#export-input');
                copyText.select();
                copyText.setSelectionRange(0, 99999);
                navigator.clipboard.writeText(copyText.value);
                copyExport.innerHTML = "Copied!";
            }
            dataImport.onclick = function () {
                importData(importInput.value);
            };
            eiClose.onclick = function () {
                sfxDecline.play();
                defaultModalElement.style.display = "none";
                defaultModalElement.innerHTML = "";
                menuModalElement.style.display = "flex";
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
        enemy = JSON.parse(localStorage.getItem("enemyData"));
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


// Save all the data into Firebase (Firestore) if available; otherwise localStorage
const saveData = async () => {
    const playerData = JSON.stringify(player);
    const dungeonData = JSON.stringify(dungeon);
    const enemyData = JSON.stringify(enemy);
    const volumeData = JSON.stringify(volume);

    // If Firestore is initialized and we have a uid, write to Firestore
    try {
        if (window.db && window.currentUid) {
            // write to collection "players", document = uid
            const docData = {
                player: player,
                dungeon: dungeon,
                enemy: enemy,
                volume: volume,
                updatedAt: Date.now()
            };
            // use dynamic import of firestore functions if not present
            if (typeof window.firebaseSetDoc !== 'undefined') {
                await window.firebaseSetDoc(window.firebaseDoc(window.db, "players", window.currentUid), docData);
            } else {
                // fallback to direct set using modular SDK (if available on window)
                await window.firebaseSetDoc(window.firebaseDoc(window.db, "players", window.currentUid), docData);
            }
            // Optionally mirror to localStorage (kept in case of offline)
            localStorage.setItem("playerData", playerData);
            localStorage.setItem("dungeonData", dungeonData);
            localStorage.setItem("enemyData", enemyData);
            localStorage.setItem("volumeData", volumeData);
            console.log("Saved to Firestore for uid:", window.currentUid);
            return;
        }
    } catch (e) {
        console.warn("Firestore save failed, falling back to localStorage:", e);
    }

    // Default fallback: localStorage
    localStorage.setItem("playerData", playerData);
    localStorage.setItem("dungeonData", dungeonData);
    localStorage.setItem("enemyData", enemyData);
    localStorage.setItem("volumeData", volumeData);
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