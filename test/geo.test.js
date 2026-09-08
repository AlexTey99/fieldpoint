import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { boundingBox, haversineKm } from '../src/sites/geo.js';

describe('geo helpers', () => {
  it('measures known distances', () => {
    // Boston → New York is ~306 km.
    const bostonToNewYork = haversineKm(42.3601, -71.0589, 40.7128, -74.006);
    assert.ok(Math.abs(bostonToNewYork - 306) < 5, `got ${bostonToNewYork}`);
    assert.equal(haversineKm(10, 20, 10, 20), 0);
  });

  it('is symmetric', () => {
    const there = haversineKm(51.5, -0.12, 48.85, 2.35);
    const back = haversineKm(48.85, 2.35, 51.5, -0.12);
    assert.ok(Math.abs(there - back) < 1e-9);
  });

  it('builds a box that contains the radius', () => {
    const box = boundingBox(42.35, -71.06, 10);
    assert.ok(box.minLat < 42.35 && box.maxLat > 42.35);
    assert.ok(box.minLng < -71.06 && box.maxLng > -71.06);
    // A point exactly 10 km north must fall inside the box.
    const northLat = 42.35 + 10 / 111.32;
    assert.ok(northLat <= box.maxLat + 1e-9);
    assert.equal(box.spansAllLongitudes, false);
  });

  it('flags a radius that wraps the globe instead of splitting the range', () => {
    assert.equal(boundingBox(0, 0, 20100).spansAllLongitudes, true);
    assert.equal(boundingBox(0, 0, 100).spansAllLongitudes, false);
  });

  it('covers every meridian when the circle reaches a pole', () => {
    // The pole is ~11 km from 89.9°N, so a 50 km circle wraps every longitude.
    const box = boundingBox(89.9, 0, 50);
    assert.equal(box.spansAllLongitudes, true);
    assert.equal(box.maxLat, 90);
  });
});
