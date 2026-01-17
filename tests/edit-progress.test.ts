/**
 * Unit tests for commands/edit-progress.ts
 */

import { Thread } from '../src/models/types';

// Mock storage module
jest.mock('../src/storage', () => ({
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
} from '../src/storage';
import { editProgressCommand } from '../src/commands/edit-progress';

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

describe('editProgressCommand', () => {
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

  test('editProgress_ThreadNotFound_LogsError', async () => {
    mockGetThreadById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetAllThreads.mockReturnValue([]);

    await editProgressCommand.parseAsync(['node', 'test', 'nonexistent', '1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('editProgress_NoProgress_LogsError', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread', progress: [] });
    mockGetThreadById.mockReturnValue(thread);

    await editProgressCommand.parseAsync(['node', 'test', 't1', '1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('no progress entries'));
  });

  test('editProgress_InvalidIndex_LogsError', async () => {
    const thread = createMockThread({
      id: 't1',
      progress: [{ id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'Note' }],
    });
    mockGetThreadById.mockReturnValue(thread);

    await editProgressCommand.parseAsync(['node', 'test', 't1', '5']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid index'));
  });

  test('editProgress_NoOptions_ShowsCurrentEntry', async () => {
    const thread = createMockThread({
      id: 't1',
      progress: [{ id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'First note' }],
    });
    mockGetThreadById.mockReturnValue(thread);

    await editProgressCommand.parseAsync(['node', 'test', 't1', '1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Current entry'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('editProgress_EditNote_UpdatesNote', async () => {
    const thread = createMockThread({
      id: 't1',
      progress: [{ id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'Old note' }],
    });
    mockGetThreadById.mockReturnValue(thread);

    await editProgressCommand.parseAsync(['node', 'test', 't1', '1', '-n', 'New note']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', {
      progress: expect.arrayContaining([
        expect.objectContaining({ note: 'New note' }),
      ]),
    });
  });

  test('editProgress_EditTime_UpdatesTimestamp', async () => {
    const thread = createMockThread({
      id: 't1',
      progress: [{ id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'Note' }],
    });
    mockGetThreadById.mockReturnValue(thread);

    await editProgressCommand.parseAsync(['node', 'test', 't1', '1', '-t', '2024-06-01T10:00:00.000Z']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', {
      progress: expect.arrayContaining([
        expect.objectContaining({ timestamp: expect.stringContaining('2024-06-01') }),
      ]),
    });
  });

  test('editProgress_EditTimeYesterday_ParsesRelative', async () => {
    const thread = createMockThread({
      id: 't1',
      progress: [{ id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'Note' }],
    });
    mockGetThreadById.mockReturnValue(thread);

    await editProgressCommand.parseAsync(['node', 'test', 't1', '1', '-t', 'yesterday']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', {
      progress: expect.arrayContaining([
        expect.objectContaining({ timestamp: expect.stringContaining('2024-06-14') }),
      ]),
    });
  });

  test('editProgress_InvalidTime_LogsError', async () => {
    const thread = createMockThread({
      id: 't1',
      progress: [{ id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'Note' }],
    });
    mockGetThreadById.mockReturnValue(thread);

    await editProgressCommand.parseAsync(['node', 'test', 't1', '1', '-t', 'invalid-time']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid datetime'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('editProgress_Delete_RemovesEntry', async () => {
    const thread = createMockThread({
      id: 't1',
      progress: [
        { id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'First' },
        { id: 'p2', timestamp: '2024-02-01T00:00:00.000Z', note: 'Second' },
      ],
    });
    mockGetThreadById.mockReturnValue(thread);

    await editProgressCommand.parseAsync(['node', 'test', 't1', '1', '-d']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', {
      progress: [{ id: 'p2', timestamp: '2024-02-01T00:00:00.000Z', note: 'Second' }],
    });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Deleted progress'));
  });

  test('editProgress_LastIndex_TargetsLastEntry', async () => {
    const thread = createMockThread({
      id: 't1',
      progress: [
        { id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'First' },
        { id: 'p2', timestamp: '2024-02-01T00:00:00.000Z', note: 'Last' },
      ],
    });
    mockGetThreadById.mockReturnValue(thread);

    await editProgressCommand.parseAsync(['node', 'test', 't1', 'last', '-n', 'Updated last']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', {
      progress: expect.arrayContaining([
        expect.objectContaining({ note: 'Updated last' }),
      ]),
    });
  });

  test('editProgress_MultipleMatches_LogsAmbiguity', async () => {
    mockGetThreadById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetAllThreads.mockReturnValue([
      createMockThread({ id: 'abc-1', name: 'Thread ABC 1' }),
      createMockThread({ id: 'abc-2', name: 'Thread ABC 2' }),
    ]);

    await editProgressCommand.parseAsync(['node', 'test', 'abc', '1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Multiple threads match'));
  });

  test('editProgress_BothNoteAndTime_UpdatesBoth', async () => {
    const thread = createMockThread({
      id: 't1',
      name: 'Thread',
      progress: [{ id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'Old' }],
    });
    mockGetThreadById.mockReturnValue(thread);

    await editProgressCommand.parseAsync(['node', 'test', 't1', '1', '-n', 'New note', '-t', 'yesterday']);

    expect(mockUpdateThread).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Updated progress'));
  });
});
