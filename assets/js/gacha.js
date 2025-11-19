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

  // Lấy icon cho item
  function getItemIcon(item) {
    if (item.type === 'consumable') return '🧪';
    if (!item.data || !item.data.category) return '<i class="ra ra-sword"></i>';
    
    const cat = item.data.category;
    
    // Sử dụng equipmentIcon nếu có
    if (typeof equipmentIcon === 'function') {
      return equipmentIcon(cat);
    }
    
    // Fallback icons
    if (cat === 'Sword') return '<i class="ra ra-relic-blade"></i>';
    if (cat === 'Axe') return '<i class="ra ra-axe"></i>';
    if (cat === 'Hammer') return '<i class="ra ra-flat-hammer"></i>';
    if (cat === 'Dagger') return '<i class="ra ra-bowie-knife"></i>';
    if (cat === 'Flail') return '<i class="ra ra-chain"></i>';
    if (cat === 'Scythe') return '<i class="ra ra-scythe"></i>';
    if (cat === 'Plate' || cat === 'Chain' || cat === 'Leather') return '<i class="ra ra-vest"></i>';
    if (cat === 'Tower') return '<i class="ra ra-shield"></i>';
    if (cat === 'Kite') return '<i class="ra ra-heavy-shield"></i>';
    if (cat === 'Buckler') return '<i class="ra ra-round-shield"></i>';
    if (cat === 'Great Helm') return '<i class="ra ra-knight-helmet"></i>';
    if (cat === 'Horned Helm') return '<i class="ra ra-helmet"></i>';
    
    return '<i class="ra ra-sword"></i>';
  }

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

  // Tạo equipment với rarity cụ thể - KHÔNG dùng createEquipment()
  function createEquipmentWithRarity(rarity) {
    const equipment = {
        category: null,
        attribute: null,
        type: null,
        rarity: rarity,
        lvl: null,
        tier: null,
        value: null,
        stats: [],
        name: null
    };

    // Generate random equipment attribute
    const equipmentAttributes = ["Damage", "Defense"];
    equipment.attribute = equipmentAttributes[Math.floor(Math.random() * equipmentAttributes.length)];

    // Generate random equipment name and type based on attribute
    if (equipment.attribute == "Damage") {
        const equipmentCategories = ["Sword", "Axe", "Hammer", "Dagger", "Flail", "Scythe"];
        equipment.category = equipmentCategories[Math.floor(Math.random() * equipmentCategories.length)];
        equipment.type = "Weapon";
    } else if (equipment.attribute == "Defense") {
        const equipmentTypes = ["Armor", "Shield", "Helmet"];
        equipment.type = equipmentTypes[Math.floor(Math.random() * equipmentTypes.length)];
        if (equipment.type == "Armor") {
            const equipmentCategories = ["Plate", "Chain", "Leather"];
            equipment.category = equipmentCategories[Math.floor(Math.random() * equipmentCategories.length)];
        } else if (equipment.type == "Shield") {
            const equipmentCategories = ["Tower", "Kite", "Buckler"];
            equipment.category = equipmentCategories[Math.floor(Math.random() * equipmentCategories.length)];
        } else if (equipment.type == "Helmet") {
            const equipmentCategories = ["Great Helm", "Horned Helm"];
            equipment.category = equipmentCategories[Math.floor(Math.random() * equipmentCategories.length)];
        }
    }

    // Determine number of times to loop based on equipment rarity
    let loopCount;
    switch (rarity) {
        case "Common": loopCount = 2; break;
        case "Uncommon": loopCount = 3; break;
        case "Rare": loopCount = 4; break;
        case "Epic": loopCount = 5; break;
        case "Legendary": loopCount = 6; break;
        case "Heirloom": loopCount = 8; break;
        default: loopCount = 2;
    }

    // Generate stats
    const physicalStats = ["atk", "atkSpd", "vamp", "critRate", "critDmg"];
    const damageyStats = ["atk", "atk", "vamp", "critRate", "critDmg", "critDmg"];
    const speedyStats = ["atkSpd", "atkSpd", "atk", "vamp", "critRate", "critRate", "critDmg"];
    const defenseStats = ["hp", "hp", "def", "def", "atk"];
    const dmgDefStats = ["hp", "def", "atk", "atk", "critRate", "critDmg"];
    
    let statTypes;
    if (equipment.attribute == "Damage") {
        if (equipment.category == "Axe" || equipment.category == "Scythe") {
            statTypes = damageyStats;
        } else if (equipment.category == "Dagger" || equipment.category == "Flail") {
            statTypes = speedyStats;
        } else if (equipment.category == "Hammer") {
            statTypes = dmgDefStats;
        } else {
            statTypes = physicalStats;
        }
    } else {
        statTypes = defenseStats;
    }

    // Set equipment level and tier
    if (dungeon && dungeon.progress && dungeon.settings) {
        const maxLvl = dungeon.progress.floor * dungeon.settings.enemyLvlGap + (dungeon.settings.enemyBaseLvl - 1);
        const minLvl = maxLvl - (dungeon.settings.enemyLvlGap - 1);
        equipment.lvl = Math.floor(Math.random() * (maxLvl - minLvl + 1)) + minLvl;
        if (equipment.lvl > 100) equipment.lvl = 100;
        
        let enemyScaling = dungeon.settings.enemyScaling;
        if (enemyScaling > 2) enemyScaling = 2;
        equipment.tier = Math.round((enemyScaling - 1) * 10);
    } else {
        equipment.lvl = 1;
        equipment.tier = 1;
    }

    // Generate stats and calculate value
    let equipmentValue = 0;
    const randomizeNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randomizeDecimal = (min, max) => Math.random() * (max - min) + min;
    
    for (let i = 0; i < loopCount; i++) {
        let statType = statTypes[Math.floor(Math.random() * statTypes.length)];
        let statValue = 0;
        
        // HP, ATK, DEF giữ nguyên như cũ
        const baseScaling = equipment.lvl * 2;
        const tierBonus = equipment.tier * 2;
        
        if (statType === "hp") {
            statValue = randomizeNum(baseScaling * 2 + tierBonus * 2, baseScaling * 4 + tierBonus * 4);
            equipmentValue += statValue;
        } else if (statType === "atk" || statType === "def") {
            statValue = randomizeNum(baseScaling + tierBonus, baseScaling * 2 + tierBonus * 2);
            equipmentValue += statValue * 2.5;
        } else if (statType === "atkSpd") {
            statValue = randomizeDecimal(1, 8) + (equipment.tier * 0.5);
            if (statValue > 20) statValue = 20;
            equipmentValue += statValue * 8.33;
        } else if (statType === "vamp" || statType === "critRate") {
            statValue = randomizeDecimal(1, 5) + (equipment.tier * 0.3);
            if (statValue > 15) statValue = 15;
            equipmentValue += statValue * 20.83;
        } else if (statType === "critDmg") {
            statValue = randomizeDecimal(2, 10) + (equipment.tier * 0.5);
            equipmentValue += statValue * 8.33;
        }

        // Check if stat exists and merge or add
        let statExists = equipment.stats.find(s => Object.keys(s)[0] === statType);
        if (statExists) {
            statExists[statType] += statValue;
        } else {
            equipment.stats.push({ [statType]: statValue });
        }
    }

    // Calculate final value with minimum guarantee
    equipment.value = Math.round((equipmentValue * 3) / 2);
    
    const minValueByRarity = {
        "Common": 50,
        "Uncommon": 150,
        "Rare": 500,
        "Epic": 1500,
        "Legendary": 5000,
        "Heirloom": 15000
    };
    
    if (equipment.value < minValueByRarity[rarity] || equipment.value === 0) {
        equipment.value = minValueByRarity[rarity];
    }

    equipment.name = `${equipment.category || equipment.type} Lv.${equipment.lvl}`;
    
    return equipment;
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
    
    // Luôn tạo equipment (không còn potion)
    const equipment = createEquipmentWithRarity(rarity);
      
    // Thêm vào inventory
    if (!player.inventory) player.inventory = { consumables: [], equipment: [] };
    if (!Array.isArray(player.inventory.equipment)) player.inventory.equipment = [];
    
    player.inventory.equipment.push(JSON.stringify(equipment));
    
    // Lưu ngay lập tức
    if (typeof savePlayerData === 'function') {
      await savePlayerData(false);
    }
    
    const item = {
      type: 'equipment',
      rarity: rarity,
      name: equipment.name || equipment.category || equipment.type || 'Equipment',
      data: equipment
    };

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
      
      // Luôn tạo equipment
      const equipment = createEquipmentWithRarity(rarity);
      
      if (!player.inventory) player.inventory = { consumables: [], equipment: [] };
      if (!Array.isArray(player.inventory.equipment)) player.inventory.equipment = [];
      
      player.inventory.equipment.push(JSON.stringify(equipment));
      
      const item = {
        type: 'equipment',
        rarity: rarity,
        name: equipment.name || equipment.category || equipment.type || 'Equipment',
        data: equipment
      };
      
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
          </div>
          <div style="padding:10px;">
            <button id="gacha-roll-btn" class="gachabtn">Quay 1 lần</button>
            <button id="gacha-roll10-btn" class="gachabtn" style="margin-top:8px;">Quay 10 lần</button>
            <div id="gacha-result" class="gacha-result-area"></div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const closeX = modal.querySelector('#gacha-close-x');
    const closeBtn = modal.querySelector('#gacha-close-btn');
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

    // Close modal handlers
    const closeModal = () => {
      modal.style.display = 'none';
      if (resultEl) resultEl.innerHTML = '';
    };

    if (closeX) closeX.onclick = closeModal;
    if (closeBtn) closeBtn.onclick = closeModal;
    
    // Click outside modal to close
    modal.onclick = (e) => { 
      if (e.target === modal) closeModal();
    };

    // Quay 1 lần
    if (rollBtn) {
      rollBtn.onclick = async () => {
        if (isProcessing || rollBtn.disabled) return;
        
        isProcessing = true;
        rollBtn.disabled = true;
        rollBtn.style.opacity = '0.5';

        // Hiệu ứng đang gacha
        if (resultEl) {
          resultEl.innerHTML = '<div style="font-size:3rem; animation: spin 1s linear infinite;">✨</div>';
        }

        const result = await doSingleGacha();

        setTimeout(() => {
          if (!result.success) {
            if (resultEl) resultEl.innerHTML = `<span style="color:red">${result.error}</span>`;
          } else {
            const item = result.item;
            if (resultEl) {
              const icon = getItemIcon(item);
              const row = document.createElement('div');
              row.className = 'gacha-item-row r-' + item.rarity;
              row.innerHTML = `<div style="font-size:2rem;">${icon}</div><div style="font-weight:700">${item.rarity}</div><div>${item.name}</div>`;
              resultEl.innerHTML = '';
              resultEl.appendChild(row);
              setTimeout(() => row.classList.add('gacha-pop'), 100);
              
              // Cập nhật UI
              if (typeof showInventory === 'function') showInventory();
              if (typeof playerLoadStats === 'function') playerLoadStats();
            }
          }

          setTimeout(() => {
            rollBtn.disabled = false;
            rollBtn.style.opacity = '1';
            isProcessing = false;
          }, 300);
        }, 1200);
      };
    }

    // Quay 10 lần
    if (roll10Btn) {
      roll10Btn.onclick = async () => {
        if (isProcessing || roll10Btn.disabled) return;
        
        isProcessing = true;
        roll10Btn.disabled = true;
        roll10Btn.style.opacity = '0.5';

        // Hiệu ứng đang gacha
        if (resultEl) {
          resultEl.innerHTML = '<div style="font-size:3rem; animation: spin 1s linear infinite;">✨✨✨</div>';
        }

        const result = await doBulkGacha(10);

        setTimeout(() => {
          if (!result.success) {
            if (resultEl) resultEl.innerHTML = `<span style="color:red">${result.error}</span>`;
          } else {
            const items = result.items;
            if (resultEl) {
              resultEl.innerHTML = '';
              items.forEach((item, idx) => {
                const icon = getItemIcon(item);
                const row = document.createElement('div');
                row.className = 'gacha-item-row r-' + item.rarity;
                row.innerHTML = `<div style="font-size:1.5rem;">${icon}</div><div style="font-weight:700">${idx + 1}. ${item.rarity}</div><div>${item.name}</div>`;
                resultEl.appendChild(row);
                setTimeout(() => row.classList.add('gacha-pop'), 150 + idx * 80);
              });
              
              // Cập nhật UI
              if (typeof showInventory === 'function') showInventory();
              if (typeof playerLoadStats === 'function') playerLoadStats();
            }
          }

          setTimeout(() => {
            roll10Btn.disabled = false;
            roll10Btn.style.opacity = '1';
            isProcessing = false;
          }, 500);
        }, 1500);
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
