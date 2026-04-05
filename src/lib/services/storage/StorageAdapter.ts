/**
 * StorageAdapter — Abstract interface for multi-browser storage
 */
export interface StorageAdapter {
  readonly name: string;
  open(filename: string): Promise<void>;
  write(chunk: Uint8Array | ArrayBuffer): Promise<void>;
  close(): Promise<void>;
  getFile(): Promise<Blob | null>;
}

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

  async write(chunk: Uint8Array | ArrayBuffer): Promise<void> {
    if (!this.writable) throw new Error('Stream not opened');
    const data = chunk instanceof Uint8Array ? chunk.buffer as ArrayBuffer : chunk;
    await this.writable.write(data);
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
 * BlobAdapter — In-memory blob accumulation with download trigger (universal fallback)
 */
export class BlobAdapter implements StorageAdapter {
  readonly name = 'In-Memory Download';
  private chunks: ArrayBuffer[] = [];
  private mimeType = 'video/webm';
  private filename = 'recording.webm';

  static isSupported(): boolean {
    return true; // Always available
  }

  async open(filename: string): Promise<void> {
    this.filename = filename;
    this.mimeType = filename.endsWith('.mp4') ? 'video/mp4' : 'video/webm';
    this.chunks = [];
  }

  async write(chunk: Uint8Array | ArrayBuffer): Promise<void> {
    const data = chunk instanceof Uint8Array ? chunk.buffer as ArrayBuffer : chunk;
    this.chunks.push(data);
  }

  async close(): Promise<void> {
    // No-op, data stays in memory
  }

  async getFile(): Promise<Blob | null> {
    if (this.chunks.length === 0) return null;
    return new Blob(this.chunks, { type: this.mimeType });
  }

  getFilename(): string {
    return this.filename;
  }
}

/**
 * StorageFactory — Auto-detect and create the best adapter
 */
export function createStorageAdapter(): { adapter: StorageAdapter; type: string; limitations: string[] } {
  if (FileSystemAdapter.isSupported()) {
    return {
      adapter: new FileSystemAdapter(),
      type: 'filesystem',
      limitations: [],
    };
  }

  return {
    adapter: new BlobAdapter(),
    type: 'blob',
    limitations: [
      'Video is accumulated in memory — long recordings may use significant RAM',
      'File will be downloaded when recording stops',
    ],
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
