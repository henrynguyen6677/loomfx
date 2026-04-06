<script lang="ts">
  import { recordingStore, isRecording, isPaused } from '$lib/stores/recordingStore';
  import { onMount } from 'svelte';

  let videoEl: HTMLVideoElement | undefined = $state();
  let hasStream = $state(false);

  const { status } = $derived($recordingStore);
  const showPreview = $derived(
    status === 'recording' || status === 'paused' || status === 'countdown' || status === 'stopping'
  );

  onMount(() => {
    const handleStream = (e: Event) => {
      const stream = (e as CustomEvent).detail?.stream as MediaStream;
      if (videoEl && stream) {
        videoEl.srcObject = stream;
        videoEl.play().then(() => {
          hasStream = true;
          console.log('[Vellum] LivePreview: stream attached, readyState:', videoEl?.readyState);
        }).catch((err) => {
          console.error('[Vellum] LivePreview: play failed', err);
        });
      }
    };

    const handleCleanup = () => {
      hasStream = false;
      if (videoEl) {
        videoEl.srcObject = null;
      }
    };

    window.addEventListener('vellum:screen-stream', handleStream);
    window.addEventListener('vellum:recording-cleanup', handleCleanup);

    return () => {
      window.removeEventListener('vellum:screen-stream', handleStream);
      window.removeEventListener('vellum:recording-cleanup', handleCleanup);
    };
  });
</script>

<div class="preview-container" id="live-preview">
  <!-- Single video element — always in DOM, CSS toggles visibility -->
  <video
    bind:this={videoEl}
    class="preview-video"
    class:visible={showPreview && hasStream}
    autoplay
    muted
    playsinline
  ></video>

  <!-- Recording indicator badge -->
  {#if showPreview && hasStream}
    {#if $isRecording}
      <div class="recording-badge">
        <span class="rec-dot"></span>
        REC
      </div>
    {:else if $isPaused}
      <div class="recording-badge paused">
        <span class="rec-dot paused"></span>
        PAUSED
      </div>
    {/if}
  {/if}

  <!-- Placeholder (only when no stream) -->
  {#if !showPreview || !hasStream}
    <div class="preview-placeholder">
      <div class="placeholder-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      </div>
      <h2 class="placeholder-title">Ready to Record</h2>
      <p class="placeholder-subtitle">Click the record button below to share your screen</p>
    </div>
  {/if}
</div>

<style>
  .preview-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-secondary);
    border-radius: var(--radius-lg);
    overflow: hidden;
    position: relative;
  }

  .preview-video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #000;
    opacity: 0;
    pointer-events: none;
    z-index: 1;
  }

  .preview-video.visible {
    opacity: 1;
    pointer-events: auto;
  }

  .recording-badge {
    position: absolute;
    top: var(--space-4);
    left: var(--space-4);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-3);
    background: rgba(239, 68, 68, 0.9);
    color: white;
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.1em;
    backdrop-filter: blur(4px);
    animation: fade-in 0.3s ease;
    z-index: 10;
  }

  .recording-badge.paused {
    background: rgba(245, 158, 11, 0.9);
  }

  .rec-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: white;
    animation: recording-pulse 1.2s infinite;
  }

  .rec-dot.paused {
    animation: none;
    opacity: 0.6;
  }

  .preview-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-8);
    text-align: center;
    animation: fade-in 0.4s ease;
    z-index: 2;
  }

  .placeholder-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: var(--color-bg-tertiary);
    color: var(--color-text-muted);
    margin-bottom: var(--space-2);
  }

  .placeholder-title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .placeholder-subtitle {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
    max-width: 320px;
    line-height: var(--line-height-relaxed);
  }
</style>
