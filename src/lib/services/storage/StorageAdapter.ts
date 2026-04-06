/**
 * StorageAdapter — Abstract interface for multi-browser storage
 */
export interface StorageAdapter {
  readonly name: string;
  open(filename: string): Promise<void>;
  write(chunk: Uint8Array | ArrayBuffer | Blob): Promise<void>;
  close(): Promise<void>;
  getFile(): Promise<Blob | null>;
  delete?(): Promise<void>;
}

export type StorageType = 'filesystem' | 'opfs' | 'indexeddb' | 'memory';

/**
 * FileSystemAdapter — Chromium direct-to-disk write via showSaveFilePicker
 */
export class FileSystemAdapter implements StorageAdapter {
  readonly name = 'File System Access API';
  private fileHandle: FileSystemFileHandle | null = null;
  private writable: FileSystemWritableFileStream | null = null;

  static isSupported(): boolean {
    return 'showSaveFilePicker' in window;
  }

  async open(filename: string): Promise<void> {
    this.fileHandle = await (window as any).showSaveFilePicker({
      suggestedName: filename,
      types: [{
        description: 'Video Files',
        accept: { 'video/webm': ['.webm'], 'video/mp4': ['.mp4'] },
      }],
    });
    this.writable = await this.fileHandle!.createWritable();
  }

  async write(chunk: Uint8Array | ArrayBuffer | Blob): Promise<void> {
    if (!this.writable) throw new Error('Stream not opened');
    if (chunk instanceof Blob) {
      await this.writable.write(chunk);
    } else {
      const data = chunk instanceof Uint8Array ? chunk.buffer as ArrayBuffer : chunk;
      await this.writable.write(data);
    }
  }

  async close(): Promise<void> {
    if (this.writable) {
      await this.writable.close();
      this.writable = null;
    }
  }

  async getFile(): Promise<Blob | null> {
    if (!this.fileHandle) return null;
    return await this.fileHandle.getFile();
  }
}

/**
 * OPFSAdapter — Origin Private File System (Firefox, Safari)
 */
export class OPFSAdapter implements StorageAdapter {
  readonly name = 'Origin Private File System';
  private fileHandle: FileSystemFileHandle | null = null;
  private writable: FileSystemWritableFileStream | null = null;
  private filename = '';

  static isSupported(): boolean {
    return typeof navigator !== 'undefined'
      && 'storage' in navigator
      && 'getDirectory' in (navigator.storage || {});
  }

  async open(filename: string): Promise<void> {
    this.filename = filename;
    const root = await navigator.storage.getDirectory();
    this.fileHandle = await root.getFileHandle(filename, { create: true });
    this.writable = await this.fileHandle.createWritable();

    // Request persistent storage to prevent auto-eviction
    if (navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }
  }

  async write(chunk: Uint8Array | ArrayBuffer | Blob): Promise<void> {
    if (!this.writable) throw new Error('OPFS stream not opened');
    if (chunk instanceof Blob) {
      await this.writable.write(chunk);
    } else {
      const data = chunk instanceof Uint8Array ? chunk.buffer as ArrayBuffer : chunk;
      await this.writable.write(data);
    }
  }

  async close(): Promise<void> {
    if (this.writable) {
      await this.writable.close();
      this.writable = null;
    }
  }

  async getFile(): Promise<Blob | null> {
    if (!this.fileHandle) return null;
    return await this.fileHandle.getFile();
  }

  async delete(): Promise<void> {
    if (this.filename) {
      try {
        const root = await navigator.storage.getDirectory();
        await root.removeEntry(this.filename);
      } catch {
        // File may already be deleted
      }
    }
  }
}

/**
 * IndexedDBAdapter — Universal fallback (all browsers)
 */
const IDB_NAME = 'vellum_recordings';
const IDB_STORE = 'chunks';
const IDB_VERSION = 1;

export class IndexedDBAdapter implements StorageAdapter {
  readonly name = 'IndexedDB';
  private db: IDBDatabase | null = null;
  private filename = '';
  private chunkIndex = 0;

  static isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: ['filename', 'index'] });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async open(filename: string): Promise<void> {
    this.filename = filename;
    this.chunkIndex = 0;
    this.db = await this.openDB();

    // Request persistent storage
    if (navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }
  }

  async write(chunk: Uint8Array | ArrayBuffer | Blob): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not opened');

    let data: ArrayBuffer;
    if (chunk instanceof Blob) {
      data = await chunk.arrayBuffer();
    } else {
      data = chunk instanceof Uint8Array ? chunk.buffer as ArrayBuffer : chunk;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({
        filename: this.filename,
        index: this.chunkIndex++,
        data,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async close(): Promise<void> {
    // Data already persisted per-write
  }

  async getFile(): Promise<Blob | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const chunks: ArrayBuffer[] = [];
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          if (cursor.value.filename === this.filename) {
            chunks[cursor.value.index] = cursor.value.data;
          }
          cursor.continue();
        } else {
          resolve(chunks.length > 0 ? new Blob(chunks, { type: 'video/webm' }) : null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async delete(): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          if (cursor.value.filename === this.filename) cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  }
}

/**
 * BlobAdapter — In-memory blob accumulation (ultimate fallback)
 */
export class BlobAdapter implements StorageAdapter {
  readonly name = 'In-Memory';
  private chunks: (ArrayBuffer | Blob)[] = [];
  private mimeType = 'video/webm';

  static isSupported(): boolean {
    return true;
  }

  async open(filename: string): Promise<void> {
    this.mimeType = filename.endsWith('.mp4') ? 'video/mp4' : 'video/webm';
    this.chunks = [];
  }

  async write(chunk: Uint8Array | ArrayBuffer | Blob): Promise<void> {
    if (chunk instanceof Blob) {
      this.chunks.push(chunk);
    } else {
      this.chunks.push(chunk instanceof Uint8Array ? chunk.buffer as ArrayBuffer : chunk);
    }
  }

  async close(): Promise<void> {}

  async getFile(): Promise<Blob | null> {
    return this.chunks.length > 0 ? new Blob(this.chunks, { type: this.mimeType }) : null;
  }
}

/**
 * StorageFactory — Auto-detect best adapter with fallback chain
 * Priority: FileSystem API → OPFS → IndexedDB → Memory
 */
export function createStorageAdapter(): { adapter: StorageAdapter; type: StorageType; name: string; limitations: string[] } {
  // 1. File System Access API (Chromium) — direct disk, no RAM
  if (FileSystemAdapter.isSupported()) {
    return {
      adapter: new FileSystemAdapter(),
      type: 'filesystem',
      name: 'Direct to Disk',
      limitations: [],
    };
  }

  // 2. OPFS (Firefox, Safari)
  if (OPFSAdapter.isSupported()) {
    return {
      adapter: new OPFSAdapter(),
      type: 'opfs',
      name: 'Browser Storage (OPFS)',
      limitations: ['Storage limited to ~300MB–few GB', 'File downloaded after recording'],
    };
  }

  // 3. IndexedDB (universal)
  if (IndexedDBAdapter.isSupported()) {
    return {
      adapter: new IndexedDBAdapter(),
      type: 'indexeddb',
      name: 'Browser Database',
      limitations: ['Slower I/O', 'Safari may auto-delete when low on space'],
    };
  }

  // 4. In-memory (always works)
  return {
    adapter: new BlobAdapter(),
    type: 'memory',
    name: 'In-Memory',
    limitations: ['Video stored in RAM — long recordings may crash'],
  };
}

/** Trigger browser download from a Blob */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Check available storage quota */
export async function getStorageQuota(): Promise<{ usage: number; quota: number; percentUsed: number }> {
  if (navigator.storage?.estimate) {
    const est = await navigator.storage.estimate();
    return {
      usage: est.usage ?? 0,
      quota: est.quota ?? 0,
      percentUsed: est.quota ? ((est.usage ?? 0) / est.quota) * 100 : 0,
    };
  }
  return { usage: 0, quota: 0, percentUsed: 0 };
}

