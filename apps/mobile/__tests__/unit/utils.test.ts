/**
 * Utility function tests for the Iraval mobile app
 */
import { describe, it, expect } from 'vitest';

// Haversine formula implementation for distance calculation
function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

describe('haversineMiles', () => {
  it('should return 0 for same coordinates', () => {
    const distance = haversineMiles(40.7128, -74.006, 40.7128, -74.006);
    expect(distance).toBeCloseTo(0, 4);
  });

  it('should calculate approximate distance between New York and San Francisco', () => {
    // NYC: 40.7128, -74.006
    // SF: 37.7749, -122.4194
    const distance = haversineMiles(40.7128, -74.006, 37.7749, -122.4194);
    expect(distance).toBeGreaterThan(2500);
    expect(distance).toBeLessThan(3000);
    // Actual is ~2566 miles
    expect(distance).toBeCloseTo(2566, 0);
  });

  it('should calculate distance between NYC and Miami', () => {
    // NYC: 40.7128, -74.006
    // Miami: 25.7617, -80.1918
    const distance = haversineMiles(40.7128, -74.006, 25.7617, -80.1918);
    expect(distance).toBeGreaterThan(1000);
    expect(distance).toBeLessThan(1500);
    // Actual is ~1092 miles
    expect(distance).toBeCloseTo(1092, 0);
  });

  it('should calculate distance between Chicago and Dallas', () => {
    // Chicago: 41.8781, -87.6298
    // Dallas: 32.7767, -96.7970
    const distance = haversineMiles(41.8781, -87.6298, 32.7767, -96.797);
    // Actual is ~805 miles
    expect(distance).toBeGreaterThan(750);
    expect(distance).toBeLessThan(850);
  });

  it('should be symmetric (A to B = B to A)', () => {
    const dist1 = haversineMiles(40.7128, -74.006, 37.7749, -122.4194);
    const dist2 = haversineMiles(37.7749, -122.4194, 40.7128, -74.006);
    expect(dist1).toBeCloseTo(dist2, 2);
  });

  it('should handle same city with small distances', () => {
    const distance = haversineMiles(40.7506, -73.9972, 40.758, -73.9855);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(2); // Less than 2 miles
  });
});

describe('Chat ID Generation', () => {
  function getChatId(uid1: string, uid2: string): string {
    const ids = [uid1, uid2].sort();
    return `chat_${ids[0]}_${ids[1]}`;
  }

  it('should generate consistent chat ID regardless of order', () => {
    const id1 = getChatId('userA', 'userB');
    const id2 = getChatId('userB', 'userA');
    expect(id1).toBe(id2);
  });

  it('should include both UIDs in the chat ID', () => {
    const chatId = getChatId('abc123', 'def456');
    expect(chatId).toContain('chat_');
    expect(chatId).toContain('abc123');
    expect(chatId).toContain('def456');
  });

  it('should produce unique chat IDs for different user pairs', () => {
    const id1 = getChatId('userA', 'userB');
    const id2 = getChatId('userA', 'userC');
    expect(id1).not.toBe(id2);
  });
});

describe('Password Validation', () => {
  function isValidPassword(password: string): boolean {
    return password.length >= 6;
  }

  it('should accept passwords with 6+ characters', () => {
    expect(isValidPassword('123456')).toBe(true);
    expect(isValidPassword('password123')).toBe(true);
  });

  it('should reject passwords with less than 6 characters', () => {
    expect(isValidPassword('12345')).toBe(false);
    expect(isValidPassword('abc')).toBe(false);
    expect(isValidPassword('')).toBe(false);
  });
});

describe('Age Verification', () => {
  function isOver21(birthDateString: string): boolean {
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 21;
  }

  it('should accept users born more than 21 years ago', () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 30);
    expect(isOver21(pastDate.toISOString())).toBe(true);
  });

  it('should reject users who are 20 years old', () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 20);
    expect(isOver21(pastDate.toISOString())).toBe(false);
  });

  it('should accept users who just turned 21', () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 21);
    expect(isOver21(pastDate.toISOString())).toBe(true);
  });

  it('should reject null/empty dates', () => {
    expect(isOver21('')).toBe(false);
  });
});

describe('ZIP Code Validation', () => {
  function isValidZip(zip: string): boolean {
    return /^\d{5}$/.test(zip);
  }

  it('should accept valid 5-digit zip codes', () => {
    expect(isValidZip('10001')).toBe(true);
    expect(isValidZip('90210')).toBe(true);
    expect(isValidZip('00501')).toBe(true);
  });

  it('should reject invalid zip codes', () => {
    expect(isValidZip('1000')).toBe(false);
    expect(isValidZip('100011')).toBe(false);
    expect(isValidZip('abcde')).toBe(false);
    expect(isValidZip('')).toBe(false);
  });
});
