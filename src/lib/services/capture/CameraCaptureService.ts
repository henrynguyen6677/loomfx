/**
 * CameraCaptureService
 *
 * Wraps getUserMedia() for webcam with low-res constraints
 * to minimize CPU usage (webcam is small circle overlay).
 */

export interface CameraOptions {
  deviceId?: string;
  width?: number;
  height?: number;
  frameRate?: number;
}

export class CameraCaptureService {
  private stream: MediaStream | null = null;

  async start(options: CameraOptions = {}): Promise<MediaStream> {
    const {
      width = 640,
      height = 480,
      frameRate = 30,
      deviceId,
    } = options;

    const constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: frameRate },
        facingMode: 'user',
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      },
      audio: false, // Audio handled by MicrophoneCaptureService
    };

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    return this.stream;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  getVideoTrack(): MediaStreamTrack | null {
    return this.stream?.getVideoTracks()[0] ?? null;
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
