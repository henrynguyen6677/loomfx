---
name: browser-troubleshooting
description: Hướng dẫn xử lý các lỗi đặc thù trình duyệt (Firefox/Safari/Chrome) và các quirks trên hệ điều hành (macOS/Windows) cho Vellum.
status: stable
version: 1.0.0
tags: [browser, firefox, safari, macos, permissions]
level: advanced
---

# Browser Troubleshooting & Compatibility Skill

## 1. Mục tiêu
Cung cấp các pattern để nhận dạng và sửa chữa các lỗi không đồng nhất giữa các trình duyệt khi sử dụng Web Media APIs.

## 2. Browser Matrix & Quirks

| Trình duyệt | Tính năng | Hạn chế đã biết |
| :--- | :--- | :--- |
| **Chromium** | Full Support | Cần HTTPS/Localhost. System Audio đầy đủ. |
| **Firefox** | Partial | `getDisplayMedia` không hỗ trợ system audio trên macOS. Throw `NotFoundError` nếu truyền Chrome-only options. |
| **Safari** | Minimal | Không có system audio capture. Cần Interactive Gesture cực kỳ nghiêm ngặt. |

## 3. Các Common Errors & Giải pháp

### 3.1. Firefox "NotFoundError" trên macOS
*   **Triệu chứng:** Khi gọi `getDisplayMedia`, trình duyệt báo `NotFoundError` ngay lập tức.
*   **Nguyên nhân:** Firefox không hỗ trợ `audio: true` trong `getDisplayMedia` trên macOS (không thể capture system audio).
*   **Giải pháp:** 
    1. Kiểm tra `isChromium`. 
    2. Nếu không phải Chromium, gán `audio: false` trong options của `getDisplayMedia`.
    3. Luôn bọc trong `try/catch` và retry mà không có audio nếu thất bại.

### 3.2. macOS "Black Screen" (Permission denied at OS level)
*   **Triệu chứng:** `getDisplayMedia` thành công nhưng video track trả về màn hình đen hoặc độ phân giải 0x0.
*   **Giải pháp:** 
    ```typescript
    const videoTrack = stream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();
    if (settings.width === 0 || settings.height === 0) {
      // Trigger MACOS_SCREEN_PERMISSION error
    }
    ```

### 3.3. Double-Flash Modal (Svelte 5 Effects)
*   **Triệu chứng:** Thông báo lỗi hiện lên và biến mất rồi hiện lại cực nhanh.
*   **Nguyên nhân:** Nhiều event error được bắn ra cùng lúc hoặc Svelte effect re-run quá nhanh.
*   **Giải pháp:** Sử dụng `errorDebounce` flag hoặc `setTimeout` để giới hạn tần suất hiện modal (min 500ms).

## 4. Checklist cho Agent (Instincts)

- [ ] Luôn kiểm tra `BrowserCapabilities` trước khi gọi bất kỳ Media API nào.
- [ ] KHÔNG BAO GIỜ truyền `surfaceSwitching` hoặc `selfBrowserSurface` cho các trình duyệt non-Chromium.
- [ ] Khi detect macOS, luôn chuẩn bị sẵn UI hướng dẫn người dùng "Open System Settings".
- [ ] Ưu tiên fallback `audio: false` thay vì để capture thất bại hoàn toàn.

## 5. Tài liệu tham khảo
- [MDN getDisplayMedia](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API)
- [Firefox macOS Bug Tracker](https://bugzilla.mozilla.org/show_bug.cgi?id=1545812)
