import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { recordingStore, isRecording, isPaused, isIdle, canRecord } from '$lib/stores/recordingStore';

describe('recordingStore', () => {
  beforeEach(() => {
    recordingStore.reset();
  });

  it('starts in idle state', () => {
    const state = get(recordingStore);
    expect(state.status).toBe('idle');
    expect(state.elapsedSeconds).toBe(0);
    expect(state.error).toBeNull();
    expect(state.webcamEnabled).toBe(true);
    expect(state.micEnabled).toBe(true);
  });

  it('setStatus changes status', () => {
    recordingStore.setStatus('requesting');
    expect(get(recordingStore).status).toBe('requesting');
  });

  it('setError sets error and status', () => {
    recordingStore.setError('Test error');
    const state = get(recordingStore);
    expect(state.status).toBe('error');
    expect(state.error).toBe('Test error');
  });

  it('toggleWebcam flips webcamEnabled', () => {
    expect(get(recordingStore).webcamEnabled).toBe(true);
    recordingStore.toggleWebcam();
    expect(get(recordingStore).webcamEnabled).toBe(false);
    recordingStore.toggleWebcam();
    expect(get(recordingStore).webcamEnabled).toBe(true);
  });

  it('toggleMic flips micEnabled', () => {
    expect(get(recordingStore).micEnabled).toBe(true);
    recordingStore.toggleMic();
    expect(get(recordingStore).micEnabled).toBe(false);
  });

  it('setWebcamPosition updates position', () => {
    recordingStore.setWebcamPosition('top-left');
    expect(get(recordingStore).webcamPosition).toBe('top-left');
  });

  it('toggleSettings flips showSettings', () => {
    expect(get(recordingStore).showSettings).toBe(false);
    recordingStore.toggleSettings();
    expect(get(recordingStore).showSettings).toBe(true);
  });

  it('setOutput sets blob and filename', () => {
    const blob = new Blob(['test'], { type: 'video/webm' });
    recordingStore.setOutput(blob, 'test.webm');
    const state = get(recordingStore);
    expect(state.status).toBe('completed');
    expect(state.outputBlob).toBe(blob);
    expect(state.outputFilename).toBe('test.webm');
  });

  it('reset restores initial state', () => {
    recordingStore.setStatus('recording');
    recordingStore.toggleWebcam();
    recordingStore.reset();
    const state = get(recordingStore);
    expect(state.status).toBe('idle');
    expect(state.webcamEnabled).toBe(true);
    expect(state.elapsedSeconds).toBe(0);
  });
});

describe('derived stores', () => {
  beforeEach(() => {
    recordingStore.reset();
  });

  it('isRecording is true only when recording', () => {
    expect(get(isRecording)).toBe(false);
    recordingStore.setStatus('recording');
    expect(get(isRecording)).toBe(true);
    recordingStore.setStatus('paused');
    expect(get(isRecording)).toBe(false);
  });

  it('isPaused is true only when paused', () => {
    expect(get(isPaused)).toBe(false);
    recordingStore.setStatus('paused');
    expect(get(isPaused)).toBe(true);
  });

  it('isIdle is true only when idle', () => {
    expect(get(isIdle)).toBe(true);
    recordingStore.setStatus('recording');
    expect(get(isIdle)).toBe(false);
  });

  it('canRecord is true when idle, completed, or error', () => {
    expect(get(canRecord)).toBe(true);

    recordingStore.setStatus('recording');
    expect(get(canRecord)).toBe(false);

    recordingStore.setStatus('completed');
    expect(get(canRecord)).toBe(true);

    recordingStore.setError('test');
    expect(get(canRecord)).toBe(true);

    recordingStore.setStatus('paused');
    expect(get(canRecord)).toBe(false);
  });
});
