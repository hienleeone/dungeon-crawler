// auth-ui-fullscreen.js - full-screen login / register UI (non-module)
(function(){
  function init() {
    if (!window._fb) { setTimeout(init, 100); return; }
    const { auth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } = window._fb;

    // build full-screen login container
    let panel = document.getElementById('auth-fullscreen');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'auth-fullscreen';
      panel.innerHTML = `
        <div class="auth-card">
          <h2>SOULMC ACCOUNT</h2>
          <div id="auth-forms">
            <div id="login-form">
              <input id="emailInput" type="email" placeholder="Email" autocomplete="off">
              <input id="passwordInput" type="password" placeholder="Mật khẩu">
              <div class="auth-actions">
                <button id="loginBtn">Đăng nhập</button>
                <button id="showRegisterBtn">Đăng ký</button>
              </div>
              <p id="authMsg" class="auth-msg"></p>
            </div>
            <div id="register-form" style="display:none;">
              <input id="regEmail" type="email" placeholder="Email" autocomplete="off">
              <input id="regPass" type="password" placeholder="Mật khẩu">
              <input id="regPass2" type="password" placeholder="Nhập lại mật khẩu">
              <div class="auth-actions">
                <button id="registerBtn">Tạo tài khoản</button>
                <button id="showLoginBtn">Quay lại</button>
              </div>
              <p id="regMsg" class="auth-msg"></p>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(panel);
      // basic styles
      const style = document.createElement('style');
      style.innerHTML = `
        #auth-fullscreen{ position:fixed; inset:0; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:9999; }
        .auth-card{ background:#111; color:#fff; padding:28px; border-radius:10px; width:340px; box-shadow:0 10px 30px rgba(0,0,0,0.6); font-family:Rubik, sans-serif; }
        .auth-card h2{ text-align:center; margin:0 0 12px 0; }
        .auth-card input{ width:100%; padding:10px; margin:8px 0; border-radius:6px; border:1px solid #333; background:#0f0f0f; color:#fff; }
        .auth-actions{ display:flex; gap:8px; justify-content:space-between; margin-top:8px; }
        .auth-actions button{ padding:8px 12px; border-radius:6px; cursor:pointer; }
        .auth-msg{ color:#f66; min-height:18px; margin-top:8px; }
      `;
      document.head.appendChild(style);
    }

    // elements
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const loginBtn = document.getElementById('loginBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const registerBtn = document.getElementById('registerBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const regEmail = document.getElementById('regEmail');
    const regPass = document.getElementById('regPass');
    const regPass2 = document.getElementById('regPass2');
    const authMsg = document.getElementById('authMsg');
    const regMsg = document.getElementById('regMsg');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const panelEl = document.getElementById('auth-fullscreen');

    showRegisterBtn.onclick = () => { loginForm.style.display='none'; registerForm.style.display='block'; authMsg.textContent=''; regMsg.textContent=''; };
    showLoginBtn.onclick = () => { loginForm.style.display='block'; registerForm.style.display='none'; authMsg.textContent=''; regMsg.textContent=''; };

    loginBtn.onclick = async () => {
      authMsg.textContent='';
      try {
        await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        // onAuthStateChanged will handle UI hide
      } catch(e){ authMsg.textContent = e.message; }
    };

    registerBtn.onclick = async () => {
      regMsg.textContent='';
      if (!regEmail.value || !regPass.value) { regMsg.textContent='Vui lòng nhập email và mật khẩu'; return; }
      if (regPass.value !== regPass2.value) { regMsg.textContent='Mật khẩu không khớp'; return; }
      try {
        await createUserWithEmailAndPassword(auth, regEmail.value, regPass.value);
        // onAuthStateChanged will handle UI
      } catch(e){ regMsg.textContent = e.message; }
    };

    // observe auth state
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // hide fullscreen auth
        const el = document.getElementById('auth-fullscreen');
        if (el) el.style.display='none';
        // dispatch event for loader to create/load player
        window.dispatchEvent(new CustomEvent('firebaseUserReady', { detail: user }));
      } else {
        const el = document.getElementById('auth-fullscreen');
        if (el) el.style.display='flex';
      }
    });
  }

  init();
})();