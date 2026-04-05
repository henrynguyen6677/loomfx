<script lang="ts">
  import { recordingStore } from '$lib/stores/recordingStore';
  import { settingsStore } from '$lib/stores/settingsStore';

  const { webcamPosition } = $derived($settingsStore);
  const { webcamEnabled } = $derived($recordingStore);

  let videoEl: HTMLVideoElement | undefined = $state();
  let isDragging = $state(false);
  let dragOffset = $state({ x: 0, y: 0 });
  let customPos = $state<{ x: number; y: number } | null>(null);

  // Listen for webcam stream attachment
  $effect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (videoEl && detail?.stream) {
        videoEl.srcObject = detail.stream;
        videoEl.play().catch(() => {});
      }
    };
    window.addEventListener('loomfx:webcam-stream', handler);
    return () => window.removeEventListener('loomfx:webcam-stream', handler);
  });

  function getPositionStyle(): string {
    if (customPos) {
      return `left: ${customPos.x}px; top: ${customPos.y}px;`;
    }

    const margin = '24px';
    const size = `${$settingsStore.webcamSize}px`;

    switch (webcamPosition) {
      case 'bottom-right': return `right: ${margin}; bottom: calc(${margin} + var(--toolbar-height) + var(--space-6));`;
      case 'bottom-left': return `left: ${margin}; bottom: calc(${margin} + var(--toolbar-height) + var(--space-6));`;
      case 'top-right': return `right: ${margin}; top: calc(${margin} + var(--header-height));`;
      case 'top-left': return `left: ${margin}; top: calc(${margin} + var(--header-height));`;
    }
  }

  function onPointerDown(e: PointerEvent) {
    isDragging = true;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging) return;
    customPos = {
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    };
  }

  function onPointerUp() {
    isDragging = false;
  }
</script>

{#if webcamEnabled}
  <div
    class="webcam-bubble"
    class:dragging={isDragging}
    style="{getPositionStyle()} width: {$settingsStore.webcamSize}px; height: {$settingsStore.webcamSize}px;"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    role="img"
    aria-label="Webcam preview"
    id="webcam-bubble"
  >
    <video
      bind:this={videoEl}
      class="webcam-video"
      muted
      playsinline
      autoplay
    ></video>
  </div>
{/if}

<style>
  .webcam-bubble {
    position: fixed;
    border-radius: 50%;
    overflow: hidden;
    border: 3px solid rgba(255, 255, 255, 0.7);
    box-shadow: var(--shadow-lg), 0 0 0 1px rgba(0,0,0,0.2);
    cursor: grab;
    z-index: var(--z-webcam-bubble);
    animation: bubble-appear 0.5s var(--transition-spring) forwards;
    transition: box-shadow var(--transition-normal);
    touch-action: none;
    user-select: none;
  }

  .webcam-bubble:hover {
    border-color: var(--color-primary-light);
    box-shadow: var(--shadow-lg), 0 0 20px var(--color-primary-glow);
  }

  .webcam-bubble.dragging {
    cursor: grabbing;
    border-color: var(--color-primary);
    box-shadow: var(--shadow-xl), 0 0 30px var(--color-primary-glow);
    transition: none;
  }

  .webcam-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1);
    background: var(--color-bg-tertiary);
  }
</style>
