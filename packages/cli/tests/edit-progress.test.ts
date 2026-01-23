/**
 * Unit tests for commands/edit-progress.ts
 */

import { Thread } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, MockStorageService } from './helpers/mockStorage';

// Create mock storage instance
let mockStorage: MockStorageService;

// Mock context module to return our mock storage
jest.mock('../src/context', () => ({
  getStorage: jest.fn(() => mockStorage),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((s: string) => s),
  green: jest.fn((s: string) => s),
  yellow: jest.fn((s: string) => s),
  dim: jest.fn((s: string) => s),
}));

import { editProgressCommand } from '../src/commands/edit-progress';

describe('editProgressCommand', () => {
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

  test('editProgress_ThreadNotFound_LogsError', async () => {
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([]);

    await editProgressCommand.parseAsync(['node', 'test', 'nonexistent', '1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('editProgress_NoProgress_LogsError', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread', progress: [] });
    mockStorage.getThreadById.mockReturnValue(thread);

    await editProgressCommand.parseAsync(['node', 'test', 't1', '1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('no progress entries'));
  });

  test('editProgress_InvalidIndex_LogsError', async () => {
    const thread = createMockThread({
      id: 't1',
      progress: [{ id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'Note' }],
    });
    mockStorage.getThreadById.mockReturnValue(thread);

    await editProgressCommand.parseAsync(['node', 'test', 't1', '5']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid index'));
  });

  test('editProgress_NoOptions_ShowsCurrentEntry', async () => {
    const thread = createMockThread({
      id: 't1',
      progress: [{ id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'First note' }],
    });
    mockStorage.getThreadById.mockReturnValue(thread);

    await editProgressCommand.parseAsync(['node', 'test', 't1', '1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Current entry'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('editProgress_EditNote_UpdatesNote', async () => {
    const thread = createMockThread({
      id: 't1',
      progress: [{ id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'Old note' }],
    });
    mockStorage.getThreadById.mockReturnValue(thread);

    await editProgressCommand.parseAsync(['node', 'test', 't1', '1', '-n', 'New note']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', {
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
    mockStorage.getThreadById.mockReturnValue(thread);

    await editProgressCommand.parseAsync(['node', 'test', 't1', '1', '-t', '2024-06-01T10:00:00.000Z']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', {
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
    mockStorage.getThreadById.mockReturnValue(thread);

    await editProgressCommand.parseAsync(['node', 'test', 't1', '1', '-t', 'yesterday']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', {
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
    mockStorage.getThreadById.mockReturnValue(thread);

    await editProgressCommand.parseAsync(['node', 'test', 't1', '1', '-t', 'invalid-time']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid datetime'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('editProgress_Delete_RemovesEntry', async () => {
    const thread = createMockThread({
      id: 't1',
      progress: [
        { id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'First' },
        { id: 'p2', timestamp: '2024-02-01T00:00:00.000Z', note: 'Second' },
      ],
    });
    mockStorage.getThreadById.mockReturnValue(thread);

    await editProgressCommand.parseAsync(['node', 'test', 't1', '1', '-d']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', {
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
    mockStorage.getThreadById.mockReturnValue(thread);

    await editProgressCommand.parseAsync(['node', 'test', 't1', 'last', '-n', 'Updated last']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', {
      progress: expect.arrayContaining([
        expect.objectContaining({ note: 'Updated last' }),
      ]),
    });
  });

  test('editProgress_MultipleMatches_LogsAmbiguity', async () => {
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([
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
    mockStorage.getThreadById.mockReturnValue(thread);

    await editProgressCommand.parseAsync(['node', 'test', 't1', '1', '-n', 'New note', '-t', 'yesterday']);

    expect(mockStorage.updateThread).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Updated progress'));
  });
});
