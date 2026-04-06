/** Browser and platform detection utilities */

export interface BrowserCapabilities {
  hasGetDisplayMedia: boolean;
  hasGetUserMedia: boolean;
  hasWebCodecs: boolean;
  hasFileSystemAccess: boolean;
  hasOPFS: boolean;
  isSecureContext: boolean;
  isMacOS: boolean;
  isChromium: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isMobile: boolean;
  browserName: string;
}

let _cached: BrowserCapabilities | null = null;

export function detectBrowser(): BrowserCapabilities {
  if (_cached) return _cached;

  const ua = navigator.userAgent;
  const isChromium = /Chrome/.test(ua) && !/Edg/.test(ua) || /Edg/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);

  let browserName = 'Unknown';
  if (/Edg\//.test(ua)) browserName = 'Edge';
  else if (/Chrome\//.test(ua)) browserName = 'Chrome';
  else if (/Firefox\//.test(ua)) browserName = 'Firefox';
  else if (/Safari\//.test(ua)) browserName = 'Safari';

  _cached = {
    hasGetDisplayMedia: 'getDisplayMedia' in (navigator.mediaDevices || {}),
    hasGetUserMedia: 'getUserMedia' in (navigator.mediaDevices || {}),
    hasWebCodecs: typeof VideoEncoder !== 'undefined',
    hasFileSystemAccess: 'showSaveFilePicker' in window,
    hasOPFS: 'storage' in navigator && 'getDirectory' in (navigator?.storage || {}),
    isSecureContext: window.isSecureContext,
    isMacOS: /Mac/.test(navigator.platform),
    isChromium,
    isFirefox,
    isSafari,
    isMobile,
    browserName,
  };

  return _cached;
}

export function getMissingCapabilities(): string[] {
  const caps = detectBrowser();
  const missing: string[] = [];

  if (!caps.isSecureContext) missing.push('Secure context (HTTPS) is required');
  if (!caps.hasGetDisplayMedia) missing.push('Screen capture API not available');
  if (!caps.hasGetUserMedia) missing.push('Camera/microphone API not available');
  if (!caps.hasWebCodecs) missing.push('WebCodecs API not available — recording quality may be limited');

  return missing;
}
