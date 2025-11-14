// main.js (FULL) - dán đè file hiện tại
// Đặt toàn bộ logic chính của game vào đây.
// Note: giả định các file khác (player.js, dungeon.js, music.js...) vẫn tồn tại và khai báo một số biến/func.
// Nếu một số biến không tồn tại, file sẽ không crash nhờ các guard checks.

(function () {
  'use strict';

  // DOM-ready
  document.addEventListener('DOMContentLoaded', () => {

    //
    // --- Safe DOM references / fallbacks ---
    //
    const $ = sel => document.querySelector(sel);
    const defaultModalElement = $('#defaultModal') || createTempModal('defaultModal');
    const menuModalElement = $('#menuModal') || createTempModal('menuModal');
    const confirmationModalElement = $('#confirmationModal') || createTempModal('confirmationModal');
    const inventoryElement = $('#inventory');
    const titleScreenEl = $('#title-screen');
    const loadingEl = $('#loading');
    const dungeonMainEl = $('#dungeon-main');
    const authOverlay = $('#authOverlay');

    // safe placeholders for audio / globals (so code doesn't throw if not yet defined)
    window.sfxOpen = window.sfxOpen || { play() {} };
    window.sfxConfirm = window.sfxConfirm || { play() {} };
    window.sfxDecline = window.sfxDecline || { play() {} };
    window.sfxDeny = window.sfxDeny || { play() {} };
    window.sfxUnequip = window.sfxUnequip || { play() {} };
    window.bgmDungeon = window.bgmDungeon || { play() {}, stop() {} };
    window.bgmBattleMain = window.bgmBattleMain || { play() {}, stop() {} };

    // Ensure some global containers exist
    window.player = window.player || {};
    window.dungeon = window.dungeon || { status: {}, progress: {}, statistics: {}, settings: {}, backlog: [] };
    window.enemy = window.enemy || {};
    window.volume = window.volume || { master: 1, bgm: 0.5, sfx: 1 };

    //
    // --- Utility helpers ---
    //
    function createTempModal(id) {
      // create a hidden modal container if missing so code can safely write into it
      const el = document.createElement('div');
      el.id = id;
      el.className = 'modal-container';
      el.style.display = 'none';
      document.body.appendChild(el);
      return el;
    }

    function nFormatter(num) {
      if (num === undefined || num === null) return 0;
      if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
      if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
      if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
      return num;
    }

    //
    // --- startGameAfterLogin: robust and callable anytime ---
    //
    window.startGameAfterLogin = async function () {
      try {
        // If auth not present or no currentUser, show auth modal and don't reveal title
        if (!window.currentUid || !window.auth || !window.auth.currentUser) {
          if ($('#character-creation')) $('#character-creation').style.display = 'none';
          if (titleScreenEl) titleScreenEl.style.display = 'none';
          if (window.showAuthModal) window.showAuthModal();
          return;
        }

        // At this point we have an auth user
        if ($('#character-creation')) $('#character-creation').style.display = 'none';
        if (titleScreenEl) titleScreenEl.style.display = 'flex';

        // Mirror firestore -> localStorage if available handled in firebase-init.js (mirrorFirestoreToLocal)
        // Load local player if present
        let localPlayer = localStorage.getItem('playerData');

        if (localPlayer) {
          try {
            player = JSON.parse(localPlayer);
          } catch (e) {
            console.warn('playerData parse fail, recreating', e);
            localStorage.removeItem('playerData');
            localPlayer = null;
          }
        }

        if (!localPlayer) {
          // create new default player
          const name = (window.auth.currentUser && window.auth.currentUser.displayName) ? window.auth.currentUser.displayName : 'Người chơi';
          player = {
            name: name,
            lvl: 1,
            stats: { hp: 100, hpMax: 100, atk: 5, def: 3, pen: 0, atkSpd: 1, vamp: 0, critRate: 0, critDmg: 50 },
            baseStats: { hp: 500, atk: 100, def: 50, pen: 0, atkSpd: 0.6, vamp: 0, critRate: 0, critDmg: 50 },
            equippedStats: { hp: 0, atk: 0, def: 0, pen: 0, atkSpd: 0, vamp: 0, critRate: 0, critDmg: 0, hpPct: 0, atkPct: 0, defPct: 0, penPct: 0 },
            bonusStats: { hp: 0, atk: 0, def: 0, atkSpd: 0, vamp: 0, critRate: 0, critDmg: 0 },
            exp: { expCurr: 0, expMax: 100, expCurrLvl: 0, expMaxLvl: 100, lvlGained: 0 },
            inventory: { consumables: [], equipment: [] },
            equipped: [], gold: 0, playtime: 0, kills: 0, deaths: 0, inCombat: false
          };
          calculateStats();
          player.stats.hp = player.stats.hpMax;
          await saveData().catch(e => console.warn('save fail', e));
        }

        // Bind title click in a safe way (prevent duplicates)
        if (titleScreenEl) {
          // ensure it's clickable (pointer-events, cursor)
          titleScreenEl.style.cursor = 'pointer';
          // remove existing before adding to avoid duplicate handlers
          titleScreenEl.onclick = function () {
            // if auth not ready -> show auth modal
            if (!window.currentUid || !window.auth || !window.auth.currentUser) {
              if (window.showAuthModal) window.showAuthModal();
              return;
            }
            const p = JSON.parse(localStorage.getItem('playerData') || '{}');
            if (p && p.allocated) {
              enterDungeon();
            } else {
              allocationPopup();
            }
          };
        }

        // Prevent double-tap zoom on mobile
        document.ondblclick = function (e) { e.preventDefault(); };

      } catch (err) {
        console.error('startGameAfterLogin error:', err);
      }
    };

    // If firebase already set currentUid before scripts reached here, try starting
    if (window.currentUid && typeof window.startGameAfterLogin === 'function') {
      try { window.startGameAfterLogin(); } catch (e) { console.warn(e); }
    }

    //
    // --- UI / Menu / Inventory logic (from your code, hardened) ---
    //

    // Unequip all items
    const unequipAllEl = $('#unequip-all');
    if (unequipAllEl) {
      unequipAllEl.addEventListener('click', () => {
        try {
          window.sfxOpen.play();
          if (dungeon) dungeon.status.exploring = false;
          const dimTarget = $('#inventory');
          if (dimTarget) dimTarget.style.filter = 'brightness(50%)';
          defaultModalElement.style.display = 'flex';
          defaultModalElement.innerHTML = `
            <div class="content">
              <p>Bỏ hết vật phẩm của bạn?</p>
              <div class="button-container">
                <button id="unequip-confirm">Bỏ Vật Phẩm</button>
                <button id="unequip-cancel">Hủy Bỏ</button>
              </div>
            </div>`;
          const confirm = document.querySelector('#unequip-confirm');
          const cancel = document.querySelector('#unequip-cancel');
          confirm.onclick = function () {
            try { window.sfxUnequip.play(); } catch (e) {}
            if (typeof unequipAll === 'function') unequipAll();
            if (typeof continueExploring === 'function') continueExploring();
            defaultModalElement.style.display = 'none';
            defaultModalElement.innerHTML = '';
            if (dimTarget) dimTarget.style.filter = 'brightness(100%)';
          };
          cancel.onclick = function () {
            try { window.sfxDecline.play(); } catch (e) {}
            if (typeof continueExploring === 'function') continueExploring();
            defaultModalElement.style.display = 'none';
            defaultModalElement.innerHTML = '';
            if (dimTarget) dimTarget.style.filter = 'brightness(100%)';
          };
        } catch (err) {
          console.warn('unequip-all error', err);
        }
      });
    }

    // Menu button
    const menuBtn = $('#menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        try {
          if (typeof closeInventory === 'function') closeInventory();
          if (dungeon) dungeon.status.exploring = false;
          if (dungeonMainEl) dungeonMainEl.style.filter = 'brightness(50%)';
          menuModalElement.style.display = 'flex';
          menuModalElement.innerHTML = `
            <div class="content">
              <div class="content-head">
                <h3>Menu</h3>
                <p id="close-menu"><i class="fa fa-xmark"></i></p>
              </div>
              <button id="player-menu"><i class="fas fa-user"></i>${player.name || 'Player'}</button>
              <button id="stats">Chỉ Số Chính</button>
              <button id="volume-btn">Âm Thanh</button>
              <button id="export-import">Mã Dữ Liệu</button>
              <button id="quit-run">Xóa Hầm Ngục</button>
            </div>`;

          const close = document.querySelector('#close-menu');
          const playerMenu = document.querySelector('#player-menu');
          const runMenu = document.querySelector('#stats');
          const quitRun = document.querySelector('#quit-run');
          const exportImport = document.querySelector('#export-import');
          const volumeSettings = document.querySelector('#volume-btn');

          // Player profile
          playerMenu.onclick = function () {
            try { window.sfxOpen.play(); } catch (e) {}
            const playTime = new Date((player.playtime || 0) * 1000).toISOString().slice(11, 19);
            menuModalElement.style.display = 'none';
            defaultModalElement.style.display = 'flex';
            defaultModalElement.innerHTML = `
              <div class="content" id="profile-tab">
                <div class="content-head">
                  <h3>Thông Tin</h3>
                  <p id="profile-close"><i class="fa fa-xmark"></i></p>
                </div>
                <p>${player.name || 'Player'} Lv.${player.lvl || 1}</p>
                <p>Giết: ${nFormatter(player.kills)}</p>
                <p>Chết: ${nFormatter(player.deaths)}</p>
                <p>Chơi: ${playTime}</p>
              </div>`;
            const profileClose = document.querySelector('#profile-close');
            profileClose.onclick = function () {
              try { window.sfxDecline.play(); } catch (e) {}
              defaultModalElement.style.display = 'none';
              defaultModalElement.innerHTML = '';
              menuModalElement.style.display = 'flex';
            };
          };

          // Run stats
          runMenu.onclick = function () {
            try { window.sfxOpen.play(); } catch (e) {}
            const runTime = new Date((dungeon.statistics && dungeon.statistics.runtime || 0) * 1000).toISOString().slice(11, 19);
            menuModalElement.style.display = 'none';
            defaultModalElement.style.display = 'flex';
            defaultModalElement.innerHTML = `
              <div class="content" id="run-tab">
                <div class="content-head">
                  <h3>Chỉ Số</h3>
                  <p id="run-close"><i class="fa fa-xmark"></i></p>
                </div>
                <p>${player.name || 'Player'} Lv.${player.lvl || 1} (${(player.skills || []).join(', ')})</p>
                <p>Phước Lành Lvl.${player.blessing || 1}</p>
                <p>Lời Nguyền Lvl.${Math.round((dungeon.settings?.enemyScaling - 1 || 0) * 10)}</p>
                <p>Giết Được: ${nFormatter(dungeon.statistics?.kills)}</p>
                <p>Hoạt Động: ${runTime}</p>
              </div>`;
            const runClose = document.querySelector('#run-close');
            runClose.onclick = function () {
              try { window.sfxDecline.play(); } catch (e) {}
              defaultModalElement.style.display = 'none';
              defaultModalElement.innerHTML = '';
              menuModalElement.style.display = 'flex';
            };
          };

          // Quit run
          quitRun.onclick = function () {
            try { window.sfxOpen.play(); } catch (e) {}
            menuModalElement.style.display = 'none';
            defaultModalElement.style.display = 'flex';
            defaultModalElement.innerHTML = `
              <div class="content">
                <p>Bạn có muốn xóa hầm ngục này?</p>
                <div class="button-container">
                  <button id="quit-run-confirm">Đồng Ý</button>
                  <button id="cancel-quit">Hủy Bỏ</button>
                </div>
              </div>`;
            const quit = document.querySelector('#quit-run-confirm');
            const cancel = document.querySelector('#cancel-quit');
            quit.onclick = function () {
              try { window.sfxConfirm.play(); } catch (e) {}
              if (window.bgmDungeon && typeof window.bgmDungeon.stop === 'function') window.bgmDungeon.stop();
              if (dungeonMainEl) {
                dungeonMainEl.style.filter = 'brightness(100%)';
                dungeonMainEl.style.display = 'none';
              }
              menuModalElement.style.display = 'none';
              menuModalElement.innerHTML = '';
              defaultModalElement.style.display = 'none';
              defaultModalElement.innerHTML = '';
              runLoad('title-screen', 'flex');
              if (typeof clearInterval === 'function') {
                clearInterval(window.dungeonTimer);
                clearInterval(window.playTimer);
              }
              if (typeof progressReset === 'function') progressReset();
            };
            cancel.onclick = function () {
              try { window.sfxDecline.play(); } catch (e) {}
              defaultModalElement.style.display = 'none';
              defaultModalElement.innerHTML = '';
              menuModalElement.style.display = 'flex';
            };
          };

          // Volume settings
          volumeSettings.onclick = function () {
            try { window.sfxOpen.play(); } catch (e) {}
            const master = (volume.master || 1) * 100;
            const bgm = (volume.bgm || 0.5) * 100 * 2;
            const sfx = (volume.sfx || 1) * 100;
            menuModalElement.style.display = 'none';
            defaultModalElement.style.display = 'flex';
            defaultModalElement.innerHTML = `
              <div class="content" id="volume-tab">
                <div class="content-head">
                  <h3>Âm Thanh</h3>
                  <p id="volume-close"><i class="fa fa-xmark"></i></p>
                </div>
                <label id="master-label" for="master-volume">Tổng (${master}%)</label>
                <input type="range" id="master-volume" min="0" max="100" value="${master}">
                <label id="bgm-label" for="bgm-volume">Nhạc Nền (${bgm}%)</label>
                <input type="range" id="bgm-volume" min="0" max="100" value="${bgm}">
                <label id="sfx-label" for="sfx-volume">Hiệu Ứng (${sfx}%)</label>
                <input type="range" id="sfx-volume" min="0" max="100" value="${sfx}">
                <button id="apply-volume">Áp Dụng</button>
              </div>`;
            const masterVol = document.querySelector('#master-volume');
            const bgmVol = document.querySelector('#bgm-volume');
            const sfxVol = document.querySelector('#sfx-volume');
            const applyVol = document.querySelector('#apply-volume');
            const volumeClose = document.querySelector('#volume-close');
            volumeClose.onclick = function () {
              try { window.sfxDecline.play(); } catch (e) {}
              defaultModalElement.style.display = 'none';
              defaultModalElement.innerHTML = '';
              menuModalElement.style.display = 'flex';
            };
            masterVol.oninput = function () { document.querySelector('#master-label').innerHTML = `Tổng (${this.value}%)`; };
            bgmVol.oninput = function () { document.querySelector('#bgm-label').innerHTML = `Nhạc Nền (${this.value}%)`; };
            sfxVol.oninput = function () { document.querySelector('#sfx-label').innerHTML = `Hiệu Ứng (${this.value}%)`; };
            applyVol.onclick = function () {
              volume.master = (masterVol.value || master) / 100;
              volume.bgm = ((bgmVol.value || bgm) / 100) / 2;
              volume.sfx = (sfxVol.value || sfx) / 100;
              try {
                if (window.bgmDungeon && typeof window.bgmDungeon.stop === 'function') window.bgmDungeon.stop();
                if (typeof setVolume === 'function') setVolume();
                if (window.bgmDungeon && typeof window.bgmDungeon.play === 'function') window.bgmDungeon.play();
                saveData();
              } catch (err) { console.warn('apply volume error', err); }
            };
          };

          // Export/Import Save Data
          exportImport.onclick = function () {
            try { window.sfxOpen.play(); } catch (e) {}
            const exportedData = exportData();
            menuModalElement.style.display = 'none';
            defaultModalElement.style.display = 'flex';
            defaultModalElement.innerHTML = `
              <div class="content" id="ei-tab">
                <div class="content-head">
                  <h3>Mã Dữ Liệu</h3>
                  <p id="ei-close"><i class="fa fa-xmark"></i></p>
                </div>
                <h4>Xuất Dữ Liệu</h4>
                <input type="text" id="export-input" autocomplete="off" value="${exportedData}" readonly>
                <button id="copy-export">Sao Chép</button>
                <h4>Nhập Dữ Liệu</h4>
                <input type="text" id="import-input" autocomplete="off">
                <button id="data-import">Đồng Ý</button>
              </div>`;
            const eiClose = document.querySelector('#ei-close');
            const copyExport = document.querySelector('#copy-export');
            const dataImport = document.querySelector('#data-import');
            const importInput = document.querySelector('#import-input');
            copyExport.onclick = function () {
              try { window.sfxConfirm.play(); } catch (e) {}
              const copyText = document.querySelector('#export-input');
              try {
                copyText.select();
                copyText.setSelectionRange(0, 99999);
                navigator.clipboard.writeText(copyText.value);
                copyExport.innerHTML = 'Copied!';
              } catch (err) {
                console.warn('copy failed', err);
              }
            };
            dataImport.onclick = function () {
              importData(importInput.value);
            };
            eiClose.onclick = function () {
              try { window.sfxDecline.play(); } catch (e) {}
              defaultModalElement.style.display = 'none';
              defaultModalElement.innerHTML = '';
              menuModalElement.style.display = 'flex';
            };
          };

          // Close menu
          close.onclick = function () {
            try { window.sfxDecline.play(); } catch (e) {}
            if (typeof continueExploring === 'function') continueExploring();
            menuModalElement.style.display = 'none';
            menuModalElement.innerHTML = '';
            if (dungeonMainEl) dungeonMainEl.style.filter = 'brightness(100%)';
          };

        } catch (err) {
          console.warn('menu error', err);
        }
      });
    }

    //
    // --- Loading / Enter Dungeon / Run helpers ---
    //
    window.runLoad = (id, display) => {
      try {
        if (loadingEl) loadingEl.style.display = 'flex';
        setTimeout(async () => {
          if (loadingEl) loadingEl.style.display = 'none';
          const target = document.querySelector(`#${id}`);
          if (target) target.style.display = `${display}`;
        }, 800);
      } catch (err) { console.warn('runLoad error', err); }
    };

    window.enterDungeon = () => {
      try {
        try { window.sfxConfirm.play(); } catch (e) {}
        if (titleScreenEl) titleScreenEl.style.display = 'none';
        runLoad('dungeon-main', 'flex');
        if (player.inCombat) {
          try {
            window.enemy = JSON.parse(localStorage.getItem('enemyData') || '{}');
          } catch (e) { window.enemy = window.enemy || {}; }
          if (typeof showCombatInfo === 'function') showCombatInfo();
          if (typeof startCombat === 'function') startCombat(window.bgmBattleMain);
        } else {
          if (window.bgmDungeon && typeof window.bgmDungeon.play === 'function') window.bgmDungeon.play();
        }
        if (player.stats && player.stats.hp === 0) {
          if (typeof progressReset === 'function') progressReset();
        }
        if (typeof initialDungeonLoad === 'function') initialDungeonLoad();
        if (typeof playerLoadStats === 'function') playerLoadStats();
      } catch (err) {
        console.warn('enterDungeon error', err);
      }
    };

    //
    // --- Data save/load/calc logic (safe) ---
    //
    window.saveData = async () => {
      try {
        const playerData = JSON.stringify(player || {});
        const dungeonData = JSON.stringify(dungeon || {});
        const enemyData = JSON.stringify(window.enemy || {});
        const volumeData = JSON.stringify(volume || {});
        // Attempt Firestore if available
        try {
          if (window.db && window.currentUid && window.firebaseSetDoc && window.firebaseDoc) {
            const docData = { player, dungeon, enemy: window.enemy, volume, updatedAt: Date.now() };
            await window.firebaseSetDoc(window.firebaseDoc(window.db, 'players', window.currentUid), docData);
            // mirror locally
            localStorage.setItem('playerData', playerData);
            localStorage.setItem('dungeonData', dungeonData);
            localStorage.setItem('enemyData', enemyData);
            localStorage.setItem('volumeData', volumeData);
            console.log('Saved to Firestore for uid:', window.currentUid);
            return;
          }
        } catch (e) {
          console.warn('Firestore save failed:', e);
        }
        // fallback localStorage
        localStorage.setItem('playerData', playerData);
        localStorage.setItem('dungeonData', dungeonData);
        localStorage.setItem('enemyData', enemyData);
        localStorage.setItem('volumeData', volumeData);
      } catch (err) {
        console.warn('saveData error', err);
      }
    };

    window.calculateStats = () => {
      try {
        if (!player || !player.baseStats || !player.equippedStats || !player.bonusStats) return;
        const equipmentAtkSpd = (player.baseStats.atkSpd || 0) * ((player.equippedStats.atkSpd || 0) / 100);
        const playerHpBase = player.baseStats.hp || 0;
        const playerAtkBase = player.baseStats.atk || 0;
        const playerDefBase = player.baseStats.def || 0;
        const playerAtkSpdBase = player.baseStats.atkSpd || 0;
        const playerVampBase = player.baseStats.vamp || 0;
        const playerCRateBase = player.baseStats.critRate || 0;
        const playerCDmgBase = player.baseStats.critDmg || 0;

        player.stats = player.stats || {};
        player.stats.hpMax = Math.round((playerHpBase + playerHpBase * ((player.bonusStats.hp || 0) / 100)) + (player.equippedStats.hp || 0));
        player.stats.atk = Math.round((playerAtkBase + playerAtkBase * ((player.bonusStats.atk || 0) / 100)) + (player.equippedStats.atk || 0));
        player.stats.def = Math.round((playerDefBase + playerDefBase * ((player.bonusStats.def || 0) / 100)) + (player.equippedStats.def || 0));
        player.stats.atkSpd = (playerAtkSpdBase + playerAtkSpdBase * ((player.bonusStats.atkSpd || 0) / 100)) + equipmentAtkSpd + (equipmentAtkSpd * ((player.equippedStats.atkSpd || 0) / 100));
        player.stats.vamp = playerVampBase + (player.bonusStats.vamp || 0) + (player.equippedStats.vamp || 0);
        player.stats.critRate = playerCRateBase + (player.bonusStats.critRate || 0) + (player.equippedStats.critRate || 0);
        player.stats.critDmg = playerCDmgBase + (player.bonusStats.critDmg || 0) + (player.equippedStats.critDmg || 0);

        if (player.stats.atkSpd > 2.5) player.stats.atkSpd = 2.5;
      } catch (err) {
        console.warn('calculateStats error', err);
      }
    };

    window.progressReset = () => {
      try {
        player.stats = player.stats || {};
        player.stats.hp = player.stats.hpMax || (player.baseStats && player.baseStats.hp) || 100;
        player.lvl = 1;
        player.blessing = 1;
        player.exp = { expCurr: 0, expMax: 100, expCurrLvl: 0, expMaxLvl: 100, lvlGained: 0 };
        player.bonusStats = { hp: 0, atk: 0, def: 0, atkSpd: 0, vamp: 0, critRate: 0, critDmg: 0 };
        player.skills = [];
        player.inCombat = false;
        dungeon.progress = dungeon.progress || {};
        dungeon.progress.floor = 1;
        dungeon.progress.room = 1;
        dungeon.statistics = dungeon.statistics || {};
        dungeon.statistics.kills = 0;
        dungeon.status = { exploring: false, paused: true, event: false };
        dungeon.settings = { enemyBaseLvl: 1, enemyLvlGap: 5, enemyBaseStats: 1, enemyScaling: 1.1 };
        delete dungeon.enemyMultipliers;
        delete player.allocated;
        dungeon.backlog = [];
        dungeon.action = 0;
        dungeon.statistics.runtime = 0;
        window.combatBacklog = [];
        if (typeof saveData === 'function') saveData();
      } catch (err) {
        console.warn('progressReset error', err);
      }
    };

    //
    // --- Export / Import ---
    //
    window.exportData = () => {
      try {
        return btoa(JSON.stringify(player || {}));
      } catch (err) {
        console.warn('exportData fail', err);
        return '';
      }
    };

    window.importData = (importedData) => {
      try {
        const playerImport = JSON.parse(atob(importedData));
        if (playerImport && playerImport.inventory !== undefined) {
          try { window.sfxOpen.play(); } catch (e) {}
          defaultModalElement.style.display = 'none';
          confirmationModalElement.style.display = 'flex';
          confirmationModalElement.innerHTML = `
            <div class="content">
              <p>Bạn có chắc chắn muốn nhập dữ liệu này không? Thao tác này sẽ xóa dữ liệu hiện tại và đặt lại tiến trình hầm ngục của bạn.</p>
              <div class="button-container">
                <button id="import-btn">Đồng Ý</button>
                <button id="cancel-btn">Hủy Bỏ</button>
              </div>
            </div>`;
          document.querySelector('#import-btn').onclick = function () {
            try { window.sfxConfirm.play(); } catch (e) {}
            window.player = playerImport;
            saveData();
            if (window.bgmDungeon && typeof window.bgmDungeon.stop === 'function') window.bgmDungeon.stop();
            const dimDungeon = $('#dungeon-main');
            if (dimDungeon) dimDungeon.style.filter = 'brightness(100%)';
            if (dimDungeon) dimDungeon.style.display = 'none';
            menuModalElement.style.display = 'none';
            menuModalElement.innerHTML = '';
            confirmationModalElement.style.display = 'none';
            confirmationModalElement.innerHTML = '';
            defaultModalElement.style.display = 'none';
            defaultModalElement.innerHTML = '';
            runLoad('title-screen', 'flex');
            if (typeof clearInterval === 'function') {
              clearInterval(window.dungeonTimer);
              clearInterval(window.playTimer);
            }
            progressReset();
          };
          document.querySelector('#cancel-btn').onclick = function () {
            try { window.sfxDecline.play(); } catch (e) {}
            confirmationModalElement.style.display = 'none';
            confirmationModalElement.innerHTML = '';
            defaultModalElement.style.display = 'flex';
          };
        } else {
          try { window.sfxDeny.play(); } catch (e) {}
        }
      } catch (err) {
        try { window.sfxDeny.play(); } catch (e) {}
        console.warn('importData error', err);
      }
    };

    //
    // --- Allocation popup (stat allocation) ---
    //
    window.allocationPopup = () => {
      try {
        let allocation = { hp: 5, atk: 5, def: 5, atkSpd: 5 };
        let stats;
        const updateStats = () => {
          stats = {
            hp: 50 * allocation.hp,
            atk: 10 * allocation.atk,
            def: 10 * allocation.def,
            atkSpd: 0.4 + (0.02 * allocation.atkSpd)
          };
        };
        updateStats();
        let points = 20;
        const loadContent = function () {
          defaultModalElement.innerHTML = `
          <div class="content" id="allocate-stats">
            <div class="content-head">
              <h3>Thống Kê</h3>
              <p id="allocate-close"><i class="fa fa-xmark"></i></p>
            </div>
            <div class="row">
              <p><i class="fas fa-heart"></i><span id="hpDisplay">HP: ${stats.hp}</span></p>
              <div class="row">
                <button id="hpMin">-</button>
                <span id="hpAllo">${allocation.hp}</span>
                <button id="hpAdd">+</button>
              </div>
            </div>
            <div class="row">
              <p><i class="ra ra-sword"></i><span id="atkDisplay">ATK: ${stats.atk}</span></p>
              <div class="row">
                <button id="atkMin">-</button>
                <span id="atkAllo">${allocation.atk}</span>
                <button id="atkAdd">+</button>
              </div>
            </div>
            <div class="row">
              <p><i class="ra ra-round-shield"></i><span id="defDisplay">DEF: ${stats.def}</span></p>
              <div class="row">
                <button id="defMin">-</button>
                <span id="defAllo">${allocation.def}</span>
                <button id="defAdd">+</button>
              </div>
            </div>
            <div class="row">
              <p><i class="ra ra-plain-dagger"></i><span id="atkSpdDisplay">ATK.SPD: ${stats.atkSpd}</span></p>
              <div class="row">
                <button id="atkSpdMin">-</button>
                <span id="atkSpdAllo">${allocation.atkSpd}</span>
                <button id="atkSpdAdd">+</button>
              </div>
            </div>
            <div class="row">
              <p id="alloPts">Stat Points: ${points}</p>
              <button id="allocate-reset">Đặt Lại</button>
            </div>
            <div class="row">
              <p>Passive</p>
              <select id="select-skill">
                <option value="Remnant Razor">Remnant Razor</option>
                <option value="Titan's Will">Titan's Will</option>
                <option value="Devastator">Devastator</option>
                <option value="Blade Dance">Blade Dance</option>
                <option value="Paladin's Heart">Paladin's Heart</option>
                <option value="Aegis Thorns">Aegis Thorns</option>
              </select>
            </div>
            <div class="row primary-panel pad">
              <p id="skill-desc">Các đòn tấn công gây thêm 8% lượng máu hiện tại của kẻ địch khi đánh trúng.</p>
            </div>
            <button id="allocate-confirm">Tiến Hành</button>
          </div>`;
        };

        defaultModalElement.style.display = 'flex';
        if (titleScreenEl) titleScreenEl.style.filter = 'brightness(50%)';
        loadContent();

        // helper for stat buttons
        const handleStatButtons = (e) => {
          const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
          if (e.includes('Add')) {
            const stat = e.split('Add')[0];
            if (points > 0) {
              try { window.sfxConfirm.play(); } catch (ex) {}
              allocation[stat]++;
              points--;
              updateStats();
              document.querySelector(`#${stat}Display`).innerHTML = `${stat.replace(/([A-Z])/g, ' $1').trim().replace(/ /g, '.').toUpperCase()}: ${stats[stat].toFixed(2).replace(rx, '$1')}`;
              document.querySelector(`#${stat}Allo`).innerHTML = allocation[stat];
              document.querySelector(`#alloPts`).innerHTML = `Stat Points: ${points}`;
            } else {
              try { window.sfxDeny.play(); } catch (ex) {}
            }
          } else if (e.includes('Min')) {
            const stat = e.split('Min')[0];
            if (allocation[stat] > 5) {
              try { window.sfxConfirm.play(); } catch (ex) {}
              allocation[stat]--;
              points++;
              updateStats();
              document.querySelector(`#${stat}Display`).innerHTML = `${stat.replace(/([A-Z])/g, ' $1').trim().replace(/ /g, '.').toUpperCase()}: ${stats[stat].toFixed(2).replace(rx, '$1')}`;
              document.querySelector(`#${stat}Allo`).innerHTML = allocation[stat];
              document.querySelector(`#alloPts`).innerHTML = `Stat Points: ${points}`;
            } else {
              try { window.sfxDeny.play(); } catch (ex) {}
            }
          }
        };

        // wire buttons (use event delegation safety)
        ['hpAdd','hpMin','atkAdd','atkMin','defAdd','defMin','atkSpdAdd','atkSpdMin'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.onclick = () => handleStatButtons(id);
        });

        // skill select handling
        const selectSkill = document.getElementById('select-skill');
        const skillDesc = document.getElementById('skill-desc');
        if (selectSkill) {
          selectSkill.onclick = function () { try { window.sfxConfirm.play(); } catch (e) {} };
          selectSkill.onchange = function () {
            const v = selectSkill.value;
            const map = {
              "Remnant Razor": "Các đòn tấn công gây thêm 8% lượng máu hiện tại của kẻ địch khi đánh trúng.",
              "Titan's Will": "Các đòn tấn công gây thêm 5% lượng máu tối đa của bạn khi đánh trúng.",
              "Devastator": "Gây thêm 30% sát thương nhưng bạn mất 30% tốc độ đánh cơ bản.",
              "Rampager": "Tăng 5 điểm tấn công sau mỗi đòn đánh. Điểm cộng dồn sẽ được đặt lại sau trận chiến.",
              "Blade Dance": "Tăng tốc độ tấn công sau mỗi đòn đánh. Cộng dồn sẽ được đặt lại sau trận chiến.",
              "Paladin's Heart": "Bạn sẽ nhận ít hơn 25% sát thương vĩnh viễn.",
              "Aegis Thorns": "Kẻ địch phải chịu 15% sát thương mà chúng gây ra."
            };
            if (skillDesc) skillDesc.innerHTML = map[v] || '';
          };
        }

        // confirm / reset / close
        const confirm = document.getElementById('allocate-confirm');
        const reset = document.getElementById('allocate-reset');
        const close = document.getElementById('allocate-close');

        if (confirm) confirm.onclick = function () {
          try {
            player.baseStats = {
              hp: stats.hp,
              atk: stats.atk,
              def: stats.def,
              pen: 0,
              atkSpd: stats.atkSpd,
              vamp: 0,
              critRate: 0,
              critDmg: 50
            };
            // ensure skills array
            if (!player.skills) player.skills = [];
            const sel = document.getElementById('select-skill');
            const val = sel ? sel.value : 'Remnant Razor';
            if (val) {
              player.skills.push(val);
              if (val === 'Devastator') {
                player.baseStats.atkSpd = player.baseStats.atkSpd - ((30 * player.baseStats.atkSpd) / 100);
              }
            }
            player.allocated = true;
            enterDungeon();
            player.stats.hp = player.stats.hpMax;
            if (typeof playerLoadStats === 'function') playerLoadStats();
            defaultModalElement.style.display = 'none';
            defaultModalElement.innerHTML = '';
            if (titleScreenEl) titleScreenEl.style.filter = 'brightness(100%)';
            saveData();
          } catch (err) { console.warn('allocate confirm error', err); }
        };

        if (reset) reset.onclick = function () {
          try { window.sfxDecline.play(); } catch (e) {}
          allocation = { hp: 5, atk: 5, def: 5, atkSpd: 5 };
          points = 20;
          updateStats();
          const setText = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };
          setText('hpDisplay', `HP: ${stats.hp}`);
          setText('atkDisplay', `ATK: ${stats.atk}`);
          setText('defDisplay', `DEF: ${stats.def}`);
          setText('atkSpdDisplay', `ATK.SPD: ${stats.atkSpd}`);
          setText('hpAllo', allocation.hp);
          setText('atkAllo', allocation.atk);
          setText('defAllo', allocation.def);
          setText('atkSpdAllo', allocation.atkSpd);
          setText('alloPts', `Stat Points: ${points}`);
        };

        if (close) close.onclick = function () {
          try { window.sfxDecline.play(); } catch (e) {}
          defaultModalElement.style.display = 'none';
          defaultModalElement.innerHTML = '';
          if (titleScreenEl) titleScreenEl.style.filter = 'brightness(100%)';
        };

      } catch (err) {
        console.warn('allocationPopup error', err);
      }
    };

    window.objectValidation = () => {
      if (!player) player = {};
      if (player.skills === undefined) player.skills = [];
      if (player.tempStats === undefined) {
        player.tempStats = { atk: 0, atkSpd: 0 };
      }
      if (typeof saveData === 'function') saveData();
    };

    // Expose quick debug: show title if nothing else
    if (titleScreenEl && !authOverlay) {
      titleScreenEl.style.display = 'flex';
    }

    // End of DOMContentLoaded
  }); // DOMContentLoaded
})(); 
