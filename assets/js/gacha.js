// ============================
// GACHA SYSTEM - FIXED VERSION
// ============================

// Tỷ lệ rớt 6 cấp độ hiếm (theo file equipment.js)
const rarityTable = [
    { type: "common",      rate: 55 },
    { type: "uncommon",    rate: 25 },
    { type: "rare",        rate: 12 },
    { type: "epic",        rate: 5 },
    { type: "legendary",   rate: 2 },
    { type: "mythic",      rate: 1 }
];

const rarityColors = {
    common:      "#9e9e9e",
    uncommon:    "#4CAF50",
    rare:        "#2196F3",
    epic:        "#9C27B0",
    legendary:   "#FF9800",
    mythic:      "#E91E63"
};

// Lấy item theo rarity (từ equipment.js)
function getRandomItemByRarity(rarity) {
    const pool = allEquipments.filter(e => e.rarity === rarity);
    return pool[Math.floor(Math.random() * pool.length)];
}

// Chọn 1 rarity theo tỷ lệ
function rollRarity() {
    const r = Math.random() * 100;
    let sum = 0;
    for (const entry of rarityTable) {
        sum += entry.rate;
        if (r <= sum) return entry.type;
    }
    return "common";
}

// ============================
// ANIMATION EFFECT
// ============================

// Reset animation class
function resetAnimation(el) {
    el.classList.remove("gacha-shake", "gacha-pop", "gacha-flash");
    void el.offsetWidth; // force reflow
}

function playGachaAnimation(resultBox, color) {
    resetAnimation(resultBox);

    // Rung nhẹ
    resultBox.classList.add("gacha-shake");

    setTimeout(() => {
        // Flash sáng + bung vật phẩm
        resultBox.classList.add("gacha-flash");

        setTimeout(() => {
            resultBox.classList.add("gacha-pop");
            resultBox.style.borderColor = color;
        }, 250);

    }, 400);
}

// ============================
// GACHA 1 LẦN
// ============================
window.doGacha = function () {
    if (playerGold < 100) {
        alert("Không đủ vàng!");
        return;
    }

    playerGold -= 100;
    updateGoldUI();

    const rarity = rollRarity();
    const item = getRandomItemByRarity(rarity);

    const resultBox = document.getElementById("gacha-result-box");
    const resultName = document.getElementById("gacha-result-name");

    resultBox.innerHTML = "";  
    resultName.textContent = item.name;

    const color = rarityColors[rarity] || "#fff";
    resultName.style.color = color;

    // Create loot icon
    const lootImg = document.createElement("img");
    lootImg.src = item.icon;
    lootImg.className = "gacha-item-img";
    lootImg.style.borderColor = color;
    resultBox.appendChild(lootImg);

    // Animation
    playGachaAnimation(resultBox, color);

    return item;
};

// ============================
// GACHA 10 LẦN
// ============================
window.doGachaBulk = function () {
    if (playerGold < 1000) {
        alert("Không đủ vàng!");
        return;
    }

    playerGold -= 1000;
    updateGoldUI();

    const list = [];
    const resultBox = document.getElementById("gacha-result-box");
    resultBox.innerHTML = "";

    for (let i = 0; i < 10; i++) {
        const rarity = rollRarity();
        const item = getRandomItemByRarity(rarity);
        list.push(item);

        const img = document.createElement("img");
        img.src = item.icon;
        img.className = "gacha-item-img-small";
        img.style.borderColor = rarityColors[item.rarity];
        resultBox.appendChild(img);
    }

    // Animation
    playGachaAnimation(resultBox, "#fff");

    document.getElementById("gacha-result-name").textContent = "10 vật phẩm";

    return list;
};

// ============================
// MODAL CONTROL (FIXED)
// ============================

document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("gacha-modal");
    const btnClose = document.getElementById("gacha-btn-close");
    const btnX = document.getElementById("gacha-btn-x");
    const btnOpen = document.getElementById("btn-open-gacha");

    // Mở modal
    btnOpen.onclick = () => {
        modal.style.display = "flex";
    };

    // Đóng modal
    btnClose.onclick = () => {
        modal.style.display = "none";
    };

    btnX.onclick = () => {
        modal.style.display = "none";
    };

    // Click ra ngoài để đóng
    modal.onclick = e => {
        if (e.target === modal) modal.style.display = "none";
    };
});
