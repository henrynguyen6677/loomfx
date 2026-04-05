<script lang="ts">
  import LivePreview from '$lib/components/recording/LivePreview.svelte';
  import RecordingToolbar from '$lib/components/recording/RecordingToolbar.svelte';
  import RecordingWidget from '$lib/components/recording/RecordingWidget.svelte';
  import WebcamBubble from '$lib/components/recording/WebcamBubble.svelte';
  import CountdownOverlay from '$lib/components/recording/CountdownOverlay.svelte';
  import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
  import PermissionPrompt from '$lib/components/common/PermissionPrompt.svelte';
  import { recordingStore } from '$lib/stores/recordingStore';
  import { KEYBOARD_SHORTCUTS } from '$lib/utils/constants';

  const { status, showSettings, error, outputBlob, outputFilename } = $derived($recordingStore);

  let permissionError = $state<string | null>(null);

  // Listen for permission errors
  $effect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      permissionError = detail?.errorCode ?? null;
    };
    window.addEventListener('loomfx:permission-error', handler);
    return () => window.removeEventListener('loomfx:permission-error', handler);
  });

  // Keyboard shortcuts — dispatch events only, let orchestrator handle state
  function handleKeydown(e: KeyboardEvent) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

    switch (e.key.toLowerCase()) {
      case KEYBOARD_SHORTCUTS.startRecording:
        if (status === 'idle' || status === 'completed' || status === 'error') {
          window.dispatchEvent(new CustomEvent('loomfx:start-recording'));
        }
        break;
      case KEYBOARD_SHORTCUTS.pauseResume:
        if (status === 'recording') {
          window.dispatchEvent(new CustomEvent('loomfx:pause-recording'));
        } else if (status === 'paused') {
          window.dispatchEvent(new CustomEvent('loomfx:resume-recording'));
        }
        break;
      case KEYBOARD_SHORTCUTS.stopRecording:
        if (status === 'recording' || status === 'paused') {
          window.dispatchEvent(new CustomEvent('loomfx:stop-recording'));
        }
        break;
      case KEYBOARD_SHORTCUTS.toggleWebcam:
        recordingStore.toggleWebcam();
        break;
      case KEYBOARD_SHORTCUTS.toggleMic:
        recordingStore.toggleMic();
        break;
      case KEYBOARD_SHORTCUTS.openSettings:
        recordingStore.toggleSettings();
        break;
      case KEYBOARD_SHORTCUTS.cancelRecording:
        if (showSettings) recordingStore.toggleSettings();
        if (permissionError) permissionError = null;
        break;
    }
  }

  function handleDownload() {
    if (!outputBlob || !outputFilename) return;
    const url = URL.createObjectURL(outputBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outputFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleNewRecording() {
    recordingStore.reset();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="recording-page" id="recording-page">
  <!-- Live Preview -->
  <LivePreview />

  <!-- Webcam Bubble (visible during recording) -->
  {#if status === 'recording' || status === 'paused' || status === 'countdown'}
    <WebcamBubble />
  {/if}

  <!-- Countdown Overlay -->
  {#if status === 'countdown'}
    <CountdownOverlay />
  {/if}

  <!-- Completed State: Download -->
  {#if status === 'completed' && outputBlob}
    <div class="completed-overlay">
      <div class="completed-card glass">
        <div class="completed-icon">✓</div>
        <h2 class="completed-title">Recording Complete!</h2>
        <p class="completed-subtitle">
          Your video is ready • {(outputBlob.size / (1024 * 1024)).toFixed(1)} MB
        </p>
        <div class="completed-actions">
          <button class="btn-primary" onclick={handleDownload}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Video
          </button>
          <button class="btn-secondary" onclick={handleNewRecording}>
            New Recording
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Floating Recording Widget (visible during recording) -->
  <RecordingWidget />

  <!-- Recording Toolbar -->
  <RecordingToolbar />

  <!-- Settings Panel -->
  {#if showSettings}
    <SettingsPanel onClose={() => recordingStore.toggleSettings()} />
  {/if}

  <!-- Permission Error -->
  {#if permissionError}
    <PermissionPrompt errorCode={permissionError} onDismiss={() => { permissionError = null; }} />
  {/if}
</div>

<style>
  .recording-page {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .completed-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 15, 35, 0.85);
    backdrop-filter: blur(8px);
    z-index: var(--z-modal);
  }

  .completed-card {
    max-width: 420px;
    width: 90vw;
    padding: var(--space-10);
    border-radius: var(--radius-xl);
    text-align: center;
  }

  .completed-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--color-success-bg);
    color: var(--color-success);
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    margin-bottom: var(--space-5);
    border: 2px solid rgba(16, 185, 129, 0.3);
  }

  .completed-title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    margin-bottom: var(--space-2);
  }

  .completed-subtitle {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-8);
  }

  .completed-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-6);
    background: var(--color-primary);
    color: white;
    font-weight: var(--font-weight-semibold);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
    transition: all var(--transition-smooth);
    width: 100%;
  }

  .btn-primary:hover {
    background: var(--color-primary-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-glow-primary);
  }

  .btn-secondary {
    padding: var(--space-3) var(--space-6);
    background: transparent;
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-medium);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    border: 1px solid var(--color-border);
    transition: all var(--transition-normal);
    width: 100%;
  }

  .btn-secondary:hover {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
    border-color: var(--color-border-hover);
  }
</style>
