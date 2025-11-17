exports.createPlayer = functions.https.onCall(async (data, context) => {
  if (!context.auth)
    throw new functions.https.HttpsError("unauthenticated", "Bạn chưa đăng nhập.");

  const uid = context.auth.uid;
  const name = data.name;

  if (!name || name.length < 2)
    throw new functions.https.HttpsError("invalid-argument", "Tên không hợp lệ.");

  // Chuẩn data player mới
  const newPlayer = {
    name: name,
    lvl: 1,
    xp: 0,
    gold: 0,
    deaths: 0,
    kills: 0,
    stats: {
      hpMax: 100,
      hp: 100,
      atk: 10,
      def: 5,
      atkSpd: 1,
      critRate: 5,
      critDmg: 50,
      vamp: 0
    },
    inventory: {
      equipment: []
    },
    dungeon: {
      progress: { floor: 1 },
      statistics: { kills: 0 }
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection("players").doc(uid).set(newPlayer, { merge: true });

  return { ok: true, player: newPlayer };
});
