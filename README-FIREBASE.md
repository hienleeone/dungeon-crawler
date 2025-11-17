# Dungeon Crawler - Firebase Integration Guide

## Setup hướng dẫn

### 1. Firebase Configuration
Firebase config đã được thêm vào `assets/js/firebase.js`. Config này sử dụng project Firebase:
- **Project ID**: soulmc-account
- **Auth Domain**: soulmc-account.firebaseapp.com

### 2. Deploy Firestore Security Rules

Để deploy Firestore security rules, bạn cần:

1. Install Firebase CLI (nếu chưa có):
   ```bash
   npm install -g firebase-tools
   ```

2. Login vào Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase project (nếu chưa có firebase.json):
   ```bash
   firebase init firestore
   ```

4. Deploy rules từ file `firestore.rules`:
   ```bash
   firebase deploy --only firestore:rules
   ```

### 3. Firestore Database Structure

```
players/
├── {userId}/
│   ├── name: string
│   ├── lvl: number
│   ├── gold: number
│   ├── kills: number
│   ├── deaths: number
│   ├── playtime: number
│   ├── allocated: boolean
│   ├── inCombat: boolean
│   ├── stats: object
│   ├── baseStats: object
│   ├── bonusStats: object
│   ├── equippedStats: object
│   ├── equipped: array
│   ├── inventory: object
│   ├── exp: object
│   ├── skills: array
│   ├── blessing: number
│   ├── tempStats: object
│   ├── dungeon: object
│   ├── volumeSettings: object
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp

chatMessages/
├── {msgId}/
│   ├── userId: string
│   ├── message: string
│   └── timestamp: timestamp

reviews/
├── {reviewId}/
│   ├── email: string
│   ├── ingame: string
│   ├── rating: number
│   ├── comment: string
│   └── timestamp: timestamp
```

### 4. Security Rules Features

Các rule này bảo vệ game khỏi cheating:

- **Player Name**: Kiểm tra trùng tên qua query `checkPlayerNameExists()`
- **Level**: Giới hạn tối đa 500, chỉ được tăng max 5 level mỗi lần update
- **Gold**: Chỉ được tăng, không được giảm, max tăng 1M mỗi lần update
- **Data Validation**: Kiểm tra tất cả dữ liệu bắt buộc khi tạo/update
- **User Privacy**: Người chơi chỉ có thể edit dữ liệu của chính họ
- **Public Leaderboard**: Bất kỳ người dùng nào cũng có thể xem leaderboard

### 5. Auto-save Feature

Game tự động save dữ liệu lên Firebase mỗi 30 giây (có thể điều chỉnh trong `firebase.js`).

### 6. Features

✅ **Authentication**:
- Login/Register với email & password
- Auto-login nếu đã đăng nhập trước đó
- Logout & Session management

✅ **Player Data**:
- Lưu tất cả dữ liệu người chơi trên Firebase
- Chỉ người chơi có thể edit dữ liệu của họ
- Auto-save mỗi 30 giây

✅ **Anti-Cheat**:
- Validation rules trên server side
- Giới hạn tăng level & gold
- Check tên người chơi không trùng

✅ **Leaderboard**:
- Top 3 vàng cao nhất
- Top 3 level cao nhất
- Top 3 tầng đạt được cao nhất

✅ **Menu Features**:
- "Đăng Xuất" - logout
- "Xóa Dữ Liệu" - delete character & chơi lại từ đầu
- "Xếp Hạng" - xem leaderboard

### 7. Testing

Bạn có thể test các features:

1. **Login/Register**: Tạo tài khoản mới hoặc login
2. **Character Creation**: Nhập tên & kiểm tra trùng
3. **Auto-save**: Edit dữ liệu & check Firebase console
4. **Leaderboard**: Chơi game & check xếp hạng
5. **Logout**: Test logout & login lại

### 8. Important Notes

⚠️ **Các điều cần lưu ý**:

- Firebase config là public (API key) - điều này bình thường cho web apps
- Security rules trên server sẽ bảo vệ dữ liệu
- Mỗi người chơi phải có email duy nhất
- Tên người chơi cũng phải duy nhất
- Auto-save chỉ hoạt động khi người chơi đã login
- Volume settings được lưu tập trung vào player data

### 9. Troubleshooting

**Lỗi**: "firebase is not defined"
- Check lại thứ tự load script trong `index.html`
- Đảm bảo `firebase.js` được load trước các script khác

**Lỗi**: "Kiểm tra tên thất bại"
- Check lại Firestore rules & index
- Đảm bảo có Internet connection

**Dữ liệu không save**
- Check console.log trong browser
- Check Firestore trong Firebase Console
- Đảm bảo người chơi đã login

---

## File Structure

```
assets/
├── js/
│   ├── firebase.js      # Firebase config & functions
│   ├── auth.js          # Authentication UI & logic
│   ├── leaderboard.js   # Leaderboard display
│   ├── main.js          # Game logic (modified)
│   ├── player.js        # Player stats (modified)
│   ├── dungeon.js       # Dungeon logic (modified)
│   ├── music.js         # Music & volume (modified)
│   └── ...
└── css/
    └── style.css        # Added leaderboard styles

firestore.rules          # Firestore security rules
README-FIREBASE.md       # This file
```
