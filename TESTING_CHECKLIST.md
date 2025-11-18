# ✅ Firebase Setup & Testing Checklist

Sử dụng checklist này để đảm bảo mọi thứ được cài đặt đúng cách.

---

## 📋 PHẦN 1: FIREBASE SETUP

### 1.1 Tạo Firebase Project
- [ ] Đã truy cập https://console.firebase.google.com/
- [ ] Đã đăng nhập Google Account
- [ ] Đã tạo project mới
- [ ] Đã đặt tên project (ví dụ: "dungeon-crawler-game")

### 1.2 Kích Hoạt Authentication
- [ ] Đã vào **Build** → **Authentication**
- [ ] Đã click "Get started"
- [ ] Đã vào tab "Sign-in method"
- [ ] Đã bật "Email/Password"
- [ ] Đã click "Save"

### 1.3 Kích Hoạt Realtime Database
- [ ] Đã vào **Build** → **Realtime Database**
- [ ] Đã click "Create Database"
- [ ] Đã chọn vị trí server (khuyến nghị: asia-southeast1)
- [ ] Đã chọn "Start in test mode"
- [ ] Đã click "Enable"

### 1.4 Cấu Hình Security Rules
- [ ] Đã vào **Realtime Database** → tab **Rules**
- [ ] Đã copy rules từ FIREBASE_SETUP.md
- [ ] Đã paste vào editor
- [ ] Đã click "Publish"
- [ ] Rules có 3 sections: users, playerNames, leaderboard

### 1.5 Lấy Firebase Config
- [ ] Đã vào **Project Overview** (icon bánh răng) → **Project settings**
- [ ] Đã cuộn xuống "Your apps"
- [ ] Đã click icon Web (`</>`)
- [ ] Đã đặt tên app (ví dụ: "Dungeon Crawler Web")
- [ ] Đã click "Register app"
- [ ] Đã copy toàn bộ firebaseConfig object

### 1.6 Cập Nhật Code
- [ ] Đã mở file `assets/js/firebase.js`
- [ ] Đã tìm `const firebaseConfig = {...}`
- [ ] Đã thay thế TẤT CẢ giá trị YOUR_... bằng giá trị thực
- [ ] Đã kiểm tra lại apiKey, authDomain, databaseURL, projectId, appId

---

## 🧪 PHẦN 2: TESTING CƠ BẢN

### 2.1 Load Game
- [ ] Mở `index.html` trong browser (Chrome/Firefox khuyến nghị)
- [ ] Thấy màn hình đăng nhập (không có lỗi console)
- [ ] Firebase SDK đã load (check Network tab)

### 2.2 Đăng Ký Tài Khoản
- [ ] Click nút "Đăng Ký"
- [ ] Thấy form đăng ký (Email, Password, Confirm Password)
- [ ] Nhập email: test@example.com
- [ ] Nhập password: 123456
- [ ] Nhập confirm password: 654321 (khác nhau)
- [ ] Thấy lỗi "Mật khẩu không khớp!"
- [ ] Nhập confirm password: 123456 (giống nhau)
- [ ] Click "Đồng Ý"
- [ ] Đăng ký thành công, chuyển sang màn hình tạo tên

### 2.3 Kiểm Tra Firebase Console
- [ ] Mở Firebase Console
- [ ] Vào **Authentication** → tab **Users**
- [ ] Thấy user vừa tạo (test@example.com)

### 2.4 Tạo Nhân Vật
- [ ] Nhập tên: "H@ck3r" (có ký tự đặc biệt)
- [ ] Thấy lỗi "Tên của bạn không được chứa ký tự đặc biệt!"
- [ ] Nhập tên: "AB" (quá ngắn)
- [ ] Thấy lỗi "Tên phải dài từ 3-15 ký tự!"
- [ ] Nhập tên: "TestHero123"
- [ ] Click "Đồng Ý"
- [ ] Chuyển sang màn hình "Nhấn để khám phá hầm ngục"
- [ ] Click màn hình
- [ ] Thấy màn hình phân bổ stats

### 2.5 Kiểm Tra playerNames trong Firebase
- [ ] Mở Firebase Console → Realtime Database
- [ ] Thấy node `playerNames`
- [ ] Thấy `playerNames/TestHero123 = {userId}`

### 2.6 Phân Bổ Stats & Vào Game
- [ ] Phân bổ điểm (HP, ATK, DEF, ATK.SPD)
- [ ] Chọn passive skill
- [ ] Click "Tiến Hành"
- [ ] Vào game thành công
- [ ] Thấy tên nhân vật, stats, gold, exp

### 2.7 Kiểm Tra Dữ Liệu Đã Lưu
- [ ] Mở Firebase Console → Realtime Database
- [ ] Thấy node `users/{userId}`
- [ ] Thấy playerData, dungeonData, volumeData
- [ ] Click vào playerData, thấy JSON string

### 2.8 Gameplay
- [ ] Click "Khám Phá"
- [ ] Thấy log dungeon (entering room, enemy, etc.)
- [ ] Gặp enemy, vào combat
- [ ] Đánh enemy, thấy HP giảm
- [ ] Giết enemy, nhận exp và gold
- [ ] Level up (nếu đủ exp)

### 2.9 Auto-Save
- [ ] Chơi game 30 giây
- [ ] Mở Firebase Console → Realtime Database
- [ ] Refresh page
- [ ] Thấy `lastUpdated` timestamp cập nhật
- [ ] Thấy playerData thay đổi (gold, exp, level)

---

## 🏆 PHẦN 3: TESTING NÂNG CAO

### 3.1 Leaderboard
- [ ] Mở Menu → Click "Xếp Hạng"
- [ ] Thấy bảng xếp hạng
- [ ] Nếu chỉ 1 người chơi, thấy 1 entry
- [ ] Kiểm tra Firebase Console → node `leaderboard`
- [ ] Thấy `leaderboard/{userId}` với name, gold, level, floor

### 3.2 Đăng Xuất
- [ ] Mở Menu → Click "Đăng Xuất"
- [ ] Thấy popup xác nhận
- [ ] Click "Đồng Ý"
- [ ] Quay về màn hình đăng nhập
- [ ] Dữ liệu đã được lưu (check Firebase Console)

### 3.3 Đăng Nhập Lại
- [ ] Nhập email: test@example.com
- [ ] Nhập password: 123456
- [ ] Click "Đăng Nhập"
- [ ] Dữ liệu đã được load (kiểm tra gold, level)
- [ ] Nhân vật vẫn ở đúng vị trí (floor, room)

### 3.4 Kiểm Tra Tên Trùng Lặp
- [ ] Đăng xuất
- [ ] Đăng ký tài khoản mới: test2@example.com / 123456
- [ ] Nhập tên: "TestHero123" (tên đã tồn tại)
- [ ] Thấy lỗi "Đã có người sử dụng tên này!"
- [ ] Nhập tên: "AnotherHero"
- [ ] Tạo nhân vật thành công

### 3.5 Leaderboard với Nhiều Người
- [ ] Chơi với account thứ 2, kiếm gold
- [ ] Mở Menu → "Xếp Hạng"
- [ ] Thấy 2 người chơi trong bảng xếp hạng
- [ ] Người có gold cao hơn nằm trên

### 3.6 Xóa Dữ Liệu
- [ ] Mở Menu → Click "Xóa Dữ Liệu"
- [ ] Thấy popup cảnh báo "Hành động này không thể hoàn tác!"
- [ ] Click "Đồng Ý"
- [ ] Quay về màn hình tạo tên
- [ ] Kiểm tra Firebase Console:
  - [ ] Node `users/{userId}` đã bị xóa
  - [ ] Node `playerNames/AnotherHero` đã bị xóa
  - [ ] Node `leaderboard/{userId}` đã bị xóa

### 3.7 Multi-Device Sync
- [ ] Đăng nhập trên Device A (Chrome)
- [ ] Chơi game, kiếm gold
- [ ] Đợi 30 giây (auto-save)
- [ ] Mở Device B (Firefox hoặc incognito)
- [ ] Đăng nhập cùng account
- [ ] Thấy dữ liệu giống Device A (gold, level, floor)
- [ ] Chơi trên Device B, kiếm thêm gold
- [ ] Refresh Device A
- [ ] **Lưu ý**: Firebase không real-time sync tự động, cần refresh

---

## 🔒 PHẦN 4: SECURITY TESTING

### 4.1 Unauthorized Access
- [ ] Đăng nhập với Account A
- [ ] Copy userId của Account A (từ Firebase Console)
- [ ] Đăng xuất
- [ ] Đăng nhập với Account B
- [ ] Mở Console (F12)
- [ ] Try: `database.ref('users/{userIdA}').set({...})`
- [ ] Thấy lỗi "PERMISSION_DENIED"
- [ ] ✅ Security works!

### 4.2 PlayerNames Protection
- [ ] Đăng nhập với Account B
- [ ] Mở Console (F12)
- [ ] Try: `database.ref('playerNames/TestHero123').set('myUserId')`
- [ ] Thấy lỗi "PERMISSION_DENIED" (tên đã tồn tại, không sở hữu)
- [ ] ✅ Security works!

### 4.3 Leaderboard Protection
- [ ] Đăng nhập với Account B
- [ ] Mở Console (F12)
- [ ] Try: `database.ref('leaderboard/{userIdA}').set({gold: 999999})`
- [ ] Thấy lỗi "PERMISSION_DENIED"
- [ ] ✅ Security works!

---

## 🐛 PHẦN 5: ERROR HANDLING

### 5.1 Network Error
- [ ] Tắt internet
- [ ] Try đăng nhập
- [ ] Thấy lỗi (Firebase timeout)
- [ ] Bật lại internet
- [ ] Đăng nhập thành công

### 5.2 Invalid Email
- [ ] Nhập email: "notanemail"
- [ ] Try đăng ký
- [ ] Thấy lỗi "Email không hợp lệ!"

### 5.3 Weak Password
- [ ] Nhập email: valid@email.com
- [ ] Nhập password: "123" (< 6 chars)
- [ ] Try đăng ký
- [ ] Thấy lỗi "Mật khẩu phải có ít nhất 6 ký tự!"

### 5.4 Wrong Password
- [ ] Try đăng nhập với password sai
- [ ] Thấy lỗi "Mật khẩu không đúng!"

### 5.5 User Not Found
- [ ] Try đăng nhập với email không tồn tại
- [ ] Thấy lỗi "Tài khoản không tồn tại!"

---

## 📊 PHẦN 6: PERFORMANCE

### 6.1 Initial Load
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Đo thời gian từ load page → thấy login screen
- [ ] Nên < 3 giây

### 6.2 Login Time
- [ ] Đo thời gian từ click "Đăng Nhập" → vào game
- [ ] Nên < 2 giây

### 6.3 Auto-Save Performance
- [ ] Chơi game trong lúc auto-save
- [ ] Không thấy lag/freeze
- [ ] Game vẫn chạy mượt

### 6.4 Leaderboard Load
- [ ] Đo thời gian từ click "Xếp Hạng" → hiển thị data
- [ ] Nên < 1 giây

---

## ✅ FINAL CHECKLIST

### Tất Cả Đã Hoàn Thành?
- [ ] ✅ Firebase project đã tạo
- [ ] ✅ Authentication đã bật
- [ ] ✅ Realtime Database đã bật
- [ ] ✅ Security Rules đã cập nhật
- [ ] ✅ firebaseConfig đã cập nhật trong code
- [ ] ✅ Đăng ký tài khoản thành công
- [ ] ✅ Tạo nhân vật thành công
- [ ] ✅ Kiểm tra tên trùng lặp hoạt động
- [ ] ✅ Vào game và chơi được
- [ ] ✅ Auto-save hoạt động (30s)
- [ ] ✅ Đăng xuất thành công
- [ ] ✅ Đăng nhập lại, data đã load
- [ ] ✅ Leaderboard hiển thị đúng
- [ ] ✅ Xóa dữ liệu hoạt động
- [ ] ✅ Multi-device sync (sau refresh)
- [ ] ✅ Security rules hoạt động (unauthorized access bị chặn)
- [ ] ✅ Error handling đúng
- [ ] ✅ Performance ổn định

---

## 🎉 KẾT QUẢ

### Nếu tất cả đều ✅:
**CHÚC MỪNG! Game đã sẵn sàng để chơi!** 🎮

### Nếu có lỗi:
1. Check Console (F12) để xem error message
2. Xem `FIREBASE_SETUP.md` phần Troubleshooting
3. Kiểm tra lại từng bước trong checklist
4. Đảm bảo firebaseConfig đúng 100%
5. Đảm bảo Security Rules đã publish

---

**Good luck & Have fun! 🚀**
