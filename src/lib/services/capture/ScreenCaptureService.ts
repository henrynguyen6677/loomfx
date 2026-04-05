/**
 * ScreenCaptureService
 *
 * Wraps getDisplayMedia() with configurable constraints.
 * Handles screen, window, and tab capture with system audio.
 */

export interface ScreenCaptureOptions {
  width?: number;
  height?: number;
  frameRate?: number;
  withAudio?: boolean;
}

export class ScreenCaptureService {
  private stream: MediaStream | null = null;

  async start(options: ScreenCaptureOptions = {}): Promise<MediaStream> {
    const {
      width = 1920,
      height = 1080,
      frameRate = 30,
      withAudio = true,
    } = options;

    const constraints: DisplayMediaStreamOptions = {
      video: {
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: frameRate, max: 60 },
      },
      audio: withAudio,
    };

    this.stream = await navigator.mediaDevices.getDisplayMedia(constraints);

    // Auto-cleanup when user clicks browser's native "Stop sharing"
    const videoTrack = this.stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.addEventListener('ended', () => {
        this.stop();
        window.dispatchEvent(new CustomEvent('loomfx:screen-ended'));
      });
    }

    return this.stream;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  getVideoTrack(): MediaStreamTrack | null {
    return this.stream?.getVideoTracks()[0] ?? null;
  }

  getAudioTrack(): MediaStreamTrack | null {
    return this.stream?.getAudioTracks()[0] ?? null;
  }

  /** Get actual captured resolution (may differ from requested) */
  getResolution(): { width: number; height: number } | null {
    const track = this.getVideoTrack();
    if (!track) return null;
    const settings = track.getSettings();
    return {
      width: settings.width ?? 0,
      height: settings.height ?? 0,
    };
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }

  isActive(): boolean {
    const track = this.getVideoTrack();
    return track?.readyState === 'live';
  }
}
