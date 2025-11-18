# 🔥 Firebase Integration - Chi Tiết Kỹ Thuật

## Kiến Trúc Hệ Thống

```
┌─────────────────┐
│   Web Browser   │
│  (index.html)   │
└────────┬────────┘
         │
         ├─── firebase.js (Auth & Database)
         │
         ├─── main.js (Game Logic)
         │
         ├─── player.js (Player Data)
         │
         └─── dungeon.js (Dungeon Data)
              │
              ▼
    ┌──────────────────┐
    │  Firebase Cloud  │
    ├──────────────────┤
    │  Authentication  │
    │  Realtime DB     │
    └──────────────────┘
```

## Flow Chart - Đăng Ký

```
User clicks "Đăng Ký"
    │
    ├─► Fill Email, Password, Confirm Password
    │
    ├─► Submit Form
    │
    ├─► firebase.js: registerUser()
    │       │
    │       ├─► Validate password match
    │       ├─► Firebase Auth: createUserWithEmailAndPassword()
    │       └─► Success → isNewUser = true
    │
    ├─► Hide login screen
    │
    └─► Show character creation screen
```

## Flow Chart - Tạo Nhân Vật

```
User enters name
    │
    ├─► Validate format (no special chars, 3-15 length)
    │
    ├─► firebase.js: checkPlayerNameExists(name)
    │       │
    │       ├─► Query: database.ref('playerNames/' + name)
    │       └─► Return true if exists
    │
    ├─► If exists → Show "Đã có người sử dụng tên này!"
    │
    ├─► If unique → Create player object
    │       │
    │       ├─► Set player.name, stats, etc.
    │       └─► firebase.js: registerPlayerName(name)
    │               │
    │               └─► database.ref('playerNames/' + name).set(userId)
    │
    └─► Show stat allocation screen
```

## Flow Chart - Đăng Nhập

```
User clicks "Đăng Nhập"
    │
    ├─► Fill Email, Password
    │
    ├─► Submit Form
    │
    ├─► firebase.js: loginUser(email, password)
    │       │
    │       ├─► Firebase Auth: signInWithEmailAndPassword()
    │       │
    │       ├─► Success → currentUser = user
    │       │
    │       └─► firebase.js: loadPlayerData()
    │               │
    │               ├─► Query: database.ref('users/' + userId)
    │               │
    │               ├─► Parse playerData, dungeonData, enemyData, volumeData
    │               │
    │               └─► Set global variables: player, dungeon, enemy, volume
    │
    ├─► Hide login screen
    │
    └─► Show title screen or dungeon (based on player.allocated)
```

## Flow Chart - Auto Save

```
Every 30 seconds OR window closes
    │
    ├─► Check if user is logged in
    │
    ├─► firebase.js: savePlayerData()
    │       │
    │       ├─► Stringify: player, dungeon, enemy, volume
    │       │
    │       ├─► database.ref('users/' + userId).set({
    │       │       playerData, dungeonData, enemyData, volumeData, lastUpdated
    │       │   })
    │       │
    │       └─► firebase.js: updateLeaderboard()
    │               │
    │               └─► database.ref('leaderboard/' + userId).set({
    │                       name, gold, level, floor, lastUpdated
    │                   })
    │
    └─► Continue game
```

## Database Structure Detailed

### users/{userId}
```json
{
  "users": {
    "abc123xyz": {
      "playerData": "{\"name\":\"Hero\",\"lvl\":10,\"gold\":5000,...}",
      "dungeonData": "{\"floor\":5,\"room\":3,...}",
      "enemyData": "{\"name\":\"Goblin\",...}",
      "volumeData": "{\"master\":1,\"bgm\":0.4,...}",
      "lastUpdated": 1700000000000
    }
  }
}
```

### playerNames/{name}
```json
{
  "playerNames": {
    "Hero": "abc123xyz",
    "DragonSlayer": "def456uvw",
    "MagicKnight": "ghi789rst"
  }
}
```

### leaderboard/{userId}
```json
{
  "leaderboard": {
    "abc123xyz": {
      "name": "Hero",
      "gold": 5000,
      "level": 10,
      "floor": 5,
      "lastUpdated": 1700000000000
    },
    "def456uvw": {
      "name": "DragonSlayer",
      "gold": 10000,
      "level": 15,
      "floor": 8,
      "lastUpdated": 1700000001000
    }
  }
}
```

## Security Rules Explained

```json
{
  "rules": {
    // users node
    "users": {
      "$uid": {
        // Chỉ user có uid này mới đọc được
        ".read": "$uid === auth.uid",
        
        // Chỉ user có uid này mới ghi được
        ".write": "$uid === auth.uid"
      }
    },
    
    // playerNames node
    "playerNames": {
      // Mọi người đều đọc được (để check tên trùng)
      ".read": true,
      
      "$playerName": {
        // Chỉ được tạo tên mới HOẶC cập nhật tên của mình
        ".write": "!data.exists() || data.val() === auth.uid"
      }
    },
    
    // leaderboard node
    "leaderboard": {
      // Mọi người đều đọc được (để xem bảng xếp hạng)
      ".read": true,
      
      "$uid": {
        // Chỉ user có uid này mới cập nhật được
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

## Function Reference

### Authentication Functions

#### registerUser(email, password, confirmPassword)
**Purpose**: Đăng ký tài khoản mới  
**Input**: 
- `email` (string) - Email người dùng
- `password` (string) - Mật khẩu
- `confirmPassword` (string) - Xác nhận mật khẩu

**Process**:
1. Validate mật khẩu khớp
2. Validate độ dài mật khẩu >= 6
3. Call Firebase Auth: `createUserWithEmailAndPassword()`
4. Set `currentUser` và `isNewUser = true`

**Return**: `true` nếu thành công, `false` nếu lỗi

---

#### loginUser(email, password)
**Purpose**: Đăng nhập vào tài khoản  
**Input**:
- `email` (string) - Email người dùng
- `password` (string) - Mật khẩu

**Process**:
1. Call Firebase Auth: `signInWithEmailAndPassword()`
2. Set `currentUser`
3. Call `loadPlayerData()` để tải dữ liệu

**Return**: `true` nếu thành công, `false` nếu lỗi

---

#### logoutUser()
**Purpose**: Đăng xuất khỏi tài khoản  
**Process**:
1. Call `savePlayerData()` để lưu trước khi logout
2. Call Firebase Auth: `signOut()`
3. Reset `currentUser`, `player`, `dungeon`, `enemy` = null
4. Show login screen

**Return**: `true` nếu thành công, `false` nếu lỗi

---

### Database Functions

#### savePlayerData()
**Purpose**: Lưu toàn bộ dữ liệu game lên Firebase  
**Process**:
1. Stringify: `player`, `dungeon`, `enemy`, `volume`
2. Write to `users/{userId}` với `lastUpdated` timestamp
3. Call `updateLeaderboard()` để cập nhật bảng xếp hạng

**Auto-called**: 
- Mỗi 30 giây (setInterval)
- Khi window close (beforeunload)
- Khi user action (tạo nhân vật, etc.)

---

#### loadPlayerData()
**Purpose**: Tải dữ liệu game từ Firebase  
**Process**:
1. Query `users/{userId}`
2. Parse JSON strings → objects
3. Set global variables: `player`, `dungeon`, `enemy`, `volume`
4. Set `isNewUser = false` nếu có dữ liệu

**Auto-called**: Khi đăng nhập thành công

---

#### deleteAllGameData()
**Purpose**: Xóa toàn bộ dữ liệu game  
**Process**:
1. Remove player name từ `playerNames/{name}`
2. Remove user data từ `users/{userId}`
3. Remove leaderboard entry từ `leaderboard/{userId}`
4. Reset local variables: `player`, `dungeon`, `enemy` = null
5. Set `isNewUser = true`

**Return**: `true` nếu thành công, `false` nếu lỗi

---

### Player Name Functions

#### checkPlayerNameExists(playerName)
**Purpose**: Kiểm tra tên có bị trùng không  
**Input**: `playerName` (string)  
**Process**:
1. Query `playerNames/{playerName}`
2. Check `.exists()`

**Return**: `true` nếu tên đã tồn tại, `false` nếu chưa

---

#### registerPlayerName(playerName)
**Purpose**: Đăng ký tên người chơi  
**Input**: `playerName` (string)  
**Process**:
1. Write `playerNames/{playerName} = userId`

**Return**: `true` nếu thành công, `false` nếu lỗi

---

#### removePlayerName(playerName)
**Purpose**: Xóa tên người chơi (khi xóa dữ liệu)  
**Input**: `playerName` (string)  
**Process**:
1. Remove `playerNames/{playerName}`

**Return**: `true` nếu thành công, `false` nếu lỗi

---

### Leaderboard Functions

#### updateLeaderboard()
**Purpose**: Cập nhật bảng xếp hạng  
**Process**:
1. Extract: `name`, `gold`, `level`, `floor` từ player/dungeon
2. Write to `leaderboard/{userId}` với `lastUpdated`

**Auto-called**: Mỗi lần `savePlayerData()`

---

#### getTopGoldPlayers()
**Purpose**: Lấy top 3 người chơi có vàng cao nhất  
**Process**:
1. Query `leaderboard` orderBy `gold` limit 3
2. Sort descending (latest first)

**Return**: Array of `{name, gold, level, floor}` (max 3 items)

---

#### getTopLevelPlayers()
**Purpose**: Lấy top 3 người chơi có level cao nhất  
**Process**:
1. Query `leaderboard` orderBy `level` limit 3
2. Sort descending

**Return**: Array of `{name, gold, level, floor}` (max 3 items)

---

#### getTopFloorPlayers()
**Purpose**: Lấy top 3 người chơi đi sâu nhất  
**Process**:
1. Query `leaderboard` orderBy `floor` limit 3
2. Sort descending

**Return**: Array of `{name, gold, level, floor}` (max 3 items)

---

## Error Handling

### Authentication Errors
```javascript
auth/email-already-in-use → "Email này đã được sử dụng!"
auth/invalid-email → "Email không hợp lệ!"
auth/weak-password → "Mật khẩu quá yếu!"
auth/user-not-found → "Tài khoản không tồn tại!"
auth/wrong-password → "Mật khẩu không đúng!"
```

### Database Errors
```javascript
PERMISSION_DENIED → Check Security Rules
NETWORK_ERROR → Check internet connection
INVALID_DATA → Check data format
```

## Performance Optimization

### Caching
- Player data được cache trong RAM sau khi load
- Không query Firebase mỗi lần cần data
- Chỉ save/load khi cần thiết

### Batching
- Auto-save mỗi 30 giây thay vì realtime
- Leaderboard update cùng lúc với save
- Minimize database writes

### Indexing
- Leaderboard indexed by `gold`, `level`, `floor`
- playerNames indexed by name
- Fast query performance

## Limitations & Future Improvements

### Current Limitations
- Client-side game logic → có thể hack
- No email verification
- No password reset
- Leaderboard chỉ top 3
- No social features

### Future Improvements
- [ ] Firebase Cloud Functions để validate game logic
- [ ] Email verification
- [ ] Password reset functionality
- [ ] Extended leaderboard (top 10, top 100)
- [ ] Friends list
- [ ] In-game chat
- [ ] Real-time multiplayer
- [ ] Achievements system
- [ ] Daily rewards
- [ ] Events & tournaments

---

**Happy Coding! 🚀**
