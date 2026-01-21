/**
 * Unit tests for commands/details.ts
 */

import { Thread } from '@joshua2048/threads-core';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'new-details-uuid'),
}));

// Mock storage module
jest.mock('@joshua2048/threads-storage', () => ({
  getThreadById: jest.fn(),
  getThreadByName: jest.fn(),
  getAllThreads: jest.fn(),
  updateThread: jest.fn(),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((s: string) => s),
  green: jest.fn((s: string) => s),
  yellow: jest.fn((s: string) => s),
  dim: jest.fn((s: string) => s),
  bold: Object.assign(jest.fn((s: string) => s), {
    underline: jest.fn((s: string) => s),
  }),
}));

import {
  getThreadById,
  getThreadByName,
  getAllThreads,
  updateThread,
} from '@joshua2048/threads-storage';
import { detailsCommand } from '../src/commands/details';

const mockGetThreadById = getThreadById as jest.MockedFunction<typeof getThreadById>;
const mockGetThreadByName = getThreadByName as jest.MockedFunction<typeof getThreadByName>;
const mockGetAllThreads = getAllThreads as jest.MockedFunction<typeof getAllThreads>;
const mockUpdateThread = updateThread as jest.MockedFunction<typeof updateThread>;

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

describe('detailsCommand', () => {
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

  test('details_ThreadNotFound_LogsError', async () => {
    mockGetThreadById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetAllThreads.mockReturnValue([]);

    await detailsCommand.parseAsync(['node', 'test', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('details_NoDetails_ShowsNoDetails', async () => {
    const thread = createMockThread({ id: 't1', name: 'My Thread', details: [] });
    mockGetThreadById.mockReturnValue(thread);

    await detailsCommand.parseAsync(['node', 'test', 't1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No details set'));
  });

  test('details_WithDetails_ShowsCurrentDetails', async () => {
    const thread = createMockThread({
      id: 't1',
      name: 'My Thread',
      details: [{ id: 'd1', timestamp: '2024-01-01T00:00:00.000Z', content: 'Current details' }],
    });
    mockGetThreadById.mockReturnValue(thread);

    await detailsCommand.parseAsync(['node', 'test', 't1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Current details'));
  });

  test('details_SetContent_AddsDetails', async () => {
    const thread = createMockThread({ id: 't1', details: [] });
    mockGetThreadById.mockReturnValue(thread);

    await detailsCommand.parseAsync(['node', 'test', 't1', 'New details content']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', {
      details: expect.arrayContaining([
        expect.objectContaining({ content: 'New details content' }),
      ]),
    });
  });

  test('details_AppendToExisting_KeepsHistory', async () => {
    const existingDetail = { id: 'd1', timestamp: '2024-01-01T00:00:00.000Z', content: 'Old' };
    const thread = createMockThread({ id: 't1', details: [existingDetail] });
    mockGetThreadById.mockReturnValue(thread);

    await detailsCommand.parseAsync(['node', 'test', 't1', 'New content']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', {
      details: [
        existingDetail,
        expect.objectContaining({ content: 'New content' }),
      ],
    });
  });

  test('details_History_ShowsAllVersions', async () => {
    const thread = createMockThread({
      id: 't1',
      name: 'My Thread',
      details: [
        { id: 'd1', timestamp: '2024-01-01T00:00:00.000Z', content: 'Version 1' },
        { id: 'd2', timestamp: '2024-02-01T00:00:00.000Z', content: 'Version 2' },
        { id: 'd3', timestamp: '2024-03-01T00:00:00.000Z', content: 'Version 3' },
      ],
    });
    mockGetThreadById.mockReturnValue(thread);

    await detailsCommand.parseAsync(['node', 'test', 't1', '--history']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Details History'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Version 1'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Version 2'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[CURRENT]'));
  });

  test('details_HistoryEmpty_ShowsNoHistory', async () => {
    const thread = createMockThread({ id: 't1', name: 'My Thread', details: [] });
    mockGetThreadById.mockReturnValue(thread);

    await detailsCommand.parseAsync(['node', 'test', 't1', '--history']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No details history'));
  });

  test('details_MultipleMatches_ShowsAmbiguity', async () => {
    mockGetThreadById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetAllThreads.mockReturnValue([
      createMockThread({ id: 'abc-1', name: 'Thread ABC 1' }),
      createMockThread({ id: 'abc-2', name: 'Thread ABC 2' }),
    ]);

    await detailsCommand.parseAsync(['node', 'test', 'abc']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Multiple threads match'));
  });

  test('details_Success_LogsSuccess', async () => {
    const thread = createMockThread({ id: 't1', name: 'My Thread' });
    mockGetThreadById.mockReturnValue(thread);

    await detailsCommand.parseAsync(['node', 'test', 't1', 'New details']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Details updated'));
  });
});
