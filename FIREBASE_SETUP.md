# Hướng Dẫn Cấu Hình Firebase

## Bước 1: Cấu hình Firebase Config

Mở file `assets/js/firebase-config.js` và thay thế các giá trị sau bằng thông tin từ Firebase Console của bạn:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

## Bước 2: Kích hoạt Firebase Authentication

1. Vào Firebase Console
2. Chọn **Authentication**
3. Chọn tab **Sign-in method**
4. Kích hoạt **Email/Password**

## Bước 3: Tạo Firestore Database

1. Vào Firebase Console
2. Chọn **Firestore Database**
3. Nhấn **Create database**
4. Chọn **Start in production mode**
5. Chọn location phù hợp

## Bước 4: Cập nhật Firestore Rules

File `firestore.rules` đã được cấu hình sẵn với các rules bảo mật cho game:

- **players**: Lưu trữ dữ liệu game của người chơi (chỉ chủ sở hữu mới đọc/ghi được)
- **playerNames**: Kiểm tra tên trùng lặp
- **leaderboards**: Bảng xếp hạng (public read, chỉ server write)

Copy nội dung file `firestore.rules` và paste vào Firebase Console > Firestore Database > Rules.

## Bước 5: Tạo Indexes (Nếu cần)

Firestore có thể yêu cầu tạo indexes cho queries phức tạp. Nếu có lỗi về indexes khi chạy game, Firebase sẽ cung cấp link để tạo index tự động.

## Các Tính Năng Đã Triển Khai

### 1. Hệ thống đăng nhập/đăng ký
- Đăng nhập bằng Email/Password
- Đăng ký tài khoản mới
- Xác thực người dùng

### 2. Lưu trữ dữ liệu trên Firebase
- Tất cả dữ liệu game được lưu trên Firebase Firestore
- Tự động đồng bộ khi có thay đổi
- Dữ liệu được bảo mật, chỉ chủ sở hữu mới truy cập được

### 3. Kiểm tra tên trùng
- Khi tạo nhân vật, hệ thống kiểm tra tên đã tồn tại chưa
- Không cho phép 2 người chơi có cùng tên

### 4. Bảng xếp hạng
- Top 3 người chơi có số vàng cao nhất
- Top 3 người chơi có level cao nhất
- Top 3 người chơi đi đến tầng cao nhất
- Truy cập qua Menu > Xếp Hạng

### 5. Menu mới
- **Đăng Xuất**: Thay thế "Mã Dữ Liệu"
- **Xóa Dữ Liệu**: Thay thế "Xóa Hầm Ngục", xóa toàn bộ dữ liệu và chơi lại từ đầu

### 6. Bảo mật dữ liệu
- LocalStorage chỉ dùng cho settings âm thanh
- Dữ liệu game chỉ lưu trên Firebase
- Người chơi không thể cheat bằng cách sửa localStorage

## Lưu Ý

- Đảm bảo kết nối Internet để game hoạt động
- Dữ liệu được tự động lưu khi có thay đổi
- Nếu mất kết nối, game vẫn chạy nhưng không lưu được dữ liệu
- Volume settings vẫn lưu ở localStorage (không ảnh hưởng gameplay)

## Troubleshooting

### Lỗi "Permission Denied"
- Kiểm tra Firestore Rules đã được cập nhật chưa
- Đảm bảo người dùng đã đăng nhập

### Không hiển thị bảng xếp hạng
- Cần có ít nhất 1 người chơi có dữ liệu
- Kiểm tra Firestore Rules cho phép đọc collection `leaderboards`

### Lỗi "Name already exists" liên tục
- Xóa collection `players` trong Firestore và thử lại
- Hoặc kiểm tra xem có documents nào bị corrupt không
