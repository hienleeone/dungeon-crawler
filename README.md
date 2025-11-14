# Dungeon Crawler Firebase Login System

## 1. Cấu hình Firebase
Mở `assets/js/firebase-init.js` và thay:
```
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
};
```

## 2. Bật Authentication
Firebase Console → Authentication → Sign-in Methods → bật Email/Password.

## 3. Bật Firestore Database
Firebase Console → Firestore → Create Database.

## 4. Rules mẫu (cho dev)
```
service cloud.firestore {
  match /databases/{database}/documents {
    match /players/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## 5. Chức năng
- Login / Register email & password
- Tự mirror dữ liệu Firestore vào localStorage
- Tự redirect giữa login ↔ game
- Nút Logout có popup xác nhận
