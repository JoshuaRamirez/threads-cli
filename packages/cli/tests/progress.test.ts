/**
 * Unit tests for commands/progress.ts
 */

import { Thread } from '@redjay/threads-core';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'progress-uuid-123'),
}));

// Mock storage module
jest.mock('@redjay/threads-storage', () => ({
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
}));

import {
  getThreadById,
  getThreadByName,
  getAllThreads,
  updateThread,
} from '@redjay/threads-storage';
import { progressCommand } from '../src/commands/progress';

const mockGetThreadById = getThreadById as jest.MockedFunction<typeof getThreadById>;
const mockGetThreadByName = getThreadByName as jest.MockedFunction<typeof getThreadByName>;
const mockGetAllThreads = getAllThreads as jest.MockedFunction<typeof getAllThreads>;
const mockUpdateThread = updateThread as jest.MockedFunction<typeof updateThread>;

function createMockThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: 'test-id-123',
    name: 'Test Thread',
    description: 'Test description',
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

describe('progressCommand', () => {
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

  test('progress_ThreadNotFound_LogsError', async () => {
    mockGetThreadById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetAllThreads.mockReturnValue([]);

    await progressCommand.parseAsync(['node', 'test', 'nonexistent', 'Some note']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('progress_ValidThread_AddsProgressEntry', async () => {
    const thread = createMockThread({ id: 'thread-1', progress: [] });
    mockGetThreadById.mockReturnValue(thread);

    await progressCommand.parseAsync(['node', 'test', 'thread-1', 'Made some progress']);

    expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', {
      progress: expect.arrayContaining([
        expect.objectContaining({ note: 'Made some progress' }),
      ]),
    });
  });

  test('progress_WithWarm_SetsTemperature', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockGetThreadById.mockReturnValue(thread);

    await progressCommand.parseAsync(['node', 'test', 'thread-1', 'Note', '--warm']);

    expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', expect.objectContaining({
      temperature: 'warm',
    }));
  });

  test('progress_WithHot_SetsTemperature', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockGetThreadById.mockReturnValue(thread);

    await progressCommand.parseAsync(['node', 'test', 'thread-1', 'Note', '--hot']);

    expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', expect.objectContaining({
      temperature: 'hot',
    }));
  });

  test('progress_WithAt_UsesCustomTimestamp', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockGetThreadById.mockReturnValue(thread);

    await progressCommand.parseAsync(['node', 'test', 'thread-1', 'Note', '--at', '2024-01-10']);

    expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', {
      progress: expect.arrayContaining([
        expect.objectContaining({
          timestamp: expect.stringContaining('2024-01-10'),
        }),
      ]),
    });
  });

  test('progress_WithYesterday_ParsesRelativeDate', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockGetThreadById.mockReturnValue(thread);

    await progressCommand.parseAsync(['node', 'test', 'thread-1', 'Note', '--at', 'yesterday']);

    expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', {
      progress: expect.arrayContaining([
        expect.objectContaining({
          timestamp: expect.stringContaining('2024-06-14'),
        }),
      ]),
    });
  });

  test('progress_InvalidDatetime_LogsError', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockGetThreadById.mockReturnValue(thread);

    await progressCommand.parseAsync(['node', 'test', 'thread-1', 'Note', '--at', 'not a date']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid datetime'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('progress_MultipleMatches_LogsAmbiguity', async () => {
    mockGetThreadById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetAllThreads.mockReturnValue([
      createMockThread({ id: 'abc-1', name: 'Thread ABC' }),
      createMockThread({ id: 'abc-2', name: 'Thread ABC Two' }),
    ]);

    await progressCommand.parseAsync(['node', 'test', 'abc', 'Note']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Multiple threads'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('progress_ByPartialId_FindsThread', async () => {
    mockGetThreadById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetAllThreads.mockReturnValue([
      createMockThread({ id: 'abc123def456' }),
    ]);

    await progressCommand.parseAsync(['node', 'test', 'abc', 'Made progress']);

    expect(mockUpdateThread).toHaveBeenCalled();
  });

  test('progress_AppendsToExistingProgress', async () => {
    const existingProgress = [{ id: 'p1', timestamp: '2024-01-01', note: 'Old note' }];
    const thread = createMockThread({ id: 'thread-1', progress: existingProgress });
    mockGetThreadById.mockReturnValue(thread);

    await progressCommand.parseAsync(['node', 'test', 'thread-1', 'New note']);

    expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', {
      progress: expect.arrayContaining([
        expect.objectContaining({ note: 'Old note' }),
        expect.objectContaining({ note: 'New note' }),
      ]),
    });
  });

  test('progress_Success_LogsSuccess', async () => {
    const thread = createMockThread({ id: 'thread-1', name: 'My Thread' });
    mockGetThreadById.mockReturnValue(thread);

    await progressCommand.parseAsync(['node', 'test', 'thread-1', 'Progress note']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Progress added'));
  });
});
