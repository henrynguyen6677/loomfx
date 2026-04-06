/**
 * PermissionManager
 *
 * Centralized permission handling with error classification,
 * browser detection, macOS-specific guidance, and graceful degradation.
 */

import { detectBrowser, type BrowserCapabilities } from '$lib/utils/browserDetect';

export type PermissionResult =
  | { granted: true; stream: MediaStream }
  | { granted: false; errorCode: string };

export class PermissionManager {
  private caps: BrowserCapabilities;

  constructor() {
    this.caps = detectBrowser();
  }

  /** Request screen capture — REQUIRED, cannot proceed without */
  async requestScreen(withAudio = true): Promise<PermissionResult> {
    try {
      // Build cross-browser-safe options
      // Only Chromium reliably supports system audio in getDisplayMedia
      const useAudio = withAudio && this.caps.isChromium;

      const options: DisplayMediaStreamOptions = {
        video: true,
        audio: useAudio,
      };

      // Chromium-only: add resolution hints + surface control
      if (this.caps.isChromium) {
        options.video = {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 60 },
        };
        (options as any).surfaceSwitching = 'exclude';
        (options as any).selfBrowserSurface = 'exclude';
      }

      const stream = await navigator.mediaDevices.getDisplayMedia(options);

      // Bring focus back to the Vellum tab after screen picker
      window.focus();

      // Check for macOS black screen issue
      if (this.caps.isMacOS && this.isBlackScreen(stream)) {
        stream.getTracks().forEach((t) => t.stop());
        return { granted: false, errorCode: 'MACOS_SCREEN_PERMISSION' };
      }

      return { granted: true, stream };
    } catch (err) {
      const error = err as Error;

      // macOS + NotFoundError = OS-level screen recording permission not granted
      if (this.caps.isMacOS && error.name === 'NotFoundError') {
        return { granted: false, errorCode: 'MACOS_SCREEN_PERMISSION' };
      }

      return { granted: false, errorCode: this.classifyError(error, 'screen') };
    }
  }

  /** Request camera — OPTIONAL, degrades to screen-only */
  async requestCamera(deviceId?: string): Promise<PermissionResult> {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
          facingMode: 'user',
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return { granted: true, stream };
    } catch (err) {
      return { granted: false, errorCode: this.classifyError(err as Error, 'camera') };
    }
  }

  /** Request microphone — OPTIONAL, degrades to silent recording */
  async requestMicrophone(deviceId?: string): Promise<PermissionResult> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
        video: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return { granted: true, stream };
    } catch (err) {
      return { granted: false, errorCode: this.classifyError(err as Error, 'microphone') };
    }
  }

  /** Enumerate available media devices */
  async getDevices(): Promise<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
  }> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        cameras: devices.filter((d) => d.kind === 'videoinput'),
        microphones: devices.filter((d) => d.kind === 'audioinput'),
      };
    } catch {
      return { cameras: [], microphones: [] };
    }
  }

  /** Check for minimum browser requirements */
  checkRequirements(): { ok: boolean; missing: string[] } {
    const missing: string[] = [];

    if (!this.caps.isSecureContext) {
      missing.push('Secure context (HTTPS or localhost) is required');
    }
    if (!this.caps.hasGetDisplayMedia && !this.caps.isMobile) {
      missing.push('Screen Capture API is not available in this browser');
    }
    if (!this.caps.hasGetUserMedia) {
      missing.push('Camera/Microphone API is not available');
    }

    return { ok: missing.length === 0, missing };
  }

  /** Detect macOS black-screen issue (permission not granted at OS level) */
  private isBlackScreen(stream: MediaStream): boolean {
    const track = stream.getVideoTracks()[0];
    if (!track) return true;
    const settings = track.getSettings();
    return (settings.width ?? 0) === 0 || (settings.height ?? 0) === 0;
  }

  /** Classify error into app-specific error codes */
  private classifyError(err: Error, source: string): string {
    switch (err.name) {
      case 'NotAllowedError':
        // User clicked Cancel on the screen picker — NOT a permission issue
        // macOS permission issues are detected via black-screen check in requestScreen()
        return `USER_CANCELLED_${source.toUpperCase()}`;

      case 'NotFoundError':
        return `DEVICE_NOT_FOUND_${source.toUpperCase()}`;

      case 'NotReadableError':
        return `DEVICE_IN_USE_${source.toUpperCase()}`;

      case 'OverconstrainedError':
        return `CONSTRAINTS_NOT_MET_${source.toUpperCase()}`;

      case 'AbortError':
        return `USER_CANCELLED_${source.toUpperCase()}`;

      default:
        return `UNKNOWN_ERROR_${source.toUpperCase()}`;
    }
  }

  /** Stop all tracks in a stream */
  static stopStream(stream: MediaStream | null): void {
    stream?.getTracks().forEach((t) => {
      t.stop();
      stream.removeTrack(t);
    });
  }
}
