/**
 * Tests for the shared types and utilities
 */
import { describe, it, expect } from 'vitest';
import { LANGUAGES, ZIP_CITY_MAP, haversineMiles, ZIP_COORDS } from '@iraval/shared';

describe('LANGUAGES', () => {
  it('should contain English', () => {
    expect(LANGUAGES).toContain('English');
  });

  it('should contain all Indian languages', () => {
    expect(LANGUAGES).toContain('Tamil');
    expect(LANGUAGES).toContain('Telugu');
    expect(LANGUAGES).toContain('Kannada');
    expect(LANGUAGES).toContain('Malayalam');
    expect(LANGUAGES).toContain('Hindi');
  });

  it('should contain Other option', () => {
    expect(LANGUAGES).toContain('Other');
  });

  it('should be an array of strings', () => {
    expect(Array.isArray(LANGUAGES)).toBe(true);
    LANGUAGES.forEach(lang => expect(typeof lang).toBe('string'));
  });
});

describe('ZIP_CITY_MAP', () => {
  it('should have NYC zip code', () => {
    expect(ZIP_CITY_MAP['10001']).toBe('New York');
  });

  it('should have SF zip code', () => {
    expect(ZIP_CITY_MAP['94101']).toBe('San Francisco');
  });

  it('should have all major cities', () => {
    const expectedCities = ['New York', 'Beverly Hills', 'Miami', 'Chicago', 'Dallas'];
    const actualCities = Object.values(ZIP_CITY_MAP);
    expectedCities.forEach(city => expect(actualCities).toContain(city));
  });

  it('should have exactly 10 entries', () => {
    expect(Object.keys(ZIP_CITY_MAP).length).toBe(10);
  });
});

describe('ZIP_COORDS', () => {
  it('should have coordinate data for all zip codes in ZIP_CITY_MAP', () => {
    Object.keys(ZIP_CITY_MAP).forEach(zip => {
      expect(ZIP_COORDS[zip]).toBeDefined();
      expect(ZIP_COORDS[zip].lat).toBeDefined();
      expect(ZIP_COORDS[zip].lng).toBeDefined();
    });
  });

  it('should have valid coordinates for NYC', () => {
    const nyc = ZIP_COORDS['10001'];
    expect(nyc.lat).toBeGreaterThan(40);
    expect(nyc.lat).toBeLessThan(41);
    expect(nyc.lng).toBeGreaterThan(-74);
    expect(nyc.lng).toBeLessThan(-73);
  });
});

describe('haversineMiles', () => {
  it('should return 0 for same point', () => {
    const result = haversineMiles(40.7128, -74.006, 40.7128, -74.006);
    expect(result).toBeCloseTo(0, 5);
  });

  it('should calculate approximate NYC to SF distance', () => {
    const result = haversineMiles(40.7128, -74.006, 37.7749, -122.4194);
    expect(result).toBeGreaterThan(2500);
    expect(result).toBeLessThan(2600);
  });

  it('should calculate approximate NYC to Miami distance', () => {
    const result = haversineMiles(40.7128, -74.006, 25.7617, -80.1918);
    expect(result).toBeGreaterThan(1000);
    expect(result).toBeLessThan(1100);
  });

  it('should be symmetric', () => {
    const d1 = haversineMiles(40.7128, -74.006, 37.7749, -122.4194);
    const d2 = haversineMiles(37.7749, -122.4194, 40.7128, -74.006);
    expect(d1).toBeCloseTo(d2, 2);
  });

  it('should return positive distances', () => {
    const result = haversineMiles(0, 0, 1, 1);
    expect(result).toBeGreaterThan(0);
  });
});
