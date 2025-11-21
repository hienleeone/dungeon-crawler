let player = null; // Will be loaded from Firebase
let inventoryOpen = false;
let leveled = false;
const lvlupSelect = document.querySelector("#lvlupSelect");
const lvlupPanel = document.querySelector("#lvlupPanel");

const playerExpGain = () => {
    player.exp.expCurr += enemy.rewards.exp;
    player.exp.expCurrLvl += enemy.rewards.exp;

    while (player.exp.expCurr >= player.exp.expMax) {
        playerLvlUp();
    }
    if (leveled) {
        lvlupPopup();
    }

    playerLoadStats();
}

// Levels up the player
const playerLvlUp = () => {
    leveled = true;

    // Calculates the excess exp and the new exp required to level up
    let expMaxIncrease = Math.floor(((player.exp.expMax * 1.1) + 100) - player.exp.expMax);
    if (player.lvl > 100) {
        expMaxIncrease = 1000000;
    }
    let excessExp = player.exp.expCurr - player.exp.expMax;
    player.exp.expCurrLvl = excessExp;
    player.exp.expMaxLvl = expMaxIncrease;

    // Increase player level and maximum exp
    player.lvl++;
    player.exp.lvlGained++;
    player.exp.expMax += expMaxIncrease;

    // Increase player bonus stats per level
    player.bonusStats.hp += 4;
    player.bonusStats.atk += 2;
    player.bonusStats.def += 2;
    player.bonusStats.atkSpd += 0.15;
    player.bonusStats.critRate += 0.1;
    player.bonusStats.critDmg += 0.25;
}

// Refresh the player stats
const playerLoadStats = () => {
    showEquipment();
    showInventory();
    applyEquipmentStats();

    let rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    if (player.stats.hp > player.stats.hpMax) {
        player.stats.hp = player.stats.hpMax;
    }
    player.stats.hpPercent = Number((player.stats.hp / player.stats.hpMax) * 100).toFixed(2).replace(rx, "$1");
    player.exp.expPercent = Number((player.exp.expCurrLvl / player.exp.expMaxLvl) * 100).toFixed(2).replace(rx, "$1");

    // Generate battle info for player if in combat
    if (player.inCombat || playerDead) {
        const playerCombatHpElement = document.querySelector('#player-hp-battle');
        const playerHpDamageElement = document.querySelector('#player-hp-dmg');
        const playerExpElement = document.querySelector('#player-exp-bar');
        const playerInfoElement = document.querySelector('#player-combat-info');
        playerCombatHpElement.innerHTML = `&nbsp${nFormatter(player.stats.hp)}/${nFormatter(player.stats.hpMax)}(${player.stats.hpPercent}%)`;
        playerCombatHpElement.style.width = `${player.stats.hpPercent}%`;
        playerHpDamageElement.style.width = `${player.stats.hpPercent}%`;
        playerExpElement.style.width = `${player.exp.expPercent}%`;
        playerInfoElement.innerHTML = `${player.name} Lv.${player.lvl} (${player.exp.expPercent}%)`;
    }

    // Header
    document.querySelector("#player-name").innerHTML = `<i class="fas fa-user"></i>${player.name} Lv.${player.lvl}`;
    document.querySelector("#player-exp").innerHTML = `<p>Exp</p> ${nFormatter(player.exp.expCurr)}/${nFormatter(player.exp.expMax)} (${player.exp.expPercent}%)`;
    document.querySelector("#player-gold").innerHTML = `<i class="fas fa-coins" style="color: #FFD700;"></i>${nFormatter(player.gold)}`;

    // Player Stats
    playerHpElement.innerHTML = `${nFormatter(player.stats.hp)}/${nFormatter(player.stats.hpMax)} (${player.stats.hpPercent}%)`;
    playerAtkElement.innerHTML = nFormatter(player.stats.atk);
    playerDefElement.innerHTML = nFormatter(player.stats.def);
    playerAtkSpdElement.innerHTML = player.stats.atkSpd.toFixed(2).replace(rx, "$1");
    playerVampElement.innerHTML = (player.stats.vamp).toFixed(2).replace(rx, "$1") + "%";
    playerCrateElement.innerHTML = (player.stats.critRate).toFixed(2).replace(rx, "$1") + "%";
    playerCdmgElement.innerHTML = (player.stats.critDmg).toFixed(2).replace(rx, "$1") + "%";

    // Player Bonus Stats
    document.querySelector("#bonus-stats").innerHTML = `
    <h4>Stats Bonus</h4>
    <p><i class="fas fa-heart"></i>HP+${player.bonusStats.hp.toFixed(2).replace(rx, "$1")}%</p>
    <p><i class="ra ra-sword"></i>ATK+${player.bonusStats.atk.toFixed(2).replace(rx, "$1")}%</p>
    <p><i class="ra ra-round-shield"></i>DEF+${player.bonusStats.def.toFixed(2).replace(rx, "$1")}%</p>
    <p><i class="ra ra-plain-dagger"></i>ATK.SPD+${player.bonusStats.atkSpd.toFixed(2).replace(rx, "$1")}%</p>
    <p><i class="ra ra-dripping-blade"></i>VAMP+${player.bonusStats.vamp.toFixed(2).replace(rx, "$1")}%</p>
    <p><i class="ra ra-lightning-bolt"></i>C.RATE+${player.bonusStats.critRate.toFixed(2).replace(rx, "$1")}%</p>
    <p><i class="ra ra-focused-lightning"></i>C.DMG+${player.bonusStats.critDmg.toFixed(2).replace(rx, "$1")}%</p>`;
}

// Opens inventory
const openInventory = () => {
    sfxOpen.play();

    dungeon.status.exploring = false;
    inventoryOpen = true;
    let openInv = document.querySelector('#inventory');
    let dimDungeon = document.querySelector('#dungeon-main');
    openInv.style.display = "flex";
    dimDungeon.style.filter = "brightness(50%)";
    
    // Bắt đầu hệ thống thông báo khi mở inventory
    startNotificationSystem();

    sellAllElement.onclick = function () {
        sfxOpen.play();
        openInv.style.filter = "brightness(50%)";
        let rarity = sellRarityElement.value;

        defaultModalElement.style.display = "flex";
        if (rarity == "Tất Cả") {
            defaultModalElement.innerHTML = `
            <div class="content">
                <p>Bán tất cả vật phẩm?</p>
                <div class="button-container">
                    <button id="sell-confirm">Đồng Ý</button>
                    <button id="sell-cancel">Hủy Bỏ</button>
                </div>
            </div>`;
        } else {
            defaultModalElement.innerHTML = `
            <div class="content">
                <p>Bán vật phẩm loại <span class="${rarity}">${rarity}</span></p>
                <div class="button-container">
                    <button id="sell-confirm">Đồng Ý</button>
                    <button id="sell-cancel">Hủy Bỏ</button>
                </div>
            </div>`;
        }

        let confirm = document.querySelector('#sell-confirm');
        let cancel = document.querySelector('#sell-cancel');
        confirm.onclick = function () {
            sellAll(rarity);
            defaultModalElement.style.display = "none";
            defaultModalElement.innerHTML = "";
            openInv.style.filter = "brightness(100%)";
            // Force update inventory display
            setTimeout(() => {
                if (typeof showInventory === 'function') showInventory();
                if (typeof playerLoadStats === 'function') playerLoadStats();
            }, 100);
        };
        cancel.onclick = function () {
            sfxDecline.play();
            defaultModalElement.style.display = "none";
            defaultModalElement.innerHTML = "";
            openInv.style.filter = "brightness(100%)";
        };
    };
    sellRarityElement.onclick = function () {
        sfxOpen.play();
    };
    sellRarityElement.onchange = function () {
        let rarity = sellRarityElement.value;
        sellRarityElement.className = rarity;
    };
}

// Closes inventory
const closeInventory = () => {
    sfxDecline.play();

    let openInv = document.querySelector('#inventory');
    let dimDungeon = document.querySelector('#dungeon-main');
    openInv.style.display = "none";
    dimDungeon.style.filter = "brightness(100%)";
    inventoryOpen = false;
    
    // Dừng hệ thống thông báo khi đóng inventory
    stopNotificationSystem();
    
    if (!dungeon.status.paused) {
        dungeon.status.exploring = true;
    }
}

// Continue exploring if inventory is not open and the game is not paused
const continueExploring = () => {
    if (!inventoryOpen && !dungeon.status.paused) {
        dungeon.status.exploring = true;
    }
}

// Shows the level up popup
const lvlupPopup = () => {
    sfxLvlUp.play();
    addCombatLog(`Bạn đã lên cấp! (Lv.${player.lvl - player.exp.lvlGained} > Lv.${player.lvl})`);

    // Recover 20% extra hp on level up
    player.stats.hp += Math.round((player.stats.hpMax * 20) / 100);
    playerLoadStats();

    // Show popup choices
    lvlupPanel.style.display = "flex";
    combatPanel.style.filter = "brightness(50%)";
    const percentages = {
        "hp": 10,
        "atk": 8,
        "def": 8,
        "atkSpd": 3,
        "vamp": 0.5,
        "critRate": 1,
        "critDmg": 6
    };
    generateLvlStats(2, percentages);
}

// Generates random stats for level up popup
const generateLvlStats = (rerolls, percentages) => {
    let selectedStats = [];
    let stats = ["hp", "atk", "def", "atkSpd", "vamp", "critRate", "critDmg"];
    while (selectedStats.length < 3) {
        let randomIndex = Math.floor(Math.random() * stats.length);
        if (!selectedStats.includes(stats[randomIndex])) {
            selectedStats.push(stats[randomIndex]);
        }
    }

    const loadLvlHeader = () => {
        lvlupSelect.innerHTML = `
            <h1>Level Up!</h1>
            <div class="content-head">
                <h4>Còn lại: ${player.exp.lvlGained}</h4>
                <button id="lvlReroll">Tạo lại ${rerolls}/2</button>
            </div>
        `;
    }
    loadLvlHeader();

    const lvlReroll = document.querySelector("#lvlReroll");
    lvlReroll.addEventListener("click", function () {
        if (rerolls > 0) {
            sfxSell.play();
            rerolls--;
            loadLvlHeader();
            generateLvlStats(rerolls, percentages);
        } else {
            sfxDeny.play();
        }
    });

    try {
        for (let i = 0; i < 4; i++) {
            let button = document.createElement("button");
            button.id = "lvlSlot" + i;

            let h3 = document.createElement("h3");
            h3.innerHTML = selectedStats[i].replace(/([A-Z])/g, ".$1").replace(/crit/g, "c").toUpperCase() + " UP";
            button.appendChild(h3);

            let p = document.createElement("p");
            p.innerHTML = `Tăng ${percentages[selectedStats[i]]}% chỉ số ${selectedStats[i].replace(/([A-Z])/g, ".$1").replace(/crit/g, "c").toUpperCase()}.`;
            button.appendChild(p);

            // Increase the selected stat for player
            button.addEventListener("click", function () {
                sfxItem.play();
                player.bonusStats[selectedStats[i]] += percentages[selectedStats[i]];

                if (player.exp.lvlGained > 1) {
                    player.exp.lvlGained--;
                    generateLvlStats(2, percentages);
                } else {
                    player.exp.lvlGained = 0;
                    lvlupPanel.style.display = "none";
                    combatPanel.style.filter = "brightness(100%)";
                    leveled = false;
                }

                playerLoadStats();
                saveData();
            });

            lvlupSelect.appendChild(button);
        }
    } catch (err) { }
}

// ===== Notification System =====
const notificationQueue = [];
let notificationTimer = null;
let isShowingNotification = false;

// Sample notifications - Có thể tùy chỉnh
const sampleNotifications = [
    { text: "🎉 Chào mừng đến với Dungeon Crawler!", type: "legendary" },
    { text: "⚔️ Hãy cẩn thận với quái vật mạnh!", type: "warning" },
    { text: "💎 Thu thập trang bị để trở nên mạnh hơn", type: "success" },
    { text: "🔥 Boss đang chờ bạn ở tầng sâu", type: "error" },
    { text: "✨ Gacha để nhận trang bị hiếm", type: "legendary" },
    { text: "🗡️ Nâng cấp vũ khí để tăng sát thương", type: "success" },
    { text: "🛡️ Giáp tốt giúp bạn sống lâu hơn", type: "success" },
    { text: "💰 Đừng quên bán đồ không cần thiết", type: "warning" },
    { text: "🎯 Crit Rate càng cao càng dễ chí mạng", type: "success" },
    { text: "⚡ Tốc độ đánh quyết định DPS của bạn", type: "success" },
    
    // Leaderboard & Competition
    { text: "🏆 Liệu bạn có khả năng đứng trên bảng xếp hạng?", type: "legendary" },
    { text: "👑 Top 10 người chơi sẽ nhận phần thưởng đặc biệt!", type: "legendary" },
    { text: "📊 Xem bảng xếp hạng để biết vị trí của bạn", type: "default" },
    { text: "🌟 Hãy chứng minh bạn là chiến binh mạnh nhất!", type: "success" },
    { text: "⚔️ Thách thức bản thân để leo lên top cao hơn", type: "warning" },
    
    // Anti-Cheat System
    { text: "🔒 Đã cập nhật hệ thống anti-cheat mới nhất", type: "warning" },
    { text: "⚠️ Cấm việc truy cập DevTools: Lần 1 cảnh báo, Lần 2 ban 24h, Lần 3 xóa dữ liệu", type: "error" },
    { text: "🛡️ Hệ thống bảo mật đang giám sát hoạt động bất thường", type: "warning" },
    { text: "❌ Nghiêm cấm sử dụng hack, cheat hoặc bug exploit", type: "error" },
    { text: "👁️ Mọi hành vi gian lận đều bị theo dõi và xử lý", type: "error" },
    { text: "⛔ Vi phạm quy định sẽ dẫn đến khóa tài khoản vĩnh viễn", type: "error" },
    
    // Tips & Strategies
    { text: "💡 Mẹo: Cân bằng giữa tấn công và phòng thủ", type: "success" },
    { text: "🎲 Thử vận may với hệ thống Gacha mỗi ngày", type: "legendary" },
    { text: "📈 Nâng cấp đều đặn để tăng sức mạnh ổn định", type: "success" },
    { text: "🔄 Đổi trang bị phù hợp với từng loại quái vật", type: "warning" },
    { text: "⏱️ Thời gian khám phá càng lâu, phần thưởng càng lớn", type: "success" },
    
    // Events & Updates
    { text: "🎊 Sự kiện đặc biệt đang diễn ra! Đừng bỏ lỡ", type: "legendary" },
    { text: "📢 Cập nhật tính năng mới đã được thêm vào game", type: "success" },
    { text: "🎁 Đăng nhập hàng ngày để nhận quà miễn phí", type: "legendary" },
    { text: "🌈 Boss hiếm có tỷ lệ rơi đồ Legendary cao hơn", type: "warning" },
    
    // Community & Social
    { text: "💬 Tham gia Live Chat để giao lưu với người chơi khác", type: "success" },
    { text: "🤝 Chia sẻ chiến thuật với cộng đồng để cùng tiến bộ", type: "success" },
    { text: "📱 Theo dõi fanpage để cập nhật tin tức mới nhất", type: "default" },
    { text: "👥 Cùng bạn bè chinh phục dungeon sẽ vui hơn nhiều", type: "success" },
    
    // Warnings & Reminders
    { text: "⚡ Lưu game thường xuyên để tránh mất dữ liệu", type: "warning" },
    { text: "🔋 Nghỉ ngơi sau mỗi 2 giờ chơi để bảo vệ sức khỏe", type: "warning" },
    { text: "📵 Không chia sẻ tài khoản để bảo mật thông tin", type: "error" },
    { text: "🎯 Đặt mục tiêu nhỏ mỗi ngày để dễ hoàn thành", type: "success" },
    
    // Achievements & Progression
    { text: "🏅 Mở khóa thành tựu để nhận phần thưởng độc quyền", type: "legendary" },
    { text: "📜 Hoàn thành nhiệm vụ hàng ngày để nhận EXP bonus", type: "success" },
    { text: "🎖️ Huy chương danh dự đang chờ những người dũng cảm", type: "legendary" },
    { text: "🌟 Mỗi cấp độ mới mở ra sức mạnh tiềm ẩn", type: "success" },
    
    // Economy & Resources
    { text: "💰 Quản lý vàng thông minh để tối ưu hóa trang bị", type: "warning" },
    { text: "💵 Giá trị trang bị phụ thuộc vào độ hiếm và stats", type: "default" },
    { text: "📦 Mở rương kho báu để tìm vật phẩm quý hiếm", type: "success" },
    { text: "🏪 Ghé shop mỗi ngày để xem ưu đãi đặc biệt", type: "warning" },
    
    // Difficulty & Challenge
    { text: "💀 Tầng càng sâu, độ khó càng tăng gấp bội", type: "error" },
    { text: "🔱 Elite Boss có khả năng đặc biệt nguy hiểm", type: "error" },
    { text: "⚔️ Một số quái vật miễn nhiễm với hiệu ứng crowd control", type: "warning" },
    { text: "🌊 Hãy chuẩn bị kỹ trước khi thách đấu Boss tầng", type: "error" },
    
    // System & Performance
    { text: "🔧 Hệ thống tự động lưu mỗi 30 giây", type: "default" },
    { text: "⚙️ Tối ưu hiệu suất game cho trải nghiệm mượt mà", type: "success" },
    { text: "🌐 Kết nối internet ổn định để đồng bộ dữ liệu", type: "warning" },
    { text: "📊 Dữ liệu của bạn được mã hóa và bảo mật an toàn", type: "success" }
];

let notificationIndex = 0;

function showNotification(text, type = "default") {
    const container = document.getElementById("notification-container");
    if (!container) return;

    const notification = document.createElement("div");
    notification.className = `notification-item ${type}`;
    
    // Icon dựa trên loại thông báo
    let icon = "fa-bell";
    if (type === "success") icon = "fa-check-circle";
    else if (type === "warning") icon = "fa-exclamation-triangle";
    else if (type === "error") icon = "fa-times-circle";
    else if (type === "legendary") icon = "fa-star";
    
    notification.innerHTML = `<i class="fas ${icon}"></i>${text}`;
    
    container.appendChild(notification);
    
    // Tự động xóa sau 5 giây
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
    
    // Giới hạn số lượng thông báo hiển thị
    const notifications = container.querySelectorAll(".notification-item");
    if (notifications.length > 3) {
        notifications[0].remove();
    }
}

function startNotificationSystem() {
    // Xóa timer cũ nếu có
    if (notificationTimer) {
        clearInterval(notificationTimer);
    }
    
    // Hiện thông báo đầu tiên ngay lập tức
    const firstNotif = sampleNotifications[notificationIndex];
    showNotification(firstNotif.text, firstNotif.type);
    notificationIndex = (notificationIndex + 1) % sampleNotifications.length;
    
    // Sau đó hiện thông báo mới mỗi 5 giây
    notificationTimer = setInterval(() => {
        const notif = sampleNotifications[notificationIndex];
        showNotification(notif.text, notif.type);
        notificationIndex = (notificationIndex + 1) % sampleNotifications.length;
    }, 5000);
}

function stopNotificationSystem() {
    if (notificationTimer) {
        clearInterval(notificationTimer);
        notificationTimer = null;
    }
    
    // Xóa tất cả thông báo hiện tại
    const container = document.getElementById("notification-container");
    if (container) {
        container.innerHTML = "";
    }
}

// Thêm vào hàm addNotification để dễ gọi từ các file khác
function addNotification(text, type = "default") {
    showNotification(text, type);
}
