<script lang="ts">
  import { detectBrowser } from '$lib/utils/browserDetect';

  interface Props {
    errorCode: string;
    onDismiss: () => void;
  }

  let { errorCode, onDismiss }: Props = $props();

  const caps = detectBrowser();

  interface Guidance {
    title: string;
    message: string;
    action: string;
    icon: string;
  }

  function getGuidance(): Guidance {
    const guides: Record<string, Guidance> = {
      MACOS_SCREEN_PERMISSION: {
        title: 'macOS Screen Recording Permission',
        message: 'Your Mac requires you to explicitly grant Screen Recording permission to your browser.',
        action: 'Open System Settings → Privacy & Security → Screen Recording → Enable ' + caps.browserName,
        icon: '🖥️',
      },
      PERMISSION_DENIED_SCREEN: {
        title: 'Screen Capture Blocked',
        message: 'Screen sharing was denied. LoomFX needs this to record your screen.',
        action: 'Click "Start Recording" again and select a screen/window to share.',
        icon: '🔒',
      },
      PERMISSION_DENIED_CAMERA: {
        title: 'Camera Access Denied',
        message: 'Camera access was denied. Recording will continue without webcam overlay.',
        action: 'To enable webcam, click the lock icon in the address bar and allow camera access.',
        icon: '📷',
      },
      PERMISSION_DENIED_MICROPHONE: {
        title: 'Microphone Access Denied',
        message: 'Microphone access was denied. Recording will be silent.',
        action: 'To enable audio, click the lock icon in the address bar and allow microphone access.',
        icon: '🎤',
      },
      DEVICE_NOT_FOUND_CAMERA: {
        title: 'No Camera Found',
        message: 'No webcam was detected on this device.',
        action: 'Connect a webcam and try again, or continue without webcam.',
        icon: '🔌',
      },
      BROWSER_NOT_SUPPORTED: {
        title: 'Browser Not Fully Supported',
        message: 'Some features may not work in ' + caps.browserName + '. For the best experience, use Chrome or Edge.',
        action: 'Download Chrome from google.com/chrome for the full LoomFX experience.',
        icon: '⚠️',
      },
    };

    return guides[errorCode] ?? {
      title: 'Something went wrong',
      message: `Error: ${errorCode}`,
      action: 'Please refresh the page and try again.',
      icon: '❌',
    };
  }

  const guidance = getGuidance();
</script>

<div class="permission-prompt" id="permission-prompt">
  <div class="prompt-card glass">
    <button class="prompt-close" onclick={onDismiss} aria-label="Dismiss">✕</button>

    <span class="prompt-icon">{guidance.icon}</span>
    <h3 class="prompt-title">{guidance.title}</h3>
    <p class="prompt-message">{guidance.message}</p>

    <div class="prompt-action">
      <div class="action-indicator"></div>
      <p class="action-text">{guidance.action}</p>
    </div>

    {#if errorCode === 'MACOS_SCREEN_PERMISSION'}
      <div class="prompt-steps">
        <div class="step">
          <span class="step-num">1</span>
          <span>Open <strong>System Settings</strong></span>
        </div>
        <div class="step">
          <span class="step-num">2</span>
          <span>Go to <strong>Privacy & Security</strong></span>
        </div>
        <div class="step">
          <span class="step-num">3</span>
          <span>Click <strong>Screen Recording</strong></span>
        </div>
        <div class="step">
          <span class="step-num">4</span>
          <span>Toggle <strong>{caps.browserName}</strong> ON</span>
        </div>
      </div>
    {/if}

    <div class="prompt-actions">
      <button class="btn-primary" onclick={onDismiss}>
        {errorCode.includes('SCREEN') ? 'Try Again' : 'Got it'}
      </button>
    </div>
  </div>
</div>

<style>
  .permission-prompt {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 15, 35, 0.8);
    backdrop-filter: blur(4px);
    z-index: var(--z-modal);
    animation: fade-in 0.2s ease;
  }

  .prompt-card {
    position: relative;
    max-width: 440px;
    width: 90vw;
    padding: var(--space-8);
    border-radius: var(--radius-xl);
    text-align: center;
    animation: scale-in 0.3s var(--transition-spring);
  }

  .prompt-close {
    position: absolute;
    top: var(--space-4);
    right: var(--space-4);
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    transition: all var(--transition-fast);
  }

  .prompt-close:hover {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }

  .prompt-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: var(--space-4);
  }

  .prompt-title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    margin-bottom: var(--space-3);
  }

  .prompt-message {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: var(--line-height-relaxed);
    margin-bottom: var(--space-5);
  }

  .prompt-action {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-4);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    text-align: left;
    margin-bottom: var(--space-5);
  }

  .action-indicator {
    width: 4px;
    height: 100%;
    min-height: 20px;
    background: var(--color-primary);
    border-radius: 2px;
    flex-shrink: 0;
    align-self: stretch;
  }

  .action-text {
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    line-height: var(--line-height-relaxed);
  }

  .prompt-steps {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin-bottom: var(--space-6);
    text-align: left;
  }

  .step {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .step-num {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--color-primary);
    color: white;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    flex-shrink: 0;
  }

  .prompt-actions {
    display: flex;
    justify-content: center;
  }

  .btn-primary {
    padding: var(--space-3) var(--space-6);
    background: var(--color-primary);
    color: white;
    font-weight: var(--font-weight-semibold);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    transition: all var(--transition-smooth);
  }

  .btn-primary:hover {
    background: var(--color-primary-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-glow-primary);
  }

  .btn-primary:active {
    transform: translateY(0);
  }
</style>
