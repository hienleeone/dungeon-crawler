
// Firebase-integrated player manager (auto-inserted)
let player = null;
let currentUser = null;
let remoteUnsubscribe = null;

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

async function savePlayerLocal() {
  try {
    savePlayer(, JSON.stringify(player));
  } catch (e) { console.warn(e); }
}
const savePlayerRemoteDebounced = debounce(async () => {
  if (!currentUser || !player) return;
  try {
    const { db, doc, setDoc } = window._fb;
    const ref = doc(db,"players",currentUser.uid);
    await setDoc(ref,{playerData:player,updatedAt:Date.now()},{merge:true});
  } catch(e){ console.error("Save remote error",e); }
},800);

async function savePlayer(){ savePlayerLocal(); savePlayerRemoteDebounced(); }

function createDefaultPlayer() {
  // Minimal default player structure inferred from code usage
  return {
    name: currentUser ? (currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : "Player")) : "Player",
    gold: 0,
    level: 1,
    lvl: 1,
    exp: { expCurr: 0, expCurrLvl: 0, expMax: 50, expMaxLvl: 50 },
    inventory: [],
    allocated: false
  };
}

async function initPlayerForUser(user) {
  currentUser = user;
  const { db, doc, getDoc, setDoc, onSnapshot } = window._fb;
  const ref = doc(db, "players", user.uid);
  // If local exists and remote doesn't, migrate
  const localRaw = window.player;
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      if (localRaw) {
        try {
          const local = JSON.parse(localRaw);
          await setDoc(ref, { playerData: local, migratedFromLocalAt: Date.now() });
          player = local;
        } catch (e) {
          player = createDefaultPlayer();
          await setDoc(ref, { playerData: player, createdAt: Date.now() });
        }
      } else {
        player = createDefaultPlayer();
        await setDoc(ref, { playerData: player, createdAt: Date.now() });
      }
    } else {
      const remote = snap.data().playerData;
      if (remote) {
        player = remote;
      } else {
        player = createDefaultPlayer();
      }
    }
  } catch (e) {
    console.warn("initPlayerForUser error:", e);
    player = player || createDefaultPlayer();
  }

  // subscribe to remote changes
  if (remoteUnsubscribe) remoteUnsubscribe();
  try {
    remoteUnsubscribe = onSnapshot(ref, (s) => {
      if (s.exists()) {
        const remote = s.data().playerData;
        if (remote) {
          player = remote;
          savePlayerLocal();
          if (typeof refreshPlayerUI === 'function') refreshPlayerUI();
        }
      }
    });
  } catch(e) { console.warn("onSnapshot error", e); }

  // notify game that player is ready
  if (typeof onPlayerReady === 'function') onPlayerReady();
  // Dispatch DOM event so UI can react when player data is loaded
  window.dispatchEvent(new CustomEvent('playerLoaded', { detail: player }));
}

window.addEventListener('firebaseUserReady', (e) => { initPlayerForUser(e.detail).catch(console.error); });
window.addEventListener('firebaseUserSignedOut', () => {
  currentUser = null;
  if (remoteUnsubscribe) { remoteUnsubscribe(); remoteUnsubscribe = null; }
  player = JSON.parse(window.player) || null;
  if (typeof refreshPlayerUI === 'function') refreshPlayerUI();
});

// Replace direct localStorage usage in other files by encouraging savePlayer()
// Note: original code will still call savePlayerLocal via savePlayer function
// ---- original content continues below ----
const playerExpGain = () => {
    player.exp.expCurr += enemy.rewards.exp;
    player.exp.expCurrLvl += enemy.rewards.exp;

    while (player.exp.expCurr >= player.exp.expMax) {
        playerLvlUp();
    }
    if (leveled) {
        lvlupPopup();
    }

    playerLoadStats();
}

// Levels up the player
const playerLvlUp = () => {
    leveled = true;

    // Calculates the excess exp and the new exp required to level up
    let expMaxIncrease = Math.floor(((player.exp.expMax * 1.1) + 100) - player.exp.expMax);
    if (player.lvl > 100) {
        expMaxIncrease = 1000000;
    }
    let excessExp = player.exp.expCurr - player.exp.expMax;
    player.exp.expCurrLvl = excessExp;
    player.exp.expMaxLvl = expMaxIncrease;

    // Increase player level and maximum exp
    player.lvl++;
    player.exp.lvlGained++;
    player.exp.expMax += expMaxIncrease;

    // Increase player bonus stats per level
    player.bonusStats.hp += 4;
    player.bonusStats.atk += 2;
    player.bonusStats.def += 2;
    player.bonusStats.atkSpd += 0.15;
    player.bonusStats.critRate += 0.1;
    player.bonusStats.critDmg += 0.25;
}

// Refresh the player stats
const playerLoadStats = () => {
    showEquipment();
    showInventory();
    applyEquipmentStats();

    let rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    if (player.stats.hp > player.stats.hpMax) {
        player.stats.hp = player.stats.hpMax;
    }
    player.stats.hpPercent = Number((player.stats.hp / player.stats.hpMax) * 100).toFixed(2).replace(rx, "$1");
    player.exp.expPercent = Number((player.exp.expCurrLvl / player.exp.expMaxLvl) * 100).toFixed(2).replace(rx, "$1");

    // Generate battle info for player if in combat
    if (player.inCombat || playerDead) {
        const playerCombatHpElement = document.querySelector('#player-hp-battle');
        const playerHpDamageElement = document.querySelector('#player-hp-dmg');
        const playerExpElement = document.querySelector('#player-exp-bar');
        const playerInfoElement = document.querySelector('#player-combat-info');
        playerCombatHpElement.innerHTML = `&nbsp${nFormatter(player.stats.hp)}/${nFormatter(player.stats.hpMax)}(${player.stats.hpPercent}%)`;
        playerCombatHpElement.style.width = `${player.stats.hpPercent}%`;
        playerHpDamageElement.style.width = `${player.stats.hpPercent}%`;
        playerExpElement.style.width = `${player.exp.expPercent}%`;
        playerInfoElement.innerHTML = `${player.name} Lv.${player.lvl} (${player.exp.expPercent}%)`;
    }

    // Header
    document.querySelector("#player-name").innerHTML = `<i class="fas fa-user"></i>${player.name} Lv.${player.lvl}`;
    document.querySelector("#player-exp").innerHTML = `<p>Exp</p> ${nFormatter(player.exp.expCurr)}/${nFormatter(player.exp.expMax)} (${player.exp.expPercent}%)`;
    document.querySelector("#player-gold").innerHTML = `<i class="fas fa-coins" style="color: #FFD700;"></i>${nFormatter(player.gold)}`;

    // Player Stats
    playerHpElement.innerHTML = `${nFormatter(player.stats.hp)}/${nFormatter(player.stats.hpMax)} (${player.stats.hpPercent}%)`;
    playerAtkElement.innerHTML = nFormatter(player.stats.atk);
    playerDefElement.innerHTML = nFormatter(player.stats.def);
    playerAtkSpdElement.innerHTML = player.stats.atkSpd.toFixed(2).replace(rx, "$1");
    playerVampElement.innerHTML = (player.stats.vamp).toFixed(2).replace(rx, "$1") + "%";
    playerCrateElement.innerHTML = (player.stats.critRate).toFixed(2).replace(rx, "$1") + "%";
    playerCdmgElement.innerHTML = (player.stats.critDmg).toFixed(2).replace(rx, "$1") + "%";

    // Player Bonus Stats
    document.querySelector("#bonus-stats").innerHTML = `
    <h4>Thông Số Thêm</h4>
    <p><i class="fas fa-heart"></i>HP+${player.bonusStats.hp.toFixed(2).replace(rx, "$1")}%</p>
    <p><i class="ra ra-sword"></i>ATK+${player.bonusStats.atk.toFixed(2).replace(rx, "$1")}%</p>
    <p><i class="ra ra-round-shield"></i>DEF+${player.bonusStats.def.toFixed(2).replace(rx, "$1")}%</p>
    <p><i class="ra ra-plain-dagger"></i>ATK.SPD+${player.bonusStats.atkSpd.toFixed(2).replace(rx, "$1")}%</p>
    <p><i class="ra ra-dripping-blade"></i>VAMP+${player.bonusStats.vamp.toFixed(2).replace(rx, "$1")}%</p>
    <p><i class="ra ra-lightning-bolt"></i>C.RATE+${player.bonusStats.critRate.toFixed(2).replace(rx, "$1")}%</p>
    <p><i class="ra ra-focused-lightning"></i>C.DMG+${player.bonusStats.critDmg.toFixed(2).replace(rx, "$1")}%</p>`;
}

// Opens inventory
const openInventory = () => {
    sfxOpen.play();

    dungeon.status.exploring = false;
    inventoryOpen = true;
    let openInv = document.querySelector('#inventory');
    let dimDungeon = document.querySelector('#dungeon-main');
    openInv.style.display = "flex";
    dimDungeon.style.filter = "brightness(50%)";

    sellAllElement.onclick = function () {
        sfxOpen.play();
        openInv.style.filter = "brightness(50%)";
        let rarity = sellRarityElement.value;

        defaultModalElement.style.display = "flex";
        if (rarity == "Tất Cả") {
            defaultModalElement.innerHTML = `
            <div class="content">
                <p>Bán tất cả vật phẩm?</p>
                <div class="button-container">
                    <button id="sell-confirm">Đồng Ý</button>
                    <button id="sell-cancel">Hủy Bỏ</button>
                </div>
            </div>`;
        } else {
            defaultModalElement.innerHTML = `
            <div class="content">
                <p>Bán vật phẩm loại <span class="${rarity}">${rarity}</span></p>
                <div class="button-container">
                    <button id="sell-confirm">Đồng Ý</button>
                    <button id="sell-cancel">Hủy Bỏ</button>
                </div>
            </div>`;
        }

        let confirm = document.querySelector('#sell-confirm');
        let cancel = document.querySelector('#sell-cancel');
        confirm.onclick = function () {
            sellAll(rarity);
            defaultModalElement.style.display = "none";
            defaultModalElement.innerHTML = "";
            openInv.style.filter = "brightness(100%)";
        };
        cancel.onclick = function () {
            sfxDecline.play();
            defaultModalElement.style.display = "none";
            defaultModalElement.innerHTML = "";
            openInv.style.filter = "brightness(100%)";
        };
    };
    sellRarityElement.onclick = function () {
        sfxOpen.play();
    };
    sellRarityElement.onchange = function () {
        let rarity = sellRarityElement.value;
        sellRarityElement.className = rarity;
    };
}

// Closes inventory
const closeInventory = () => {
    sfxDecline.play();

    let openInv = document.querySelector('#inventory');
    let dimDungeon = document.querySelector('#dungeon-main');
    openInv.style.display = "none";
    dimDungeon.style.filter = "brightness(100%)";
    inventoryOpen = false;
    if (!dungeon.status.paused) {
        dungeon.status.exploring = true;
    }
}

// Continue exploring if inventory is not open and the game is not paused
const continueExploring = () => {
    if (!inventoryOpen && !dungeon.status.paused) {
        dungeon.status.exploring = true;
    }
}

// Shows the level up popup
const lvlupPopup = () => {
    sfxLvlUp.play();
    addCombatLog(`Bạn đã lên cấp! (Lv.${player.lvl - player.exp.lvlGained} > Lv.${player.lvl})`);

    // Recover 20% extra hp on level up
    player.stats.hp += Math.round((player.stats.hpMax * 20) / 100);
    playerLoadStats();

    // Show popup choices
    lvlupPanel.style.display = "flex";
    combatPanel.style.filter = "brightness(50%)";
    const percentages = {
        "hp": 10,
        "atk": 8,
        "def": 8,
        "atkSpd": 3,
        "vamp": 0.5,
        "critRate": 1,
        "critDmg": 6
    };
    generateLvlStats(2, percentages);
}

// Generates random stats for level up popup
const generateLvlStats = (rerolls, percentages) => {
    let selectedStats = [];
    let stats = ["hp", "atk", "def", "atkSpd", "vamp", "critRate", "critDmg"];
    while (selectedStats.length < 3) {
        let randomIndex = Math.floor(Math.random() * stats.length);
        if (!selectedStats.includes(stats[randomIndex])) {
            selectedStats.push(stats[randomIndex]);
        }
    }

    const loadLvlHeader = () => {
        lvlupSelect.innerHTML = `
            <h1>Level Up!</h1>
            <div class="content-head">
                <h4>Còn lại: ${player.exp.lvlGained}</h4>
                <button id="lvlReroll">Tạo lại ${rerolls}/2</button>
            </div>
        `;
    }
    loadLvlHeader();

    const lvlReroll = document.querySelector("#lvlReroll");
    lvlReroll.addEventListener("click", function () {
        if (rerolls > 0) {
            sfxSell.play();
            rerolls--;
            loadLvlHeader();
            generateLvlStats(rerolls, percentages);
        } else {
            sfxDeny.play();
        }
    });

    try {
        for (let i = 0; i < 4; i++) {
            let button = document.createElement("button");
            button.id = "lvlSlot" + i;

            let h3 = document.createElement("h3");
            h3.innerHTML = selectedStats[i].replace(/([A-Z])/g, ".$1").replace(/crit/g, "c").toUpperCase() + " UP";
            button.appendChild(h3);

            let p = document.createElement("p");
            p.innerHTML = `Tăng ${percentages[selectedStats[i]]}% chỉ số ${selectedStats[i].replace(/([A-Z])/g, ".$1").replace(/crit/g, "c").toUpperCase()}.`;
            button.appendChild(p);

            // Increase the selected stat for player
            button.addEventListener("click", function () {
                sfxItem.play();
                player.bonusStats[selectedStats[i]] += percentages[selectedStats[i]];

                if (player.exp.lvlGained > 1) {
                    player.exp.lvlGained--;
                    generateLvlStats(2, percentages);
                } else {
                    player.exp.lvlGained = 0;
                    lvlupPanel.style.display = "none";
                    combatPanel.style.filter = "brightness(100%)";
                    leveled = false;
                }

                playerLoadStats();
                saveData();
            });

            lvlupSelect.appendChild(button);
        }
    } catch (err) { }
}