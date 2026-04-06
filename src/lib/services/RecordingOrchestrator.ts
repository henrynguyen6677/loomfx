/**
 * RecordingOrchestrator (v4 — Canvas Compositor for Webcam)
 *
 * When webcam is enabled: Uses CanvasCompositor to bake webcam circle into video.
 * When webcam is disabled: Records raw screen stream directly.
 *
 * Flow: getDisplayMedia → [Compositor if webcam] → MediaRecorder → Blob → Download
 */

import { detectBrowser, type BrowserCapabilities } from '$lib/utils/browserDetect';
import { PermissionManager } from '$lib/services/capture/PermissionManager';
import { AudioMixer } from '$lib/services/compositor/AudioMixer';
import { CanvasCompositor } from '$lib/services/compositor/CanvasCompositor';
import { recordingStore } from '$lib/stores/recordingStore';
import { settingsStore } from '$lib/stores/settingsStore';
import { QUALITY_PRESETS } from '$lib/utils/constants';
import { get } from 'svelte/store';

export class RecordingOrchestrator {
  private permissionManager = new PermissionManager();
  private audioMixer: AudioMixer | null = null;
  private compositor: CanvasCompositor | null = null;
  private recorder: MediaRecorder | null = null;
  private caps: BrowserCapabilities;

  private screenStream: MediaStream | null = null;
  private webcamStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private isStarting = false;

  constructor() {
    this.caps = detectBrowser();
    this.bindEvents();
    console.log('[Vellum] RecordingOrchestrator initialized');
  }

  private bindEvents(): void {
    window.addEventListener('vellum:start-recording', () => this.start());
    window.addEventListener('vellum:stop-recording', () => this.stop());
    window.addEventListener('vellum:pause-recording', () => this.pause());
    window.addEventListener('vellum:resume-recording', () => this.resume());
    window.addEventListener('vellum:toggle-mic', (e) => {
      const enabled = (e as CustomEvent).detail?.enabled;
      this.audioMixer?.muteMic(!enabled);
    });
    window.addEventListener('vellum:screen-ended', () => {
      console.log('[Vellum] Screen sharing ended by user');
      this.stop();
    });
  }

  async start(): Promise<void> {
    if (this.isStarting) return;
    this.isStarting = true;

    const settings = get(settingsStore);
    const preset = QUALITY_PRESETS[settings.qualityPreset];
    const recordingState = get(recordingStore);
    const useWebcam = recordingState.webcamEnabled;

    console.log('[Vellum] Starting recording...', {
      preset: settings.qualityPreset,
      webcam: useWebcam,
      mic: recordingState.micEnabled,
      isMobile: this.caps.isMobile
    });

    try {
      const { ok, missing } = this.permissionManager.checkRequirements();
      if (!ok) {
        this.emitToast('error', missing[0]);
        recordingStore.setError(missing[0]);
        this.isStarting = false;
        return;
      }

      recordingStore.setStatus('requesting');

      // 1. Screen capture (REQUIRED on desktop, SKIPPED on mobile)
      if (!this.caps.isMobile) {
        const screenResult = await this.permissionManager.requestScreen(true);
        if (!screenResult.granted) {
          if (screenResult.errorCode.startsWith('USER_CANCELLED')) {
            console.log('[Vellum] User cancelled screen picker');
          } else {
            this.emitPermissionError(screenResult.errorCode);
          }
          recordingStore.setStatus('idle');
          this.isStarting = false;
          return;
        }
        this.screenStream = screenResult.stream;

        const videoTrack = this.screenStream.getVideoTracks()[0];
        videoTrack?.addEventListener('ended', () => {
          window.dispatchEvent(new CustomEvent('vellum:screen-ended'));
        });

        const vs = videoTrack?.getSettings();
        console.log('[Vellum] Screen ✓', { w: vs?.width, h: vs?.height });

        // Dispatch to LivePreview
        window.dispatchEvent(
          new CustomEvent('vellum:screen-stream', { detail: { stream: this.screenStream } })
        );
      } else {
        console.log('[Vellum] Mobile mode: Skipping screen capture');
        if (!this.caps.hasGetDisplayMedia) {
          this.emitPermissionError('MOBILE_CAMERA_ONLY');
        }
        // On mobile, if neither camera nor screen is selected, we MUST have camera
        if (!useWebcam) {
          recordingStore.toggleWebcam();
        }
      }

      // 2. Camera (OPTIONAL)
      if (useWebcam) {
        const camResult = await this.permissionManager.requestCamera(
          settings.selectedCameraId ?? undefined
        );
        if (camResult.granted) {
          this.webcamStream = camResult.stream;
          recordingStore.setWebcamStream(this.webcamStream);
          console.log('[Vellum] Camera ✓');
        } else {
          recordingStore.toggleWebcam();
          this.emitToast('warning', 'Camera unavailable — recording without webcam');
        }
      }

      // 3. Microphone (OPTIONAL)
      if (recordingState.micEnabled) {
        const micResult = await this.permissionManager.requestMicrophone(
          settings.selectedMicId ?? undefined
        );
        if (micResult.granted) {
          this.micStream = micResult.stream;
          console.log('[Vellum] Mic ✓');
        } else {
          recordingStore.toggleMic();
          this.emitToast('warning', 'Microphone unavailable — recording silently');
        }
      }

      // 4. Build recording stream
      const recordingStream = new MediaStream();
      const hasWebcamNow = !!this.webcamStream;

      if (hasWebcamNow) {
        // Use canvas compositor
        let targetW = 1920;
        let targetH = 1080;

        if (this.screenStream) {
          const vs = this.screenStream.getVideoTracks()[0]?.getSettings();
          targetW = vs?.width ?? 1920;
          targetH = vs?.height ?? 1080;
        } else if (this.webcamStream) {
          const vs = this.webcamStream.getVideoTracks()[0]?.getSettings();
          targetW = vs?.width ?? 1280;
          targetH = vs?.height ?? 720;
        }

        this.compositor = new CanvasCompositor({
          width: targetW,
          height: targetH,
          fps: preset.fps,
          webcamSize: settings.webcamSize,
          webcamPosition: settings.webcamPosition,
          showWebcam: true,
        });

        await this.compositor.attachScreenStream(this.screenStream);
        await this.compositor.attachWebcamStream(this.webcamStream!);
        const compositorStream = this.compositor.start();
        compositorStream.getVideoTracks().forEach((t) => recordingStream.addTrack(t));
        console.log('[Vellum] Compositor started ✓');
      } else if (this.screenStream) {
        // Direct screen recording (no compositor needed)
        this.screenStream!.getVideoTracks().forEach((t) => recordingStream.addTrack(t));
        console.log('[Vellum] Direct screen recording (no webcam)');
      }

      // Audio mixing
      const hasSystemAudio = (this.screenStream?.getAudioTracks().length ?? 0) > 0;
      const hasMicAudio = !!this.micStream;

      if (hasSystemAudio || hasMicAudio) {
        this.audioMixer = new AudioMixer();
        await this.audioMixer.resume();
        if (hasMicAudio) this.audioMixer.connectMicrophone(this.micStream!);
        if (hasSystemAudio && this.screenStream) {
          this.audioMixer.connectSystemAudio(this.screenStream);
          console.log('[Vellum] System audio ✓');
        }
        this.audioMixer!.getOutputStream().getAudioTracks().forEach((t) => recordingStream.addTrack(t));
      }

      // 5. MediaRecorder
      this.chunks = [];
      const mimeType = this.getSupportedMimeType();

      this.recorder = new MediaRecorder(recordingStream, {
        mimeType,
        videoBitsPerSecond: preset.videoBitrate,
      });

      this.recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.chunks.push(e.data);
          recordingStore.addRecordingSize(e.data.size);
        }
      };

      this.recorder.onerror = () => {
        this.emitToast('error', 'Recording failed');
        this.stop();
      };

      // 6. Start (with optional countdown)
      if (settings.countdownEnabled) {
        recordingStore.setStatus('countdown');
        const onDone = () => {
          window.removeEventListener('vellum:countdown-done', onDone);
          this.recorder?.start(1000);
          recordingStore.setStatus('recording');
          this.emitToast('success', 'Recording started');
          console.log('[Vellum] 🔴 Recording started');
        };
        window.addEventListener('vellum:countdown-done', onDone);
      } else {
        this.recorder.start(1000);
        recordingStore.setStatus('recording');
        this.emitToast('success', 'Recording started');
        console.log('[Vellum] 🔴 Recording started');
      }

    } catch (err) {
      console.error('[Vellum] Start failed:', err);
      recordingStore.setError((err as Error).message);
      this.emitToast('error', `Failed: ${(err as Error).message}`);
      this.cleanupStreams();
    } finally {
      this.isStarting = false;
    }
  }

  async stop(): Promise<void> {
    if (!this.recorder || this.recorder.state === 'inactive') {
      this.cleanup();
      recordingStore.setStatus('idle');
      return;
    }

    recordingStore.setStatus('stopping');

    return new Promise<void>((resolve) => {
      this.recorder!.onstop = async () => {
        try {
          const mimeType = this.recorder?.mimeType ?? 'video/webm';
          const blob = new Blob(this.chunks, { type: mimeType });
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const filename = `Vellum_${ts}.${ext}`;

          console.log('[Vellum] Video:', {
            size: `${(blob.size / 1048576).toFixed(1)} MB`,
            chunks: this.chunks.length,
          });

          recordingStore.setOutput(blob, filename);
          this.emitToast('success', 'Recording complete!');
        } catch (err) {
          console.error('[Vellum] Save failed:', err);
          this.emitToast('error', 'Failed to save');
          recordingStore.setStatus('error');
        }

        this.cleanup();
        resolve();
      };

      this.recorder!.stop();
    });
  }

  pause(): void {
    if (this.recorder?.state === 'recording') {
      this.recorder.pause();
      recordingStore.setStatus('paused');
      this.emitToast('info', 'Paused');
    }
  }

  resume(): void {
    if (this.recorder?.state === 'paused') {
      this.recorder.resume();
      recordingStore.setStatus('recording');
      this.emitToast('info', 'Resumed');
    }
  }

  private cleanupStreams(): void {
    PermissionManager.stopStream(this.screenStream);
    PermissionManager.stopStream(this.webcamStream);
    PermissionManager.stopStream(this.micStream);
    this.screenStream = null;
    this.webcamStream = null;
    this.micStream = null;
    recordingStore.setWebcamStream(null);
  }

  private cleanup(): void {
    this.compositor?.stop();
    this.compositor = null;
    this.audioMixer?.dispose();
    this.audioMixer = null;
    this.cleanupStreams();
    this.recorder = null;
    this.chunks = [];
    window.dispatchEvent(new CustomEvent('vellum:recording-cleanup'));
    console.log('[Vellum] Cleanup complete');
  }

  private getSupportedMimeType(): string {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
    ];
    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    }
    return 'video/webm';
  }

  private emitToast(type: 'success' | 'error' | 'warning' | 'info', message: string): void {
    window.dispatchEvent(new CustomEvent('vellum:toast', { detail: { type, message } }));
  }

  private emitPermissionError(errorCode: string): void {
    window.dispatchEvent(new CustomEvent('vellum:permission-error', { detail: { errorCode } }));
  }

  dispose(): void {
    this.cleanup();
  }
}
