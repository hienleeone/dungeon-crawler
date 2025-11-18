# Quick Start - Firebase Setup

## 🚀 Bước 1: Tạo Firebase Project (5 phút)

1. Vào https://console.firebase.google.com/
2. Tạo project mới
3. Bật **Authentication** → Email/Password
4. Bật **Realtime Database** → Test mode
5. Copy Firebase Config

## 📝 Bước 2: Cập Nhật Config (1 phút)

Mở `assets/js/firebase.js` và thay thế:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",                          // ← Thay đổi
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",   // ← Thay đổi
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com", // ← Thay đổi
    projectId: "YOUR_PROJECT_ID",                    // ← Thay đổi
    storageBucket: "YOUR_PROJECT_ID.appspot.com",    // ← Thay đổi
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",   // ← Thay đổi
    appId: "YOUR_APP_ID"                             // ← Thay đổi
};
```

## 🔒 Bước 3: Security Rules (2 phút)

Trong Firebase Console → Realtime Database → Rules, paste:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "playerNames": {
      ".read": true,
      "$playerName": {
        ".write": "!data.exists() || data.val() === auth.uid"
      }
    },
    "leaderboard": {
      ".read": true,
      "$uid": {
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

Nhấn **Publish**

## ✅ Bước 4: Test (2 phút)

1. Mở `index.html` trong browser
2. Đăng ký tài khoản mới
3. Tạo nhân vật
4. Kiểm tra Firebase Console → Realtime Database xem có dữ liệu không

## 🎉 Done!

Game đã sẵn sàng với Firebase!

---

**Xem hướng dẫn chi tiết**: `FIREBASE_SETUP.md`
