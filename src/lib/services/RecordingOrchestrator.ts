/**
 * RecordingOrchestrator (v4 — Canvas Compositor for Webcam)
 *
 * When webcam is enabled: Uses CanvasCompositor to bake webcam circle into video.
 * When webcam is disabled: Records raw screen stream directly.
 *
 * Flow: getDisplayMedia → [Compositor if webcam] → MediaRecorder → Blob → Download
 */

import { PermissionManager } from '$lib/services/capture/PermissionManager';
import { AudioMixer } from '$lib/services/compositor/AudioMixer';
import { CanvasCompositor } from '$lib/services/compositor/CanvasCompositor';
import { triggerDownload } from '$lib/services/storage/StorageAdapter';
import { recordingStore } from '$lib/stores/recordingStore';
import { settingsStore } from '$lib/stores/settingsStore';
import { QUALITY_PRESETS } from '$lib/utils/constants';
import { get } from 'svelte/store';

export class RecordingOrchestrator {
  private permissionManager = new PermissionManager();
  private audioMixer: AudioMixer | null = null;
  private compositor: CanvasCompositor | null = null;
  private recorder: MediaRecorder | null = null;

  private screenStream: MediaStream | null = null;
  private webcamStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private isStarting = false;

  constructor() {
    this.bindEvents();
    console.log('[LoomFX] RecordingOrchestrator initialized');
  }

  private bindEvents(): void {
    window.addEventListener('loomfx:start-recording', () => this.start());
    window.addEventListener('loomfx:stop-recording', () => this.stop());
    window.addEventListener('loomfx:pause-recording', () => this.pause());
    window.addEventListener('loomfx:resume-recording', () => this.resume());
    window.addEventListener('loomfx:toggle-mic', (e) => {
      const enabled = (e as CustomEvent).detail?.enabled;
      this.audioMixer?.muteMic(!enabled);
    });
    window.addEventListener('loomfx:screen-ended', () => {
      console.log('[LoomFX] Screen sharing ended by user');
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

    console.log('[LoomFX] Starting recording...', {
      preset: settings.qualityPreset,
      webcam: useWebcam,
      mic: recordingState.micEnabled,
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

      // 1. Screen capture (REQUIRED)
      const screenResult = await this.permissionManager.requestScreen(true);
      if (!screenResult.granted) {
        // User just clicked Cancel — go back to idle silently
        if (screenResult.errorCode.startsWith('USER_CANCELLED')) {
          console.log('[LoomFX] User cancelled screen picker');
        } else {
          // Actual permission error (e.g. macOS blocked)
          this.emitPermissionError(screenResult.errorCode);
        }
        recordingStore.setStatus('idle');
        this.isStarting = false;
        return;
      }
      this.screenStream = screenResult.stream;

      const videoTrack = this.screenStream.getVideoTracks()[0];
      videoTrack?.addEventListener('ended', () => {
        window.dispatchEvent(new CustomEvent('loomfx:screen-ended'));
      });

      const vs = videoTrack?.getSettings();
      console.log('[LoomFX] Screen ✓', { w: vs?.width, h: vs?.height });

      // Dispatch to LivePreview
      window.dispatchEvent(
        new CustomEvent('loomfx:screen-stream', { detail: { stream: this.screenStream } })
      );

      // 2. Camera (OPTIONAL)
      if (useWebcam) {
        const camResult = await this.permissionManager.requestCamera(
          settings.selectedCameraId ?? undefined
        );
        if (camResult.granted) {
          this.webcamStream = camResult.stream;
          recordingStore.setWebcamStream(this.webcamStream);
          console.log('[LoomFX] Camera ✓');
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
          console.log('[LoomFX] Mic ✓');
        } else {
          recordingStore.toggleMic();
          this.emitToast('warning', 'Microphone unavailable — recording silently');
        }
      }

      // 4. Build recording stream
      const recordingStream = new MediaStream();
      const hasWebcamNow = !!this.webcamStream;

      if (hasWebcamNow) {
        // Use canvas compositor to bake webcam into video
        const screenW = vs?.width ?? 1920;
        const screenH = vs?.height ?? 1080;

        this.compositor = new CanvasCompositor({
          width: screenW,
          height: screenH,
          fps: preset.fps,
          webcamSize: settings.webcamSize,
          webcamPosition: settings.webcamPosition,
          showWebcam: true,
        });

        await this.compositor.attachScreenStream(this.screenStream);
        await this.compositor.attachWebcamStream(this.webcamStream!);
        const compositorStream = this.compositor.start();
        compositorStream.getVideoTracks().forEach((t) => recordingStream.addTrack(t));
        console.log('[LoomFX] Compositor started ✓ (webcam baked into video)');
      } else {
        // Direct screen recording (no compositor needed)
        this.screenStream.getVideoTracks().forEach((t) => recordingStream.addTrack(t));
        console.log('[LoomFX] Direct screen recording (no webcam)');
      }

      // Audio mixing
      const hasSystemAudio = this.screenStream.getAudioTracks().length > 0;
      const hasMicAudio = !!this.micStream;

      if (hasSystemAudio || hasMicAudio) {
        this.audioMixer = new AudioMixer();
        await this.audioMixer.resume();
        if (hasMicAudio) this.audioMixer.connectMicrophone(this.micStream!);
        if (hasSystemAudio) {
          this.audioMixer.connectSystemAudio(this.screenStream);
          console.log('[LoomFX] System audio ✓');
        }
        this.audioMixer.getOutputStream().getAudioTracks().forEach((t) => recordingStream.addTrack(t));
      }

      // 5. MediaRecorder
      this.chunks = [];
      const mimeType = this.getSupportedMimeType();

      this.recorder = new MediaRecorder(recordingStream, {
        mimeType,
        videoBitsPerSecond: preset.videoBitrate,
      });

      this.recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      this.recorder.onerror = () => {
        this.emitToast('error', 'Recording failed');
        this.stop();
      };

      // 6. Start (with optional countdown)
      if (settings.countdownEnabled) {
        recordingStore.setStatus('countdown');
        const onDone = () => {
          window.removeEventListener('loomfx:countdown-done', onDone);
          this.recorder?.start(1000);
          recordingStore.setStatus('recording');
          this.emitToast('success', 'Recording started');
          console.log('[LoomFX] 🔴 Recording started');
        };
        window.addEventListener('loomfx:countdown-done', onDone);
      } else {
        this.recorder.start(1000);
        recordingStore.setStatus('recording');
        this.emitToast('success', 'Recording started');
        console.log('[LoomFX] 🔴 Recording started');
      }

    } catch (err) {
      console.error('[LoomFX] Start failed:', err);
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
          const filename = `LoomFX_${ts}.${ext}`;

          console.log('[LoomFX] Video:', {
            size: `${(blob.size / 1048576).toFixed(1)} MB`,
            chunks: this.chunks.length,
          });

          recordingStore.setOutput(blob, filename);
          this.emitToast('success', 'Recording complete!');
        } catch (err) {
          console.error('[LoomFX] Save failed:', err);
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
    window.dispatchEvent(new CustomEvent('loomfx:recording-cleanup'));
    console.log('[LoomFX] Cleanup complete');
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
    window.dispatchEvent(new CustomEvent('loomfx:toast', { detail: { type, message } }));
  }

  private emitPermissionError(errorCode: string): void {
    window.dispatchEvent(new CustomEvent('loomfx:permission-error', { detail: { errorCode } }));
  }

  dispose(): void {
    this.cleanup();
  }
}
