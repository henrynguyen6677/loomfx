import { writable } from 'svelte/store';
import type { WebcamPosition } from '$lib/utils/constants';

/** Persisted settings store */
interface SettingsState {
  qualityPreset: 'low' | 'medium' | 'high';
  webcamPosition: WebcamPosition;
  webcamSize: number;
  selectedCameraId: string | null;
  selectedMicId: string | null;
  countdownEnabled: boolean;
  countdownSeconds: number;
  theme: 'dark' | 'light' | 'system';
}

const STORAGE_KEY = 'loomfx_settings';

function loadSettings(): SettingsState {
  const defaults: SettingsState = {
    qualityPreset: 'medium',
    webcamPosition: 'bottom-right',
    webcamSize: 180,
    selectedCameraId: null,
    selectedMicId: null,
    countdownEnabled: true,
    countdownSeconds: 3,
    theme: 'dark',
  };

  if (typeof window === 'undefined') return defaults;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaults, ...JSON.parse(saved) };
    }
  } catch {
    // Ignore parse errors
  }

  return defaults;
}

function createSettingsStore() {
  const { subscribe, set, update } = writable<SettingsState>(loadSettings());

  // Persist on every change
  subscribe((state) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Ignore quota errors
      }
    }
  });

  return {
    subscribe,

    setQuality(preset: 'low' | 'medium' | 'high') {
      update((s) => ({ ...s, qualityPreset: preset }));
    },

    setWebcamPosition(position: WebcamPosition) {
      update((s) => ({ ...s, webcamPosition: position }));
    },

    setWebcamSize(size: number) {
      update((s) => ({ ...s, webcamSize: Math.max(80, Math.min(300, size)) }));
    },

    setCamera(deviceId: string | null) {
      update((s) => ({ ...s, selectedCameraId: deviceId }));
    },

    setMicrophone(deviceId: string | null) {
      update((s) => ({ ...s, selectedMicId: deviceId }));
    },

    setCountdown(enabled: boolean, seconds?: number) {
      update((s) => ({
        ...s,
        countdownEnabled: enabled,
        ...(seconds !== undefined ? { countdownSeconds: seconds } : {}),
      }));
    },

    setTheme(theme: 'dark' | 'light' | 'system') {
      update((s) => ({ ...s, theme }));
    },

    reset() {
      const defaults = loadSettings();
      set(defaults);
    },
  };
}

export const settingsStore = createSettingsStore();
