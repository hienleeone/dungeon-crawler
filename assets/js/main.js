// Import Firebase functions (firebase.js MUST load before main.js)
import {
    onAuthChanged,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    loadPlayerData,
    savePlayerData,
    deletePlayerData,
    getTopBy
} from "./assets/js/firebase.js";

// FIREBASE USER + GAME DATA
let currentUser = null;
let currentGameData = null;

// GAME GLOBALS
let player = null;
let dungeon = null;
let enemy = null;
let volume = { master: 1, bgm: 1, sfx: 1 };

// DOM SHORTCUTS
const defaultModalElement = document.querySelector("#defaultModal");
const confirmationModalElement = document.querySelector("#confirmationModal");
const menuModalElement = document.querySelector("#menuModal");

// ===============================
// 1. KHỞI TẠO DỮ LIỆU TỪ FIREBASE
// ===============================

function initGameStateFromData(data) {
    player = data.player || {};
    dungeon = data.dungeon || {};
    enemy = data.enemy || {};
    volume = data.volume || { master: 1, bgm: 1, sfx: 1 };

    // SET MẶC ĐỊNH KHI MISSING
    player.baseStats = player.baseStats || {
        hp: 500, atk: 100, def: 50, pen: 0,
        atkSpd: 0.6, vamp: 0, critRate: 0, critDmg: 50
    };

    dungeon.progress = dungeon.progress || { floor: 1, room: 1 };
    dungeon.statistics = dungeon.statistics || { kills: 0, runtime: 0 };
    dungeon.status = dungeon.status || {
        exploring: false,
        paused: true,
        event: false
    };
}


// ===============================
// 2. FIREBASE AUTH STATE LISTENER
// ===============================

onAuthChanged(async (user, data) => {
    currentUser = user;
    currentGameData = data;

    // CHƯA ĐĂNG NHẬP → SHOW LOGIN
    if (!user) {
        document.querySelector("#auth-screen").style.display = "flex";
        document.querySelector("#title-screen").style.display = "none";
        document.querySelector("#character-creation").style.display = "none";
        return;
    }

    // ĐÃ ĐĂNG NHẬP → NẾU CHƯA CÓ GAME DATA → TẠO TRỐNG
    if (!currentGameData) {
        currentGameData = {
            player: {
                name: "Player",
                lvl: 1,
                stats: {},
                baseStats: {
                    hp: 500, atk: 100, def: 50, pen: 0,
                    atkSpd: 0.6, vamp: 0, critRate: 0, critDmg: 50
                },
                equippedStats: {},
                bonusStats: {},
                exp: { expCurr: 0, expMax: 100, expCurrLvl: 0, expMaxLvl: 100, lvlGained: 0 },
                inventory: { consumables: [], equipment: [] },
                equipped: [],
                gold: 0, playtime: 0, kills: 0, deaths: 0,
                inCombat: false, allocated: false
            },
            dungeon: {
                progress: { floor: 1, room: 1 },
                statistics: { kills: 0, runtime: 0 },
                status: { exploring: false, paused: true, event: false },
                settings: { enemyBaseLvl: 1, enemyLvlGap: 5, enemyBaseStats: 1, enemyScaling: 1.1 },
                floorMax: 1
            },
            meta: { createdAt: Date.now(), updatedAt: Date.now() }
        };

        await savePlayerData(user.uid, currentGameData);
    }

    // LOAD VÀO GAME
    initGameStateFromData(currentGameData);

    // HIDE LOGIN → SHOW TITLE
    document.querySelector("#auth-screen").style.display = "none";
    document.querySelector("#title-screen").style.display = "flex";
});


// ===============================
// 3. ĐĂNG NHẬP / ĐĂNG KÝ
// ===============================

document.querySelector("#login-btn").onclick = async () => {
    let email = document.querySelector("#login-email").value;
    let pw = document.querySelector("#login-password").value;

    try {
        await signInWithEmail({ email, password: pw });
    } catch (err) {
        alert("Sai thông tin đăng nhập!");
    }
};

document.querySelector("#register-btn").onclick = async () => {
    let email = document.querySelector("#reg-email").value;
    let pw = document.querySelector("#reg-password").value;
    let pw2 = document.querySelector("#reg-password2").value;
    let username = document.querySelector("#reg-username").value.trim();

    if (pw !== pw2) return alert("Mật khẩu nhập lại không khớp!");

    try {
        await signUpWithEmail({ email, password: pw, username });
    } catch (err) {
        if (err.code === "USERNAME_TAKEN") {
            alert("Tên này đã có người dùng!");
        } else {
            alert("Đăng ký thất bại!");
        }
    }
};


// ===============================
// 4. HÀM SAVE ( Firebase thay LocalStorage )
// ===============================

async function saveData() {
    if (!currentUser) return;

    const payload = {
        player,
        dungeon,
        enemy,
        volume,
        meta: { updatedAt: Date.now() }
    };

    try {
        await savePlayerData(currentUser.uid, payload);
    } catch (err) {
        console.error("SAVE ERROR:", err);
    }
}


// ===============================
// 5. LOADING
// ===============================

const runLoad = (id, display) => {
    let loader = document.querySelector("#loading");
    loader.style.display = "flex";
    setTimeout(() => {
        loader.style.display = "none";
        document.querySelector(`#${id}`).style.display = display;
    }, 600);
};


// ===============================
// 6. ENTER DUNGEON (Firebase Version)
// ===============================

function enterDungeon() {
    sfxConfirm.play();
    document.querySelector("#title-screen").style.display = "none";
    runLoad("dungeon-main", "flex");

    if (player.inCombat && enemy) {
        showCombatInfo();
        startCombat(bgmBattleMain);
    } else {
        bgmDungeon.play();
    }

    if (player.stats.hp <= 0) {
        progressReset();
    }

    initialDungeonLoad();
    playerLoadStats();
}

// =====================================
// 7. NÚT "ĐĂNG XUẤT" THAY CHO "MÃ DỮ LIỆU"
// =====================================

document.querySelector("#menu-logout").onclick = async () => {
    const ok = confirm("Bạn có chắc muốn đăng xuất?");
    if (!ok) return;

    await signOut();
    location.reload();
};


// =====================================
// 8. "XÓA DỮ LIỆU" THAY CHO "XÓA HẦM NGỤC"
// =====================================

document.querySelector("#menu-reset-data").onclick = async () => {
    if (!currentUser) return;

    const ok = confirm("Bạn có chắc muốn xóa toàn bộ dữ liệu và chơi lại từ đầu?");
    if (!ok) return;

    await deletePlayerData(currentUser.uid);

    // Reset game state về mặc định
    player = null;
    dungeon = null;
    enemy = null;

    location.reload();
};


// ===============================
// 9. AUTO-SAVE MỖI 20 GIÂY
// ===============================
setInterval(() => {
    if (currentUser) saveData();
}, 20000);


// ===============================
// 10. HÌNH THỨC BẮT ĐẦU GAME SAU TẠO NHÂN VẬT
// ===============================

function goToTitleScreen() {
    document.querySelector("#character-creation").style.display = "none";
    runLoad("title-screen", "flex");
}

document.querySelector("#char-create-confirm").onclick = async () => {
    const name = document.querySelector("#char-create-name").value.trim();
    if (!name) return alert("Tên không được để trống!");

    // Kiểm tra trùng tên qua Firestore (bạn đã có usernames collection)
    try {
        await savePlayerData(currentUser.uid, {
            player: { ...player, name },
        });
    } catch (err) {
        alert("Đã có người sử dụng tên này!");
        return;
    }

    player.name = name;

    goToIntroSequence();
};


// ===============================
// 11. INTRO: NHẤN ĐỂ KHÁM PHÁ HẦM NGỤC
// ===============================

function goToIntroSequence() {
    document.querySelector("#character-creation").style.display = "none";
    document.querySelector("#title-screen").style.display = "none";

    const intro = document.querySelector("#intro-screen");
    intro.style.display = "flex";

    intro.onclick = () => {
        intro.style.display = "none";
        showStatIntro();
    };
}


// ===============================
// 12. GIỚI THIỆU CHỈ SỐ → TIẾN HÀNH
// ===============================

function showStatIntro() {
    const statIntro = document.querySelector("#stat-intro");
    statIntro.style.display = "flex";

    document.querySelector("#stat-intro-btn").onclick = () => {
        statIntro.style.display = "none";
        saveData();
        goToTitleScreen();
    };
}


// ===============================
// 13. CẬP NHẬT GÓC QUAN SÁT COMBAT
// ===============================

function showCombatInfo() {
    const ui = document.querySelector("#combat-info");
    ui.querySelector(".hp").innerText = `${player.stats.hp} / ${player.stats.hpMax}`;
    ui.querySelector(".atk").innerText = player.stats.atk;
    ui.querySelector(".def").innerText = player.stats.def;
    ui.querySelector(".floor").innerText = `Tầng ${dungeon.progress.floor}`;
}


// ===============================
// 14. RESET PROGRESS SAU KHI CHẾT
// ===============================

function progressReset() {
    player.stats.hp = player.stats.hpMax;
    dungeon.progress = { floor: 1, room: 1 };

    saveData();
}


// ===============================
// 15. MENU IN-GAME
// ===============================

document.querySelector("#menu-btn").onclick = () => {
    menuModalElement.style.display = "flex";
};

document.querySelector("#menu-close").onclick = () => {
    menuModalElement.style.display = "none";
};


// ===============================
// 16. LEADERBOARD (TOP 3)
// ===============================

document.querySelector("#menu-leaderboard").onclick = async () => {
    const lb = document.querySelector("#leaderboard-screen");
    lb.style.display = "flex";

    const goldTop = await getTopBy("player.gold");
    const lvlTop = await getTopBy("player.lvl");
    const floorTop = await getTopBy("dungeon.floorMax");

    lb.querySelector("#lb-gold").innerHTML = goldTop
        .map((e, i) => `<p>Top ${i + 1}: ${e.data.player.name} — ${e.data.player.gold} vàng</p>`)
        .join("");

    lb.querySelector("#lb-lvl").innerHTML = lvlTop
        .map((e, i) => `<p>Top ${i + 1}: ${e.data.player.name} — cấp ${e.data.player.lvl}</p>`)
        .join("");

    lb.querySelector("#lb-floor").innerHTML = floorTop
        .map((e, i) => `<p>Top ${i + 1}: ${e.data.player.name} — tầng ${e.data.dungeon.floorMax}</p>`)
        .join("");
};

document.querySelector("#lb-close").onclick = () => {
    document.querySelector("#leaderboard-screen").style.display = "none";
};


// ===============================
// 17. CẬP NHẬT UI CHÍNH
// ===============================

function playerLoadStats() {
    const ui = document.querySelector("#player-stats");
    ui.querySelector(".name").innerText = player.name;
    ui.querySelector(".lvl").innerText = player.lvl;

    ui.querySelector(".hp").innerText = `${player.stats.hp} / ${player.stats.hpMax}`;
    ui.querySelector(".atk").innerText = player.stats.atk;
    ui.querySelector(".def").innerText = player.stats.def;
}

// ===============================
// 18. HÀM TÍNH TOÁN CHỈ SỐ NHÂN VẬT
// ===============================

function recalcPlayerStats() {
    const b = player.baseStats;
    const bonus = player.bonusStats || {};
    const eq = player.equippedStats || {};

    player.stats.hpMax = (b.hp + (bonus.hp || 0) + (eq.hp || 0));
    player.stats.atk = (b.atk + (bonus.atk || 0) + (eq.atk || 0));
    player.stats.def = (b.def + (bonus.def || 0) + (eq.def || 0));
    player.stats.pen = (b.pen + (bonus.pen || 0) + (eq.pen || 0));
    player.stats.atkSpd = (b.atkSpd + (bonus.atkSpd || 0) + (eq.atkSpd || 0));
    player.stats.vamp = (b.vamp + (bonus.vamp || 0) + (eq.vamp || 0));
    player.stats.critRate = (b.critRate + (bonus.critRate || 0) + (eq.critRate || 0));
    player.stats.critDmg = (b.critDmg + (bonus.critDmg || 0) + (eq.critDmg || 0));

    if (player.stats.hp > player.stats.hpMax) {
        player.stats.hp = player.stats.hpMax;
    }
}


// ===============================
// 19. KHỞI TẠO KẺ ĐỊCH
// ===============================

function generateEnemy() {
    const floor = dungeon.progress.floor;
    const settings = dungeon.settings;

    const lvl = settings.enemyBaseLvl + Math.floor((floor - 1) / settings.enemyLvlGap);
    const scale = Math.pow(settings.enemyScaling || 1.1, floor - 1);

    enemy = {
        lvl,
        hp: 300 * scale,
        hpMax: 300 * scale,
        atk: 40 * scale,
        def: 20 * scale,
        exp: 20 * scale,
        gold: 15 * scale
    };
}


// ===============================
// 20. LOAD DUNGEON BAN ĐẦU
// ===============================

function initialDungeonLoad() {
    recalcPlayerStats();
    generateEnemy();
    updateDungeonUI();
}


// ===============================
// 21. UI DUNGEON
// ===============================

function updateDungeonUI() {
    const ui = document.querySelector("#dungeon-ui");

    ui.querySelector(".player-hp").innerText =
        `${player.stats.hp} / ${player.stats.hpMax}`;
    ui.querySelector(".player-atk").innerText = player.stats.atk;
    ui.querySelector(".player-def").innerText = player.stats.def;

    ui.querySelector(".enemy-hp").innerText =
        `${Math.floor(enemy.hp)} / ${Math.floor(enemy.hpMax)}`;
    ui.querySelector(".enemy-lvl").innerText = `Lv ${enemy.lvl}`;

    ui.querySelector(".floor").innerText = `Tầng ${dungeon.progress.floor}`;
    ui.querySelector(".room").innerText = `Phòng ${dungeon.progress.room}`;
}


// ===============================
// 22. COMBAT LOOP
// ===============================

let combatInterval = null;

function startCombat(bgm) {
    clearInterval(combatInterval);

    bgm.play();
    player.inCombat = true;

    combatInterval = setInterval(() => {
        playerAttack();
        enemyAttack();

        updateDungeonUI();

        if (enemy.hp <= 0) {
            clearInterval(combatInterval);
            enemyDefeated();
        }

        if (player.stats.hp <= 0) {
            clearInterval(combatInterval);
            playerDead();
        }

    }, 1000 / player.stats.atkSpd);
}

function stopCombat() {
    clearInterval(combatInterval);
    player.inCombat = false;
}


// ===============================
// 23. PLAYER ATTACK
// ===============================

function playerAttack() {
    const damage = Math.max(5, player.stats.atk - enemy.def);
    enemy.hp -= damage;

    if (enemy.hp < 0) enemy.hp = 0;
}


// ===============================
// 24. ENEMY ATTACK
// ===============================

function enemyAttack() {
    const damage = Math.max(3, enemy.atk - player.stats.def);
    player.stats.hp -= damage;

    if (player.stats.hp < 0) player.stats.hp = 0;
}


// ===============================
// 25. ENEMY DEFEATED
// ===============================

function enemyDefeated() {
    player.kills = (player.kills || 0) + 1;
    player.gold += enemy.gold;

    gainExp(enemy.exp);
    nextRoom();

    saveData();
}


// ===============================
// 26. PLAYER DEAD
// ===============================

function playerDead() {
    player.deaths = (player.deaths || 0) + 1;

    alert("Bạn đã chết! Quay về tầng 1.");
    dungeon.progress = { floor: 1, room: 1 };
    player.stats.hp = player.stats.hpMax;

    saveData();
    initialDungeonLoad();
    updateDungeonUI();
}


// ===============================
// 27. EXP + LEVEL UP
// ===============================

function gainExp(amount) {
    player.exp.expCurr += amount;

    while (player.exp.expCurr >= player.exp.expMax) {
        player.exp.expCurr -= player.exp.expMax;
        player.lvl++;
        player.exp.expMax = Math.floor(player.exp.expMax * 1.2);

        levelUpBonus();
    }
}

function levelUpBonus() {
    player.baseStats.hp += 40;
    player.baseStats.atk += 10;
    player.baseStats.def += 5;

    recalcPlayerStats();
}

// ===============================
// 28. NEXT ROOM / NEXT FLOOR
// ===============================

function nextRoom() {
    dungeon.progress.room++;

    // Nếu vượt quá 10 phòng → sang tầng mới
    if (dungeon.progress.room > 10) {
        dungeon.progress.floor++;
        dungeon.progress.room = 1;

        if (dungeon.progress.floor > (dungeon.floorMax || 1)) {
            dungeon.floorMax = dungeon.progress.floor;
        }
    }

    generateEnemy();
    updateDungeonUI();
}


// ===============================
// 29. TIẾN VỀ TRƯỚC / CHẠY TRỐN
// ===============================

document.querySelector("#btn-forward").onclick = () => {
    if (!player.inCombat) {
        startCombat(bgmBattleMain);
    }
};

document.querySelector("#btn-run").onclick = () => {
    if (!player.inCombat) return;

    stopCombat();
    bgmBattleMain.pause();
    bgmDungeon.play();

    // Người chơi chạy → mất gold
    player.gold = Math.max(0, player.gold - 10);

    updateDungeonUI();
    saveData();
};


// ===============================
// 30. MỞ THỐNG KÊ NHÂN VẬT
// ===============================

document.querySelector("#btn-stats").onclick = () => {
    const box = document.querySelector("#stats-box");
    box.style.display = "flex";

    box.querySelector(".name").innerText = player.name;
    box.querySelector(".lvl").innerText = player.lvl;

    box.querySelector(".hp").innerText =
        `${player.stats.hpMax}`;
    box.querySelector(".atk").innerText = player.stats.atk;
    box.querySelector(".def").innerText = player.stats.def;
    box.querySelector(".spd").innerText = player.stats.atkSpd.toFixed(2);
    box.querySelector(".crit").innerText = player.stats.critRate + "%";

    // EXP BAR
    const bar = box.querySelector(".exp-bar");
    const percent = (player.exp.expCurr / player.exp.expMax) * 100;
    bar.style.width = percent + "%";
};

document.querySelector("#stats-close").onclick = () => {
    document.querySelector("#stats-box").style.display = "none";
};


// ===============================
// 31. ÂM THANH
// ===============================

const bgmDungeon = new Audio("./assets/audio/bgm_dungeon.mp3");
const bgmBattleMain = new Audio("./assets/audio/bgm_battle.mp3");
const sfxConfirm = new Audio("./assets/audio/sfx_confirm.wav");

bgmDungeon.loop = true;
bgmBattleMain.loop = true;


// ===============================
// 32. CÀI ĐẶT ÂM LƯỢNG
// ===============================

function applyVolume() {
    bgmDungeon.volume = volume.bgm * volume.master;
    bgmBattleMain.volume = volume.bgm * volume.master;
    sfxConfirm.volume = volume.sfx * volume.master;
}

document.querySelector("#volume-master").oninput = e => {
    volume.master = e.target.value;
    applyVolume();
    saveData();
};

document.querySelector("#volume-bgm").oninput = e => {
    volume.bgm = e.target.value;
    applyVolume();
    saveData();
};

document.querySelector("#volume-sfx").oninput = e => {
    volume.sfx = e.target.value;
    applyVolume();
    saveData();
};


// ===============================
// 33. INVENTORY (DÙNG FIREBASE)
// ===============================

function addToInventory(item) {
    if (!player.inventory) {
        player.inventory = { consumables: [], equipment: [] };
    }

    if (item.type === "consumable") {
        player.inventory.consumables.push(item);
    } else if (item.type === "equipment") {
        player.inventory.equipment.push(item);
    }

    saveData();
}

function equipItem(item) {
    if (!player.equipped) player.equipped = [];

    player.equipped.push(item);

    // Add stats
    for (const k in item.stats) {
        if (!player.equippedStats[k]) player.equippedStats[k] = 0;
        player.equippedStats[k] += item.stats[k];
    }

    recalcPlayerStats();
    saveData();
}


// ===============================
// 34. MỞ BẢNG INVENTORY
// ===============================

document.querySelector("#btn-inventory").onclick = () => {
    const box = document.querySelector("#inventory-box");
    box.style.display = "flex";

    const list = box.querySelector(".items");
    list.innerHTML = "";

    const eq = player.inventory?.equipment || [];
    const co = player.inventory?.consumables || [];

    [...eq, ...co].forEach(item => {
        const el = document.createElement("div");
        el.className = "inv-item";
        el.innerHTML = `
            <p>${item.name}</p>
            <small>${item.type}</small>
        `;
        list.appendChild(el);
    });
};

document.querySelector("#inventory-close").onclick = () => {
    document.querySelector("#inventory-box").style.display = "none";
};


// ===============================
// 35. SỬA LỖI HOẶC RESET DỮ LIỆU LẠI
// ===============================

function fullResetData() {
    dungeon.progress = { floor: 1, room: 1 };
    player.stats.hp = player.stats.hpMax;
    enemy = null;
    generateEnemy();
    saveData();
    updateDungeonUI();
}


// ===============================
// 36. BUTTON TỰ ĐỘNG QUAY LẠI TITLE
// ===============================

document.querySelector("#title-return").onclick = () => {
    if (player.inCombat) stopCombat();
    bgmBattleMain.pause();
    bgmDungeon.pause();

    runLoad("title-screen", "flex");

    document.querySelector("#dungeon-main").style.display = "none";
};

// ===========================================================
// 37. OVERRIDE LOCAL SAVE → TẤT CẢ LƯU LÊN FIREBASE
// ===========================================================

async function saveData() {
    if (!currentUser) return;
    if (!currentGameData) currentGameData = {};

    currentGameData.player = player;
    currentGameData.dungeon = dungeon;

    await savePlayerData(currentUser.uid, currentGameData);
}


// ===========================================================
// 38. XÓA DỮ LIỆU USER → FIREBASE DELETE + RESET GAME
// ===========================================================

async function wipeAllGameData() {
    if (!currentUser) return;

    await deletePlayerData(currentUser.uid);

    // Reset client
    player = null;
    dungeon = null;
    enemy = null;

    runLoad("auth-screen", "flex");
    document.querySelector("#dungeon-main").style.display = "none";
    document.querySelector("#title-screen").style.display = "none";
}


// ===========================================================
// 39. MENU → NÚT “XÓA DỮ LIỆU”
// ===========================================================

document.addEventListener("click", (e) => {
    if (e.target.id === "quit-run") {
        sfxOpen.play();

        defaultModalElement.style.display = "flex";
        defaultModalElement.innerHTML = `
            <div class="content">
                <p>Bạn có chắc muốn <b>xóa toàn bộ dữ liệu</b> không?</p>
                <div class="button-container">
                    <button id="btn-delete-yes">Xóa</button>
                    <button id="btn-delete-no">Hủy</button>
                </div>
            </div>
        `;

        document.querySelector("#btn-delete-yes").onclick = async () => {
            await wipeAllGameData();
        };

        document.querySelector("#btn-delete-no").onclick = () => {
            defaultModalElement.style.display = "none";
        };
    }
});


// ===========================================================
// 40. NÚT “ĐĂNG XUẤT”
// ===========================================================

document.addEventListener("click", (e) => {
    if (e.target.id === "export-import") {  // đã đổi thành "Đăng Xuất"
        sfxConfirm.play();
        signOut();
    }
});


// ===========================================================
// 41. LEADERBOARD — TOP 3 GOLD / LEVEL / FLOOR
// ===========================================================

async function openLeaderboard() {
    const box = document.querySelector("#leaderboard-box");
    box.style.display = "flex";

    // Top 3 vàng
    const topGold = await getTopBy("player.gold", 3);
    const topLvl = await getTopBy("player.lvl", 3);
    const topFloor = await getTopBy("dungeon.floorMax", 3);

    box.querySelector(".gold-list").innerHTML = renderRank(topGold);
    box.querySelector(".lvl-list").innerHTML = renderRank(topLvl);
    box.querySelector(".floor-list").innerHTML = renderRank(topFloor);
}

function renderRank(arr) {
    return arr
        .map((u, i) => `
            <div class="rank-item">
                <span class="rank-num">#${i + 1}</span>
                <span class="rank-name">${u.data.player.name}</span>
                <span class="rank-val">${u.value}</span>
            </div>
        `)
        .join("");
}

document.querySelector("#leaderboard-close").onclick = () => {
    document.querySelector("#leaderboard-box").style.display = "none";
};


// ===========================================================
// 42. NÚT MỞ LEADERBOARD TRONG MENU
// ===========================================================

document.addEventListener("click", (e) => {
    if (e.target.id === "btn-leaderboard") {
        openLeaderboard();
    }
});


// ===========================================================
// 43. KHỞI TẠO UI KHI LOAD FIREBASE DỮ LIỆU
// ===========================================================

function applyGameData() {
    if (!currentGameData) return;

    player = currentGameData.player;
    dungeon = currentGameData.dungeon;

    recalcPlayerStats();
    updateDungeonUI();
}


// ===========================================================
// 44. FIX KHI ĐANG COMBAT MÀ LOAD LẠI
// ===========================================================

function safeLoadCombat() {
    if (player.inCombat && enemy) {
        showCombatInfo();
        startCombat(bgmBattleMain);
    }
}


// ===========================================================
// 45. STARTUP — ĐỢI AUTH READY RỒI CHẠY GAME
// ===========================================================

window.addEventListener("load", () => {
    // Firebase listener (đã viết ở phần 1)
    // sẽ tự gọi applyGameData() khi user đăng nhập
});