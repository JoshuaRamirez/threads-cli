/**
 * Unit tests for commands/tag.ts
 */

import { Thread } from '@redjay/threads-core';

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
  cyan: jest.fn((s: string) => s),
  dim: jest.fn((s: string) => s),
  bold: jest.fn((s: string) => s),
}));

import {
  getThreadById,
  getThreadByName,
  getAllThreads,
  updateThread,
} from '@redjay/threads-storage';
import { tagCommand } from '../src/commands/tag';

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

describe('tagCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('tag_ThreadNotFound_LogsError', async () => {
    mockGetThreadById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetAllThreads.mockReturnValue([]);

    await tagCommand.parseAsync(['node', 'test', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('tag_NoArgs_ShowsCurrentTags', async () => {
    const thread = createMockThread({ id: 't1', name: 'My Thread', tags: ['urgent', 'work'] });
    mockGetThreadById.mockReturnValue(thread);

    await tagCommand.parseAsync(['node', 'test', 't1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('My Thread'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('tag_AddTags_AddsTags', async () => {
    const thread = createMockThread({ id: 't1', tags: [] });
    mockGetThreadById.mockReturnValue(thread);

    await tagCommand.parseAsync(['node', 'test', 't1', 'tag1', 'tag2']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', { tags: ['tag1', 'tag2'] });
  });

  test('tag_AddCommaSeparated_ParsesTags', async () => {
    const thread = createMockThread({ id: 't1', tags: [] });
    mockGetThreadById.mockReturnValue(thread);

    await tagCommand.parseAsync(['node', 'test', 't1', 'a,b,c']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', { tags: ['a', 'b', 'c'] });
  });

  test('tag_AddDuplicate_DoesNotAddDuplicate', async () => {
    const thread = createMockThread({ id: 't1', tags: ['existing'] });
    mockGetThreadById.mockReturnValue(thread);

    await tagCommand.parseAsync(['node', 'test', 't1', 'existing', 'new']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', { tags: ['existing', 'new'] });
  });

  test('tag_AllDuplicates_LogsWarning', async () => {
    const thread = createMockThread({ id: 't1', tags: ['a', 'b'] });
    mockGetThreadById.mockReturnValue(thread);

    await tagCommand.parseAsync(['node', 'test', 't1', 'a', 'b']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already exist'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('tag_RemoveTag_RemovesTags', async () => {
    const thread = createMockThread({ id: 't1', tags: ['keep', 'remove'] });
    mockGetThreadById.mockReturnValue(thread);

    await tagCommand.parseAsync(['node', 'test', 't1', '-r', 'remove']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', { tags: ['keep'] });
  });

  test('tag_RemoveNonexistent_LogsWarning', async () => {
    const thread = createMockThread({ id: 't1', tags: ['a', 'b'] });
    mockGetThreadById.mockReturnValue(thread);

    await tagCommand.parseAsync(['node', 'test', 't1', '-r', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No matching tags'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('tag_Clear_RemovesAllTags', async () => {
    const thread = createMockThread({ id: 't1', tags: ['a', 'b', 'c'] });
    mockGetThreadById.mockReturnValue(thread);

    await tagCommand.parseAsync(['node', 'test', 't1', '--clear']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', { tags: [] });
  });

  test('tag_Success_LogsSuccess', async () => {
    const thread = createMockThread({ id: 't1', name: 'My Thread', tags: [] });
    mockGetThreadById.mockReturnValue(thread);

    await tagCommand.parseAsync(['node', 'test', 't1', 'newtag']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Added'));
  });

  test('tag_ByPartialId_FindsThread', async () => {
    const thread = createMockThread({ id: 'abc123def' });
    mockGetThreadById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetAllThreads.mockReturnValue([thread]);

    await tagCommand.parseAsync(['node', 'test', 'abc', 'newtag']);

    expect(mockUpdateThread).toHaveBeenCalled();
  });
});
