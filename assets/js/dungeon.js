const dungeonActivity = document.querySelector("#dungeonActivity");
const dungeonAction = document.querySelector("#dungeonAction");
const dungeonTime = document.querySelector("#dungeonTime");
const floorCount = document.querySelector("#floorCount");
const roomCount = document.querySelector("#roomCount");

let dungeon = {
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

// ===== Dungeon Setup =====
// Enables start and pause on button click
dungeonActivity.addEventListener('click', function () {
    dungeonStartPause();
});

// Sets up the initial dungeon
const initialDungeonLoad = () => {
    // Dungeon data sẽ được load từ Firebase trong auth.js
    // Không cần load từ localStorage nữa
    if (!dungeon || !dungeon.progress) {
        dungeon = {
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
    }
    
    // Luôn reset status về tạm dừng khi load lại
    dungeon.status = {
        exploring: false,
        paused: true,
        event: false,
    };
    
    updateDungeonLog();
    loadDungeonProgress();
    dungeonTime.innerHTML = new Date(dungeon.statistics.runtime * 1000).toISOString().slice(11, 19);
    dungeonAction.innerHTML = "Tạm Dừng...";
    dungeonActivity.innerHTML = "Khám Phá";
    dungeonTimer = setInterval(dungeonEvent, 1000);
    playTimer = setInterval(dungeonCounter, 1000);
}

// Start and Pause Functionality
const dungeonStartPause = () => {
    if (!dungeon.status.paused) {
        sfxPause.play();
        
        // Dừng nhạc khi tạm dừng
        if (typeof bgmDungeon !== 'undefined' && bgmDungeon) {
            bgmDungeon.pause();
        }

        dungeonAction.innerHTML = "Tạm Dừng...";
        dungeonActivity.innerHTML = "Khám Phá";
        dungeon.status.exploring = false;
        dungeon.status.paused = true;
    } else {
        sfxUnpause.play();
        
        // Phát nhạc khi bắt đầu khám phá
        if (typeof bgmDungeon !== 'undefined' && bgmDungeon && !player.inCombat) {
            bgmDungeon.play();
        }

        dungeonAction.innerHTML = "Khám Phá...";
        dungeonActivity.innerHTML = "Tạm dừng";
        dungeon.status.exploring = true;
        dungeon.status.paused = false;
    }
}

// Counts the total time for the current run and total playtime
const dungeonCounter = () => {
    player.playtime++;
    dungeon.statistics.runtime++;
    dungeonTime.innerHTML = new Date(dungeon.statistics.runtime * 1000).toISOString().slice(11, 19);
    saveData();
}

// Loads the floor and room count
const loadDungeonProgress = () => {
    if (dungeon.progress.room > dungeon.progress.roomLimit) {
        dungeon.progress.room = 1;
        dungeon.progress.floor++;
    }
    floorCount.innerHTML = `Tầng ${dungeon.progress.floor}`;
    roomCount.innerHTML = `Phòng ${dungeon.progress.room}`;
}

// ========== Events in the Dungeon ==========
const dungeonEvent = () => {
    if (dungeon.status.exploring && !dungeon.status.event) {
        dungeon.action++;
        let choices;
        let eventRoll;
        let eventTypes = ["blessing", "curse", "treasure", "enemy", "enemy", "nothing", "nothing", "nothing", "nothing", "monarch"];
        if (dungeon.action > 2 && dungeon.action < 6) {
            eventTypes.push("nextroom");
        } else if (dungeon.action > 5) {
            eventTypes = ["nextroom"];
        }
        const event = eventTypes[Math.floor(Math.random() * eventTypes.length)];

        switch (event) {
            case "nextroom":
                dungeon.status.event = true;
                choices = `
                    <div class="decision-panel">
                        <button id="choice1">Đi Vào</button>
                        <button id="choice2">Bỏ Qua</button>
                    </div>`;
                if (dungeon.progress.room == dungeon.progress.roomLimit) {
                    addDungeonLog(`<span class="Heirloom">Bạn đã tìm thấy cửa vào phòng Boss.</span>`, choices);
                } else {
                    addDungeonLog("Bạn đã tìm thấy một cánh cửa.", choices);
                }
                document.querySelector("#choice1").onclick = function () {
                    sfxConfirm.play();
                    if (dungeon.progress.room == dungeon.progress.roomLimit) {
                        guardianBattle();
                    } else {
                        eventRoll = randomizeNum(1, 3);
                        if (eventRoll == 1) {
                            incrementRoom();
                            mimicBattle("door");
                            addDungeonLog("Bạn đã chuyển lên tầng tiếp theo.");
                        } else if (eventRoll == 2) {
                            incrementRoom();
                            choices = `
                                <div class="decision-panel">
                                    <button id="choice1">Mở Rương</button>
                                    <button id="choice2">Bỏ Qua</button>
                                </div>`;
                            addDungeonLog(`Bạn di chuyển đến phòng tiếp theo và tìm thấy một kho báu. Bên trong có một chiếc Rương <i class="fa fa-toolbox"></i>`, choices);
                            document.querySelector("#choice1").onclick = function () {
                                chestEvent();
                            }
                            document.querySelector("#choice2").onclick = function () {
                                dungeon.action = 0;
                                ignoreEvent();
                            };
                        } else {
                            dungeon.status.event = false;
                            incrementRoom();
                            addDungeonLog("Bạn đã chuyển sang phòng tiếp theo.");
                        }
                    }
                };
                document.querySelector("#choice2").onclick = function () {
                    dungeon.action = 0;
                    ignoreEvent();
                };
                break;
            case "treasure":
                dungeon.status.event = true;
                choices = `
                    <div class="decision-panel">
                        <button id="choice1">Mở Rương</button>
                        <button id="choice2">Bỏ Qua</button>
                    </div>`;
                addDungeonLog(`Bạn đã tìm thấy một kho báu. Có một <i class="fa fa-toolbox"></i>Rương bên trong.`, choices);
                document.querySelector("#choice1").onclick = function () {
                    chestEvent();
                }
                document.querySelector("#choice2").onclick = function () {
                    ignoreEvent();
                };
                break;
            case "nothing":
                nothingEvent();
                break;
            case "enemy":
                dungeon.status.event = true;
                choices = `
                    <div class="decision-panel">
                        <button id="choice1">Giao Tranh</button>
                        <button id="choice2">Thoát Khỏi</button>
                    </div>`;
                generateRandomEnemy();
                addDungeonLog(`Bạn đã gặp phải ${enemy.name}.`, choices);
                player.inCombat = true;
                document.querySelector("#choice1").onclick = function () {
                    engageBattle();
                }
                document.querySelector("#choice2").onclick = function () {
                    fleeBattle();
                }
                break;
            case "blessing":
                eventRoll = randomizeNum(1, 2);
                if (eventRoll == 1) {
                    dungeon.status.event = true;
                    blessingValidation();
                    let cost = player.blessing * (500 * (player.blessing * 0.5)) + 750;
                    choices = `
                        <div class="decision-panel">
                            <button id="choice1">Đồng Ý</button>
                            <button id="choice2">Bỏ Qua</button>
                        </div>`;
                    addDungeonLog(`<span class="Legendary">Bạn phát hiện ra Tượng Ban Phước. Bạn có muốn dâng <i class="fas fa-coins" style="color: #FFD700;"></i><span class="Common">${nFormatter(cost)}</span> để nhận phước lành không? (Phước Lành Lv.${player.blessing})</span>`, choices);
                    document.querySelector("#choice1").onclick = function () {
                        if (player.gold < cost) {
                            sfxDeny.play();
                            addDungeonLog("Bạn không có đủ vàng.");
                        } else {
                            player.gold -= cost;
                            sfxConfirm.play();
                            statBlessing();
                        }
                        dungeon.status.event = false;
                    }
                    document.querySelector("#choice2").onclick = function () {
                        ignoreEvent();
                    };
                } else {
                    nothingEvent();
                }
                break;
            case "curse":
                eventRoll = randomizeNum(1, 3);
                if (eventRoll == 1) {
                    dungeon.status.event = true;
                    let curseLvl = Math.round((dungeon.settings.enemyScaling - 1) * 10);
                    let cost = curseLvl * (10000 * (curseLvl * 0.5)) + 5000;
                    choices = `
                            <div class="decision-panel">
                                <button id="choice1">Đồng Ý</button>
                                <button id="choice2">Bỏ Qua</button>
                            </div>`;
                    addDungeonLog(`<span class="Heirloom">Bạn phát hiện ra Tượng Nguyền Rủa. Bạn có muốn dâng <i class="fas fa-coins" style="color: #FFD700;"></i><span class="Common">${nFormatter(cost)}</span> không? Việc này sẽ khiến quái vật trở nên mạnh hơn nhưng cũng giúp chất lượng vật phẩm rơi ra tốt hơn. (Nguyền Lv.${curseLvl})</span>`, choices);
                    document.querySelector("#choice1").onclick = function () {
                        if (player.gold < cost) {
                            sfxDeny.play();
                            addDungeonLog("Bạn không có đủ vàng.");
                        } else {
                            player.gold -= cost;
                            sfxConfirm.play();
                            cursedTotem(curseLvl);
                        }
                        dungeon.status.event = false;
                    }
                    document.querySelector("#choice2").onclick = function () {
                        ignoreEvent();
                    };
                } else {
                    nothingEvent();
                }
                break;
            case "monarch":
                eventRoll = randomizeNum(1, 7);
                if (eventRoll == 1) {
                    dungeon.status.event = true;
                    choices = `
                            <div class="decision-panel">
                                <button id="choice1">Enter</button>
                                <button id="choice2">Ignore</button>
                            </div>`;
                    addDungeonLog(`<span class="Heirloom">Bạn tìm thấy một căn phòng bí ẩn. Có vẻ như có thứ gì đó đang ngủ bên trong.</span>`, choices);
                    document.querySelector("#choice1").onclick = function () {
                        specialBossBattle();
                    }
                    document.querySelector("#choice2").onclick = function () {
                        ignoreEvent();
                    };
                } else {
                    nothingEvent();
                }
        }
    }
}

// ========= Dungeon Choice Events ==========
// Starts the battle
const engageBattle = () => {
    showCombatInfo();
    startCombat(bgmBattleMain);
    addCombatLog(`Bạn đã gặp phải ${enemy.name}.`);
    updateDungeonLog();
}

// Mimic encounter
const mimicBattle = (type) => {
    generateRandomEnemy(type);
    showCombatInfo();
    startCombat(bgmBattleMain);
    addCombatLog(`Bạn đã gặp phải ${enemy.name}.`);
    addDungeonLog(`Bạn đã gặp phải ${enemy.name}.`);
}

// Guardian boss fight
const guardianBattle = () => {
    incrementRoom();
    generateRandomEnemy("guardian");
    showCombatInfo();
    startCombat(bgmBattleGuardian);
    addCombatLog(`Người bảo vệ hầm ${enemy.name} đang chặn đường bạn.`);
    addDungeonLog("Bạn đã chuyển lên tầng tiếp theo.");
}

// Guardian boss fight
const specialBossBattle = () => {
    generateRandomEnemy("sboss");
    showCombatInfo();
    startCombat(bgmBattleBoss);
    addCombatLog(`Dungeon Monarch ${enemy.name} đã thức tỉnh.`);
    addDungeonLog(`Dungeon Monarch ${enemy.name} đã thức tỉnh.`);
}

// Flee from the monster
const fleeBattle = () => {
    let eventRoll = randomizeNum(1, 2);
    if (eventRoll == 1) {
        sfxConfirm.play();
        addDungeonLog(`Bạn đã trốn thoát được.`);
        player.inCombat = false;
        dungeon.status.event = false;
    } else {
        addDungeonLog(`Bạn không trốn thoát được!`);
        showCombatInfo();
        startCombat(bgmBattleMain);
        addCombatLog(`Bạn đã gặp phải ${enemy.name}.`);
        addCombatLog(`Bạn không trốn thoát được!`);
    }
}

// Chest event randomizer
const chestEvent = () => {
    sfxConfirm.play();
    let eventRoll = randomizeNum(1, 4);
    if (eventRoll == 1) {
        mimicBattle("chest");
    } else if (eventRoll == 2) {
        if (dungeon.progress.floor == 1) {
            goldDrop();
        } else {
            createEquipmentPrint("dungeon");
        }
        dungeon.status.event = false;
    } else if (eventRoll == 3) {
        goldDrop();
        dungeon.status.event = false;
    } else {
        addDungeonLog("Chiếc rương trống rỗng.");
        dungeon.status.event = false;
    }
}

// Calculates Gold Drop
const goldDrop = () => {
    sfxSell.play();
    let goldValue = randomizeNum(50, 500) * dungeon.progress.floor;
    addDungeonLog(`Bạn đã tìm thấy <i class="fas fa-coins" style="color: #FFD700;"></i>${nFormatter(goldValue)}.`);
    player.gold += goldValue;
    playerLoadStats();
}

// Non choices dungeon event messages
const nothingEvent = () => {
    let eventRoll = randomizeNum(1, 5);
    if (eventRoll == 1) {
        addDungeonLog("Bạn đã khám phá nhưng không tìm thấy gì.");
    } else if (eventRoll == 2) {
        addDungeonLog("Bạn tìm thấy một chiếc rương trống.");
    } else if (eventRoll == 3) {
        addDungeonLog("Bạn tìm thấy xác một con quái vật.");
    } else if (eventRoll == 4) {
        addDungeonLog("Bạn tìm thấy một xác chết.");
    } else if (eventRoll == 5) {
        addDungeonLog("Không có gì ở khu vực này.");
    }
}

// Random stat buff
const statBlessing = () => {
    sfxBuff.play();
    let stats = ["hp", "atk", "def", "atkSpd", "vamp", "critRate", "critDmg"];
    let buff = stats[Math.floor(Math.random() * stats.length)];
    let value;
    switch (buff) {
        case "hp":
            value = 10;
            player.bonusStats.hp += value;
            break;
        case "atk":
            value = 8;
            player.bonusStats.atk += value;
            break;
        case "def":
            value = 8;
            player.bonusStats.def += value;
            break;
        case "atkSpd":
            value = 3;
            player.bonusStats.atkSpd += value;
            break;
        case "vamp":
            value = 0.5;
            player.bonusStats.vamp += value;
            break;
        case "critRate":
            value = 1;
            player.bonusStats.critRate += value;
            break;
        case "critDmg":
            value = 6;
            player.bonusStats.critDmg += value;
            break;
    }
    addDungeonLog(`Bạn nhận được ${value}% sức mạnh cộng thêm cho ${buff.replace(/([A-Z])/g, ".$1").replace(/crit/g, "c").toUpperCase()} nhờ phước lành. (Phước Lành Lv.${player.blessing} > Phước Lành Lv.${player.blessing + 1})`);
    blessingUp();
    playerLoadStats();
    saveData();
}

// Cursed totem offering
const cursedTotem = (curseLvl) => {
    sfxBuff.play();
    dungeon.settings.enemyScaling += 0.1;
    addDungeonLog(`Lũ quái vật trong hầm ngục trở nên mạnh hơn và chất lượng vật phẩm rơi ra cũng được cải thiện. (Nguyền Lv.${curseLvl} > Nguyền Lv.${curseLvl + 1})`);
    saveData();
}

// Ignore event and proceed exploring
const ignoreEvent = () => {
    sfxConfirm.play();
    dungeon.status.event = false;
    addDungeonLog("Bạn bỏ qua nó và quyết định bước tiếp.");
}

// Increase room or floor accordingly
const incrementRoom = () => {
    dungeon.progress.room++;
    dungeon.action = 0;
    loadDungeonProgress();
}

// Increases player total blessing
const blessingUp = () => {
    blessingValidation();
    player.blessing++;
}

// Validates whether blessing exists or not
const blessingValidation = () => {
    if (player.blessing == undefined) {
        player.blessing = 1;
    }
}

// ========= Dungeon Backlog ==========
// Displays every dungeon activity
const updateDungeonLog = (choices) => {
    let dungeonLog = document.querySelector("#dungeonLog");
    dungeonLog.innerHTML = "";

    // Display the recent 50 dungeon logs
    for (let message of dungeon.backlog.slice(-50)) {
        let logElement = document.createElement("p");
        logElement.innerHTML = message;
        dungeonLog.appendChild(logElement);
    }

    // If the event has choices, display it
    if (typeof choices !== 'undefined') {
        let eventChoices = document.createElement("div");
        eventChoices.innerHTML = choices;
        dungeonLog.appendChild(eventChoices);
    }

    dungeonLog.scrollTop = dungeonLog.scrollHeight;
}

// Add a log to the dungeon backlog
const addDungeonLog = (message, choices) => {
    dungeon.backlog.push(message);
    updateDungeonLog(choices);
}

// Evaluate a dungeon difficulty
const evaluateDungeon = () => {
    let base = 500;
    // Work in Progress
}