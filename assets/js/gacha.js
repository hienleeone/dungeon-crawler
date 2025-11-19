(function() {
  // Ngăn chặn khởi tạo nhiều lần
  if (window._gachaSystem) {
    console.warn("Gacha system đã được khởi tạo!");
    return;
  }
  window._gachaSystem = true;

  const BASE_GACHA_COST = 1000;
  const GACHA_RARITIES = [
    { key: "Common", chance: 60 },
    { key: "Uncommon", chance: 20 },
    { key: "Rare", chance: 12 },
    { key: "Epic", chance: 6 },
    { key: "Legendary", chance: 1.8 },
    { key: "Heirloom", chance: 0.2 }
  ];

  // Tính giá gacha dựa vào cấp độ Lời Nguyền
  function getGachaCost() {
    if (!dungeon || !dungeon.settings || !dungeon.settings.enemyScaling) {
      return BASE_GACHA_COST;
    }
    const curseLvl = Math.round((dungeon.settings.enemyScaling - 1) * 10);
    // Công thức: base * (1 + curseLvl * 0.5)
    // Curse 0: 1000, Curse 10: 6000, Curse 20: 11000
    return Math.floor(BASE_GACHA_COST * (1 + curseLvl * 0.5));
  }

  // Anti-spam
  let isProcessing = false;

  // Pick random rarity
  function pickRarity() {
    const total = GACHA_RARITIES.reduce((sum, r) => sum + r.chance, 0);
    let random = Math.random() * total;
    for (const item of GACHA_RARITIES) {
      if (random < item.chance) return item.key;
      random -= item.chance;
    }
    return "Common";
  }

  // Tạo equipment với rarity cụ thể
  function createEquipmentWithRarity(rarity) {
    if (typeof createEquipment !== 'function') {
      return { name: `${rarity} Item`, rarity, tier: 1, value: 100 };
    }
    
    // Thử tạo equipment khớp rarity 60 lần
    for (let i = 0; i < 60; i++) {
      const equip = createEquipment();
      if (equip && equip.rarity && equip.rarity.toLowerCase() === rarity.toLowerCase()) {
        return equip;
      }
    }
    
    // Nếu không tìm được, tạo 1 cái và gán rarity
    const equip = createEquipment();
    equip.rarity = rarity;
    return equip;
  }

  // Gacha 1 lần
  async function doSingleGacha() {
    if (!player || typeof player.gold !== 'number') {
      return { success: false, error: 'Player data không hợp lệ' };
    }
    
    const cost = getGachaCost();
    if (player.gold < cost) {
      return { success: false, error: 'Không đủ vàng' };
    }

    // Trừ vàng
    player.gold -= cost;

    // Pick rarity
    const rarity = pickRarity();
    
    // Xác định xem có phải equipment không
    const isEquipment = ['Epic', 'Legendary', 'Heirloom'].includes(rarity) || Math.random() < 0.35;
    
    let item;
    if (isEquipment) {
      // Tạo equipment
      const equipment = createEquipmentWithRarity(rarity);
      
      // Thêm vào inventory
      if (!player.inventory) player.inventory = { consumables: [], equipment: [] };
      if (!Array.isArray(player.inventory.equipment)) player.inventory.equipment = [];
      
      player.inventory.equipment.push(JSON.stringify(equipment));
      
      item = {
        type: 'equipment',
        rarity: rarity,
        name: equipment.name || equipment.category || equipment.type || 'Equipment',
        data: equipment
      };
    } else {
      // Tạo consumable
      if (!player.inventory) player.inventory = { consumables: [], equipment: [] };
      if (!Array.isArray(player.inventory.consumables)) player.inventory.consumables = [];
      
      const potionId = 'potion_small';
      player.inventory.consumables.push(potionId);
      
      item = {
        type: 'consumable',
        rarity: rarity,
        name: 'Potion nhỏ',
        data: { id: potionId }
      };
    }

    // Save data
    try {
      if (typeof savePlayerData === 'function') {
        await savePlayerData(false);
      } else if (typeof saveData === 'function') {
        await saveData();
      }
    } catch (e) {
      console.error('Lỗi save:', e);
    }

    // Update UI
    try {
      if (typeof playerLoadStats === 'function') {
        playerLoadStats();
      }
    } catch (e) {
      console.error('Lỗi update UI:', e);
    }

    return { success: true, item };
  }

  // Gacha nhiều lần
  async function doBulkGacha(count) {
    if (!player || typeof player.gold !== 'number') {
      return { success: false, error: 'Player data không hợp lệ' };
    }
    
    const cost = getGachaCost();
    const totalCost = count * cost;
    if (player.gold < totalCost) {
      return { success: false, error: 'Không đủ vàng' };
    }

    // Trừ vàng 1 lần
    player.gold -= totalCost;

    const items = [];

    // Loop để tạo items
    for (let i = 0; i < count; i++) {
      const rarity = pickRarity();
      const isEquipment = ['Epic', 'Legendary', 'Heirloom'].includes(rarity) || Math.random() < 0.35;
      
      let item;
      if (isEquipment) {
        const equipment = createEquipmentWithRarity(rarity);
        
        if (!player.inventory) player.inventory = { consumables: [], equipment: [] };
        if (!Array.isArray(player.inventory.equipment)) player.inventory.equipment = [];
        
        player.inventory.equipment.push(JSON.stringify(equipment));
        
        item = {
          type: 'equipment',
          rarity: rarity,
          name: equipment.name || equipment.category || equipment.type || 'Equipment',
          data: equipment
        };
      } else {
        if (!player.inventory) player.inventory = { consumables: [], equipment: [] };
        if (!Array.isArray(player.inventory.consumables)) player.inventory.consumables = [];
        
        const potionId = 'potion_small';
        player.inventory.consumables.push(potionId);
        
        item = {
          type: 'consumable',
          rarity: rarity,
          name: 'Potion nhỏ',
          data: { id: potionId }
        };
      }
      
      items.push(item);
    }

    // Save data 1 lần
    try {
      if (typeof savePlayerData === 'function') {
        await savePlayerData(false);
      } else if (typeof saveData === 'function') {
        await saveData();
      }
    } catch (e) {
      console.error('Lỗi save:', e);
    }

    // Update UI
    try {
      if (typeof playerLoadStats === 'function') {
        playerLoadStats();
      }
    } catch (e) {
      console.error('Lỗi update UI:', e);
    }

    return { success: true, items };
  }

  // Initialize UI
  function initUI() {
    const openBtn = document.getElementById('open-gacha');
    if (!openBtn) {
      console.warn('Không tìm thấy button #open-gacha');
      return;
    }

    // Tạo modal
    let modal = document.getElementById('gachaModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'gachaModal';
      modal.className = 'modal-container';
      modal.style.display = 'none';
      modal.innerHTML = `
        <div class="content">
          <div class="content-head">
            <h3>Gacha</h3>
            <p id="gacha-modal-x" style="cursor: pointer;"><i class="fas fa-times"></i></p>
          </div>
          <div style="padding:10px;">
            <button id="gacha-roll-btn" class="gachabtn">Quay 1 lần</button>
            <button id="gacha-roll10-btn" class="gachabtn" style="margin-top:8px;">Quay 10 lần</button>
            <div id="gacha-result" class="gacha-result-area"></div>
          </div>
          <button id="gacha-close" class="closebtn">Đóng</button>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const closeX = modal.querySelector('#gacha-modal-x');
    const closeBtn = modal.querySelector('#gacha-close');
    const rollBtn = modal.querySelector('#gacha-roll-btn');
    const roll10Btn = modal.querySelector('#gacha-roll10-btn');
    const resultEl = modal.querySelector('#gacha-result');
    const contentDiv = modal.querySelector('.content');

    // Open modal
    openBtn.onclick = () => {
      modal.style.display = 'flex';
      if (resultEl) resultEl.innerHTML = '';
      // Cập nhật giá trên button
      const cost = getGachaCost();
      if (rollBtn) rollBtn.textContent = `Quay 1 lần (${cost} Gold)`;
      if (roll10Btn) roll10Btn.textContent = `Quay 10 lần (${cost * 10} Gold)`;
    };

    // Close handlers - đơn giản nhất có thể
    const doClose = () => {
      modal.style.display = 'none';
      if (resultEl) resultEl.innerHTML = '';
    };

    if (closeX) closeX.onclick = doClose;
    if (closeBtn) closeBtn.onclick = doClose;
    
    // Click outside to close
    modal.onclick = (e) => { 
      if (e.target === modal) doClose();
    };

    // Quay 1 lần
    if (rollBtn) {
      rollBtn.onclick = async () => {
        if (isProcessing || rollBtn.disabled) return;
        
        isProcessing = true;
        rollBtn.disabled = true;
        rollBtn.style.opacity = '0.5';

        const result = await doSingleGacha();

        if (!result.success) {
          if (resultEl) resultEl.innerHTML = `<span style="color:red">${result.error}</span>`;
        } else {
          const item = result.item;
          if (resultEl) {
            const row = document.createElement('div');
            row.className = 'gacha-item-row r-' + item.rarity;
            row.innerHTML = `<div style="font-weight:700">${item.rarity}</div><div>${item.name}</div>`;
            resultEl.innerHTML = '';
            resultEl.appendChild(row);
            setTimeout(() => row.classList.add('gacha-pop'), 100);
          }
        }

        setTimeout(() => {
          rollBtn.disabled = false;
          rollBtn.style.opacity = '1';
          isProcessing = false;
        }, 800);
      };
    }

    // Quay 10 lần
    if (roll10Btn) {
      roll10Btn.onclick = async () => {
        if (isProcessing || roll10Btn.disabled) return;
        
        isProcessing = true;
        roll10Btn.disabled = true;
        roll10Btn.style.opacity = '0.5';

        const result = await doBulkGacha(10);

        if (!result.success) {
          if (resultEl) resultEl.innerHTML = `<span style="color:red">${result.error}</span>`;
        } else {
          const items = result.items;
          if (resultEl) {
            resultEl.innerHTML = '';
            items.forEach((item, idx) => {
              const row = document.createElement('div');
              row.className = 'gacha-item-row r-' + item.rarity;
              row.innerHTML = `<div style="font-weight:700">${idx + 1}. ${item.rarity}</div><div>${item.name}</div>`;
              resultEl.appendChild(row);
              setTimeout(() => row.classList.add('gacha-pop'), 150 + idx * 80);
            });
          }
        }

        setTimeout(() => {
          roll10Btn.disabled = false;
          roll10Btn.style.opacity = '1';
          isProcessing = false;
        }, 2000);
      };
    }
  }

  // Initialize khi DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }

})();
