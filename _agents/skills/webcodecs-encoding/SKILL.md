---
name: webcodecs-encoding
description: Hướng dẫn setup WebCodecs VideoEncoder + AudioEncoder trong Web Worker cho LoomFX
---

# WebCodecs Encoding Skill

## Tổng quan
Skill này chuẩn hóa cách triển khai video/audio encoding pipeline sử dụng WebCodecs API trong Web Worker, tối ưu cho ghi hình màn hình Local-first.

## Kiến trúc Encoding Pipeline

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

## 1. Worker Entry Point (`encoder.worker.ts`)

```typescript
// src/services/encoding/encoder.worker.ts

interface EncoderConfig {
  width: number;
  height: number;
  fps: number;
  videoBitrate: number;
  audioBitrate: number;
  codec: string; // 'avc1.42001E' (H.264 Baseline)
}

type WorkerMessage =
  | { type: 'init'; config: EncoderConfig }
  | { type: 'video-frame'; frame: VideoFrame; timestamp: number }
  | { type: 'audio-data'; data: AudioData }
  | { type: 'stop' }
  | { type: 'pause' }
  | { type: 'resume' };

let videoEncoder: VideoEncoder | null = null;
let audioEncoder: AudioEncoder | null = null;
let frameCount = 0;
let keyFrameInterval = 60; // Every 2 seconds at 30fps

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type } = e.data;

  switch (type) {
    case 'init':
      await initEncoders(e.data.config);
      break;
    case 'video-frame':
      encodeVideoFrame(e.data.frame, e.data.timestamp);
      break;
    case 'audio-data':
      encodeAudioData(e.data.data);
      break;
    case 'stop':
      await flushAndClose();
      break;
  }
};

async function initEncoders(config: EncoderConfig) {
  // Check codec support
  const videoSupport = await VideoEncoder.isConfigSupported({
    codec: config.codec,
    width: config.width,
    height: config.height,
    bitrate: config.videoBitrate,
    framerate: config.fps,
  });

  if (!videoSupport.supported) {
    self.postMessage({ type: 'error', error: 'Video codec not supported' });
    return;
  }

  videoEncoder = new VideoEncoder({
    output: (chunk, metadata) => {
      // Send encoded chunk back to main thread or directly to muxer
      const buffer = new ArrayBuffer(chunk.byteLength);
      chunk.copyTo(buffer);
      self.postMessage(
        { type: 'video-chunk', buffer, timestamp: chunk.timestamp, isKey: chunk.type === 'key', metadata },
        { transfer: [buffer] }
      );
    },
    error: (err) => {
      self.postMessage({ type: 'error', error: err.message });
    },
  });

  videoEncoder.configure({
    codec: config.codec,
    width: config.width,
    height: config.height,
    bitrate: config.videoBitrate,
    framerate: config.fps,
    latencyMode: 'realtime',
    hardwareAcceleration: 'prefer-hardware',
  });

  audioEncoder = new AudioEncoder({
    output: (chunk, metadata) => {
      const buffer = new ArrayBuffer(chunk.byteLength);
      chunk.copyTo(buffer);
      self.postMessage(
        { type: 'audio-chunk', buffer, timestamp: chunk.timestamp, metadata },
        { transfer: [buffer] }
      );
    },
    error: (err) => {
      self.postMessage({ type: 'error', error: err.message });
    },
  });

  audioEncoder.configure({
    codec: 'mp4a.40.2', // AAC-LC
    sampleRate: 48000,
    numberOfChannels: 2,
    bitrate: config.audioBitrate,
  });

  self.postMessage({ type: 'ready' });
}

function encodeVideoFrame(frame: VideoFrame, timestamp: number) {
  if (!videoEncoder || videoEncoder.state !== 'configured') {
    frame.close();
    return;
  }

  // Backpressure: skip frames if encoder queue is too deep
  if (videoEncoder.encodeQueueSize > 5) {
    frame.close();
    self.postMessage({ type: 'frame-dropped' });
    return;
  }

  const isKeyFrame = frameCount % keyFrameInterval === 0;
  videoEncoder.encode(frame, { keyFrame: isKeyFrame });
  frame.close(); // CRITICAL: always close VideoFrame to prevent memory leak
  frameCount++;
}

function encodeAudioData(data: AudioData) {
  if (!audioEncoder || audioEncoder.state !== 'configured') {
    data.close();
    return;
  }
  audioEncoder.encode(data);
  data.close();
}

async function flushAndClose() {
  if (videoEncoder && videoEncoder.state === 'configured') {
    await videoEncoder.flush();
    videoEncoder.close();
  }
  if (audioEncoder && audioEncoder.state === 'configured') {
    await audioEncoder.flush();
    audioEncoder.close();
  }
  self.postMessage({ type: 'done' });
}
```

## 2. Main Thread Orchestrator (`EncoderPipeline.ts`)

```typescript
// src/services/encoding/EncoderPipeline.ts

export class EncoderPipeline {
  private worker: Worker;
  private onChunk: (chunk: ArrayBuffer, type: 'video' | 'audio') => void;

  constructor(onChunk: (chunk: ArrayBuffer, type: 'video' | 'audio') => void) {
    this.worker = new Worker(
      new URL('./encoder.worker.ts', import.meta.url),
      { type: 'module' }
    );
    this.onChunk = onChunk;
    this.setupMessageHandler();
  }

  private setupMessageHandler() {
    this.worker.onmessage = (e) => {
      switch (e.data.type) {
        case 'video-chunk':
          this.onChunk(e.data.buffer, 'video');
          break;
        case 'audio-chunk':
          this.onChunk(e.data.buffer, 'audio');
          break;
        case 'error':
          console.error('Encoder error:', e.data.error);
          break;
        case 'done':
          console.log('Encoding complete');
          break;
      }
    };
  }

  async init(config: EncoderConfig) {
    this.worker.postMessage({ type: 'init', config });
  }

  feedVideoFrame(frame: VideoFrame) {
    // Transfer ownership to worker (zero-copy)
    this.worker.postMessage(
      { type: 'video-frame', frame, timestamp: frame.timestamp },
      { transfer: [frame] }
    );
  }

  async stop() {
    this.worker.postMessage({ type: 'stop' });
  }

  dispose() {
    this.worker.terminate();
  }
}
```

## 3. Quality Presets

```typescript
export const ENCODING_PRESETS = {
  low: {
    width: 1280, height: 720,
    fps: 24,
    videoBitrate: 1_000_000,    // 1 Mbps
    audioBitrate: 96_000,       // 96 kbps
    codec: 'avc1.42001E',
  },
  medium: {
    width: 1920, height: 1080,
    fps: 30,
    videoBitrate: 2_500_000,    // 2.5 Mbps
    audioBitrate: 128_000,      // 128 kbps
    codec: 'avc1.42001E',
  },
  high: {
    width: 1920, height: 1080,
    fps: 30,
    videoBitrate: 5_000_000,    // 5 Mbps
    audioBitrate: 192_000,      // 192 kbps
    codec: 'avc1.640028',       // H.264 High
  },
  ultra: {
    width: 3840, height: 2160,
    fps: 30,
    videoBitrate: 8_000_000,    // 8 Mbps
    audioBitrate: 192_000,
    codec: 'avc1.640033',       // H.264 High 5.1
  },
} as const;
```

## 4. MediaRecorder Fallback

Khi WebCodecs không khả dụng (Firefox, Safari older), sử dụng MediaRecorder:

```typescript
export class MediaRecorderFallback {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  start(stream: MediaStream, mimeType = 'video/webm;codecs=vp9,opus') {
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus';
    }

    this.recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 2_500_000,
    });

    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.recorder.start(1000); // Chunk every 1 second
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.recorder) return;
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.recorder!.mimeType });
        this.chunks = [];
        resolve(blob);
      };
      this.recorder.stop();
    });
  }
}
```

## Lưu ý Quan trọng

> **CRITICAL**: Luôn gọi `frame.close()` và `data.close()` sau khi encode để tránh memory leak.

> **PERFORMANCE**: Đặt `hardwareAcceleration: 'prefer-hardware'` để tận dụng GPU encoding.

> **BACKPRESSURE**: Check `encodeQueueSize` trước khi push frame mới. Nếu > 5, drop frame.

> **BROWSER SUPPORT**: WebCodecs chỉ khả dụng trên Chromium 94+. Luôn feature-detect trước:
> ```typescript
> const hasWebCodecs = 'VideoEncoder' in window;
> ```
