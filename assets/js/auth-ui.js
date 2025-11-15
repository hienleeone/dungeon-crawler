
document.addEventListener("DOMContentLoaded",()=>{
  const m=document.getElementById("auth-modal");
  const email=document.getElementById("auth-email");
  const pass=document.getElementById("auth-pass");
  const pass2=document.getElementById("auth-pass2");
  const err=document.getElementById("auth-error");
  const btnLogin=document.getElementById("auth-login-btn");
  const btnReg=document.getElementById("auth-register-btn");
  const sw=document.getElementById("auth-switch");

  let mode="login"; // or register

  function showErr(t){err.textContent=t;}

  sw.onclick=()=>{
    if(mode==="login"){
      mode="register";
      pass2.style.display="block";
      btnLogin.style.display="none";
      btnReg.style.display="block";
      sw.textContent="Chuyển sang Đăng nhập";
    }else{
      mode="login";
      pass2.style.display="none";
      btnLogin.style.display="block";
      btnReg.style.display="none";
      sw.textContent="Chuyển sang Đăng ký";
    }
  };

  btnLogin.onclick=async()=>{
    showErr("");
    try{
      await window.firebaseLogin(email.value,pass.value);
      m.style.display="none";
    }catch(e){
      showErr(e.message);
    }
  };

  btnReg.onclick=async()=>{
    showErr("");
    if(pass.value!==pass2.value){
      showErr("Mật khẩu không khớp");
      return;
    }
    try{
      await window.firebaseRegister(email.value,pass.value);
      m.style.display="none";
    }catch(e){
      showErr(e.message);
    }
  };

  // Hide modal if already signed in
  const int=setInterval(()=>{
    if(window.firebaseAuth && window.firebaseAuth.currentUser){
      m.style.display="none";
      clearInterval(int);
    }
  },500);
});
