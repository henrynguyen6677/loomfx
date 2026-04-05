<script lang="ts">
  import { APP_NAME } from '$lib/utils/constants';
  import { recordingStore, isRecording } from '$lib/stores/recordingStore';

  let settingsOpen = $state(false);

  function toggleSettings() {
    recordingStore.toggleSettings();
  }
</script>

<header class="header glass">
  <div class="header-left">
    <img src="/favicon.svg" alt="LoomFX" class="header-logo" />
    <h1 class="header-title">{APP_NAME}</h1>
    {#if $isRecording}
      <span class="header-badge recording-pulse">REC</span>
    {/if}
  </div>

  <div class="header-right">
    <button
      class="header-btn"
      onclick={toggleSettings}
      aria-label="Settings"
      id="settings-toggle"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>
    </button>
  </div>
</header>

<style>
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--header-height);
    padding: 0 var(--space-6);
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: var(--z-sticky);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .header-logo {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
  }

  .header-title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.02em;
  }

  .header-badge {
    display: inline-flex;
    align-items: center;
    padding: var(--space-1) var(--space-2);
    background: var(--color-recording);
    color: white;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    border-radius: var(--radius-full);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .header-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    transition: all var(--transition-normal);
  }

  .header-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }
</style>
