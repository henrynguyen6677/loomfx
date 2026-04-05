import { describe, it, expect } from 'vitest';
import { formatTime, formatBytes } from '$lib/utils/formatTime';

describe('formatTime', () => {
  it('formats 0 seconds', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('formats seconds only', () => {
    expect(formatTime(45)).toBe('00:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(125)).toBe('02:05');
  });

  it('formats with hours', () => {
    expect(formatTime(3661)).toBe('01:01:01');
  });

  it('pads single digits', () => {
    expect(formatTime(9)).toBe('00:09');
  });

  it('handles exact minute boundary', () => {
    expect(formatTime(60)).toBe('01:00');
  });

  it('handles exact hour boundary', () => {
    expect(formatTime(3600)).toBe('01:00:00');
  });
});

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
  });

  it('formats with decimal', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });
});
