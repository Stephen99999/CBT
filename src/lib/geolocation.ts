// src/lib/geolocation.ts
// Wraps the browser GPS so pages never touch navigator directly.
// Requires HTTPS or localhost — browsers block geolocation on plain http://.

export interface GeoPoint {
  latitude: number;
  longitude: number;
  /** GPS accuracy in meters */
  accuracy: number;
}

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
