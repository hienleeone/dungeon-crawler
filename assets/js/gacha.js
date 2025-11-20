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

  // Lấy icon cho item
  function getItemIcon(item) {
    if (item.type === 'gold') return '<i class="fas fa-coins" style="color: #FFD700;"></i>';
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
    
    // 70% chance equipment, 30% chance empty spin (không còn potion)
    const isEquipment = Math.random() < 0.7;
    
    let item;
    if (isEquipment) {
      // Tạo equipment
      const equipment = (typeof createEquipmentRaw === 'function') ? createEquipmentRaw(rarity) : createEquipmentWithRarity(rarity);
      
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
      // Vòng quay rỗng - không thêm gì vào inventory
      item = {
        type: 'empty',
        rarity: 'empty',
        name: 'Vòng quay rỗng',
        data: null
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
      const isEquipment = Math.random() < 0.7;
      
      let item;
      if (isEquipment) {
        const equipment = (typeof createEquipmentRaw === 'function') ? createEquipmentRaw(rarity) : createEquipmentWithRarity(rarity);
        
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
        // Vòng quay rỗng
        item = {
          type: 'empty',
          rarity: 'empty',
          name: 'Vòng quay rỗng',
          data: null
        };
      }
      
      items.push(item);
    }

    // Save data 1 lần (không await để nhanh hơn)
    try {
      if (typeof savePlayerData === 'function') {
        savePlayerData(false); // Bỏ await
      } else if (typeof saveData === 'function') {
        saveData(); // Bỏ await
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
      try { if (typeof sfxOpen !== 'undefined' && sfxOpen && typeof sfxOpen.play === 'function') sfxOpen.play(); } catch(e){}
      modal.style.display = 'flex';
      if (resultEl) resultEl.innerHTML = '';
      // Cập nhật giá trên button
      const cost = getGachaCost();
      if (rollBtn) rollBtn.innerHTML = `<span style="color: rgba(0,0,0,0.7); font-weight: 500;">Quay 1 lần với:</span> <span style="color: #000; font-weight: 800; text-shadow: 0 0 3px rgba(255,255,255,0.5);">${nFormatter(cost)}</span> <i class="fas fa-coins" style="color: #b8860b; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));"></i>`;
      if (roll10Btn) roll10Btn.innerHTML = `<span style="color: rgba(0,0,0,0.7); font-weight: 500;">Quay 10 lần với:</span> <span style="color: #000; font-weight: 800; text-shadow: 0 0 3px rgba(255,255,255,0.5);">${nFormatter(cost * 10)}</span> <i class="fas fa-coins" style="color: #b8860b; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));"></i>`;
    };

    // Close modal handlers
    const closeModal = () => {
      modal.style.display = 'none';
      if (resultEl) resultEl.innerHTML = '';
    };

    if (closeX) closeX.onclick = () => { try { if (typeof sfxDecline !== 'undefined' && sfxDecline && typeof sfxDecline.play === 'function') sfxDecline.play(); } catch(e){}; closeModal(); };
    if (closeBtn) closeBtn.onclick = () => { try { if (typeof sfxDecline !== 'undefined' && sfxDecline && typeof sfxDecline.play === 'function') sfxDecline.play(); } catch(e){}; closeModal(); };
    
    // Click outside modal to close
    modal.onclick = (e) => { 
      if (e.target === modal) { try { if (typeof sfxDecline !== 'undefined' && sfxDecline && typeof sfxDecline.play === 'function') sfxDecline.play(); } catch(e){}; closeModal(); }
    };

    // Quay 1 lần
    if (rollBtn) {
      rollBtn.onclick = async () => {
        if (isProcessing || rollBtn.disabled) return;
        
        // Kiểm tra vàng trước khi bắt đầu animation
        const cost = getGachaCost();
        if (!player || player.gold < cost) {
          try { if (typeof sfxDeny !== 'undefined' && sfxDeny && typeof sfxDeny.play === 'function') sfxDeny.play(); } catch(e){}
          if (resultEl) resultEl.innerHTML = '<span style="color:red">Không đủ vàng!</span>';
          return;
        }

        // Play click/confirm sound for starting the gacha
        try { if (typeof sfxConfirm !== 'undefined' && sfxConfirm && typeof sfxConfirm.play === 'function') sfxConfirm.play(); } catch(e){}
        
        isProcessing = true;
        rollBtn.disabled = true;
        roll10Btn.disabled = true;
        rollBtn.style.opacity = '0.5';

        // Hiệu ứng đang gacha
        if (resultEl) {
          resultEl.innerHTML = '<div class="gacha-spinning">✨ Đang quay... ✨</div>';
          resultEl.classList.add('gacha-shake');
        }

        // Delay để animation chạy
        await new Promise(resolve => setTimeout(resolve, 800));

        const result = await doSingleGacha();

        if (resultEl) resultEl.classList.remove('gacha-shake');

        // Hiển thị kết quả với icon
        if (!result.success) {
          if (resultEl) resultEl.innerHTML = `<span style="color:red">${result.error}</span>`;
        } else {
          const item = result.item;
          if (resultEl) {
            const row = document.createElement('div');
            row.className = 'gacha-item-row r-' + item.rarity;
            
            // Lấy icon cho item
            let icon = '';
            if (item.type === 'equipment' && item.data) {
              icon = getEquipmentIcon(item.data.category || item.data.type);
            } else if (item.type === 'empty') {
              icon = '<i class="fas fa-circle-xmark" style="color: #888;"></i>';
            }
            
            // Format: (icon) (loại) (tên vật phẩm)
            const typeText = item.data ? (item.data.type || '') : '';
            
            // Nếu là vòng quay rỗng, chỉ hiển thị icon và tên, không có rarity
            if (item.type === 'empty') {
              row.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px; width:100%;">
                  <span style="font-size:1.5em;">${icon}</span>
                  <div style="flex:1;">
                    <div style="font-size:0.95em; color:#888;">${item.name}</div>
                  </div>
                </div>
              `;
            } else {
              row.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px; width:100%;">
                  <span style="font-size:1.5em;">${icon}</span>
                  <div style="flex:1; display:flex; flex-direction:column; gap:2px;">
                    <div style="font-weight:700; font-size:0.95em;" class="${item.rarity}">${item.rarity}</div>
                    <div style="font-size:0.9em; opacity:0.9;">${typeText ? typeText + ' - ' : ''}${item.name}</div>
                  </div>
                </div>
              `;
            }
            resultEl.innerHTML = '';
            resultEl.appendChild(row);
            setTimeout(() => row.classList.add('gacha-pop', 'gacha-flash'), 50);
            
            // Cập nhật inventory UI
            if (typeof showInventory === 'function') showInventory();
          }
        }

        setTimeout(() => {
          rollBtn.disabled = false;
          roll10Btn.disabled = false;
          rollBtn.style.opacity = '1';
          roll10Btn.style.opacity = '1';
          isProcessing = false;
        }, 500);
      };
    }

    // Quay 10 lần
    if (roll10Btn) {
      roll10Btn.onclick = async () => {
        if (isProcessing || roll10Btn.disabled) return;
        
        // Kiểm tra vàng trước khi bắt đầu animation
        const cost = getGachaCost();
        const totalCost = cost * 10;
        if (!player || player.gold < totalCost) {
          try { if (typeof sfxDeny !== 'undefined' && sfxDeny && typeof sfxDeny.play === 'function') sfxDeny.play(); } catch(e){}
          if (resultEl) resultEl.innerHTML = '<span style="color:red">Không đủ vàng!</span>';
          return;
        }

        // Play click/confirm sound for starting the bulk gacha
        try { if (typeof sfxConfirm !== 'undefined' && sfxConfirm && typeof sfxConfirm.play === 'function') sfxConfirm.play(); } catch(e){}
        
        isProcessing = true;
        rollBtn.disabled = true;
        roll10Btn.disabled = true;
        rollBtn.style.opacity = '0.5';
        roll10Btn.style.opacity = '0.5';

        // Hiệu ứng đang gacha
        if (resultEl) {
          resultEl.innerHTML = '<div class="gacha-spinning">✨ Đang quay... ✨</div>';
          resultEl.classList.add('gacha-shake');
        }

        // Delay để animation chạy
        await new Promise(resolve => setTimeout(resolve, 1200));

        const result = await doBulkGacha(10);

        if (resultEl) resultEl.classList.remove('gacha-shake');

        // Hiển thị kết quả với icon
        if (!result.success) {
          if (resultEl) resultEl.innerHTML = `<span style="color:red">${result.error}</span>`;
        } else {
          const items = result.items;
          if (resultEl) {
            resultEl.innerHTML = '';
            items.forEach((item, idx) => {
              const row = document.createElement('div');
              row.className = 'gacha-item-row r-' + item.rarity;
              
              // Lấy icon cho item
              let icon = '';
              if (item.type === 'equipment' && item.data) {
                icon = getEquipmentIcon(item.data.category || item.data.type);
              } else if (item.type === 'empty') {
                icon = '<i class="fas fa-circle-xmark" style="color: #888;"></i>';
              }
              
              // Format: (icon) (loại) (tên vật phẩm) - không có số thứ tự
              const typeText = item.data ? (item.data.type || '') : '';
              
              // Nếu là vòng quay rỗng, chỉ hiển thị icon và tên, không có rarity
              if (item.type === 'empty') {
                row.innerHTML = `
                  <div style="display:flex; align-items:center; gap:8px; width:100%;">
                    <span style="font-size:1.5em;">${icon}</span>
                    <div style="flex:1;">
                      <div style="font-size:0.95em; color:#888;">${item.name}</div>
                    </div>
                  </div>
                `;
              } else {
                row.innerHTML = `
                  <div style="display:flex; align-items:center; gap:8px; width:100%;">
                    <span style="font-size:1.5em;">${icon}</span>
                    <div style="flex:1; display:flex; flex-direction:column; gap:2px;">
                      <div style="font-weight:700; font-size:0.95em;" class="${item.rarity}">${item.rarity}</div>
                      <div style="font-size:0.9em; opacity:0.9;">${typeText ? typeText + ' - ' : ''}${item.name}</div>
                    </div>
                  </div>
                `;
              }
              resultEl.appendChild(row);
              setTimeout(() => row.classList.add('gacha-pop', 'gacha-flash'), 150 + idx * 60);
            });
            
            // Cập nhật UI
            if (typeof showInventory === 'function') showInventory();
            if (typeof playerLoadStats === 'function') playerLoadStats();
          }
        }

        setTimeout(() => {
          rollBtn.disabled = false;
          roll10Btn.disabled = false;
          rollBtn.style.opacity = '1';
          roll10Btn.style.opacity = '1';
          isProcessing = false;
        }, 800);
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
