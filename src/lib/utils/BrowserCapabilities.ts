/**
 * BrowserCapabilities — Detect what the current browser supports
 */

export interface BrowserCaps {
  /** Can capture screen via getDisplayMedia */
  canScreenCapture: boolean;
  /** Can access camera */
  canCamera: boolean;
  /** Can access microphone */
  canMicrophone: boolean;
  /** Is a mobile device */
  isMobile: boolean;
  /** Best available storage type */
  storageType: 'filesystem' | 'opfs' | 'indexeddb' | 'memory';
  /** Human-readable storage name */
  storageName: string;
}

export function detectCapabilities(): BrowserCaps {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(
    typeof navigator !== 'undefined' ? navigator.userAgent : ''
  );

  const canScreenCapture =
    typeof navigator !== 'undefined' &&
    'mediaDevices' in navigator &&
    'getDisplayMedia' in (navigator.mediaDevices || {});

  const canCamera =
    typeof navigator !== 'undefined' &&
    'mediaDevices' in navigator &&
    'getUserMedia' in (navigator.mediaDevices || {});

  const canMicrophone = canCamera; // Same API

  // Detect storage
  let storageType: BrowserCaps['storageType'] = 'memory';
  let storageName = 'In-Memory';

  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    storageType = 'filesystem';
    storageName = 'Direct to Disk';
  } else if (
    typeof navigator !== 'undefined' &&
    'storage' in navigator &&
    'getDirectory' in (navigator.storage || {})
  ) {
    storageType = 'opfs';
    storageName = 'OPFS';
  } else if (typeof indexedDB !== 'undefined') {
    storageType = 'indexeddb';
    storageName = 'IndexedDB';
  }

  return {
    canScreenCapture,
    canCamera,
    canMicrophone,
    isMobile,
    storageType,
    storageName,
  };
}
