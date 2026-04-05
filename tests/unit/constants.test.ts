import { describe, it, expect } from 'vitest';
import {
  RECORDING_DEFAULTS,
  WEBCAM_DEFAULTS,
  QUALITY_PRESETS,
  WEBCAM_POSITIONS,
  KEYBOARD_SHORTCUTS,
  STORAGE_WARNING_THRESHOLD,
} from '$lib/utils/constants';

describe('constants', () => {
  describe('RECORDING_DEFAULTS', () => {
    it('has standard 1080p resolution', () => {
      expect(RECORDING_DEFAULTS.width).toBe(1920);
      expect(RECORDING_DEFAULTS.height).toBe(1080);
    });

    it('targets 30fps', () => {
      expect(RECORDING_DEFAULTS.fps).toBe(30);
    });

    it('uses H.264 video codec', () => {
      expect(RECORDING_DEFAULTS.videoCodec).toBe('avc1.42001E');
    });

    it('uses AAC audio codec', () => {
      expect(RECORDING_DEFAULTS.audioCodec).toBe('mp4a.40.2');
    });

    it('uses 48kHz sample rate', () => {
      expect(RECORDING_DEFAULTS.sampleRate).toBe(48000);
    });
  });

  describe('WEBCAM_DEFAULTS', () => {
    it('has lower resolution than screen', () => {
      expect(WEBCAM_DEFAULTS.width).toBeLessThan(RECORDING_DEFAULTS.width);
      expect(WEBCAM_DEFAULTS.height).toBeLessThan(RECORDING_DEFAULTS.height);
    });

    it('has reasonable bubble size and margin', () => {
      expect(WEBCAM_DEFAULTS.bubbleSize).toBeGreaterThan(0);
      expect(WEBCAM_DEFAULTS.margin).toBeGreaterThan(0);
    });
  });

  describe('QUALITY_PRESETS', () => {
    it('has three presets', () => {
      expect(Object.keys(QUALITY_PRESETS)).toHaveLength(3);
    });

    it('low preset is 720p', () => {
      expect(QUALITY_PRESETS.low.width).toBe(1280);
      expect(QUALITY_PRESETS.low.height).toBe(720);
    });

    it('medium preset is 1080p', () => {
      expect(QUALITY_PRESETS.medium.width).toBe(1920);
      expect(QUALITY_PRESETS.medium.height).toBe(1080);
    });

    it('high has higher bitrate than medium', () => {
      expect(QUALITY_PRESETS.high.videoBitrate).toBeGreaterThan(
        QUALITY_PRESETS.medium.videoBitrate
      );
    });

    it('all presets have labels', () => {
      Object.values(QUALITY_PRESETS).forEach((preset) => {
        expect(preset.label).toBeTruthy();
      });
    });
  });

  describe('WEBCAM_POSITIONS', () => {
    it('has four corner positions', () => {
      expect(WEBCAM_POSITIONS).toHaveLength(4);
    });

    it('each position has value and label', () => {
      WEBCAM_POSITIONS.forEach((pos) => {
        expect(pos.value).toBeTruthy();
        expect(pos.label).toBeTruthy();
      });
    });
  });

  describe('KEYBOARD_SHORTCUTS', () => {
    it('has all required shortcuts', () => {
      expect(KEYBOARD_SHORTCUTS.startRecording).toBe('r');
      expect(KEYBOARD_SHORTCUTS.pauseResume).toBe('p');
      expect(KEYBOARD_SHORTCUTS.stopRecording).toBe('s');
      expect(KEYBOARD_SHORTCUTS.toggleWebcam).toBe('w');
      expect(KEYBOARD_SHORTCUTS.toggleMic).toBe('m');
      expect(KEYBOARD_SHORTCUTS.cancelRecording).toBe('Escape');
    });
  });

  describe('STORAGE_WARNING_THRESHOLD', () => {
    it('is 500MB', () => {
      expect(STORAGE_WARNING_THRESHOLD).toBe(500 * 1024 * 1024);
    });
  });
});
