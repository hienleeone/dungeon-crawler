# Hướng Dẫn Cài Đặt Firebase cho Dungeon Crawler

## Bước 1: Tạo Dự Án Firebase

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Đăng nhập bằng tài khoản Google của bạn
3. Nhấp vào "Add project" hoặc "Thêm dự án"
4. Đặt tên dự án (ví dụ: "dungeon-crawler-game")
5. Tắt Google Analytics (không bắt buộc cho dự án này)
6. Nhấp "Create project"

## Bước 2: Kích Hoạt Authentication

1. Trong Firebase Console, chọn dự án vừa tạo
2. Vào menu bên trái, chọn **Build** > **Authentication**
3. Nhấp "Get started"
4. Chọn tab "Sign-in method"
5. Nhấp vào "Email/Password"
6. Bật tùy chọn "Enable"
7. Nhấp "Save"

## Bước 3: Kích Hoạt Realtime Database

1. Vào menu bên trái, chọn **Build** > **Realtime Database**
2. Nhấp "Create Database"
3. Chọn vị trí server (khuyến nghị: **us-central1** hoặc **asia-southeast1** cho khu vực Việt Nam)
4. Chọn **Start in test mode** (để test, sau này sẽ cấu hình bảo mật)
5. Nhấp "Enable"

## Bước 4: Cấu Hình Security Rules

Sau khi tạo database, cập nhật **Rules** như sau:

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

Giải thích:
- **users**: Mỗi người chỉ có thể đọc/ghi dữ liệu của chính họ
- **playerNames**: Mọi người có thể đọc để kiểm tra tên trùng, nhưng chỉ có thể tạo tên mới hoặc cập nhật tên của mình
- **leaderboard**: Mọi người có thể xem bảng xếp hạng, nhưng chỉ có thể cập nhật điểm của mình

## Bước 5: Lấy Firebase Configuration

1. Vào **Project Overview** (biểu tượng bánh răng) > **Project settings**
2. Cuộn xuống phần "Your apps"
3. Nhấp vào biểu tượng **Web** (`</>`)
4. Đặt tên app (ví dụ: "Dungeon Crawler Web")
5. **KHÔNG** chọn "Also set up Firebase Hosting"
6. Nhấp "Register app"
7. Sao chép phần **firebaseConfig**

## Bước 6: Cập Nhật Code

Mở file `assets/js/firebase.js` và thay thế các giá trị trong `firebaseConfig`:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

**Lưu ý quan trọng:** Thay thế TẤT CẢ các giá trị `YOUR_...` bằng giá trị thực tế từ Firebase Console.

## Bước 7: Test Hệ Thống

1. Mở file `index.html` trong trình duyệt
2. Bạn sẽ thấy giao diện đăng nhập
3. Thử đăng ký tài khoản mới
4. Đăng nhập và tạo nhân vật
5. Kiểm tra dữ liệu trong Firebase Console > Realtime Database

## Bước 8: Cấu Hình Bảo Mật Nâng Cao (Khuyến Nghị)

### Email Verification (Xác thực Email)

Nếu muốn bắt buộc người dùng xác thực email:

1. Vào **Authentication** > **Templates**
2. Tùy chỉnh template "Email address verification"
3. Thêm code sau vào `firebase.js` trong hàm `registerUser`:

```javascript
await userCredential.user.sendEmailVerification();
```

### Password Reset (Đặt Lại Mật Khẩu)

Để cho phép người dùng đặt lại mật khẩu, thêm chức năng này vào giao diện đăng nhập.

## Các Tính Năng Đã Triển Khai

✅ Đăng ký/Đăng nhập bằng Email/Password
✅ Lưu trữ dữ liệu game trên Firebase Realtime Database
✅ Kiểm tra tên người chơi trùng lặp
✅ Đăng xuất
✅ Xóa toàn bộ dữ liệu game
✅ Bảng xếp hạng (Top 3):
   - Vàng cao nhất
   - Level cao nhất  
   - Tầng cao nhất
✅ Tự động lưu mỗi 30 giây
✅ Lưu khi đóng trang

## Cấu Trúc Dữ Liệu Firebase

```
firebase-database/
├── users/
│   └── {userId}/
│       ├── playerData (JSON string)
│       ├── dungeonData (JSON string)
│       ├── enemyData (JSON string)
│       ├── volumeData (JSON string)
│       └── lastUpdated (timestamp)
├── playerNames/
│   └── {playerName}: {userId}
└── leaderboard/
    └── {userId}/
        ├── name
        ├── gold
        ├── level
        ├── floor
        └── lastUpdated
```

## Troubleshooting (Xử Lý Lỗi)

### Lỗi: "Firebase not defined"
- Kiểm tra đã thêm Firebase SDK vào `index.html` chưa
- Đảm bảo thứ tự script đúng (Firebase SDK trước `firebase.js`)

### Lỗi: "Permission denied"
- Kiểm tra Security Rules trong Firebase Console
- Đảm bảo người dùng đã đăng nhập

### Lỗi: "Failed to load resource"
- Kiểm tra `databaseURL` trong config có đúng không
- Đảm bảo Realtime Database đã được kích hoạt

### Dữ liệu không lưu
- Mở Console trong trình duyệt (F12) để xem lỗi
- Kiểm tra kết nối internet
- Kiểm tra Security Rules

## Lưu Ý Quan Trọng

⚠️ **Bảo mật API Key**: Mặc dù API Key được công khai trong code, Firebase vẫn an toàn nhờ Security Rules. Tuy nhiên:
- Nên giới hạn domain được phép sử dụng API Key trong Firebase Console
- Vào **Project Settings** > **General** > cuộn xuống **Public settings** > thêm domain của bạn

⚠️ **Quota miễn phí**: Firebase Spark (Free plan) có giới hạn:
- 100 kết nối đồng thời
- 1GB dữ liệu lưu trữ
- 10GB/tháng data transfer
- Nếu vượt quá, cần nâng cấp lên Blaze plan (trả theo usage)

⚠️ **Backup**: Nên thường xuyên backup dữ liệu từ Firebase Console

## Hỗ Trợ

Nếu gặp vấn đề, tham khảo:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Authentication Guide](https://firebase.google.com/docs/auth)
- [Realtime Database Guide](https://firebase.google.com/docs/database)
