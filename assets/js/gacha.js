
/* assets/js/gacha.js
   Offline Gacha system integrated with existing dungeon-crawler game structure.
   - Uses global `player`, `createEquipment()`, `saveData()`, `playerLoadStats()`
   - Deducts gold, grants equipment or consumables to player.inventory
   - Supports single roll and multi-roll (10x)
   - Rarity table matches game's 6 rarities: Divine, Mythic, Legendary, Epic, Rare, Common
   - All probabilities expressed in percent and sum to 100
*/

// -------- CONFIG --------
const GACHA_COST = 100; // default cost per roll, adjust as needed

// Rarity pool (percent). Sum must be 100.
const GACHA_RARITIES = [
  { key: 'Divine',   chance: 0.5 },
  { key: 'Mythic',   chance: 1.5 },
  { key: 'Legendary',chance: 5 },
  { key: 'Epic',     chance: 10 },
  { key: 'Rare',     chance: 23 },
  { key: 'Common',   chance: 60 }
];

// Map rarity -> internal numeric tier (optional)
const RARITY_TIER = {
  'Common': 1,
  'Rare': 2,
  'Epic': 3,
  'Legendary': 4,
  'Mythic': 5,
  'Divine': 6
};

// Consumable samples to award for lower rarities (you can change ids)
const CONSUMABLE_POOL = {
  'Common': ['potion_small', 'bomb_small'],
  'Rare'  : ['potion_medium', 'bomb_medium'],
  'Epic'  : ['potion_large'],
  'Legendary': ['elixir_minor'],
  'Mythic': ['elixir_major'],
  'Divine': ['elixir_divine']
};

// ------------- Utilities -------------
function pickRarity() {
  const r = Math.random() * 100;
  let acc = 0;
  for (const row of GACHA_RARITIES) {
    acc += row.chance;
    if (r <= acc) return row.key;
  }
  // Fallback
  return GACHA_RARITIES[GACHA_RARITIES.length - 1].key;
}

function pickConsumableForRarity(rarity) {
  const pool = CONSUMABLE_POOL[rarity] || CONSUMABLE_POOL['Common'];
  return pool[Math.floor(Math.random() * pool.length)];
}

// Create equipment with appropriate rarity and some tweaks
function createEquipmentForRarity(rarity) {
  if (typeof createEquipment !== 'function') {
    console.warn('createEquipment() not found — falling back to simple item object');
    return {
      category: 'Unknown',
      attribute: 'Unknown',
      type: 'Misc',
      rarity: rarity,
      lvl: Math.max(1, Math.floor((dungeon?.progress?.floor || 1) / 2)),
      tier: RARITY_TIER[rarity] || 1,
      value: 10,
      stats: []
    };
  }

  // Use the existing createEquipment() generator
  const item = createEquipment();

  // Force rarity/tier/level to match gacha rarity
  item.rarity = rarity;
  item.tier = RARITY_TIER[rarity] || item.tier || 1;

  // Scale level/value with rarity slightly
  const rarityScale = item.tier;
  item.lvl = Math.max(1, Math.floor((dungeon?.progress?.floor || 1) * (0.5 + rarityScale * 0.6)));
  item.value = Math.round((item.value || 10) * (1 + rarityScale * 0.6));

  return item;
}

// ------------- Main functions -------------
/**
 * doGacha - perform one roll for the given player object.
 * - player: global player object (if omitted, uses global `player`)
 * - cost: how much gold to spend (defaults to GACHA_COST)
 *
 * Returns an object: { ok: true/false, error?:string, reward?:{type:'equipment'|'consumable', rarity, data} }
 */
function doGachaRoll(playerObj, cost = GACHA_COST) {
  const p = playerObj || (typeof player !== 'undefined' ? player : null);
  if (!p) return { ok: false, error: 'Player object not found' };

  if (typeof p.gold !== 'number') p.gold = 0;
  if (p.gold < cost) return { ok: false, error: 'Không đủ vàng' };

  // Deduct gold
  p.gold -= cost;

  // Pick rarity
  const rarity = pickRarity();

  // Decide reward type: for Common/Rare -> more likely consumable; Epic+ -> equipment
  let reward = null;
  if (['Epic', 'Legendary', 'Mythic', 'Divine'].includes(rarity)) {
    // create equipment and push as JSON string (matches existing equipment system)
    const equip = createEquipmentForRarity(rarity);
    // Ensure rarity/tier set on equipment object
    equip.rarity = rarity;
    equip.tier = RARITY_TIER[rarity] || equip.tier || 1;
    // Push as JSON.stringify to match equipment.js expectations
    if (!p.inventory) p.inventory = { consumables: [], equipment: [] };
    if (!Array.isArray(p.inventory.equipment)) p.inventory.equipment = [];
    p.inventory.equipment.push(JSON.stringify(equip));
    reward = { type: 'equipment', rarity, data: equip };
  } else {
    // Give a consumable item id
    if (!p.inventory) p.inventory = { consumables: [], equipment: [] };
    if (!Array.isArray(p.inventory.consumables)) p.inventory.consumables = [];
    const consumableId = pickConsumableForRarity(rarity);
    p.inventory.consumables.push(consumableId);
    reward = { type: 'consumable', rarity, data: { id: consumableId } };
  }

  // Persist and refresh UI using project's functions
  try {
    if (typeof saveData === 'function') saveData();
    if (typeof playerLoadStats === 'function') playerLoadStats();
  } catch (err) {
    console.warn('Unable to call saveData/playerLoadStats:', err);
  }

  return { ok: true, reward };
}

/**
 * doGacha - public function for convenience
 * - Accepts either (player, cost) or (cost) using global player.
 */
function doGacha(arg1, arg2) {
  // If arg1 looks like a player object (has inventory & gold), treat as player
  if (arg1 && typeof arg1 === 'object' && ('inventory' in arg1 || 'gold' in arg1)) {
    return doGachaRoll(arg1, arg2);
  } else {
    // assume arg1 is cost or omitted, use global player
    return doGachaRoll(typeof player !== 'undefined' ? player : null, arg1 || GACHA_COST);
  }
}

/**
 * doGachaBulk - perform multiple rolls (e.g., 10x)
 * - count: number of rolls
 * - costPer: optional cost per roll (defaults to GACHA_COST)
 * Returns { ok, results: [{ok,reward/error}], totalCost, spent }
 */
function doGachaBulk(count = 10, costPer = GACHA_COST, playerObj) {
  const p = playerObj || (typeof player !== 'undefined' ? player : null);
  if (!p) return { ok: false, error: 'Player object not found' };
  const totalCost = count * costPer;
  if (p.gold < totalCost) return { ok: false, error: 'Không đủ vàng cho ' + count + ' lần quay' };

  const results = [];
  for (let i = 0; i < count; i++) {
    const res = doGachaRoll(p, costPer);
    results.push(res);
    if (!res.ok) break;
  }

  return { ok: true, results };
}

// --------- Export to global for console usage ---------
window.doGacha = doGacha;
window.doGachaBulk = doGachaBulk;
window._gacha_pickRarity = pickRarity; // debug helper

if (!document.querySelector("#gachaModal")) {
    const modal = document.createElement("div");
    modal.id = "gachaModal";
    modal.classList.add("modal-container");
    modal.innerHTML = `
        <div class="content">
            <h3>Gacha</h3>
            <p>100 Gold / lần</p>
            <button id="gacha-roll">Gacha 1 Lần</button>
            <button id="gacha-close">Đóng</button>
            <div id="gacha-result"></div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ====== Nút mở modal từ Inventory ======
const menuBtn = document.querySelector("#menu-btn");
if (menuBtn) {
    menuBtn.insertAdjacentHTML("afterend",
        `<button id="open-gacha">Gacha</button>`
    );
}

// ====== Logic mở modal ======
document.addEventListener("click", async (e) => {

    if (e.target.id === "open-gacha") {
        document.querySelector("#gachaModal").style.display = "flex";
    }

    if (e.target.id === "gacha-close") {
        document.querySelector("#gachaModal").style.display = "none";
    }

    if (e.target.id === "gacha-roll") {
        const resultBox = document.querySelector("#gacha-result");

        const result = doGacha(); // dùng logic bạn viết phía trên
        if (!result.ok) {
            resultBox.innerHTML = `<p style="color:red">${result.error}</p>`;
            return;
        }

        resultBox.innerHTML = `
            <p>Bạn nhận được:
                <span class="${result.reward.rarity}">
                    ${result.reward.data.name || result.reward.data.id || "Item"}
                </span>
            </p>
        `;
    }
});