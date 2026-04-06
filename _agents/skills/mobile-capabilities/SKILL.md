---
name: mobile-capabilities
description: Hướng dẫn tối ưu hóa Vellum cho thiết bị di động (hạn chế quay màn hình, ưu tiên quay camera & PWA).
status: incubator
version: 1.0.0
tags: [mobile, ios, android, pwa, camera-only]
level: advanced
---

# Mobile Capabilities & Constraints Skill

## 1. Mục tiêu
Xây dựng trải nghiệm Vellum mượt mà trên điện thoại, tập trung vào quay Camera-only thay vì Screen Recording (do giới hạn Web API).

## 2. Browser Constraints (2026 Status)

| Feature | iOS Safari | Chrome Android | Giải pháp |
| :--- | :--- | :--- | :--- |
| **getDisplayMedia** | ❌ Không hỗ trợ | ❌ Không hỗ trợ | Hide Screen button, show warning. |
| **getUserMedia** | ✅ Tốt | ✅ Tốt | Dùng cho quay Camera + Mic. |
| **IndexedDB** | ✅ Tốt | ✅ Rất tốt | Lưu video chunks tạm thời. |
| **PWA Install** | ✅ Tốt (với iOS 16.4+) | ✅ Rất tốt | Khuyến khích user install để quay toàn màn hình. |

## 3. Mobile Mode Recognition

```typescript
// src/lib/services/capture/PermissionManager.ts
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
if (isMobile) {
  // Disable screen sources
  // Set default view to Full Camera
}
```

## 4. UI/UX Strategy cho Phone

- **Vertical Layout**: Chuyển giao diện từ Row (ngang) sang Column (dọc).
- **Big Buttons**: Nút ghi âm (Record) phải to, nằm ở vị trí ngón cái dễ chạm (Bottom center).
- **Camera-Only Mode**: Phát triển UI riêng nơi camera chiếm 100% diện tích màn hình, các controls nằm chồng lên dạng overlay.

## 5. Checklist cho Agent (Instincts)

- [ ] Nếu `isMobile === true`, luôn ẩn control "Webcam Position" (vì không có screen share).
- [ ] Luôn kiểm tra `facingMode: { ideal: 'user' }` (camera trước) hoặc `environment` (camera sau) cho mobile.
- [ ] Khi quay trên Safari iOS, hãy xử lý sự kiện `visibilitychange` kỹ lưỡng (Safari hay kill tiến trình ngầm).
- [ ] Thêm file `manifest.json` để biến dự án thành PWA chuẩn.

## 6. Resources
- [PWA Guide for iOS](https://web.dev/pwa-on-ios/)
- [Vellum UI Adapters](src/lib/components/layout/MobileAdapter.svelte)
