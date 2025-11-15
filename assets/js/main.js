/* main.js - FIXED full file
   - startGameInit is standalone and only decides what screen to show based on
     window.currentPlayerData and firebase auth state.
   - All event listeners registered once on DOMContentLoaded.
   - Keeps your original game logic, only reorganized & safer checks.
*/

/* ============================
   Helper: safe query selector
   ============================ */
const $ = (sel) => document.querySelector(sel);

/* ============================
   startGameInit
   Called by firebase listener when auth state changes and when page loads.
   It MUST NOT contain event listener registrations; only decides initial UI.
   ============================ */
window.startGameInit = function () {
  try {
    // currentPlayerData is provided/updated by firebase.js attachAuthListener
    const playerFromCloud = window.currentPlayerData ?? null;
    const user = window.firebaseAuth ? window.firebaseAuth.currentUser : null;

    // If no user is signed in, show title-screen only if local player exists,
    // otherwise show auth modal (your auth-ui manages modal visibility).
    if (!user) {
      // if local player exists in localStorage, use it, else show title or auth UI
      const local = JSON.parse(localStorage.getItem("playerData")) ?? null;
      if (local) {
        window.player = local;
        window.currentPlayerData = local;
        // show title
        runLoad("title-screen", "flex");
      } else {
        // nothing to show — auth-ui should open modal; keep title hidden
        // hide all main screens except maybe a landing screen
        if ($("#title-screen")) $("#title-screen").style.display = "none";
        if ($("#character-creation")) $("#character-creation").style.display = "none";
      }
      return;
    }

    // If user is logged in: decide based on cloud player data
    if (playerFromCloud === null) {
      // New account: ask for name
      window.player = null;
      runLoad("character-creation", "flex");
      return;
    }

    // Existing account: set global player and go to title
    window.player = playerFromCloud;
    window.currentPlayerData = playerFromCloud;
    runLoad("title-screen", "flex");
  } catch (e) {
    console.error("startGameInit error", e);
  }
};

/* ============================
   DOMContentLoaded: register UI event handlers only once
   ============================ */
document.addEventListener("DOMContentLoaded", () => {

  // Defensive: ensure required DOM elements exist before binding
  const nameForm = $("#name-submit");
  const nameInput = $("#name-input");
  const alertEl = $("#alert");
  const titleScreen = $("#title-screen");
  const charCreation = $("#character-creation");
  const loadingEl = $("#loading");
  const menuBtn = $("#menu-btn");
  const unequipAllBtn = $("#unequip-all");

  // Elements used by other functions that expect them globally:
  window.defaultModalElement = $("#default-modal") || document.createElement("div");
  window.menuModalElement = $("#menu-modal") || document.createElement("div");

  // Prevent double-click zooming on mobile devices
  document.ondblclick = function (e) { e.preventDefault(); };

  // Name submit handler (create player flow)
  if (nameForm && nameInput && alertEl) {
    nameForm.addEventListener("submit", function (e) {
      e.preventDefault();

      // If currentPlayerData exists in cloud -> disallow creating a new character
      if (window.currentPlayerData !== null) {
        runLoad("title-screen", "flex");
        return;
      }

      const playerName = nameInput.value?.trim() ?? "";
      const format = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
      if (format.test(playerName)) {
        alertEl.innerHTML = "Tên của bạn không được chứa ký tự đặc biệt!";
        return;
      }
      if (playerName.length < 3 || playerName.length > 15) {
        alertEl.innerHTML = "Tên phải dài từ 3-15 ký tự!";
        return;
      }

      // Build player object
      window.player = {
        name: playerName,
        lvl: 1,
        stats: {
          hp: null, hpMax: null, atk: null, def: null, pen: null,
          atkSpd: null, vamp: null, critRate: null, critDmg: null
        },
        baseStats: {
          hp: 500, atk: 100, def: 50, pen: 0, atkSpd: 0.6,
          vamp: 0, critRate: 0, critDmg: 50
        },
        equippedStats: {
          hp: 0, atk: 0, def: 0, pen: 0, atkSpd: 0,
          vamp: 0, critRate: 0, critDmg: 0, hpPct: 0, atkPct: 0, defPct: 0, penPct: 0
        },
        bonusStats: {
          hp: 0, atk: 0, def: 0, atkSpd: 0, vamp: 0, critRate: 0, critDmg: 0
        },
        exp: { expCurr: 0, expMax: 100, expCurrLvl: 0, expMaxLvl: 100, lvlGained: 0 },
        inventory: { consumables: [], equipment: [] },
        equipped: [],
        gold: 0,
        playtime: 0,
        kills: 0,
        deaths: 0,
        inCombat: false
      };

      // Calculate base stats, save locally and to cloud if logged in
      try {
        calculateStats();
      } catch (e) {
        console.warn("calculateStats failed (maybe player undefined)", e);
      }

      window.player.stats.hp = window.player.stats.hpMax;
      saveData(); // saves local and cloud if signed in

      if (window.firebaseAuth && window.firebaseAuth.currentUser) {
        window.firebaseSetPlayer(window.firebaseAuth.currentUser.uid, window.player).catch((err) => {
          console.warn("firebaseSetPlayer failed:", err);
        });
      }

      window.currentPlayerData = window.player;

      // 🔥 GỌI THỐNG KÊ TẠI ĐÂY
      allocationPopup();
      return;
    });
  } // end name form

  // Unequip all handler
  if (unequipAllBtn) {
    unequipAllBtn.addEventListener("click", function () {
      if (typeof sfxOpen === "function" || window.sfxOpen) try { sfxOpen.play(); } catch (e) {}
      dungeon.status.exploring = false;
      let dimTarget = $('#inventory');
      if (dimTarget) dimTarget.style.filter = "brightness(50%)";
      defaultModalElement.style.display = "flex";
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
        try { sfxUnequip.play(); } catch (e) {}
        unequipAll();
        continueExploring();
        defaultModalElement.style.display = "none";
        defaultModalElement.innerHTML = "";
        if (dimTarget) dimTarget.style.filter = "brightness(100%)";
      };
      cancel.onclick = function () {
        try { sfxDecline.play(); } catch (e) {}
        continueExploring();
        defaultModalElement.style.display = "none";
        defaultModalElement.innerHTML = "";
        if (dimTarget) dimTarget.style.filter = "brightness(100%)";
      };
    });
  }

  // Menu button
  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      try { closeInventory(); } catch (e) {}
      dungeon.status.exploring = false;
      let dimDungeon = $('#dungeon-main');
      if (dimDungeon) dimDungeon.style.filter = "brightness(50%)";
      menuModalElement.style.display = "flex";

      menuModalElement.innerHTML = `
        <div class="content">
          <div class="content-head">
            <h3>Menu</h3>
            <p id="close-menu"><i class="fa fa-xmark"></i></p>
          </div>
          <button id="player-menu"><i class="fas fa-user"></i>${(window.player && window.player.name) ? window.player.name : "Player"}</button>
          <button id="stats">Chỉ Số Chính</button>
          <button id="volume-btn">Âm Thanh</button>
          <button id="quit-run">Xóa Hầm Ngục</button>
        </div>`;

      const close = document.querySelector('#close-menu');
      const playerMenu = document.querySelector('#player-menu');
      const runMenu = document.querySelector('#stats');
      const quitRun = document.querySelector('#quit-run');
      const volumeSettings = document.querySelector('#volume-btn');

      // Player profile
      playerMenu.onclick = function () {
        try { sfxOpen.play(); } catch (e) {}
        let playTime = "00:00:00";
        if (window.player && window.player.playtime) {
          playTime = new Date(window.player.playtime * 1000).toISOString().slice(11, 19);
        }
        menuModalElement.style.display = "none";
        defaultModalElement.style.display = "flex";
        defaultModalElement.innerHTML = `
          <div class="content" id="profile-tab">
            <div class="content-head">
              <h3>Thông Tin</h3>
              <p id="profile-close"><i class="fa fa-xmark"></i></p>
            </div>
            <p>${(window.player?.name) || "Player"} Lv.${(window.player?.lvl) || 1}</p>
            <p>Giết: ${nFormatter(window.player?.kills || 0)}</p>
            <p>Chết: ${nFormatter(window.player?.deaths || 0)}</p>
            <p>Chơi: ${playTime}</p>
          </div>`;
        const profileClose = document.querySelector('#profile-close');
        profileClose.onclick = function () {
          try { sfxDecline.play(); } catch (e) {}
          defaultModalElement.style.display = "none";
          defaultModalElement.innerHTML = "";
          menuModalElement.style.display = "flex";
        };
      };

      // Run menu / stats
      runMenu.onclick = function () {
        try { sfxOpen.play(); } catch (e) {}
        let runTime = "00:00:00";
        if (dungeon?.statistics?.runtime) runTime = new Date(dungeon.statistics.runtime * 1000).toISOString().slice(11, 19);
        menuModalElement.style.display = "none";
        defaultModalElement.style.display = "flex";
        defaultModalElement.innerHTML = `
          <div class="content" id="run-tab">
            <div class="content-head">
              <h3>Chỉ Số</h3>
              <p id="run-close"><i class="fa fa-xmark"></i></p>
            </div>
            <p>${(window.player?.name) || "Player"} Lv.${(window.player?.lvl) || 1}</p>
            <p>Phước Lành Lvl.${window.player?.blessing || 1}</p>
            <p>Lời Nguyền Lvl.${Math.round((dungeon.settings.enemyScaling - 1) * 10)}</p>
            <p>Giết Được: ${nFormatter(dungeon.statistics.kills)}</p>
            <p>Hoạt Động: ${runTime}</p>
          </div>`;
        const runClose = document.querySelector('#run-close');
        runClose.onclick = function () {
          try { sfxDecline.play(); } catch (e) {}
          defaultModalElement.style.display = "none";
          defaultModalElement.innerHTML = "";
          menuModalElement.style.display = "flex";
        };
      };

      // Quit run
      quitRun.onclick = function () {
        try { sfxOpen.play(); } catch (e) {}
        menuModalElement.style.display = "none";
        defaultModalElement.style.display = "flex";
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
          try { sfxConfirm.play(); } catch (e) {}
          bgmDungeon?.stop?.();
          let dimDungeon = document.querySelector('#dungeon-main');
          if (dimDungeon) { dimDungeon.style.filter = "brightness(100%)"; dimDungeon.style.display = "none"; }
          menuModalElement.style.display = "none";
          menuModalElement.innerHTML = "";
          defaultModalElement.style.display = "none";
          defaultModalElement.innerHTML = "";
          runLoad("title-screen", "flex");
          clearInterval(dungeonTimer);
          clearInterval(playTimer);
          progressReset();
        };
        cancel.onclick = function () {
          try { sfxDecline.play(); } catch (e) {}
          defaultModalElement.style.display = "none";
          defaultModalElement.innerHTML = "";
          menuModalElement.style.display = "flex";
        };
      };

      // Volume settings
      volumeSettings.onclick = function () {
        try { sfxOpen.play(); } catch (e) {}
        let master = (volume?.master ?? 1) * 100;
        let bgm = ((volume?.bgm ?? 0.5) * 100) * 2;
        let sfx = (volume?.sfx ?? 1) * 100;
        menuModalElement.style.display = "none";
        defaultModalElement.style.display = "flex";
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
          try { sfxDecline.play(); } catch (e) {}
          defaultModalElement.style.display = "none";
          defaultModalElement.innerHTML = "";
          menuModalElement.style.display = "flex";
        };

        masterVol.oninput = function () {
          master = this.value;
          document.querySelector('#master-label').innerHTML = `Tổng (${master}%)`;
        };
        bgmVol.oninput = function () {
          bgm = this.value;
          document.querySelector('#bgm-label').innerHTML = `Nhạc Nền (${bgm}%)`;
        };
        sfxVol.oninput = function () {
          sfx = this.value;
          document.querySelector('#sfx-label').innerHTML = `Hiệu Ứng (${sfx}%)`;
        };
        applyVol.onclick = function () {
          volume.master = master / 100;
          volume.bgm = (bgm / 100) / 2;
          volume.sfx = sfx / 100;
          bgmDungeon?.stop?.();
          setVolume();
          bgmDungeon?.play?.();
          saveData();
        };
      };

      // Logout button (append)
      const logoutBtn = document.createElement("button");
      logoutBtn.id = "logout-btn";
      logoutBtn.textContent = "Đăng Xuất";
      menuModalElement.querySelector(".content").appendChild(logoutBtn);

      logoutBtn.onclick = () => {
        try { sfxOpen.play(); } catch (e) {}
        menuModalElement.style.display = "none";
        defaultModalElement.style.display = "flex";
        defaultModalElement.innerHTML = `
          <div class="content">
            <p>Bạn có chắc muốn đăng xuất?</p>
            <div class="button-container">
              <button id="logout-confirm">Đăng Xuất</button>
              <button id="logout-cancel">Hủy</button>
            </div>
          </div>`;
        document.querySelector("#logout-confirm").onclick = async () => {
          try { sfxConfirm.play(); } catch (e) {}
          if (window.firebaseLogout) {
            await window.firebaseLogout();
            localStorage.clear();
            location.reload();
          } else {
            localStorage.clear();
            location.reload();
          }
        };
        document.querySelector("#logout-cancel").onclick = () => {
          try { sfxDecline.play(); } catch (e) {}
          defaultModalElement.style.display = "none";
          defaultModalElement.innerHTML = "";
          menuModalElement.style.display = "flex";
        };
      };

      // Close menu
      close.onclick = function () {
        try { sfxDecline.play(); } catch (e) {}
        continueExploring();
        menuModalElement.style.display = "none";
        menuModalElement.innerHTML = "";
        if (dimDungeon) dimDungeon.style.filter = "brightness(100%)";
      };

    }); // end menuBtn listener
  } // end if menuBtn

  // At the end of DOMContentLoaded, you can call startGameInit if firebase already set it up
  // Note: firebase.attachAuthListener should call window.startGameInit() when ready.
  // But calling it here is harmless if firebase already filled window.currentPlayerData.
  if (window.startGameInit) window.startGameInit();

}); // end DOMContentLoaded

/* ============================
   UI helpers (load screen)
   ============================ */
const runLoad = (id, display) => {
  const loader = document.querySelector("#loading");
  if (loader) loader.style.display = "flex";
  setTimeout(async () => {
    if (loader) loader.style.display = "none";
    const el = document.querySelector(`#${id}`);
    if (el) el.style.display = display;
  }, 500);
};

/* ============================
   enterDungeon
   ============================ */
const enterDungeon = () => {
  try { sfxConfirm.play(); } catch (e) {}
  if ($("#title-screen")) $("#title-screen").style.display = "none";
  runLoad("dungeon-main", "flex");

  if (player?.inCombat && window.currentEnemyData) {
    enemy = window.currentEnemyData;
    showCombatInfo();
    startCombat(bgmBattleMain);
  } else {
    try { bgmDungeon.play(); } catch (e) {}
  }

  if (player?.stats?.hp == 0) progressReset();
  initialDungeonLoad?.();
  playerLoadStats?.();
};

/* ============================
   saveData: localStorage + cloud if logged in
   ============================ */
const saveData = () => {
  try {
    const playerData = JSON.stringify(window.player || {});
    const dungeonData = JSON.stringify(window.dungeon || {});
    const enemyData = JSON.stringify(window.enemy || {});
    const volumeData = JSON.stringify(window.volume || {});

    localStorage.setItem("playerData", playerData);
    localStorage.setItem("dungeonData", dungeonData);
    localStorage.setItem("enemyData", enemyData);
    localStorage.setItem("volumeData", volumeData);

    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
      const uid = window.firebaseAuth.currentUser.uid;
      window.firebaseSetPlayer(uid, window.player).catch((err) => {
        console.warn("firebaseSetPlayer error", err);
      });
    }
  } catch (e) {
    console.error("saveData error", e);
  }
};

/* ============================
   calculateStats
   ============================ */
const calculateStats = () => {
  if (!window.player) {
    console.warn("calculateStats: player undefined");
    return;
  }
  const p = window.player;
  let equipmentAtkSpd = (p.baseStats.atkSpd || 0) * (p.equippedStats.atkSpd / 100 || 0);
  const playerHpBase = p.baseStats.hp || 0;
  const playerAtkBase = p.baseStats.atk || 0;
  const playerDefBase = p.baseStats.def || 0;
  const playerAtkSpdBase = p.baseStats.atkSpd || 0;
  const playerVampBase = p.baseStats.vamp || 0;
  const playerCRateBase = p.baseStats.critRate || 0;
  const playerCDmgBase = p.baseStats.critDmg || 0;

  p.stats.hpMax = Math.round((playerHpBase + playerHpBase * (p.bonusStats.hp / 100 || 0)) + (p.equippedStats.hp || 0));
  p.stats.atk = Math.round((playerAtkBase + playerAtkBase * (p.bonusStats.atk / 100 || 0)) + (p.equippedStats.atk || 0));
  p.stats.def = Math.round((playerDefBase + playerDefBase * (p.bonusStats.def / 100 || 0)) + (p.equippedStats.def || 0));
  p.stats.atkSpd = (playerAtkSpdBase + playerAtkSpdBase * (p.bonusStats.atkSpd / 100 || 0)) + equipmentAtkSpd + (equipmentAtkSpd * (p.equippedStats.atkSpd / 100 || 0));
  p.stats.vamp = playerVampBase + (p.bonusStats.vamp || 0) + (p.equippedStats.vamp || 0);
  p.stats.critRate = playerCRateBase + (p.bonusStats.critRate || 0) + (p.equippedStats.critRate || 0);
  p.stats.critDmg = playerCDmgBase + (p.bonusStats.critDmg || 0) + (p.equippedStats.critDmg || 0);

  if (p.stats.atkSpd > 2.5) p.stats.atkSpd = 2.5;
};

/* ============================
   progressReset
   ============================ */
const progressReset = () => {
  if (!window.player || !window.dungeon) return;
  player.stats.hp = player.stats.hpMax;
  player.lvl = 1;
  player.blessing = 1;
  player.exp = { expCurr: 0, expMax: 100, expCurrLvl: 0, expMaxLvl: 100, lvlGained: 0 };
  player.bonusStats = { hp: 0, atk: 0, def: 0, atkSpd: 0, vamp: 0, critRate: 0, critDmg: 0 };
  player.skills = [];
  player.inCombat = false;
  dungeon.progress.floor = 1;
  dungeon.progress.room = 1;
  dungeon.statistics.kills = 0;
  dungeon.status = { exploring: false, paused: true, event: false };
  dungeon.settings = { enemyBaseLvl: 1, enemyLvlGap: 5, enemyBaseStats: 1, enemyScaling: 1.1 };
  delete dungeon.enemyMultipliers;
  delete player.allocated;
  dungeon.backlog.length = 0;
  dungeon.action = 0;
  dungeon.statistics.runtime = 0;
  combatBacklog.length = 0;
  saveData();
};

/* ============================
   allocationPopup (unchanged logic but safe guards)
   ============================ */
const allocationPopup = () => {
  if (!window.player) return;
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

  defaultModalElement.style.display = "flex";
  $("#title-screen")?.style && ($("#title-screen").style.filter = "brightness(50%)");
  loadContent();

  const handleStatButtons = (e) => {
    let rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    if (e.includes("Add")) {
      let stat = e.split("Add")[0];
      if (points > 0) {
        try { sfxConfirm.play(); } catch (e) {}
        allocation[stat]++;
        points--;
        updateStats();
        $(`#${stat}Display`).innerHTML = `${stat.replace(/([A-Z])/g, ' $1').trim().replace(/ /g, '.').toUpperCase()}: ${stats[stat].toFixed(2).replace(rx, "$1")}`;
        $(`#${stat}Allo`).innerHTML = allocation[stat];
        $(`#alloPts`).innerHTML = `Stat Points: ${points}`;
      } else {
        try { sfxDeny.play(); } catch (e) {}
      }
    } else if (e.includes("Min")) {
      let stat = e.split("Min")[0];
      if (allocation[stat] > 5) {
        try { sfxConfirm.play(); } catch (e) {}
        allocation[stat]--;
        points++;
        updateStats();
        $(`#${stat}Display`).innerHTML = `${stat.replace(/([A-Z])/g, ' $1').trim().replace(/ /g, '.').toUpperCase()}: ${stats[stat].toFixed(2).replace(rx, "$1")}`;
        $(`#${stat}Allo`).innerHTML = allocation[stat];
        $(`#alloPts`).innerHTML = `Stat Points: ${points}`;
      } else {
        try { sfxDeny.play(); } catch (e) {}
      }
    }
  };

  // Wire buttons (delegated after DOM insert)
  document.querySelector("#hpAdd").onclick = () => handleStatButtons("hpAdd");
  document.querySelector("#hpMin").onclick = () => handleStatButtons("hpMin");
  document.querySelector("#atkAdd").onclick = () => handleStatButtons("atkAdd");
  document.querySelector("#atkMin").onclick = () => handleStatButtons("atkMin");
  document.querySelector("#defAdd").onclick = () => handleStatButtons("defAdd");
  document.querySelector("#defMin").onclick = () => handleStatButtons("defMin");
  document.querySelector("#atkSpdAdd").onclick = () => handleStatButtons("atkSpdAdd");
  document.querySelector("#atkSpdMin").onclick = () => handleStatButtons("atkSpdMin");

  // Passive skills select
  const selectSkill = document.querySelector("#select-skill");
  const skillDesc = document.querySelector("#skill-desc");
  selectSkill.onclick = function () { try { sfxConfirm.play(); } catch (e) {} };
  selectSkill.onchange = function () {
    const v = selectSkill.value;
    if (v == "Remnant Razor") skillDesc.innerHTML = "Các đòn tấn công gây thêm 8% lượng máu hiện tại của kẻ địch khi đánh trúng.";
    if (v == "Titan's Will") skillDesc.innerHTML = "Các đòn tấn công gây thêm 5% lượng máu tối đa của bạn khi đánh trúng.";
    if (v == "Devastator") skillDesc.innerHTML = "Gây thêm 30% sát thương nhưng bạn mất 30% tốc độ đánh cơ bản.";
    if (v == "Rampager") skillDesc.innerHTML = "Tăng 5 điểm tấn công sau mỗi đòn đánh. Điểm cộng dồn sẽ được đặt lại sau trận chiến.";
    if (v == "Blade Dance") skillDesc.innerHTML = "Tăng tốc độ tấn công sau mỗi đòn đánh. Cộng dồn sẽ được đặt lại sau trận chiến.";
    if (v == "Paladin's Heart") skillDesc.innerHTML = "Bạn sẽ nhận ít hơn 25% sát thương vĩnh viễn.";
    if (v == "Aegis Thorns") skillDesc.innerHTML = "Kẻ địch phải chịu 15% sát thương mà chúng gây ra.";
  };

  // Operation Buttons
  const confirm = document.querySelector("#allocate-confirm");
  const reset = document.querySelector("#allocate-reset");
  const close = document.querySelector("#allocate-close");

  confirm.onclick = function () {
    // Set base stats
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

    objectValidation();
    const skill = document.querySelector("#select-skill")?.value;
    if (skill) player.skills.push(skill);
    if (skill == "Devastator") {
      player.baseStats.atkSpd = player.baseStats.atkSpd - ((30 * player.baseStats.atkSpd) / 100);
    }

    player.allocated = true;
    enterDungeon();
    player.stats.hp = player.stats.hpMax;
    playerLoadStats?.();
    defaultModalElement.style.display = "none";
    defaultModalElement.innerHTML = "";
    $("#title-screen")?.style && ($("#title-screen").style.filter = "brightness(100%)");
  };

  reset.onclick = function () {
    try { sfxDecline.play(); } catch (e) {}
    allocation = { hp: 5, atk: 5, def: 5, atkSpd: 5 };
    points = 20;
    updateStats();
    document.querySelector(`#hpDisplay`).innerHTML = `HP: ${stats.hp}`;
    document.querySelector(`#atkDisplay`).innerHTML = `ATK: ${stats.atk}`;
    document.querySelector(`#defDisplay`).innerHTML = `DEF: ${stats.def}`;
    document.querySelector(`#atkSpdDisplay`).innerHTML = `ATK.SPD: ${stats.atkSpd}`;
    document.querySelector(`#hpAllo`).innerHTML = allocation.hp;
    document.querySelector(`#atkAllo`).innerHTML = allocation.atk;
    document.querySelector(`#defAllo`).innerHTML = allocation.def;
    document.querySelector(`#atkSpdAllo`).innerHTML = allocation.atkSpd;
    document.querySelector(`#alloPts`).innerHTML = `Stat Points: ${points}`;
  };

  close.onclick = function () {
    try { sfxDecline.play(); } catch (e) {}
    defaultModalElement.style.display = "none";
    defaultModalElement.innerHTML = "";
    $("#title-screen")?.style && ($("#title-screen").style.filter = "brightness(100%)");
  };
}; // end allocationPopup

/* ============================
   objectValidation helper
   ============================ */
const objectValidation = () => {
  if (!window.player) window.player = {};
  if (player.skills == undefined) player.skills = [];
  if (player.tempStats == undefined) {
    player.tempStats = { atk: 0, atkSpd: 0 };
  }
  saveData();
};

/* ============================
   Expose a safe logout wrapper
   ============================ */
window.gameLogout = async function () {
  try {
    if (window.firebaseAuth) await window.firebaseAuth.signOut();
  } catch (e) { console.warn("logout:", e); }
  localStorage.clear();
  location.reload();
};
