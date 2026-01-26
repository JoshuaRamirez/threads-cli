/**
 * Unit tests for core/models/temperature.ts
 *
 * Tests computeTemperature() function which derives temperature from updatedAt timestamp.
 */

import { computeTemperature, TEMPERATURE_THRESHOLDS, TEMPERATURE_ORDER } from '@redjay/threads-core';

describe('computeTemperature', () => {
  const NOW = new Date('2024-06-15T12:00:00.000Z');

  // Helper to create ISO date string N days ago from NOW
  function daysAgo(days: number): string {
    const date = new Date(NOW);
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  describe('threshold boundaries', () => {
    test('updatedAt_Today_ReturnsHot', () => {
      expect(computeTemperature(NOW.toISOString(), NOW)).toBe('hot');
    });

    test('updatedAt_1DayAgo_ReturnsHot', () => {
      expect(computeTemperature(daysAgo(1), NOW)).toBe('hot');
    });

    test('updatedAt_1.5DaysAgo_ReturnsWarm', () => {
      expect(computeTemperature(daysAgo(1.5), NOW)).toBe('warm');
    });

    test('updatedAt_3DaysAgo_ReturnsWarm', () => {
      expect(computeTemperature(daysAgo(3), NOW)).toBe('warm');
    });

    test('updatedAt_4DaysAgo_ReturnsTepid', () => {
      expect(computeTemperature(daysAgo(4), NOW)).toBe('tepid');
    });

    test('updatedAt_7DaysAgo_ReturnsTepid', () => {
      expect(computeTemperature(daysAgo(7), NOW)).toBe('tepid');
    });

    test('updatedAt_10DaysAgo_ReturnsCold', () => {
      expect(computeTemperature(daysAgo(10), NOW)).toBe('cold');
    });

    test('updatedAt_14DaysAgo_ReturnsCold', () => {
      expect(computeTemperature(daysAgo(14), NOW)).toBe('cold');
    });

    test('updatedAt_20DaysAgo_ReturnsFreezing', () => {
      expect(computeTemperature(daysAgo(20), NOW)).toBe('freezing');
    });

    test('updatedAt_30DaysAgo_ReturnsFreezing', () => {
      expect(computeTemperature(daysAgo(30), NOW)).toBe('freezing');
    });

    test('updatedAt_31DaysAgo_ReturnsFrozen', () => {
      expect(computeTemperature(daysAgo(31), NOW)).toBe('frozen');
    });

    test('updatedAt_365DaysAgo_ReturnsFrozen', () => {
      expect(computeTemperature(daysAgo(365), NOW)).toBe('frozen');
    });
  });

  describe('edge cases', () => {
    test('updatedAt_InFuture_ReturnsHot', () => {
      const future = new Date(NOW);
      future.setDate(future.getDate() + 10);
      expect(computeTemperature(future.toISOString(), NOW)).toBe('hot');
    });

    test('defaultNow_UsesCurrentTime', () => {
      // Just a few seconds ago should be hot
      const justNow = new Date();
      justNow.setSeconds(justNow.getSeconds() - 5);
      expect(computeTemperature(justNow.toISOString())).toBe('hot');
    });
  });
});

describe('TEMPERATURE_THRESHOLDS', () => {
  test('has6Thresholds', () => {
    expect(TEMPERATURE_THRESHOLDS).toHaveLength(6);
  });

  test('orderedByMaxDays', () => {
    const maxDays = TEMPERATURE_THRESHOLDS.map(t => t.maxDays);
    for (let i = 1; i < maxDays.length; i++) {
      expect(maxDays[i]).toBeGreaterThan(maxDays[i - 1]);
    }
  });
});

describe('TEMPERATURE_ORDER', () => {
  test('has6Temperatures', () => {
    expect(TEMPERATURE_ORDER).toHaveLength(6);
  });

  test('startsWithHot', () => {
    expect(TEMPERATURE_ORDER[0]).toBe('hot');
  });

  test('endsWithFrozen', () => {
    expect(TEMPERATURE_ORDER[5]).toBe('frozen');
  });
});
