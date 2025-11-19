(function(){
  // Ngăn chặn khởi tạo nhiều lần
  if (window._gachaInitialized) {
    console.warn("Gacha đã được khởi tạo rồi!");
    return;
  }
  window._gachaInitialized = true;
  
  const GACHA_COST = 1000;
  
  // Anti-spam protection
  let isGachaProcessing = false;
  let lastGachaTime = 0;
  const GACHA_COOLDOWN = 500; // 500ms cooldown between rolls
  let spamAttempts = 0;

  const GACHA_RARITIES = [
    { key: "Common", chance: 60 },
    { key: "Uncommon", chance: 20 },
    { key: "Rare", chance: 12 },
    { key: "Epic", chance: 6 },
    { key: "Legendary", chance: 1.8 },
    { key: "Heirloom", chance: 0.2 }
  ];

  function pickRarity() {
    const total = GACHA_RARITIES.reduce((s,r)=>s+r.chance,0);
    let r = Math.random() * total;
    for (const p of GACHA_RARITIES) {
      if (r < p.chance) return p.key;
      r -= p.chance;
    }
    return GACHA_RARITIES[0].key;
  }

  function createEquipmentForRarity(rarity) {
    if (typeof createEquipment === 'function') {
      for (let i=0;i<60;i++){
        const it = createEquipment();
        if (it && it.rarity && String(it.rarity).toLowerCase() === String(rarity).toLowerCase()) {
          it.rarity = rarity;
          return it;
        }
      }
      const it = createEquipment();
      it.rarity = rarity;
      if (!it.name) it.name = `${rarity} ${it.type||it.category||'Item'}`;
      return it;
    }
    return { name: `${rarity} Item`, rarity: rarity, tier: 1, value: 10 };
  }

  async function doGachaRoll(playerObj, cost = GACHA_COST) {
    // Anti-spam check
    const now = Date.now();
    
    if (isGachaProcessing) {
      spamAttempts++;
      console.warn("🚫 Gacha đang xử lý, vui lòng chờ...");
      
      // Cảnh báo nếu spam nhiều lần
      if (spamAttempts >= 3) {
        if (typeof showAlert === 'function') {
          showAlert("⚠️ Vui lòng không spam click!");
        } else {
          alert("⚠️ Vui lòng không spam click!");
        }
        spamAttempts = 0; // Reset counter
      }
      
      return { ok:false, error:'Đang xử lý, vui lòng chờ...' };
    }
    
    if (now - lastGachaTime < GACHA_COOLDOWN) {
      console.warn("⏳ Gacha cooldown...");
      return { ok:false, error:'Vui lòng chờ giây lát...' };
    }
    
    // Reset spam counter on successful call
    spamAttempts = 0;
    
    // Lock gacha
    isGachaProcessing = true;
    lastGachaTime = now;
    
    try {
      const p = playerObj || (typeof player !== 'undefined' ? player : null);
      if (!p) {
        isGachaProcessing = false;
        return { ok:false, error:'Player object not found' };
      }
      if (typeof p.gold !== 'number') p.gold = 0;
      if (p.gold < cost) {
        isGachaProcessing = false;
        return { ok:false, error:'Không đủ vàng' };
      }

      p.gold -= cost;
      const rarity = pickRarity();
      let reward = null;
      const giveEquip = ['Epic','Legendary','Heirloom'].includes(rarity) || Math.random() < 0.35;
      if (giveEquip) {
        const equip = createEquipmentForRarity(rarity);
        if (!p.inventory) p.inventory = { consumables: [], equipment: [] };
        if (!Array.isArray(p.inventory.equipment)) p.inventory.equipment = [];
        try { p.inventory.equipment.push(JSON.stringify(equip)); } catch(e){ p.inventory.equipment.push(equip); }
        reward = { type:'equipment', rarity, data: equip };
        console.log("✅ Thêm equipment:", equip.name || equip.type, "vào inventory");
      } else {
        if (!p.inventory) p.inventory = { consumables: [], equipment: [] };
        if (!Array.isArray(p.inventory.consumables)) p.inventory.consumables = [];
        const consId = 'potion_small';
        p.inventory.consumables.push(consId);
        reward = { type:'consumable', rarity, data: { id: consId } };
        console.log("✅ Thêm consumable:", consId, "vào inventory");
      }

      // Save và update UI
      try { 
        if (typeof savePlayerData === 'function') {
          await savePlayerData(false);
        } else if (typeof saveData === 'function') {
          await saveData();
        }
      } catch(e){ console.error("Lỗi save:", e); }
      
      try { 
        if (typeof playerLoadStats === 'function') playerLoadStats(); 
      } catch(e){ console.error("Lỗi load stats:", e); }

      // Unlock gacha after short delay
      setTimeout(() => { 
        isGachaProcessing = false; 
      }, 200);
      
      return { ok:true, reward };
    } catch(error) {
      console.error("Gacha error:", error);
      isGachaProcessing = false;
      return { ok:false, error:'Lỗi gacha' };
    }
  }

  async function doGachaBulk(count = 10, costPer = GACHA_COST, playerObj) {
    // Anti-spam check for bulk
    if (isGachaProcessing) {
      return { ok:false, error:'Đang xử lý, vui lòng chờ...' };
    }
    
    isGachaProcessing = true;
    
    try {
      const p = playerObj || (typeof player !== 'undefined' ? player : null);
      if (!p) {
        isGachaProcessing = false;
        return { ok:false, error:'Player object not found' };
      }
      const total = count * costPer;
      if (p.gold < total) {
        isGachaProcessing = false;
        return { ok:false, error:'Không đủ vàng' };
      }
      
      // Trừ toàn bộ gold trước
      p.gold -= total;
      
      const results = [];
      // Thực hiện count lần gacha
      for (let i = 0; i < count; i++) {
        // Tạo rarity và reward cho mỗi lần
        const rarity = pickRarity();
        let reward = null;
        const giveEquip = ['Epic','Legendary','Heirloom'].includes(rarity) || Math.random() < 0.35;
        
        if (giveEquip) {
          const equip = createEquipmentForRarity(rarity);
          if (!p.inventory) p.inventory = { consumables: [], equipment: [] };
          if (!Array.isArray(p.inventory.equipment)) p.inventory.equipment = [];
          try { p.inventory.equipment.push(JSON.stringify(equip)); } catch(e){ p.inventory.equipment.push(equip); }
          reward = { type:'equipment', rarity, data: equip };
          console.log(`✅ [${i+1}/${count}] Thêm equipment:`, equip.name || equip.type);
        } else {
          if (!p.inventory) p.inventory = { consumables: [], equipment: [] };
          if (!Array.isArray(p.inventory.consumables)) p.inventory.consumables = [];
          const consId = 'potion_small';
          p.inventory.consumables.push(consId);
          reward = { type:'consumable', rarity, data: { id: consId } };
          console.log(`✅ [${i+1}/${count}] Thêm consumable:`, consId);
        }
        
        results.push({ ok: true, reward });
      }
      
      // Save 1 lần sau khi hoàn tất tất cả
      try { 
        if (typeof savePlayerData === 'function') {
          await savePlayerData(false);
        } else if (typeof saveData === 'function') {
          await saveData();
        }
      } catch(e){ console.error("Lỗi save:", e); }
      
      try { 
        if (typeof playerLoadStats === 'function') playerLoadStats(); 
      } catch(e){ console.error("Lỗi load stats:", e); }
      
      // Unlock after bulk complete
      setTimeout(() => { isGachaProcessing = false; }, 500);
      
      return { ok:true, results };
    } catch(error) {
      console.error("Bulk gacha error:", error);
      isGachaProcessing = false;
      return { ok:false, error:'Lỗi gacha' };
    }
  }

  window.doGacha = function(arg1,arg2){
    if (typeof arg1 === 'number') return doGachaRoll(typeof player !== 'undefined' ? player : null, arg1);
    if (arg1 && typeof arg1 === 'object') return doGachaRoll(arg1, arg2);
    return doGachaRoll(typeof player !== 'undefined' ? player : null, GACHA_COST);
  };
  window.doGachaBulk = doGachaBulk;

  function initUI(){
    const openBtn = document.getElementById('open-gacha') || null;
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
            <p id="gacha-modal-x"><i class="fa fa-xmark"></i></p>
          </div>
          <div style="padding:10px;">
            <p>Giá: <b id="gacha-cost-text">${GACHA_COST}</b> vàng / lần</p>
            <button id="gacha-roll-btn" class="gachabtn">Quay 1 lần</button>
            <button id="gacha-roll10-btn" class="gachabtn" style="margin-top:8px;">Quay 10 lần</button>
            <div id="gacha-result" class="gacha-result-area"></div>
          </div>
          <button id="gacha-close" class="closebtn">Đóng</button>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const btnOpen = openBtn || document.getElementById('open-gacha') || null;
    const closeX = modal.querySelector('#gacha-modal-x') || modal.querySelector('.gacha-close') || null;
    const closeBtn = modal.querySelector('#gacha-close') || modal.querySelector('.gacha-close-btn') || null;
    const rollBtn = modal.querySelector('#gacha-roll-btn');
    const roll10Btn = modal.querySelector('#gacha-roll10-btn');
    const resultEl = modal.querySelector('#gacha-result');

    if (btnOpen) {
      // Xóa event listener cũ trước khi thêm mới
      const newBtnOpen = btnOpen.cloneNode(true);
      btnOpen.parentNode.replaceChild(newBtnOpen, btnOpen);
      
      newBtnOpen.addEventListener('click', ()=> {
        modal.style.display = 'flex';
        if (resultEl) resultEl.innerHTML = '';
        const content = modal.querySelector('.content');
        if (content) { content.classList.add('gacha-shake'); setTimeout(()=> content.classList.remove('gacha-shake'),420); }
      });
    }

    if (closeX) closeX.addEventListener('click', ()=> { modal.style.display='none'; if (resultEl) resultEl.innerHTML=''; });
    if (closeBtn) closeBtn.addEventListener('click', ()=> { modal.style.display='none'; if (resultEl) resultEl.innerHTML=''; });

    modal.addEventListener('click', (e)=> {
      if (e.target === modal) { modal.style.display = 'none'; if (resultEl) resultEl.innerHTML=''; }
    });

    if (rollBtn) rollBtn.addEventListener('click', async ()=> {
      // Prevent multiple clicks - check if already disabled
      if (rollBtn.disabled || isGachaProcessing) {
        spamAttempts++;
        if (spamAttempts >= 5) {
          if (typeof showAlert === 'function') {
            showAlert("⚠️ NGỪNG SPAM CLICK!\nVui lòng chờ animation hoàn tất.");
          } else {
            alert("⚠️ NGỪNG SPAM CLICK!\nVui lòng chờ animation hoàn tất.");
          }
          spamAttempts = 0;
        }
        return;
      }
      
      rollBtn.disabled = true;
      rollBtn.style.opacity = '0.5';
      rollBtn.style.cursor = 'not-allowed';
      
      console.log("🎰 Bắt đầu gacha 1 lần...");
      
      const res = await doGachaRoll(typeof player !== 'undefined' ? player : null, GACHA_COST);
      
      console.log("🎰 Kết quả gacha:", res);
      
      if (!res.ok) { 
        if (resultEl) resultEl.innerHTML = `<span style="color:red">${res.error}</span>`; 
        setTimeout(() => { 
          rollBtn.disabled = false; 
          rollBtn.style.opacity = '1';
          rollBtn.style.cursor = 'pointer';
        }, 500);
        return; 
      }
      const r = res.reward;
      const name = r.data && (r.data.name || r.data.type || r.data.category || r.data.id) || 'Vật phẩm';
      const contentEl = modal.querySelector('.content');
      if (contentEl) {
        contentEl.classList.add('gacha-shake');
        setTimeout(()=> {
          contentEl.classList.remove('gacha-shake');
          contentEl.classList.add('gacha-flash');
          setTimeout(()=> contentEl.classList.remove('gacha-flash'), 260);
        }, 420);
      }
      if (resultEl) {
        const row = document.createElement('div');
        row.className = 'gacha-item-row r-' + r.rarity;
        row.innerHTML = `<div style="font-weight:700">${r.rarity}</div><div>${name}</div>`;
        resultEl.innerHTML = '';
        resultEl.appendChild(row);
        setTimeout(()=> row.classList.add('gacha-pop'), 260);
      }
      
      console.log("✅ Gacha hoàn tất");
      
      // Re-enable button after animation
      setTimeout(() => { 
        rollBtn.disabled = false; 
        rollBtn.style.opacity = '1';
        rollBtn.style.cursor = 'pointer';
        spamAttempts = 0; // Reset counter
      }, 1000);
    }, { once: false }); // Chỉ đăng ký 1 lần

    if (roll10Btn) roll10Btn.addEventListener('click', async ()=> {
      // Prevent multiple clicks - check if already disabled
      if (roll10Btn.disabled || isGachaProcessing) {
        spamAttempts++;
        if (spamAttempts >= 5) {
          if (typeof showAlert === 'function') {
            showAlert("⚠️ NGỪNG SPAM CLICK!\nĐang quay 10 lần, vui lòng chờ...");
          } else {
            alert("⚠️ NGỪNG SPAM CLICK!\nĐang quay 10 lần, vui lòng chờ...");
          }
          spamAttempts = 0;
        }
        return;
      }
      
      roll10Btn.disabled = true;
      roll10Btn.style.opacity = '0.5';
      roll10Btn.style.cursor = 'not-allowed';
      
      console.log("🎰 Bắt đầu gacha 10 lần...");
      
      const bulk = await doGachaBulk(10, GACHA_COST, typeof player !== 'undefined' ? player : null);
      
      console.log("🎰 Kết quả bulk gacha:", bulk);
      
      if (!bulk.ok) { 
        if (resultEl) resultEl.innerHTML = `<span style="color:red">${bulk.error}</span>`; 
        setTimeout(() => { 
          roll10Btn.disabled = false; 
          roll10Btn.style.opacity = '1';
          roll10Btn.style.cursor = 'pointer';
        }, 1000);
        return; 
      }
      if (resultEl) {
        resultEl.innerHTML = '';
        bulk.results.forEach((it, idx) => {
          const r = it.reward;
          if (!r) return;
          const name = r.data && (r.data.name || r.data.type || r.data.category || r.data.id) || 'Vật phẩm';
          const row = document.createElement('div');
          row.className = 'gacha-item-row r-' + r.rarity;
          row.innerHTML = `<div style="font-weight:700">${idx+1}. ${r.rarity}</div><div>${name}</div>`;
          resultEl.appendChild(row);
          setTimeout(()=> row.classList.add('gacha-pop'), 180 + idx*60);
        });
      }
      
      console.log("✅ Bulk gacha hoàn tất, tổng items:", bulk.results.length);
      
      // Re-enable button after all animations
      setTimeout(() => { 
        roll10Btn.disabled = false; 
        roll10Btn.style.opacity = '1';
        roll10Btn.style.cursor = 'pointer';
        spamAttempts = 0; // Reset counter
      }, 2500);
    }, { once: false }); // Chỉ đăng ký 1 lần

  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUI); else initUI();

})();