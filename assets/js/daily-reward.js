// ===== Daily Reward System =====

// Khởi tạo dữ liệu daily reward nếu chưa có
if (!player.dailyReward) {
    player.dailyReward = {
        lastClaimDate: null,
        streak: 0,
        totalDays: 0
    };
}

// Hàm kiểm tra xem có thể nhận thưởng hôm nay không
function canClaimDailyReward() {
    if (!player.dailyReward.lastClaimDate) return true;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastClaim = new Date(player.dailyReward.lastClaimDate);
    lastClaim.setHours(0, 0, 0, 0);
    
    return today.getTime() !== lastClaim.getTime();
}

// Hàm tính streak (chuỗi đăng nhập liên tiếp)
function calculateStreak() {
    if (!player.dailyReward.lastClaimDate) return 1;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastClaim = new Date(player.dailyReward.lastClaimDate);
    lastClaim.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Nếu claim hôm qua thì tăng streak
    if (lastClaim.getTime() === yesterday.getTime()) {
        return (player.dailyReward.streak % 7) + 1;
    }
    
    // Nếu bỏ lỡ thì reset về 1
    return 1;
}

// Hàm tạo phần thưởng dựa trên ngày
function generateDailyReward(day) {
    const rewards = {
        gold: 0,
        items: [],
        buffs: []
    };
    
    // Vàng cơ bản tăng theo ngày
    const baseGold = 100 * day;
    const randomBonus = Math.floor(Math.random() * baseGold * 0.5);
    rewards.gold = baseGold + randomBonus;
    
    // Ngày 3: Vật phẩm ngẫu nhiên
    if (day === 3) {
        const rarities = ['Common', 'Uncommon', 'Rare'];
        const rarity = rarities[Math.floor(Math.random() * rarities.length)];
        const item = generateRandomItem(rarity);
        rewards.items.push(item);
    }
    
    // Ngày 5: Phước lành (buff)
    if (day === 5) {
        const buffTypes = [
            { stat: 'atk', value: 10, duration: 3600000, name: 'Sức Mạnh Tạm Thời' }, // 1 giờ
            { stat: 'def', value: 10, duration: 3600000, name: 'Giáp Bảo Vệ' },
            { stat: 'vamp', value: 5, duration: 3600000, name: 'Ma Cà Rồng' },
            { stat: 'critRate', value: 10, duration: 3600000, name: 'Chí Mạng Gia Tăng' }
        ];
        const buff = buffTypes[Math.floor(Math.random() * buffTypes.length)];
        rewards.buffs.push(buff);
    }
    
    // Ngày 7: Phần thưởng đặc biệt
    if (day === 7) {
        rewards.gold *= 2;
        const legendaryItem = generateRandomItem('Legendary');
        rewards.items.push(legendaryItem);
        
        const superBuff = {
            stat: 'all',
            value: 15,
            duration: 7200000, // 2 giờ
            name: 'Phước Lành Tối Thượng'
        };
        rewards.buffs.push(superBuff);
    }
    
    return rewards;
}

// Hàm tạo vật phẩm ngẫu nhiên
function generateRandomItem(rarity) {
    const types = ['weapon', 'helmet', 'chestplate', 'leggings', 'boots', 'gloves'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let item;
    if (typeof randomStats === 'function') {
        item = randomStats(type, rarity);
    } else {
        // Fallback nếu không có hàm randomStats
        item = {
            name: `${rarity} ${type}`,
            type: type,
            rarity: rarity,
            stats: {}
        };
    }
    
    return item;
}

// Hàm hiển thị modal Daily Reward
function showDailyRewardModal() {
    const modal = document.getElementById('dailyRewardModal');
    if (!modal) return;
    
    const currentStreak = calculateStreak();
    const rewards = generateDailyReward(currentStreak);
    
    // Cập nhật UI
    document.getElementById('daily-streak').textContent = currentStreak;
    document.getElementById('gold-amount').textContent = rewards.gold;
    
    // Hiển thị phần thưởng
    document.getElementById('gold-reward').style.display = 'flex';
    document.getElementById('item-reward').style.display = 'none';
    document.getElementById('buff-reward').style.display = 'none';
    
    if (rewards.items.length > 0) {
        document.getElementById('item-reward').style.display = 'flex';
        document.getElementById('item-name').textContent = rewards.items[0].name || 'Vật phẩm ngẫu nhiên';
    }
    
    if (rewards.buffs.length > 0) {
        document.getElementById('buff-reward').style.display = 'flex';
        document.getElementById('buff-description').textContent = rewards.buffs[0].name;
    }
    
    // Cập nhật calendar
    updateRewardCalendar(player.dailyReward.streak, currentStreak);
    
    modal.style.display = 'flex';
    
    // Lưu rewards tạm thời
    modal.dataset.rewards = JSON.stringify(rewards);
}

// Hàm cập nhật calendar UI
function updateRewardCalendar(lastStreak, currentStreak) {
    const days = document.querySelectorAll('.calendar-day');
    days.forEach(day => {
        const dayNum = parseInt(day.dataset.day);
        day.classList.remove('claimed', 'current');
        
        if (dayNum < currentStreak) {
            day.classList.add('claimed');
        } else if (dayNum === currentStreak) {
            day.classList.add('current');
        }
    });
}

// Hàm nhận thưởng
async function claimDailyReward() {
    const modal = document.getElementById('dailyRewardModal');
    const claimBtn = document.getElementById('claim-daily-reward');
    
    if (!modal.dataset.rewards) return;
    
    claimBtn.disabled = true;
    claimBtn.textContent = 'Đang xử lý...';
    
    try {
        const rewards = JSON.parse(modal.dataset.rewards);
        const currentStreak = calculateStreak();
        
        // Thêm vàng
        player.gold += rewards.gold;
        
        // Thêm vật phẩm vào inventory
        if (rewards.items.length > 0) {
            rewards.items.forEach(item => {
                if (typeof player.inventory !== 'undefined') {
                    player.inventory.push(item);
                }
            });
        }
        
        // Áp dụng buffs
        if (rewards.buffs.length > 0) {
            if (!player.buffs) player.buffs = [];
            rewards.buffs.forEach(buff => {
                const buffData = {
                    ...buff,
                    startTime: Date.now(),
                    endTime: Date.now() + buff.duration
                };
                player.buffs.push(buffData);
                applyBuff(buffData);
            });
        }
        
        // Cập nhật daily reward data
        player.dailyReward.lastClaimDate = new Date().toISOString();
        player.dailyReward.streak = currentStreak;
        player.dailyReward.totalDays += 1;
        
        // Lưu dữ liệu
        if (typeof saveData === 'function') {
            await saveData();
        }
        
        // Hiển thị thông báo
        let rewardText = `🎁 Nhận được ${rewards.gold} vàng`;
        if (rewards.items.length > 0) {
            rewardText += ` + ${rewards.items[0].name}`;
        }
        if (rewards.buffs.length > 0) {
            rewardText += ` + ${rewards.buffs[0].name}`;
        }
        
        if (typeof addNotification === 'function') {
            addNotification(rewardText, 'legendary');
        }
        
        // Cập nhật UI
        if (typeof playerLoadStats === 'function') {
            playerLoadStats();
        }
        
        // Đóng modal sau 1.5 giây
        setTimeout(() => {
            modal.style.display = 'none';
            claimBtn.disabled = false;
            claimBtn.innerHTML = '<i class="fas fa-hand-holding-heart"></i> Nhận Thưởng';
        }, 1500);
        
    } catch (error) {
        console.error('Error claiming daily reward:', error);
        claimBtn.disabled = false;
        claimBtn.innerHTML = '<i class="fas fa-hand-holding-heart"></i> Nhận Thưởng';
    }
}

// Hàm áp dụng buff
function applyBuff(buff) {
    if (!buff || !buff.stat) return;
    
    if (buff.stat === 'all') {
        // Tăng tất cả stats
        const stats = ['atk', 'def', 'vamp', 'critRate'];
        stats.forEach(stat => {
            if (player.bonusStats && typeof player.bonusStats[stat] !== 'undefined') {
                player.bonusStats[stat] += buff.value;
            }
        });
    } else {
        // Tăng stat cụ thể
        if (player.bonusStats && typeof player.bonusStats[buff.stat] !== 'undefined') {
            player.bonusStats[buff.stat] += buff.value;
        }
    }
    
    // Cập nhật stats
    if (typeof playerLoadStats === 'function') {
        playerLoadStats();
    }
}

// Hàm kiểm tra và xóa buffs hết hạn
function checkExpiredBuffs() {
    if (!player.buffs || player.buffs.length === 0) return;
    
    const now = Date.now();
    const expiredBuffs = [];
    
    player.buffs = player.buffs.filter(buff => {
        if (now >= buff.endTime) {
            expiredBuffs.push(buff);
            return false;
        }
        return true;
    });
    
    // Xóa hiệu ứng của buffs hết hạn
    expiredBuffs.forEach(buff => {
        if (buff.stat === 'all') {
            const stats = ['atk', 'def', 'vamp', 'critRate'];
            stats.forEach(stat => {
                if (player.bonusStats && typeof player.bonusStats[stat] !== 'undefined') {
                    player.bonusStats[stat] = Math.max(0, player.bonusStats[stat] - buff.value);
                }
            });
        } else {
            if (player.bonusStats && typeof player.bonusStats[buff.stat] !== 'undefined') {
                player.bonusStats[buff.stat] = Math.max(0, player.bonusStats[buff.stat] - buff.value);
            }
        }
    });
    
    if (expiredBuffs.length > 0) {
        if (typeof playerLoadStats === 'function') {
            playerLoadStats();
        }
        if (typeof saveData === 'function') {
            saveData();
        }
    }
}

// Kiểm tra buffs mỗi phút
setInterval(checkExpiredBuffs, 60000);

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    const claimBtn = document.getElementById('claim-daily-reward');
    if (claimBtn) {
        claimBtn.addEventListener('click', claimDailyReward);
    }
});

// Hàm khởi động daily reward khi load game
function initDailyReward() {
    // Kiểm tra buffs còn hiệu lực
    if (player.buffs && player.buffs.length > 0) {
        checkExpiredBuffs();
    }
    
    // Kiểm tra xem có thể nhận thưởng không
    if (canClaimDailyReward()) {
        // Hiển thị modal sau khi vào game (delay 2 giây)
        setTimeout(() => {
            showDailyRewardModal();
        }, 2000);
    }
}
