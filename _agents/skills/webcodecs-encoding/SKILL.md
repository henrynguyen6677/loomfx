---
name: webcodecs-encoding
description: Hướng dẫn setup WebCodecs VideoEncoder + AudioEncoder trong Web Worker cho Vellum (H.264/AVC).
status: advanced
version: 1.1.0
tags: [webcodecs, video-encoding, h264, audio-encoding, aac, mp4, worker]
level: pro
---

# WebCodecs Encoding Skill (Vellum Standard)

## 1. Mục tiêu
Chuẩn hóa cách triển khai video/audio encoding pipeline sử dụng WebCodecs API trong Web Worker để ghi hình màn hình 1080p@60fps mà không nghẽn Main Thread.

## 2. Kiến trúc Pipeline (Zero-Copy)

```
Main Thread                          Web Worker
┌─────────────┐                    ┌──────────────────┐
│ Canvas       │──VideoFrame──────▶│ VideoEncoder      │
│ captureStream│  (Transferable)   │   ↓               │
│              │                   │ EncodedVideoChunk  │
│ AudioContext │──AudioData───────▶│ AudioEncoder      │
│ destination  │  (Transferable)   │   ↓               │
│              │                   │ EncodedAudioChunk  │
│              │                   │   ↓               │
│              │◀─Binary Chunks────│ Mediabunny Muxer  │
│              │  (ArrayBuffer)    │   → MP4 Container  │
└─────────────┘                    └──────────────────┘
```

## 3. Quản lý Nghẽn (Backpressure Management)

Đây là quy trình tối yếu để tránh tràn bộ nhớ (Memory Overflow):
- **Queue Size Monitoring**: Check `videoEncoder.encodeQueueSize`.
- **Throttling**: Nếu `encodeQueueSize > 5`, hãy drop các frame video hiện tại thay vì dồn toa.
- **Latency Mode**: Luôn sử dụng `latencyMode: 'realtime'` cho stream ghi hình.

## 4. Quality Presets (H.264 / AAC)

| Preset | Resolution | FPS | Video Bitrate | Audio |
| :--- | :--- | :--- | :--- | :--- |
| **Low** | 720p | 24 | 1 Mbps | 64 kbps |
| **Medium** | 1080p | 30 | 2.5 Mbps | 128 kbps |
| **High** | 1080p | 60 | 5 Mbps | 192 kbps |

## 5. Checklist cho Agent (Instincts)

- [ ] **CRITICAL**: Luôn gọi `frame.close()` và `data.close()` NGAY LẬP TỨC sau khi gọi `encode()`. Thất bại trong việc này sẽ làm crash tab browser trong vài giây.
- [ ] Luôn kiểm tra `hardwareAcceleration: 'prefer-hardware'` để giảm tải cho CPU.
- [ ] Luôn có cơ chế Fallback sang `MediaRecorder` cho các trình duyệt không hỗ trợ WebCodecs (Firefox, Safari cũ).
- [ ] Khi chuyển đổi frame từ Main sang Worker, hãy truyền dưới dạng `Transferable` để tránh việc copy dữ liệu (tốn CPU).

## 6. Resources
- [Vellum Encoding Service](src/lib/services/encoding/EncoderPipeline.ts)
- [W3C WebCodecs API](https://w3c.github.io/webcodecs/)
