(function(){
  const GACHA_COST = 1000;

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

  function doGachaRoll(playerObj, cost = GACHA_COST) {
    const p = playerObj || (typeof player !== 'undefined' ? player : null);
    if (!p) return { ok:false, error:'Player object not found' };
    if (typeof p.gold !== 'number') p.gold = 0;
    if (p.gold < cost) return { ok:false, error:'Không đủ vàng' };

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
    } else {
      if (!p.inventory) p.inventory = { consumables: [], equipment: [] };
      if (!Array.isArray(p.inventory.consumables)) p.inventory.consumables = [];
      const consId = 'potion_small';
      p.inventory.consumables.push(consId);
      reward = { type:'consumable', rarity, data: { id: consId } };
    }

    try { if (typeof saveData === 'function') saveData(); } catch(e){}
    try { if (typeof playerLoadStats === 'function') playerLoadStats(); } catch(e){}

    return { ok:true, reward };
  }

  function doGachaBulk(count = 10, costPer = GACHA_COST, playerObj) {
    const p = playerObj || (typeof player !== 'undefined' ? player : null);
    if (!p) return { ok:false, error:'Player object not found' };
    const total = count * costPer;
    if (p.gold < total) return { ok:false, error:'Không đủ vàng' };
    const results = [];
    for (let i=0;i<count;i++){
      const r = doGachaRoll(p, costPer);
      results.push(r);
      if (!r.ok) break;
    }
    return { ok:true, results };
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
      btnOpen.addEventListener('click', ()=> {
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

    if (rollBtn) rollBtn.addEventListener('click', ()=> {
      const res = doGachaRoll(typeof player !== 'undefined' ? player : null, GACHA_COST);
      if (!res.ok) { if (resultEl) resultEl.innerHTML = `<span style="color:red">${res.error}</span>`; return; }
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
    });

    if (roll10Btn) roll10Btn.addEventListener('click', ()=> {
      const bulk = doGachaBulk(10, GACHA_COST, typeof player !== 'undefined' ? player : null);
      if (!bulk.ok) { if (resultEl) resultEl.innerHTML = `<span style="color:red">${bulk.error}</span>`; return; }
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
    });

  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUI); else initUI();

})();