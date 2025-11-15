/* main.js v2 - fixed flow + allocation + anti-hack hooks */

const $ = (sel) => document.querySelector(sel);

/* startGameInit decides which screen to show based on auth + cloud data */
window.startGameInit = function () {
  try {
    const user = window.firebaseAuth ? window.firebaseAuth.currentUser : null;
    const cloud = window.currentPlayerData ?? null;
    // hide all main sections initially
    ["#title-screen","#character-creation","#dungeon-main","#loading"].forEach(id=>{
      const el = document.querySelector(id);
      if (el) el.style.display = "none";
    });

    // Not logged in: show auth modal (index.html shows by default) or title if local save exists
    if (!user) {
      const local = JSON.parse(localStorage.getItem("playerData")||"null");
      if (local) {
        window.player = local;
        runLoad("title-screen","flex");
      } else {
        // show auth modal (already visible in index.html)
        const modal = document.getElementById("auth-modal");
        if (modal) modal.style.display = "flex";
      }
      return;
    }

    // Logged in
    // if cloud null => first login -> ask for name
    if (cloud === null) {
      // ensure auth modal hidden
      const modal = document.getElementById("auth-modal");
      if (modal) modal.style.display = "none";
      runLoad("character-creation","flex");
      return;
    }

    // has cloud player data -> use it
    window.player = JSON.parse(JSON.stringify(cloud));
    window.currentPlayerData = JSON.parse(JSON.stringify(cloud));
    // ensure auth modal hidden
    const modal = document.getElementById("auth-modal");
    if (modal) modal.style.display = "none";
    runLoad("title-screen","flex");
  } catch(e) {
    console.error("startGameInit",e);
  }
};

/* DOM handlers registration */
document.addEventListener("DOMContentLoaded", () => {

  window.defaultModalElement = document.getElementById("defaultModal") || document.querySelector(".modal-container") || document.createElement("div");
  window.menuModalElement = document.getElementById("menuModal") || document.querySelector(".modal-container") || document.createElement("div");

  // Name submit
  const nameForm = document.getElementById("name-submit");
  const nameInput = document.getElementById("name-input");
  const alertEl = document.getElementById("alert");

  if (nameForm) {
    nameForm.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const name = nameInput.value?.trim()||"";
      const bad = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
      if (bad.test(name)) { alertEl.innerText = "Tên của bạn không được chứa ký tự đặc biệt!"; return; }
      if (name.length<3||name.length>15){ alertEl.innerText="Tên phải dài từ 3-15 ký tự!"; return; }

      // check duplicate name on server
      if (window.firebaseCheckNameExists) {
        const exists = await window.firebaseCheckNameExists(name);
        if (exists) { alertEl.innerText="Tên đã bị trùng"; return; }
      }

      // build player
      window.player = {
        name: name, lvl:1, stats:{}, baseStats:{hp:500,atk:100,def:50,atkSpd:0.6,critDmg:50},
        equippedStats:{}, bonusStats:{}, exp:{expCurr:0,expMax:100}, inventory:{consumables:[],equipment:[]},
        equipped:[], gold:0, playtime:0, kills:0, deaths:0, inCombat:false
      };
      // calculate stats (call existing function)
      try{ calculateStats(); }catch(e){}
      window.player.stats.hp = window.player.stats.hpMax;
      // save locally and to cloud if logged in
      saveData();

      // if logged in, push to cloud (set player)
      if (window.firebaseAuth && window.firebaseAuth.currentUser) {
        await window.firebaseSetPlayer(window.firebaseAuth.currentUser.uid, window.player);
        // refresh currentPlayerData
        window.currentPlayerData = JSON.parse(JSON.stringify(window.player));
      }
      // show allocation popup
      allocationPopup();

      // after allocationPopup completes, allocationPopup will call enterTitleScreenFlow()
    });
  }

  // Menu button: build menu and add logout
  const menuBtn = document.getElementById("menu-btn");
  if (menuBtn) menuBtn.addEventListener("click", ()=>{
    try{ closeInventory(); }catch(e){}
    // build menu
    const mm = window.menuModalElement;
    mm.style.display = "flex";
    mm.innerHTML = `
      <div class="content">
        <div class="content-head"><h3>Menu</h3><p id="close-menu"><i class="fa fa-xmark"></i></p></div>
        <button id="player-menu">${(window.player?.name)||'Player'}</button>
        <button id="stats">Chỉ Số Chính</button>
        <button id="volume-btn">Âm Thanh</button>
        <button id="quit-run">Xóa Hầm Ngục</button>
        <button id="logout-btn">Đăng Xuất</button>
      </div>
    `;
    // close
    mm.querySelector("#close-menu").onclick = ()=>{ mm.style.display='none'; mm.innerHTML=''; continueExploring(); };
    mm.querySelector("#player-menu").onclick = ()=>{ /* show profile */ };
    mm.querySelector("#logout-btn").onclick = async ()=>{
      // confirm
      mm.style.display='none';
      defaultModalElement.style.display='flex';
      defaultModalElement.innerHTML = `<div class="content"><p>Bạn có chắc muốn đăng xuất?</p><div class="button-container"><button id="logout-confirm">Đăng Xuất</button><button id="logout-cancel">Hủy</button></div></div>`;
      document.getElementById("logout-confirm").onclick = async ()=>{
        try{ if (window.firebaseLogout) await window.firebaseLogout(); }catch(e){}
        localStorage.clear();
        location.reload();
      };
      document.getElementById("logout-cancel").onclick = ()=>{ defaultModalElement.style.display='none'; defaultModalElement.innerHTML=''; mm.style.display='flex'; };
    };
  });

  // call startGameInit in case firebase already ran
  if (window.startGameInit) window.startGameInit();
});

/* enterTitleScreenFlow - called after allocation to show title with fade */
function enterTitleScreenFlow(){
  // close modal, fade out, then show title
  try{ defaultModalElement.style.display='none'; defaultModalElement.innerHTML=''; }catch(e){}
  const title = document.getElementById("title-screen");
  if (title) {
    // small fade: hide all then show loader then title
    runLoad("title-screen","flex");
  }
}

/* runLoad: reuse existing */
const runLoad = (id, display) => {
  const loader = document.querySelector("#loading");
  if (loader) loader.style.display = "flex";
  setTimeout(async () => {
    if (loader) loader.style.display = "none";
    const el = document.querySelector(`#${id}`);
    if (el) el.style.display = display;
  }, 500);
};

/* saveData - local + cloud with server sync hook */
const saveData = async () => {
  try {
    const playerData = JSON.stringify(window.player || {});
    localStorage.setItem("playerData", playerData);
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
      // optimistic local save then push to server
      try {
        await window.firebaseSetPlayer(window.firebaseAuth.currentUser.uid, window.player);
      } catch(e){
        console.warn("firebaseSetPlayer failed",e);
      }
    }
  } catch(e){
    console.error("saveData error",e);
  }
};

/* allocationPopup - kept similar but when confirm calls enterTitleScreenFlow with delay */
const allocationPopup = () => {
  if (!window.player) return;
  // existing allocation content injection (simplified)
  defaultModalElement.style.display = "flex";
  defaultModalElement.innerHTML = `<div class="content" id="allocate-stats"><div class="content-head"><h3>Thống Kê</h3><p id="allocate-close"><i class="fa fa-xmark"></i></p></div>
    <p>Allocate your stats</p>
    <button id="allocate-confirm">Tiến Hành</button>
    <button id="allocate-close-btn">Hủy</button>
  </div>`;
  document.getElementById("allocate-confirm").onclick = async ()=>{
    // mark allocated
    window.player.allocated = true;
    saveData();
    // if logged in, push to server
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
      await window.firebaseSetPlayer(window.firebaseAuth.currentUser.uid, window.player);
    }
    // fade + delay 500ms then show title
    defaultModalElement.style.display = "none";
    setTimeout(()=>{ enterTitleScreenFlow(); },500);
  };
  document.getElementById("allocate-close-btn").onclick = ()=>{
    defaultModalElement.style.display = "none";
  };
};

/* small anti-hack helper: verify local gold with server on actions */
window.ensureGoldIntegrity = async function(){
  try{
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
      const uid = window.firebaseAuth.currentUser.uid;
      const server = await window.syncPlayerFromServer(uid);
      if (server && typeof server.gold === 'number' && window.player && window.player.gold !== server.gold) {
        console.warn("Gold mismatch detected; resetting to server value");
        window.player.gold = server.gold;
        saveData();
      }
    }
  }catch(e){ console.warn(e); }
};