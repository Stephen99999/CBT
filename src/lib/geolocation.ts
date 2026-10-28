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

export const getCurrentLocation = (options?: PositionOptions): Promise<GeoPoint> => {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const problem = describeAccuracyProblem(position.coords.accuracy);
        if (problem) {
          reject(new Error(problem));
          return;
        }

        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(new Error(ERRORS[error.code] || error.message || 'Could not get your location.'));
      },
      {
        // High accuracy matters for the attendance radius fence
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
        ...options,
      }
    );
  });
};
