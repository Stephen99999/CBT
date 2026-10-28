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

type StubItem = { position: StubFix } | { error: { code: number; message: string } };

/** Stubs navigator.geolocation with a fixed sequence of readings. */
const stubGeolocation = (items: StubItem[]) => {
  let index = 0;
  const getCurrentPosition = vi.fn((onSuccess: any, onError: any) => {
    const item = items[Math.min(index, items.length - 1)];
    index += 1;
    if ('error' in item) onError(item.error);
    else onSuccess({ coords: item.position });
  });

  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });

  return getCurrentPosition;
};

const fix = (latitude: number, longitude: number, accuracy: number): StubFix => ({
  latitude,
  longitude,
  accuracy,
});

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
    stubGeolocation([{ position: fix(6.4474, 3.3903, 100000) }]);

    await expect(getCurrentLocation({ samples: 1 })).rejects.toThrow(/too imprecise/i);
  });

  it('resolves a usable fix together with its accuracy', async () => {
    const getCurrentPosition = stubGeolocation([{ position: fix(6.4474, 3.3903, 18) }]);

    await expect(getCurrentLocation({ samples: 1 })).resolves.toEqual({
      latitude: 6.4474,
      longitude: 3.3903,
      accuracy: 18,
    });

    expect(getCurrentPosition.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: true });
  });

  it('still reports a denied permission clearly, without retrying the prompt', async () => {
    const getCurrentPosition = stubGeolocation([{ error: { code: 1, message: '' } }]);

    await expect(getCurrentLocation({ samples: 5, intervalMs: 0 })).rejects.toThrow(
      /permission was denied/i
    );
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('uses the median reading so one wild sample cannot move the position', async () => {
    // Readings that wander by ~90 m (the jitter that made a 15 m fence flaky)
    // plus one coarse accuracy. Median keeps the honest position and accuracy.
    stubGeolocation([
      { position: fix(6.447, 3.3903, 12) },
      { position: fix(6.4473, 3.3903, 14) },
      { position: fix(6.4475, 3.3903, 900) },
      { position: fix(6.4471, 3.3903, 16) },
      { position: fix(6.4478, 3.3903, 20) },
    ]);

    const result = await getCurrentLocation({ samples: 5, intervalMs: 0 });

    expect(result).toEqual({ latitude: 6.4473, longitude: 3.3903, accuracy: 16 });
  });

  it('stops early once three readings agree', async () => {
    const getCurrentPosition = stubGeolocation([{ position: fix(6.4474, 3.3903, 20) }]);

    await getCurrentLocation({ samples: 5, intervalMs: 0 });

    expect(getCurrentPosition).toHaveBeenCalledTimes(3);
  });

  it('rejects when every reading is a coarse guess', async () => {
    stubGeolocation([
      { position: fix(6.4474, 3.3903, 100000) },
      { position: fix(6.4474, 3.3903, 90000) },
      { position: fix(6.4474, 3.3903, 120000) },
    ]);

    await expect(getCurrentLocation({ samples: 3, intervalMs: 0 })).rejects.toThrow(
      /too imprecise/i
    );
  });
});
