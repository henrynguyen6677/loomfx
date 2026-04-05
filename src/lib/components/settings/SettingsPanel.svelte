<script lang="ts">
  import { onMount } from 'svelte';
  import { settingsStore } from '$lib/stores/settingsStore';
  import { recordingStore } from '$lib/stores/recordingStore';
  import { QUALITY_PRESETS, WEBCAM_POSITIONS, type WebcamPosition } from '$lib/utils/constants';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  let cameras = $state<MediaDeviceInfo[]>([]);
  let microphones = $state<MediaDeviceInfo[]>([]);

  const settings = $derived($settingsStore);
  const recording = $derived($recordingStore);

  onMount(() => {
    navigator.mediaDevices?.enumerateDevices().then((devices) => {
      cameras = devices.filter((d) => d.kind === 'videoinput');
      microphones = devices.filter((d) => d.kind === 'audioinput');
    });
  });

  function handleBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('settings-backdrop')) {
      onClose();
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="settings-backdrop" onclick={handleBackdropClick} id="settings-panel">
  <div class="settings-drawer glass">
    <div class="drawer-header">
      <h2 class="drawer-title">Settings</h2>
      <button class="drawer-close" onclick={onClose} aria-label="Close settings">✕</button>
    </div>

    <div class="drawer-body">
      <!-- Quality Preset -->
      <section class="settings-section">
        <h3 class="section-title">Recording Quality</h3>
        <div class="preset-grid">
          {#each Object.entries(QUALITY_PRESETS) as [key, preset]}
            <button
              class="preset-card"
              class:active={settings.qualityPreset === key}
              onclick={() => settingsStore.setQuality(key as 'low' | 'medium' | 'high')}
            >
              <span class="preset-label">{preset.label}</span>
              <span class="preset-detail">{preset.fps}fps • {(preset.videoBitrate / 1_000_000).toFixed(1)} Mbps</span>
            </button>
          {/each}
        </div>
      </section>

      <!-- Webcam Toggle -->
      <section class="settings-section">
        <h3 class="section-title">Webcam</h3>
        <label class="toggle-row">
          <span>Show webcam overlay</span>
          <input
            type="checkbox"
            checked={recording.webcamEnabled}
            onchange={() => recordingStore.toggleWebcam()}
            class="checkbox-input"
          />
        </label>
      </section>

      <!-- Webcam Position (only if enabled) -->
      {#if recording.webcamEnabled}
        <section class="settings-section">
          <h3 class="section-title">Webcam Position</h3>
          <div class="position-grid">
            {#each WEBCAM_POSITIONS as pos}
              <button
                class="position-btn"
                class:active={settings.webcamPosition === pos.value}
                onclick={() => settingsStore.setWebcamPosition(pos.value)}
              >
                {pos.label}
              </button>
            {/each}
          </div>
        </section>

        <!-- Webcam Size -->
        <section class="settings-section">
          <h3 class="section-title">Webcam Size</h3>
          <div class="range-row">
            <input
              type="range"
              min="80"
              max="300"
              step="10"
              value={settings.webcamSize}
              oninput={(e) => settingsStore.setWebcamSize(Number((e.target as HTMLInputElement).value))}
              class="range-input"
            />
            <span class="range-value">{settings.webcamSize}px</span>
          </div>
        </section>
      {/if}

      <!-- Camera Selection -->
      {#if cameras.length > 0}
        <section class="settings-section">
          <h3 class="section-title">Camera</h3>
          <select
            class="select-input"
            value={settings.selectedCameraId ?? ''}
            onchange={(e) => settingsStore.setCamera((e.target as HTMLSelectElement).value || null)}
          >
            <option value="">Default Camera</option>
            {#each cameras as cam}
              <option value={cam.deviceId}>{cam.label || `Camera ${cameras.indexOf(cam) + 1}`}</option>
            {/each}
          </select>
        </section>
      {/if}

      <!-- Microphone Selection -->
      {#if microphones.length > 0}
        <section class="settings-section">
          <h3 class="section-title">Microphone</h3>
          <select
            class="select-input"
            value={settings.selectedMicId ?? ''}
            onchange={(e) => settingsStore.setMicrophone((e.target as HTMLSelectElement).value || null)}
          >
            <option value="">Default Microphone</option>
            {#each microphones as mic}
              <option value={mic.deviceId}>{mic.label || `Microphone ${microphones.indexOf(mic) + 1}`}</option>
            {/each}
          </select>
        </section>
      {/if}

      <!-- Countdown -->
      <section class="settings-section">
        <h3 class="section-title">Countdown</h3>
        <label class="toggle-row">
          <span>Show countdown before recording</span>
          <input
            type="checkbox"
            checked={settings.countdownEnabled}
            onchange={() => settingsStore.setCountdown(!settings.countdownEnabled)}
            class="checkbox-input"
          />
        </label>
      </section>
    </div>
  </div>
</div>

<style>
  .settings-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: var(--z-modal-backdrop);
  }

  .settings-drawer {
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    width: 340px;
    max-width: 85vw;
    display: flex;
    flex-direction: column;
    z-index: var(--z-modal);
    overflow: hidden;
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .drawer-title {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
  }

  .drawer-close {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    transition: all var(--transition-fast);
  }

  .drawer-close:hover {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4) var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    /* Hide scrollbar but keep scrolling */
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .drawer-body::-webkit-scrollbar {
    display: none;
  }

  .settings-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .section-title {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .preset-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .preset-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    text-align: left;
    transition: all var(--transition-normal);
  }

  .preset-card:hover {
    border-color: var(--color-border-hover);
    background: var(--color-surface-hover);
  }

  .preset-card.active {
    border-color: var(--color-primary);
    background: rgba(108, 92, 231, 0.1);
  }

  .preset-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }

  .preset-detail {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .position-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }

  .position-btn {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    font-size: var(--font-size-sm);
    text-align: center;
    transition: all var(--transition-normal);
  }

  .position-btn:hover {
    border-color: var(--color-border-hover);
    background: var(--color-surface-hover);
  }

  .position-btn.active {
    border-color: var(--color-primary);
    background: rgba(108, 92, 231, 0.1);
    color: var(--color-primary-light);
  }

  .range-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .range-input {
    flex: 1;
    appearance: none;
    height: 4px;
    border-radius: 2px;
    background: var(--color-bg-tertiary);
    outline: none;
  }

  .range-input::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--color-primary);
    cursor: pointer;
    transition: transform var(--transition-fast);
  }

  .range-input::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  .range-value {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    font-variant-numeric: tabular-nums;
    min-width: 50px;
    text-align: right;
  }

  .select-input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
    outline: none;
    transition: border-color var(--transition-fast);
  }

  .select-input:focus {
    border-color: var(--color-border-focus);
  }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    cursor: pointer;
  }

  .checkbox-input {
    width: 18px;
    height: 18px;
    accent-color: var(--color-primary);
    cursor: pointer;
  }
</style>
