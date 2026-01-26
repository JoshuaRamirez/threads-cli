/**
 * Unit tests for commands/update.ts
 */

import { Thread } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, MockStorageService } from './helpers/mockStorage';

// Create mock storage instance
let mockStorage: MockStorageService;

// Mock context module to return our mock storage
jest.mock('../src/context', () => ({
  getStorage: jest.fn(() => mockStorage),
}));

// Mock utils
jest.mock('../src/utils', () => ({
  formatStatus: jest.fn((s: string) => s),
  formatSize: jest.fn((s: string) => s),
  formatImportance: jest.fn((i: number) => `${i}/5`),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((s: string) => s),
  green: jest.fn((s: string) => s),
  yellow: jest.fn((s: string) => s),
  cyan: jest.fn((s: string) => s),
  dim: jest.fn((s: string) => s),
}));

import { updateCommand } from '../src/commands/update';

describe('updateCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('update_ThreadNotFound_LogsError', async () => {
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([]);

    await updateCommand.parseAsync(['node', 'test', 'nonexistent', '-s', 'active']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('update_NoOptions_LogsWarning', async () => {
    const thread = createMockThread({ id: 't1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No updates specified'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('update_Status_UpdatesStatus', async () => {
    const thread = createMockThread({ id: 't1', status: 'active' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-s', 'paused']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({ status: 'paused' }));
  });

  test('update_InvalidStatus_LogsError', async () => {
    const thread = createMockThread({ id: 't1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-s', 'invalid']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid status'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('update_Size_UpdatesSize', async () => {
    const thread = createMockThread({ id: 't1', size: 'medium' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-z', 'large']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({ size: 'large' }));
  });

  test('update_InvalidSize_LogsError', async () => {
    const thread = createMockThread({ id: 't1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-z', 'gigantic']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid size'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('update_Importance_UpdatesImportance', async () => {
    const thread = createMockThread({ id: 't1', importance: 3 });
    mockStorage.getThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-i', '5']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({ importance: 5 }));
  });

  test('update_InvalidImportance_LogsError', async () => {
    const thread = createMockThread({ id: 't1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-i', '10']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('between 1 and 5'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('update_Name_UpdatesName', async () => {
    const thread = createMockThread({ id: 't1', name: 'Old Name' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-n', 'New Name']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({ name: 'New Name' }));
  });

  test('update_Description_UpdatesDescription', async () => {
    const thread = createMockThread({ id: 't1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-d', 'New description']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({ description: 'New description' }));
  });

  test('update_TagsReplace_ReplacesAllTags', async () => {
    const thread = createMockThread({ id: 't1', tags: ['old', 'tags'] });
    mockStorage.getThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '--tags', 'new,replacement,tags']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      tags: ['new', 'replacement', 'tags'],
    }));
  });

  test('update_AddTag_AddsSingleTag', async () => {
    const thread = createMockThread({ id: 't1', tags: ['existing'] });
    mockStorage.getThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '--add-tag', 'newtag']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      tags: ['existing', 'newtag'],
    }));
  });

  test('update_AddTagDuplicate_LogsWarning', async () => {
    const thread = createMockThread({ id: 't1', tags: ['existing'] });
    mockStorage.getThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '--add-tag', 'existing']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'));
  });

  test('update_RemoveTag_RemovesSingleTag', async () => {
    const thread = createMockThread({ id: 't1', tags: ['keep', 'remove'] });
    mockStorage.getThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '--remove-tag', 'remove']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      tags: ['keep'],
    }));
  });

  test('update_RemoveTagNotFound_LogsWarning', async () => {
    const thread = createMockThread({ id: 't1', tags: ['a', 'b'] });
    mockStorage.getThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '--remove-tag', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found on thread'));
  });

  test('update_MultipleOptions_UpdatesAll', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-s', 'paused', '-z', 'large', '-i', '4']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      status: 'paused',
      size: 'large',
      importance: 4,
    }));
  });

  test('update_Success_LogsChanges', async () => {
    const thread = createMockThread({ id: 't1', name: 'My Thread' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-s', 'completed']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Updated'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('My Thread'));
  });

  test('update_ByPartialId_FindsThread', async () => {
    const thread = createMockThread({ id: 'abc123def', name: 'Thread' });
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await updateCommand.parseAsync(['node', 'test', 'abc', '-s', 'paused']);

    expect(mockStorage.updateThread).toHaveBeenCalled();
  });
});
