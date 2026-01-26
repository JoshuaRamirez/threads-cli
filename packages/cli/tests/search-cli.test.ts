/**
 * CLI action tests for commands/search.ts
 * Tests the searchCommand action handler and output formatting
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
  gray: jest.fn((s: string) => s),
  blue: jest.fn((s: string) => s),
  green: jest.fn((s: string) => s),
  magenta: jest.fn((s: string) => s),
  cyan: jest.fn((s: string) => s),
  bgYellow: { black: jest.fn((s: string) => `[${s}]`) },
}));

import { searchCommand } from '../src/commands/search';

describe('searchCommand CLI', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('search_InvalidScope_LogsError', async () => {
    mockStorage.getAllThreads.mockReturnValue([]);

    await searchCommand.parseAsync(['node', 'test', 'query', '--in', 'invalid']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid scope'));
  });

  test('search_QueryTooShort_LogsWarning', async () => {
    mockStorage.getAllThreads.mockReturnValue([]);

    await searchCommand.parseAsync(['node', 'test', 'a']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('at least 2 characters'));
  });

  test('search_NoMatches_LogsNoResults', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ name: 'Thread One', progress: [] }),
    ]);

    await searchCommand.parseAsync(['node', 'test', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No matches found'));
  });

  test('search_MatchInName_ReturnsResult', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 'thread-1', name: 'Important Project', progress: [] }),
    ]);

    await searchCommand.parseAsync(['node', 'test', 'Important']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Found'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 match'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Important Project'));
  });

  test('search_MatchInProgress_ReturnsResult', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({
        id: 'thread-1',
        name: 'Project',
        progress: [{ id: 'p1', timestamp: '2024-01-01T00:00:00Z', note: 'Added search functionality' }],
      }),
    ]);

    await searchCommand.parseAsync(['node', 'test', 'search', '--in', 'progress']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Found'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Project'));
  });

  test('search_MatchInDetails_ReturnsResult', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({
        id: 'thread-1',
        name: 'Project',
        details: [{ id: 'd1', timestamp: '2024-01-01T00:00:00Z', content: 'Detailed specification document' }],
      }),
    ]);

    await searchCommand.parseAsync(['node', 'test', 'specification', '--in', 'details']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Found'));
  });

  test('search_MatchInTags_ReturnsResult', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({
        id: 'thread-1',
        name: 'Project',
        tags: ['important', 'urgent'],
      }),
    ]);

    await searchCommand.parseAsync(['node', 'test', 'urgent', '--in', 'tags']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Found'));
  });

  test('search_CaseSensitive_OnlyMatchesExactCase', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 'thread-1', name: 'Important Project' }),
      createMockThread({ id: 'thread-2', name: 'important task' }),
    ]);

    await searchCommand.parseAsync(['node', 'test', 'Important', '--case-sensitive']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 thread'));
  });

  test('search_WithLimit_LimitsResults', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 'thread-1', name: 'Test One' }),
      createMockThread({ id: 'thread-2', name: 'Test Two' }),
      createMockThread({ id: 'thread-3', name: 'Test Three' }),
    ]);

    await searchCommand.parseAsync(['node', 'test', 'Test', '--limit', '1']);

    // Should show "more threads with matches" message
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('more threads'));
  });

  test('search_MultipleMatches_SortsByMatchCount', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 'thread-1', name: 'Test', progress: [] }),
      createMockThread({
        id: 'thread-2',
        name: 'Test Thread',
        progress: [
          { id: 'p1', timestamp: '2024-01-01T00:00:00Z', note: 'Test note 1' },
          { id: 'p2', timestamp: '2024-01-02T00:00:00Z', note: 'Test note 2' },
        ],
      }),
    ]);

    await searchCommand.parseAsync(['node', 'test', 'Test']);

    // Thread with more matches should appear first
    const calls = consoleSpy.mock.calls.map(c => c[0]);
    const testThreadIndex = calls.findIndex((c: string) => c?.includes?.('Test Thread'));
    const testIndex = calls.findIndex((c: string, i: number) => c?.includes?.('Test') && !c?.includes?.('Thread') && i > 0);
    expect(testThreadIndex).toBeLessThan(testIndex > 0 ? testIndex : Infinity);
  });

  test('search_AllScope_SearchesEverywhere', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({
        id: 'thread-1',
        name: 'Project Alpha',
        progress: [{ id: 'p1', timestamp: '2024-01-01T00:00:00Z', note: 'Working on alpha' }],
        details: [{ id: 'd1', timestamp: '2024-01-01T00:00:00Z', content: 'Alpha details' }],
        tags: ['alpha'],
      }),
    ]);

    await searchCommand.parseAsync(['node', 'test', 'alpha', '--in', 'all']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Found'));
  });

  test('search_ManyMatchesInThread_ShowsLimitedSnippets', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({
        id: 'thread-1',
        name: 'Test Thread',
        progress: [
          { id: 'p1', timestamp: '2024-01-01T00:00:00Z', note: 'Test note 1' },
          { id: 'p2', timestamp: '2024-01-02T00:00:00Z', note: 'Test note 2' },
          { id: 'p3', timestamp: '2024-01-03T00:00:00Z', note: 'Test note 3' },
          { id: 'p4', timestamp: '2024-01-04T00:00:00Z', note: 'Test note 4' },
        ],
      }),
    ]);

    await searchCommand.parseAsync(['node', 'test', 'Test']);

    // Should show "total matches" for threads with many matches
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('total matches'));
  });
});
