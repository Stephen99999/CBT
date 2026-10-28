import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  getCurrentLocation: vi.fn(),
}));

vi.mock('@/lib/api', () => ({ apiRequest: mocks.apiRequest }));
vi.mock('@/lib/geolocation', () => ({ getCurrentLocation: mocks.getCurrentLocation }));

import { createClass, markClassAttendance } from '@/lib/storage';

describe('markClassAttendance', () => {
  beforeEach(() => {
    mocks.apiRequest.mockReset().mockResolvedValue({ id: 1, distance_meters: 3 });
    mocks.getCurrentLocation
      .mockReset()
      .mockResolvedValue({ latitude: 6.4474, longitude: 3.3903, accuracy: 18 });
  });

  it('sends the captured position AND the GPS accuracy', async () => {
    // Without the accuracy the backend cannot allow for GPS error, so a small
    // fence rejects a student who is standing right next to the lecturer.
    await markClassAttendance(42);

    const [endpoint, options] = mocks.apiRequest.mock.calls[0];
    expect(endpoint).toBe('/classes/42/attendance');
    expect(JSON.parse(options.body)).toEqual({
      latitude: 6.4474,
      longitude: 3.3903,
      accuracy: 18,
    });
  });

  it('does not swallow the geofence details on failure', async () => {
    const failure: any = new Error('You are too far from the class location to mark attendance.');
    failure.status = 403;
    failure.data = { your_distance_meters: 279656, allowed_radius_meters: 1 };
    mocks.apiRequest.mockRejectedValue(failure);

    await expect(markClassAttendance(42)).rejects.toMatchObject({
      data: { your_distance_meters: 279656, allowed_radius_meters: 1 },
    });
  });
});

describe('createClass', () => {
  beforeEach(() => {
    mocks.apiRequest.mockReset().mockResolvedValue({ id: 1 });
    mocks.getCurrentLocation
      .mockReset()
      .mockResolvedValue({ latitude: 6.4474, longitude: 3.3903, accuracy: 18 });
  });

  it('sends the accuracy of the captured class location', async () => {
    // A coarse fix stored as the classroom rejects every student standing in
    // it, so the backend needs the accuracy to be able to refuse it.
    await createClass({ name: 'CSH 303', start_time: '2026-10-28T10:00' });

    const [endpoint, options] = mocks.apiRequest.mock.calls[0];
    expect(endpoint).toBe('/classes');
    expect(JSON.parse(options.body)).toMatchObject({
      name: 'CSH 303',
      latitude: 6.4474,
      longitude: 3.3903,
      accuracy: 18,
    });
  });

  it('still sends an absolute UTC start time', async () => {
    await createClass({ name: 'CSH 303', start_time: '2026-10-28T10:00' });

    const body = JSON.parse(mocks.apiRequest.mock.calls[0][1].body);
    expect(body.start_time).toMatch(/Z$/);
  });
});
