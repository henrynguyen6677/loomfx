<script lang="ts">
  import { onMount } from 'svelte';
  import Header from '$lib/components/layout/Header.svelte';
  import Toast from '$lib/components/common/Toast.svelte';
  import { RecordingOrchestrator } from '$lib/services/RecordingOrchestrator';
  import '$lib/styles/global.css';
  import '$lib/styles/animations.css';

  let { children } = $props();

  let orchestrator: RecordingOrchestrator | null = null;

  onMount(() => {
    orchestrator = new RecordingOrchestrator();
    return () => orchestrator?.dispose();
  });
</script>

<svelte:head>
  <title>LoomFX — Free Local Screen Recorder</title>
  <meta name="description" content="Free, local-first screen recorder. No cloud, no limits, no cost. Record your screen with webcam overlay and save directly to your device." />
</svelte:head>

<div class="app-shell">
  <Header />
  <main class="app-main">
    {@render children()}
  </main>
  <Toast />
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .app-main {
    flex: 1;
    display: flex;
    align-items: stretch;
    justify-content: center;
    padding: calc(var(--header-height) + var(--space-4)) var(--space-6) calc(var(--toolbar-height) + var(--space-6) + var(--space-8)) var(--space-6);
    overflow: hidden;
    width: 100%;
  }
</style>
