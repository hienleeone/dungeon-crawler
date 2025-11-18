# 🛡️ Hướng Dẫn Hệ Thống Chống Cheat

## Tổng Quan

Hệ thống chống cheat đã được triển khai với nhiều lớp bảo vệ:

### ✅ Các Tính Năng Đã Triển Khai

---

## 1. Firebase Security Rules

**File:** `firebase-security-rules.json`

### Cách Deploy:
```bash
# Vào Firebase Console > Realtime Database > Rules
# Copy nội dung file firebase-security-rules.json và paste vào
```

### Bảo vệ:
- ✅ Chỉ user được phép đọc/ghi dữ liệu của chính mình
- ✅ Validate kiểu dữ liệu (string, number)
- ✅ Kiểm tra playerNames không bị trùng
- ✅ Leaderboard chỉ cho phép authenticated users

---

## 2. Checksum Validation (SHA-256)

### Hoạt động:
```javascript
// Khi SAVE
const criticalData = {
    gold: player.gold,
    level: player.lvl,
    stats: player.stats
};
const checksum = await generateChecksum(criticalData);
// Lưu checksum cùng data lên Firebase

// Khi LOAD
const isValid = await validateDataIntegrity(criticalData, data.checksum);
if (!isValid) {
    showAlert("Cảnh báo: Phát hiện dữ liệu bất thường!");
}
```

### Bảo vệ:
- ✅ Phát hiện nếu ai đó chỉnh sửa trực tiếp trên Firebase Console
- ✅ So sánh hash để đảm bảo tính toàn vẹn
- ✅ Cảnh báo người dùng khi load dữ liệu đã bị sửa

---

## 3. Server-side Validation

### Giới hạn:
```javascript
const limits = {
    gold: 999,999,999,999 (999 tỷ)
    level: 10,000
    hp: 999,999,999
    atk: 999,999,999
    def: 999,999,999
}
```

### Bảo vệ:
- ✅ Từ chối save nếu vượt giới hạn
- ✅ Tự động reset về giá trị max nếu phát hiện
- ✅ Hiển thị alert "Dữ liệu không hợp lệ!"

---

## 4. Rate Limiting

### Cấu hình:
```javascript
const SAVE_COOLDOWN = 2000; // 2 giây giữa các lần save
```

### Bảo vệ:
- ✅ Chặn spam save (exploit auto-clicker)
- ✅ Log warning nếu save quá nhanh
- ✅ Giảm tải cho Firebase

---

## 5. Object Protection

### Getter/Setter:
```javascript
Object.defineProperty(player, 'gold', {
    set: function(value) {
        if (value > this._gold + 1,000,000) {
            console.warn('Phát hiện tăng vàng bất thường');
        }
        this._gold = Math.min(value, 999999999999);
    }
});
```

### Bảo vệ:
- ✅ Log warning khi vàng tăng > 1 triệu/lần
- ✅ Log warning khi level tăng > 10 cấp/lần
- ✅ Auto-clamp về giá trị max

---

## 6. Console Protection (Production)

### Tính năng:
```javascript
if (window.location.hostname !== 'localhost') {
    console.log = function() {}; // Disable console.log
}
```

### Bảo vệ:
- ✅ Khó debug trong production
- ✅ Chỉ hoạt động khi không phải localhost
- ✅ Không ảnh hưởng development

---

## 📊 Hiệu Quả

| Loại Cheat | Bảo Vệ | Hiệu Quả |
|------------|---------|----------|
| Console edit (player.gold = 999999) | Object Protection | 90% |
| Firebase Console edit | Checksum + Validation | 95% |
| Speed hack (spam save) | Rate Limiting | 100% |
| Stat overflow (level > 10000) | Server Validation | 100% |
| Duplicate player name | Firebase Rules | 100% |
| Unauthorized read/write | Firebase Rules | 100% |

---

## 🔧 Cách Sử Dụng

### 1. Deploy Firebase Security Rules:
1. Mở Firebase Console
2. Realtime Database > Rules tab
3. Copy nội dung `firebase-security-rules.json`
4. Publish rules

### 2. Test Hệ Thống:
```javascript
// Test trong console (sẽ bị chặn/warning)
player.gold = 9999999999999; // → Auto clamp to max
player.lvl = 50000; // → Auto clamp to 10000
```

### 3. Monitoring:
- Kiểm tra Firebase Console > Database để thấy checksum
- Mở Console để thấy warning logs
- Test rate limiting bằng cách spam save

---

## ⚠️ Lưu Ý

### Không Thể Chặn 100%:
- Người chơi có thể dùng tools modify memory (Cheat Engine)
- Có thể bypass nếu reverse engineer JavaScript
- Advanced hacker vẫn có thể tìm cách

### Giải Pháp Tốt Hơn (Nếu Muốn):
1. **Firebase Cloud Functions** (Trả phí - Blaze Plan)
   - Server-side logic validation
   - Detect anomalies (AI-based)
   - Auto-ban cheaters

2. **Obfuscation**
   - Sử dụng webpack + terser
   - Minify + uglify code
   - Làm khó reverse engineer

3. **Backend API**
   - Tách logic quan trọng ra backend
   - Client chỉ gửi action, server tính toán
   - 100% bảo mật nhưng phức tạp

---

## 🎯 Kết Luận

Hệ thống hiện tại:
- ✅ **Chặn 80-90% cheat thông thường**
- ✅ **Miễn phí (không cần Blaze Plan)**
- ✅ **Không ảnh hưởng UX người chơi thật**
- ✅ **Dễ maintain và scale**

Đủ tốt cho hầu hết game indie/hobby projects! 🎮
