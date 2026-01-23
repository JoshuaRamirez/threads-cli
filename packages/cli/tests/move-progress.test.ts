/**
 * Unit tests for commands/move-progress.ts
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
}));

import { moveProgressCommand } from '../src/commands/move-progress';

describe('moveProgressCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('moveProgress_SourceNotFound_LogsError', async () => {
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([]);

    await moveProgressCommand.parseAsync(['node', 'test', 'nonexistent', 'dest']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('moveProgress_DestNotFound_LogsError', async () => {
    const source = createMockThread({ id: 'src', name: 'Source' });
    mockStorage.getThreadById.mockImplementation((id: string) => id === 'src' ? source : undefined);
    mockStorage.getThreadByName.mockImplementation((name: string) => name === 'Source' ? source : undefined);
    mockStorage.getAllThreads.mockReturnValue([source]);

    await moveProgressCommand.parseAsync(['node', 'test', 'src', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Destination'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('moveProgress_SameSourceAndDest_LogsError', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await moveProgressCommand.parseAsync(['node', 'test', 't1', 't1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('cannot be the same'));
  });

  test('moveProgress_NoProgress_LogsError', async () => {
    const source = createMockThread({ id: 'src', name: 'Source', progress: [] });
    const dest = createMockThread({ id: 'dst', name: 'Dest' });
    mockStorage.getThreadById.mockImplementation((id: string) => {
      if (id === 'src') return source;
      if (id === 'dst') return dest;
      return undefined;
    });

    await moveProgressCommand.parseAsync(['node', 'test', 'src', 'dst']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('no progress entries'));
  });

  test('moveProgress_Default_MovesLastEntry', async () => {
    const source = createMockThread({
      id: 'src',
      name: 'Source',
      progress: [
        { id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'First' },
        { id: 'p2', timestamp: '2024-02-01T00:00:00.000Z', note: 'Last' },
      ],
    });
    const dest = createMockThread({ id: 'dst', name: 'Dest', progress: [] });
    mockStorage.getThreadById.mockImplementation((id: string) => {
      if (id === 'src') return source;
      if (id === 'dst') return dest;
      return undefined;
    });

    await moveProgressCommand.parseAsync(['node', 'test', 'src', 'dst']);

    // Source should lose last entry
    expect(mockStorage.updateThread).toHaveBeenCalledWith('src', {
      progress: [{ id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'First' }],
    });
    // Dest should gain last entry
    expect(mockStorage.updateThread).toHaveBeenCalledWith('dst', {
      progress: expect.arrayContaining([
        expect.objectContaining({ note: 'Last' }),
      ]),
    });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Moved 1 progress entry'));
  });

  test('moveProgress_AllFlag_MovesAllEntries', async () => {
    const source = createMockThread({
      id: 'src',
      name: 'Source',
      progress: [
        { id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'First' },
        { id: 'p2', timestamp: '2024-02-01T00:00:00.000Z', note: 'Second' },
      ],
    });
    const dest = createMockThread({ id: 'dst', name: 'Dest', progress: [] });
    mockStorage.getThreadById.mockImplementation((id: string) => {
      if (id === 'src') return source;
      if (id === 'dst') return dest;
      return undefined;
    });

    await moveProgressCommand.parseAsync(['node', 'test', 'src', 'dst', '--all']);

    // Source should be empty
    expect(mockStorage.updateThread).toHaveBeenCalledWith('src', { progress: [] });
    // Dest should have all entries
    expect(mockStorage.updateThread).toHaveBeenCalledWith('dst', {
      progress: expect.arrayContaining([
        expect.objectContaining({ note: 'First' }),
        expect.objectContaining({ note: 'Second' }),
      ]),
    });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Moved 2 progress entries'));
  });

  test('moveProgress_CountFlag_MovesNEntries', async () => {
    const source = createMockThread({
      id: 'src',
      name: 'Source',
      progress: [
        { id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'First' },
        { id: 'p2', timestamp: '2024-02-01T00:00:00.000Z', note: 'Second' },
        { id: 'p3', timestamp: '2024-03-01T00:00:00.000Z', note: 'Third' },
      ],
    });
    const dest = createMockThread({ id: 'dst', name: 'Dest', progress: [] });
    mockStorage.getThreadById.mockImplementation((id: string) => {
      if (id === 'src') return source;
      if (id === 'dst') return dest;
      return undefined;
    });

    await moveProgressCommand.parseAsync(['node', 'test', 'src', 'dst', '--count', '2']);

    // Source should keep first entry
    expect(mockStorage.updateThread).toHaveBeenCalledWith('src', {
      progress: [{ id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'First' }],
    });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Moved 2 progress entries'));
  });

  test('moveProgress_CountExceedsAvailable_MovesAllWithWarning', async () => {
    const source = createMockThread({
      id: 'src',
      name: 'Source',
      progress: [{ id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'Only' }],
    });
    const dest = createMockThread({ id: 'dst', name: 'Dest', progress: [] });
    mockStorage.getThreadById.mockImplementation((id: string) => {
      if (id === 'src') return source;
      if (id === 'dst') return dest;
      return undefined;
    });

    await moveProgressCommand.parseAsync(['node', 'test', 'src', 'dst', '--count', '10']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('only has 1 progress'));
    expect(mockStorage.updateThread).toHaveBeenCalledWith('src', { progress: [] });
  });

  test('moveProgress_MergesWithExisting_SortedByTimestamp', async () => {
    const source = createMockThread({
      id: 'src',
      name: 'Source',
      progress: [{ id: 'p2', timestamp: '2024-02-01T00:00:00.000Z', note: 'From source' }],
    });
    const dest = createMockThread({
      id: 'dst',
      name: 'Dest',
      progress: [{ id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'Already here' }],
    });
    mockStorage.getThreadById.mockImplementation((id: string) => {
      if (id === 'src') return source;
      if (id === 'dst') return dest;
      return undefined;
    });

    await moveProgressCommand.parseAsync(['node', 'test', 'src', 'dst']);

    // Destination should have both entries sorted by timestamp
    expect(mockStorage.updateThread).toHaveBeenCalledWith('dst', {
      progress: [
        expect.objectContaining({ note: 'Already here' }),
        expect.objectContaining({ note: 'From source' }),
      ],
    });
  });

  test('moveProgress_ZeroCount_LogsError', async () => {
    const source = createMockThread({
      id: 'src',
      name: 'Source',
      progress: [{ id: 'p1', timestamp: '2024-01-01T00:00:00.000Z', note: 'Note' }],
    });
    const dest = createMockThread({ id: 'dst', name: 'Dest', progress: [] });
    mockStorage.getThreadById.mockImplementation((id: string) => {
      if (id === 'src') return source;
      if (id === 'dst') return dest;
      return undefined;
    });

    await moveProgressCommand.parseAsync(['node', 'test', 'src', 'dst', '--count', '0']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('must be a positive number'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('moveProgress_MultipleSourceMatches_LogsAmbiguity', async () => {
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 'abc-1', name: 'ABC 1' }),
      createMockThread({ id: 'abc-2', name: 'ABC 2' }),
    ]);

    await moveProgressCommand.parseAsync(['node', 'test', 'abc', 'dest']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Multiple threads match'));
  });
});
