// Authentication UI Handler

window.addEventListener("load", function () {
    // Check authentication state
    auth.onAuthStateChanged(function (user) {
        if (user) {
            currentUser = user;
            console.log("User logged in:", user.email);
            
            // Load player data from Firebase
            loadPlayerDataFromFirebase(user.uid);
        } else {
            currentUser = null;
            console.log("User logged out");
            showLoginScreen();
        }
    });

    // Login form submission
    document.querySelector("#login-form").addEventListener("submit", function (e) {
        e.preventDefault();
        const email = document.querySelector("#login-email").value;
        const password = document.querySelector("#login-password").value;

        firebaseLogin(email, password)
            .then(() => {
                // Login successful, onAuthStateChanged will handle the rest
            })
            .catch((error) => {
                const alertElement = document.querySelector("#login-alert");
                if (error.code === 'auth/user-not-found') {
                    alertElement.innerHTML = "Email không tồn tại!";
                } else if (error.code === 'auth/wrong-password') {
                    alertElement.innerHTML = "Mật khẩu sai!";
                } else if (error.code === 'auth/invalid-email') {
                    alertElement.innerHTML = "Email không hợp lệ!";
                } else {
                    alertElement.innerHTML = "Đăng nhập thất bại!";
                }
                console.error("Login error:", error);
            });
    });

    // Register button click
    document.querySelector("#register-btn").addEventListener("click", function () {
        showRegisterScreen();
    });

    // Register form submission
    document.querySelector("#register-form").addEventListener("submit", function (e) {
        e.preventDefault();
        const email = document.querySelector("#register-email").value;
        const password = document.querySelector("#register-password").value;
        const passwordConfirm = document.querySelector("#register-password-confirm").value;

        const alertElement = document.querySelector("#register-alert");

        // Validate passwords
        if (password !== passwordConfirm) {
            alertElement.innerHTML = "Mật khẩu không trùng khớp!";
            return;
        }

        if (password.length < 6) {
            alertElement.innerHTML = "Mật khẩu phải có ít nhất 6 ký tự!";
            return;
        }

        firebaseRegister(email, password)
            .then((user) => {
                // Registration successful, show character creation
                currentUser = user;
                showCharacterCreation();
            })
            .catch((error) => {
                if (error.code === 'auth/email-already-in-use') {
                    alertElement.innerHTML = "Email đã được đăng ký!";
                } else if (error.code === 'auth/invalid-email') {
                    alertElement.innerHTML = "Email không hợp lệ!";
                } else if (error.code === 'auth/weak-password') {
                    alertElement.innerHTML = "Mật khẩu quá yếu!";
                } else {
                    alertElement.innerHTML = "Đăng ký thất bại!";
                }
                console.error("Register error:", error);
            });
    });

    // Back button on register screen
    document.querySelector("#back-btn").addEventListener("click", function () {
        showLoginScreen();
    });

    // Clear alerts when typing
    document.querySelector("#login-email").addEventListener("input", function () {
        document.querySelector("#login-alert").innerHTML = "";
    });
    document.querySelector("#login-password").addEventListener("input", function () {
        document.querySelector("#login-alert").innerHTML = "";
    });
    document.querySelector("#register-email").addEventListener("input", function () {
        document.querySelector("#register-alert").innerHTML = "";
    });
    document.querySelector("#register-password").addEventListener("input", function () {
        document.querySelector("#register-alert").innerHTML = "";
    });
    document.querySelector("#register-password-confirm").addEventListener("input", function () {
        document.querySelector("#register-alert").innerHTML = "";
    });
});

// ===== UI Functions =====

function showLoginScreen() {
    document.querySelector("#login-screen").style.display = "flex";
    document.querySelector("#register-screen").style.display = "none";
    document.querySelector("#title-screen").style.display = "none";
    document.querySelector("#character-creation").style.display = "none";
    document.querySelector("#dungeon-main").style.display = "none";
    document.querySelector("#loading").style.display = "none";
    
    // Clear form
    document.querySelector("#login-form").reset();
    document.querySelector("#login-alert").innerHTML = "";
}

function showRegisterScreen() {
    document.querySelector("#login-screen").style.display = "none";
    document.querySelector("#register-screen").style.display = "flex";
    // Clear register form
    document.querySelector("#register-form").reset();
    document.querySelector("#register-alert").innerHTML = "";
}

function showCharacterCreation() {
    document.querySelector("#login-screen").style.display = "none";
    document.querySelector("#register-screen").style.display = "none";
    document.querySelector("#character-creation").style.display = "flex";
    document.querySelector("#title-screen").style.display = "none";
    document.querySelector("#dungeon-main").style.display = "none";
    
    // Clear character creation form
    document.querySelector("#name-submit").reset();
    document.querySelector("#alert").innerHTML = "";
}

// ===== Firebase Player Data Functions =====

/**
 * Create default player data structure
 */
function createDefaultPlayerData(playerName) {
    return {
        name: playerName,
        lvl: 1,
        stats: {
            hp: null,
            hpMax: null,
            atk: null,
            def: null,
            pen: null,
            atkSpd: null,
            vamp: null,
            critRate: null,
            critDmg: null
        },
        baseStats: {
            hp: 500,
            atk: 100,
            def: 50,
            pen: 0,
            atkSpd: 0.6,
            vamp: 0,
            critRate: 0,
            critDmg: 50
        },
        equippedStats: {
            hp: 0,
            atk: 0,
            def: 0,
            pen: 0,
            atkSpd: 0,
            vamp: 0,
            critRate: 0,
            critDmg: 0,
            hpPct: 0,
            atkPct: 0,
            defPct: 0,
            penPct: 0,
        },
        bonusStats: {
            hp: 0,
            atk: 0,
            def: 0,
            atkSpd: 0,
            vamp: 0,
            critRate: 0,
            critDmg: 0
        },
        exp: {
            expCurr: 0,
            expMax: 100,
            expCurrLvl: 0,
            expMaxLvl: 100,
            lvlGained: 0
        },
        inventory: {
            consumables: [],
            equipment: []
        },
        equipped: [],
        gold: 0,
        playtime: 0,
        kills: 0,
        deaths: 0,
        inCombat: false,
        skills: [],
        blessing: 1,
        tempStats: {
            atk: 0,
            atkSpd: 0
        },
        allocated: false,
        dungeon: {
            progress: {
                floor: 1,
                room: 1
            },
            statistics: {
                kills: 0,
                runtime: 0
            },
            status: {
                exploring: false,
                paused: true,
                event: false,
            },
            settings: {
                enemyBaseLvl: 1,
                enemyLvlGap: 5,
                enemyBaseStats: 1,
                enemyScaling: 1.1,
            },
            backlog: [],
            action: 0
        }
    };
}

/**
 * Load player data from Firebase or show character creation
 */
function loadPlayerDataFromFirebase(userId) {
    getPlayerData(userId)
        .then((playerData) => {
            if (playerData) {
                // Player exists, load their data
                player = playerData;
                
                // Load volume settings
                getVolumeData(userId).then((volumeData) => {
                    if (volumeData) {
                        volume = volumeData;
                    }
                    initializeGame();
                });
            } else {
                // New player, show character creation
                showCharacterCreation();
            }
        })
        .catch((error) => {
            console.error("Error loading player data:", error);
            showCharacterCreation();
        });
}

/**
 * Initialize game after successful login
 */
function initializeGame() {
    // Check if player has allocated stats
    if (player && player.allocated) {
        // Show title screen (Nhấn để khám phá hầm ngục)
        document.querySelector("#login-screen").style.display = "none";
        document.querySelector("#register-screen").style.display = "none";
        document.querySelector("#character-creation").style.display = "none";
        document.querySelector("#title-screen").style.display = "flex";
        
        // Load dungeon data
        getDungeonData();
    } else {
        // Show character creation (Bạn tên gì?)
        showCharacterCreation();
    }
    
    // Start auto-save
    if (currentUser) {
        startAutoSave(currentUser.uid, () => player);
    }
}

/**
 * Logout function
 */
function logoutPlayer() {
    stopAutoSave();
    firebaseLogout()
        .then(() => {
            player = null;
            dungeon = null;
            enemy = null;
            currentUser = null;
            showLoginScreen();
        })
        .catch((error) => {
            console.error("Error logging out:", error);
        });
}

/**
 * Get dungeon data (temporary, can be stored in Firebase later)
 */
function getDungeonData() {
    // If dungeon data doesn't exist, create new one
    if (!dungeon) {
        dungeon = {
            progress: {
                floor: 1,
                room: 1
            },
            statistics: {
                kills: 0,
                runtime: 0
            },
            status: {
                exploring: false,
                paused: true,
                event: false,
            },
            settings: {
                enemyBaseLvl: 1,
                enemyLvlGap: 5,
                enemyBaseStats: 1,
                enemyScaling: 1.1,
            },
            backlog: [],
            action: 0
        };
    }
}
