import { writable, derived } from 'svelte/store';
import type { RecordingStatus, WebcamPosition } from '$lib/utils/constants';

/** Recording state store */
interface RecordingState {
  status: RecordingStatus;
  elapsedSeconds: number;
  error: string | null;
  webcamEnabled: boolean;
  micEnabled: boolean;
  webcamPosition: WebcamPosition;
  showSettings: boolean;
  outputBlob: Blob | null;
  outputFilename: string | null;
  webcamStream: MediaStream | null;
}

const initialState: RecordingState = {
  status: 'idle',
  elapsedSeconds: 0,
  error: null,
  webcamEnabled: true,
  micEnabled: true,
  webcamPosition: 'bottom-right',
  showSettings: false,
  outputBlob: null,
  outputFilename: null,
  webcamStream: null,
};

function createRecordingStore() {
  const { subscribe, set, update } = writable<RecordingState>(initialState);

  let timerInterval: ReturnType<typeof setInterval> | null = null;

  function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
      update((s) => ({ ...s, elapsedSeconds: s.elapsedSeconds + 1 }));
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  return {
    subscribe,

    setStatus(status: RecordingStatus) {
      update((s) => ({ ...s, status, error: null }));
      if (status === 'recording') startTimer();
      else if (status === 'paused' || status === 'stopping' || status === 'idle' || status === 'completed') stopTimer();
    },

    setError(error: string) {
      stopTimer();
      update((s) => ({ ...s, status: 'error', error }));
    },

    toggleWebcam() {
      update((s) => ({ ...s, webcamEnabled: !s.webcamEnabled }));
    },

    toggleMic() {
      update((s) => ({ ...s, micEnabled: !s.micEnabled }));
    },

    setWebcamPosition(position: WebcamPosition) {
      update((s) => ({ ...s, webcamPosition: position }));
    },

    setWebcamStream(stream: MediaStream | null) {
      update((s) => ({ ...s, webcamStream: stream }));
    },

    toggleSettings() {
      update((s) => ({ ...s, showSettings: !s.showSettings }));
    },

    setOutput(blob: Blob, filename: string) {
      update((s) => ({
        ...s,
        status: 'completed',
        outputBlob: blob,
        outputFilename: filename,
      }));
    },

    reset() {
      stopTimer();
      set(initialState);
    },
  };
}

export const recordingStore = createRecordingStore();

/** Derived stores for convenience */
export const isRecording = derived(recordingStore, ($s) => $s.status === 'recording');
export const isPaused = derived(recordingStore, ($s) => $s.status === 'paused');
export const isIdle = derived(recordingStore, ($s) => $s.status === 'idle');
export const canRecord = derived(recordingStore, ($s) => $s.status === 'idle' || $s.status === 'completed' || $s.status === 'error');
