/**
 * CLI action tests for commands/next.ts
 * Tests the nextCommand action handler and scoring display
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
jest.mock('chalk', () => ({
  red: jest.fn((s: string) => s),
  yellow: jest.fn((s: string) => s),
  dim: jest.fn((s: string) => s),
  bold: Object.assign(jest.fn((s: string) => s), {
    magenta: jest.fn((s: string) => s),
  }),
  gray: jest.fn((s: string) => s),
  magenta: jest.fn((s: string) => s),
}));

import { nextCommand, scoreThread, recencyScore, hoursSince, getMostRecentActivity, temperatureScores } from '../src/commands/next';

describe('nextCommand CLI', () => {
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

  test('next_NoActiveThreads_LogsMessage', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ status: 'archived' }),
      createMockThread({ status: 'completed' }),
    ]);

    await nextCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No active threads'));
  });

  test('next_WithActiveThreads_DisplaysRecommendations', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'High Priority', status: 'active', importance: 5, temperature: 'hot' }),
      createMockThread({ id: 't2', name: 'Medium Priority', status: 'active', importance: 3, temperature: 'warm' }),
    ]);

    await nextCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Next Focus'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('High Priority'));
  });

  test('next_WithCountOption_LimitsResults', async () => {
    const threads = [];
    const importanceValues: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];
    for (let i = 1; i <= 10; i++) {
      threads.push(createMockThread({ id: `t${i}`, name: `Thread ${i}`, status: 'active', importance: importanceValues[i % 5] }));
    }
    mockStorage.getAllThreads.mockReturnValue(threads);

    await nextCommand.parseAsync(['node', 'test', '-c', '3']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('top 3 of 10'));
  });

  test('next_WithExplainOption_ShowsScoreBreakdown', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'Thread', status: 'active', importance: 4, temperature: 'warm' }),
    ]);

    await nextCommand.parseAsync(['node', 'test', '--explain']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('importance*3'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('temperature*2'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('recency*1'));
  });

  test('next_SortsThreadsByScore', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'Low', status: 'active', importance: 1, temperature: 'cold' }),
      createMockThread({ id: 't2', name: 'High', status: 'active', importance: 5, temperature: 'hot' }),
      createMockThread({ id: 't3', name: 'Medium', status: 'active', importance: 3, temperature: 'warm' }),
    ]);

    await nextCommand.parseAsync(['node', 'test']);

    const calls = consoleSpy.mock.calls.map(c => c[0]).filter((c: string) => c?.includes?.('#'));
    expect(calls[0]).toContain('High');
  });

  test('next_ThreadWithDescription_ShowsTruncated', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({
        id: 't1',
        name: 'Thread',
        status: 'active',
        description: 'This is a very long description that should be truncated when displayed in the output',
      }),
    ]);

    await nextCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('...'));
  });

  test('next_ThreadWithProgress_ShowsLastNote', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({
        id: 't1',
        name: 'Thread',
        status: 'active',
        progress: [
          { id: 'p1', timestamp: '2024-06-15T10:00:00.000Z', note: 'Made great progress' },
        ],
      }),
    ]);

    await nextCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Last:'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Made great progress'));
  });

  test('next_FiltersPausedAndOther_OnlyShowsActive', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'Active', status: 'active' }),
      createMockThread({ id: 't2', name: 'Paused', status: 'paused' }),
      createMockThread({ id: 't3', name: 'Stopped', status: 'stopped' }),
    ]);

    await nextCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 active'));
  });
});

describe('scoring functions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('hoursSince_CalculatesCorrectly', () => {
    const twoHoursAgo = '2024-06-15T10:00:00.000Z';
    expect(hoursSince(twoHoursAgo)).toBeCloseTo(2, 0);
  });

  test('recencyScore_RecentIsHigher', () => {
    const recent = '2024-06-15T11:00:00.000Z';
    const older = '2024-06-01T12:00:00.000Z';
    expect(recencyScore(recent)).toBeGreaterThan(recencyScore(older));
  });

  test('getMostRecentActivity_UsesProgressIfNewer', () => {
    const thread = createMockThread({
      updatedAt: '2024-06-01T00:00:00.000Z',
      progress: [{ id: 'p1', timestamp: '2024-06-15T00:00:00.000Z', note: 'Note' }],
    });
    expect(getMostRecentActivity(thread)).toBe('2024-06-15T00:00:00.000Z');
  });

  test('getMostRecentActivity_UsesUpdatedAtIfNoProgress', () => {
    const thread = createMockThread({
      updatedAt: '2024-06-10T00:00:00.000Z',
      progress: [],
    });
    expect(getMostRecentActivity(thread)).toBe('2024-06-10T00:00:00.000Z');
  });

  test('scoreThread_CalculatesComposite', () => {
    const thread = createMockThread({
      importance: 5,
      temperature: 'hot',
      updatedAt: '2024-06-15T11:00:00.000Z',
    });
    const scored = scoreThread(thread);

    // importance=5*3=15, temperature=hot(5)*2=10, recency~5
    expect(scored.importanceScore).toBe(5);
    expect(scored.temperatureScore).toBe(temperatureScores['hot']);
    expect(scored.totalScore).toBeGreaterThan(25); // 15 + 10 + ~5
  });

  test('temperatureScores_OrderedCorrectly', () => {
    expect(temperatureScores['hot']).toBeGreaterThan(temperatureScores['warm']);
    expect(temperatureScores['warm']).toBeGreaterThan(temperatureScores['cold']);
    expect(temperatureScores['cold']).toBeGreaterThan(temperatureScores['frozen']);
  });
});
