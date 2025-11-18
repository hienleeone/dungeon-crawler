# Hướng Dẫn Cấu Hình Firebase cho Dungeon Crawler

## Bước 1: Tạo Project Firebase

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Nhấn "Add project" hoặc "Thêm dự án"
3. Đặt tên cho project (ví dụ: "dungeon-crawler")
4. Làm theo các bước tạo project

## Bước 2: Kích Hoạt Firebase Authentication

1. Trong Firebase Console, chọn project của bạn
2. Vào **Authentication** > **Sign-in method**
3. Kích hoạt **Email/Password**
4. Nhấn Save

## Bước 3: Kích Hoạt Realtime Database

1. Trong Firebase Console, vào **Realtime Database**
2. Nhấn "Create Database"
3. Chọn location gần nhất (ví dụ: Singapore)
4. Chọn "Start in test mode" (chúng ta sẽ cập nhật rules sau)
5. Nhấn Enable

## Bước 4: Cập Nhật Firebase Rules

1. Vào **Realtime Database** > **Rules**
2. Mở file `firebase.rules` trong project
3. Copy toàn bộ nội dung trong file `firebase.rules`
4. Paste vào Firebase Console Rules
5. Nhấn **Publish**

## Bước 5: Lấy Firebase Configuration

1. Trong Firebase Console, nhấn vào biểu tượng **Settings (bánh răng)** > **Project settings**
2. Scroll xuống phần **Your apps**
3. Nhấn vào biểu tượng **Web** (</>)
4. Đặt tên cho app (ví dụ: "Dungeon Crawler Web")
5. Copy phần **firebaseConfig**

## Bước 6: Cập Nhật Firebase Config trong Code

1. Mở file `assets/js/firebase-config.js`
2. Thay thế các giá trị sau bằng thông tin từ Firebase Console:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",              // Thay bằng apiKey của bạn
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

3. Lưu file

## Bước 7: Deploy và Test

1. Upload tất cả files lên web hosting của bạn
2. Truy cập website
3. Thử đăng ký tài khoản mới
4. Kiểm tra Firebase Console để xem dữ liệu

## Cấu Trúc Dữ Liệu trong Firebase

```
dungeon-crawler/
├── players/
│   └── {userId}/
│       ├── playerData (object)
│       ├── dungeonData (object)
│       ├── enemyData (object)
│       └── lastSaved (timestamp)
├── playerNames/
│   └── {playerName}/
│       ├── uid (string)
│       ├── name (string)
│       └── timestamp (number)
└── leaderboard/
    └── {userId}/
        ├── name (string)
        ├── level (number)
        ├── gold (number)
        ├── floor (number)
        └── timestamp (number)
```

## Các Tính Năng Mới

### 1. Hệ Thống Đăng Nhập/Đăng Ký
- Khi vào game, người chơi phải đăng nhập hoặc đăng ký
- Email và mật khẩu được quản lý bởi Firebase Authentication
- Mật khẩu tối thiểu 6 ký tự

### 2. Kiểm Tra Tên Trùng Lặp
- Khi tạo nhân vật, hệ thống sẽ kiểm tra tên đã tồn tại chưa
- Mỗi tên chỉ được sử dụng 1 lần

### 3. Lưu Dữ Liệu Tự Động
- Dữ liệu được lưu vào Firebase mỗi khi có thay đổi
- Auto-save mỗi 30 giây
- Không còn sử dụng localStorage cho dữ liệu game (chống gian lận)

### 4. Menu Mới
- **Đăng Xuất**: Thay thế "Mã Dữ Liệu"
- **Xóa Dữ Liệu**: Thay thế "Xóa Hầm Ngục" - xóa toàn bộ dữ liệu và chơi lại từ đầu
- **Xếp Hạng**: Xem top 3 người chơi (vàng, level, tầng)

### 5. Bảng Xếp Hạng
- Top 3 người chơi có vàng nhiều nhất
- Top 3 người chơi có level cao nhất
- Top 3 người chơi đi được tầng cao nhất
- Cập nhật realtime

## Bảo Mật

- Mỗi người chơi chỉ có thể đọc/ghi dữ liệu của chính họ
- Không thể chỉnh sửa dữ liệu người khác
- Firebase Rules đảm bảo tính toàn vẹn dữ liệu
- LocalStorage chỉ lưu âm lượng (không quan trọng)

## Troubleshooting

### Lỗi: "Firebase is not defined"
- Kiểm tra xem bạn đã load firebase-config.js trước các file khác chưa

### Lỗi: "Permission denied"
- Kiểm tra Firebase Rules đã được cập nhật chưa
- Kiểm tra người dùng đã đăng nhập chưa

### Lỗi: "Invalid email"
- Email phải đúng định dạng (example@email.com)

### Dữ liệu không lưu
- Kiểm tra Firebase Database URL trong config
- Kiểm tra kết nối internet
- Mở Console (F12) để xem lỗi

## Support

Nếu có vấn đề, kiểm tra:
1. Firebase Console > Authentication (xem có user không)
2. Firebase Console > Realtime Database (xem có data không)
3. Browser Console (F12) để xem lỗi JavaScript
