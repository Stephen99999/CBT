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

/** iOS often needs more time/patience to get a good GPS fix */
export const IOS_SAMPLE_COUNT = 8;
export const IOS_MAX_WINDOW_MS = 15000;
/** On iOS, keep watching until we get accuracy better than this or run out of time */
export const IOS_TARGET_ACCURACY = 50;

export interface LocationOptions extends PositionOptions {
  /** How many readings to take (default SAMPLE_COUNT). */
  samples?: number;
  /** Pause between readings in ms (default SAMPLE_INTERVAL_MS). */
  intervalMs?: number;
}

const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  // iPadOS 13+ reports as MacIntel but has touch points
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1) return true;
  return false;
};

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
 * iOS-optimized capture using watchPosition(). On iOS, getCurrentPosition() often
 * returns a single coarse reading; watchPosition() lets the device refine the fix
 * over time as it acquires better GPS data.
 */
const getCurrentLocationIOS = async (options: LocationOptions = {}): Promise<GeoPoint> => {
  const { ...positionOptions } = options;

  const requestOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 0,
    ...positionOptions,
  };

  if (!('geolocation' in navigator)) {
    throw new Error('Geolocation is not supported by this browser.');
  }

  return new Promise((resolve, reject) => {
    const collected: GeoPoint[] = [];
    const startedAt = Date.now();
    let watchId: number | null = null;
    let settled = false;

    const finish = (result: GeoPoint | null, error?: Error) => {
      if (settled) return;
      settled = true;
      if (watchId !== null) {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch {
          // ignore
        }
        watchId = null;
      }
      if (error) reject(error);
      else if (result) resolve(result);
      else reject(new Error('Could not get your location.'));
    };

    try {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const fix: GeoPoint = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          collected.push(fix);

          // If we get a good fix on iOS, we can accept it earlier
          if (fix.accuracy <= IOS_TARGET_ACCURACY && collected.length >= 2) {
            // Use median of recent good readings
            const recent = collected.slice(-Math.min(collected.length, 4));
            const best: GeoPoint = {
              latitude: median(recent.map((f) => f.latitude)),
              longitude: median(recent.map((f) => f.longitude)),
              accuracy: Math.min(...recent.map((f) => f.accuracy)), // best accuracy
            };
            const problem = describeAccuracyProblem(best.accuracy);
            if (!problem) {
              finish(best);
              return;
            }
          }

          // Or if we've collected enough and converged
          if (
            collected.length >= 4 &&
            (Date.now() - startedAt >= IOS_MAX_WINDOW_MS || (spreadMeters(collected.slice(-3)) <= CONVERGENCE_METERS))
          ) {
            const best: GeoPoint = {
              latitude: median(collected.map((f) => f.latitude)),
              longitude: median(collected.map((f) => f.longitude)),
              accuracy: median(collected.map((f) => f.accuracy)),
            };
            const problem = describeAccuracyProblem(best.accuracy);
            if (!problem) {
              finish(best);
              return;
            }
          }

          if (Date.now() - startedAt >= IOS_MAX_WINDOW_MS && collected.length > 0) {
            const best: GeoPoint = {
              latitude: median(collected.map((f) => f.latitude)),
              longitude: median(collected.map((f) => f.longitude)),
              accuracy: median(collected.map((f) => f.accuracy)),
            };
            const problem = describeAccuracyProblem(best.accuracy);
            if (!problem) {
              finish(best);
              return;
            }
            // Even if not great, if it's not city-level bad maybe still try? But our guard will reject
            finish(null, new Error(problem));
            return;
          }
        },
        (error) => {
          const wrapped: GeoError = new Error(
            ERRORS[error.code] || error.message || 'Could not get your location.'
          );
          wrapped.code = error.code;
          if (collected.length > 0) {
            // If we have some readings, try to use them even if watch errors
            const best: GeoPoint = {
              latitude: median(collected.map((f) => f.latitude)),
              longitude: median(collected.map((f) => f.longitude)),
              accuracy: median(collected.map((f) => f.accuracy)),
            };
            const problem = describeAccuracyProblem(best.accuracy);
            if (!problem) {
              finish(best);
              return;
            }
          }
          if (error.code === PERMISSION_DENIED) {
            finish(null, wrapped);
            return;
          }
          // For other errors, if we have readings use them, else fail
          if (collected.length === 0) {
            finish(null, wrapped);
          }
        },
        requestOptions
      );
    } catch (e) {
      finish(null, e as Error);
      return;
    }

    // Safety timeout
    setTimeout(() => {
      if (settled) return;
      if (collected.length > 0) {
        const best: GeoPoint = {
          latitude: median(collected.map((f) => f.latitude)),
          longitude: median(collected.map((f) => f.longitude)),
          accuracy: median(collected.map((f) => f.accuracy)),
        };
        const problem = describeAccuracyProblem(best.accuracy);
        if (!problem) {
          finish(best);
          return;
        }
        finish(null, new Error(problem));
        return;
      }
      finish(null, new Error('Getting your location took too long. Please try again.'));
    }, IOS_MAX_WINDOW_MS + 5000);
  });
};

/**
 * Captures the current position from several readings and returns the median
 * one. A reading is only accepted once its accuracy is good enough.
 *
 * The first reading is usually the worst (the device is still acquiring
 * satellites), so readings continue for ~SAMPLE_COUNT × SAMPLE_INTERVAL_MS or
 * until three of them already agree within CONVERGENCE_METERS.
 */
export const getCurrentLocation = async (options: LocationOptions = {}): Promise<GeoPoint> => {
  // Use watchPosition() approach on iOS for better accuracy
  if (isIOS()) {
    return getCurrentLocationIOS(options);
  }

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
