<script lang="ts">
  import { recordingStore } from '$lib/stores/recordingStore';

  let count = $state(3);
  let visible = $state(true);

  $effect(() => {
    const interval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(interval);
        visible = false;
        recordingStore.setStatus('recording');
        window.dispatchEvent(new CustomEvent('loomfx:countdown-done'));
      }
    }, 1000);

    return () => clearInterval(interval);
  });
</script>

{#if visible}
  <div class="countdown-overlay" id="countdown-overlay">
    <div class="countdown-ring">
      {#key count}
        <span class="countdown-number countdown-number">{count}</span>
      {/key}
    </div>
    <p class="countdown-label">Recording starts in...</p>
  </div>
{/if}

<style>
  .countdown-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(15, 15, 35, 0.85);
    backdrop-filter: blur(8px);
    z-index: var(--z-countdown);
    animation: fade-in 0.2s ease;
  }

  .countdown-ring {
    width: 140px;
    height: 140px;
    border-radius: 50%;
    border: 3px solid var(--color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 40px var(--color-primary-glow), inset 0 0 40px var(--color-primary-glow);
  }

  .countdown-number {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-extrabold);
    color: white;
    animation: countdown-enter 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .countdown-label {
    margin-top: var(--space-6);
    font-size: var(--font-size-md);
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-medium);
  }
</style>
