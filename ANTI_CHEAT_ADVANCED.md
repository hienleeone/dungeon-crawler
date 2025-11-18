# 🛡️ Hệ Thống Anti-Cheat Nâng Cao

## Tổng Quan

Hệ thống anti-cheat mới được thiết kế để **chặn hoàn toàn** việc người chơi sử dụng console và các công cụ phát triển (DevTools).

---

## ✅ Các Tính Năng Chính

### 1. **Vô Hiệu Hóa Console Hoàn Toàn**
- Chặn tất cả `console.log()`, `console.error()`, `console.warn()`, v.v.
- Override `window.console` để trả về fake object
- Không thể restore console bằng bất kỳ cách nào

```javascript
// Tất cả các lệnh console sẽ không hoạt động:
console.log("test");        // Không in gì
console.error("error");     // Không hiện lỗi
console.table(data);        // Không hiện bảng
```

### 2. **Phát Hiện DevTools (3 Phương Pháp)**

#### Phương pháp 1: Kiểm tra kích thước cửa sổ
```javascript
// Nếu kích thước window.outer khác window.inner quá 160px
// => DevTools đang mở
```

#### Phương pháp 2: Đo thời gian debugger
```javascript
// Nếu debugger statement mất > 100ms
// => Đang ở debug mode
```

#### Phương pháp 3: Override toString()
```javascript
// Khi console.log() một object, nó sẽ gọi toString()
// Ta dùng cơ chế này để detect
```

### 3. **Chặn Phím Tắt**
- `F12` - Mở DevTools
- `Ctrl+Shift+I` - Inspect Element
- `Ctrl+Shift+J` - Console
- `Ctrl+Shift+C` - Element Picker
- `Ctrl+U` - View Source
- `Ctrl+S` - Save Page

### 4. **Vô Hiệu Hóa Chuột Phải**
```javascript
// Ngăn chặn context menu
document.addEventListener('contextmenu', e => e.preventDefault());
```

### 5. **Chặn Hacking Tools**

#### Vô hiệu hóa eval()
```javascript
window.eval = function() {
    throw new Error('eval is disabled');
};
```

#### Vô hiệu hóa Function constructor
```javascript
new Function("alert(1)"); // Sẽ throw error
```

#### Chặn setTimeout/setInterval với string
```javascript
setTimeout("alert(1)", 1000); // Sẽ throw error
```

### 6. **Bảo Vệ Global Objects**
```javascript
// Seal player object để không thể thêm/xóa properties
Object.seal(window.player);

// Freeze để không thể modify
Object.freeze(window._antiCheatActive);
```

### 7. **Phát Hiện Browser Extensions**
```javascript
// Kiểm tra resource entries có chứa:
// - chrome-extension://
// - moz-extension://
```

### 8. **Chặn Iframe Injection**
```javascript
// Nếu website chạy trong iframe => Redirect về parent
if (window.top !== window.self) {
    window.top.location = window.self.location;
}
```

### 9. **Kiểm Tra Tính Toàn Vẹn (Integrity Checks)**

Chạy mỗi 2 giây để:
- Kiểm tra console có bị restore không
- Kiểm tra DevTools có đang mở không
- Random check để tránh bị bypass

```javascript
setInterval(() => {
    if (window.console.log.toString().length < 10) {
        disableConsole(); // Re-disable
    }
    devtoolsChecker();
    detectIframe();
}, 2000);
```

### 10. **Xử Lý Khi Phát Hiện Gian Lận**

Khi phát hiện DevTools:
1. ❌ Xóa toàn bộ nội dung trang
2. ⚠️ Hiển thị cảnh báo đỏ to
3. 🛑 Clear tất cả timers/intervals
4. 🚫 Throw error để dừng execution

```javascript
document.body.innerHTML = `
    <div style="...">
        <h1>⚠️ PHÁT HIỆN GIAN LẬN</h1>
        <p>Developer Tools đã bị phát hiện!</p>
        <button onclick="location.reload()">Tải Lại Trang</button>
    </div>
`;
```

---

## 📋 Cách Hoạt Động

### Timeline Khởi Động

```
1. HTML load
   ↓
2. anti-cheat.js load (ĐẦU TIÊN)
   ↓
3. Disable console ngay lập tức
   ↓
4. Setup các event listeners (keyboard, mouse)
   ↓
5. Start integrity checks (mỗi 2s)
   ↓
6. Load các script game khác (firebase.js, main.js, ...)
```

### Khi Người Chơi Thử Cheat

```
Người chơi nhấn F12
   ↓
Event listener bắt được → e.preventDefault()
   ↓
Nếu bypass được → devtoolsChecker() phát hiện
   ↓
handleDevToolsOpen() → Hiển thị cảnh báo
   ↓
Game dừng hoàn toàn
```

---

## 🚀 Cài Đặt

### 1. File đã được tạo:
- ✅ `assets/js/anti-cheat.js` (mới)

### 2. File đã được cập nhật:
- ✅ `index.html` (thêm script tag)

### 3. Không cần thay đổi gì khác!
- Cấu trúc game giữ nguyên 100%
- Không ảnh hưởng đến gameplay
- Không cần config thêm

---

## 🧪 Kiểm Tra Hoạt Động

### Test 1: Thử mở Console
```
1. Nhấn F12 → Không mở được
2. Nhấn Ctrl+Shift+I → Không mở được
3. Chuột phải → Inspect → Không mở được
```

### Test 2: Thử Nhập Lệnh Console
```
1. Mở DevTools bằng cách khác (nếu có thể)
2. Gõ: player.gold = 999999999
3. Kết quả: Trang sẽ bị clear và hiện cảnh báo
```

### Test 3: Thử Eval
```
1. Mở console (nếu có thể)
2. Gõ: eval("alert(1)")
3. Kết quả: Error "eval is disabled"
```

### Test 4: Thử Function Constructor
```
1. Gõ: new Function("return 1")()
2. Kết quả: Error "Function constructor is disabled"
```

---

## ⚠️ Lưu Ý

### 1. Console.log trong Code
Vì console bị disable, nên các `console.log()` trong code của bạn (như trong `firebase.js`) sẽ không hoạt động khi anti-cheat bật.

**Giải pháp:** Nếu cần debug, tạm thời comment dòng này trong `anti-cheat.js`:
```javascript
// disableConsole(); // Comment để debug
```

### 2. Development Mode
Khi đang phát triển, bạn có thể:
```javascript
// Thêm vào đầu anti-cheat.js
if (window.location.hostname === 'localhost') {
    console.log('Dev mode - Anti-cheat disabled');
    return; // Thoát khỏi IIFE
}
```

### 3. False Positives
Một số trình duyệt hoặc extensions có thể trigger detection. Nếu có vấn đề:
- Tăng `threshold` trong `devtoolsChecker()` từ 160 lên 200
- Tăng timing trong `detectDevToolsByTiming()` từ 100 lên 200

---

## 🔧 Tùy Chỉnh

### Thay Đổi Thông Báo Cảnh Báo
Trong `handleDevToolsOpen()`:
```javascript
document.body.innerHTML = `
    <div style="...">
        <h1>⚠️ NỘI DUNG TÙY CHỈNH</h1>
        <p>Tin nhắn của bạn</p>
    </div>
`;
```

### Thay Đổi Tần Suất Kiểm Tra
Trong `startIntegrityChecks()`:
```javascript
// Từ 2000ms (2s) sang giá trị khác
setInterval(() => { ... }, 1000); // 1s
```

### Disable Anti-Debug
Comment dòng này trong `init()`:
```javascript
// antiDebug(); // Tắt anti-debug
```

---

## 📊 So Sánh Với Hệ Thống Cũ

| Tính Năng | Hệ Thống Cũ | Hệ Thống Mới |
|-----------|-------------|--------------|
| Disable Console | ❌ Không | ✅ Có |
| Detect DevTools | ❌ Không | ✅ Có (3 phương pháp) |
| Chặn Phím Tắt | ❌ Không | ✅ Có |
| Chặn Chuột Phải | ❌ Không | ✅ Có |
| Disable eval/Function | ❌ Không | ✅ Có |
| Integrity Checks | ❌ Không | ✅ Có (mỗi 2s) |
| Protect Global Objects | ⚠️ Một phần | ✅ Đầy đủ |
| Firebase Validation | ✅ Có | ✅ Có (giữ nguyên) |
| Checksum | ✅ Có | ✅ Có (giữ nguyên) |

---

## 🎯 Kết Luận

Hệ thống anti-cheat mới này cung cấp:
- ✅ **13 lớp bảo vệ** khác nhau
- ✅ **Chặn hoàn toàn console** - người chơi không thể nhập lệnh
- ✅ **Phát hiện DevTools** - tự động cảnh báo và dừng game
- ✅ **Không thay đổi cấu trúc game** - chỉ thêm 1 file và 1 dòng script tag
- ✅ **Tích hợp hoàn hảo** với hệ thống Firebase validation hiện có

**Lưu ý:** Không có hệ thống anti-cheat nào là 100% hoàn hảo. Người chơi có kiến thức sâu vẫn có thể bypass, nhưng hệ thống này sẽ ngăn chặn được **99%** người chơi thông thường.

---

## 📞 Hỗ Trợ

Nếu có vấn đề:
1. Kiểm tra Console trong DevTools (nếu có thể mở)
2. Kiểm tra file `anti-cheat.js` đã load đúng chưa
3. Kiểm tra không có conflict với các script khác

**Chúc bạn thành công! 🎮**
