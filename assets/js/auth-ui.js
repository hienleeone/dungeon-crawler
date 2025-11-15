function mapFirebaseError(code) {
  switch (code) {
    case "auth/user-not-found":
      return "Tài khoản chưa được tạo!";
    case "auth/wrong-password":
      return "Sai mật khẩu!";
    case "auth/invalid-login-credentials":
    case "auth/invalid-credential":
      return "Sai tài khoản hoặc mật khẩu!";
    case "auth/email-already-in-use":
      return "Email đã được sử dụng!";
    default:
      return "Lỗi: " + code;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("auth-modal");
  const email = document.getElementById("auth-email");
  const pass = document.getElementById("auth-pass");
  const pass2 = document.getElementById("auth-pass2");
  const err = document.getElementById("auth-error");
  const btnLogin = document.getElementById("auth-login-btn");
  const btnReg = document.getElementById("auth-register-btn");
  const sw = document.getElementById("auth-switch");

  let mode = "login";

  function showErr(t) {
    err.textContent = t;
  }

  // Chuyển login <-> register
  sw.onclick = () => {
    if (mode === "login") {
      mode = "register";
      pass2.style.display = "block";
      btnLogin.style.display = "none";
      btnReg.style.display = "block";
      sw.textContent = "Chuyển sang Đăng nhập";
    } else {
      mode = "login";
      pass2.style.display = "none";
      btnLogin.style.display = "block";
      btnReg.style.display = "none";
      sw.textContent = "Chuyển sang Đăng ký";
    }
  };

  // LOGIN
  btnLogin.onclick = async () => {
    showErr("");
    try {
      await window.firebaseLogin(email.value, pass.value);
      // firebase attachAuthListener will call startGameInit; hide modal here
      modal.style.display = "none";
    } catch (e) {
      showErr(mapFirebaseError(e.code));
    }
  };

  // REGISTER
  btnReg.onclick = async () => {
    showErr("");

    if (pass.value !== pass2.value) {
      showErr("Mật khẩu không khớp!");
      return;
    }

    try {
      await window.firebaseRegister(email.value, pass.value);

      showErr("Thành công! Hãy đăng nhập.");
      mode = "login";

      pass2.style.display = "none";
      btnLogin.style.display = "block";
      btnReg.style.display = "none";
      sw.textContent = "Chuyển sang Đăng ký";

    } catch (e) {
      showErr(mapFirebaseError(e.code));
    }
  };
});

// Replace old export-import button with logout when DOM ready
document.addEventListener("DOMContentLoaded", function(){
  const exportBtn = document.querySelector('#export-import');
  if (exportBtn) {
    exportBtn.textContent = 'Đăng Xuất';
    exportBtn.onclick = async function(){
      if (window.firebaseLogout) {
        await window.firebaseLogout();
        // show auth modal after logout
        const modal = document.getElementById("auth-modal");
        if (modal) modal.style.display = "flex";
        // clear local game state
        localStorage.clear();
        location.reload();
      } else {
        localStorage.clear();
        location.reload();
      }
    }
  }
});