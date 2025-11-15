
const panel=document.getElementById('authPanel');
const email=document.getElementById('emailInput');
const pass=document.getElementById('passwordInput');
const msg=document.getElementById('authMsg');
const {auth,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,onAuthStateChanged}=window._fb;

document.getElementById('signupBtn').onclick=async()=>{
  try{await createUserWithEmailAndPassword(auth,email.value,pass.value); msg.textContent="Đăng ký thành công";}
  catch(e){msg.textContent=e.message;}
};
document.getElementById('loginBtn').onclick=async()=>{
  try{await signInWithEmailAndPassword(auth,email.value,pass.value); msg.textContent="Đăng nhập thành công";}
  catch(e){msg.textContent=e.message;}
};
document.getElementById('logoutBtn').onclick=()=>signOut(auth);

onAuthStateChanged(auth,(u)=>{
  if(u){
    panel.style.display="none";
    window.dispatchEvent(new CustomEvent('firebaseUserReady',{detail:u}));
  }else{
    panel.style.display="block";
    window.dispatchEvent(new CustomEvent('firebaseUserSignedOut'));
  }
});
