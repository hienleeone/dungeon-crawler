// -------- CONFIG --------
const GACHA_COST = 100; // cost per roll; you can change this value

// Rarity pool (percent) - mirrored from equipment.js default chances (sum = 100)
const GACHA_RARITIES = [
  { key: 'Common', chance: 70 },
  { key: 'Uncommon', chance: 20 },
  { key: 'Rare', chance: 4 },
  { key: 'Epic', chance: 3 },
  { key: 'Legendary', chance: 2 },
  { key: 'Heirloom', chance: 1 }
];

const RARITY_TIER = {
  'Common': 1,
  'Uncommon': 2,
  'Rare': 3,
  'Epic': 4,
  'Legendary': 5,
  'Heirloom': 6
};

const CONSUMABLE_POOL = {
  'Common': ['potion_small', 'bomb_small'],
  'Uncommon': ['potion_small', 'bomb_small'],
  'Rare'  : ['potion_medium', 'bomb_medium'],
  'Epic'  : ['potion_large'],
  'Legendary': ['elixir_minor'],
  'Heirloom': ['elixir_heirloom']
};

// ------------- Utilities -------------
function pickRarity() {
  const r = Math.random() * 100;
  let acc = 0;
  for (const row of GACHA_RARITIES) {
    acc += row.chance;
    if (r <= acc) return row.key;
  }
  return GACHA_RARITIES[GACHA_RARITIES.length - 1].key;
}
function pickConsumableForRarity(rarity) {
  const pool = CONSUMABLE_POOL[rarity] || CONSUMABLE_POOL['Common'];
  return pool[Math.floor(Math.random() * pool.length)];
}

// Try generating equipment of a given rarity by calling createEquipment until match.
// This avoids duplicating the entire equipment generation code.
function createEquipmentForRarity(rarity, maxAttempts = 200) {
  // If createEquipment doesn't exist, fallback to a simple generated object
  if (typeof createEquipment !== 'function') {
    console.warn('createEquipment() not available; using fallback equipment object');
    return {
      category: 'Misc',
      attribute: 'Unknown',
      type: 'Misc',
      rarity: rarity,
      lvl: Math.max(1, Math.floor((dungeon && dungeon.progress && dungeon.progress.floor || 1) / 2)),
      tier: RARITY_TIER[rarity] || 1,
      value: 10,
      name: `${rarity} Item`
    };
  }

  // Attempt generation until desired rarity produced
  for (let i = 0; i < maxAttempts; i++) {
    const item = createEquipment();
    // equipment.js uses equipment.rarity string; try to detect it on the returned item
    const itemRarity = item && item.rarity ? item.rarity : null;
    if (itemRarity === rarity) {
      // ensure tier/name exist
      item.tier = RARITY_TIER[rarity] || item.tier || 1;
      if (!item.name) item.name = `${rarity} ${item.category || item.type || 'Item'}`;
      return item;
    }
  }

  // If not found in attempts, fallback: generate once and override rarity/tier and lightly scale stats/value
  const fallback = createEquipment();
  fallback.rarity = rarity;
  fallback.tier = RARITY_TIER[rarity] || fallback.tier || 1;
  if (!fallback.name) fallback.name = `${rarity} ${fallback.category || fallback.type || 'Item'}`;
  // scale value mildly by tier
  fallback.value = Math.round((fallback.value || 10) * (1 + (fallback.tier || 1) * 0.5));
  return fallback;
}

// ------------- Main functions -------------
function doGachaRoll(playerObj, cost = GACHA_COST) {
  const p = playerObj || (typeof player !== 'undefined' ? player : null);
  if (!p) return { ok: false, error: 'Player object not found' };
  if (typeof p.gold !== 'number') p.gold = 0;
  if (p.gold < cost) return { ok: false, error: 'Không đủ vàng' };

  // Deduct gold
  p.gold -= cost;

  const rarity = pickRarity();
  let reward = null;
  if (['Epic', 'Legendary', 'Heirloom'].includes(rarity) || Math.random() < 0.5 === false) {
    // produce equipment for Epic+, and sometimes for Rare/Uncommon depending on design.
    const equip = createEquipmentForRarity(rarity);
    equip.rarity = rarity;
    equip.tier = RARITY_TIER[rarity] || equip.tier || 1;
    // Ensure inventory structure
    if (!p.inventory) p.inventory = { consumables: [], equipment: [] };
    if (!Array.isArray(p.inventory.equipment)) p.inventory.equipment = [];
    // equipment system in repo stores equipment as JSON string in equipment list
    p.inventory.equipment.push(JSON.stringify(equip));
    reward = { type: 'equipment', rarity, data: equip };
  } else {
    if (!p.inventory) p.inventory = { consumables: [], equipment: [] };
    if (!Array.isArray(p.inventory.consumables)) p.inventory.consumables = [];
    const consumableId = pickConsumableForRarity(rarity);
    p.inventory.consumables.push(consumableId);
    reward = { type: 'consumable', rarity, data: { id: consumableId } };
  }

  // Persist and refresh UI
  try { if (typeof saveData === 'function') saveData(); } catch(e){}
  try { if (typeof playerLoadStats === 'function') playerLoadStats(); } catch(e){}

  return { ok: true, reward };
}

function doGacha(arg1, arg2) {
  if (arg1 && typeof arg1 === 'object' && ('inventory' in arg1 || 'gold' in arg1)) {
    return doGachaRoll(arg1, arg2);
  } else {
    return doGachaRoll(typeof player !== 'undefined' ? player : null, arg1 || GACHA_COST);
  }
}

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

// expose to window
window.doGacha = doGacha;
window.doGachaBulk = doGachaBulk;
window._gacha_pickRarity = pickRarity;

// ================================
// UI hookup - attach to existing #gachaModal if present, else create and insert button after #menu-btn
// This block ensures high z-index and pointer-events so modal is interactive
// ================================

(function uiHookup() {
  // Ensure the inventory/menu button exists before attaching - use DOMContentLoaded to be safe
  const init = () => {
    // locate modal in DOM; if present, ensure style allows interaction
    let modal = document.querySelector('#gachaModal');
    if (modal) {
      modal.style.zIndex = 99999;
      modal.style.pointerEvents = 'auto';
      // ensure content isn't blocking clicks - set display none by default if visible
      if (getComputedStyle(modal).display !== 'none') {
        // keep current state
      }
    } else {
      // create a simple modal container if missing
      modal = document.createElement('div');
      modal.id = 'gachaModal';
      modal.className = 'modal-container';
      modal.style.display = 'none';
      modal.style.zIndex = 99999;
      modal.style.pointerEvents = 'auto';
      modal.innerHTML = `
        <div class="content">
          <div class="content-head">
            <h3>Gacha</h3>
            <p id="gacha-modal-close"><i class="fa fa-xmark"></i></p>
          </div>
          <div style="padding:10px;">
            <p>Giá: <b id="gacha-cost-text">${GACHA_COST}</b> vàng / lần</p>
            <button id="gacha-roll-btn" class="gachabtn">Quay 1 lần</button>
            <button id="gacha-roll10-btn" class="gachabtn" style="margin-top:8px;">Quay 10 lần</button>
            <div id="gacha-result" style="margin-top:12px; min-height:36px; color:#fff;"></div>
            <button id="gacha-close" class="closebtn" style="margin-top:10px; width:100%;">Đóng</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    // Insert open button after menu-btn if not present already
    if (!document.querySelector('#open-gacha')) {
      const menuBtn = document.querySelector('#menu-btn');
      if (menuBtn) {
        menuBtn.insertAdjacentHTML('afterend', `<button id="open-gacha" class="modal-btn" style="margin-top:8px; background:#111; color:#fff; border:1px solid #fff; width:100%;">✨ Gacha</button>`);
      }
    }

    // hookup handlers (use event delegation)
    document.addEventListener('click', (e) => {
      const target = e.target;
      const modalEl = document.getElementById('gachaModal');
      const resultEl = document.getElementById('gacha-result') || document.querySelector('#gachaModal .content div');
      // open modal
      if (target.closest && target.closest('#open-gacha')) {
        if (modalEl) modalEl.style.display = 'flex';
        return;
      }
      // close modal via header X or close button
      if (target.closest && (target.closest('#gacha-modal-close') || target.closest('#gacha-close') || target.closest('#gacha-close-btn') || target.closest('#gacha-close'))) {
        if (modalEl) modalEl.style.display = 'none';
        if (resultEl) resultEl.innerHTML = '';
        return;
      }
      // click outside modal content -> close (only if click on modal container itself)
      if (modalEl && target === modalEl) {
        modalEl.style.display = 'none';
        if (resultEl) resultEl.innerHTML = '';
        return;
      }
      // roll 1
      if (target.closest && target.closest('#gacha-roll') || target.closest && target.closest('#gacha-roll-btn')) {
        if (typeof doGacha !== 'function') {
          if (resultEl) resultEl.innerHTML = `<span style="color:red">Hệ thống gacha chưa sẵn sàng.</span>`;
          return;
        }
        const res = doGacha();
        if (!res.ok) {
          if (resultEl) resultEl.innerHTML = `<span style="color:red">${res.error}</span>`;
          return;
        }
        const r = res.reward;
        const name = (r.type === 'equipment' && r.data && (r.data.name || r.data.type || r.data.category)) ? (r.data.name || r.data.type || r.data.category) : (r.data && (r.data.id || r.data.name) || 'Vật phẩm');
        if (resultEl) resultEl.innerHTML = `<div><b style="color:#ffd700">${r.rarity}</b> → ${name}</div>`;
        // refresh player stats UI if available
        try { if (typeof playerLoadStats === 'function') playerLoadStats(); } catch(e) {}
        return;
      }
      // roll 10
      if (target.closest && target.closest('#gacha-roll10') || target.closest && target.closest('#gacha-roll10-btn')) {
        if (typeof doGachaBulk !== 'function') {
          if (resultEl) resultEl.innerHTML = `<span style="color:red">Hệ thống gacha chưa sẵn sàng.</span>`;
          return;
        }
        const bulk = doGachaBulk(10);
        if (!bulk.ok) {
          if (resultEl) resultEl.innerHTML = `<span style="color:red">${bulk.error}</span>`;
          return;
        }
        let html = '<div><b>Kết quả 10x:</b></div>';
        bulk.results.forEach((it, i) => {
          if (it.ok && it.reward) {
            const nm = (it.reward.type === 'equipment' && it.reward.data && (it.reward.data.name || it.reward.data.type || it.reward.data.category)) ? (it.reward.data.name || it.reward.data.type || it.reward.data.category) : (it.reward.data && (it.reward.data.id || it.reward.data.name) || 'Vật phẩm');
            html += `<div>${i+1}. <b style="color:#ffd700">${it.reward.rarity}</b> - ${nm}</div>`;
          } else {
            html += `<div>${i+1}. <span style="color:red">Lỗi</span></div>`;
          }
        });
        if (resultEl) resultEl.innerHTML = html;
        try { if (typeof playerLoadStats === 'function') playerLoadStats(); } catch(e) {}
        return;
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();