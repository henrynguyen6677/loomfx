import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { settingsStore } from '$lib/stores/settingsStore';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('settingsStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    settingsStore.reset();
  });

  it('has sensible defaults', () => {
    const state = get(settingsStore);
    expect(state.qualityPreset).toBe('medium');
    expect(state.webcamPosition).toBe('bottom-right');
    expect(state.webcamSize).toBe(180);
    expect(state.countdownEnabled).toBe(true);
    expect(state.countdownSeconds).toBe(3);
    expect(state.theme).toBe('dark');
  });

  it('setQuality updates preset', () => {
    settingsStore.setQuality('high');
    expect(get(settingsStore).qualityPreset).toBe('high');
  });

  it('setWebcamPosition updates position', () => {
    settingsStore.setWebcamPosition('top-left');
    expect(get(settingsStore).webcamPosition).toBe('top-left');
  });

  it('setWebcamSize clamps between 80 and 300', () => {
    settingsStore.setWebcamSize(50);
    expect(get(settingsStore).webcamSize).toBe(80);

    settingsStore.setWebcamSize(500);
    expect(get(settingsStore).webcamSize).toBe(300);

    settingsStore.setWebcamSize(200);
    expect(get(settingsStore).webcamSize).toBe(200);
  });

  it('setCamera updates selected camera', () => {
    settingsStore.setCamera('device-123');
    expect(get(settingsStore).selectedCameraId).toBe('device-123');

    settingsStore.setCamera(null);
    expect(get(settingsStore).selectedCameraId).toBeNull();
  });

  it('setMicrophone updates selected mic', () => {
    settingsStore.setMicrophone('mic-456');
    expect(get(settingsStore).selectedMicId).toBe('mic-456');
  });

  it('setCountdown toggles and updates seconds', () => {
    settingsStore.setCountdown(false);
    expect(get(settingsStore).countdownEnabled).toBe(false);

    settingsStore.setCountdown(true, 5);
    const state = get(settingsStore);
    expect(state.countdownEnabled).toBe(true);
    expect(state.countdownSeconds).toBe(5);
  });

  it('setTheme updates theme', () => {
    settingsStore.setTheme('light');
    expect(get(settingsStore).theme).toBe('light');

    settingsStore.setTheme('system');
    expect(get(settingsStore).theme).toBe('system');
  });
});
