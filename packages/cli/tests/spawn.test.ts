/**
 * Unit tests for commands/spawn.ts
 */

import { Thread } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, MockStorageService } from './helpers/mockStorage';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'new-spawn-uuid'),
}));

// Create mock storage instance
let mockStorage: MockStorageService;

// Mock context module to return our mock storage
jest.mock('../src/context', () => ({
  getStorage: jest.fn(() => mockStorage),
}));

// Mock utils
jest.mock('../src/utils', () => ({
  formatThreadSummary: jest.fn(() => 'formatted-summary'),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((s: string) => s),
  green: jest.fn((s: string) => s),
}));

import { spawnCommand } from '../src/commands/spawn';

describe('spawnCommand', () => {
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

  test('spawn_ParentNotFound_LogsError', async () => {
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([]);

    await spawnCommand.parseAsync(['node', 'test', 'nonexistent', 'Child']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    expect(mockStorage.addThread).not.toHaveBeenCalled();
  });

  test('spawn_ValidParent_CreatesSubThread', async () => {
    const parent = createMockThread({ id: 'parent-1', name: 'Parent' });
    mockStorage.getThreadById.mockReturnValue(parent);
    mockStorage.getThreadByName.mockImplementation((name: string) => name === 'Child' ? undefined : undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child']);

    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Child',
        parentId: 'parent-1',
      })
    );
  });

  test('spawn_InheritsGroupFromParent', async () => {
    const parent = createMockThread({ id: 'parent-1', groupId: 'grp-1' });
    mockStorage.getThreadById.mockReturnValue(parent);
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child']);

    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: 'grp-1' })
    );
  });

  test('spawn_InheritsImportanceFromParent', async () => {
    const parent = createMockThread({ id: 'parent-1', importance: 5 });
    mockStorage.getThreadById.mockReturnValue(parent);
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child']);

    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ importance: 5 })
    );
  });

  test('spawn_DuplicateName_LogsError', async () => {
    const parent = createMockThread({ id: 'parent-1' });
    const existing = createMockThread({ name: 'Child' });
    mockStorage.getThreadById.mockReturnValue(parent);
    mockStorage.getThreadByName.mockImplementation((name: string) => name === 'Child' ? existing : undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'));
    expect(mockStorage.addThread).not.toHaveBeenCalled();
  });

  test('spawn_WithDescription_SetsDescription', async () => {
    const parent = createMockThread({ id: 'parent-1' });
    mockStorage.getThreadById.mockReturnValue(parent);
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child', '-d', 'Child desc']);

    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Child desc' })
    );
  });

  test('spawn_WithSize_SetsSize', async () => {
    const parent = createMockThread({ id: 'parent-1' });
    mockStorage.getThreadById.mockReturnValue(parent);
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child', '-z', 'tiny']);

    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ size: 'tiny' })
    );
  });

  test('spawn_InvalidSize_LogsError', async () => {
    const parent = createMockThread({ id: 'parent-1' });
    mockStorage.getThreadById.mockReturnValue(parent);
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child', '-z', 'invalid']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid size'));
    expect(mockStorage.addThread).not.toHaveBeenCalled();
  });

  test('spawn_WithImportance_OverridesInheritance', async () => {
    const parent = createMockThread({ id: 'parent-1', importance: 3 });
    mockStorage.getThreadById.mockReturnValue(parent);
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child', '-i', '5']);

    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ importance: 5 })
    );
  });

  test('spawn_InvalidImportance_LogsError', async () => {
    const parent = createMockThread({ id: 'parent-1' });
    mockStorage.getThreadById.mockReturnValue(parent);
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child', '-i', '10']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('between 1 and 5'));
    expect(mockStorage.addThread).not.toHaveBeenCalled();
  });

  test('spawn_WithTags_SetsTags', async () => {
    const parent = createMockThread({ id: 'parent-1' });
    mockStorage.getThreadById.mockReturnValue(parent);
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child', '-T', 'tag1,tag2']);

    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['tag1', 'tag2'] })
    );
  });

  test('spawn_StartsWarm', async () => {
    const parent = createMockThread({ id: 'parent-1' });
    mockStorage.getThreadById.mockReturnValue(parent);
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child']);

    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 'warm' })
    );
  });

  test('spawn_Success_LogsSuccess', async () => {
    const parent = createMockThread({ id: 'parent-1', name: 'Parent' });
    mockStorage.getThreadById.mockReturnValue(parent);
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Sub-thread spawned'));
  });
});
