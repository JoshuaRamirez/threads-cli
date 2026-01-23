/**
 * Unit tests for commands/progress.ts
 */

import { Thread } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, MockStorageService } from './helpers/mockStorage';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'progress-uuid-123'),
}));

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

import { progressCommand } from '../src/commands/progress';

describe('progressCommand', () => {
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

  test('progress_ThreadNotFound_LogsError', async () => {
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([]);

    await progressCommand.parseAsync(['node', 'test', 'nonexistent', 'Some note']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('progress_ValidThread_AddsProgressEntry', async () => {
    const thread = createMockThread({ id: 'thread-1', progress: [] });
    mockStorage.getThreadById.mockReturnValue(thread);

    await progressCommand.parseAsync(['node', 'test', 'thread-1', 'Made some progress']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('thread-1', {
      progress: expect.arrayContaining([
        expect.objectContaining({ note: 'Made some progress' }),
      ]),
    });
  });

  test('progress_WithWarm_SetsTemperature', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await progressCommand.parseAsync(['node', 'test', 'thread-1', 'Note', '--warm']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('thread-1', expect.objectContaining({
      temperature: 'warm',
    }));
  });

  test('progress_WithHot_SetsTemperature', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await progressCommand.parseAsync(['node', 'test', 'thread-1', 'Note', '--hot']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('thread-1', expect.objectContaining({
      temperature: 'hot',
    }));
  });

  test('progress_WithAt_UsesCustomTimestamp', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await progressCommand.parseAsync(['node', 'test', 'thread-1', 'Note', '--at', '2024-01-10']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('thread-1', {
      progress: expect.arrayContaining([
        expect.objectContaining({
          timestamp: expect.stringContaining('2024-01-10'),
        }),
      ]),
    });
  });

  test('progress_WithYesterday_ParsesRelativeDate', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await progressCommand.parseAsync(['node', 'test', 'thread-1', 'Note', '--at', 'yesterday']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('thread-1', {
      progress: expect.arrayContaining([
        expect.objectContaining({
          timestamp: expect.stringContaining('2024-06-14'),
        }),
      ]),
    });
  });

  test('progress_InvalidDatetime_LogsError', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await progressCommand.parseAsync(['node', 'test', 'thread-1', 'Note', '--at', 'not a date']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid datetime'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('progress_MultipleMatches_LogsAmbiguity', async () => {
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 'abc-1', name: 'Thread ABC' }),
      createMockThread({ id: 'abc-2', name: 'Thread ABC Two' }),
    ]);

    await progressCommand.parseAsync(['node', 'test', 'abc', 'Note']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Multiple threads'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('progress_ByPartialId_FindsThread', async () => {
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 'abc123def456' }),
    ]);

    await progressCommand.parseAsync(['node', 'test', 'abc', 'Made progress']);

    expect(mockStorage.updateThread).toHaveBeenCalled();
  });

  test('progress_AppendsToExistingProgress', async () => {
    const existingProgress = [{ id: 'p1', timestamp: '2024-01-01', note: 'Old note' }];
    const thread = createMockThread({ id: 'thread-1', progress: existingProgress });
    mockStorage.getThreadById.mockReturnValue(thread);

    await progressCommand.parseAsync(['node', 'test', 'thread-1', 'New note']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('thread-1', {
      progress: expect.arrayContaining([
        expect.objectContaining({ note: 'Old note' }),
        expect.objectContaining({ note: 'New note' }),
      ]),
    });
  });

  test('progress_Success_LogsSuccess', async () => {
    const thread = createMockThread({ id: 'thread-1', name: 'My Thread' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await progressCommand.parseAsync(['node', 'test', 'thread-1', 'Progress note']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Progress added'));
  });
});
