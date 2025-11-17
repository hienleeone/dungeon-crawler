// Authentication Handler

// Kiểm tra trạng thái đăng nhập khi load trang
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        
        // Ẩn màn hình auth
        document.querySelector("#auth-screen").style.display = "none";
        
        // Người dùng đã đăng nhập, load dữ liệu từ Firebase
        await loadPlayerDataFromFirebase(user.uid);
        
        // Kiểm tra xem người chơi đã có tên chưa
        if (player === null || !player.name) {
            runLoad("character-creation", "flex");
        } else if (player.allocated) {
            runLoad("title-screen", "flex");
        } else {
            runLoad("title-screen", "flex");
        }
    } else {
        // Chưa đăng nhập, hiển thị màn hình auth
        currentUser = null;
        document.querySelector("#auth-screen").style.display = "flex";
        document.querySelector("#character-creation").style.display = "none";
        document.querySelector("#title-screen").style.display = "none";
    }
});

// Chuyển đổi giữa login và register form
document.querySelector("#show-register-btn").addEventListener("click", function () {
    document.querySelector("#login-form").style.display = "none";
    document.querySelector("#register-form").style.display = "block";
    document.querySelector("#register-alert").innerHTML = "";
});

document.querySelector("#show-login-btn").addEventListener("click", function () {
    document.querySelector("#register-form").style.display = "none";
    document.querySelector("#login-form").style.display = "block";
    document.querySelector("#login-alert").innerHTML = "";
});

// Đăng nhập
document.querySelector("#login-btn").addEventListener("click", async function () {
    const email = document.querySelector("#login-email").value;
    const password = document.querySelector("#login-password").value;
    const alertElement = document.querySelector("#login-alert");

    if (!email || !password) {
        alertElement.innerHTML = "Vui lòng nhập đầy đủ thông tin!";
        return;
    }

    try {
        alertElement.innerHTML = "Đang đăng nhập...";
        await firebase.auth().signInWithEmailAndPassword(email, password);
        alertElement.innerHTML = "";
        // onAuthStateChanged sẽ tự động xử lý sau khi đăng nhập thành công
    } catch (error) {
        console.error("Login error:", error);
        if (error.code === 'auth/user-not-found') {
            alertElement.innerHTML = "Tài khoản không tồn tại!";
        } else if (error.code === 'auth/wrong-password') {
            alertElement.innerHTML = "Sai mật khẩu!";
        } else if (error.code === 'auth/invalid-email') {
            alertElement.innerHTML = "Email không hợp lệ!";
        } else if (error.code === 'auth/invalid-credential') {
            alertElement.innerHTML = "Email hoặc mật khẩu không đúng!";
        } else if (error.code === 'auth/too-many-requests') {
            alertElement.innerHTML = "Quá nhiều lần thử. Vui lòng thử lại sau!";
        } else {
            alertElement.innerHTML = "Đăng nhập thất bại. Vui lòng kiểm tra lại!";
        }
    }
});

// Đăng ký
document.querySelector("#register-btn").addEventListener("click", async function () {
    const email = document.querySelector("#register-email").value;
    const password = document.querySelector("#register-password").value;
    const confirmPassword = document.querySelector("#register-password-confirm").value;
    const alertElement = document.querySelector("#register-alert");

    if (!email || !password || !confirmPassword) {
        alertElement.innerHTML = "Vui lòng nhập đầy đủ thông tin!";
        return;
    }

    if (password !== confirmPassword) {
        alertElement.innerHTML = "Mật khẩu không khớp!";
        return;
    }

    if (password.length < 6) {
        alertElement.innerHTML = "Mật khẩu phải có ít nhất 6 ký tự!";
        return;
    }

    try {
        alertElement.innerHTML = "Đang đăng ký...";
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        
        // Tạo document rỗng cho người chơi mới
        await db.collection('players').doc(userCredential.user.uid).set({
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            email: email
        });
        
        alertElement.innerHTML = "";
        // onAuthStateChanged sẽ tự động xử lý sau khi đăng ký thành công
    } catch (error) {
        console.error("Register error:", error);
        if (error.code === 'auth/email-already-in-use') {
            alertElement.innerHTML = "Email đã được sử dụng!";
        } else if (error.code === 'auth/invalid-email') {
            alertElement.innerHTML = "Email không hợp lệ!";
        } else if (error.code === 'auth/weak-password') {
            alertElement.innerHTML = "Mật khẩu phải có ít nhất 6 ký tự!";
        } else if (error.code === 'auth/operation-not-allowed') {
            alertElement.innerHTML = "Đăng ký email/password chưa được bật!";
        } else {
            alertElement.innerHTML = "Đăng ký thất bại. Vui lòng thử lại!";
        }
    }
});

// Đăng xuất
const logoutUser = async () => {
    try {
        await firebase.auth().signOut();
        player = null;
        
        // Dừng game nếu đang chơi
        if (typeof bgmDungeon !== 'undefined') {
            bgmDungeon.stop();
        }
        if (typeof clearInterval !== 'undefined' && typeof dungeonTimer !== 'undefined') {
            clearInterval(dungeonTimer);
        }
        if (typeof clearInterval !== 'undefined' && typeof playTimer !== 'undefined') {
            clearInterval(playTimer);
        }
        
        // Reset màn hình
        document.querySelector("#dungeon-main").style.display = "none";
        document.querySelector("#title-screen").style.display = "none";
        document.querySelector("#character-creation").style.display = "none";
        document.querySelector("#auth-screen").style.display = "flex";
        
        // Reset các modal
        if (typeof menuModalElement !== 'undefined') {
            menuModalElement.style.display = "none";
            menuModalElement.innerHTML = "";
        }
        if (typeof defaultModalElement !== 'undefined') {
            defaultModalElement.style.display = "none";
            defaultModalElement.innerHTML = "";
        }
    } catch (error) {
        console.error("Lỗi đăng xuất:", error);
    }
};

// Load dữ liệu người chơi từ Firebase
const loadPlayerDataFromFirebase = async (userId) => {
    try {
        const docRef = db.collection('players').doc(userId);
        const doc = await docRef.get();

        if (doc.exists && doc.data().playerData) {
            player = doc.data().playerData;
            // Đảm bảo gold là number
            if (player) {
                player.gold = Number(player.gold) || 0;
            }
            
            // Load dungeon data nếu có
            const docData = doc.data();
            if (docData.dungeonData) {
                dungeon = docData.dungeonData;
            }
            
            // Load enemy data nếu có
            if (docData.enemyData) {
                enemy = docData.enemyData;
            }
        } else {
            player = null;
        }
    } catch (error) {
        console.error("Lỗi load dữ liệu:", error);
        player = null;
    }
};

// Lưu dữ liệu người chơi lên Firebase
const savePlayerDataToFirebase = async () => {
    if (!currentUser) return;

    try {
        const batch = db.batch();
        
        // Lưu player data
        const playerRef = db.collection('players').doc(currentUser.uid);
        batch.set(playerRef, {
            playerData: player,
            dungeonData: typeof dungeon !== 'undefined' ? dungeon : null,
            enemyData: typeof enemy !== 'undefined' ? enemy : null,
            name: player.name,
            lvl: player.lvl,
            gold: player.gold,
            floor: typeof dungeon !== 'undefined' ? dungeon.progress.floor : 1,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        // Lưu tên vào collection playerNames để check trùng
        if (player.name) {
            const nameRef = db.collection('playerNames').doc(player.name);
            batch.set(nameRef, {
                name: player.name,
                userId: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        await batch.commit();

        // Cập nhật leaderboards
        await updateLeaderboards();
    } catch (error) {
        console.error("Lỗi lưu dữ liệu:", error);
    }
};

// Cập nhật bảng xếp hạng
const updateLeaderboards = async () => {
    if (!currentUser || !player || !player.name) return;

    try {
        const batch = db.batch();

        // Top gold
        const goldRef = db.collection('leaderboards').doc('gold');
        batch.set(goldRef, {
            [currentUser.uid]: {
                name: player.name,
                value: player.gold,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }
        }, { merge: true });

        // Top level
        const levelRef = db.collection('leaderboards').doc('level');
        batch.set(levelRef, {
            [currentUser.uid]: {
                name: player.name,
                value: player.lvl,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }
        }, { merge: true });

        // Top floor
        const floorRef = db.collection('leaderboards').doc('floor');
        const currentFloor = (typeof dungeon !== 'undefined' && dungeon.progress) ? dungeon.progress.floor : 1;
        batch.set(floorRef, {
            [currentUser.uid]: {
                name: player.name,
                value: currentFloor,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }
        }, { merge: true });

        await batch.commit();
    } catch (error) {
        console.error("Lỗi cập nhật leaderboards:", error);
    }
};

// Kiểm tra tên người chơi có trùng không
const checkPlayerNameExists = async (name) => {
    try {
        const docRef = db.collection('playerNames').doc(name);
        const doc = await docRef.get();
        
        return doc.exists;
    } catch (error) {
        console.error("Lỗi kiểm tra tên:", error);
        return false;
    }
};

// Hiển thị bảng xếp hạng
const showLeaderboard = async () => {
    try {
        sfxOpen.play();
        
        const [goldDoc, levelDoc, floorDoc] = await Promise.all([
            db.collection('leaderboards').doc('gold').get(),
            db.collection('leaderboards').doc('level').get(),
            db.collection('leaderboards').doc('floor').get()
        ]);

        const goldData = goldDoc.exists ? goldDoc.data() : {};
        const levelData = levelDoc.exists ? levelDoc.data() : {};
        const floorData = floorDoc.exists ? floorDoc.data() : {};

        // Chuyển đổi object thành array và sắp xếp
        const goldTop = Object.values(goldData)
            .sort((a, b) => b.value - a.value)
            .slice(0, 3);
        
        const levelTop = Object.values(levelData)
            .sort((a, b) => b.value - a.value)
            .slice(0, 3);
        
        const floorTop = Object.values(floorData)
            .sort((a, b) => b.value - a.value)
            .slice(0, 3);

        // Tạo HTML cho leaderboard
        let goldHTML = '<h4>🏆 Top Vàng</h4>';
        goldTop.forEach((entry, index) => {
            goldHTML += `<p>${index + 1}. ${entry.name}: ${nFormatter(entry.value)}</p>`;
        });

        let levelHTML = '<h4>⭐ Top Level</h4>';
        levelTop.forEach((entry, index) => {
            levelHTML += `<p>${index + 1}. ${entry.name}: Lv.${entry.value}</p>`;
        });

        let floorHTML = '<h4>🏔️ Top Tầng</h4>';
        floorTop.forEach((entry, index) => {
            floorHTML += `<p>${index + 1}. ${entry.name}: Tầng ${entry.value}</p>`;
        });

        defaultModalElement.style.display = "flex";
        defaultModalElement.innerHTML = `
        <div class="content" id="leaderboard-tab">
            <div class="content-head">
                <h3>Xếp Hạng</h3>
                <p id="leaderboard-close"><i class="fa fa-xmark"></i></p>
            </div>
            <div style="text-align: left; max-height: 400px; overflow-y: auto;">
                ${goldHTML}
                <br>
                ${levelHTML}
                <br>
                ${floorHTML}
            </div>
        </div>`;

        let close = document.querySelector('#leaderboard-close');
        close.onclick = function () {
            sfxDecline.play();
            defaultModalElement.style.display = "none";
            defaultModalElement.innerHTML = "";
            if (menuModalElement.style.display === "none") {
                menuModalElement.style.display = "flex";
            }
        };
    } catch (error) {
        console.error("Lỗi hiển thị leaderboard:", error);
    }
};
