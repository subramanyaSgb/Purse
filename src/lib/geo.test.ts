import { describe, it, expect } from 'vitest';
import { haversineMeters } from './geo';

describe('haversineMeters', () => {
  it('returns 0 for identical points', () => {
    expect(haversineMeters(12.9716, 77.5946, 12.9716, 77.5946)).toBe(0);
  });

  it('approximates one degree of latitude as ~111.32 km', () => {
    // 0 deg -> 1 deg at the equator on the prime meridian
    const d = haversineMeters(0, 0, 1, 0);
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_700);
  });

  it('Bangalore (MG Road) to Mysore Palace is ~127 km great-circle', () => {
    // MG Road, Bangalore: 12.9756, 77.6066
    // Mysore Palace:      12.3052, 76.6552
    // (Road distance is ~140 km; this is straight-line / haversine.)
    const d = haversineMeters(12.9756, 77.6066, 12.3052, 76.6552);
    expect(d).toBeGreaterThan(124_000);
    expect(d).toBeLessThan(130_000);
  });

  it('is symmetric', () => {
    const a = haversineMeters(13.08, 80.27, 19.07, 72.87); // Chennai <-> Mumbai
    const b = haversineMeters(19.07, 72.87, 13.08, 80.27);
    expect(Math.abs(a - b)).toBeLessThan(0.001);
  });

  it('triangle inequality holds for three nearby points', () => {
    const a = { lat: 12.9716, lng: 77.5946 }; // Cubbon Park
    const b = { lat: 12.975, lng: 77.6 }; // MG Road metro
    const c = { lat: 12.9719, lng: 77.6412 }; // Indiranagar
    const ab = haversineMeters(a.lat, a.lng, b.lat, b.lng);
    const bc = haversineMeters(b.lat, b.lng, c.lat, c.lng);
    const ac = haversineMeters(a.lat, a.lng, c.lat, c.lng);
    expect(ab + bc).toBeGreaterThanOrEqual(ac - 1); // tolerance for FP
  });
});
