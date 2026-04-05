/**
 * MicrophoneCaptureService
 *
 * Wraps getUserMedia() for microphone with echo cancellation
 * and noise suppression enabled by default.
 */

export interface MicrophoneOptions {
  deviceId?: string;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export class MicrophoneCaptureService {
  private stream: MediaStream | null = null;

  async start(options: MicrophoneOptions = {}): Promise<MediaStream> {
    const {
      deviceId,
      echoCancellation = true,
      noiseSuppression = true,
      autoGainControl = true,
    } = options;

    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation,
        noiseSuppression,
        autoGainControl,
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      },
      video: false,
    };

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    return this.stream;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  getAudioTrack(): MediaStreamTrack | null {
    return this.stream?.getAudioTracks()[0] ?? null;
  }

  /** Mute/unmute without stopping the track (preserves stream) */
  setMuted(muted: boolean): void {
    const track = this.getAudioTrack();
    if (track) {
      track.enabled = !muted;
    }
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }

  isActive(): boolean {
    const track = this.getAudioTrack();
    return track?.readyState === 'live';
  }
}
