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
      <!-- Quality -->
      <div class="row">
        <span class="label">Quality</span>
        <div class="pill-group">
          {#each Object.entries(QUALITY_PRESETS) as [key, preset]}
            <button
              class="pill"
              class:active={settings.qualityPreset === key}
              onclick={() => settingsStore.setQuality(key as 'low' | 'medium' | 'high')}
            >{preset.label}</button>
          {/each}
        </div>
      </div>

      <!-- Webcam -->
      <div class="row">
        <span class="label">Webcam</span>
        <label class="switch">
          <input type="checkbox" checked={recording.webcamEnabled} onchange={() => recordingStore.toggleWebcam()} />
          <span class="slider"></span>
        </label>
      </div>

      {#if recording.webcamEnabled}
        <!-- Webcam Position -->
        <div class="row">
          <span class="label">Position</span>
          <div class="pill-group">
            {#each WEBCAM_POSITIONS as pos}
              <button
                class="pill small"
                class:active={settings.webcamPosition === pos.value}
                onclick={() => settingsStore.setWebcamPosition(pos.value)}
              >{pos.label}</button>
            {/each}
          </div>
        </div>

        <!-- Webcam Size -->
        <div class="row">
          <span class="label">Size</span>
          <div class="range-group">
            <input
              type="range" min="80" max="300" step="10"
              value={settings.webcamSize}
              oninput={(e) => settingsStore.setWebcamSize(Number((e.target as HTMLInputElement).value))}
            />
            <span class="range-val">{settings.webcamSize}</span>
          </div>
        </div>
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
          <span class="label">Mic</span>
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
        <span class="label">Countdown</span>
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
    width: 300px;
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
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .drawer-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .drawer-close {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    color: var(--color-text-muted);
    font-size: 12px;
    transition: all 0.15s;
  }
  .drawer-close:hover {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .drawer-body::-webkit-scrollbar { display: none; }

  /* --- Row layout --- */
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 28px;
  }

  .label {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-secondary);
    flex-shrink: 0;
    white-space: nowrap;
  }

  /* --- Pill buttons --- */
  .pill-group {
    display: flex;
    gap: 4px;
  }

  .pill {
    padding: 4px 10px;
    border-radius: 100px;
    border: 1px solid var(--color-border);
    font-size: 11px;
    font-weight: 500;
    color: var(--color-text-secondary);
    transition: all 0.15s;
    white-space: nowrap;
  }
  .pill:hover {
    border-color: var(--color-border-hover);
    background: var(--color-surface-hover);
  }
  .pill.active {
    border-color: var(--color-primary);
    background: rgba(108, 92, 231, 0.15);
    color: var(--color-primary-light);
  }
  .pill.small {
    padding: 3px 7px;
    font-size: 10px;
  }

  /* --- Toggle switch --- */
  .switch {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 20px;
    flex-shrink: 0;
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
    gap: 6px;
    flex: 1;
    max-width: 160px;
  }
  .range-group input[type="range"] {
    flex: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 3px;
    background: var(--color-bg-tertiary);
    border-radius: 2px;
    outline: none;
    border: none;
    padding: 0;
  }
  .range-group input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--color-primary);
    cursor: pointer;
  }
  .range-val {
    font-size: 11px;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
    min-width: 28px;
    text-align: right;
  }

  /* --- Select --- */
  .sel {
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-primary);
    outline: none;
    max-width: 160px;
    cursor: pointer;
  }
  .sel:focus {
    border-color: var(--color-border-focus);
  }
</style>
