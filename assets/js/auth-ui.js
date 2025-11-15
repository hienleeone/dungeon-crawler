
// auth-ui.js (non-module, expects window._fb set by firebase-init.js module)
(function(){
  const initCheck = () => {
    if (!window._fb) {
      setTimeout(initCheck, 100);
      return;
    }
    const { auth, onAuthStateChanged } = window._fb;
    // Build a minimal auth panel if not exists
    if (!document.getElementById('authPanel')) {
      const panel = document.createElement('div');
      panel.id = 'authPanel';
      panel.style.position='fixed';
      panel.style.top='10px';
      panel.style.right='10px';
      panel.style.background='#222';
      panel.style.color='#fff';
      panel.style.padding='12px';
      panel.style.borderRadius='8px';
      panel.innerHTML = `
        <input id="emailInput" placeholder="Email" style="display:block;margin-bottom:6px;">
        <input id="passwordInput" type="password" placeholder="Mật khẩu" style="display:block;margin-bottom:6px;">
        <button id="signupBtn">Đăng ký</button>
        <button id="loginBtn">Đăng nhập</button>
        <button id="logoutBtn" style="display:none;">Đăng xuất</button>
        <div id="authMsg" style="margin-top:8px"></div>
      `;
      document.body.appendChild(panel);
    }

    const email = document.getElementById('emailInput');
    const pass = document.getElementById('passwordInput');
    const signupBtn = document.getElementById('signupBtn');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const authMsg = document.getElementById('authMsg');

    // Lazy import auth functions
    let authModule = null;
    const ensureAuthModule = async () => {
      if (authModule) return authModule;
      authModule = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js');
      return authModule;
    };

    signupBtn.onclick = async () => {
      try {
        const mod = await ensureAuthModule();
        const { createUserWithEmailAndPassword } = mod;
        await createUserWithEmailAndPassword(auth, email.value, pass.value);
        authMsg.textContent = 'Đăng ký thành công';
      } catch (e) { authMsg.textContent = e.message; }
    };

    loginBtn.onclick = async () => {
      try {
        const mod = await ensureAuthModule();
        const { signInWithEmailAndPassword } = mod;
        await signInWithEmailAndPassword(auth, email.value, pass.value);
        authMsg.textContent = 'Đăng nhập thành công';
      } catch (e) { authMsg.textContent = e.message; }
    };

    logoutBtn.onclick = async () => {
      try {
        const mod = await ensureAuthModule();
        const { signOut } = mod;
        await signOut(auth);
      } catch(e) { console.error(e); }
    };

    onAuthStateChanged(auth, (user) => {
      if (user) {
        document.getElementById('authPanel').style.display = 'none';
        // dispatch custom event for our player loader
        window.dispatchEvent(new CustomEvent('firebaseUserReady', { detail: user }));
      } else {
        document.getElementById('authPanel').style.display = 'block';
        window.dispatchEvent(new CustomEvent('firebaseUserSignedOut'));
      }
    });
  };

  initCheck();
})();
