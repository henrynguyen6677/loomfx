---
name: recording-session-ops
description: Quy trình vận hành (Operational Workflow) cho một buổi quay màn hình chất lượng cao trên Vellum.
status: incubator
version: 1.0.0
tags: [workflow, session, recording, production, UX, operatore]
level: advanced
---

# Recording Session Operational Skill

## 1. Mục tiêu
Chuẩn hóa quy trình từ lúc User mở App đến khi Video được lưu trữ an toàn, đảm bảo tỉ lệ thành công 100%.

## 2. Quy trình Vận hành (The 4-Phase Workflow)

### Giai đoạn 1: Khởi tạo (Initialization)
1.  **Check Capabilities**: Kiểm tra trình duyệt (Chrome/Safari/Firefox).
2.  **Warm up**: Hỏi User về nhu cầu: "Quay cả webcam hay chỉ màn hình?" + "Có thu âm mic không?".
3.  **Permission Pre-check**: Thử xin quyền Microphone/Camera trước khi bắt đầu ghi hình chính thức.

### Giai đoạn 2: Chuẩn bị (Pre-flight)
1.  **Countdown 3-2-1**: Luôn có countdown để user kịp chuyển sang cửa sổ cần quay.
2.  **Toggle Check**: Kiểm tra xem Mic/Cam có bị khóa cứng bằng nút vật lý trên máy không.
3.  **UI Silence**: Tự động thu nhỏ hoặc ẩn các thông báo (Toasts) không cần thiết khi bắt đầu quay.

### Giai đoạn 3: Đang ghi (Active Session)
1.  **Health Monitoring**: Theo dõi `encodeQueueSize`. Nếu quá cao, hãy bắn cảnh báo nhẹ cho User.
2.  **Shortcut Guidance**: Nhắc nhẹ User các phím tắt `P` (Pause), `S` (Stop) nếu họ di chuột quá nhiều.
3.  **Pause/Resume Handle**: Đảm bảo timestamp được bù đắp chính xác khi pause/resume.

### Giai đoạn 4: Kết thúc (Review & Save)
1.  **Immediate Feedback**: Hiện spinner "Đang xử lý video..." ngay khi bấm Stop.
2.  **Storage Flush**: Đảm bảo IO Adapter đã flush hết dữ liệu từ Memory vào Disk/IDB.
3.  **Filenaming**: Tự động gợi ý tên file theo định dạng: `Vellum_YYYY-MM-DD_HH-mm.mp4`.

## 3. Checklist cho Agent (Operational Instincts)

- [ ] **Trước khi quay**: Nhắc nhở User đóng các tab không cần thiết để giải phóng CPU.
- [ ] **Trên macOS**: Luôn hỏi: "Bạn đã cấp quyền Screen Recording cho Browser chưa?".
- [ ] **Sau khi quay**: Nếu file video quá lớn (>1GB), hãy đề xuất User sử dụng File System Access API cho lần sau.
- [ ] **Nếu gặp lỗi**: Hãy giải thích lỗi bằng ngôn ngữ tự nhiên (Ví dụ: "Mic đang bị Skype chiếm dụng") thay vì hiện stack trace.

## 4. Tài liệu và Công cụ hỗ trợ
- [ShortcutManager.ts](src/lib/services/capture/ShortcutManager.ts)
- [Vellum UI Guidelines](README.md#features)
