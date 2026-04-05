<script lang="ts">
  import { formatTime } from '$lib/utils/formatTime';
  import { recordingStore, isRecording, isPaused, canRecord } from '$lib/stores/recordingStore';

  const { status, elapsedSeconds, webcamEnabled, micEnabled } = $derived($recordingStore);

  const isRequesting = $derived(status === 'requesting' || status === 'stopping' || status === 'countdown');
  const isActiveRecording = $derived(status === 'recording' || status === 'paused');

  function handleStartStop() {
    if (isRequesting) return; // Debounce — ignore clicks while processing

    if ($canRecord) {
      // Don't setStatus here — let the orchestrator handle state transitions
      window.dispatchEvent(new CustomEvent('loomfx:start-recording'));
    } else if ($isRecording || $isPaused) {
      window.dispatchEvent(new CustomEvent('loomfx:stop-recording'));
    }
  }

  function handlePauseResume() {
    if ($isRecording) {
      window.dispatchEvent(new CustomEvent('loomfx:pause-recording'));
    } else if ($isPaused) {
      window.dispatchEvent(new CustomEvent('loomfx:resume-recording'));
    }
  }

  function handleToggleWebcam() {
    recordingStore.toggleWebcam();
    window.dispatchEvent(new CustomEvent('loomfx:toggle-webcam', { detail: { enabled: !webcamEnabled } }));
  }

  function handleToggleMic() {
    recordingStore.toggleMic();
    window.dispatchEvent(new CustomEvent('loomfx:toggle-mic', { detail: { enabled: !micEnabled } }));
  }
</script>

<div class="toolbar glass" id="recording-toolbar">
  <!-- Timer -->
  <div class="toolbar-timer" class:active={isActiveRecording}>
    {#if $isRecording}
      <span class="timer-dot recording-pulse"></span>
    {:else if $isPaused}
      <span class="timer-dot paused"></span>
    {:else if isRequesting}
      <span class="timer-dot requesting"></span>
    {/if}
    <span class="timer-text">{formatTime(elapsedSeconds)}</span>
  </div>

  <!-- Center Controls -->
  <div class="toolbar-controls">
    <!-- Start / Stop Button -->
    <button
      class="control-btn primary"
      class:recording={isActiveRecording}
      class:requesting={isRequesting}
      onclick={handleStartStop}
      disabled={isRequesting}
      aria-label={$canRecord ? 'Start Recording' : isRequesting ? 'Processing...' : 'Stop Recording'}
      id="btn-start-stop"
    >
      {#if isRequesting}
        <!-- Spinner -->
        <svg class="spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="8" stroke-dasharray="25 25" stroke-linecap="round"/>
        </svg>
      {:else if $canRecord}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8"/>
        </svg>
      {:else}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2"/>
        </svg>
      {/if}
    </button>

    <!-- Pause / Resume (only during active recording) -->
    {#if isActiveRecording}
      <button
        class="control-btn secondary"
        onclick={handlePauseResume}
        aria-label={$isRecording ? 'Pause' : 'Resume'}
        id="btn-pause-resume"
      >
        {#if $isRecording}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1"/>
            <rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
        {:else}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6,4 20,12 6,20"/>
          </svg>
        {/if}
      </button>
    {/if}
  </div>

  <!-- Right Controls -->
  <div class="toolbar-toggles">
    <!-- Webcam Toggle -->
    <button
      class="toggle-btn"
      class:active={webcamEnabled}
      onclick={handleToggleWebcam}
      aria-label={webcamEnabled ? 'Disable Webcam' : 'Enable Webcam'}
      id="btn-toggle-webcam"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 7l-7 5 7 5V7z"/>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
      {#if !webcamEnabled}
        <span class="toggle-slash"></span>
      {/if}
    </button>

    <!-- Mic Toggle -->
    <button
      class="toggle-btn"
      class:active={micEnabled}
      onclick={handleToggleMic}
      aria-label={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
      id="btn-toggle-mic"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
      {#if !micEnabled}
        <span class="toggle-slash"></span>
      {/if}
    </button>
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--toolbar-height);
    padding: 0 var(--space-6);
    position: fixed;
    bottom: var(--space-6);
    left: 50%;
    transform: translateX(-50%);
    border-radius: var(--radius-2xl);
    min-width: 420px;
    max-width: 560px;
    width: auto;
    z-index: var(--z-sticky);
  }

  .toolbar-timer {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 90px;
    opacity: 0.4;
    transition: opacity var(--transition-normal);
  }

  .toolbar-timer.active {
    opacity: 1;
  }

  .timer-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--color-recording);
    flex-shrink: 0;
  }

  .timer-dot.paused {
    background: var(--color-paused);
    animation: none;
  }

  .timer-dot.requesting {
    background: var(--color-primary);
    animation: recording-pulse 1.2s infinite;
  }

  .timer-text {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
  }

  .toolbar-controls {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all var(--transition-smooth);
  }

  .control-btn.primary {
    width: 52px;
    height: 52px;
    background: var(--color-primary);
    color: white;
    box-shadow: var(--shadow-glow-primary);
  }

  .control-btn.primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
    transform: scale(1.08);
  }

  .control-btn.primary:active:not(:disabled) {
    transform: scale(0.95);
  }

  .control-btn.primary:disabled {
    cursor: wait;
    opacity: 0.7;
  }

  .control-btn.primary.recording {
    background: var(--color-recording);
    box-shadow: var(--shadow-glow-recording);
  }

  .control-btn.primary.recording:hover:not(:disabled) {
    background: #dc2626;
  }

  .control-btn.primary.requesting {
    background: var(--color-primary);
    opacity: 0.8;
  }

  .control-btn.secondary {
    width: 42px;
    height: 42px;
    background: var(--color-surface);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
  }

  .control-btn.secondary:hover {
    background: var(--color-surface-hover);
    border-color: var(--color-border-hover);
  }

  .toolbar-toggles {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .toggle-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    transition: all var(--transition-normal);
  }

  .toggle-btn.active {
    color: var(--color-text-primary);
    background: var(--color-surface);
  }

  .toggle-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }

  .toggle-slash {
    position: absolute;
    width: 2px;
    height: 24px;
    background: var(--color-error);
    transform: rotate(45deg);
    border-radius: 1px;
    pointer-events: none;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .toolbar {
      min-width: 320px;
      padding: 0 var(--space-4);
    }
    .control-btn.primary { width: 46px; height: 46px; }
    .control-btn.secondary { width: 36px; height: 36px; }
    .toggle-btn { width: 36px; height: 36px; }
  }

  @media (max-width: 480px) {
    .toolbar {
      min-width: 280px;
      max-width: 95vw;
      padding: 0 var(--space-3);
    }
    .toolbar-timer { min-width: 60px; }
    .timer-text { font-size: var(--font-size-sm); }
  }
</style>
