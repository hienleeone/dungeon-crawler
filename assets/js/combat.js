// combat.js (FULL - server-side authoritative)

// DOM + flags
const combatPanel = document.querySelector("#combatPanel");
let enemyDead = false;
let playerDead = false;

// Combat backlog (messages to show)
const combatBacklog = [];

// Combat timing (for display only)
let combatSeconds = 0;
let combatTimer = null;

// ---------------- Helper: add log & update ----------------
const addCombatLog = (message) => {
  combatBacklog.push(message);
  updateCombatLog();
};

const updateCombatLog = () => {
  let combatLogBox = document.getElementById("combatLogBox");
  if (!combatLogBox) return;
  combatLogBox.innerHTML = "";

  for (let message of combatBacklog) {
    let logElement = document.createElement("p");
    logElement.innerHTML = message;
    combatLogBox.appendChild(logElement);
  }

  if (enemyDead) {
    let button = document.createElement("div");
    button.className = "decision-panel";
    button.innerHTML = `<button id="battleButton">Nhận</button>`;
    combatLogBox.appendChild(button);
  }

  if (playerDead) {
    let button = document.createElement("div");
    button.className = "decision-panel";
    button.innerHTML = `<button id="battleButton">Quay Lại</button>`;
    combatLogBox.appendChild(button);
  }

  combatLogBox.scrollTop = combatLogBox.scrollHeight;

  // Hook battleButton only once (guard)
  const btn = document.getElementById("battleButton");
  if (btn) {
    btn.onclick = () => {
      sfxConfirm && sfxConfirm.play();
      if (playerDead) {
        // Return to title / reset (same as original behavior)
        playerDead = false;
        let dimDungeon = document.querySelector('#dungeon-main');
        if (dimDungeon) {
          dimDungeon.style.filter = "brightness(100%)";
          dimDungeon.style.display = "none";
        }
        combatPanel.style.display = "none";
        runLoad && runLoad("title-screen", "flex");
        clearInterval(dungeonTimer);
        clearInterval(playTimer);
        progressReset && progressReset();
      } else if (enemyDead) {
        // Close fight and return to dungeon exploration
        let dimDungeon = document.querySelector('#dungeon-main');
        if (dimDungeon) {
          dimDungeon.style.filter = "brightness(100%)";
        }
        bgmDungeon && bgmDungeon.play();
        dungeon.status.event = false;
        combatPanel.style.display = "none";
        enemyDead = false;
        combatBacklog.length = 0;
      }
    };
  }
};

// ---------------- UI helpers ----------------
const showCombatInfo = () => {
  document.querySelector('#combatPanel').innerHTML = `
    <div class="content">
        <div class="battle-info-panel center" id="enemyPanel">
            <p id="enemy-title">${enemy.name} Lv.${enemy.lvl}</p>
            <div class="battle-bar empty-bar hp bb-hp">
                <div class="battle-bar dmg bb-hp" id="enemy-hp-dmg"></div>
                <div class="battle-bar current bb-hp" id="enemy-hp-battle">
                    &nbsp${nFormatter(enemy.stats.hp)}/${nFormatter(enemy.stats.hpMax)}<br>(${enemy.stats.hpPercent}%)
                </div>
            </div>
            <div id="dmg-container"></div>
            <img src="./assets/sprites/${enemy.image.name}${enemy.image.type}" alt="${enemy.name}" width="${enemy.image.size}" id="enemy-sprite">
        </div>
        <div class="battle-info-panel primary-panel" id="playerPanel">
            <p id="player-combat-info"></p>
            <div class="battle-bar empty-bar bb-hp">
                <div class="battle-bar dmg bb-hp" id="player-hp-dmg"></div>
                <div class="battle-bar current bb-hp" id="player-hp-battle">
                    &nbsp${nFormatter(player.stats.hp)}/${nFormatter(player.stats.hpMax)}(${player.stats.hpPercent}%)
                </div>
            </div>
            <div class="battle-bar empty-bar bb-xb">
                <div class="battle-bar current bb-xb" id="player-exp-bar">exp</div>
            </div>
        </div>
        <div class="logBox primary-panel">
            <div id="combatLogBox"></div>
        </div>
    </div>
  `;
};

// ---------------- Combat timer (display only) ----------------
const combatCounter = () => {
  combatSeconds++;
};

// ---------------- No-op local combat functions ----------------
// We keep these no-op to avoid other parts of the app calling them accidentally.
// All real combat resolution is done server-side by resolveCombat callable.
const playerAttack = () => { /* disabled - server authoritative */ };
const enemyAttack = () => { /* disabled - server authoritative */ };

// ---------------- Server call helper ----------------
async function callResolveCombat(enemyId) {
  try {
    // Prepare client summary: small, non-authoritative
    const clientSummary = {
      lvl: player.lvl,
      // optional: lightweight hash/checksum if you implement verification on server
      statsHash: (typeof generateChecksum === 'function') ? generateChecksum(player) : null,
      ts: Date.now()
    };

    // functions must be defined in firebase.js: const functions = firebase.functions();
    if (typeof functions === 'undefined') {
      throw new Error('Firebase functions not initialized (missing const functions = firebase.functions())');
    }

    const resolveFn = functions.httpsCallable('resolveCombat');
    const res = await resolveFn({ enemyId, clientSummary });
    return res.data; // expected structure documented in server functions
  } catch (err) {
    console.error('resolveCombat error', err);
    throw err;
  }
}

// ---------------- Apply server result ----------------
function applyCombatResult(result) {
  if (!result) {
    addCombatLog('Không nhận được kết quả từ server.');
    endCombat();
    return;
  }

  // If server returns an authoritative player object, merge it.
  if (result.player && typeof result.player === 'object') {
    // Replace or merge safe fields from server
    // IMPORTANT: server is single source of truth for game-critical fields
    Object.assign(player, result.player);
    // If server returns nested stats object, make sure to update correctly
    if (result.player.stats) {
      player.stats = result.player.stats;
    }
    if (result.player.inventory) {
      player.inventory = result.player.inventory;
    }
  } else {
    // Fallback: update minimal fields returned
    if (typeof result.gold === 'number') player.gold = result.gold;
    if (typeof result.lvl === 'number') player.lvl = result.lvl;
    if (typeof result.xp === 'number') player.xp = result.xp;
  }

  // If server returns combatLog (array of strings), display them progressively
  if (Array.isArray(result.combatLog) && result.combatLog.length > 0) {
    // optional: animate logs with small delay for drama
    (async () => {
      for (let line of result.combatLog) {
        addCombatLog(line);
        // small delay to mimic pacing (200ms)
        await new Promise(r => setTimeout(r, 200));
      }
      finalizeAfterCombat(result);
    })();
  } else {
    // no combatLog provided: show short summary and finalize
    if (result.victory) addCombatLog(`Bạn đã đánh bại ${enemy.name}!`);
    else addCombatLog(`Bạn đã thua trước ${enemy.name}...`);

    addCombatLog(`Bạn nhận được ${nFormatter(result.goldGain || 0)} vàng và ${nFormatter(result.xpGain || 0)} exp.`);
    finalizeAfterCombat(result);
  }
}

// Final UI/state updates and closing steps after server result displayed
function finalizeAfterCombat(result) {
  // Drops
  if (Array.isArray(result.drops) && result.drops.length > 0) {
    player.inventory = player.inventory || { equipment: [] };
    for (let it of result.drops) {
      player.inventory.equipment.push(it);
      addCombatLog(`${enemy.name} rơi ${it.name} (${it.rarity}).`);
    }
  }

  // Set enemy hp to 0 on client UI (server determined death)
  enemy.stats.hp = 0;

  // Optional: if server returned new player.stats.hp, we already merged above.
  // If not, don't modify HP beyond what server told us.

  // Update UI
  playerLoadStats && playerLoadStats();
  enemyLoadStats && enemyLoadStats();

  // Show accept / return button
  enemyDead = !!result.victory;
  playerDead = !result.victory && !!result.playerDead; // if server informs death

  updateCombatLog();

  // End combat (stops timers, cleans up buffs)
  endCombat();
}

// ---------------- Start combat (client triggers server) ----------------
const startCombat = async (battleMusic) => {
  // UI changes (same as before)
  bgmDungeon && bgmDungeon.pause();
  sfxEncounter && sfxEncounter.play();
  battleMusic && battleMusic.play();
  player.inCombat = true;

  let dimDungeon = document.querySelector('#dungeon-main');
  if (dimDungeon) dimDungeon.style.filter = "brightness(50%)";

  playerLoadStats && playerLoadStats();
  enemyLoadStats && enemyLoadStats();

  dungeon.status.event = true;
  combatPanel.style.display = "flex";

  showCombatInfo();

  // Start display timer only (not used for resolution)
  combatSeconds = 0;
  combatTimer = setInterval(combatCounter, 1000);

  // Call server to resolve combat and get authoritative result
  try {
    const result = await callResolveCombat(enemy.id);
    applyCombatResult(result);
  } catch (err) {
    console.error('Lỗi khi gọi server combat:', err);
    addCombatLog('Lỗi kết nối tới server. Vui lòng thử lại.');
    // fallback: close combat gracefully
    setTimeout(() => {
      combatPanel.style.display = "none";
      dungeon.status.event = false;
      player.inCombat = false;
    }, 2000);
  }
};

// ---------------- End combat cleanup ----------------
const endCombat = () => {
  try {
    bgmBattleMain && bgmBattleMain.stop();
    bgmBattleGuardian && bgmBattleGuardian.stop();
    bgmBattleBoss && bgmBattleBoss.stop();
  } catch (e) { /* ignore */ }

  sfxCombatEnd && sfxCombatEnd.play();
  player.inCombat = false;

  // Remove temporary buffs (client-only). IMPORTANT: do NOT call saveData()
  // because saveData may attempt to write game-critical fields. We only adjust local temp stats.
  if (player.skills && player.skills.includes("Rampager")) {
    objectValidation && objectValidation();
    player.baseStats.atk -= (player.tempStats ? player.tempStats.atk : 0) || 0;
    if (player.tempStats) player.tempStats.atk = 0;
  }
  if (player.skills && player.skills.includes("Blade Dance")) {
    objectValidation && objectValidation();
    player.baseStats.atkSpd -= (player.tempStats ? player.tempStats.atkSpd : 0) || 0;
    if (player.tempStats) player.tempStats.atkSpd = 0;
  }

  // Stops every timer in combat
  if (combatTimer) {
    clearInterval(combatTimer);
    combatTimer = null;
  }
  combatSeconds = 0;
};

// ---------------- Small utility: safe show on load ----------------
try {
  // expose for debugging if needed (will not expose sensitive save functions)
  window.startCombatServer = startCombat;
  window.callResolveCombat = callResolveCombat;
} catch (e) { /* ignore */ }
