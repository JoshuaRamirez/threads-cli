/**
 * CLI action tests for commands/timeline.ts
 * Tests the timelineCommand action handler
 */

import { Thread } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, MockStorageService } from './helpers/mockStorage';

// Create mock storage instance
let mockStorage: MockStorageService;

// Mock context module
jest.mock('../src/context', () => ({
  getStorage: jest.fn(() => mockStorage),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((s: string) => s),
  yellow: jest.fn((s: string) => s),
  dim: jest.fn((s: string) => s),
  bold: jest.fn((s: string) => s),
  cyan: jest.fn((s: string) => s),
}));

import { timelineCommand, formatTimelineEntry, collectTimelineEntries, filterByDateRange, sortTimelineEntries, applyLimit, parseDate, truncate } from '../src/commands/timeline';

describe('timelineCommand CLI', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('timeline_NoProgress_LogsMessage', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ progress: [] }),
    ]);

    await timelineCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No progress entries'));
  });

  test('timeline_WithProgress_DisplaysEntries', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({
        name: 'Project',
        progress: [{ id: 'p1', timestamp: '2024-06-15T12:00:00.000Z', note: 'Made progress' }],
      }),
    ]);

    await timelineCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Timeline'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Made progress'));
  });

  test('timeline_WithThreadFilter_FiltersToSpecific', async () => {
    const thread1 = createMockThread({
      id: 't1',
      name: 'Project A',
      progress: [{ id: 'p1', timestamp: '2024-06-15T12:00:00.000Z', note: 'A progress' }],
    });
    const thread2 = createMockThread({
      id: 't2',
      name: 'Project B',
      progress: [{ id: 'p2', timestamp: '2024-06-15T12:00:00.000Z', note: 'B progress' }],
    });
    mockStorage.getAllThreads.mockReturnValue([thread1, thread2]);
    mockStorage.getThreadById.mockImplementation((id: string) => id === 't1' ? thread1 : undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await timelineCommand.parseAsync(['node', 'test', '-t', 't1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 entries'));
  });

  test('timeline_ThreadNotFound_LogsError', async () => {
    mockStorage.getAllThreads.mockReturnValue([]);
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await timelineCommand.parseAsync(['node', 'test', '-t', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('timeline_WithSinceFilter_FiltersOldEntries', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({
        name: 'Project',
        progress: [
          { id: 'p1', timestamp: '2024-06-01T12:00:00.000Z', note: 'Old progress' },
          { id: 'p2', timestamp: '2024-06-15T12:00:00.000Z', note: 'New progress' },
        ],
      }),
    ]);

    await timelineCommand.parseAsync(['node', 'test', '--since', '2024-06-10']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 entries'));
  });

  test('timeline_InvalidSinceDate_LogsError', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({
        progress: [{ id: 'p1', timestamp: '2024-06-15T12:00:00.000Z', note: 'Note' }],
      }),
    ]);

    await timelineCommand.parseAsync(['node', 'test', '--since', 'invalid-date']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid --since'));
  });

  test('timeline_WithUntilFilter_FiltersNewEntries', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({
        name: 'Project',
        progress: [
          { id: 'p1', timestamp: '2024-06-01T12:00:00.000Z', note: 'Old progress' },
          { id: 'p2', timestamp: '2024-06-20T12:00:00.000Z', note: 'New progress' },
        ],
      }),
    ]);

    await timelineCommand.parseAsync(['node', 'test', '--until', '2024-06-10']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 entries'));
  });

  test('timeline_InvalidUntilDate_LogsError', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({
        progress: [{ id: 'p1', timestamp: '2024-06-15T12:00:00.000Z', note: 'Note' }],
      }),
    ]);

    await timelineCommand.parseAsync(['node', 'test', '--until', 'bad-date']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid --until'));
  });

  test('timeline_NoMatchingEntries_LogsMessage', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({
        progress: [{ id: 'p1', timestamp: '2024-01-01T12:00:00.000Z', note: 'Note' }],
      }),
    ]);

    await timelineCommand.parseAsync(['node', 'test', '--since', '2024-12-01']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No progress entries match'));
  });

  test('timeline_WithLimitOption_LimitsEntries', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({
        name: 'Project',
        progress: [
          { id: 'p1', timestamp: '2024-06-01T12:00:00.000Z', note: 'Note 1' },
          { id: 'p2', timestamp: '2024-06-02T12:00:00.000Z', note: 'Note 2' },
          { id: 'p3', timestamp: '2024-06-03T12:00:00.000Z', note: 'Note 3' },
        ],
      }),
    ]);

    await timelineCommand.parseAsync(['node', 'test', '-n', '2']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2 entries'));
  });

  test('timeline_WithReverseOption_ShowsOldestFirst', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({
        name: 'Project',
        progress: [
          { id: 'p1', timestamp: '2024-06-01T12:00:00.000Z', note: 'First' },
          { id: 'p2', timestamp: '2024-06-15T12:00:00.000Z', note: 'Last' },
        ],
      }),
    ]);

    await timelineCommand.parseAsync(['node', 'test', '-r']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('oldest first'));
  });

  test('timeline_DefaultOrder_ShowsNewestFirst', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({
        name: 'Project',
        progress: [
          { id: 'p1', timestamp: '2024-06-01T12:00:00.000Z', note: 'First' },
          { id: 'p2', timestamp: '2024-06-15T12:00:00.000Z', note: 'Last' },
        ],
      }),
    ]);

    await timelineCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('newest first'));
  });
});

describe('timeline helper functions', () => {
  test('parseDate_ValidDate_ReturnsDate', () => {
    const result = parseDate('2024-06-15');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2024);
  });

  test('parseDate_InvalidDate_ReturnsNull', () => {
    expect(parseDate('not-a-date')).toBeNull();
  });

  test('truncate_ShortString_ReturnsOriginal', () => {
    expect(truncate('short', 10)).toBe('short');
  });

  test('truncate_LongString_Truncates', () => {
    const result = truncate('this is a very long string', 10);
    expect(result.length).toBe(10);
    expect(result).toContain('…');
  });

  test('formatTimelineEntry_FormatsCorrectly', () => {
    const entry = {
      thread: createMockThread({ name: 'Project' }),
      progress: { id: 'p1', timestamp: '2024-06-15T12:00:00.000Z', note: 'Test note' },
    };
    const result = formatTimelineEntry(entry);
    expect(result).toContain('Project');
    expect(result).toContain('Test note');
  });

  test('collectTimelineEntries_CollectsAll', () => {
    const threads = [
      createMockThread({
        progress: [
          { id: 'p1', timestamp: '2024-06-01T00:00:00Z', note: 'Note 1' },
          { id: 'p2', timestamp: '2024-06-02T00:00:00Z', note: 'Note 2' },
        ],
      }),
      createMockThread({
        progress: [{ id: 'p3', timestamp: '2024-06-03T00:00:00Z', note: 'Note 3' }],
      }),
    ];
    const entries = collectTimelineEntries(threads);
    expect(entries).toHaveLength(3);
  });

  test('filterByDateRange_SinceFilter_Works', () => {
    const entries = [
      { thread: createMockThread(), progress: { id: 'p1', timestamp: '2024-06-01T00:00:00Z', note: 'Old' } },
      { thread: createMockThread(), progress: { id: 'p2', timestamp: '2024-06-15T00:00:00Z', note: 'New' } },
    ];
    const filtered = filterByDateRange(entries, new Date('2024-06-10'), undefined);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].progress.note).toBe('New');
  });

  test('filterByDateRange_UntilFilter_Works', () => {
    const entries = [
      { thread: createMockThread(), progress: { id: 'p1', timestamp: '2024-06-01T00:00:00Z', note: 'Old' } },
      { thread: createMockThread(), progress: { id: 'p2', timestamp: '2024-06-15T00:00:00Z', note: 'New' } },
    ];
    const filtered = filterByDateRange(entries, undefined, new Date('2024-06-10'));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].progress.note).toBe('Old');
  });

  test('sortTimelineEntries_DefaultNewestFirst', () => {
    const entries = [
      { thread: createMockThread(), progress: { id: 'p1', timestamp: '2024-06-01T00:00:00Z', note: 'Old' } },
      { thread: createMockThread(), progress: { id: 'p2', timestamp: '2024-06-15T00:00:00Z', note: 'New' } },
    ];
    const sorted = sortTimelineEntries(entries);
    expect(sorted[0].progress.note).toBe('New');
  });

  test('sortTimelineEntries_ReverseOldestFirst', () => {
    const entries = [
      { thread: createMockThread(), progress: { id: 'p1', timestamp: '2024-06-01T00:00:00Z', note: 'Old' } },
      { thread: createMockThread(), progress: { id: 'p2', timestamp: '2024-06-15T00:00:00Z', note: 'New' } },
    ];
    const sorted = sortTimelineEntries(entries, true);
    expect(sorted[0].progress.note).toBe('Old');
  });

  test('applyLimit_NoLimit_ReturnsAll', () => {
    const entries = [
      { thread: createMockThread(), progress: { id: 'p1', timestamp: '2024-06-01T00:00:00Z', note: 'A' } },
      { thread: createMockThread(), progress: { id: 'p2', timestamp: '2024-06-02T00:00:00Z', note: 'B' } },
    ];
    expect(applyLimit(entries)).toHaveLength(2);
  });

  test('applyLimit_WithLimit_LimitsEntries', () => {
    const entries = [
      { thread: createMockThread(), progress: { id: 'p1', timestamp: '2024-06-01T00:00:00Z', note: 'A' } },
      { thread: createMockThread(), progress: { id: 'p2', timestamp: '2024-06-02T00:00:00Z', note: 'B' } },
    ];
    expect(applyLimit(entries, 1)).toHaveLength(1);
  });
});
