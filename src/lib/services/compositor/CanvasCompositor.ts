/**
 * CanvasCompositor
 *
 * Mixes screen capture + webcam bubble into a single canvas output.
 * Uses requestAnimationFrame for real-time compositing with circle clipping.
 */

import type { WebcamPosition } from '$lib/utils/constants';

export interface CompositorConfig {
  width: number;
  height: number;
  fps: number;
  webcamSize: number;
  webcamPosition: WebcamPosition;
  webcamMargin: number;
  showWebcam: boolean;
}

const DEFAULT_CONFIG: CompositorConfig = {
  width: 1920,
  height: 1080,
  fps: 30,
  webcamSize: 180,
  webcamPosition: 'bottom-right',
  webcamMargin: 24,
  showWebcam: true,
};

export class CanvasCompositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private screenVideo: HTMLVideoElement;
  private webcamVideo: HTMLVideoElement;
  private outputStream: MediaStream | null = null;
  private animationId: number | null = null;
  private config: CompositorConfig;
  private isRunning = false;
  private lastFrameTime = 0;
  private frameInterval: number;

  constructor(config: Partial<CompositorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.frameInterval = 1000 / this.config.fps;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;

    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Failed to create canvas 2D context');
    this.ctx = ctx;

    this.screenVideo = this.createHiddenVideo();
    this.webcamVideo = this.createHiddenVideo();
  }

  private createHiddenVideo(): HTMLVideoElement {
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    // CRITICAL: Use clip-path to hide, NOT width:1px or opacity:0.
    // Browser needs full-size element to decode video frames.
    video.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:-9999;clip-path:inset(100%);';
    document.body.appendChild(video);
    return video;
  }

  /** Wait for video to have decodable frames */
  private waitForVideo(video: HTMLVideoElement, timeoutMs = 3000): Promise<void> {
    return new Promise((resolve) => {
      if (video.readyState >= 2) {
        resolve();
        return;
      }
      const timer = setTimeout(resolve, timeoutMs);
      video.addEventListener('loadeddata', () => { clearTimeout(timer); resolve(); }, { once: true });
    });
  }

  async attachScreenStream(stream: MediaStream): Promise<void> {
    this.screenVideo.srcObject = stream;
    await this.screenVideo.play();
    await this.waitForVideo(this.screenVideo);
    console.log('[Compositor] Screen video ready:', this.screenVideo.videoWidth, 'x', this.screenVideo.videoHeight);
  }

  async attachWebcamStream(stream: MediaStream): Promise<void> {
    this.webcamVideo.srcObject = stream;
    await this.webcamVideo.play();
    await this.waitForVideo(this.webcamVideo);
    console.log('[Compositor] Webcam video ready:', this.webcamVideo.videoWidth, 'x', this.webcamVideo.videoHeight);
  }

  start(): MediaStream {
    this.isRunning = true;
    this.lastFrameTime = 0;
    this.renderLoop(0);

    this.outputStream = this.canvas.captureStream(this.config.fps);

    // Dispatch preview canvas for LivePreview component
    window.dispatchEvent(
      new CustomEvent('loomfx:preview-canvas', { detail: { canvas: this.canvas } })
    );

    return this.outputStream;
  }

  private renderLoop = (timestamp: number): void => {
    if (!this.isRunning) return;

    this.animationId = requestAnimationFrame(this.renderLoop);

    // Throttle to target FPS
    const elapsed = timestamp - this.lastFrameTime;
    if (elapsed < this.frameInterval) return;
    this.lastFrameTime = timestamp - (elapsed % this.frameInterval);

    this.renderFrame();
  };

  private renderFrame(): void {
    const { width, height } = this.config;
    const ctx = this.ctx;

    // 1. Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw screen (scale-to-fit with letterboxing)
    if (this.screenVideo.readyState >= 2) {
      this.drawScreenLayer();
    }

    // 3. Draw webcam bubble with circle clipping
    if (this.config.showWebcam && this.webcamVideo.readyState >= 2) {
      this.drawWebcamBubble();
    }
  }

  private drawScreenLayer(): void {
    const { width, height } = this.config;
    const v = this.screenVideo;
    const vw = v.videoWidth;
    const vh = v.videoHeight;

    if (!vw || !vh) return;

    const videoRatio = vw / vh;
    const canvasRatio = width / height;

    let dw = width;
    let dh = height;
    let dx = 0;
    let dy = 0;

    if (videoRatio > canvasRatio) {
      dh = width / videoRatio;
      dy = (height - dh) / 2;
    } else {
      dw = height * videoRatio;
      dx = (width - dw) / 2;
    }

    this.ctx.drawImage(v, dx, dy, dw, dh);
  }

  private drawWebcamBubble(): void {
    const { webcamSize, webcamMargin, webcamPosition, width, height } = this.config;
    const radius = webcamSize / 2;

    // Calculate center position
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
    }

    const ctx = this.ctx;
    const v = this.webcamVideo;
    const vw = v.videoWidth;
    const vh = v.videoHeight;

    if (!vw || !vh) return;

    // Save state
    ctx.save();

    // Shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 4;

    // Circle clip path
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Reset shadow for image
    ctx.shadowColor = 'transparent';

    // Center-crop webcam to square, then mirror (selfie mode)
    const cropSize = Math.min(vw, vh);
    const cropX = (vw - cropSize) / 2;
    const cropY = (vh - cropSize) / 2;

    // Mirror horizontally (selfie mode)
    ctx.translate(cx, cy);
    ctx.scale(-1, 1);
    ctx.drawImage(
      v,
      cropX, cropY, cropSize, cropSize,
      -radius, -radius, webcamSize, webcamSize
    );

    // Restore
    ctx.restore();

    // White border ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // --- Public API ---

  setWebcamVisible(visible: boolean): void {
    this.config.showWebcam = visible;
  }

  setWebcamPosition(position: WebcamPosition): void {
    this.config.webcamPosition = position;
  }

  setWebcamSize(size: number): void {
    this.config.webcamSize = size;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getOutputStream(): MediaStream | null {
    return this.outputStream;
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.outputStream?.getTracks().forEach((t) => t.stop());
    this.outputStream = null;

    this.screenVideo.srcObject = null;
    this.webcamVideo.srcObject = null;
    this.screenVideo.remove();
    this.webcamVideo.remove();
  }
}
