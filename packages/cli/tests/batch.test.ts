/**
 * Unit tests for commands/batch.ts
 */

import { Thread, Group } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, createMockGroup, MockStorageService } from './helpers/mockStorage';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'new-progress-uuid'),
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
  cyan: jest.fn((s: string) => s),
  dim: jest.fn((s: string) => s),
}));

import { batchCommand } from '../src/commands/batch';

describe('batchCommand', () => {
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

  test('batch_NoCriteria_LogsError', async () => {
    await batchCommand.parseAsync(['node', 'test', 'archive']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No match criteria'));
  });

  test('batch_NoMatches_LogsNoMatches', async () => {
    mockStorage.getAllThreads.mockReturnValue([]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'archive']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No threads match'));
  });

  test('batch_ByStatus_MatchesThreads', async () => {
    const activeThread = createMockThread({ id: 't1', status: 'active' });
    const pausedThread = createMockThread({ id: 't2', status: 'paused' });
    mockStorage.getAllThreads.mockReturnValue([activeThread, pausedThread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'archive']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      status: 'archived',
    }));
    expect(mockStorage.updateThread).not.toHaveBeenCalledWith('t2', expect.anything());
  });

  test('batch_ByGroup_MatchesThreadsInGroup', async () => {
    const group = createMockGroup({ id: 'grp-1' });
    const inGroup = createMockThread({ id: 't1', groupId: 'grp-1' });
    const outGroup = createMockThread({ id: 't2', groupId: null });
    mockStorage.getAllThreads.mockReturnValue([inGroup, outGroup]);
    mockStorage.getGroupById.mockReturnValue(group);

    await batchCommand.parseAsync(['node', 'test', '--group', 'grp-1', 'set', 'temp', 'hot']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', { temperature: 'hot' });
    expect(mockStorage.updateThread).not.toHaveBeenCalledWith('t2', expect.anything());
  });

  test('batch_ByTag_MatchesThreadsWithTag', async () => {
    const tagged = createMockThread({ id: 't1', tags: ['urgent'] });
    const untagged = createMockThread({ id: 't2', tags: [] });
    mockStorage.getAllThreads.mockReturnValue([tagged, untagged]);

    await batchCommand.parseAsync(['node', 'test', '--tag', 'urgent', 'set', 'status', 'paused']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', { status: 'paused' });
    expect(mockStorage.updateThread).not.toHaveBeenCalledWith('t2', expect.anything());
  });

  test('batch_ByImportance_MatchesWithOperator', async () => {
    const imp5 = createMockThread({ id: 't1', importance: 5 });
    const imp3 = createMockThread({ id: 't2', importance: 3 });
    const imp1 = createMockThread({ id: 't3', importance: 1 });
    mockStorage.getAllThreads.mockReturnValue([imp5, imp3, imp1]);

    await batchCommand.parseAsync(['node', 'test', '--importance', '4+', 'archive']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.anything());
    expect(mockStorage.updateThread).not.toHaveBeenCalledWith('t2', expect.anything());
    expect(mockStorage.updateThread).not.toHaveBeenCalledWith('t3', expect.anything());
  });

  test('batch_DryRun_DoesNotModify', async () => {
    const thread = createMockThread({ id: 't1', status: 'active' });
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', '--dry-run', 'archive']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Dry run'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('batch_TagAdd_AddsTags', async () => {
    const thread = createMockThread({ id: 't1', status: 'active', tags: [] });
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'tag', 'add', 'newtag']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', { tags: ['newtag'] });
  });

  test('batch_TagRemove_RemovesTags', async () => {
    const thread = createMockThread({ id: 't1', status: 'active', tags: ['keep', 'remove'] });
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'tag', 'remove', 'remove']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', { tags: ['keep'] });
  });

  test('batch_Progress_AddsProgressEntry', async () => {
    const thread = createMockThread({ id: 't1', status: 'active', progress: [] });
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'progress', 'Batch note']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', {
      progress: expect.arrayContaining([
        expect.objectContaining({ note: 'Batch note' }),
      ]),
    });
  });

  test('batch_UnderParent_MatchesDescendants', async () => {
    const parent = createMockThread({ id: 'parent', name: 'Parent' });
    const child = createMockThread({ id: 'child', parentId: 'parent' });
    const grandchild = createMockThread({ id: 'grandchild', parentId: 'child' });
    mockStorage.getAllThreads.mockReturnValue([parent, child, grandchild]);
    mockStorage.getThreadById.mockReturnValue(parent);

    await batchCommand.parseAsync(['node', 'test', '--under', 'parent', 'archive']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('child', expect.anything());
    expect(mockStorage.updateThread).toHaveBeenCalledWith('grandchild', expect.anything());
    expect(mockStorage.updateThread).not.toHaveBeenCalledWith('parent', expect.anything());
  });

  test('batch_Children_MatchesDirectChildrenOnly', async () => {
    const parent = createMockThread({ id: 'parent', name: 'Parent' });
    const child = createMockThread({ id: 'child', parentId: 'parent' });
    const grandchild = createMockThread({ id: 'grandchild', parentId: 'child' });
    mockStorage.getAllThreads.mockReturnValue([parent, child, grandchild]);
    mockStorage.getThreadById.mockReturnValue(parent);

    await batchCommand.parseAsync(['node', 'test', '--children', 'parent', 'archive']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('child', expect.anything());
    expect(mockStorage.updateThread).not.toHaveBeenCalledWith('grandchild', expect.anything());
  });

  test('batch_InvalidAction_LogsError', async () => {
    const thread = createMockThread({ id: 't1', status: 'active' });
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'unknown']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown action'));
  });

  test('batch_NoAction_LogsError', async () => {
    const thread = createMockThread({ id: 't1', status: 'active' });
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No action specified'));
  });
});
