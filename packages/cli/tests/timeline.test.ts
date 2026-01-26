import { Thread, ProgressEntry } from '@redjay/threads-core';
import {
  parseDate,
  truncate,
  collectTimelineEntries,
  filterByDateRange,
  sortTimelineEntries,
  applyLimit,
  TimelineEntry
} from '../src/commands/timeline';

// Factory for creating mock threads
function createMockThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: 'thread-1',
    name: 'Test Thread',
    description: 'A test thread',
    status: 'active',
    importance: 3,
    temperature: 'warm',
    size: 'medium',
    parentId: null,
    groupId: null,
    tags: [],
    dependencies: [],
    progress: [],
    details: [],
    links: [],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides
  };
}

// Factory for creating mock progress entries
function createMockProgress(overrides: Partial<ProgressEntry> = {}): ProgressEntry {
  return {
    id: 'progress-1',
    timestamp: '2025-01-01T12:00:00.000Z',
    note: 'Test progress note',
    ...overrides
  };
}

// -----------------------------------------------------------------------------
// parseDate Tests
// -----------------------------------------------------------------------------

describe('parseDate', () => {
  describe('parseDate_ValidISOString_ReturnsDateObject', () => {
    it('should return a Date instance for valid ISO string', () => {
      // Arrange
      const dateStr = '2025-01-15T10:30:00.000Z';

      // Act
      const result = parseDate(dateStr);

      // Assert
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('parseDate_ValidISOString_ReturnsCorrectTimestamp', () => {
    it('should return correct timestamp value', () => {
      // Arrange
      const dateStr = '2025-01-15T10:30:00.000Z';
      const expectedTime = new Date(dateStr).getTime();

      // Act
      const result = parseDate(dateStr);

      // Assert
      expect(result?.getTime()).toBe(expectedTime);
    });
  });

  describe('parseDate_SimpleDateString_ReturnsDateObject', () => {
    it('should parse simple date format', () => {
      // Arrange
      const dateStr = '2025-01-15';

      // Act
      const result = parseDate(dateStr);

      // Assert
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('parseDate_DateTimeWithoutTimezone_ReturnsDateObject', () => {
    it('should parse datetime without timezone', () => {
      // Arrange
      const dateStr = '2025-01-15 10:30:00';

      // Act
      const result = parseDate(dateStr);

      // Assert
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('parseDate_InvalidDateString_ReturnsNull', () => {
    it('should return null for invalid date', () => {
      // Arrange
      const dateStr = 'not-a-date';

      // Act
      const result = parseDate(dateStr);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('parseDate_EmptyString_ReturnsNull', () => {
    it('should return null for empty string', () => {
      // Arrange
      const dateStr = '';

      // Act
      const result = parseDate(dateStr);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('parseDate_GarbageString_ReturnsNull', () => {
    it('should return null for garbage input', () => {
      // Arrange
      const dateStr = 'abc123xyz';

      // Act
      const result = parseDate(dateStr);

      // Assert
      expect(result).toBeNull();
    });
  });
});

// -----------------------------------------------------------------------------
// truncate Tests
// -----------------------------------------------------------------------------

describe('truncate', () => {
  describe('truncate_StringShorterThanMax_ReturnsOriginalString', () => {
    it('should return original when shorter than max', () => {
      // Arrange
      const str = 'Short';
      const maxLen = 20;

      // Act
      const result = truncate(str, maxLen);

      // Assert
      expect(result).toBe('Short');
    });
  });

  describe('truncate_StringEqualToMax_ReturnsOriginalString', () => {
    it('should return original when equal to max', () => {
      // Arrange
      const str = '12345';
      const maxLen = 5;

      // Act
      const result = truncate(str, maxLen);

      // Assert
      expect(result).toBe('12345');
    });
  });

  describe('truncate_StringLongerThanMax_ReturnsTruncatedLength', () => {
    it('should return string of max length', () => {
      // Arrange
      const str = 'This is a very long string';
      const maxLen = 10;

      // Act
      const result = truncate(str, maxLen);

      // Assert
      expect(result.length).toBe(10);
    });
  });

  describe('truncate_StringLongerThanMax_EndsWithEllipsis', () => {
    it('should end with ellipsis character', () => {
      // Arrange
      const str = 'This is a very long string';
      const maxLen = 10;

      // Act
      const result = truncate(str, maxLen);

      // Assert
      expect(result.endsWith('\u2026')).toBe(true);
    });
  });
});

// -----------------------------------------------------------------------------
// collectTimelineEntries Tests
// -----------------------------------------------------------------------------

describe('collectTimelineEntries', () => {
  describe('collectTimelineEntries_EmptyThreadArray_ReturnsEmptyArray', () => {
    it('should return empty array for no threads', () => {
      // Arrange
      const threads: Thread[] = [];

      // Act
      const result = collectTimelineEntries(threads);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('collectTimelineEntries_ThreadWithNoProgress_ReturnsEmptyArray', () => {
    it('should return empty for thread without progress', () => {
      // Arrange
      const thread = createMockThread({ progress: [] });

      // Act
      const result = collectTimelineEntries([thread]);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('collectTimelineEntries_SingleThreadSingleProgress_ReturnsOneEntry', () => {
    it('should return one entry for single progress', () => {
      // Arrange
      const progress = createMockProgress();
      const thread = createMockThread({ progress: [progress] });

      // Act
      const result = collectTimelineEntries([thread]);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('collectTimelineEntries_SingleThreadMultipleProgress_ReturnsAllEntries', () => {
    it('should return all progress entries', () => {
      // Arrange
      const progress1 = createMockProgress({ id: 'p1' });
      const progress2 = createMockProgress({ id: 'p2' });
      const progress3 = createMockProgress({ id: 'p3' });
      const thread = createMockThread({ progress: [progress1, progress2, progress3] });

      // Act
      const result = collectTimelineEntries([thread]);

      // Assert
      expect(result).toHaveLength(3);
    });
  });

  describe('collectTimelineEntries_MultipleThreads_CollectsFromAll', () => {
    it('should collect from multiple threads', () => {
      // Arrange
      const thread1 = createMockThread({
        id: 't1',
        progress: [createMockProgress({ id: 'p1' })]
      });
      const thread2 = createMockThread({
        id: 't2',
        progress: [createMockProgress({ id: 'p2' }), createMockProgress({ id: 'p3' })]
      });

      // Act
      const result = collectTimelineEntries([thread1, thread2]);

      // Assert
      expect(result).toHaveLength(3);
    });
  });

  describe('collectTimelineEntries_Entry_ContainsCorrectThreadReference', () => {
    it('should reference the correct thread', () => {
      // Arrange
      const progress = createMockProgress();
      const thread = createMockThread({ id: 'unique-thread-id', progress: [progress] });

      // Act
      const result = collectTimelineEntries([thread]);

      // Assert
      expect(result[0].thread.id).toBe('unique-thread-id');
    });
  });

  describe('collectTimelineEntries_Entry_ContainsCorrectProgressReference', () => {
    it('should reference the correct progress', () => {
      // Arrange
      const progress = createMockProgress({ note: 'unique note content' });
      const thread = createMockThread({ progress: [progress] });

      // Act
      const result = collectTimelineEntries([thread]);

      // Assert
      expect(result[0].progress.note).toBe('unique note content');
    });
  });
});

// -----------------------------------------------------------------------------
// sortTimelineEntries Tests
// -----------------------------------------------------------------------------

describe('sortTimelineEntries', () => {
  describe('sortTimelineEntries_DefaultOrder_NewestFirst', () => {
    it('should place newest entry first by default', () => {
      // Arrange
      const thread = createMockThread();
      const entries: TimelineEntry[] = [
        { thread, progress: createMockProgress({ timestamp: '2025-01-01T00:00:00Z' }) },
        { thread, progress: createMockProgress({ timestamp: '2025-01-03T00:00:00Z' }) },
        { thread, progress: createMockProgress({ timestamp: '2025-01-02T00:00:00Z' }) }
      ];

      // Act
      const result = sortTimelineEntries(entries);

      // Assert
      expect(result[0].progress.timestamp).toBe('2025-01-03T00:00:00Z');
    });
  });

  describe('sortTimelineEntries_DefaultOrder_OldestLast', () => {
    it('should place oldest entry last by default', () => {
      // Arrange
      const thread = createMockThread();
      const entries: TimelineEntry[] = [
        { thread, progress: createMockProgress({ timestamp: '2025-01-01T00:00:00Z' }) },
        { thread, progress: createMockProgress({ timestamp: '2025-01-03T00:00:00Z' }) },
        { thread, progress: createMockProgress({ timestamp: '2025-01-02T00:00:00Z' }) }
      ];

      // Act
      const result = sortTimelineEntries(entries);

      // Assert
      expect(result[2].progress.timestamp).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('sortTimelineEntries_ReverseTrue_OldestFirst', () => {
    it('should place oldest entry first when reversed', () => {
      // Arrange
      const thread = createMockThread();
      const entries: TimelineEntry[] = [
        { thread, progress: createMockProgress({ timestamp: '2025-01-03T00:00:00Z' }) },
        { thread, progress: createMockProgress({ timestamp: '2025-01-01T00:00:00Z' }) },
        { thread, progress: createMockProgress({ timestamp: '2025-01-02T00:00:00Z' }) }
      ];

      // Act
      const result = sortTimelineEntries(entries, true);

      // Assert
      expect(result[0].progress.timestamp).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('sortTimelineEntries_ReverseTrue_NewestLast', () => {
    it('should place newest entry last when reversed', () => {
      // Arrange
      const thread = createMockThread();
      const entries: TimelineEntry[] = [
        { thread, progress: createMockProgress({ timestamp: '2025-01-03T00:00:00Z' }) },
        { thread, progress: createMockProgress({ timestamp: '2025-01-01T00:00:00Z' }) },
        { thread, progress: createMockProgress({ timestamp: '2025-01-02T00:00:00Z' }) }
      ];

      // Act
      const result = sortTimelineEntries(entries, true);

      // Assert
      expect(result[2].progress.timestamp).toBe('2025-01-03T00:00:00Z');
    });
  });

  describe('sortTimelineEntries_EmptyArray_ReturnsEmptyArray', () => {
    it('should handle empty input', () => {
      // Arrange
      const entries: TimelineEntry[] = [];

      // Act
      const result = sortTimelineEntries(entries);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('sortTimelineEntries_SingleEntry_ReturnsSameEntry', () => {
    it('should handle single entry', () => {
      // Arrange
      const thread = createMockThread();
      const entries: TimelineEntry[] = [
        { thread, progress: createMockProgress({ timestamp: '2025-01-01T00:00:00Z' }) }
      ];

      // Act
      const result = sortTimelineEntries(entries);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('sortTimelineEntries_DoesNotMutateOriginalArray', () => {
    it('should not modify original array', () => {
      // Arrange
      const thread = createMockThread();
      const entries: TimelineEntry[] = [
        { thread, progress: createMockProgress({ timestamp: '2025-01-01T00:00:00Z' }) },
        { thread, progress: createMockProgress({ timestamp: '2025-01-03T00:00:00Z' }) }
      ];
      const originalFirstTimestamp = entries[0].progress.timestamp;

      // Act
      sortTimelineEntries(entries);

      // Assert
      expect(entries[0].progress.timestamp).toBe(originalFirstTimestamp);
    });
  });
});

// -----------------------------------------------------------------------------
// applyLimit Tests
// -----------------------------------------------------------------------------

describe('applyLimit', () => {
  describe('applyLimit_NoLimitProvided_ReturnsAllEntries', () => {
    it('should return all when limit undefined', () => {
      // Arrange
      const thread = createMockThread();
      const entries: TimelineEntry[] = [
        { thread, progress: createMockProgress({ id: 'p1' }) },
        { thread, progress: createMockProgress({ id: 'p2' }) },
        { thread, progress: createMockProgress({ id: 'p3' }) }
      ];

      // Act
      const result = applyLimit(entries, undefined);

      // Assert
      expect(result).toHaveLength(3);
    });
  });

  describe('applyLimit_LimitZero_ReturnsAllEntries', () => {
    it('should return all when limit is zero', () => {
      // Arrange
      const thread = createMockThread();
      const entries: TimelineEntry[] = [
        { thread, progress: createMockProgress({ id: 'p1' }) },
        { thread, progress: createMockProgress({ id: 'p2' }) }
      ];

      // Act
      const result = applyLimit(entries, 0);

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe('applyLimit_LimitLessThanTotal_ReturnsLimitedEntries', () => {
    it('should cap at limit value', () => {
      // Arrange
      const thread = createMockThread();
      const entries: TimelineEntry[] = [
        { thread, progress: createMockProgress({ id: 'p1' }) },
        { thread, progress: createMockProgress({ id: 'p2' }) },
        { thread, progress: createMockProgress({ id: 'p3' }) },
        { thread, progress: createMockProgress({ id: 'p4' }) },
        { thread, progress: createMockProgress({ id: 'p5' }) }
      ];

      // Act
      const result = applyLimit(entries, 3);

      // Assert
      expect(result).toHaveLength(3);
    });
  });

  describe('applyLimit_LimitGreaterThanTotal_ReturnsAllEntries', () => {
    it('should return all when limit exceeds count', () => {
      // Arrange
      const thread = createMockThread();
      const entries: TimelineEntry[] = [
        { thread, progress: createMockProgress({ id: 'p1' }) },
        { thread, progress: createMockProgress({ id: 'p2' }) }
      ];

      // Act
      const result = applyLimit(entries, 10);

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe('applyLimit_LimitOne_ReturnsFirstEntryOnly', () => {
    it('should return only first entry', () => {
      // Arrange
      const thread = createMockThread();
      const entries: TimelineEntry[] = [
        { thread, progress: createMockProgress({ id: 'first' }) },
        { thread, progress: createMockProgress({ id: 'second' }) }
      ];

      // Act
      const result = applyLimit(entries, 1);

      // Assert
      expect(result[0].progress.id).toBe('first');
    });
  });

  describe('applyLimit_NegativeLimit_ReturnsAllEntries', () => {
    it('should return all for negative limit', () => {
      // Arrange
      const thread = createMockThread();
      const entries: TimelineEntry[] = [
        { thread, progress: createMockProgress({ id: 'p1' }) },
        { thread, progress: createMockProgress({ id: 'p2' }) }
      ];

      // Act
      const result = applyLimit(entries, -5);

      // Assert
      expect(result).toHaveLength(2);
    });
  });
});

// -----------------------------------------------------------------------------
// filterByDateRange Tests
// -----------------------------------------------------------------------------

describe('filterByDateRange', () => {
  describe('filterByDateRange_NoFilters_ReturnsAllEntries', () => {
    it('should return all when no date filters', () => {
      // Arrange
      const thread = createMockThread();
      const entries: TimelineEntry[] = [
        { thread, progress: createMockProgress({ timestamp: '2025-01-01T00:00:00Z' }) },
        { thread, progress: createMockProgress({ timestamp: '2025-01-15T00:00:00Z' }) },
        { thread, progress: createMockProgress({ timestamp: '2025-01-30T00:00:00Z' }) }
      ];

      // Act
      const result = filterByDateRange(entries, undefined, undefined);

      // Assert
      expect(result).toHaveLength(3);
    });
  });

  describe('filterByDateRange_SinceFilter_ExcludesEarlierEntries', () => {
    it('should exclude entries before since date', () => {
      // Arrange
      const thread = createMockThread();
      const entries: TimelineEntry[] = [
        { thread, progress: createMockProgress({ timestamp: '2025-01-01T00:00:00Z' }) },
        { thread, progress: createMockProgress({ timestamp: '2025-01-15T00:00:00Z' }) },
        { thread, progress: createMockProgress({ timestamp: '2025-01-30T00:00:00Z' }) }
      ];
      const since = new Date('2025-01-10T00:00:00Z');

      // Act
      const result = filterByDateRange(entries, since, undefined);

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe('filterByDateRange_SinceFilter_IncludesExactMatch', () => {
    it('should include entry at exact since time', () => {
      // Arrange
      const thread = createMockThread();
      const entries: TimelineEntry[] = [
        { thread, progress: createMockProgress({ timestamp: '2025-01-15T00:00:00Z' }) }
      ];
      const since = new Date('2025-01-15T00:00:00Z');

      // Act
      const result = filterByDateRange(entries, since, undefined);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('filterByDateRange_UntilFilter_ExcludesLaterEntries', () => {
    it('should exclude entries after until date', () => {
      // Arrange
      const thread = createMockThread();
      const entries: TimelineEntry[] = [
        { thread, progress: createMockProgress({ timestamp: '2025-01-01T00:00:00Z' }) },
        { thread, progress: createMockProgress({ timestamp: '2025-01-15T00:00:00Z' }) },
        { thread, progress: createMockProgress({ timestamp: '2025-01-30T00:00:00Z' }) }
      ];
      const until = new Date('2025-01-20T00:00:00Z');

      // Act
      const result = filterByDateRange(entries, undefined, until);

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe('filterByDateRange_UntilFilter_IncludesExactMatch', () => {
    it('should include entry at exact until time', () => {
      // Arrange
      const thread = createMockThread();
      const entries: TimelineEntry[] = [
        { thread, progress: createMockProgress({ timestamp: '2025-01-15T00:00:00Z' }) }
      ];
      const until = new Date('2025-01-15T00:00:00Z');

      // Act
      const result = filterByDateRange(entries, undefined, until);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('filterByDateRange_BothFilters_ReturnsEntriesInRange', () => {
    it('should return only entries within range', () => {
      // Arrange
      const thread = createMockThread();
      const entries: TimelineEntry[] = [
        { thread, progress: createMockProgress({ timestamp: '2025-01-01T00:00:00Z' }) },
        { thread, progress: createMockProgress({ timestamp: '2025-01-15T00:00:00Z' }) },
        { thread, progress: createMockProgress({ timestamp: '2025-01-20T00:00:00Z' }) },
        { thread, progress: createMockProgress({ timestamp: '2025-01-30T00:00:00Z' }) }
      ];
      const since = new Date('2025-01-10T00:00:00Z');
      const until = new Date('2025-01-25T00:00:00Z');

      // Act
      const result = filterByDateRange(entries, since, until);

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe('filterByDateRange_NoMatchingEntries_ReturnsEmptyArray', () => {
    it('should return empty when no matches', () => {
      // Arrange
      const thread = createMockThread();
      const entries: TimelineEntry[] = [
        { thread, progress: createMockProgress({ timestamp: '2025-01-01T00:00:00Z' }) },
        { thread, progress: createMockProgress({ timestamp: '2025-01-05T00:00:00Z' }) }
      ];
      const since = new Date('2025-02-01T00:00:00Z');

      // Act
      const result = filterByDateRange(entries, since, undefined);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('filterByDateRange_EmptyInputArray_ReturnsEmptyArray', () => {
    it('should return empty for empty input', () => {
      // Arrange
      const entries: TimelineEntry[] = [];
      const since = new Date('2025-01-01T00:00:00Z');

      // Act
      const result = filterByDateRange(entries, since, undefined);

      // Assert
      expect(result).toHaveLength(0);
    });
  });
});
