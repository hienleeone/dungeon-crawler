// Authentication Handler
let isAuthReady = false;

// Wait for DOM to be ready
window.addEventListener("DOMContentLoaded", function() {
    // Monitor authentication state
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            console.log("User logged in:", user.email);
            
            // Load player data from Firebase
            const playerExists = await loadPlayerFromFirebase(user.uid);
            
            if (playerExists) {
                // Player has data, go to title screen
                isAuthReady = true;
                document.querySelector("#login-screen").style.display = "none";
                document.querySelector("#register-screen").style.display = "none";
                document.querySelector("#title-screen").style.display = "flex";
            } else {
                // New player, go to character creation
                isAuthReady = true;
                document.querySelector("#login-screen").style.display = "none";
                document.querySelector("#register-screen").style.display = "none";
                document.querySelector("#character-creation").style.display = "flex";
            }
        } else {
            currentUser = null;
            isAuthReady = true;
            console.log("User logged out");
            // Show login screen
            document.querySelector("#login-screen").style.display = "flex";
            document.querySelector("#register-screen").style.display = "none";
            document.querySelector("#title-screen").style.display = "none";
            document.querySelector("#character-creation").style.display = "none";
            document.querySelector("#dungeon-main").style.display = "none";
        }
    });
});

// Show register form
document.addEventListener("DOMContentLoaded", function() {
    const showRegisterBtn = document.querySelector("#show-register");
    const showLoginBtn = document.querySelector("#show-login");
    
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener("click", function() {
            document.querySelector("#login-screen").style.display = "none";
            document.querySelector("#register-screen").style.display = "flex";
            document.querySelector("#register-alert").innerHTML = "";
        });
    }
    
    if (showLoginBtn) {
        showLoginBtn.addEventListener("click", function() {
            document.querySelector("#register-screen").style.display = "none";
            document.querySelector("#login-screen").style.display = "flex";
            document.querySelector("#login-alert").innerHTML = "";
        });
    }
    
    // Login form
    const loginForm = document.querySelector("#login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            const email = document.querySelector("#login-email").value;
            const password = document.querySelector("#login-password").value;
            const alertElement = document.querySelector("#login-alert");
            
            try {
                await auth.signInWithEmailAndPassword(email, password);
                alertElement.innerHTML = "";
            } catch (error) {
                console.error("Login error:", error);
                let message = "Đăng nhập thất bại!";
                if (error.code === "auth/wrong-password" || error.code === "auth/user-not-found") {
                    message = "Email hoặc mật khẩu không đúng!";
                } else if (error.code === "auth/invalid-email") {
                    message = "Email không hợp lệ!";
                } else if (error.code === "auth/too-many-requests") {
                    message = "Quá nhiều lần thử! Vui lòng thử lại sau.";
                }
                alertElement.innerHTML = message;
            }
        });
    }
    
    // Register form
    const registerForm = document.querySelector("#register-form");
    if (registerForm) {
        registerForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            const email = document.querySelector("#register-email").value;
            const password = document.querySelector("#register-password").value;
            const passwordConfirm = document.querySelector("#register-password-confirm").value;
            const alertElement = document.querySelector("#register-alert");
            
            // Validate passwords match
            if (password !== passwordConfirm) {
                alertElement.innerHTML = "Mật khẩu không khớp!";
                return;
            }
            
            // Validate password length
            if (password.length < 6) {
                alertElement.innerHTML = "Mật khẩu phải có ít nhất 6 ký tự!";
                return;
            }
            
            try {
                await auth.createUserWithEmailAndPassword(email, password);
                alertElement.innerHTML = "";
                // User will be auto-logged in by onAuthStateChanged
            } catch (error) {
                console.error("Registration error:", error);
                let message = "Đăng ký thất bại!";
                if (error.code === "auth/email-already-in-use") {
                    message = "Email đã được sử dụng!";
                } else if (error.code === "auth/invalid-email") {
                    message = "Email không hợp lệ!";
                } else if (error.code === "auth/weak-password") {
                    message = "Mật khẩu quá yếu!";
                }
                alertElement.innerHTML = message;
            }
        });
    }
});

// Logout function
const logout = async () => {
    try {
        // Stop music
        if (typeof bgmDungeon !== 'undefined') {
            bgmDungeon.stop();
        }
        
        // Clear intervals
        if (typeof dungeonTimer !== 'undefined') {
            clearInterval(dungeonTimer);
        }
        if (typeof playTimer !== 'undefined') {
            clearInterval(playTimer);
        }
        
        // Sign out from Firebase
        await auth.signOut();
        
        // Clear player data
        player = null;
        dungeon = null;
        enemy = null;
        
        // Don't clear localStorage completely as we still use it for volume
        localStorage.removeItem("playerData");
        localStorage.removeItem("dungeonData");
        localStorage.removeItem("enemyData");
        
        console.log("Logged out successfully");
    } catch (error) {
        console.error("Logout error:", error);
    }
};
