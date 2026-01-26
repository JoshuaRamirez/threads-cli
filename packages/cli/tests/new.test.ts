/**
 * Unit tests for commands/new.ts
 */

import { Thread, Group } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, createMockGroup, MockStorageService } from './helpers/mockStorage';

let mockStorage: MockStorageService;

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'new-uuid-123'),
}));

// Mock context module
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

import { newCommand } from '../src/commands/new';

describe('newCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
    // Default mock returns
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([]);
    mockStorage.getContainerById.mockReturnValue(undefined);
    mockStorage.getAllContainers.mockReturnValue([]);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.useRealTimers();
  });

  test('new_ValidName_CreatesThread', async () => {
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'My New Thread']);

    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'My New Thread' })
    );
  });

  test('new_DuplicateName_LogsError', async () => {
    mockStorage.getThreadByName.mockReturnValue({ id: 'existing' } as Thread);

    await newCommand.parseAsync(['node', 'test', 'Existing Thread']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'));
    expect(mockStorage.addThread).not.toHaveBeenCalled();
  });

  test('new_WithDescription_SetsDescription', async () => {
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread', '-d', 'My description']);

    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'My description' })
    );
  });

  test('new_WithStatus_SetsStatus', async () => {
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread', '-s', 'paused']);

    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'paused' })
    );
  });

  test('new_InvalidStatus_LogsError', async () => {
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread', '-s', 'invalid']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid status'));
    expect(mockStorage.addThread).not.toHaveBeenCalled();
  });

  test('new_WithSize_SetsSize', async () => {
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread', '-z', 'huge']);

    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ size: 'huge' })
    );
  });

  test('new_InvalidSize_LogsError', async () => {
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread', '-z', 'invalid']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid size'));
    expect(mockStorage.addThread).not.toHaveBeenCalled();
  });

  test('new_WithImportance_SetsImportance', async () => {
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread', '-i', '5']);

    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ importance: 5 })
    );
  });

  test('new_ImportanceOutOfRange_LogsError', async () => {
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread', '-i', '10']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('between 1 and 5'));
    expect(mockStorage.addThread).not.toHaveBeenCalled();
  });

  test('new_WithTags_SetsTags', async () => {
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread', '-T', 'tag1,tag2,tag3']);

    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['tag1', 'tag2', 'tag3'] })
    );
  });

  test('new_WithGroup_SetsGroupId', async () => {
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getGroupByName.mockReturnValue(createMockGroup({ id: 'grp-1' }));

    await newCommand.parseAsync(['node', 'test', 'Thread', '-g', 'Test Group']);

    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: 'grp-1' })
    );
  });

  test('new_InvalidGroup_LogsError', async () => {
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getGroupByName.mockReturnValue(undefined);
    mockStorage.getGroupById.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread', '-g', 'Nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    expect(mockStorage.addThread).not.toHaveBeenCalled();
  });

  test('new_Defaults_UsesCorrectDefaults', async () => {
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread']);

    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
        size: 'medium',
        importance: 3,
      })
    );
  });

  test('new_Success_LogsSuccess', async () => {
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Thread created'));
  });

  test('new_WithParent_SetsParentId', async () => {
    const parent = createMockThread({ id: 'parent-1', name: 'Parent Thread' });
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getThreadById.mockReturnValue(parent);

    await newCommand.parseAsync(['node', 'test', 'Child', '-p', 'parent-1']);

    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: 'parent-1' })
    );
  });

  test('new_WithParent_InheritsGroup', async () => {
    const parent = createMockThread({ id: 'parent-1', groupId: 'grp-1' });
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getThreadById.mockReturnValue(parent);

    await newCommand.parseAsync(['node', 'test', 'Child', '-p', 'parent-1']);

    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: 'grp-1' })
    );
  });

  test('new_WithParentAndGroup_ExplicitGroupWins', async () => {
    const parent = createMockThread({ id: 'parent-1', groupId: 'parent-grp' });
    const explicitGroup = createMockGroup({ id: 'explicit-grp' });
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getThreadById.mockReturnValue(parent);
    mockStorage.getGroupByName.mockReturnValue(explicitGroup);

    await newCommand.parseAsync(['node', 'test', 'Child', '-p', 'parent-1', '-g', 'Test Group']);

    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: 'explicit-grp' })
    );
  });

  test('new_ParentNotFound_LogsError', async () => {
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Child', '-p', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    expect(mockStorage.addThread).not.toHaveBeenCalled();
  });

  test('new_WithoutParent_ParentIdIsNull', async () => {
    mockStorage.getThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread']);

    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: null })
    );
  });
});
