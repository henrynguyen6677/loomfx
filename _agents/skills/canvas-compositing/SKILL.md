---
name: canvas-compositing
description: Patterns cho Canvas stream mixing - ghép screen + webcam overlay + circle clipping cho LoomFX
---

# Canvas Compositing Skill

## Tổng quan
Skill này chuẩn hóa cách tạo Canvas compositor để trộn luồng screen capture + webcam thành một video output duy nhất, bao gồm hiệu ứng circle clipping giống Loom.

## Kiến trúc Compositing

```
Screen Stream ──▶ Hidden <video#screen> ──▶ ┌──────────────────────┐
                                            │ <canvas> 1920×1080   │
                                            │ ┌──────────────────┐ │
                                            │ │                  │ │
                                            │ │  Screen Content  │ │
                                            │ │                  │ │
                                            │ │            ┌───┐ │ │
                                            │ │            │ 🎥│ │ │  ◀── Webcam circle
                                            │ │            └───┘ │ │
                                            │ └──────────────────┘ │
                                            └──────────┬───────────┘
                                                       │
Webcam Stream ──▶ Hidden <video#webcam> ──▶            │
                                              captureStream(30)
                                                       │
                                                       ▼
                                              Combined MediaStream
```

## 1. CanvasCompositor Class

```typescript
// src/services/compositor/CanvasCompositor.ts

export type WebcamPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'custom';

export interface CompositorConfig {
  width: number;          // Canvas width (default: 1920)
  height: number;         // Canvas height (default: 1080)
  fps: number;            // Target FPS (default: 30)
  webcamSize: number;     // Webcam bubble diameter in pixels (default: 200)
  webcamPosition: WebcamPosition;
  webcamMargin: number;   // Margin from edge (default: 20)
  showWebcam: boolean;
}

export class CanvasCompositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private screenVideo: HTMLVideoElement;
  private webcamVideo: HTMLVideoElement;
  private outputStream: MediaStream | null = null;
  private animationId: number | null = null;
  private config: CompositorConfig;
  private customWebcamX: number = 0;
  private customWebcamY: number = 0;
  private isRunning = false;

  constructor(config: Partial<CompositorConfig> = {}) {
    this.config = {
      width: 1920,
      height: 1080,
      fps: 30,
      webcamSize: 200,
      webcamPosition: 'bottom-right',
      webcamMargin: 20,
      showWebcam: true,
      ...config,
    };

    // Create offscreen canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
    this.ctx = this.canvas.getContext('2d')!;

    // Create hidden video elements for stream playback
    this.screenVideo = this.createHiddenVideo();
    this.webcamVideo = this.createHiddenVideo();
  }

  private createHiddenVideo(): HTMLVideoElement {
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.style.display = 'none';
    document.body.appendChild(video);
    return video;
  }

  /**
   * Attach media streams to the compositor
   */
  async attachStreams(screenStream: MediaStream, webcamStream?: MediaStream) {
    this.screenVideo.srcObject = screenStream;
    await this.screenVideo.play();

    if (webcamStream && this.config.showWebcam) {
      this.webcamVideo.srcObject = webcamStream;
      await this.webcamVideo.play();
    }
  }

  /**
   * Start the compositing render loop and return the output stream
   */
  start(): MediaStream {
    this.isRunning = true;
    this.renderLoop();

    // Capture the canvas as a MediaStream
    this.outputStream = this.canvas.captureStream(this.config.fps);
    return this.outputStream;
  }

  /**
   * The core render loop using requestAnimationFrame
   */
  private renderLoop = () => {
    if (!this.isRunning) return;

    const { width, height } = this.config;
    const ctx = this.ctx;

    // Step 1: Clear canvas (prevent ghost frames)
    ctx.clearRect(0, 0, width, height);

    // Step 2: Draw screen capture as background (scale-to-fit)
    if (this.screenVideo.readyState >= 2) {
      this.drawScreenLayer();
    }

    // Step 3: Draw webcam bubble with circle clipping
    if (this.config.showWebcam && this.webcamVideo.readyState >= 2) {
      this.drawWebcamBubble();
    }

    // Schedule next frame
    this.animationId = requestAnimationFrame(this.renderLoop);
  };

  /**
   * Draw screen content scaled to fit canvas
   */
  private drawScreenLayer() {
    const { width, height } = this.config;
    const video = this.screenVideo;

    // Calculate scale-to-fit dimensions
    const videoRatio = video.videoWidth / video.videoHeight;
    const canvasRatio = width / height;

    let drawWidth = width;
    let drawHeight = height;
    let offsetX = 0;
    let offsetY = 0;

    if (videoRatio > canvasRatio) {
      // Video is wider → fit width, center vertically
      drawHeight = width / videoRatio;
      offsetY = (height - drawHeight) / 2;
    } else {
      // Video is taller → fit height, center horizontally
      drawWidth = height * videoRatio;
      offsetX = (width - drawWidth) / 2;
    }

    // Fill background black for letterboxing
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
  }

  /**
   * Draw webcam as a circular bubble with smooth clipping
   */
  private drawWebcamBubble() {
    const { webcamSize, webcamMargin, webcamPosition, width, height } = this.config;
    const radius = webcamSize / 2;

    // Calculate center position based on config
    let cx: number, cy: number;

    switch (webcamPosition) {
      case 'bottom-right':
        cx = width - webcamMargin - radius;
        cy = height - webcamMargin - radius;
        break;
      case 'bottom-left':
        cx = webcamMargin + radius;
        cy = height - webcamMargin - radius;
        break;
      case 'top-right':
        cx = width - webcamMargin - radius;
        cy = webcamMargin + radius;
        break;
      case 'top-left':
        cx = webcamMargin + radius;
        cy = webcamMargin + radius;
        break;
      case 'custom':
        cx = this.customWebcamX;
        cy = this.customWebcamY;
        break;
    }

    const ctx = this.ctx;

    // Save current canvas state
    ctx.save();

    // Draw subtle shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    // Create circular clipping path
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Reset shadow for the actual image draw
    ctx.shadowColor = 'transparent';

    // Draw webcam video inside the circle
    // Center-crop the webcam feed to fill the circle
    const video = this.webcamVideo;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cropSize = Math.min(vw, vh); // Square crop
    const cropX = (vw - cropSize) / 2;
    const cropY = (vh - cropSize) / 2;

    ctx.drawImage(
      video,
      cropX, cropY, cropSize, cropSize,  // Source (center crop)
      cx - radius, cy - radius, webcamSize, webcamSize  // Destination
    );

    // Restore canvas state (removes clipping)
    ctx.restore();

    // Draw circle border
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  /**
   * Update webcam position (for draggable feature)
   */
  setWebcamPosition(position: WebcamPosition, x?: number, y?: number) {
    this.config.webcamPosition = position;
    if (position === 'custom' && x !== undefined && y !== undefined) {
      this.customWebcamX = x;
      this.customWebcamY = y;
    }
  }

  /**
   * Toggle webcam visibility
   */
  setWebcamVisible(visible: boolean) {
    this.config.showWebcam = visible;
  }

  /**
   * Stop the compositor and clean up
   */
  stop() {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    // Stop all tracks on output stream
    this.outputStream?.getTracks().forEach(t => t.stop());

    // Clean up video elements
    this.screenVideo.srcObject = null;
    this.webcamVideo.srcObject = null;
    this.screenVideo.remove();
    this.webcamVideo.remove();
  }

  /**
   * Get the canvas element (for live preview)
   */
  getPreviewCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
```

## 2. Audio Mixer

```typescript
// src/services/compositor/AudioMixer.ts

export class AudioMixer {
  private audioContext: AudioContext;
  private destination: MediaStreamAudioDestinationNode;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private systemSource: MediaStreamAudioSourceNode | null = null;
  private micGain: GainNode;
  private systemGain: GainNode;

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: 48000 });
    this.destination = this.audioContext.createMediaStreamDestination();

    // Create gain nodes for volume control
    this.micGain = this.audioContext.createGain();
    this.micGain.gain.value = 1.0;
    this.micGain.connect(this.destination);

    this.systemGain = this.audioContext.createGain();
    this.systemGain.gain.value = 1.0;
    this.systemGain.connect(this.destination);
  }

  /**
   * Connect microphone stream
   */
  connectMicrophone(stream: MediaStream) {
    this.micSource = this.audioContext.createMediaStreamSource(stream);
    this.micSource.connect(this.micGain);
  }

  /**
   * Connect system audio from screen capture
   */
  connectSystemAudio(stream: MediaStream) {
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length > 0) {
      const audioStream = new MediaStream(audioTracks);
      this.systemSource = this.audioContext.createMediaStreamSource(audioStream);
      this.systemSource.connect(this.systemGain);
    }
  }

  /**
   * Get the mixed audio output stream
   */
  getOutputStream(): MediaStream {
    return this.destination.stream;
  }

  /**
   * Set microphone volume (0.0 - 1.0)
   */
  setMicVolume(volume: number) {
    this.micGain.gain.value = Math.max(0, Math.min(1, volume));
  }

  /**
   * Set system audio volume
   */
  setSystemVolume(volume: number) {
    this.systemGain.gain.value = Math.max(0, Math.min(1, volume));
  }

  /**
   * Mute/unmute microphone
   */
  muteMic(muted: boolean) {
    this.micGain.gain.value = muted ? 0 : 1;
  }

  dispose() {
    this.micSource?.disconnect();
    this.systemSource?.disconnect();
    this.audioContext.close();
  }
}
```

## 3. Combining Video + Audio into Final Stream

```typescript
// Utility: Merge canvas video stream + audio mixer output
export function combineStreams(
  videoStream: MediaStream,
  audioStream: MediaStream
): MediaStream {
  const combined = new MediaStream();

  // Add video track from canvas
  videoStream.getVideoTracks().forEach(track => {
    combined.addTrack(track);
  });

  // Add audio track(s) from mixer
  audioStream.getAudioTracks().forEach(track => {
    combined.addTrack(track);
  });

  return combined;
}
```

## Performance Tips

1. **Adaptive FPS**: Nếu `performance.now()` cho thấy render loop > 33ms, tạm thời giảm FPS xuống 15
2. **OffscreenCanvas**: Trên Chromium, dùng `OffscreenCanvas` trong Worker để giải phóng main thread
3. **Resolution Scaling**: Nếu screen video > 1920px, scale down ở bước `drawImage()`, không tăng canvas size
4. **Skip identical frames**: So sánh ImageData hash, skip frame nếu screen không thay đổi (tiết kiệm encoding)
