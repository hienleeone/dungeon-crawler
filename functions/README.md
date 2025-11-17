# Cloud Functions for Dungeon Crawler

Secure server-side functions to prevent client-side cheating (gold/level manipulation).

## Setup & Deployment

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Initialize Firebase Functions (if not already done)
```bash
firebase init functions
```

### 3. Deploy Functions
Navigate to your Firebase project directory and run:
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### 4. Update Firestore Rules
After deploying, update `firestore.rules` to restrict direct client updates:

```firestore
match /players/{userId} {
    // Read: allow authenticated users
    allow read: if request.auth != null;

    // Create: allow user to create their own document
    allow create: if request.auth != null && request.auth.uid == userId;

    // Update: DENY direct updates (only Cloud Functions can update)
    allow update: if false;

    // Delete: DENY
    allow delete: if false;
}
```

Then deploy rules:
```bash
firebase deploy --only firestore:rules
```

## Usage in Client Code

Instead of direct Firestore updates, call these Cloud Functions:

### Add Gold (from quest rewards, enemy drops)
```javascript
const addGold = firebase.functions().httpsCallable('addGold');
addGold({ amount: 500 })
    .then(result => {
        console.log('Gold added:', result.data.newGold);
    })
    .catch(error => {
        console.error('Error:', error.message);
    });
```

### Add Level (from leveling up)
```javascript
const addLevel = firebase.functions().httpsCallable('addLevel');
addLevel({ amount: 1 })
    .then(result => {
        console.log('Level increased:', result.data.newLevel);
    })
    .catch(error => {
        console.error('Error:', error.message);
    });
```

### Spend Gold (buying items, upgrades)
```javascript
const spendGold = firebase.functions().httpsCallable('spendGold');
spendGold({ amount: 100 })
    .then(result => {
        console.log('Gold spent, remaining:', result.data.newGold);
    })
    .catch(error => {
        console.error('Error:', error.message);
    });
```

## Function Limits

- **addGold**: Max 1,000,000 per call; total cap 100,000,000
- **addLevel**: Max 5 levels per call; total cap 500
- **spendGold**: Validates sufficient gold before spending

## Security Features

✅ User authentication required  
✅ Ownership validation (only own document)  
✅ Amount validation & limits  
✅ Server-side timestamp  
✅ Prevents direct console manipulation  
✅ Prevents decreasing level  
✅ Prevents arbitrary gold values  

## Next Steps

1. Deploy this function to Firebase
2. Update `firestore.rules` to deny direct updates
3. Update game code to call these functions instead of `updatePlayerData()`
4. Test by trying to manipulate gold/level in console (should fail)
