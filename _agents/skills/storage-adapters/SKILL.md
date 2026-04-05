---
name: storage-adapters
description: Patterns cho File System Access API / OPFS / IndexedDB với fallback chain trong LoomFX
---

# Storage Adapters Skill

## Tổng quan
Skill này chuẩn hóa chiến lược lưu trữ đa trình duyệt cho LoomFX. Sử dụng adapter pattern với auto-detection để chọn phương thức lưu trữ tối ưu nhất.

## Thứ tự ưu tiên (Fallback Chain)

```
┌─────────────────────────────┐
│ 1. File System Access API   │ ← Chromium (Chrome, Edge, Brave)
│    showSaveFilePicker()     │   ✅ Ghi trực tiếp xuống đĩa
│    Direct disk streaming    │   ✅ Không giới hạn dung lượng
│    No RAM accumulation      │   ✅ Không tốn RAM
└──────────┬──────────────────┘
           │ Not available?
           ▼
┌─────────────────────────────┐
│ 2. Origin Private FS (OPFS) │ ← Firefox, Safari, Workers
│    navigator.storage        │   ✅ Hiệu suất I/O cao
│    .getDirectory()          │   ⚠️ Giới hạn ~300MB-vài GB
│    SyncAccessHandle         │   ⚠️ Files ẩn, cần download sau
└──────────┬──────────────────┘
           │ Not available?
           ▼
┌─────────────────────────────┐
│ 3. IndexedDB                │ ← Ultimate fallback (mọi browser)
│    Blob storage             │   ✅ Hỗ trợ rộng nhất
│    Up to 80% disk on Chrome │   ⚠️ Chậm hơn OPFS
│    ~1GB on Safari iOS       │   ⚠️ Safari có thể auto-evict
└─────────────────────────────┘
```

## 1. Storage Adapter Interface

```typescript
// src/services/storage/StorageAdapter.ts

export interface StorageAdapter {
  /** Tên adapter để hiển thị trong UI */
  readonly name: string;

  /** Mở file handle hoặc database sẵn sàng ghi */
  open(filename: string): Promise<void>;

  /** Ghi một chunk dữ liệu (gọi nhiều lần trong quá trình recording) */
  write(chunk: ArrayBuffer | Uint8Array): Promise<void>;

  /** Đóng file/stream, finalize dữ liệu */
  close(): Promise<void>;

  /** Lấy file cuối cùng dưới dạng Blob (cho preview/download) */
  getFile(): Promise<Blob | null>;

  /** Xóa file */
  delete(): Promise<void>;

  /** Kiểm tra adapter có khả dụng trên browser hiện tại không */
  static isSupported(): boolean;
}
```

## 2. File System Access API Adapter (Chromium)

```typescript
// src/services/storage/FileSystemAdapter.ts

export class FileSystemAdapter implements StorageAdapter {
  readonly name = 'File System Access API';
  private fileHandle: FileSystemFileHandle | null = null;
  private writableStream: FileSystemWritableFileStream | null = null;

  static isSupported(): boolean {
    return 'showSaveFilePicker' in window;
  }

  async open(filename: string): Promise<void> {
    this.fileHandle = await window.showSaveFilePicker({
      suggestedName: filename,
      types: [
        {
          description: 'Video Files',
          accept: { 'video/mp4': ['.mp4'] },
        },
      ],
    });

    this.writableStream = await this.fileHandle.createWritable();
  }

  async write(chunk: ArrayBuffer | Uint8Array): Promise<void> {
    if (!this.writableStream) {
      throw new Error('FileSystemAdapter: stream not opened');
    }
    await this.writableStream.write(chunk);
  }

  async close(): Promise<void> {
    if (this.writableStream) {
      await this.writableStream.close();
      this.writableStream = null;
    }
  }

  async getFile(): Promise<Blob | null> {
    if (!this.fileHandle) return null;
    const file = await this.fileHandle.getFile();
    return file;
  }

  async delete(): Promise<void> {
    // File System Access API doesn't support direct deletion
    // User manages files through OS file manager
    this.fileHandle = null;
  }
}
```

## 3. OPFS Adapter (Firefox/Safari)

```typescript
// src/services/storage/OPFSAdapter.ts

export class OPFSAdapter implements StorageAdapter {
  readonly name = 'Origin Private File System';
  private fileHandle: FileSystemFileHandle | null = null;
  private accessHandle: FileSystemSyncAccessHandle | null = null;
  private writeOffset = 0;
  private filename = '';

  static isSupported(): boolean {
    return 'storage' in navigator && 'getDirectory' in navigator.storage;
  }

  async open(filename: string): Promise<void> {
    this.filename = filename;
    const root = await navigator.storage.getDirectory();

    // Create or overwrite file in OPFS
    this.fileHandle = await root.getFileHandle(filename, { create: true });

    // Note: createSyncAccessHandle only works in Web Workers
    // For main thread, use createWritable()
    if (typeof FileSystemSyncAccessHandle !== 'undefined') {
      this.accessHandle = await (this.fileHandle as any).createSyncAccessHandle();
    }

    this.writeOffset = 0;
  }

  async write(chunk: ArrayBuffer | Uint8Array): Promise<void> {
    const data = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : chunk;

    if (this.accessHandle) {
      // Sync access (Worker context) - fastest
      this.accessHandle.write(data, { at: this.writeOffset });
      this.writeOffset += data.byteLength;
    } else if (this.fileHandle) {
      // Async access (Main thread)
      const writable = await this.fileHandle.createWritable({ keepExistingData: true });
      await writable.write({ type: 'write', position: this.writeOffset, data });
      await writable.close();
      this.writeOffset += data.byteLength;
    }
  }

  async close(): Promise<void> {
    if (this.accessHandle) {
      this.accessHandle.flush();
      this.accessHandle.close();
      this.accessHandle = null;
    }
  }

  async getFile(): Promise<Blob | null> {
    if (!this.fileHandle) return null;
    return await this.fileHandle.getFile();
  }

  async delete(): Promise<void> {
    if (this.filename) {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry(this.filename);
    }
  }
}
```

## 4. IndexedDB Adapter (Ultimate Fallback)

```typescript
// src/services/storage/IndexedDBAdapter.ts

const DB_NAME = 'loomfx_recordings';
const STORE_NAME = 'video_chunks';
const DB_VERSION = 1;

export class IndexedDBAdapter implements StorageAdapter {
  readonly name = 'IndexedDB';
  private db: IDBDatabase | null = null;
  private filename = '';
  private chunkIndex = 0;

  static isSupported(): boolean {
    return 'indexedDB' in window;
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: ['filename', 'index'] });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async open(filename: string): Promise<void> {
    this.filename = filename;
    this.chunkIndex = 0;
    this.db = await this.openDB();

    // Request persistent storage to prevent auto-eviction
    if (navigator.storage?.persist) {
      await navigator.storage.persist();
    }
  }

  async write(chunk: ArrayBuffer | Uint8Array): Promise<void> {
    if (!this.db) throw new Error('IndexedDBAdapter: DB not opened');

    const data = chunk instanceof ArrayBuffer ? chunk : chunk.buffer;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({
        filename: this.filename,
        index: this.chunkIndex++,
        data: data,
        timestamp: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async close(): Promise<void> {
    // No-op for IndexedDB, data is already persisted
  }

  async getFile(): Promise<Blob | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const chunks: ArrayBuffer[] = [];

      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const record = cursor.value;
          if (record.filename === this.filename) {
            chunks[record.index] = record.data;
          }
          cursor.continue();
        } else {
          resolve(new Blob(chunks, { type: 'video/mp4' }));
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async delete(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          if (cursor.value.filename === this.filename) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}
```

## 5. Storage Factory (Auto-Detection)

```typescript
// src/services/storage/StorageFactory.ts

import { FileSystemAdapter } from './FileSystemAdapter';
import { OPFSAdapter } from './OPFSAdapter';
import { IndexedDBAdapter } from './IndexedDBAdapter';
import type { StorageAdapter } from './StorageAdapter';

export type StorageType = 'filesystem' | 'opfs' | 'indexeddb';

export interface StorageInfo {
  type: StorageType;
  name: string;
  adapter: StorageAdapter;
  limitations: string[];
}

export function createStorageAdapter(): StorageInfo {
  // Priority 1: File System Access API (Chromium only)  
  if (FileSystemAdapter.isSupported()) {
    return {
      type: 'filesystem',
      name: 'File System Access API',
      adapter: new FileSystemAdapter(),
      limitations: [],
    };
  }

  // Priority 2: OPFS
  if (OPFSAdapter.isSupported()) {
    return {
      type: 'opfs',
      name: 'Origin Private File System',
      adapter: new OPFSAdapter(),
      limitations: [
        'Files are stored in a hidden browser directory',
        'You will need to download the file after recording',
        'Storage limited to ~300MB - few GB',
      ],
    };
  }

  // Priority 3: IndexedDB (always available)
  return {
    type: 'indexeddb',
    name: 'IndexedDB',
    adapter: new IndexedDBAdapter(),
    limitations: [
      'Files stored in browser database (slower I/O)',
      'Safari may auto-delete data when disk space is low',
      'You will need to download the file after recording',
    ],
  };
}

/**
 * Trigger browser download for OPFS/IndexedDB stored files
 */
export async function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Check available storage quota
 */
export async function getStorageQuota(): Promise<{
  usage: number;
  quota: number;
  percentUsed: number;
}> {
  if (navigator.storage?.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage ?? 0,
      quota: estimate.quota ?? 0,
      percentUsed: estimate.quota
        ? ((estimate.usage ?? 0) / estimate.quota) * 100
        : 0,
    };
  }
  return { usage: 0, quota: 0, percentUsed: 0 };
}
```

## Lưu ý Quan trọng

> **File System Access API** yêu cầu user gesture (click event) để gọi `showSaveFilePicker()`. Không thể gọi tự động.

> **OPFS SyncAccessHandle** chỉ hoạt động trong Web Worker. Trên main thread phải dùng async API (chậm hơn).

> **IndexedDB trên Safari iOS** giới hạn ~1GB và có thể tự động xóa dữ liệu khi thiết bị sắp hết dung lượng.

> **Persistent Storage**: Luôn gọi `navigator.storage.persist()` để ngăn browser tự động xóa dữ liệu OPFS/IndexedDB.
