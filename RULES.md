# 📜 Vellum Project Rules & Standards

Chào mừng đến với dự án **Vellum**. Các quy tắc dưới đây được thiết lập để đảm bảo dự án luôn ổn định trên mọi nền tảng (Cross-Browser) và bảo mật tuyệt đối (Privacy (Local-First)).

## 1. Công nghệ & Stack
- **Framework**: SvelteKit 5 (Dùng **Svelte 5 Runes** `$state`, `$derived`, `$effect`).
- **Language**: TypeScript (Strict mode).
- **Styling**: CSS Variables + BEM pattern. Không dùng Tailwind trừ khi được yêu cầu.

## 2. Giao diện (Aesthetics)
- **Design Spirit**: Glassmorphism, Dark mode, iOS-style toggles.
- **UX**: Luôn cung cấp phản hồi (Toasts, Spinners) cho mọi hành động của người dùng liên quan đến Media API (vốn có thể tốn thời gian).
- **Transitions**: Sử dụng Svelte `transition` để các element hiện lên/biến mất mượt mà (tránh nhảy UI).

## 3. Media API & Security
- **Local-First**: Dữ liệu ghi hình KHÔNG bao giờ được gửi đi bất cứ đâu. Tuyệt đối không thêm trackers hay telemetry.
- **Permission Flow**: 
  - Phải check `isSecureContext`.
  - Phải bọc mọi Media API call trong `try/catch` (Phát hiện `NotAllowedError` vs `NotFoundError`).
  - Phải có hướng dẫn chi tiết cho lỗi `MACOS_SCREEN_PERMISSION`.
- **Resources**: Giải phóng `MediaStreamTrack` ngay khi không cần dùng (`track.stop()`).

## 4. Cấu trúc mã nguồn
- `src/lib/services`: Chứa logic nghiệp vụ (Recording, Storage, Permissions).
- `src/lib/components`: Cấu trúc thành `common`, `layout`, `recording`. 
- `_agents/skills`: Hệ thống cẩm nang cho AI assistants.

## 5. Quy tắc cho Agent (Instincts)
- Trước khi thực hiện thay đổi lớn: Luôn chạy `npm run check` và `npm run test`.
- Khi gặp lỗi trên Safari/Firefox: Luôn tìm kiếm giải pháp dựa trên MDN Compatibility table thay vì đoán mò.
- Luôn giữ README.md đồng bộ với các tính năng mới nhất.

---
*Created with ❤️ by Antigravity.*
