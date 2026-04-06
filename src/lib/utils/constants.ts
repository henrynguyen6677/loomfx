/** Vellum Application Constants */

export const APP_NAME = 'Vellum';
export const APP_VERSION = '0.1.0';
export const APP_DESCRIPTION = 'Free, local-first screen recorder. No cloud, no limits, no cost.';

/** Default recording constraints */
export const RECORDING_DEFAULTS = {
  width: 1920,
  height: 1080,
  fps: 30,
  videoBitrate: 2_500_000,
  audioBitrate: 128_000,
  videoCodec: 'avc1.42001E',
  audioCodec: 'mp4a.40.2',
  sampleRate: 48_000,
  channels: 2,
} as const;

/** Webcam constraints (lower res to save CPU) */
export const WEBCAM_DEFAULTS = {
  width: 640,
  height: 480,
  fps: 30,
  bubbleSize: 180,
  margin: 24,
} as const;

/** Quality presets */
export const QUALITY_PRESETS = {
  low: {
    label: 'Low (720p)',
    width: 1280,
    height: 720,
    fps: 24,
    videoBitrate: 1_000_000,
    audioBitrate: 96_000,
  },
  medium: {
    label: 'Medium (1080p)',
    width: 1920,
    height: 1080,
    fps: 30,
    videoBitrate: 2_500_000,
    audioBitrate: 128_000,
  },
  high: {
    label: 'High (1080p HQ)',
    width: 1920,
    height: 1080,
    fps: 30,
    videoBitrate: 5_000_000,
    audioBitrate: 192_000,
  },
} as const;

/** Webcam position presets */
export type WebcamPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export const WEBCAM_POSITIONS: { value: WebcamPosition; label: string }[] = [
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'top-left', label: 'Top Left' },
];

/** Recording states */
export type RecordingStatus =
  | 'idle'
  | 'requesting'
  | 'countdown'
  | 'recording'
  | 'paused'
  | 'stopping'
  | 'completed'
  | 'error';

/** Keyboard shortcuts */
export const KEYBOARD_SHORTCUTS = {
  startRecording: 'r',
  pauseResume: 'p',
  stopRecording: 's',
  toggleWebcam: 'w',
  toggleMic: 'm',
  openSettings: ',',
  cancelRecording: 'Escape',
} as const;

/** Storage quota warning threshold (500 MB) */
export const STORAGE_WARNING_THRESHOLD = 500 * 1024 * 1024;
