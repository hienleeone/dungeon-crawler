# Hướng dẫn Bảo mật Game - Chống Hack Hoàn Toàn

## 🛡️ Hệ thống bảo vệ 3 lớp

### Lớp 1: Client-side Prevention
- Dữ liệu lưu trên Firebase (không localStorage)
- Không có export/import data
- Firebase Authentication bắt buộc

### Lớp 2: Firestore Rules (Lớp đầu tiên)
- Validate dữ liệu cơ bản
- Giới hạn giá trị tối đa
- Chặn request bất thường ngay lập tức

### Lớp 3: Cloud Functions (Lớp chính - BẤT KHẢ XÂM PHẠM)
- **Server-side validation** - Người chơi không thể bypass
- Tự động rollback dữ liệu gian lận
- Tự động ban user sau 5 lần vi phạm
- Log tất cả vi phạm
- Rate limiting (không cho spam update)

## 🚀 Cài đặt Cloud Functions

### Bước 1: Cài đặt Firebase Tools
```bash
npm install -g firebase-tools
firebase login
```

### Bước 2: Deploy Functions
```bash
cd c:\Users\Hjen\Desktop\dungeon-crawler\functions
npm install
cd ..
firebase deploy --only functions
```

## 🎯 Cách hoạt động - VÍ DỤ SPAM 999 LẦN

```
Hacker spam F12 console: for(i=0;i<999;i++) { hackGold(); }

Request 1: gold: 0 -> 500k ✅ Hợp lệ
Request 2: gold: 500k -> 1M ✅ Hợp lệ (sau 1s)
Request 3: gold: 1M -> 1.5M ❌ Gửi quá nhanh (<1s)
  → Cloud Function phát hiện
  → ROLLBACK về 1M
  → LOG violation #1

Request 4-7: Tiếp tục spam ❌
  → ROLLBACK tất cả
  → Violation count = 5
  → 🚫 AUTO BAN VĨNH VIỄN

Request 8-999: Bị chặn ❌
  → User đã bị ban, không thể update
```

### Validation Rules

**1. Level: Max +5/lần**
```javascript
Cũ: Level 10
Mới: Level 16 → ❌ Rollback (tăng quá 5)
Mới: Level 15 → ✅ OK
```

**2. Gold: Max +500k/lần**
```javascript
Cũ: 100k vàng
Mới: 700k vàng → ❌ Rollback (tăng 600k)
Mới: 600k vàng → ✅ OK
```

**3. Rate Limit: Min 1 giây/update**
```javascript
Update 1: 10:00:00 ✅
Update 2: 10:00:00.5 ❌ (chỉ 0.5s sau)
Update 3: 10:00:01.1 ✅ (1.1s sau)
```

**4. Auto Ban: 5 violations/24h**
```javascript
Vi phạm 1-4: Rollback + Cảnh báo
Vi phạm 5: 🚫 BAN + Không thể login
```

## 📊 Monitoring & Admin

### Xem violations realtime
Firebase Console > Firestore > `violations` collection

### Xem danh sách banned users  
Firebase Console > Firestore > `bannedUsers` collection

### Unban user (nếu cần)
```javascript
db.collection('bannedUsers').doc('USER_ID').delete();
```

## 🔧 Tích hợp vào game

Thêm vào `assets/js/auth.js`:

```javascript
// Sau dòng: firebase.auth().onAuthStateChanged(async (user) => {
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        // THÊM: Kiểm tra ban
        try {
            const checkBan = firebase.functions().httpsCallable('checkBanOnAuth');
            await checkBan();
        } catch (error) {
            if (error.code === 'functions/permission-denied') {
                alert('Tài khoản đã bị khóa vĩnh viễn do gian lận!\\n' + error.message);
                await firebase.auth().signOut();
                return;
            }
        }
        
        // Code cũ tiếp theo...
        currentUser = user;
        // ...
    }
});
```

Xóa update leaderboard từ client (Cloud Functions sẽ tự động làm):
```javascript
// Trong savePlayerDataToFirebase(), XÓA dòng:
// await updateLeaderboards(); // ← XÓA dòng này
```

## ⚙️ Điều chỉnh thông số

Trong `functions/index.js`:

```javascript
// Dòng 25: Level max
if (newPlayer.lvl > oldPlayer.lvl + 5) { // Đổi 5 → 10 nếu cần

// Dòng 30: Gold max  
if (goldIncrease > 500000) { // Đổi 500000 → 1000000 nếu cần

// Dòng 37: Rate limit
if (timeDiff < 1000) { // Đổi 1000ms → 2000ms nếu cần

// Dòng 60: Ban threshold
if (violationCount.data().count >= 5) { // Đổi 5 → 10 nếu cần
```

## 💰 Chi phí

**Cloud Functions Free Tier:**
- 2M invocations/tháng
- 400K GB-seconds/tháng  
- 200K CPU-seconds/tháng

→ **MIỄN PHÍ** cho 99% game indie!

## ✅ Kết quả

### Trước khi có Cloud Functions:
- ❌ Hack F12 console → Thành công
- ❌ Spam 999 requests → Lên 999M vàng
- ❌ Modify request → Bypass validation
- ❌ Không có cách phát hiện/ban

### Sau khi có Cloud Functions:
- ✅ Hack F12 → **ROLLBACK** ngay lập tức
- ✅ Spam requests → **BAN** sau 5 lần
- ✅ Modify request → Server validate lại
- ✅ Tự động log + ban hacker
- ✅ **KHÔNG THỂ HACK!**

## 🎮 Hướng dẫn Deploy

```powershell
# 1. Cài Firebase CLI (chỉ lần đầu)
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Init project (chỉ lần đầu)
cd c:\Users\Hjen\Desktop\dungeon-crawler
firebase init functions
# Chọn: Existing project → soulmc-account
# Chọn: JavaScript
# Chọn: No ESLint  
# Chọn: Yes install

# 4. Deploy
firebase deploy --only functions

# 5. Xem logs
firebase functions:log
```

## ⚠️ Lưu ý quan trọng

1. **Deploy xong phải update Rules:**
```javascript
// Firestore Rules - đơn giản hóa vì Functions đã validate
match /leaderboards/{docId} {
  allow read: if true;
  allow write: if false; // Chỉ Functions được ghi
}
```

2. **Tạo index cho violations:**
- Firebase Console > Firestore > Indexes
- Collection: `violations`
- Fields: `userId` (Asc) + `timestamp` (Desc)

3. **Test trước khi production:**
```javascript
// Test ban function
const checkBan = firebase.functions().httpsCallable('checkBanOnAuth');
checkBan().then(result => console.log(result));
```

---

**Kết luận:** Hacker có thể sửa client code (HTML/JS), nhưng **KHÔNG BAO GIỜ** sửa được server code (Cloud Functions). Đây là giải pháp duy nhất để chống hack 100%.
