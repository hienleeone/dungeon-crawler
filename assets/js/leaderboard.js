// ===== Leaderboard System =====

/**
 * Show leaderboard modal
 */
const showLeaderboard = () => {
    sfxOpen.play();
    
    menuModalElement.style.display = "none";
    defaultModalElement.style.display = "flex";
    
    // Get all leaderboard data
    Promise.all([
        getLeaderboard('gold', 3),
        getLeaderboard('level', 3),
        getLeaderboard('floor', 3)
    ]).then(([goldTop, levelTop, floorTop]) => {
        let leaderboardHTML = `
        <div class="content" id="leaderboard-tab">
            <div class="content-head">
                <h3>Xếp Hạng</h3>
                <p id="leaderboard-close"><i class="fa fa-xmark"></i></p>
            </div>
            
            <div class="leaderboard-section">
                <h4><i class="fas fa-coins" style="color: #FFD700;"></i> Top Vàng</h4>
                <div class="leaderboard-list">`;
        
        goldTop.forEach((player, index) => {
            leaderboardHTML += `
                    <div class="leaderboard-item">
                        <span class="rank">#${index + 1}</span>
                        <span class="name">${player.name}</span>
                        <span class="value">${nFormatter(player.value)}</span>
                    </div>`;
        });
        
        leaderboardHTML += `
                </div>
            </div>
            
            <div class="leaderboard-section">
                <h4><i class="ra ra-crown"></i> Top Level</h4>
                <div class="leaderboard-list">`;
        
        levelTop.forEach((player, index) => {
            leaderboardHTML += `
                    <div class="leaderboard-item">
                        <span class="rank">#${index + 1}</span>
                        <span class="name">${player.name}</span>
                        <span class="value">Lv.${player.value}</span>
                    </div>`;
        });
        
        leaderboardHTML += `
                </div>
            </div>
            
            <div class="leaderboard-section">
                <h4><i class="ra ra-tower"></i> Top Tầng</h4>
                <div class="leaderboard-list">`;
        
        floorTop.forEach((player, index) => {
            leaderboardHTML += `
                    <div class="leaderboard-item">
                        <span class="rank">#${index + 1}</span>
                        <span class="name">${player.name}</span>
                        <span class="value">Tầng ${player.value}</span>
                    </div>`;
        });
        
        leaderboardHTML += `
                </div>
            </div>
        </div>`;
        
        defaultModalElement.innerHTML = leaderboardHTML;
        let leaderboardTab = document.querySelector('#leaderboard-tab');
        leaderboardTab.style.width = "20rem";
        let leaderboardClose = document.querySelector('#leaderboard-close');
        leaderboardClose.onclick = function () {
            sfxDecline.play();
            defaultModalElement.style.display = "none";
            defaultModalElement.innerHTML = "";
            menuModalElement.style.display = "flex";
        };
    }).catch((error) => {
        console.error("Error loading leaderboard:", error);
        defaultModalElement.innerHTML = `
        <div class="content">
            <p>Lỗi tải xếp hạng!</p>
            <button onclick="location.reload()">Tải Lại</button>
        </div>`;
    });
};
