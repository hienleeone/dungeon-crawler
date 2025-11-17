// ===== LEADERBOARD SYSTEM =====

const showLeaderboard = async () => {
    sfxOpen.play();
    
    closeInventory();
    dungeon.status.exploring = false;
    let dimDungeon = document.querySelector('#dungeon-main');
    dimDungeon.style.filter = "brightness(50%)";

    // Show loading while fetching data
    defaultModalElement.style.display = "flex";
    defaultModalElement.innerHTML = `
    <div class="content">
        <p>Đang tải xếp hạng...</p>
    </div>`;

    try {
        const leaderboards = await getLeaderboards();

        defaultModalElement.innerHTML = `
        <div class="content" id="leaderboard-tab">
            <div class="content-head">
                <h3>Xếp Hạng</h3>
                <p id="leaderboard-close"><i class="fa fa-xmark"></i></p>
            </div>

            <div class="leaderboard-section">
                <h4>Top 3 - Vàng Cao Nhất</h4>
                <div id="gold-leaderboard"></div>
            </div>

            <div class="leaderboard-section">
                <h4>Top 3 - Level Cao Nhất</h4>
                <div id="level-leaderboard"></div>
            </div>

            <div class="leaderboard-section">
                <h4>Top 3 - Tầng Cao Nhất</h4>
                <div id="floor-leaderboard"></div>
            </div>
        </div>`;

        // Populate leaderboards
        populateLeaderboard('gold-leaderboard', leaderboards.gold, 'vàng');
        populateLeaderboard('level-leaderboard', leaderboards.level, '');
        populateLeaderboard('floor-leaderboard', leaderboards.floor, '');

        let leaderboardTab = document.querySelector('#leaderboard-tab');
        leaderboardTab.style.width = "18rem";
        leaderboardTab.style.maxHeight = "600px";
        leaderboardTab.style.overflowY = "auto";

        let leaderboardClose = document.querySelector('#leaderboard-close');
        leaderboardClose.onclick = function () {
            sfxDecline.play();
            defaultModalElement.style.display = "none";
            defaultModalElement.innerHTML = "";
            dimDungeon.style.filter = "brightness(100%)";
            continueExploring();
        };

    } catch (error) {
        console.error("Error loading leaderboard:", error);
        defaultModalElement.innerHTML = `
        <div class="content">
            <p>Có lỗi khi tải xếp hạng!</p>
            <button id="leaderboard-close-btn">Đóng</button>
        </div>`;
        
        document.querySelector('#leaderboard-close-btn').onclick = function () {
            defaultModalElement.style.display = "none";
            dimDungeon.style.filter = "brightness(100%)";
            continueExploring();
        };
    }
};

const populateLeaderboard = (elementId, data, suffix) => {
    const element = document.querySelector('#' + elementId);
    if (!element) return;

    if (data.length === 0) {
        element.innerHTML = '<p style="text-align: center; color: #999;">Chưa có dữ liệu</p>';
        return;
    }

    let html = '';
    data.forEach((entry, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        html += `<p>${medal} #${index + 1}: ${entry.name} - ${entry.value}${suffix}</p>`;
    });

    element.innerHTML = html;
};

// Add leaderboard button style
const addLeaderboardStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
        .leaderboard-section {
            margin: 15px 0;
            padding: 10px;
            border: 1px solid #444;
            border-radius: 5px;
            background: rgba(0,0,0,0.3);
        }

        .leaderboard-section h4 {
            margin: 0 0 10px 0;
            color: #ffd500;
            font-size: 0.9rem;
        }

        .leaderboard-section p {
            margin: 5px 0;
            font-size: 0.85rem;
            color: #ccc;
        }
    `;
    document.head.appendChild(style);
};

// Initialize leaderboard styles on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addLeaderboardStyles);
} else {
    addLeaderboardStyles();
}
