---
name: storage-adapters
description: Patterns cho File System Access API / OPFS / IndexedDB với fallback chain trong Vellum.
status: stable
version: 1.0.0
tags: [storage, opfs, file-system, indexeddb, fallback]
level: pro
---

# Multi-Browser Storage Strategy Skill

## 1. Mục tiêu
Chuẩn hóa cách lưu trữ dữ liệu recording lớn (hàng trăm MB/GB) trên browser mà không gây crash tab hoặc tràn bộ nhớ.

## 2. 4-Tier Fallback Chain (Chiến lược ưu tiên)

1.  **File System Access API (Chromium)**: Lưu trực tiếp vào disk của user thông qua `showSaveFilePicker`. (Ưu tiên: Tốc độ cao, không tốn quota trình duyệt).
2.  **Origin Private File System (OPFS)**: Hệ thống file cô lập của browser (Firefox 113+, Safari 16.4+). (Ưu tiên: Ổn định, không cần user prompt liên tục).
3.  **IndexedDB (IDB)**: Lưu dưới dạng Blobs trong database. (Ưu tiên: Safari cũ và cross-browser bền bỉ).
4.  **In-Memory (Blob Chunks)**: Giữ dữ liệu trong RAM. (Ưu tiên: Chỉ dùng khi các tầng trên thất bại).

## 3. Kiến trúc Implementation

```typescript
// src/lib/services/storage/StorageFactory.ts
export class StorageFactory {
  static createAdapter(): StorageAdapter {
    if (caps.hasFileSystemAccess) return new FileSystemAdapter();
    if (caps.hasOPFS) return new OPFSAdapter();
    if (caps.hasIDB) return new IndexedDBAdapter();
    return new MemoryAdapter();
  }
}
```

## 4. Các bẫy cần tránh (Gotchas)

### 4.1. OPFS và Web Workers
OPFS có thể bị lock nếu nhiều tab/worker truy cập cùng lúc. Luôn đảm bảo `close()` các file handle sau khi ghi xong.

### 4.2. Quota Management
Browser có giới hạn lưu trữ (thường là 50% ổ đĩa trống). Agent cần sử dụng `navigator.storage.estimate()` để cảnh báo UI nếu quota sắp hết.

### 4.3. Safari IDB Persistence
Safari có thể xóa IndexedDB nếu user không tương tác hoặc tab không hoạt động lâu. Cần khuyến khích user download ngay sau khi record xong.

## 5. Checklist cho Agent (Instincts)

- [ ] Luôn sử dụng `StorageAdapter` interface để đảm bảo tính trừu tượng.
- [ ] KHÔNG BAO GIỜ lưu toàn bộ video >500MB trực tiếp vào RAM (MemoryAdapter) trừ khi không còn lựa chọn nào khác.
- [ ] Khi sử dụng `FileSystemAdapter`, hãy chuẩn bị hướng dẫn UI để user chọn thư mục lưu.
- [ ] Luôn kiểm tra `isSecureContext` trước khi khởi tạo storage.

## 6. Resources
- [Vellum Storage Service](src/lib/services/storage/StorageAdapter.ts)
- [W3C File System Access API](https://w3c.github.io/file-system-access/)
