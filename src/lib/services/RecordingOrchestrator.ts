/**
 * RecordingOrchestrator (v3 — Direct Recording)
 *
 * Records the raw screen stream directly with MediaRecorder.
 * No canvas compositor in the recording pipeline = no black video bug.
 * Webcam bubble is a CSS overlay (like Loom), not baked into the video.
 *
 * Flow: getDisplayMedia → MediaRecorder → Blob → Download
 */

import { PermissionManager } from '$lib/services/capture/PermissionManager';
import { AudioMixer } from '$lib/services/compositor/AudioMixer';
import { triggerDownload } from '$lib/services/storage/StorageAdapter';
import { recordingStore } from '$lib/stores/recordingStore';
import { settingsStore } from '$lib/stores/settingsStore';
import { QUALITY_PRESETS } from '$lib/utils/constants';
import { get } from 'svelte/store';

export class RecordingOrchestrator {
  private permissionManager = new PermissionManager();
  private audioMixer: AudioMixer | null = null;
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

    console.log('[LoomFX] Starting recording...', {
      preset: settings.qualityPreset,
      webcam: recordingState.webcamEnabled,
      mic: recordingState.micEnabled,
    });

    try {
      // Check requirements
      const { ok, missing } = this.permissionManager.checkRequirements();
      if (!ok) {
        console.error('[LoomFX] Requirements not met:', missing);
        this.emitToast('error', missing[0]);
        recordingStore.setError(missing[0]);
        this.isStarting = false;
        return;
      }

      recordingStore.setStatus('requesting');

      // 1. Request screen capture (REQUIRED)
      console.log('[LoomFX] Requesting screen capture...');
      const screenResult = await this.permissionManager.requestScreen(true);
      if (!screenResult.granted) {
        console.warn('[LoomFX] Screen capture denied:', screenResult.errorCode);
        this.emitPermissionError(screenResult.errorCode);
        recordingStore.setStatus('idle');
        this.isStarting = false;
        return;
      }
      this.screenStream = screenResult.stream;

      // Auto-stop when user clicks browser "Stop sharing"
      const videoTrack = this.screenStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => {
          window.dispatchEvent(new CustomEvent('loomfx:screen-ended'));
        });
      }

      const screenSettings = videoTrack?.getSettings();
      console.log('[LoomFX] Screen capture granted ✓', {
        width: screenSettings?.width,
        height: screenSettings?.height,
        frameRate: screenSettings?.frameRate,
      });

      // Dispatch screen stream to LivePreview
      window.dispatchEvent(
        new CustomEvent('loomfx:screen-stream', { detail: { stream: this.screenStream } })
      );

      // 2. Request camera (OPTIONAL)
      if (recordingState.webcamEnabled) {
        console.log('[LoomFX] Requesting camera...');
        const camResult = await this.permissionManager.requestCamera(
          settings.selectedCameraId ?? undefined
        );
        if (camResult.granted) {
          this.webcamStream = camResult.stream;
          window.dispatchEvent(
            new CustomEvent('loomfx:webcam-stream', { detail: { stream: this.webcamStream } })
          );
          console.log('[LoomFX] Camera granted ✓');
        } else {
          recordingStore.toggleWebcam();
          this.emitToast('warning', 'Camera unavailable — recording without webcam');
          console.warn('[LoomFX] Camera denied, continuing without');
        }
      }

      // 3. Request microphone (OPTIONAL)
      if (recordingState.micEnabled) {
        console.log('[LoomFX] Requesting microphone...');
        const micResult = await this.permissionManager.requestMicrophone(
          settings.selectedMicId ?? undefined
        );
        if (micResult.granted) {
          this.micStream = micResult.stream;
          console.log('[LoomFX] Microphone granted ✓');
        } else {
          recordingStore.toggleMic();
          this.emitToast('warning', 'Microphone unavailable — recording without audio');
          console.warn('[LoomFX] Mic denied, continuing silently');
        }
      }

      // 4. Build recording stream: screen video + mixed audio
      const recordingStream = new MediaStream();

      // Add screen video track
      this.screenStream.getVideoTracks().forEach((t) => recordingStream.addTrack(t));

      // Mix audio (mic + system audio from screen)
      const hasSystemAudio = this.screenStream.getAudioTracks().length > 0;
      const hasMicAudio = !!this.micStream;

      if (hasSystemAudio || hasMicAudio) {
        this.audioMixer = new AudioMixer();
        await this.audioMixer.resume();

        if (hasMicAudio) {
          this.audioMixer.connectMicrophone(this.micStream!);
        }
        if (hasSystemAudio) {
          this.audioMixer.connectSystemAudio(this.screenStream);
          console.log('[LoomFX] System audio connected ✓');
        }
        this.audioMixer.getOutputStream().getAudioTracks().forEach((t) => recordingStream.addTrack(t));
      }

      console.log('[LoomFX] Recording stream:', {
        videoTracks: recordingStream.getVideoTracks().length,
        audioTracks: recordingStream.getAudioTracks().length,
      });

      // 5. Start MediaRecorder
      this.chunks = [];
      const mimeType = this.getSupportedMimeType();
      console.log('[LoomFX] Using mimeType:', mimeType);

      this.recorder = new MediaRecorder(recordingStream, {
        mimeType,
        videoBitsPerSecond: preset.videoBitrate,
      });

      this.recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.chunks.push(e.data);
        }
      };

      this.recorder.onerror = (e) => {
        console.error('[LoomFX] MediaRecorder error:', e);
        this.emitToast('error', 'Recording failed unexpectedly');
        this.stop();
      };

      // 6. Start with optional countdown
      if (settings.countdownEnabled) {
        recordingStore.setStatus('countdown');
        const onCountdownDone = () => {
          window.removeEventListener('loomfx:countdown-done', onCountdownDone);
          this.recorder?.start(1000);
          recordingStore.setStatus('recording');
          this.emitToast('success', 'Recording started');
          console.log('[LoomFX] 🔴 Recording started (after countdown)');
        };
        window.addEventListener('loomfx:countdown-done', onCountdownDone);
      } else {
        this.recorder.start(1000);
        recordingStore.setStatus('recording');
        this.emitToast('success', 'Recording started');
        console.log('[LoomFX] 🔴 Recording started');
      }

    } catch (err) {
      console.error('[LoomFX] Recording start failed:', err);
      recordingStore.setError((err as Error).message);
      this.emitToast('error', `Failed to start: ${(err as Error).message}`);
      this.cleanupStreams();
    } finally {
      this.isStarting = false;
    }
  }

  async stop(): Promise<void> {
    console.log('[LoomFX] Stopping recording...');

    if (!this.recorder || this.recorder.state === 'inactive') {
      console.warn('[LoomFX] No active recorder to stop');
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
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const filename = `LoomFX_${timestamp}.${ext}`;

          console.log('[LoomFX] Video blob created:', {
            size: `${(blob.size / 1048576).toFixed(1)} MB`,
            type: mimeType,
            chunks: this.chunks.length,
          });

          // Auto-download the file
          triggerDownload(blob, filename);
          console.log('[LoomFX] ✅ Downloaded:', filename);
          this.emitToast('success', `Downloaded: ${filename} (${(blob.size / 1048576).toFixed(1)} MB)`);

          recordingStore.setOutput(blob, filename);
        } catch (err) {
          console.error('[LoomFX] Save failed:', err);
          this.emitToast('error', 'Failed to save recording');
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
      this.emitToast('info', 'Recording paused');
      console.log('[LoomFX] ⏸ Paused');
    }
  }

  resume(): void {
    if (this.recorder?.state === 'paused') {
      this.recorder.resume();
      recordingStore.setStatus('recording');
      this.emitToast('info', 'Recording resumed');
      console.log('[LoomFX] ▶ Resumed');
    }
  }

  private cleanupStreams(): void {
    PermissionManager.stopStream(this.screenStream);
    PermissionManager.stopStream(this.webcamStream);
    PermissionManager.stopStream(this.micStream);
    this.screenStream = null;
    this.webcamStream = null;
    this.micStream = null;
  }

  private cleanup(): void {
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
