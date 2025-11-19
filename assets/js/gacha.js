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

  // Helper function để lấy icon equipment
  function getEquipmentIcon(category) {
    const icons = {
      "Sword": '<i class="ra ra-relic-blade"></i>',
      "Axe": '<i class="ra ra-axe"></i>',
      "Hammer": '<i class="ra ra-flat-hammer"></i>',
      "Dagger": '<i class="ra ra-bowie-knife"></i>',
      "Flail": '<i class="ra ra-chain"></i>',
      "Scythe": '<i class="ra ra-scythe"></i>',
      "Plate": '<i class="ra ra-vest"></i>',
      "Chain": '<i class="ra ra-vest"></i>',
      "Leather": '<i class="ra ra-vest"></i>',
      "Tower": '<i class="ra ra-shield"></i>',
      "Kite": '<i class="ra ra-heavy-shield"></i>',
      "Buckler": '<i class="ra ra-round-shield"></i>',
      "Great Helm": '<i class="ra ra-knight-helmet"></i>',
      "Horned Helm": '<i class="ra ra-horned-helm"></i>',
      "Weapon": '<i class="ra ra-sword"></i>',
      "Armor": '<i class="ra ra-vest"></i>',
      "Shield": '<i class="ra ra-shield"></i>',
      "Helmet": '<i class="ra ra-knight-helmet"></i>'
    };
    return icons[category] || '<i class="ra ra-sword"></i>';
  }

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
        
        const baseScaling = equipment.lvl * 2;
        
        if (statType === "hp") {
            statValue = randomizeNum(baseScaling * 2, baseScaling * 4);
            equipmentValue += statValue;
        } else if (statType === "atk" || statType === "def") {
            statValue = randomizeNum(baseScaling, baseScaling * 2);
            equipmentValue += statValue * 2.5;
        } else if (statType === "atkSpd") {
            statValue = randomizeDecimal(0.5, 3);
            equipmentValue += statValue * 8.33;
        } else if (statType === "vamp" || statType === "critRate") {
            statValue = randomizeDecimal(0.3, 2);
            equipmentValue += statValue * 20.83;
        } else if (statType === "critDmg") {
            statValue = randomizeDecimal(0.5, 3);
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
    
    // Xác định xem có phải là vòng quay rỗng không (Common/Uncommon có tỷ lệ rỗng)
    let isEmptyRoll = false;
    if (rarity === 'Common' || rarity === 'Uncommon') {
      isEmptyRoll = Math.random() < 0.5; // 50% tỷ lệ rỗng cho Common/Uncommon
    }
    
    let item;
    if (isEmptyRoll) {
      // Vòng quay rỗng
      item = {
        type: 'empty',
        rarity: rarity,
        name: 'Vòng quay rỗng',
        data: null
      };
    } else {
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
        category: equipment.category || equipment.type,
        data: equipment
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
      
      // Xác định xem có phải là vòng quay rỗng không
      let isEmptyRoll = false;
      if (rarity === 'Common' || rarity === 'Uncommon') {
        isEmptyRoll = Math.random() < 0.5;
      }
      
      let item;
      if (isEmptyRoll) {
        // Vòng quay rỗng
        item = {
          type: 'empty',
          rarity: rarity,
          name: 'Vòng quay rỗng',
          data: null
        };
      } else {
        // Tạo equipment
        const equipment = createEquipmentWithRarity(rarity);
        
        if (!player.inventory) player.inventory = { consumables: [], equipment: [] };
        if (!Array.isArray(player.inventory.equipment)) player.inventory.equipment = [];
        
        player.inventory.equipment.push(JSON.stringify(equipment));
        
        item = {
          type: 'equipment',
          rarity: rarity,
          name: equipment.name || equipment.category || equipment.type || 'Equipment',
          category: equipment.category || equipment.type,
          data: equipment
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
        roll10Btn.disabled = true;
        rollBtn.style.opacity = '0.5';
        roll10Btn.style.opacity = '0.5';

        // Hiển thị animation đang gacha
        if (resultEl) {
          resultEl.innerHTML = '<div class="gacha-spinning">🎰 Đang quay...</div>';
          resultEl.classList.add('gacha-shake');
        }

        // Delay để tạo hiệu ứng hồi hộp
        await new Promise(resolve => setTimeout(resolve, 800));

        const result = await doSingleGacha();

        if (resultEl) resultEl.classList.remove('gacha-shake');

        if (!result.success) {
          if (resultEl) resultEl.innerHTML = `<span style="color:red">${result.error}</span>`;
        } else {
          const item = result.item;
          if (resultEl) {
            resultEl.innerHTML = '';
            
            // Lấy icon cho equipment
            let iconHtml = '';
            if (item.type === 'equipment' && item.category) {
              iconHtml = getEquipmentIcon(item.category);
            } else if (item.type === 'empty') {
              iconHtml = '<i class="fas fa-times-circle"></i>';
            }
            
            const row = document.createElement('div');
            row.className = 'gacha-item-row r-' + item.rarity;
            row.innerHTML = `
              <div style="font-size:32px;">${iconHtml}</div>
              <div style="display:flex;flex-direction:column;align-items:flex-start;">
                <div style="font-weight:700;color:#ffd700;">${item.rarity}</div>
                <div style="font-size:13px;">${item.name}</div>
              </div>
            `;
            resultEl.appendChild(row);
            
            // Animation xuất hiện
            setTimeout(() => {
              row.classList.add('gacha-pop');
              row.classList.add('gacha-flash');
            }, 50);
          }
        }

        setTimeout(() => {
          rollBtn.disabled = false;
          roll10Btn.disabled = false;
          rollBtn.style.opacity = '1';
          roll10Btn.style.opacity = '1';
          isProcessing = false;
        }, 600);
      };
    }

    // Quay 10 lần
    if (roll10Btn) {
      roll10Btn.onclick = async () => {
        if (isProcessing || roll10Btn.disabled) return;
        
        isProcessing = true;
        rollBtn.disabled = true;
        roll10Btn.disabled = true;
        rollBtn.style.opacity = '0.5';
        roll10Btn.style.opacity = '0.5';

        // Hiển thị animation đang gacha
        if (resultEl) {
          resultEl.innerHTML = '<div class="gacha-spinning">🎰 Đang quay 10 lần...</div>';
          resultEl.classList.add('gacha-shake');
        }

        // Delay để tạo hiệu ứng
        await new Promise(resolve => setTimeout(resolve, 1000));

        const result = await doBulkGacha(10);

        if (resultEl) resultEl.classList.remove('gacha-shake');

        if (!result.success) {
          if (resultEl) resultEl.innerHTML = `<span style="color:red">${result.error}</span>`;
        } else {
          const items = result.items;
          if (resultEl) {
            resultEl.innerHTML = '';
            items.forEach((item, idx) => {
              // Lấy icon cho equipment
              let iconHtml = '';
              if (item.type === 'equipment' && item.category) {
                iconHtml = getEquipmentIcon(item.category);
              } else if (item.type === 'empty') {
                iconHtml = '<i class="fas fa-times-circle"></i>';
              }
              
              const row = document.createElement('div');
              row.className = 'gacha-item-row r-' + item.rarity;
              row.style.opacity = '0';
              row.innerHTML = `
                <div style="font-size:24px;min-width:32px;">${iconHtml}</div>
                <div style="display:flex;gap:6px;align-items:center;flex:1;">
                  <span style="font-weight:700;color:#ffd700;min-width:90px;">${item.rarity}</span>
                  <span style="font-size:12px;">${item.name}</span>
                </div>
              `;
              resultEl.appendChild(row);
              
              // Animation xuất hiện lần lượt
              setTimeout(() => {
                row.style.opacity = '1';
                row.classList.add('gacha-pop');
              }, 150 + idx * 100);
            });
          }
        }

        setTimeout(() => {
          rollBtn.disabled = false;
          roll10Btn.disabled = false;
          rollBtn.style.opacity = '1';
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
