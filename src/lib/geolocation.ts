// src/lib/geolocation.ts
// Wraps the browser GPS so pages never touch navigator directly.
// Requires HTTPS or localhost — browsers block geolocation on plain http://.

export interface GeoPoint {
  latitude: number;
  longitude: number;
  /** GPS accuracy in meters */
  accuracy: number;
}

/**
 * A fix worse than this is not a position — it's a city-level guess.
 *
 * Phones with GPS report 5–50 m. Values in the kilometres mean the browser fell
 * back to an IP/WiFi lookup (typical on laptops and desktops, or with location
 * services off), which puts you in the wrong town. Using such a fix stores the
 * wrong classroom or blames a student for being hundreds of km away.
 */
export const MAX_USABLE_ACCURACY_METERS = 1000;

/**
 * A single reading jumps around by tens of metres between attempts (a satellite
 * moves, WiFi kicks in, the phone falls back to a cell tower), which makes a
 * 15 m fence behave like a coin flip. So several readings are taken and the
 * median is used: one bad sample cannot move the position, and an honest phone
 * standing still settles within a couple of metres.
 */
export const SAMPLE_COUNT = 5;
/** Pause between readings. 5 × 1500 ms ≈ 6–8 s of sampling. */
export const SAMPLE_INTERVAL_MS = 1500;
/** Stop early once this many readings agree within this many meters. */
export const CONVERGENCE_METERS = 15;
/**
 * Sampling window: no new reading is taken past this point. A reading already
 * in flight may still run to its own `timeout`, so this bounds the pace of the
 * capture rather than its absolute worst case.
 */
export const MAX_WINDOW_MS = 10000;

export interface LocationOptions extends PositionOptions {
  /** How many readings to take (default SAMPLE_COUNT). */
  samples?: number;
  /** Pause between readings in ms (default SAMPLE_INTERVAL_MS). */
  intervalMs?: number;
}

const formatRoughAccuracy = (meters: number): string =>
  meters >= 1000 ? `about ${Math.round(meters / 1000)} km` : `about ${Math.round(meters)} m`;

/**
 * Human-readable reason a fix cannot be trusted, or null when it is good
 * enough to use.
 */
export const describeAccuracyProblem = (accuracy: number | string | null | undefined): string | null => {
  const meters = Number(accuracy);
  if (!Number.isFinite(meters) || meters <= MAX_USABLE_ACCURACY_METERS) return null;

  return (
    `Your location is too imprecise: the browser only knows it to within ` +
    `${formatRoughAccuracy(meters)}. Turn on GPS / precise location and try again — ` +
    `laptops and desktops often guess your position from your network.`
  );
};

const ERRORS: Record<number, string> = {
  1: 'Location permission was denied. Please allow location access in your browser to continue.',
  2: 'Your location is currently unavailable. Make sure GPS/location services are on.',
  3: 'Getting your location took too long. Please try again.',
};

/** Browser geolocation error codes (GeolocationPositionError). */
const PERMISSION_DENIED = 1;

interface GeoError extends Error {
  code?: number;
}

const requestPosition = (options: PositionOptions): Promise<GeoPoint> =>
  new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        const wrapped: GeoError = new Error(
          ERRORS[error.code] || error.message || 'Could not get your location.'
        );
        wrapped.code = error.code;
        reject(wrapped);
      },
      options
    );
  });

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** Rough worst-case extent of the readings, in meters. */
const spreadMeters = (fixes: GeoPoint[]): number => {
  if (fixes.length < 2) return 0;

  const latitudes = fixes.map((f) => f.latitude);
  const longitudes = fixes.map((f) => f.longitude);
  const latSpan = Math.max(...latitudes) - Math.min(...latitudes);
  const lngSpan = Math.max(...longitudes) - Math.min(...longitudes);
  const midLat = (Math.max(...latitudes) + Math.min(...latitudes)) / 2;

  const metersPerLatDegree = 111320;
  const metersPerLngDegree = 111320 * Math.cos((midLat * Math.PI) / 180);
  return Math.hypot(latSpan * metersPerLatDegree, lngSpan * metersPerLngDegree);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Captures the current position from several readings and returns the median
 * one. A reading is only accepted once its accuracy is good enough.
 *
 * The first reading is usually the worst (the device is still acquiring
 * satellites), so readings continue for ~SAMPLE_COUNT × SAMPLE_INTERVAL_MS or
 * until three of them already agree within CONVERGENCE_METERS.
 */
export const getCurrentLocation = async (options: LocationOptions = {}): Promise<GeoPoint> => {
  const { samples = SAMPLE_COUNT, intervalMs = SAMPLE_INTERVAL_MS, ...positionOptions } = options;

  const requestOptions: PositionOptions = {
    // High accuracy matters for the attendance radius fence
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
    ...positionOptions,
  };

  const totalSamples = Math.max(1, samples);
  const startedAt = Date.now();
  const collected: GeoPoint[] = [];
  let lastError: Error | null = null;

  for (let i = 0; i < totalSamples; i++) {
    const readingStartedAt = Date.now();

    try {
      collected.push(await requestPosition(requestOptions));
    } catch (error) {
      lastError = error as Error;
      // Retrying a denied permission just pops the browser prompt again.
      if ((error as GeoError).code === PERMISSION_DENIED) throw error;
    }

    // Enough readings, or out of time for another one.
    if (Date.now() - startedAt >= MAX_WINDOW_MS) break;
    if (collected.length >= 3 && spreadMeters(collected.slice(-3)) <= CONVERGENCE_METERS) break;
    if (i < totalSamples - 1) {
      const wait = intervalMs - (Date.now() - readingStartedAt);
      if (wait > 0) await sleep(wait);
    }
  }

  if (collected.length === 0) {
    throw lastError ?? new Error('Could not get your location.');
  }

  const best: GeoPoint = {
    latitude: median(collected.map((f) => f.latitude)),
    longitude: median(collected.map((f) => f.longitude)),
    accuracy: median(collected.map((f) => f.accuracy)),
  };

  const problem = describeAccuracyProblem(best.accuracy);
  if (problem) throw new Error(problem);

  return best;
};
