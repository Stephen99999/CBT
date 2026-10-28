import { describe, it, expect } from 'vitest';
import { describeGeofenceRejection, GeofenceRejection } from '@/lib/storage';

describe('describeGeofenceRejection', () => {
  it('spells out both parts of the allowance', () => {
    const details: GeofenceRejection = {
      your_distance_meters: 120,
      your_accuracy_meters: 40,
      class_location_accuracy_meters: 60,
      class_location_tolerance_meters: 60,
      accuracy_tolerance_meters: 40,
      allowed_radius_meters: 10,
      allowed_with_accuracy_meters: 110,
    };

    expect(describeGeofenceRejection(details)).toBe(
      'You are about 120 m away (±40 m GPS accuracy). This class allows 10 m ' +
        'plus 60 m measured when this class was created and 40 m for your own fix = 100 m in total.'
    );
  });

  it('quotes the applied tolerance, not a raw accuracy it never used', () => {
    // A ±608 m fix only widens a fence by the capped 150 m, so the numbers in
    // the sentence must add up (150 + 150 = 300), not show 608.
    const details: GeofenceRejection = {
      your_distance_meters: 400,
      your_accuracy_meters: 608,
      class_location_accuracy_meters: 400,
      class_location_tolerance_meters: 150,
      accuracy_tolerance_meters: 150,
      allowed_radius_meters: 10,
      allowed_with_accuracy_meters: 310,
    };

    const message = describeGeofenceRejection(details);
    expect(message).toContain('±608 m GPS accuracy');
    expect(message).toContain('= 300 m in total');
    expect(message).not.toMatch(/608 m for your own fix/);
    expect(message).not.toMatch(/400 m measured/);
  });

  it('falls back to a plain tolerance line for older payloads', () => {
    const details: GeofenceRejection = {
      your_distance_meters: 279656,
      your_accuracy_meters: 608,
      allowed_radius_meters: 1,
      allowed_with_accuracy_meters: 151,
    };

    const message = describeGeofenceRejection(details);
    expect(message).toContain('plus up to 150 m of GPS-error tolerance');
    expect(message).toContain('the stored class location is wrong');
  });

  it('explains an imprecise student fix when the distance itself is plausible', () => {
    const message = describeGeofenceRejection({
      your_distance_meters: 80,
      your_accuracy_meters: 900,
      accuracy_tolerance_meters: 150,
      allowed_radius_meters: 10,
      allowed_with_accuracy_meters: 160,
    });

    expect(message).toContain('±900 m GPS accuracy');
    expect(message).toContain('Your own location is also imprecise');
  });

  it('returns nothing when the payload carries no distance', () => {
    // e.g. the 400 for a fix too coarse to use — the caller then falls back to
    // the plain server message.
    expect(describeGeofenceRejection({ msg: 'Location is too imprecise' })).toBe('');
    expect(describeGeofenceRejection(undefined)).toBe('');
    expect(describeGeofenceRejection(null)).toBe('');
  });

  it('works when the payload only carries the radius', () => {
    expect(
      describeGeofenceRejection({ your_distance_meters: 90, allowed_radius_meters: 50 })
    ).toBe('You are about 90 m away. This class allows 50 m.');
  });
});
