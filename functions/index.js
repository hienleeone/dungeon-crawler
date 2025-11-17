const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

/**
 * Callable Cloud Function to safely increase player gold.
 * Only allows increases up to 1,000,000 per call.
 * Validates that the player exists and the amount is reasonable.
 */
exports.addGold = functions.https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const amount = data.amount;

    // Validate amount
    if (typeof amount !== 'number' || amount < 0 || amount > 1000000) {
        throw new functions.https.HttpsError('invalid-argument', 'Amount must be a number between 0 and 1,000,000');
    }

    try {
        // Get current player document
        const playerRef = db.collection('players').doc(userId);
        const playerDoc = await playerRef.get();

        if (!playerDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Player document not found');
        }

        const currentGold = playerDoc.data().gold || 0;
        const newGold = currentGold + amount;

        // Cap max gold at 100,000,000 (safety limit)
        if (newGold > 100000000) {
            throw new functions.https.HttpsError('invalid-argument', 'Gold would exceed maximum limit');
        }

        // Update with server timestamp
        await playerRef.update({
            gold: newGold,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            success: true,
            newGold: newGold,
            message: `Added ${amount} gold. New total: ${newGold}`
        };
    } catch (error) {
        console.error('Error in addGold:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Callable Cloud Function to safely increase player level.
 * Only allows increases up to 5 levels per call.
 * Validates that the player exists and the amount is reasonable.
 */
exports.addLevel = functions.https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const amount = data.amount;

    // Validate amount
    if (typeof amount !== 'number' || amount < 0 || amount > 5) {
        throw new functions.https.HttpsError('invalid-argument', 'Amount must be a number between 0 and 5');
    }

    try {
        // Get current player document
        const playerRef = db.collection('players').doc(userId);
        const playerDoc = await playerRef.get();

        if (!playerDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Player document not found');
        }

        const currentLevel = playerDoc.data().lvl || 1;
        const newLevel = currentLevel + amount;

        // Cap max level at 500
        if (newLevel > 500) {
            throw new functions.https.HttpsError('invalid-argument', 'Level would exceed maximum (500)');
        }

        // Update with server timestamp
        await playerRef.update({
            lvl: newLevel,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            success: true,
            newLevel: newLevel,
            message: `Added ${amount} level(s). New level: ${newLevel}`
        };
    } catch (error) {
        console.error('Error in addLevel:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Callable Cloud Function to spend gold (decrease).
 * Validates that player has enough gold.
 */
exports.spendGold = functions.https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const amount = data.amount;

    // Validate amount
    if (typeof amount !== 'number' || amount < 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Amount must be a non-negative number');
    }

    try {
        // Get current player document
        const playerRef = db.collection('players').doc(userId);
        const playerDoc = await playerRef.get();

        if (!playerDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Player document not found');
        }

        const currentGold = playerDoc.data().gold || 0;

        if (currentGold < amount) {
            throw new functions.https.HttpsError('invalid-argument', `Not enough gold. Have: ${currentGold}, Need: ${amount}`);
        }

        const newGold = currentGold - amount;

        // Update with server timestamp
        await playerRef.update({
            gold: newGold,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            success: true,
            newGold: newGold,
            message: `Spent ${amount} gold. Remaining: ${newGold}`
        };
    } catch (error) {
        console.error('Error in spendGold:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
