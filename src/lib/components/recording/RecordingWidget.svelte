<script lang="ts">
  import { formatTime } from '$lib/utils/formatTime';
  import { recordingStore, isRecording, isPaused } from '$lib/stores/recordingStore';

  const { status, elapsedSeconds } = $derived($recordingStore);

  const visible = $derived(
    status === 'recording' || status === 'paused' || status === 'countdown'
  );

  function handlePauseResume() {
    if ($isRecording) {
      window.dispatchEvent(new CustomEvent('vellum:pause-recording'));
    } else if ($isPaused) {
      window.dispatchEvent(new CustomEvent('vellum:resume-recording'));
    }
  }

  function handleStop() {
    window.dispatchEvent(new CustomEvent('vellum:stop-recording'));
  }

  function handleDiscard() {
    if (confirm('Discard this recording?')) {
      window.dispatchEvent(new CustomEvent('vellum:stop-recording'));
      setTimeout(() => recordingStore.reset(), 500);
    }
  }
</script>

{#if visible}
  <div class="rec-widget" id="recording-widget">
    <!-- Red dot + timer -->
    <div class="widget-status">
      {#if $isRecording}
        <span class="widget-dot"></span>
      {:else if $isPaused}
        <span class="widget-dot paused"></span>
      {/if}
      <span class="widget-time">{formatTime(elapsedSeconds)}</span>
    </div>

    <!-- Controls -->
    <div class="widget-controls">
      <!-- Pause / Resume -->
      <button
        class="widget-btn"
        onclick={handlePauseResume}
        aria-label={$isRecording ? 'Pause' : 'Resume'}
        title={$isRecording ? 'Pause' : 'Resume'}
      >
        {#if $isRecording}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1"/>
            <rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
        {:else}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6,4 20,12 6,20"/>
          </svg>
        {/if}
      </button>

      <!-- Stop -->
      <button
        class="widget-btn stop"
        onclick={handleStop}
        aria-label="Stop Recording"
        title="Stop & Save"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2"/>
        </svg>
      </button>

      <!-- Discard -->
      <button
        class="widget-btn discard"
        onclick={handleDiscard}
        aria-label="Discard Recording"
        title="Discard"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </div>
{/if}

<style>
  .rec-widget {
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-4);
    background: rgba(20, 20, 40, 0.92);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(239, 68, 68, 0.4);
    border-radius: var(--radius-full);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(239, 68, 68, 0.15);
    z-index: 9999;
    animation: slide-up 0.3s var(--transition-smooth);
    user-select: none;
  }

  @keyframes slide-up {
    from {
      transform: translateX(-50%) translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }

  .widget-status {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .widget-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #ef4444;
    animation: recording-pulse 1.2s infinite;
    flex-shrink: 0;
  }

  .widget-dot.paused {
    background: #f59e0b;
    animation: none;
  }

  .widget-time {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: white;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.05em;
    min-width: 48px;
  }

  .widget-controls {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin-left: var(--space-1);
    padding-left: var(--space-3);
    border-left: 1px solid rgba(255, 255, 255, 0.15);
  }

  .widget-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    color: rgba(255, 255, 255, 0.8);
    transition: all 0.15s ease;
    background: transparent;
  }

  .widget-btn:hover {
    color: white;
    background: rgba(255, 255, 255, 0.15);
  }

  .widget-btn.stop {
    color: #ef4444;
  }

  .widget-btn.stop:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
  }

  .widget-btn.discard {
    color: rgba(255, 255, 255, 0.4);
  }

  .widget-btn.discard:hover {
    color: #f87171;
    background: rgba(239, 68, 68, 0.15);
  }
</style>
