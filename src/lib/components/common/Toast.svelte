<script lang="ts">
  interface ToastItem {
    id: number;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    exiting?: boolean;
  }

  let toasts = $state<ToastItem[]>([]);
  let nextId = 0;

  function addToast(type: ToastItem['type'], message: string) {
    const id = nextId++;
    toasts = [...toasts, { id, type, message }];

    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  }

  function dismissToast(id: number) {
    toasts = toasts.map((t) =>
      t.id === id ? { ...t, exiting: true } : t
    );
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
    }, 300);
  }

  // Listen for toast events from anywhere in the app
  $effect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.type && detail?.message) {
        addToast(detail.type, detail.message);
      }
    };
    window.addEventListener('vellum:toast', handler);
    return () => window.removeEventListener('vellum:toast', handler);
  });

  const icons: Record<string, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };
</script>

<div class="toast-container" id="toast-container" aria-live="polite">
  {#each toasts as toast (toast.id)}
    <div
      class="toast toast-{toast.type}"
      class:exiting={toast.exiting}
      role="status"
    >
      <span class="toast-icon">{icons[toast.type]}</span>
      <span class="toast-message">{toast.message}</span>
      <button
        class="toast-close"
        onclick={() => dismissToast(toast.id)}
        aria-label="Dismiss"
      >✕</button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: calc(var(--header-height) + var(--space-4));
    right: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    z-index: var(--z-toast);
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    backdrop-filter: blur(16px);
    border: 1px solid var(--color-border);
    min-width: 280px;
    max-width: 400px;
    pointer-events: auto;
    animation: toast-enter 0.3s var(--transition-smooth) forwards;
    box-shadow: var(--shadow-lg);
  }

  .toast.exiting {
    animation: toast-exit 0.3s var(--transition-smooth) forwards;
  }

  .toast-success {
    background: var(--color-success-bg);
    border-color: rgba(16, 185, 129, 0.3);
  }

  .toast-error {
    background: var(--color-error-bg);
    border-color: rgba(239, 68, 68, 0.3);
  }

  .toast-warning {
    background: var(--color-warning-bg);
    border-color: rgba(245, 158, 11, 0.3);
  }

  .toast-info {
    background: var(--color-bg-glass);
  }

  .toast-icon {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    flex-shrink: 0;
  }

  .toast-success .toast-icon { color: var(--color-success); }
  .toast-error .toast-icon { color: var(--color-error); }
  .toast-warning .toast-icon { color: var(--color-warning); }
  .toast-info .toast-icon { color: var(--color-primary-light); }

  .toast-message {
    flex: 1;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-tight);
  }

  .toast-close {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    transition: all var(--transition-fast);
  }

  .toast-close:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-text-primary);
  }
</style>
