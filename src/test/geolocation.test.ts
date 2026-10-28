import { describe, it, expect, vi } from 'vitest';
import {
  describeAccuracyProblem,
  getCurrentLocation,
  MAX_USABLE_ACCURACY_METERS,
} from '@/lib/geolocation';

interface StubFix {
  latitude: number;
  longitude: number;
  accuracy: number;
}

const stubGeolocation = (behavior: { position?: StubFix; error?: { code: number; message: string } }) => {
  const getCurrentPosition = vi.fn((onSuccess: any, onError: any) => {
    if (behavior.error) onError(behavior.error);
    else onSuccess({ coords: behavior.position });
  });

  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });

  return getCurrentPosition;
};

describe('describeAccuracyProblem', () => {
  it('accepts a normal GPS fix', () => {
    expect(describeAccuracyProblem(18)).toBeNull();
  });

  it('accepts a fix right at the limit', () => {
    expect(describeAccuracyProblem(MAX_USABLE_ACCURACY_METERS)).toBeNull();
  });

  it('rejects a city-level guess and names the rough error', () => {
    // A laptop's IP/WiFi lookup reports tens of km, which would otherwise be
    // stored as the classroom location.
    const problem = describeAccuracyProblem(100000);
    expect(problem).toMatch(/too imprecise/i);
    expect(problem).toContain('100 km');
  });

  it('does not block when accuracy is missing or unparseable', () => {
    expect(describeAccuracyProblem(undefined)).toBeNull();
    expect(describeAccuracyProblem(null)).toBeNull();
    expect(describeAccuracyProblem(Number.NaN)).toBeNull();
  });
});

describe('getCurrentLocation', () => {
  it('rejects a coarse fix instead of returning a wrong position', async () => {
    stubGeolocation({ position: { latitude: 6.4474, longitude: 3.3903, accuracy: 100000 } });

    await expect(getCurrentLocation()).rejects.toThrow(/too imprecise/i);
  });

  it('resolves a usable fix together with its accuracy', async () => {
    const getCurrentPosition = stubGeolocation({
      position: { latitude: 6.4474, longitude: 3.3903, accuracy: 18 },
    });

    await expect(getCurrentLocation()).resolves.toEqual({
      latitude: 6.4474,
      longitude: 3.3903,
      accuracy: 18,
    });

    expect(getCurrentPosition.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: true });
  });

  it('still reports a denied permission clearly', async () => {
    stubGeolocation({ error: { code: 1, message: '' } });

    await expect(getCurrentLocation()).rejects.toThrow(/permission was denied/i);
  });
});
