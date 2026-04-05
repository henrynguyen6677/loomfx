---
name: media-permissions
description: Xử lý permission flow đa trình duyệt, macOS quirks và error recovery cho LoomFX
---

# Media Permissions Skill

## Tổng quan
Skill này chuẩn hóa cách xử lý permission flow cho camera, microphone và screen capture, bao gồm các edge cases đặc thù trên macOS và cross-browser differences.

## Permission Flow Architecture

```
User clicks "Start Recording"
        │
        ▼
┌───────────────────────┐
│ Check Browser Support │
│ - getDisplayMedia?    │
│ - getUserMedia?       │
│ - Secure context?     │
└───────┬───────────────┘
        │
        ▼
┌───────────────────────┐     ┌──────────────────────┐
│ Request Screen Capture│────▶│ OS-level Permission  │
│ getDisplayMedia()     │     │ (macOS: System Prefs)│
└───────┬───────────────┘     └──────────────────────┘
        │
        ├─── Granted ──▶ Continue
        │
        └─── Denied ───▶ Show guidance UI
                         (Cannot proceed without screen)

┌───────────────────────┐
│ Request Camera        │
│ getUserMedia({video}) │
└───────┬───────────────┘
        │
        ├─── Granted ──▶ Show webcam bubble
        └─── Denied ───▶ Hide webcam, continue screen-only

┌───────────────────────┐
│ Request Microphone    │
│ getUserMedia({audio}) │
└───────┬───────────────┘
        │
        ├─── Granted ──▶ Enable audio recording
        └─── Denied ───▶ Continue without audio
```

## 1. Permission Manager

```typescript
// src/services/capture/PermissionManager.ts

export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unavailable';

export interface PermissionState {
  screen: PermissionStatus;
  camera: PermissionStatus;
  microphone: PermissionStatus;
  systemAudio: PermissionStatus;
}

export interface BrowserCapabilities {
  hasGetDisplayMedia: boolean;
  hasGetUserMedia: boolean;
  hasWebCodecs: boolean;
  hasFileSystemAccess: boolean;
  hasOPFS: boolean;
  isSecureContext: boolean;
  isMacOS: boolean;
  isChromium: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  browserName: string;
  browserVersion: string;
}

export class PermissionManager {
  
  /**
   * Detect browser capabilities
   */
  static detectCapabilities(): BrowserCapabilities {
    const ua = navigator.userAgent;
    const isChromium = /Chrome/.test(ua) && !/Edg/.test(ua) || /Edg/.test(ua);
    const isFirefox = /Firefox/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    
    let browserName = 'Unknown';
    let browserVersion = '';
    
    if (/Edg\/(\d+)/.test(ua)) {
      browserName = 'Edge';
      browserVersion = RegExp.$1;
    } else if (/Chrome\/(\d+)/.test(ua)) {
      browserName = 'Chrome';
      browserVersion = RegExp.$1;
    } else if (/Firefox\/(\d+)/.test(ua)) {
      browserName = 'Firefox';
      browserVersion = RegExp.$1;
    } else if (/Version\/(\d+).*Safari/.test(ua)) {
      browserName = 'Safari';
      browserVersion = RegExp.$1;
    }

    return {
      hasGetDisplayMedia: 'getDisplayMedia' in (navigator.mediaDevices || {}),
      hasGetUserMedia: 'getUserMedia' in (navigator.mediaDevices || {}),
      hasWebCodecs: 'VideoEncoder' in window,
      hasFileSystemAccess: 'showSaveFilePicker' in window,
      hasOPFS: 'storage' in navigator && 'getDirectory' in (navigator.storage || {}),
      isSecureContext: window.isSecureContext,
      isMacOS: /Mac/.test(navigator.platform),
      isChromium,
      isFirefox,
      isSafari,
      browserName,
      browserVersion,
    };
  }

  /**
   * Check current permission state for camera and microphone
   * Note: Screen capture permission cannot be pre-queried
   */
  static async checkPermissions(): Promise<Partial<PermissionState>> {
    const state: Partial<PermissionState> = {
      screen: 'prompt', // Screen capture always requires fresh prompt
    };

    try {
      const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      state.camera = cameraPermission.state as PermissionStatus;
    } catch {
      state.camera = 'prompt'; // Firefox doesn't support querying camera permission
    }

    try {
      const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      state.microphone = micPermission.state as PermissionStatus;
    } catch {
      state.microphone = 'prompt';
    }

    return state;
  }

  /**
   * Request screen capture with proper error handling
   */
  static async requestScreenCapture(options?: {
    withAudio?: boolean;
    preferCurrentTab?: boolean;
  }): Promise<{ stream: MediaStream | null; error: string | null }> {
    try {
      const constraints: DisplayMediaStreamOptions = {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: options?.withAudio ?? true,
      };

      // Chrome-specific: prefer current tab
      if (options?.preferCurrentTab) {
        (constraints as any).preferCurrentTab = true;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      return { stream, error: null };
    } catch (err: any) {
      return {
        stream: null,
        error: this.classifyError(err, 'screen'),
      };
    }
  }

  /**
   * Request camera access
   */
  static async requestCamera(deviceId?: string): Promise<{
    stream: MediaStream | null;
    error: string | null;
  }> {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return { stream, error: null };
    } catch (err: any) {
      return {
        stream: null,
        error: this.classifyError(err, 'camera'),
      };
    }
  }

  /**
   * Request microphone access
   */
  static async requestMicrophone(deviceId?: string): Promise<{
    stream: MediaStream | null;
    error: string | null;
  }> {
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
      return { stream, error: null };
    } catch (err: any) {
      return {
        stream: null,
        error: this.classifyError(err, 'microphone'),
      };
    }
  }

  /**
   * Enumerate available devices
   */
  static async getAvailableDevices(): Promise<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  }> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        cameras: devices.filter(d => d.kind === 'videoinput'),
        microphones: devices.filter(d => d.kind === 'audioinput'),
        speakers: devices.filter(d => d.kind === 'audiooutput'),
      };
    } catch {
      return { cameras: [], microphones: [], speakers: [] };
    }
  }

  /**
   * Classify errors into user-friendly messages
   */
  private static classifyError(err: Error, source: string): string {
    const name = err.name;
    const caps = this.detectCapabilities();

    switch (name) {
      case 'NotAllowedError':
        if (source === 'screen' && caps.isMacOS) {
          return 'MACOS_SCREEN_PERMISSION';
          // UI should show: "macOS requires Screen Recording permission.
          // Go to System Settings → Privacy & Security → Screen Recording
          // and enable your browser."
        }
        return `PERMISSION_DENIED_${source.toUpperCase()}`;

      case 'NotFoundError':
        return `DEVICE_NOT_FOUND_${source.toUpperCase()}`;

      case 'NotReadableError':
        return `DEVICE_IN_USE_${source.toUpperCase()}`;

      case 'OverconstrainedError':
        return `CONSTRAINTS_NOT_MET_${source.toUpperCase()}`;

      case 'AbortError':
        return `USER_CANCELLED_${source.toUpperCase()}`;

      default:
        return `UNKNOWN_ERROR_${source.toUpperCase()}: ${err.message}`;
    }
  }

  /**
   * Get user-friendly error message and action
   */
  static getErrorGuidance(errorCode: string): {
    title: string;
    message: string;
    action: string;
    actionUrl?: string;
  } {
    const guides: Record<string, any> = {
      MACOS_SCREEN_PERMISSION: {
        title: 'macOS Screen Recording Permission Required',
        message: 'Your Mac requires you to explicitly grant Screen Recording permission to your browser.',
        action: 'Open System Settings → Privacy & Security → Screen Recording → Enable your browser',
        actionUrl: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
      },
      PERMISSION_DENIED_SCREEN: {
        title: 'Screen Capture Blocked',
        message: 'You denied screen sharing. LoomFX needs this to record your screen.',
        action: 'Click "Start Recording" again and select a screen/window to share.',
      },
      PERMISSION_DENIED_CAMERA: {
        title: 'Camera Access Denied',
        message: 'Camera access was denied. Recording will continue without webcam overlay.',
        action: 'To enable webcam, click the lock icon in the address bar and allow camera access.',
      },
      PERMISSION_DENIED_MICROPHONE: {
        title: 'Microphone Access Denied',
        message: 'Microphone access was denied. Recording will be silent.',
        action: 'To enable audio, click the lock icon in the address bar and allow microphone access.',
      },
      DEVICE_NOT_FOUND_CAMERA: {
        title: 'No Camera Found',
        message: 'No webcam was detected on this device.',
        action: 'Connect a webcam and try again, or continue without webcam.',
      },
      DEVICE_NOT_FOUND_MICROPHONE: {
        title: 'No Microphone Found',
        message: 'No microphone was detected on this device.',
        action: 'Connect a microphone and try again, or continue without audio.',
      },
    };

    return guides[errorCode] ?? {
      title: 'Unknown Error',
      message: `An unexpected error occurred: ${errorCode}`,
      action: 'Please refresh the page and try again.',
    };
  }

  /**
   * Stop all tracks in a MediaStream
   */
  static stopStream(stream: MediaStream | null) {
    stream?.getTracks().forEach(track => {
      track.stop();
      stream.removeTrack(track);
    });
  }
}
```

## 2. macOS-Specific Detection

```typescript
/**
 * Detect if running on macOS and provide specific guidance
 */
export function detectMacOSScreenRecordingIssue(stream: MediaStream): boolean {
  // On macOS, if screen recording permission is not granted,
  // getDisplayMedia() succeeds but returns a black/empty frame
  const videoTrack = stream.getVideoTracks()[0];
  
  if (!videoTrack) return true;

  // Check if track settings indicate a valid capture
  const settings = videoTrack.getSettings();
  if (settings.width === 0 || settings.height === 0) {
    return true; // Likely permission issue
  }

  return false;
}
```

## 3. Recovery Strategies

| Scenario | Recovery |
|:---------|:---------|
| User denies screen → | Cannot proceed, show guidance, retry button |
| User denies camera → | Hide webcam bubble, continue screen-only |
| User denies mic → | Record video without audio |
| macOS blocks screen → | Show System Settings deep link + instructions |
| Device hot-plugged → | Listen `devicechange` event, re-enumerate devices |
| Tab crashes mid-recording → | OPFS/IndexedDB preserves partial data, offer recovery |

## Lưu ý Quan trọng

> **Secure Context Required**: Tất cả media APIs chỉ hoạt động trên HTTPS hoặc localhost. Nếu detect `!window.isSecureContext`, hiện cảnh báo ngay.

> **User Gesture**: `getDisplayMedia()` PHẢI được gọi từ trong event handler của user gesture (click, keypress). Không thể gọi tự động khi page load.

> **Firefox quirk**: Firefox không hỗ trợ `navigator.permissions.query({ name: 'camera' })`. Phải try/catch và fallback về 'prompt'.

> **Safari quirk**: Safari không hỗ trợ `getDisplayMedia` audio track. System audio capture không khả dụng trên Safari.
