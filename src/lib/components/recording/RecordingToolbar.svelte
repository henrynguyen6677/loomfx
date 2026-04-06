<script lang="ts">
  import { formatTime } from '$lib/utils/formatTime';
  import { recordingStore, isRecording, isPaused, canRecord } from '$lib/stores/recordingStore';
  import { settingsStore } from '$lib/stores/settingsStore';
  import { QUALITY_PRESETS } from '$lib/utils/constants';

  const { status, elapsedSeconds, webcamEnabled, micEnabled, recordingSize } = $derived($recordingStore);
  const { qualityPreset } = $derived($settingsStore);

  const isRequesting = $derived(status === 'requesting' || status === 'stopping' || status === 'countdown');
  const isActiveRecording = $derived(status === 'recording' || status === 'paused');
  const isIdle = $derived(status === 'idle' || status === 'completed' || status === 'error');

  const qualityLabel = $derived(QUALITY_PRESETS[qualityPreset]?.label ?? 'Medium');

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  function handleStartStop() {
    if (isRequesting) return;
    if ($canRecord) {
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

  function handleOpenSettings() {
    recordingStore.toggleSettings();
  }

  const qualityKeys = ['low', 'medium', 'high'] as const;
  function cycleQuality() {
    const idx = qualityKeys.indexOf(qualityPreset as typeof qualityKeys[number]);
    const next = qualityKeys[(idx + 1) % qualityKeys.length];
    settingsStore.setQuality(next);
  }
</script>

<div class="toolbar glass" id="recording-toolbar">
  <!-- Left section -->
  <div class="toolbar-left">
    {#if isIdle}
      <!-- Clickable quality badge cycling Low → Medium → High -->
      <button class="config-badge" onclick={cycleQuality} title="Click to change quality">
        {qualityLabel}
      </button>
    {:else}
      <!-- Timer during recording -->
      <div class="toolbar-timer" class:active={isActiveRecording}>
        {#if $isRecording}
          <span class="timer-dot recording-pulse"></span>
        {:else if $isPaused}
          <span class="timer-dot paused"></span>
        {:else if isRequesting}
          <span class="timer-dot requesting"></span>
        {/if}
        <span class="timer-text">{formatTime(elapsedSeconds)}</span>
        {#if isActiveRecording && recordingSize > 0}
          <span class="size-sep"></span>
          <span class="size-text">{formatSize(recordingSize)}</span>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Center Controls -->
  <div class="toolbar-controls">
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

    <!-- Settings Button -->
    <button
      class="toggle-btn settings-btn"
      onclick={handleOpenSettings}
      aria-label="Open Settings"
      title="Settings"
      id="btn-settings"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
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
    max-width: 600px;
    width: auto;
    z-index: var(--z-sticky);
  }

  /* Config badge (idle - clickable quality selector) */
  .config-badge {
    padding: 4px 12px;
    border-radius: 100px;
    background: rgba(108, 92, 231, 0.15);
    color: var(--color-primary-light);
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-xs);
    white-space: nowrap;
    cursor: pointer;
    transition: all 0.15s;
    border: 1px solid transparent;
  }
  .config-badge:hover {
    background: rgba(108, 92, 231, 0.25);
    border-color: rgba(108, 92, 231, 0.3);
  }

  .toolbar-left {
    min-width: 120px;
  }

  /* Timer (recording state) */
  .toolbar-timer {
    display: flex;
    align-items: center;
    gap: var(--space-2);
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

  .size-sep {
    width: 1px;
    height: 14px;
    background: rgba(255, 255, 255, 0.15);
    margin: 0 2px;
  }

  .size-text {
    font-size: 11px;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
    opacity: 0.7;
  }

  /* Controls */
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

  /* Toggles */
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

  .settings-btn {
    border-left: 1px solid var(--color-border);
    border-radius: 0 var(--radius-md) var(--radius-md) 0;
    padding-left: var(--space-2);
    margin-left: var(--space-1);
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
      min-width: auto;
      width: calc(100% - var(--space-6));
      max-width: 480px;
      padding: 0 var(--space-4);
      bottom: var(--space-3);
      height: 60px;
    }
    .toolbar-left { min-width: 100px; }
    .control-btn.primary { width: 44px; height: 44px; }
    .control-btn.secondary { width: 34px; height: 34px; }
    .toggle-btn { width: 34px; height: 34px; }
    .config-badge { font-size: 10px; }
  }

  @media (max-width: 480px) {
    .toolbar {
      width: calc(100% - var(--space-4));
      max-width: none;
      padding: 0 var(--space-3);
      bottom: var(--space-2);
      height: 54px;
      border-radius: var(--radius-xl);
    }
    .toolbar-left { min-width: 50px; }
    .timer-text { font-size: var(--font-size-xs); }
    .control-btn.primary { width: 40px; height: 40px; }
    .control-btn.secondary { width: 30px; height: 30px; }
    .toggle-btn { width: 30px; height: 30px; }
    .config-badge { font-size: 10px; }
  }
</style>
