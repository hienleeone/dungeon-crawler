const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// Validate player data updates
exports.validatePlayerUpdate = functions.firestore
  .document('players/{userId}')
  .onUpdate(async (change, context) => {
    const userId = context.params.userId;
    const oldData = change.before.data();
    const newData = change.after.data();

    // Bỏ qua nếu không có dữ liệu cũ (lần đầu)
    if (!oldData.playerData || !newData.playerData) {
      return null;
    }

    const oldPlayer = oldData.playerData;
    const newPlayer = newData.playerData;

    let violations = [];

    // 1. Kiểm tra level không tăng quá 5 level/lần
    if (newPlayer.lvl > oldPlayer.lvl + 5) {
      violations.push(`Level tăng bất thường: ${oldPlayer.lvl} -> ${newPlayer.lvl}`);
    }

    // 2. Kiểm tra vàng không tăng quá 500k/lần
    const goldIncrease = newPlayer.gold - oldPlayer.gold;
    if (goldIncrease > 500000) {
      violations.push(`Vàng tăng bất thường: +${goldIncrease}`);
    }

    // 3. Kiểm tra timestamp - không cho phép update quá nhanh (spam)
    const now = admin.firestore.Timestamp.now();
    const lastUpdate = oldData.updatedAt || now;
    const timeDiff = now.toMillis() - lastUpdate.toMillis();
    
    if (timeDiff < 1000) { // Không cho update nhanh hơn 1 giây
      violations.push(`Update quá nhanh: ${timeDiff}ms`);
    }

    // 4. Nếu có vi phạm, rollback và log
    if (violations.length > 0) {
      console.warn(`🚨 Phát hiện gian lận từ user ${userId}:`, violations);
      
      // Rollback dữ liệu về trạng thái cũ
      await change.after.ref.set(oldData, { merge: true });
      
      // Log vào collection violations
      await db.collection('violations').add({
        userId: userId,
        violations: violations,
        oldData: {
          lvl: oldPlayer.lvl,
          gold: oldPlayer.gold
        },
        newData: {
          lvl: newPlayer.lvl,
          gold: newPlayer.gold
        },
        timestamp: now,
        action: 'rollback'
      });

      // Kiểm tra số lần vi phạm
      const violationCount = await db.collection('violations')
        .where('userId', '==', userId)
        .where('timestamp', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)) // 24h qua
        .count()
        .get();

      // Nếu vi phạm > 5 lần trong 24h -> Ban
      if (violationCount.data().count >= 5) {
        await db.collection('bannedUsers').doc(userId).set({
          reason: 'Multiple violations detected',
          violations: violationCount.data().count,
          bannedAt: now,
          bannedBy: 'auto-system'
        });
        
        console.error(`❌ Banned user ${userId} - ${violationCount.data().count} violations`);
      }

      return null;
    }

    // 5. Update leaderboards (chỉ khi hợp lệ)
    await updateLeaderboards(userId, newPlayer, newData);

    return null;
  });

// Helper function to update leaderboards
async function updateLeaderboards(userId, player, data) {
  const batch = db.batch();

  // Top gold
  const goldRef = db.collection('leaderboards').doc('gold');
  batch.set(goldRef, {
    [userId]: {
      name: player.name,
      value: player.gold,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    }
  }, { merge: true });

  // Top level
  const levelRef = db.collection('leaderboards').doc('level');
  batch.set(levelRef, {
    [userId]: {
      name: player.name,
      value: player.lvl,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    }
  }, { merge: true });

  // Top floor
  const floorRef = db.collection('leaderboards').doc('floor');
  const floor = data.dungeonData?.progress?.floor || 1;
  batch.set(floorRef, {
    [userId]: {
      name: player.name,
      value: floor,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    }
  }, { merge: true });

  await batch.commit();
}

// Check if user is banned on login
exports.checkBanOnAuth = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const banDoc = await db.collection('bannedUsers').doc(userId).get();

  if (banDoc.exists) {
    const banData = banDoc.data();
    throw new functions.https.HttpsError(
      'permission-denied',
      `Tài khoản đã bị khóa. Lý do: ${banData.reason}`,
      { bannedAt: banData.bannedAt.toDate(), reason: banData.reason }
    );
  }

  return { allowed: true };
});

// Cleanup old violations (chạy hàng ngày)
exports.cleanupOldViolations = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const snapshot = await db.collection('violations')
      .where('timestamp', '<', thirtyDaysAgo)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Đã xóa ${snapshot.size} violations cũ`);
    return null;
  });
