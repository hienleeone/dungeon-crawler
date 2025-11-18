# SoulMC Network - Dungeon Crawler!

Trải nghiệm hành trình khám phá hầm ngục kịch tính bất cứ lúc nào chỉ với một cú nhấp chuột!  
Người chơi sẽ bước vào **một hầm ngục ngẫu nhiên** được tạo tự động, tràn ngập quái vật và hệ thống **nhặt trang bị và rất nhiều cấp bậc** cực hấp dẫn!

---

## 🔥 **MỚI! Firebase Integration**

Game đã được nâng cấp với hệ thống lưu trữ cloud và xác thực người dùng!

### ✨ Tính Năng Mới:
- 🔐 **Đăng nhập/Đăng ký** an toàn với Email & Password
- ☁️ **Lưu trữ dữ liệu trên cloud** - không còn lo mất dữ liệu
- 🌍 **Đồng bộ đa thiết bị** - chơi ở đâu cũng được
- 🏆 **Bảng xếp hạng** - Top 3 Vàng, Level, Tầng
- 🛡️ **Chống gian lận** - dữ liệu được bảo vệ bởi Firebase
- 👥 **Tên duy nhất** - không ai có thể trùng tên với bạn

### 📚 Hướng Dẫn Cài Đặt:
1. **Quick Start**: Đọc [QUICKSTART.md](QUICKSTART.md) - Setup trong 10 phút
2. **Chi Tiết**: Đọc [FIREBASE_SETUP.md](FIREBASE_SETUP.md) - Hướng dẫn đầy đủ
3. **So Sánh**: Đọc [COMPARISON.md](COMPARISON.md) - Trước vs Sau Firebase
4. **Testing**: Đọc [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) - Kiểm tra đầy đủ

### ⚡ Bắt Đầu Nhanh:
```bash
# 1. Clone repository
git clone https://github.com/hienleeone/dungeon-crawler.git

# 2. Tạo Firebase project tại https://console.firebase.google.com/

# 3. Cập nhật firebaseConfig trong assets/js/firebase.js

# 4. Mở index.html và chơi!
```

---

## 🕹️ Cơ Chế Trò Chơi

- Lối chơi **roguelite**: Tiến trình sẽ đặt lại khi người chơi chết, nhưng **trang bị vẫn được giữ lại**.  
- Người chơi **thám hiểm hầm ngục bằng cách leo qua các tầng**, nơi chứa các **sự kiện ngẫu nhiên** khác nhau.  
- Khi **lên cấp**, người chơi có thể **nâng chỉ số** bằng cách chọn 1 trong 3 lựa chọn nâng cấp, với **2 lần đổi ngẫu nhiên (reroll)** mỗi cấp.  
- Mỗi nhân vật có **6 ô trang bị** để sử dụng.  
- Có **6 cấp độ hiếm của trang bị**: Thông Thường, Không Thường, Hiếm, Sử Thi, Huyền Thoại và Cổ Vật.

---

## ⚔️ Chỉ Số Trong Trò Chơi

- **HP (Hit Points)** – Lượng sát thương nhân vật có thể chịu trước khi gục ngã.  
- **ATK (Attack)** – Lượng sát thương gây ra khi tấn công.  
- **DEF (Defense)** – Mức giảm sát thương nhận vào khi bị tấn công.  
- **ATK.SPD (Attack Speed)** – Tốc độ ra đòn tấn công mỗi giây.  
- **VAMP (Vampirism)** – Hồi phục một phần máu dựa trên lượng sát thương gây ra.  
- **C.RATE (Crit Rate)** – Tỷ lệ tung ra đòn chí mạng.  
- **C.DMG (Crit Damage)** – Lượng sát thương cộng thêm khi đánh chí mạng.

---

## 🎮 Cách Chơi

### Người Chơi Mới:
1. Mở game → **Đăng ký** tài khoản
2. Nhập tên nhân vật (duy nhất)
3. Phân bổ chỉ số ban đầu
4. Chọn kỹ năng passive
5. Bắt đầu khám phá hầm ngục!

### Người Chơi Cũ:
1. Mở game → **Đăng nhập** với email/password
2. Dữ liệu tự động tải từ cloud
3. Tiếp tục cuộc phiêu lưu!

### Trong Game:
- Click **"Khám Phá"** để di chuyển qua các phòng
- Chiến đấu với quái vật, thu thập vàng và trang bị
- Lên cấp để mạnh hơn
- Mở **Menu** để xem:
  - Thông tin nhân vật
  - Bảng xếp hạng
  - Cài đặt âm thanh
  - Đăng xuất / Xóa dữ liệu

---

## 🏆 Bảng Xếp Hạng

Cạnh tranh với người chơi khác trong 3 hạng mục:
- 💰 **Top Vàng** - Ai giàu nhất?
- ⭐ **Top Level** - Ai mạnh nhất?
- 🎯 **Top Tầng** - Ai đi sâu nhất?

---

## 📁 Cấu Trúc Project

```
dungeon-crawler/
├── index.html                  # Main game file
├── assets/
│   ├── js/
│   │   ├── firebase.js        # 🔥 NEW! Firebase integration
│   │   ├── main.js            # Game logic
│   │   ├── player.js          # Player management
│   │   ├── dungeon.js         # Dungeon generation
│   │   ├── combat.js          # Combat system
│   │   ├── enemy.js           # Enemy AI
│   │   ├── equipment.js       # Equipment system
│   │   └── ...
│   ├── css/
│   │   └── style.css          # Game styling
│   ├── sprites/               # Game graphics
│   ├── sfx/                   # Sound effects
│   └── bgm/                   # Background music
├── QUICKSTART.md              # 🔥 NEW! Quick setup guide
├── FIREBASE_SETUP.md          # 🔥 NEW! Detailed Firebase setup
├── CHANGELOG.md               # 🔥 NEW! Change log
├── COMPARISON.md              # 🔥 NEW! Before vs After
├── TESTING_CHECKLIST.md       # 🔥 NEW! Testing guide
└── README.md                  # This file
```

---

## 🔒 Bảo Mật

- Dữ liệu được bảo vệ bởi **Firebase Security Rules**
- Mỗi người chơi chỉ có thể sửa dữ liệu của mình
- Tên người chơi là duy nhất, không thể trùng lặp
- Xác thực bằng Email/Password qua Firebase Auth

---

## 🎵 Góp Công & Tín Dụng

- [Aekashics](https://aekashics.itch.io/) – Hình ảnh quái vật  
- [Leohpaz](https://leohpaz.itch.io/) – Hiệu ứng âm thanh RPG  
- [phoenix1291](https://phoenix1291.itch.io/sound-effects-pack-2) – Âm thanh khi lên cấp  
- [Leviathan_Music](https://soundcloud.com/leviathan254) – Nhạc chiến đấu  
- [Sara Garrard](https://sonatina.itch.io/letsadventure) – Nhạc nền hầm ngục

---

## 📝 License

MIT License - Xem file LICENSE để biết thêm chi tiết

---

## 🌟 Version

**v2.0.0** - Firebase Integration (2025-11-18)
- Added Firebase Authentication
- Added Cloud Database
- Added Leaderboard
- Added Multi-device sync
- Removed localStorage (security improvement)

**v1.0.0** - Initial Release
- Basic game mechanics
- localStorage save system

---

**Made with ❤️ by SoulMC Network**
