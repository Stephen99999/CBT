import { describe, it, expect } from 'vitest';
import { toUtcIsoString } from '@/lib/storage';

const toWallClock = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

describe('toUtcIsoString', () => {
  it('sends an absolute UTC instant, never a bare wall clock', () => {
    const iso = toUtcIsoString('2026-10-28T10:00');
    expect(iso).toMatch(/Z$/);
  });

  it('keeps the wall-clock time the admin picked when shown again', () => {
    // A datetime-local value must round-trip: picking 10:00 must display as 10:00
    // in the same browser, whatever the server or DB timezone is.
    const wallClock = '2026-10-28T10:00';
    expect(toWallClock(new Date(toUtcIsoString(wallClock)))).toBe(wallClock);
  });

  it('converts an explicit offset to the equivalent UTC instant', () => {
    expect(toUtcIsoString('2026-10-28T10:00:00+01:00')).toBe('2026-10-28T09:00:00.000Z');
  });

  it('rejects an unparseable start time instead of sending NaN', () => {
    expect(() => toUtcIsoString('not-a-date')).toThrow(/Invalid start time/);
    expect(() => toUtcIsoString('')).toThrow(/Invalid start time/);
  });
});
