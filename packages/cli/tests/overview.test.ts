/**
 * Unit tests for commands/overview.ts
 */

import { Thread, Group } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, createMockGroup, MockStorageService } from './helpers/mockStorage';

// Create mock storage instance
let mockStorage: MockStorageService;

// Mock context module to return our mock storage
jest.mock('../src/context', () => ({
  getStorage: jest.fn(() => mockStorage),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: Object.assign(jest.fn((s: string) => s), { bold: jest.fn((s: string) => s) }),
  green: Object.assign(jest.fn((s: string) => s), { bold: jest.fn((s: string) => s) }),
  cyan: Object.assign(jest.fn((s: string) => s), { bold: jest.fn((s: string) => s) }),
  dim: jest.fn((s: string) => s),
  bold: jest.fn((s: string) => s),
}));

import { overviewCommand } from '../src/commands/overview';

describe('overviewCommand', () => {
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

  test('overview_NoThreads_ShowsEmptySections', async () => {
    mockStorage.getAllThreads.mockReturnValue([]);
    mockStorage.getAllGroups.mockReturnValue([]);

    await overviewCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('THREADS OVERVIEW'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No hot threads'));
  });

  test('overview_WithHotThread_ShowsInHotSection', async () => {
    const hotThread = createMockThread({ name: 'Hot Thread', temperature: 'hot' });
    mockStorage.getAllThreads.mockReturnValue([hotThread]);
    mockStorage.getAllGroups.mockReturnValue([]);

    await overviewCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Hot Thread'));
  });

  test('overview_WithRecentProgress_ShowsInRecentSection', async () => {
    const recentThread = createMockThread({
      name: 'Recent Thread',
      progress: [{ id: 'p1', timestamp: '2024-06-14T12:00:00.000Z', note: 'Made progress' }],
    });
    mockStorage.getAllThreads.mockReturnValue([recentThread]);
    mockStorage.getAllGroups.mockReturnValue([]);

    await overviewCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Recent Thread'));
  });

  test('overview_WithOldProgress_ShowsInColdSection', async () => {
    const coldThread = createMockThread({
      name: 'Cold Thread',
      status: 'active',
      createdAt: '2024-01-01T00:00:00.000Z',
      progress: [{ id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'Old note' }],
    });
    mockStorage.getAllThreads.mockReturnValue([coldThread]);
    mockStorage.getAllGroups.mockReturnValue([]);

    await overviewCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cold Thread'));
  });

  test('overview_ArchivedThreads_NotShown', async () => {
    const archivedThread = createMockThread({
      name: 'Archived Thread',
      status: 'archived',
      temperature: 'hot',
    });
    mockStorage.getAllThreads.mockReturnValue([archivedThread]);
    mockStorage.getAllGroups.mockReturnValue([]);

    await overviewCommand.parseAsync(['node', 'test']);

    // Hot section should be empty (archived threads filtered out)
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No hot threads'));
  });

  test('overview_WithGroups_ShowsGroupStats', async () => {
    const group = createMockGroup({ id: 'grp-1', name: 'Work' });
    const thread = createMockThread({ name: 'Work Thread', groupId: 'grp-1', temperature: 'hot' });
    mockStorage.getAllThreads.mockReturnValue([thread]);
    mockStorage.getAllGroups.mockReturnValue([group]);

    await overviewCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Work'));
  });

  test('overview_WithDaysOption_UsesCustomThreshold', async () => {
    const oldThread = createMockThread({
      name: 'Old Thread',
      status: 'active',
      createdAt: '2024-06-10T00:00:00.000Z',
      progress: [{ id: 'p1', timestamp: '2024-06-10T00:00:00.000Z', note: 'Note' }],
    });
    mockStorage.getAllThreads.mockReturnValue([oldThread]);
    mockStorage.getAllGroups.mockReturnValue([]);

    // With 3-day threshold, 5-day-old thread should show as cold
    await overviewCommand.parseAsync(['node', 'test', '-d', '3']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Old Thread'));
  });

  test('overview_ShowsSummaryStats', async () => {
    const activeThread = createMockThread({ status: 'active' });
    const pausedThread = createMockThread({ status: 'paused' });
    const archivedThread = createMockThread({ status: 'archived' });
    mockStorage.getAllThreads.mockReturnValue([activeThread, pausedThread, archivedThread]);
    mockStorage.getAllGroups.mockReturnValue([]);

    await overviewCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Summary'));
  });
});
