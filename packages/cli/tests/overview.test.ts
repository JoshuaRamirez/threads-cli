/**
 * Unit tests for commands/overview.ts
 */

import { Thread, Group } from 'threads-types';

// Mock storage module
jest.mock('threads-storage', () => ({
  getAllThreads: jest.fn(),
  getAllGroups: jest.fn(),
  getGroupById: jest.fn(),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: Object.assign(jest.fn((s: string) => s), { bold: jest.fn((s: string) => s) }),
  green: Object.assign(jest.fn((s: string) => s), { bold: jest.fn((s: string) => s) }),
  cyan: Object.assign(jest.fn((s: string) => s), { bold: jest.fn((s: string) => s) }),
  dim: jest.fn((s: string) => s),
  bold: jest.fn((s: string) => s),
}));

import { getAllThreads, getAllGroups } from 'threads-storage';
import { overviewCommand } from '../src/commands/overview';

const mockGetAllThreads = getAllThreads as jest.MockedFunction<typeof getAllThreads>;
const mockGetAllGroups = getAllGroups as jest.MockedFunction<typeof getAllGroups>;

function createMockThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: 'test-id-123',
    name: 'Test Thread',
    description: '',
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
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: 'group-123',
    name: 'Test Group',
    description: '',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('overviewCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.useRealTimers();
  });

  test('overview_NoThreads_ShowsEmptySections', async () => {
    mockGetAllThreads.mockReturnValue([]);
    mockGetAllGroups.mockReturnValue([]);

    await overviewCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('THREADS OVERVIEW'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No hot threads'));
  });

  test('overview_WithHotThread_ShowsInHotSection', async () => {
    const hotThread = createMockThread({ name: 'Hot Thread', temperature: 'hot' });
    mockGetAllThreads.mockReturnValue([hotThread]);
    mockGetAllGroups.mockReturnValue([]);

    await overviewCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Hot Thread'));
  });

  test('overview_WithRecentProgress_ShowsInRecentSection', async () => {
    const recentThread = createMockThread({
      name: 'Recent Thread',
      progress: [{ id: 'p1', timestamp: '2024-06-14T12:00:00.000Z', note: 'Made progress' }],
    });
    mockGetAllThreads.mockReturnValue([recentThread]);
    mockGetAllGroups.mockReturnValue([]);

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
    mockGetAllThreads.mockReturnValue([coldThread]);
    mockGetAllGroups.mockReturnValue([]);

    await overviewCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cold Thread'));
  });

  test('overview_ArchivedThreads_NotShown', async () => {
    const archivedThread = createMockThread({
      name: 'Archived Thread',
      status: 'archived',
      temperature: 'hot',
    });
    mockGetAllThreads.mockReturnValue([archivedThread]);
    mockGetAllGroups.mockReturnValue([]);

    await overviewCommand.parseAsync(['node', 'test']);

    // Hot section should be empty (archived threads filtered out)
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No hot threads'));
  });

  test('overview_WithGroups_ShowsGroupStats', async () => {
    const group = createMockGroup({ id: 'grp-1', name: 'Work' });
    const thread = createMockThread({ name: 'Work Thread', groupId: 'grp-1', temperature: 'hot' });
    mockGetAllThreads.mockReturnValue([thread]);
    mockGetAllGroups.mockReturnValue([group]);

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
    mockGetAllThreads.mockReturnValue([oldThread]);
    mockGetAllGroups.mockReturnValue([]);

    // With 3-day threshold, 5-day-old thread should show as cold
    await overviewCommand.parseAsync(['node', 'test', '-d', '3']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Old Thread'));
  });

  test('overview_ShowsSummaryStats', async () => {
    const activeThread = createMockThread({ status: 'active' });
    const pausedThread = createMockThread({ status: 'paused' });
    const archivedThread = createMockThread({ status: 'archived' });
    mockGetAllThreads.mockReturnValue([activeThread, pausedThread, archivedThread]);
    mockGetAllGroups.mockReturnValue([]);

    await overviewCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Summary'));
  });
});
