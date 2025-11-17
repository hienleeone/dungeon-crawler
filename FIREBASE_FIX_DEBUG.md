# 🔧 FIREBASE FIX - DEBUGGING GUIDE

## 🐛 Vấn Đề Được Fix

**Lỗi**: `firebase is not defined`

**Nguyên Nhân**: Script loading order - Firebase SDK chưa load xong khi auth.js đã chạy

**Giải Pháp**: 
1. Tăng delay từ 100ms → 500ms
2. Thêm checks `typeof firebase !== 'undefined'` trong tất cả functions
3. Retry logic nếu Firebase chưa ready

---

## 🔍 HOW TO DEBUG

### 1. Check Browser Console (F12)
```
Press F12 → Console tab → Look for errors
```

### 2. Check Firebase Loading
```javascript
// Paste in Console to test
console.log(firebase);
// Should show Firebase object, not undefined
```

### 3. Check if Firebase SDKs are loaded
```javascript
// Paste in Console
console.log(firebase.auth);
console.log(firebase.firestore);
// Both should be functions, not undefined
```

### 4. Check if Config is initialized
```javascript
// Paste in Console
firebase.firestore().collection('test').limit(1).get()
    .then(snap => console.log('Firestore connected:', snap.size >= 0))
    .catch(err => console.error('Error:', err));
```

---

## ✅ CẤP NHẬP ĐƯỢC THỰC HIỆN

### In auth.js:
1. ✅ Increased initialization delay: 100ms → 500ms
2. ✅ Added retry logic for Firebase loading
3. ✅ Added Firebase existence checks in ALL functions:
   - registerUser()
   - loginUser()
   - checkPlayerNameExists()
   - savePlayerNameToFirebase()
   - loadPlayerDataFromFirebase()
   - saveGameDataToFirebase()
   - updatePlayerAllocated()
   - deletePlayerDataFromFirebase()
   - getLeaderboards()

### Example fix applied:
```javascript
// BEFORE (lỗi)
const registerUser = async (email, password) => {
    const result = await firebase.auth().createUserWithEmailAndPassword(email, password);
    ...
}

// AFTER (fix)
const registerUser = async (email, password) => {
    // Check if Firebase is loaded
    if (typeof firebase === 'undefined' || !firebase.auth) {
        showAuthError("Firebase chưa load. Vui lòng làm mới trang!");
        return false;
    }
    
    const result = await firebase.auth().createUserWithEmailAndPassword(email, password);
    ...
}
```

---

## 🧪 TEST STEPS

1. **Open Game**
   - Open `index.html` in browser
   - Check Console (F12) for errors
   - Should see login screen

2. **Click Register**
   - Click "Đăng Ký"
   - Enter email & password
   - Should NOT see "firebase is not defined"

3. **Enter Email & Password**
   - Email: `test@example.com`
   - Password: `password123`
   - Confirm: `password123`

4. **Click Submit**
   - Should create account successfully
   - Should proceed to character creation
   - No errors in console

5. **Check Firebase Console**
   - Go to Firebase Console
   - Check Authentication → Users
   - You should see the new user created

---

## 🚨 IF YOU STILL GET ERROR

### Option 1: Refresh Page
```
Press Ctrl+F5 (Hard Refresh)
```
This clears cache and reloads all scripts.

### Option 2: Check firebase-config.js
```javascript
// Should have your real Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyAW-FtufPxI9mCuZDuTgxRUjHOGtgJ2hgc",
    authDomain: "soulmc-account.firebaseapp.com",
    projectId: "soulmc-account",
    storageBucket: "soulmc-account.firebasestorage.app",
    messagingSenderId: "508725790521",
    appId: "1:508725790521:web:a58b2f0608b028baaccae8",
    measurementId: "G-NW033BL7PW"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
```

### Option 3: Check Script Loading Order
```html
<!-- In index.html, should be in this order -->
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js"></script>
<script src="./assets/js/firebase-config.js"></script>
<!-- auth.js loaded AFTER firebase-config.js -->
```

### Option 4: Wait for Page to Fully Load
- Make sure page is completely loaded before clicking buttons
- Sometimes Firebase takes 1-2 seconds to initialize

---

## 📝 COMMON ERRORS & FIXES

| Error | Cause | Fix |
|-------|-------|-----|
| "firebase is not defined" | Script loading order | Hard refresh (Ctrl+F5) |
| "firebase.auth is not a function" | Auth SDK not loaded | Check script tags in HTML |
| "No project ID in request" | Firebase config wrong | Update firebase-config.js |
| "Access denied" | Firestore rules issue | Check rules in Firebase Console |
| "Email already in use" | Account exists | Use different email |

---

## 📊 FIRESTORE RULES CHECK

Make sure Firestore rules are correctly published:

1. Go to Firebase Console
2. Firestore Database → Rules tab
3. Should see rules for:
   - `gamePlayers`
   - `playernames`
   - `gameStatistics`

If not, copy from `firebase.txt` and publish again.

---

## 🔐 AUTHENTICATION CHECK

Make sure Authentication is enabled:

1. Go to Firebase Console
2. Authentication → Sign-in method
3. Email/Password should be ENABLED (blue toggle)

---

## 💡 TIPS

- **Network Tab**: F12 → Network → Check if Firebase scripts load
- **Console Timing**: F12 → Console → Scripts load order visible
- **Local Storage**: F12 → Application → LocalStorage → Check saved data
- **Firestore Emulator**: For local testing without hitting real database

---

## ✅ AFTER FIXES

All Firebase calls now have proper checks:
```javascript
if (typeof firebase === 'undefined' || !firebase.auth) {
    // Handle error gracefully
    return false;
}
```

This ensures:
✅ Game doesn't crash if Firebase loads late
✅ Clear error messages to user
✅ Better user experience

---

## 🎉 SHOULD BE WORKING NOW

Try registering again:
1. Refresh page (Ctrl+F5)
2. Click "Đăng Ký"
3. Fill in email & password
4. Submit
5. Should see character creation

No more "firebase is not defined" errors!

---

## 📞 STILL HAVING ISSUES?

Check these in order:
1. [ ] Browser console - what's the actual error?
2. [ ] firebase-config.js - is Firebase config correct?
3. [ ] Firebase Console - is project set up?
4. [ ] Firestore Rules - are they published?
5. [ ] Authentication - is Email/Password enabled?
6. [ ] Network Tab - are scripts loading?
7. [ ] Hard Refresh - did you try Ctrl+F5?

---

*Remember: Always check console (F12) first - it tells you exactly what's wrong!*
