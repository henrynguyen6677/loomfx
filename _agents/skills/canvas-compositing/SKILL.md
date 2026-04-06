---
name: canvas-compositing
description: Patterns cho Canvas stream mixing - ghép screen + webcam overlay + circle clipping cho Vellum.
status: advanced
version: 1.0.1
tags: [canvas, video-mixing, webcam, circle-clip, compositing]
level: pro
---

# Canvas Stream Compositing Skill

## 1. Mục tiêu
Chuẩn hóa cách vẽ (rendering) luồng video hỗn hợp từ Screen Share và Webcam vào một Canvas 2D để tạo video output duy nhất.

## 2. Circle Webcam Overlay (Công thức Render)

Để tạo hiệu ứng Webcam hình tròn (UI/UX sang trọng):
1.  **Save state**: `ctx.save()`
2.  **Create path**: `ctx.beginPath()` + `ctx.arc()`
3.  **Clip**: `ctx.clip()`
4.  **Draw**: `ctx.drawImage(webcamVideo, ...)`
5.  **Restore**: `ctx.restore()`

### Ví dụ Code chính xác:
```javascript
// src/lib/services/capture/CanvasCompositor.ts
ctx.save();
ctx.beginPath();
ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
ctx.clip();
ctx.drawImage(webcamVideo, x, y, width, height);
ctx.restore();
```

## 3. Quản lý Tỷ lệ khung hình (Aspect Ratio)

Vellum hỗ trợ ghi hình lên đến 1920x1080. 
*   **Screen**: Luôn ưu tiên toàn màn hình (fit/cover).
*   **Webcam**: Có 3 kích thước: `small`, `medium`, `large` (tương đương 10%, 15%, 25% chiều rộng video).
*   **Vị trí**: 4 góc (Bottom-Left là mặc định).

## 4. Performance & Frame Rates

*   **RequestAnimationFrame**: Luôn sử dụng `requestAnimationFrame` để đảm bảo frame rate đồng nhất.
*   **CaptureStream(fps)**: Chuyển canvas thành MediaStream (`canvas.captureStream(30)`).
*   **CPU usage**: Việc render liên tục 60fps trên Canvas 4K có thể gây nóng máy. Agent nên đề xuất 30fps cho các máy yếu hoặc browser giới hạn.

## 5. Checklist cho Agent (Instincts)

- [ ] Khi vẽ Webcam, luôn đảm bảo Webcam video track vẫn active (`readyState === 'live'`).
- [ ] Luôn kiểm tra tỷ lệ màn hình để Webcam không bị bóp méo (Keep Aspect Ratio).
- [ ] Nếu screen track dừng (`ended`), compositor phải dừng render ngay để giải phóng CPU.
- [ ] Khi thay đổi kích thước webcam trong lúc ghi, dùng animation mượt mà thay vì nhảy cóc.

## 6. Resources
- [CanvasCompositor.ts](src/lib/services/capture/CanvasCompositor.ts)
- [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
