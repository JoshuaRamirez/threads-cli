/**
 * Unit tests for commands/batch.ts
 */

import { Thread, Group } from '../src/models/types';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'new-progress-uuid'),
}));

// Mock storage module
jest.mock('../src/storage', () => ({
  getAllThreads: jest.fn(),
  getAllGroups: jest.fn(),
  getThreadById: jest.fn(),
  getThreadByName: jest.fn(),
  getGroupById: jest.fn(),
  getGroupByName: jest.fn(),
  updateThread: jest.fn(),
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
  getAllThreads,
  getAllGroups,
  getThreadById,
  getThreadByName,
  getGroupById,
  getGroupByName,
  updateThread,
} from '../src/storage';
import { batchCommand } from '../src/commands/batch';

const mockGetAllThreads = getAllThreads as jest.MockedFunction<typeof getAllThreads>;
const mockGetAllGroups = getAllGroups as jest.MockedFunction<typeof getAllGroups>;
const mockGetThreadById = getThreadById as jest.MockedFunction<typeof getThreadById>;
const mockGetThreadByName = getThreadByName as jest.MockedFunction<typeof getThreadByName>;
const mockGetGroupById = getGroupById as jest.MockedFunction<typeof getGroupById>;
const mockGetGroupByName = getGroupByName as jest.MockedFunction<typeof getGroupByName>;
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

function createMockGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: 'group-123',
    name: 'Test Group',
    description: '',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('batchCommand', () => {
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

  test('batch_NoCriteria_LogsError', async () => {
    await batchCommand.parseAsync(['node', 'test', 'archive']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No match criteria'));
  });

  test('batch_NoMatches_LogsNoMatches', async () => {
    mockGetAllThreads.mockReturnValue([]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'archive']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No threads match'));
  });

  test('batch_ByStatus_MatchesThreads', async () => {
    const activeThread = createMockThread({ id: 't1', status: 'active' });
    const pausedThread = createMockThread({ id: 't2', status: 'paused' });
    mockGetAllThreads.mockReturnValue([activeThread, pausedThread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'archive']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      status: 'archived',
    }));
    expect(mockUpdateThread).not.toHaveBeenCalledWith('t2', expect.anything());
  });

  test('batch_ByGroup_MatchesThreadsInGroup', async () => {
    const group = createMockGroup({ id: 'grp-1' });
    const inGroup = createMockThread({ id: 't1', groupId: 'grp-1' });
    const outGroup = createMockThread({ id: 't2', groupId: null });
    mockGetAllThreads.mockReturnValue([inGroup, outGroup]);
    mockGetGroupById.mockReturnValue(group);

    await batchCommand.parseAsync(['node', 'test', '--group', 'grp-1', 'set', 'temp', 'hot']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', { temperature: 'hot' });
    expect(mockUpdateThread).not.toHaveBeenCalledWith('t2', expect.anything());
  });

  test('batch_ByTag_MatchesThreadsWithTag', async () => {
    const tagged = createMockThread({ id: 't1', tags: ['urgent'] });
    const untagged = createMockThread({ id: 't2', tags: [] });
    mockGetAllThreads.mockReturnValue([tagged, untagged]);

    await batchCommand.parseAsync(['node', 'test', '--tag', 'urgent', 'set', 'status', 'paused']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', { status: 'paused' });
    expect(mockUpdateThread).not.toHaveBeenCalledWith('t2', expect.anything());
  });

  test('batch_ByImportance_MatchesWithOperator', async () => {
    const imp5 = createMockThread({ id: 't1', importance: 5 });
    const imp3 = createMockThread({ id: 't2', importance: 3 });
    const imp1 = createMockThread({ id: 't3', importance: 1 });
    mockGetAllThreads.mockReturnValue([imp5, imp3, imp1]);

    await batchCommand.parseAsync(['node', 'test', '--importance', '4+', 'archive']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', expect.anything());
    expect(mockUpdateThread).not.toHaveBeenCalledWith('t2', expect.anything());
    expect(mockUpdateThread).not.toHaveBeenCalledWith('t3', expect.anything());
  });

  test('batch_DryRun_DoesNotModify', async () => {
    const thread = createMockThread({ id: 't1', status: 'active' });
    mockGetAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', '--dry-run', 'archive']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Dry run'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('batch_TagAdd_AddsTags', async () => {
    const thread = createMockThread({ id: 't1', status: 'active', tags: [] });
    mockGetAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'tag', 'add', 'newtag']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', { tags: ['newtag'] });
  });

  test('batch_TagRemove_RemovesTags', async () => {
    const thread = createMockThread({ id: 't1', status: 'active', tags: ['keep', 'remove'] });
    mockGetAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'tag', 'remove', 'remove']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', { tags: ['keep'] });
  });

  test('batch_Progress_AddsProgressEntry', async () => {
    const thread = createMockThread({ id: 't1', status: 'active', progress: [] });
    mockGetAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'progress', 'Batch note']);

    expect(mockUpdateThread).toHaveBeenCalledWith('t1', {
      progress: expect.arrayContaining([
        expect.objectContaining({ note: 'Batch note' }),
      ]),
    });
  });

  test('batch_UnderParent_MatchesDescendants', async () => {
    const parent = createMockThread({ id: 'parent', name: 'Parent' });
    const child = createMockThread({ id: 'child', parentId: 'parent' });
    const grandchild = createMockThread({ id: 'grandchild', parentId: 'child' });
    mockGetAllThreads.mockReturnValue([parent, child, grandchild]);
    mockGetThreadById.mockReturnValue(parent);

    await batchCommand.parseAsync(['node', 'test', '--under', 'parent', 'archive']);

    expect(mockUpdateThread).toHaveBeenCalledWith('child', expect.anything());
    expect(mockUpdateThread).toHaveBeenCalledWith('grandchild', expect.anything());
    expect(mockUpdateThread).not.toHaveBeenCalledWith('parent', expect.anything());
  });

  test('batch_Children_MatchesDirectChildrenOnly', async () => {
    const parent = createMockThread({ id: 'parent', name: 'Parent' });
    const child = createMockThread({ id: 'child', parentId: 'parent' });
    const grandchild = createMockThread({ id: 'grandchild', parentId: 'child' });
    mockGetAllThreads.mockReturnValue([parent, child, grandchild]);
    mockGetThreadById.mockReturnValue(parent);

    await batchCommand.parseAsync(['node', 'test', '--children', 'parent', 'archive']);

    expect(mockUpdateThread).toHaveBeenCalledWith('child', expect.anything());
    expect(mockUpdateThread).not.toHaveBeenCalledWith('grandchild', expect.anything());
  });

  test('batch_InvalidAction_LogsError', async () => {
    const thread = createMockThread({ id: 't1', status: 'active' });
    mockGetAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'unknown']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown action'));
  });

  test('batch_NoAction_LogsError', async () => {
    const thread = createMockThread({ id: 't1', status: 'active' });
    mockGetAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No action specified'));
  });
});
