# ⚗️ CHEMQUEST
### *Học Hóa Học Vừa Chơi Vừa Học*

<div align="center">

![ChemQuest Banner](https://img.shields.io/badge/CHEMQUEST-HÓA%20HỌC%2011-00D9FF?style=for-the-badge&logo=atom&logoColor=white)
![Version](https://img.shields.io/badge/version-2.0.0-D946EF?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-CCFF00?style=for-the-badge)

**🔗 [Chơi ngay →](https://chemquest-game.vercel.app)**

</div>

---

## 🎮 Giới thiệu

**ChemQuest** là game luyện tập Hóa học lớp 11 theo phong cách **Cyberpunk Neon** — kết hợp học thuật và giải trí. Được thiết kế để giúp học sinh ôn tập hiệu quả thông qua hệ thống điểm thưởng, streak bonus và hiệu ứng âm thanh sống động.

> *"Không còn học Hóa nhàm chán — mỗi câu đúng là một màn pháo hoa!"*

---

## ✨ Tính năng nổi bật

### 🧪 Nội dung học tập
| Chương | Nội dung | Số câu |
|--------|----------|--------|
| 📘 Chương 1 | Cân Bằng Hóa Học | 36 câu |
| 📗 Chương 2 | Nitrogen & Sulfur | 32 câu |
| 📙 Chương 3 | Hóa Học Hữu Cơ | 37 câu |
| **Tổng** | **3 chương · 4 dạng câu** | **112 câu** |

### 🎯 4 Dạng câu hỏi
- **📝 Trắc nghiệm ABCD** — chọn 1 trong 4 đáp án
- **⚖️ Đúng / Sai** — đánh giá 4 phát biểu độc lập
- **✏️ Điền từ** — tự nhập câu trả lời (có ví dụ gợi ý)
- **🔗 Nối cột** — kéo nối Cột A với Cột B

### 🔥 Hệ thống Streak Bonus
```
Streak ×3  →  +5%  điểm mỗi câu  🔥
Streak ×5  →  +15% điểm mỗi câu  🔥🔥
Streak ×10 →  +20% điểm mỗi câu  🔥🔥🔥 INFERNO
```

### 🎵 Âm thanh Cinematic
Toàn bộ âm thanh được tạo bằng **Web Audio API** — không cần tải file:
- 🎹 Click cơ học | ✅ Đúng vui | ❌ Sai cyberpunk
- ⏱ Hết giờ dramatic | 💥 Fanfare INFERNO hoành tráng

### 💥 Hiệu ứng Animation
- Pháo hoa nhiều đợt khi đúng
- Màn hình rung + glitch khi sai
- +XP nổi lên sau mỗi câu
- Milestone popup khi đạt streak
- Chuyển cảnh wipe laser giữa các câu
- Shimmer & neon glow trên mọi element

---

## 📱 Responsive Design

| Thiết bị | Giao diện |
|----------|-----------|
| 💻 Desktop | Sidebar thống kê bên phải |
| 📱 Mobile | Thanh compact timer + combo |

---

## 🚀 Cài đặt & Chạy local

### Yêu cầu
- Node.js v18+
- npm v10+

### Các bước

```bash
# 1. Clone repo
git clone https://github.com/Foxkun-dev/chemquest.git
cd chemquest

# 2. Cài dependencies
npm install

# 3. Chạy development
npm start
# → Mở http://localhost:3000

# 4. Build production
npm run build
```

---

## 🛠️ Tech Stack

```
Frontend    React 19 + Web Audio API
Styling     Inline CSS + CSS Animations
Fonts       Orbitron · Space Mono · JetBrains Mono
Deploy      Vercel (auto-deploy on push)
```

---

## 🎮 Cách chơi

```
1. Chọn chương và mức độ muốn ôn (hoặc chơi tất cả)
2. Xem trước danh sách câu hỏi bằng nút ▾
3. Bấm ⚡ BẮT ĐẦU NHIỆM VỤ
4. Trả lời trong 30 giây mỗi câu
5. Xây dựng chuỗi streak để nhân điểm
6. Xem kết quả sau 30 câu
```

**Mẹo:** Trả lời nhanh sẽ có thêm điểm thưởng thời gian!

---

## 📊 Cấu trúc câu hỏi

```javascript
// Trắc nghiệm
{ type: "mc", chapter: 0, level: "BIẾT",
  q: "Câu hỏi...", opts: ["A","B","C","D"], ans: 0 }

// Đúng/Sai
{ type: "tf", chapter: 1, level: "HIỂU",
  q: "Tiêu đề...", items: [{ text: "...", correct: true }] }

// Điền từ
{ type: "fill", chapter: 2, level: "BIẾT",
  q: "Điền vào chỗ ___", example: "Ví dụ: ...",
  ans: "đáp án", accepts: ["đáp án", "dap an"] }

// Nối cột
{ type: "match", chapter: 1, level: "HIỂU",
  q: "Nối cột A với cột B:",
  colA: ["1","2","3","4"], colB: ["A","B","C","D"],
  ans: [2, 0, 3, 1] }
```

---

## 👥 Tác giả

<div align="center">

| Vai trò | Người thực hiện |
|---------|----------------|
| 🎯 Thiết kế & Lập trình chính | **Chính Dlam** |
| 🤝 Hỗ trợ | **Tkien** |


</div>

---

## 📄 License

MIT License © 2026 ChemQuest Team

---

<div align="center">

**⚗️ ChemQuest © 2026 — Học Hóa Học Vừa Chơi Vừa Học**

*Phong cách: Neon Glow + Interactive · Hóa Học Cấp 3*

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Foxkun-dev/chemquest)

</div>