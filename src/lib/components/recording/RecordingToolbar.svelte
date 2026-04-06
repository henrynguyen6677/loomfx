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
  <!-- LEFT: Timer / Quality -->
  <div class="toolbar-section left">
    {#if isIdle}
      <button class="quality-pill" onclick={cycleQuality} title="Click to change quality">
        {qualityLabel}
      </button>
    {:else}
      <div class="timer-stack">
        <div class="timer-row">
          {#if $isRecording}
            <span class="timer-dot recording-pulse"></span>
          {:else if $isPaused}
            <span class="timer-dot paused"></span>
          {:else if isRequesting}
            <span class="timer-dot requesting"></span>
          {/if}
          <span class="timer-text">{formatTime(elapsedSeconds)}</span>
        </div>
        {#if isActiveRecording && recordingSize > 0}
          <span class="size-text">{formatSize(recordingSize)}</span>
        {/if}
      </div>
    {/if}
  </div>

  <!-- CENTER: Record/Stop + Pause -->
  <div class="toolbar-section center">
    <button
      class="rec-btn"
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>
      {:else}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
      {/if}
    </button>

    {#if isActiveRecording}
      <button
        class="ctrl-btn"
        onclick={handlePauseResume}
        aria-label={$isRecording ? 'Pause' : 'Resume'}
        id="btn-pause-resume"
      >
        {#if $isRecording}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        {:else}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>
        {/if}
      </button>
    {/if}
  </div>

  <!-- RIGHT: Toggles + Settings -->
  <div class="toolbar-section right">
    <button
      class="icon-btn"
      class:active={webcamEnabled}
      onclick={handleToggleWebcam}
      aria-label={webcamEnabled ? 'Disable Webcam' : 'Enable Webcam'}
      id="btn-toggle-webcam"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
      {#if !webcamEnabled}<span class="slash"></span>{/if}
    </button>

    <button
      class="icon-btn"
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
      {#if !micEnabled}<span class="slash"></span>{/if}
    </button>

    <span class="divider"></span>

    <button
      class="icon-btn"
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
  /* ─── Toolbar Shell ─── */
  .toolbar {
    display: flex;
    align-items: center;
    height: var(--toolbar-height);
    padding: 0 var(--space-5);
    position: fixed;
    bottom: var(--space-6);
    left: 50%;
    transform: translateX(-50%);
    border-radius: var(--radius-2xl);
    min-width: 380px;
    max-width: 520px;
    z-index: var(--z-sticky);
  }

  /* ─── 3-Column Layout ─── */
  .toolbar-section {
    display: flex;
    align-items: center;
  }
  .toolbar-section.left {
    flex: 1;
    justify-content: flex-start;
  }
  .toolbar-section.center {
    flex: 0 0 auto;
    gap: var(--space-2);
    justify-content: center;
  }
  .toolbar-section.right {
    flex: 1;
    justify-content: flex-end;
    gap: 4px;
  }

  /* ─── Quality Pill (idle) ─── */
  .quality-pill {
    padding: 4px 12px;
    border-radius: 100px;
    background: rgba(108, 92, 231, 0.12);
    color: var(--color-primary-light);
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-xs);
    cursor: pointer;
    transition: all 0.15s;
    border: 1px solid rgba(108, 92, 231, 0.15);
  }
  .quality-pill:hover {
    background: rgba(108, 92, 231, 0.22);
    border-color: rgba(108, 92, 231, 0.35);
  }

  /* ─── Timer (recording) ─── */
  .timer-stack {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .timer-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .timer-dot {
    width: 8px;
    height: 8px;
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
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
  }
  .size-text {
    font-size: 10px;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
    padding-left: 16px; /* dot(8px) + gap(8px) */
    opacity: 0.6;
  }

  /* ─── Record / Stop Button ─── */
  .rec-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--color-primary);
    color: white;
    box-shadow: var(--shadow-glow-primary);
    transition: all var(--transition-smooth);
  }
  .rec-btn:hover:not(:disabled) {
    background: var(--color-primary-hover);
    transform: scale(1.06);
  }
  .rec-btn:active:not(:disabled) { transform: scale(0.95); }
  .rec-btn:disabled { cursor: wait; opacity: 0.7; }
  .rec-btn.recording {
    background: var(--color-recording);
    box-shadow: var(--shadow-glow-recording);
  }
  .rec-btn.recording:hover:not(:disabled) { background: #dc2626; }
  .rec-btn.requesting { background: var(--color-primary); opacity: 0.8; }

  /* ─── Control Button (Pause) ─── */
  .ctrl-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: var(--color-surface);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    transition: all var(--transition-normal);
  }
  .ctrl-btn:hover {
    background: var(--color-surface-hover);
    border-color: var(--color-border-hover);
  }

  /* ─── Icon Buttons (cam, mic, settings) ─── */
  .icon-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    transition: all var(--transition-normal);
  }
  .icon-btn.active {
    color: var(--color-text-primary);
  }
  .icon-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--color-text-primary);
  }

  .divider {
    width: 1px;
    height: 20px;
    background: var(--color-border);
    margin: 0 2px;
    flex-shrink: 0;
  }

  .slash {
    position: absolute;
    width: 2px;
    height: 22px;
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

  /* ─── Responsive ─── */
  @media (max-width: 768px) {
    .toolbar {
      min-width: auto;
      width: calc(100% - var(--space-6));
      max-width: 440px;
      padding: 0 var(--space-4);
      bottom: var(--space-3);
      height: 60px;
    }
    .rec-btn { width: 44px; height: 44px; }
    .ctrl-btn { width: 34px; height: 34px; }
    .icon-btn { width: 32px; height: 32px; }
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
    .rec-btn { width: 40px; height: 40px; }
    .ctrl-btn { width: 30px; height: 30px; }
    .icon-btn { width: 28px; height: 28px; }
    .quality-pill { font-size: 10px; padding: 3px 8px; }
  }
</style>
