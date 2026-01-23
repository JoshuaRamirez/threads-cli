/**
 * Unit tests for commands/tag.ts
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
  cyan: jest.fn((s: string) => s),
  dim: jest.fn((s: string) => s),
  bold: jest.fn((s: string) => s),
}));

import { tagCommand } from '../src/commands/tag';

describe('tagCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('tag_ThreadNotFound_LogsError', async () => {
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([]);

    await tagCommand.parseAsync(['node', 'test', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('tag_NoArgs_ShowsCurrentTags', async () => {
    const thread = createMockThread({ id: 't1', name: 'My Thread', tags: ['urgent', 'work'] });
    mockStorage.getThreadById.mockReturnValue(thread);

    await tagCommand.parseAsync(['node', 'test', 't1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('My Thread'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('tag_AddTags_AddsTags', async () => {
    const thread = createMockThread({ id: 't1', tags: [] });
    mockStorage.getThreadById.mockReturnValue(thread);

    await tagCommand.parseAsync(['node', 'test', 't1', 'tag1', 'tag2']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', { tags: ['tag1', 'tag2'] });
  });

  test('tag_AddCommaSeparated_ParsesTags', async () => {
    const thread = createMockThread({ id: 't1', tags: [] });
    mockStorage.getThreadById.mockReturnValue(thread);

    await tagCommand.parseAsync(['node', 'test', 't1', 'a,b,c']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', { tags: ['a', 'b', 'c'] });
  });

  test('tag_AddDuplicate_DoesNotAddDuplicate', async () => {
    const thread = createMockThread({ id: 't1', tags: ['existing'] });
    mockStorage.getThreadById.mockReturnValue(thread);

    await tagCommand.parseAsync(['node', 'test', 't1', 'existing', 'new']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', { tags: ['existing', 'new'] });
  });

  test('tag_AllDuplicates_LogsWarning', async () => {
    const thread = createMockThread({ id: 't1', tags: ['a', 'b'] });
    mockStorage.getThreadById.mockReturnValue(thread);

    await tagCommand.parseAsync(['node', 'test', 't1', 'a', 'b']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already exist'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('tag_RemoveTag_RemovesTags', async () => {
    const thread = createMockThread({ id: 't1', tags: ['keep', 'remove'] });
    mockStorage.getThreadById.mockReturnValue(thread);

    await tagCommand.parseAsync(['node', 'test', 't1', '-r', 'remove']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', { tags: ['keep'] });
  });

  test('tag_RemoveNonexistent_LogsWarning', async () => {
    const thread = createMockThread({ id: 't1', tags: ['a', 'b'] });
    mockStorage.getThreadById.mockReturnValue(thread);

    await tagCommand.parseAsync(['node', 'test', 't1', '-r', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No matching tags'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('tag_Clear_RemovesAllTags', async () => {
    const thread = createMockThread({ id: 't1', tags: ['a', 'b', 'c'] });
    mockStorage.getThreadById.mockReturnValue(thread);

    await tagCommand.parseAsync(['node', 'test', 't1', '--clear']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', { tags: [] });
  });

  test('tag_Success_LogsSuccess', async () => {
    const thread = createMockThread({ id: 't1', name: 'My Thread', tags: [] });
    mockStorage.getThreadById.mockReturnValue(thread);

    await tagCommand.parseAsync(['node', 'test', 't1', 'newtag']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Added'));
  });

  test('tag_ByPartialId_FindsThread', async () => {
    const thread = createMockThread({ id: 'abc123def' });
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await tagCommand.parseAsync(['node', 'test', 'abc', 'newtag']);

    expect(mockStorage.updateThread).toHaveBeenCalled();
  });
});
