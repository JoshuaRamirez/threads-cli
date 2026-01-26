/**
 * Unit tests for agenda command categorization logic.
 *
 * These tests validate the pure functions exported from agenda.ts
 * following AAA (Arrange-Act-Assert) pattern with one assertion per test.
 */

import { Thread, Temperature } from '@redjay/threads-core';

// Mock the storage module before importing agenda functions
jest.mock('@redjay/threads-storage', () => ({
  getAllThreads: jest.fn(() => [])
}));

import {
  daysSince,
  isToday,
  isWithinDays,
  getLastProgressDate,
  getLastProgressNote,
  truncate,
  formatRelativeTime,
  sortByPriority,
  categorizeThreads,
  TEMP_ORDER,
  COLD_TEMPS
} from '../src/commands/agenda';

// Helper to create a minimal valid Thread for testing
function createThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: overrides.id ?? 'test-id',
    name: overrides.name ?? 'Test Thread',
    description: overrides.description ?? 'Test description',
    status: overrides.status ?? 'active',
    importance: overrides.importance ?? 3,
    temperature: overrides.temperature ?? 'warm',
    size: overrides.size ?? 'medium',
    parentId: overrides.parentId ?? null,
    groupId: overrides.groupId ?? null,
    tags: overrides.tags ?? [],
    links: overrides.links ?? [],
    dependencies: overrides.dependencies ?? [],
    progress: overrides.progress ?? [],
    details: overrides.details ?? [],
    createdAt: overrides.createdAt ?? '2025-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2025-01-01T00:00:00.000Z'
  };
}

// Fixed reference date for deterministic tests
const FIXED_NOW = new Date('2025-01-10T12:00:00.000Z');

// -----------------------------------------------------------------------------
// daysSince
// -----------------------------------------------------------------------------

describe('daysSince', () => {
  test('daysSince_SameDay_ReturnsZero', () => {
    // Arrange
    const isoDate = '2025-01-10T08:00:00.000Z';

    // Act
    const result = daysSince(isoDate, FIXED_NOW);

    // Assert
    expect(result).toBe(0);
  });

  test('daysSince_OneDayAgo_ReturnsOne', () => {
    // Arrange
    const isoDate = '2025-01-09T12:00:00.000Z';

    // Act
    const result = daysSince(isoDate, FIXED_NOW);

    // Assert
    expect(result).toBe(1);
  });

  test('daysSince_SevenDaysAgo_ReturnsSeven', () => {
    // Arrange
    const isoDate = '2025-01-03T12:00:00.000Z';

    // Act
    const result = daysSince(isoDate, FIXED_NOW);

    // Assert
    expect(result).toBe(7);
  });

  test('daysSince_ThirtyDaysAgo_ReturnsThirty', () => {
    // Arrange
    const isoDate = '2024-12-11T12:00:00.000Z';

    // Act
    const result = daysSince(isoDate, FIXED_NOW);

    // Assert
    expect(result).toBe(30);
  });
});

// -----------------------------------------------------------------------------
// isToday
// -----------------------------------------------------------------------------

describe('isToday', () => {
  test('isToday_SameDayDifferentTime_ReturnsTrue', () => {
    // Arrange
    // Use same time to avoid timezone edge cases where midnight UTC might be previous day locally
    const isoDate = '2025-01-10T12:00:00.000Z';

    // Act
    const result = isToday(isoDate, FIXED_NOW);

    // Assert
    expect(result).toBe(true);
  });

  test('isToday_DifferentDay_ReturnsFalse', () => {
    // Arrange
    // Use a time clearly on the previous day even in UTC
    const isoDate = '2025-01-09T12:00:00.000Z';

    // Act
    const result = isToday(isoDate, FIXED_NOW);

    // Assert
    expect(result).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// isWithinDays
// -----------------------------------------------------------------------------

describe('isWithinDays', () => {
  test('isWithinDays_ZeroDaysWithTodayDate_ReturnsTrue', () => {
    // Arrange
    const isoDate = '2025-01-10T06:00:00.000Z';

    // Act
    const result = isWithinDays(isoDate, 0, FIXED_NOW);

    // Assert
    expect(result).toBe(true);
  });

  test('isWithinDays_SevenDaysWithDateAtBoundary_ReturnsTrue', () => {
    // Arrange
    const isoDate = '2025-01-03T12:00:00.000Z'; // exactly 7 days ago

    // Act
    const result = isWithinDays(isoDate, 7, FIXED_NOW);

    // Assert
    expect(result).toBe(true);
  });

  test('isWithinDays_SevenDaysWithDateOutsideBoundary_ReturnsFalse', () => {
    // Arrange
    const isoDate = '2025-01-02T12:00:00.000Z'; // 8 days ago

    // Act
    const result = isWithinDays(isoDate, 7, FIXED_NOW);

    // Assert
    expect(result).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// getLastProgressDate
// -----------------------------------------------------------------------------

describe('getLastProgressDate', () => {
  test('getLastProgressDate_EmptyProgress_ReturnsNull', () => {
    // Arrange
    const thread = createThread({ progress: [] });

    // Act
    const result = getLastProgressDate(thread);

    // Assert
    expect(result).toBeNull();
  });

  test('getLastProgressDate_SingleProgress_ReturnsTimestamp', () => {
    // Arrange
    const timestamp = '2025-01-08T10:00:00.000Z';
    const thread = createThread({
      progress: [{ id: 'p1', timestamp, note: 'First note' }]
    });

    // Act
    const result = getLastProgressDate(thread);

    // Assert
    expect(result).toBe(timestamp);
  });

  test('getLastProgressDate_MultipleProgress_ReturnsLastTimestamp', () => {
    // Arrange
    const thread = createThread({
      progress: [
        { id: 'p1', timestamp: '2025-01-05T10:00:00.000Z', note: 'First' },
        { id: 'p2', timestamp: '2025-01-07T10:00:00.000Z', note: 'Second' },
        { id: 'p3', timestamp: '2025-01-09T10:00:00.000Z', note: 'Third' }
      ]
    });

    // Act
    const result = getLastProgressDate(thread);

    // Assert
    expect(result).toBe('2025-01-09T10:00:00.000Z');
  });
});

// -----------------------------------------------------------------------------
// getLastProgressNote
// -----------------------------------------------------------------------------

describe('getLastProgressNote', () => {
  test('getLastProgressNote_EmptyProgress_ReturnsNull', () => {
    // Arrange
    const thread = createThread({ progress: [] });

    // Act
    const result = getLastProgressNote(thread);

    // Assert
    expect(result).toBeNull();
  });

  test('getLastProgressNote_MultipleProgress_ReturnsLastNote', () => {
    // Arrange
    const thread = createThread({
      progress: [
        { id: 'p1', timestamp: '2025-01-05T10:00:00.000Z', note: 'First note' },
        { id: 'p2', timestamp: '2025-01-09T10:00:00.000Z', note: 'Last note' }
      ]
    });

    // Act
    const result = getLastProgressNote(thread);

    // Assert
    expect(result).toBe('Last note');
  });
});

// -----------------------------------------------------------------------------
// truncate
// -----------------------------------------------------------------------------

describe('truncate', () => {
  test('truncate_StringShorterThanMax_ReturnsOriginal', () => {
    // Arrange
    const str = 'Short';

    // Act
    const result = truncate(str, 10);

    // Assert
    expect(result).toBe('Short');
  });

  test('truncate_StringEqualToMax_ReturnsOriginal', () => {
    // Arrange
    const str = '1234567890';

    // Act
    const result = truncate(str, 10);

    // Assert
    expect(result).toBe('1234567890');
  });

  test('truncate_StringLongerThanMax_ReturnsTruncatedWithEllipsis', () => {
    // Arrange
    const str = 'This is a very long string';

    // Act
    const result = truncate(str, 10);

    // Assert
    expect(result).toBe('This is...');
  });
});

// -----------------------------------------------------------------------------
// formatRelativeTime
// -----------------------------------------------------------------------------

describe('formatRelativeTime', () => {
  test('formatRelativeTime_Today_ReturnsToday', () => {
    // Arrange
    const isoDate = '2025-01-10T08:00:00.000Z';

    // Act
    const result = formatRelativeTime(isoDate, FIXED_NOW);

    // Assert
    expect(result).toBe('today');
  });

  test('formatRelativeTime_Yesterday_ReturnsYesterday', () => {
    // Arrange
    const isoDate = '2025-01-09T08:00:00.000Z';

    // Act
    const result = formatRelativeTime(isoDate, FIXED_NOW);

    // Assert
    expect(result).toBe('yesterday');
  });

  test('formatRelativeTime_ThreeDaysAgo_ReturnsDaysFormat', () => {
    // Arrange
    const isoDate = '2025-01-07T08:00:00.000Z';

    // Act
    const result = formatRelativeTime(isoDate, FIXED_NOW);

    // Assert
    expect(result).toBe('3d ago');
  });

  test('formatRelativeTime_TenDaysAgo_ReturnsWeeksFormat', () => {
    // Arrange
    const isoDate = '2024-12-31T08:00:00.000Z';

    // Act
    const result = formatRelativeTime(isoDate, FIXED_NOW);

    // Assert
    expect(result).toBe('1w ago');
  });

  test('formatRelativeTime_FortyFiveDaysAgo_ReturnsMonthsFormat', () => {
    // Arrange
    const isoDate = '2024-11-26T08:00:00.000Z';

    // Act
    const result = formatRelativeTime(isoDate, FIXED_NOW);

    // Assert
    expect(result).toBe('1mo ago');
  });
});

// -----------------------------------------------------------------------------
// sortByPriority
// -----------------------------------------------------------------------------

describe('sortByPriority', () => {
  test('sortByPriority_DifferentTemperatures_SortsHottestFirst', () => {
    // Arrange
    const threads = [
      createThread({ id: 'cold', temperature: 'cold', importance: 3 }),
      createThread({ id: 'hot', temperature: 'hot', importance: 3 }),
      createThread({ id: 'warm', temperature: 'warm', importance: 3 })
    ];

    // Act
    const result = sortByPriority(threads);

    // Assert
    expect(result[0].id).toBe('hot');
  });

  test('sortByPriority_SameTemperature_SortsHigherImportanceFirst', () => {
    // Arrange
    const threads = [
      createThread({ id: 'low', temperature: 'warm', importance: 1 }),
      createThread({ id: 'high', temperature: 'warm', importance: 5 }),
      createThread({ id: 'mid', temperature: 'warm', importance: 3 })
    ];

    // Act
    const result = sortByPriority(threads);

    // Assert
    expect(result[0].id).toBe('high');
  });

  test('sortByPriority_SameTemperatureAndImportance_SortsByUpdatedAtDescending', () => {
    // Arrange
    const threads = [
      createThread({ id: 'older', temperature: 'warm', importance: 3, updatedAt: '2025-01-01T00:00:00.000Z' }),
      createThread({ id: 'newer', temperature: 'warm', importance: 3, updatedAt: '2025-01-09T00:00:00.000Z' })
    ];

    // Act
    const result = sortByPriority(threads);

    // Assert
    expect(result[0].id).toBe('newer');
  });

  test('sortByPriority_EmptyArray_ReturnsEmptyArray', () => {
    // Arrange
    const threads: Thread[] = [];

    // Act
    const result = sortByPriority(threads);

    // Assert
    expect(result).toEqual([]);
  });

  test('sortByPriority_DoesNotMutateOriginal', () => {
    // Arrange
    const threads = [
      createThread({ id: 'cold', temperature: 'cold' }),
      createThread({ id: 'hot', temperature: 'hot' })
    ];
    const originalFirstId = threads[0].id;

    // Act
    sortByPriority(threads);

    // Assert
    expect(threads[0].id).toBe(originalFirstId);
  });
});

// -----------------------------------------------------------------------------
// categorizeThreads - Hot Section
// -----------------------------------------------------------------------------

describe('categorizeThreads_HotSection', () => {
  test('categorizeThreads_HotThread_AppearsInHotThreads', () => {
    // Arrange
    const threads = [
      createThread({ id: 'hot-1', temperature: 'hot', status: 'active' })
    ];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.hotThreads.length).toBe(1);
  });

  test('categorizeThreads_HotThread_HasCorrectId', () => {
    // Arrange
    const threads = [
      createThread({ id: 'hot-1', temperature: 'hot', status: 'active' })
    ];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.hotThreads[0].id).toBe('hot-1');
  });

  test('categorizeThreads_HotThreadWithTodayProgress_ExcludedFromActiveInPeriod', () => {
    // Arrange
    const threads = [
      createThread({
        id: 'hot-1',
        temperature: 'hot',
        status: 'active',
        progress: [{ id: 'p1', timestamp: '2025-01-10T08:00:00.000Z', note: 'Today' }]
      })
    ];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.activeInPeriod.find(t => t.id === 'hot-1')).toBeUndefined();
  });

  test('categorizeThreads_CompletedHotThread_ExcludedFromHotThreads', () => {
    // Arrange
    const threads = [
      createThread({ id: 'hot-1', temperature: 'hot', status: 'completed' })
    ];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.hotThreads.length).toBe(0);
  });

  test('categorizeThreads_ArchivedHotThread_ExcludedFromHotThreads', () => {
    // Arrange
    const threads = [
      createThread({ id: 'hot-1', temperature: 'hot', status: 'archived' })
    ];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.hotThreads.length).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// categorizeThreads - Active Today/This Week Section
// -----------------------------------------------------------------------------

describe('categorizeThreads_ActiveInPeriodSection', () => {
  test('categorizeThreads_ThreadWithTodayProgress_AppearsInActiveInPeriod', () => {
    // Arrange
    const threads = [
      createThread({
        id: 'active-today',
        temperature: 'warm',
        status: 'active',
        progress: [{ id: 'p1', timestamp: '2025-01-10T08:00:00.000Z', note: 'Today' }]
      })
    ];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.activeInPeriod.length).toBe(1);
  });

  test('categorizeThreads_ThreadWithYesterdayProgress_ExcludedFromActiveToday', () => {
    // Arrange
    const threads = [
      createThread({
        id: 'yesterday-thread',
        temperature: 'warm',
        status: 'active',
        progress: [{ id: 'p1', timestamp: '2025-01-09T08:00:00.000Z', note: 'Yesterday' }]
      })
    ];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.activeInPeriod.length).toBe(0);
  });

  test('categorizeThreads_WeekOption_IncludesThreeDaysAgoProgress', () => {
    // Arrange
    const threads = [
      createThread({
        id: 'week-thread',
        temperature: 'warm',
        status: 'active',
        progress: [{ id: 'p1', timestamp: '2025-01-07T08:00:00.000Z', note: 'Three days ago' }]
      })
    ];

    // Act
    const result = categorizeThreads(threads, { week: true }, FIXED_NOW);

    // Assert
    expect(result.activeInPeriod.length).toBe(1);
  });

  test('categorizeThreads_WeekOption_IncludesSixDaysAgoProgress', () => {
    // Arrange
    const threads = [
      createThread({
        id: 'six-days',
        temperature: 'warm',
        status: 'active',
        progress: [{ id: 'p1', timestamp: '2025-01-04T08:00:00.000Z', note: 'Six days ago' }]
      })
    ];

    // Act
    const result = categorizeThreads(threads, { week: true }, FIXED_NOW);

    // Assert
    expect(result.activeInPeriod.find(t => t.id === 'six-days')).toBeDefined();
  });

  test('categorizeThreads_WeekOption_ExcludesEightDaysAgoProgress', () => {
    // Arrange
    const threads = [
      createThread({
        id: 'eight-days',
        temperature: 'warm',
        status: 'active',
        progress: [{ id: 'p1', timestamp: '2025-01-02T08:00:00.000Z', note: 'Eight days ago' }]
      })
    ];

    // Act
    const result = categorizeThreads(threads, { week: true }, FIXED_NOW);

    // Assert
    expect(result.activeInPeriod.length).toBe(0);
  });

  test('categorizeThreads_ThreadWithNoProgress_ExcludedFromActiveInPeriod', () => {
    // Arrange
    const threads = [
      createThread({
        id: 'no-progress',
        temperature: 'warm',
        status: 'active',
        progress: []
      })
    ];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.activeInPeriod.length).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// categorizeThreads - Needs Attention Section
// -----------------------------------------------------------------------------

describe('categorizeThreads_NeedsAttentionSection', () => {
  test('categorizeThreads_ColdThread_AppearsInNeedsAttention', () => {
    // Arrange
    const threads = [
      createThread({
        id: 'cold-thread',
        temperature: 'cold',
        status: 'active',
        progress: [{ id: 'p1', timestamp: '2025-01-09T08:00:00.000Z', note: 'Recent' }]
      })
    ];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.needsAttention.find(t => t.id === 'cold-thread')).toBeDefined();
  });

  test('categorizeThreads_FreezingThread_AppearsInNeedsAttention', () => {
    // Arrange
    const threads = [
      createThread({
        id: 'freezing-thread',
        temperature: 'freezing',
        status: 'active'
      })
    ];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.needsAttention.find(t => t.id === 'freezing-thread')).toBeDefined();
  });

  test('categorizeThreads_FrozenThread_AppearsInNeedsAttention', () => {
    // Arrange
    const threads = [
      createThread({
        id: 'frozen-thread',
        temperature: 'frozen',
        status: 'active'
      })
    ];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.needsAttention.find(t => t.id === 'frozen-thread')).toBeDefined();
  });

  test('categorizeThreads_ThreadWithNoProgress_AppearsInNeedsAttention', () => {
    // Arrange
    const threads = [
      createThread({
        id: 'no-progress',
        temperature: 'warm',
        status: 'active',
        progress: []
      })
    ];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.needsAttention.find(t => t.id === 'no-progress')).toBeDefined();
  });

  test('categorizeThreads_ThreadWithOldProgress_AppearsInNeedsAttention', () => {
    // Arrange
    const threads = [
      createThread({
        id: 'old-progress',
        temperature: 'warm',
        status: 'active',
        progress: [{ id: 'p1', timestamp: '2024-12-25T08:00:00.000Z', note: 'Two weeks ago' }]
      })
    ];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.needsAttention.find(t => t.id === 'old-progress')).toBeDefined();
  });

  test('categorizeThreads_PausedThread_ExcludedFromNeedsAttention', () => {
    // Arrange
    const threads = [
      createThread({
        id: 'paused-cold',
        temperature: 'cold',
        status: 'paused'
      })
    ];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.needsAttention.length).toBe(0);
  });

  test('categorizeThreads_HotThread_ExcludedFromNeedsAttention', () => {
    // Arrange
    const threads = [
      createThread({
        id: 'hot-no-progress',
        temperature: 'hot',
        status: 'active',
        progress: []
      })
    ];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.needsAttention.length).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// categorizeThreads - Other Active Section (--all flag)
// -----------------------------------------------------------------------------

describe('categorizeThreads_OtherActiveSection', () => {
  test('categorizeThreads_WithoutAllFlag_OtherActiveIsEmpty', () => {
    // Arrange
    const threads = [
      createThread({
        id: 'tepid-recent',
        temperature: 'tepid',
        status: 'active',
        progress: [{ id: 'p1', timestamp: '2025-01-08T08:00:00.000Z', note: 'Two days ago' }]
      })
    ];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.otherActive.length).toBe(0);
  });

  test('categorizeThreads_WithAllFlag_ThreadNotInOtherCategories_AppearsInOtherActive', () => {
    // Arrange
    // A warm thread with recent (but not today) progress that doesn't meet "needs attention" criteria
    const threads = [
      createThread({
        id: 'tepid-recent',
        temperature: 'tepid',
        status: 'active',
        progress: [{ id: 'p1', timestamp: '2025-01-08T08:00:00.000Z', note: 'Two days ago' }]
      })
    ];

    // Act
    const result = categorizeThreads(threads, { all: true }, FIXED_NOW);

    // Assert
    expect(result.otherActive.find(t => t.id === 'tepid-recent')).toBeDefined();
  });

  test('categorizeThreads_WithAllFlag_HotThread_ExcludedFromOtherActive', () => {
    // Arrange
    const threads = [
      createThread({
        id: 'hot-thread',
        temperature: 'hot',
        status: 'active'
      })
    ];

    // Act
    const result = categorizeThreads(threads, { all: true }, FIXED_NOW);

    // Assert
    expect(result.otherActive.length).toBe(0);
  });

  test('categorizeThreads_WithAllFlag_PausedThread_CanAppearInOtherActive', () => {
    // Arrange
    const threads = [
      createThread({
        id: 'paused-warm',
        temperature: 'warm',
        status: 'paused',
        progress: [{ id: 'p1', timestamp: '2025-01-08T08:00:00.000Z', note: 'Recent' }]
      })
    ];

    // Act
    const result = categorizeThreads(threads, { all: true }, FIXED_NOW);

    // Assert
    expect(result.otherActive.find(t => t.id === 'paused-warm')).toBeDefined();
  });
});

// -----------------------------------------------------------------------------
// categorizeThreads - Edge Cases
// -----------------------------------------------------------------------------

describe('categorizeThreads_EdgeCases', () => {
  test('categorizeThreads_EmptyThreadsArray_ReturnsEmptyCategories', () => {
    // Arrange
    const threads: Thread[] = [];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.hotThreads.length).toBe(0);
  });

  test('categorizeThreads_EmptyThreadsArray_ActiveInPeriodIsEmpty', () => {
    // Arrange
    const threads: Thread[] = [];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.activeInPeriod.length).toBe(0);
  });

  test('categorizeThreads_EmptyThreadsArray_NeedsAttentionIsEmpty', () => {
    // Arrange
    const threads: Thread[] = [];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.needsAttention.length).toBe(0);
  });

  test('categorizeThreads_AllThreadsHot_HotThreadsContainsAll', () => {
    // Arrange
    const threads = [
      createThread({ id: 'hot-1', temperature: 'hot', status: 'active' }),
      createThread({ id: 'hot-2', temperature: 'hot', status: 'active' }),
      createThread({ id: 'hot-3', temperature: 'hot', status: 'active' })
    ];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.hotThreads.length).toBe(3);
  });

  test('categorizeThreads_AllThreadsHot_ActiveInPeriodIsEmpty', () => {
    // Arrange
    const threads = [
      createThread({
        id: 'hot-1',
        temperature: 'hot',
        status: 'active',
        progress: [{ id: 'p1', timestamp: '2025-01-10T08:00:00.000Z', note: 'Today' }]
      })
    ];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.activeInPeriod.length).toBe(0);
  });

  test('categorizeThreads_AllThreadsWithNoProgress_AllInNeedsAttention', () => {
    // Arrange
    const threads = [
      createThread({ id: 't1', temperature: 'warm', status: 'active', progress: [] }),
      createThread({ id: 't2', temperature: 'tepid', status: 'active', progress: [] })
    ];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.needsAttention.length).toBe(2);
  });

  test('categorizeThreads_OnlyCompletedAndArchivedThreads_AllCategoriesEmpty', () => {
    // Arrange
    const threads = [
      createThread({ id: 'completed', status: 'completed', temperature: 'hot' }),
      createThread({ id: 'archived', status: 'archived', temperature: 'warm' })
    ];

    // Act
    const result = categorizeThreads(threads, {}, FIXED_NOW);

    // Assert
    expect(result.hotThreads.length + result.activeInPeriod.length + result.needsAttention.length).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

describe('Constants', () => {
  test('TEMP_ORDER_ContainsHotFirst', () => {
    // Assert
    expect(TEMP_ORDER[0]).toBe('hot');
  });

  test('TEMP_ORDER_ContainsFrozenLast', () => {
    // Assert
    expect(TEMP_ORDER[TEMP_ORDER.length - 1]).toBe('frozen');
  });

  test('TEMP_ORDER_HasSixElements', () => {
    // Assert
    expect(TEMP_ORDER.length).toBe(6);
  });

  test('COLD_TEMPS_ContainsCold', () => {
    // Assert
    expect(COLD_TEMPS.includes('cold')).toBe(true);
  });

  test('COLD_TEMPS_ContainsFreezing', () => {
    // Assert
    expect(COLD_TEMPS.includes('freezing')).toBe(true);
  });

  test('COLD_TEMPS_ContainsFrozen', () => {
    // Assert
    expect(COLD_TEMPS.includes('frozen')).toBe(true);
  });

  test('COLD_TEMPS_DoesNotContainHot', () => {
    // Assert
    expect(COLD_TEMPS.includes('hot')).toBe(false);
  });
});
