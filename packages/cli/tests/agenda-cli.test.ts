/**
 * CLI action tests for commands/agenda.ts
 * Tests the agendaCommand action handler and output formatting
 */

import { Thread } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, MockStorageService } from './helpers/mockStorage';

// Create mock storage instance
let mockStorage: MockStorageService;

// Mock context module
jest.mock('../src/context', () => ({
  getStorage: jest.fn(() => mockStorage),
}));

// Mock utils
jest.mock('../src/utils', () => ({
  formatTemperature: jest.fn((t: string) => `[${t}]`),
  formatImportanceStars: jest.fn((i: number) => '★'.repeat(i)),
}));

// Mock chalk
jest.mock('chalk', () => {
  const mockFn = jest.fn((s: string) => s);
  return {
    red: Object.assign(mockFn, { bold: mockFn }),
    yellow: Object.assign(mockFn, { bold: mockFn }),
    green: Object.assign(mockFn, { bold: mockFn }),
    blue: Object.assign(mockFn, { bold: mockFn }),
    dim: mockFn,
    bold: mockFn,
  };
});

import { agendaCommand, categorizeThreads, daysSince, isToday, isWithinDays, getLastProgressDate, getLastProgressNote, truncate, formatRelativeTime, sortByPriority, TEMP_ORDER, COLD_TEMPS } from '../src/commands/agenda';

describe('agendaCommand CLI', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.useRealTimers();
  });

  test('agenda_DisplaysDateHeader', async () => {
    mockStorage.getAllThreads.mockReturnValue([]);

    await agendaCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('AGENDA'));
  });

  test('agenda_HotSection_ShowsHotThreads', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'Hot Thread', status: 'active', temperature: 'hot' }),
    ]);

    await agendaCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Hot'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Hot Thread'));
  });

  test('agenda_NoHotThreads_ShowsMessage', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ status: 'active', temperature: 'warm' }),
    ]);

    await agendaCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No hot threads'));
  });

  test('agenda_ActiveToday_ShowsThreadsWithProgress', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({
        id: 't1',
        name: 'Active Thread',
        status: 'active',
        temperature: 'warm',
        progress: [{ id: 'p1', timestamp: '2024-06-15T10:00:00.000Z', note: 'Progress today' }],
      }),
    ]);

    await agendaCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Active Today'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Active Thread'));
  });

  test('agenda_Week_ShowsActiveThisWeek', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({
        id: 't1',
        name: 'Weekly Thread',
        status: 'active',
        temperature: 'warm',
        progress: [{ id: 'p1', timestamp: '2024-06-12T10:00:00.000Z', note: 'Progress this week' }],
      }),
    ]);

    await agendaCommand.parseAsync(['node', 'test', '--week']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Active This Week'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Weekly Thread'));
  });

  test('agenda_NeedsAttention_ShowsColdThreads', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({
        id: 't1',
        name: 'Cold Thread',
        status: 'active',
        temperature: 'cold',
        progress: [],
      }),
    ]);

    await agendaCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Needs Attention'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cold Thread'));
  });

  test('agenda_WithLimit_LimitsPerSection', async () => {
    const threads = [];
    for (let i = 1; i <= 5; i++) {
      threads.push(createMockThread({
        id: `t${i}`,
        name: `Hot Thread ${i}`,
        status: 'active',
        temperature: 'hot',
      }));
    }
    mockStorage.getAllThreads.mockReturnValue(threads);

    await agendaCommand.parseAsync(['node', 'test', '-n', '2']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('+3 more'));
  });

  test('agenda_AllFlag_ShowsOtherActive', async () => {
    // To get into otherActive, a thread must:
    // - be active/paused
    // - NOT be hot
    // - NOT have progress today (lookback 0 for default)
    // - NOT be cold/freezing/frozen AND have progress within 7 days (to avoid needsAttention)
    // So: warm/tepid temp, recent progress (within 7 days but not today)
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({
        id: 't1',
        name: 'Other Thread',
        status: 'active',
        temperature: 'warm', // not hot, not cold
        progress: [{ id: 'p1', timestamp: '2024-06-12T10:00:00.000Z', note: 'Recent but not today' }],
        // 3 days ago - within 7 days so not "needs attention", but not today so not "active today"
      }),
    ]);

    await agendaCommand.parseAsync(['node', 'test', '--all']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Other Active'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Other Thread'));
  });

  test('agenda_Summary_ShowsTotals', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ status: 'active' }),
      createMockThread({ status: 'active' }),
      createMockThread({ status: 'paused' }),
    ]);

    await agendaCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2 active'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 paused'));
  });

  test('agenda_ExcludesArchived', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'Archived', status: 'archived', temperature: 'hot' }),
      createMockThread({ id: 't2', name: 'Completed', status: 'completed', temperature: 'hot' }),
    ]);

    await agendaCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No hot threads'));
  });
});

describe('agenda helper functions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('daysSince_CalculatesCorrectly', () => {
    const now = new Date('2024-06-15T12:00:00.000Z');
    expect(daysSince('2024-06-15T00:00:00.000Z', now)).toBe(0);
    expect(daysSince('2024-06-14T00:00:00.000Z', now)).toBe(1);
    expect(daysSince('2024-06-10T00:00:00.000Z', now)).toBe(5);
  });

  test('isToday_DetectsToday', () => {
    const now = new Date('2024-06-15T12:00:00.000Z');
    expect(isToday('2024-06-15T08:00:00.000Z', now)).toBe(true);
    expect(isToday('2024-06-14T08:00:00.000Z', now)).toBe(false);
  });

  test('isWithinDays_ChecksCorrectly', () => {
    const now = new Date('2024-06-15T12:00:00.000Z');
    expect(isWithinDays('2024-06-15T00:00:00.000Z', 1, now)).toBe(true);
    expect(isWithinDays('2024-06-14T00:00:00.000Z', 1, now)).toBe(true);
    expect(isWithinDays('2024-06-13T00:00:00.000Z', 1, now)).toBe(false);
    expect(isWithinDays('2024-06-10T00:00:00.000Z', 7, now)).toBe(true);
  });

  test('getLastProgressDate_ReturnsLatest', () => {
    const thread = createMockThread({
      progress: [
        { id: 'p1', timestamp: '2024-06-01T00:00:00Z', note: 'Old' },
        { id: 'p2', timestamp: '2024-06-15T00:00:00Z', note: 'New' },
      ],
    });
    expect(getLastProgressDate(thread)).toBe('2024-06-15T00:00:00Z');
  });

  test('getLastProgressDate_ReturnsNullIfEmpty', () => {
    const thread = createMockThread({ progress: [] });
    expect(getLastProgressDate(thread)).toBeNull();
  });

  test('getLastProgressNote_ReturnsLatestNote', () => {
    const thread = createMockThread({
      progress: [
        { id: 'p1', timestamp: '2024-06-01T00:00:00Z', note: 'Old note' },
        { id: 'p2', timestamp: '2024-06-15T00:00:00Z', note: 'New note' },
      ],
    });
    expect(getLastProgressNote(thread)).toBe('New note');
  });

  test('getLastProgressNote_ReturnsNullIfEmpty', () => {
    const thread = createMockThread({ progress: [] });
    expect(getLastProgressNote(thread)).toBeNull();
  });

  test('truncate_ShortString_ReturnsOriginal', () => {
    expect(truncate('short', 10)).toBe('short');
  });

  test('truncate_LongString_Truncates', () => {
    const result = truncate('this is a very long string', 15);
    expect(result.length).toBe(15);
    expect(result).toContain('...');
  });

  test('formatRelativeTime_Today', () => {
    const now = new Date('2024-06-15T12:00:00.000Z');
    expect(formatRelativeTime('2024-06-15T10:00:00.000Z', now)).toBe('today');
  });

  test('formatRelativeTime_Yesterday', () => {
    const now = new Date('2024-06-15T12:00:00.000Z');
    expect(formatRelativeTime('2024-06-14T10:00:00.000Z', now)).toBe('yesterday');
  });

  test('formatRelativeTime_DaysAgo', () => {
    const now = new Date('2024-06-15T12:00:00.000Z');
    expect(formatRelativeTime('2024-06-12T10:00:00.000Z', now)).toBe('3d ago');
  });

  test('formatRelativeTime_WeeksAgo', () => {
    const now = new Date('2024-06-15T12:00:00.000Z');
    expect(formatRelativeTime('2024-06-01T10:00:00.000Z', now)).toBe('2w ago');
  });

  test('formatRelativeTime_MonthsAgo', () => {
    const now = new Date('2024-06-15T12:00:00.000Z');
    expect(formatRelativeTime('2024-04-01T10:00:00.000Z', now)).toBe('2mo ago');
  });

  test('sortByPriority_SortsByTemperatureFirst', () => {
    const threads = [
      createMockThread({ id: 't1', temperature: 'cold' }),
      createMockThread({ id: 't2', temperature: 'hot' }),
      createMockThread({ id: 't3', temperature: 'warm' }),
    ];
    const sorted = sortByPriority(threads);
    expect(sorted[0].temperature).toBe('hot');
    expect(sorted[1].temperature).toBe('warm');
    expect(sorted[2].temperature).toBe('cold');
  });

  test('sortByPriority_SameTemp_SortsByImportance', () => {
    const threads = [
      createMockThread({ id: 't1', temperature: 'warm', importance: 2 }),
      createMockThread({ id: 't2', temperature: 'warm', importance: 5 }),
      createMockThread({ id: 't3', temperature: 'warm', importance: 3 }),
    ];
    const sorted = sortByPriority(threads);
    expect(sorted[0].importance).toBe(5);
    expect(sorted[1].importance).toBe(3);
    expect(sorted[2].importance).toBe(2);
  });

  test('categorizeThreads_CategoriesCorrectly', () => {
    const now = new Date('2024-06-15T12:00:00.000Z');
    const threads = [
      createMockThread({ id: 'hot1', status: 'active', temperature: 'hot' }),
      createMockThread({
        id: 'active1',
        status: 'active',
        temperature: 'warm',
        progress: [{ id: 'p1', timestamp: '2024-06-15T10:00:00.000Z', note: 'Today' }],
      }),
      createMockThread({
        id: 'cold1',
        status: 'active',
        temperature: 'cold',
        progress: [],
      }),
      createMockThread({ id: 'archived1', status: 'archived' }),
    ];

    const result = categorizeThreads(threads, {}, now);

    expect(result.hotThreads).toHaveLength(1);
    expect(result.hotThreads[0].id).toBe('hot1');
    expect(result.activeInPeriod).toHaveLength(1);
    expect(result.activeInPeriod[0].id).toBe('active1');
    expect(result.needsAttention).toHaveLength(1);
    expect(result.needsAttention[0].id).toBe('cold1');
    expect(result.otherActive).toHaveLength(0); // --all not set
  });

  test('categorizeThreads_WithAll_ShowsOtherActive', () => {
    const now = new Date('2024-06-15T12:00:00.000Z');
    // To be in otherActive (not needsAttention, not hot, not activeInPeriod):
    // - warm/tepid temp (not hot, not cold)
    // - progress within 7 days but not today (for default lookback)
    const threads = [
      createMockThread({
        id: 'other1',
        status: 'active',
        temperature: 'tepid', // not hot, not cold
        progress: [{ id: 'p1', timestamp: '2024-06-12T10:00:00.000Z', note: 'Recent' }], // 3 days ago
      }),
    ];

    const result = categorizeThreads(threads, { all: true }, now);

    expect(result.otherActive).toHaveLength(1);
    expect(result.otherActive[0].id).toBe('other1');
  });

  test('TEMP_ORDER_ContainsAllTemperatures', () => {
    expect(TEMP_ORDER).toContain('hot');
    expect(TEMP_ORDER).toContain('warm');
    expect(TEMP_ORDER).toContain('tepid');
    expect(TEMP_ORDER).toContain('cold');
    expect(TEMP_ORDER).toContain('freezing');
    expect(TEMP_ORDER).toContain('frozen');
  });

  test('COLD_TEMPS_ContainsColdValues', () => {
    expect(COLD_TEMPS).toContain('cold');
    expect(COLD_TEMPS).toContain('freezing');
    expect(COLD_TEMPS).toContain('frozen');
    expect(COLD_TEMPS).not.toContain('warm');
  });
});
