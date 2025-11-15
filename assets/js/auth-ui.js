(function(){
  function init(){
    if(!window._fb){setTimeout(init,100);return;}
    const {auth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword}=window._fb;

    window.addEventListener("firebaseUserReady",()=>{});
    onAuthStateChanged(auth,(user)=>{
      if(user){
        window.dispatchEvent(new CustomEvent("firebaseUserReady",{detail:user}));
      }
    });
  }
  init();
})();