<script lang="ts">
  import { onMount } from 'svelte';
  import { settingsStore } from '$lib/stores/settingsStore';
  import { recordingStore } from '$lib/stores/recordingStore';
  import { QUALITY_PRESETS, WEBCAM_POSITIONS } from '$lib/utils/constants';

  interface Props { onClose: () => void; }
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
    if ((e.target as HTMLElement).classList.contains('settings-backdrop')) onClose();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="settings-backdrop" onclick={handleBackdropClick} id="settings-panel">
  <div class="settings-drawer glass">
    <div class="drawer-header">
      <span class="drawer-title">Settings</span>
      <button class="drawer-close" onclick={onClose} aria-label="Close">✕</button>
    </div>

    <div class="drawer-body">
      <!-- Quality (original card style) -->
      <section class="section">
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

      <!-- Webcam -->
      <div class="row">
        <span class="label">Webcam overlay</span>
        <label class="switch">
          <input type="checkbox" checked={recording.webcamEnabled} onchange={() => recordingStore.toggleWebcam()} />
          <span class="slider"></span>
        </label>
      </div>

      {#if recording.webcamEnabled}
        <!-- Webcam Position -->
        <section class="section">
          <h3 class="section-title">Webcam Position</h3>
          <div class="position-grid">
            {#each WEBCAM_POSITIONS as pos}
              <button
                class="position-btn"
                class:active={settings.webcamPosition === pos.value}
                onclick={() => settingsStore.setWebcamPosition(pos.value)}
              >{pos.label}</button>
            {/each}
          </div>
        </section>

        <!-- Webcam Size -->
        <section class="section">
          <h3 class="section-title">Webcam Size</h3>
          <div class="range-group full">
            <input
              type="range" min="80" max="300" step="10"
              value={settings.webcamSize}
              oninput={(e) => settingsStore.setWebcamSize(Number((e.target as HTMLInputElement).value))}
            />
            <span class="range-val">{settings.webcamSize}px</span>
          </div>
        </section>
      {/if}

      <!-- Camera -->
      {#if cameras.length > 0}
        <div class="row">
          <span class="label">Camera</span>
          <select class="sel" value={settings.selectedCameraId ?? ''} onchange={(e) => settingsStore.setCamera((e.target as HTMLSelectElement).value || null)}>
            <option value="">Default</option>
            {#each cameras as cam}
              <option value={cam.deviceId}>{cam.label || `Camera ${cameras.indexOf(cam) + 1}`}</option>
            {/each}
          </select>
        </div>
      {/if}

      <!-- Microphone -->
      {#if microphones.length > 0}
        <div class="row">
          <span class="label">Microphone</span>
          <select class="sel" value={settings.selectedMicId ?? ''} onchange={(e) => settingsStore.setMicrophone((e.target as HTMLSelectElement).value || null)}>
            <option value="">Default</option>
            {#each microphones as mic}
              <option value={mic.deviceId}>{mic.label || `Mic ${microphones.indexOf(mic) + 1}`}</option>
            {/each}
          </select>
        </div>
      {/if}

      <!-- Countdown -->
      <div class="row">
        <span class="label">Countdown timer</span>
        <label class="switch">
          <input type="checkbox" checked={settings.countdownEnabled} onchange={() => settingsStore.setCountdown(!settings.countdownEnabled)} />
          <span class="slider"></span>
        </label>
      </div>
    </div>
  </div>
</div>

<style>
  .settings-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    z-index: var(--z-modal-backdrop);
  }

  .settings-drawer {
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    width: 320px;
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
    padding: 14px 18px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .drawer-title {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .drawer-close {
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    transition: all 0.15s;
  }
  .drawer-close:hover {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 14px 18px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .drawer-body::-webkit-scrollbar { display: none; }

  /* --- Quality section (original card style) --- */
  .section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .section-title {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .preset-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .preset-card {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 14px;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    text-align: left;
    transition: all 0.15s;
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

  /* --- Row layout --- */
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-height: 32px;
  }

  .label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    flex-shrink: 0;
    white-space: nowrap;
  }

  /* --- Position grid (2x2) --- */
  .position-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .position-btn {
    padding: 6px 10px;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    font-size: var(--font-size-xs);
    text-align: center;
    transition: all 0.15s;
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

  /* --- Toggle switch --- */
  .switch {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 20px;
    flex-shrink: 0;
    cursor: pointer;
  }
  .switch input { opacity: 0; width: 0; height: 0; position: absolute; }
  .slider {
    position: absolute;
    inset: 0;
    background: var(--color-bg-tertiary);
    border-radius: 20px;
    transition: background 0.2s;
    cursor: pointer;
  }
  .slider::before {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    left: 2px;
    bottom: 2px;
    background: white;
    border-radius: 50%;
    transition: transform 0.2s;
  }
  .switch input:checked + .slider {
    background: var(--color-primary);
  }
  .switch input:checked + .slider::before {
    transform: translateX(16px);
  }

  /* --- Range --- */
  .range-group {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    max-width: 170px;
  }
  .range-group.full {
    max-width: none;
  }
  .range-group input[type="range"] {
    flex: 1;
  }
  .range-val {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
    min-width: 36px;
    text-align: right;
  }

  /* --- Select --- */
  .sel {
    font-size: var(--font-size-sm);
    padding: 5px 10px;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-primary);
    outline: none;
    max-width: 170px;
    cursor: pointer;
  }
  .sel:focus {
    border-color: var(--color-border-focus);
  }
</style>
