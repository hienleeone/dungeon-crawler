// Firebase Database Operations

// Check if player name is already taken
const checkPlayerNameExists = async (playerName) => {
    try {
        const snapshot = await db.collection('players')
            .where('name', '==', playerName)
            .get();
        
        return !snapshot.empty;
    } catch (error) {
        console.error("Error checking player name:", error);
        return false;
    }
};

// Save player data to Firebase
const savePlayerToFirebase = async (userId) => {
    if (!currentUser) {
        console.error("No user logged in!");
        return false;
    }
    
    try {
        const playerData = {
            name: player.name,
            lvl: player.lvl,
            stats: player.stats,
            baseStats: player.baseStats,
            equippedStats: player.equippedStats,
            bonusStats: player.bonusStats,
            exp: player.exp,
            inventory: player.inventory,
            equipped: player.equipped,
            gold: player.gold,
            playtime: player.playtime,
            kills: player.kills,
            deaths: player.deaths,
            inCombat: player.inCombat,
            allocated: player.allocated || false,
            blessing: player.blessing || 0,
            skills: player.skills || "",
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('players').doc(userId).set(playerData, { merge: true });
        
        // Update leaderboards
        await updateLeaderboards(userId, player.name, player.gold, player.lvl);
        
        return true;
    } catch (error) {
        console.error("Error saving player to Firebase:", error);
        return false;
    }
};

// Load player data from Firebase
const loadPlayerFromFirebase = async (userId) => {
    try {
        const doc = await db.collection('players').doc(userId).get();
        
        if (doc.exists) {
            const data = doc.data();
            player = {
                name: data.name,
                lvl: data.lvl,
                stats: data.stats,
                baseStats: data.baseStats,
                equippedStats: data.equippedStats,
                bonusStats: data.bonusStats,
                exp: data.exp,
                inventory: data.inventory,
                equipped: data.equipped,
                gold: Number(data.gold) || 0,
                playtime: data.playtime,
                kills: data.kills,
                deaths: data.deaths,
                inCombat: data.inCombat,
                allocated: data.allocated || false,
                blessing: data.blessing || 0,
                skills: data.skills || ""
            };
            
            // Also save to localStorage as backup (but Firebase is source of truth)
            localStorage.setItem("playerData", JSON.stringify(player));
            
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error("Error loading player from Firebase:", error);
        return false;
    }
};

// Save dungeon data to Firebase
const saveDungeonToFirebase = async (userId) => {
    if (!currentUser || !dungeon) {
        return false;
    }
    
    try {
        const dungeonData = {
            settings: dungeon.settings,
            statistics: dungeon.statistics,
            currentFloor: dungeon.currentFloor || 1,
            currentRoom: dungeon.currentRoom || 1,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('players').doc(userId).collection('dungeon').doc('current').set(dungeonData);
        
        // Update max floor in leaderboard if higher
        if (dungeon.statistics && dungeon.statistics.maxFloor) {
            await updateMaxFloor(userId, player.name, dungeon.statistics.maxFloor);
        }
        
        return true;
    } catch (error) {
        console.error("Error saving dungeon to Firebase:", error);
        return false;
    }
};

// Load dungeon data from Firebase
const loadDungeonFromFirebase = async (userId) => {
    try {
        const doc = await db.collection('players').doc(userId).collection('dungeon').doc('current').get();
        
        if (doc.exists) {
            const data = doc.data();
            dungeon = {
                settings: data.settings,
                statistics: data.statistics,
                currentFloor: data.currentFloor || 1,
                currentRoom: data.currentRoom || 1
            };
            
            localStorage.setItem("dungeonData", JSON.stringify(dungeon));
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error("Error loading dungeon from Firebase:", error);
        return false;
    }
};

// Update leaderboards
const updateLeaderboards = async (userId, playerName, gold, level) => {
    try {
        await db.collection('leaderboards').doc('gold').collection('rankings').doc(userId).set({
            name: playerName,
            value: gold,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await db.collection('leaderboards').doc('level').collection('rankings').doc(userId).set({
            name: playerName,
            value: level,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error updating leaderboards:", error);
    }
};

// Update max floor in leaderboard
const updateMaxFloor = async (userId, playerName, maxFloor) => {
    try {
        const doc = await db.collection('leaderboards').doc('floor').collection('rankings').doc(userId).get();
        
        if (!doc.exists || doc.data().value < maxFloor) {
            await db.collection('leaderboards').doc('floor').collection('rankings').doc(userId).set({
                name: playerName,
                value: maxFloor,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error("Error updating max floor:", error);
    }
};

// Get top rankings
const getTopRankings = async (type, limit = 3) => {
    try {
        const snapshot = await db.collection('leaderboards')
            .doc(type)
            .collection('rankings')
            .orderBy('value', 'desc')
            .limit(limit)
            .get();
        
        const rankings = [];
        snapshot.forEach(doc => {
            rankings.push({
                name: doc.data().name,
                value: doc.data().value
            });
        });
        
        return rankings;
    } catch (error) {
        console.error(`Error getting ${type} rankings:`, error);
        return [];
    }
};

// Delete all player data (reset game)
const deletePlayerData = async (userId) => {
    if (!currentUser) {
        return false;
    }
    
    try {
        // Delete dungeon data
        await db.collection('players').doc(userId).collection('dungeon').doc('current').delete();
        
        // Delete player data
        await db.collection('players').doc(userId).delete();
        
        // Delete from leaderboards
        await db.collection('leaderboards').doc('gold').collection('rankings').doc(userId).delete();
        await db.collection('leaderboards').doc('level').collection('rankings').doc(userId).delete();
        await db.collection('leaderboards').doc('floor').collection('rankings').doc(userId).delete();
        
        // Clear local data
        player = null;
        dungeon = null;
        enemy = null;
        localStorage.removeItem("playerData");
        localStorage.removeItem("dungeonData");
        localStorage.removeItem("enemyData");
        
        return true;
    } catch (error) {
        console.error("Error deleting player data:", error);
        return false;
    }
};

// Override the original saveData function to use Firebase
const saveData = async () => {
    if (!currentUser) {
        console.warn("Not logged in, cannot save to Firebase");
        return;
    }
    
    // Save to Firebase (primary storage)
    await savePlayerToFirebase(currentUser.uid);
    
    if (dungeon) {
        await saveDungeonToFirebase(currentUser.uid);
    }
    
    // Also save enemy data to localStorage (temporary, for combat)
    if (enemy) {
        const enemyData = JSON.stringify(enemy);
        localStorage.setItem("enemyData", enemyData);
    }
    
    // Save volume to localStorage (local preference)
    if (typeof volume !== 'undefined') {
        const volumeData = JSON.stringify(volume);
        localStorage.setItem("volumeData", volumeData);
    }
};
