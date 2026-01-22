/**
 * Unit tests for commands/update.ts
 */

import { Thread } from '@redjay/threads-core';

// Mock storage module
jest.mock('@redjay/threads-storage', () => ({
  getThreadById: jest.fn(),
  getThreadByName: jest.fn(),
  getAllThreads: jest.fn(),
  updateThread: jest.fn(),
}));

// Mock utils
jest.mock('../src/utils', () => ({
  formatStatus: jest.fn((s: string) => s),
  formatTemperature: jest.fn((t: string) => t),
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

import {
  getThreadById,
  getThreadByName,
  getAllThreads,
  updateThread,
} from '@redjay/threads-storage';
import { updateCommand } from '../src/commands/update';

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

describe('updateCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('update_ThreadNotFound_LogsError', async () => {
    mockGetThreadById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetAllThreads.mockReturnValue([]);

    await updateCommand.parseAsync(['node', 'test', 'nonexistent', '-s', 'active']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('update_NoOptions_LogsWarning', async () => {
    const thread = createMockThread({ id: 't1' });
    mockGetThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No updates specified'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('update_Status_UpdatesStatus', async () => {
    const thread = createMockThread({ id: 't1', status: 'active' });
    mockGetThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-s', 'paused']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', expect.objectContaining({ status: 'paused' }));
  });

  test('update_InvalidStatus_LogsError', async () => {
    const thread = createMockThread({ id: 't1' });
    mockGetThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-s', 'invalid']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid status'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('update_Temperature_UpdatesTemperature', async () => {
    const thread = createMockThread({ id: 't1', temperature: 'warm' });
    mockGetThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-t', 'hot']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', expect.objectContaining({ temperature: 'hot' }));
  });

  test('update_InvalidTemperature_LogsError', async () => {
    const thread = createMockThread({ id: 't1' });
    mockGetThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-t', 'boiling']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid temperature'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('update_Size_UpdatesSize', async () => {
    const thread = createMockThread({ id: 't1', size: 'medium' });
    mockGetThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-z', 'large']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', expect.objectContaining({ size: 'large' }));
  });

  test('update_InvalidSize_LogsError', async () => {
    const thread = createMockThread({ id: 't1' });
    mockGetThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-z', 'gigantic']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid size'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('update_Importance_UpdatesImportance', async () => {
    const thread = createMockThread({ id: 't1', importance: 3 });
    mockGetThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-i', '5']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', expect.objectContaining({ importance: 5 }));
  });

  test('update_InvalidImportance_LogsError', async () => {
    const thread = createMockThread({ id: 't1' });
    mockGetThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-i', '10']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('between 1 and 5'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('update_Name_UpdatesName', async () => {
    const thread = createMockThread({ id: 't1', name: 'Old Name' });
    mockGetThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-n', 'New Name']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', expect.objectContaining({ name: 'New Name' }));
  });

  test('update_Description_UpdatesDescription', async () => {
    const thread = createMockThread({ id: 't1' });
    mockGetThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-d', 'New description']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', expect.objectContaining({ description: 'New description' }));
  });

  test('update_TagsReplace_ReplacesAllTags', async () => {
    const thread = createMockThread({ id: 't1', tags: ['old', 'tags'] });
    mockGetThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '--tags', 'new,replacement,tags']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      tags: ['new', 'replacement', 'tags'],
    }));
  });

  test('update_AddTag_AddsSingleTag', async () => {
    const thread = createMockThread({ id: 't1', tags: ['existing'] });
    mockGetThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '--add-tag', 'newtag']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      tags: ['existing', 'newtag'],
    }));
  });

  test('update_AddTagDuplicate_LogsWarning', async () => {
    const thread = createMockThread({ id: 't1', tags: ['existing'] });
    mockGetThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '--add-tag', 'existing']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'));
  });

  test('update_RemoveTag_RemovesSingleTag', async () => {
    const thread = createMockThread({ id: 't1', tags: ['keep', 'remove'] });
    mockGetThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '--remove-tag', 'remove']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      tags: ['keep'],
    }));
  });

  test('update_RemoveTagNotFound_LogsWarning', async () => {
    const thread = createMockThread({ id: 't1', tags: ['a', 'b'] });
    mockGetThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '--remove-tag', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found on thread'));
  });

  test('update_MultipleOptions_UpdatesAll', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread' });
    mockGetThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-s', 'paused', '-t', 'cold', '-i', '4']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      status: 'paused',
      temperature: 'cold',
      importance: 4,
    }));
  });

  test('update_Success_LogsChanges', async () => {
    const thread = createMockThread({ id: 't1', name: 'My Thread' });
    mockGetThreadById.mockReturnValue(thread);

    await updateCommand.parseAsync(['node', 'test', 't1', '-s', 'completed']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Updated'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('My Thread'));
  });

  test('update_ByPartialId_FindsThread', async () => {
    const thread = createMockThread({ id: 'abc123def', name: 'Thread' });
    mockGetThreadById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetAllThreads.mockReturnValue([thread]);

    await updateCommand.parseAsync(['node', 'test', 'abc', '-s', 'paused']);

    expect(mockUpdateThread).toHaveBeenCalled();
  });
});
