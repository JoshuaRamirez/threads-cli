/**
 * Additional CLI tests for commands/batch.ts
 * Covers more filter combinations and action types
 */

import { Thread, Group } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, createMockGroup, MockStorageService } from './helpers/mockStorage';

// Create mock storage instance
let mockStorage: MockStorageService;

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

// Mock context module
jest.mock('../src/context', () => ({
  getStorage: jest.fn(() => mockStorage),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((s: string) => s),
  yellow: jest.fn((s: string) => s),
  dim: jest.fn((s: string) => s),
  cyan: jest.fn((s: string) => s),
  green: jest.fn((s: string) => s),
}));

import { batchCommand } from '../src/commands/batch';

describe('batchCommand extended tests', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('batch_InvalidStatus_LogsError', async () => {
    await batchCommand.parseAsync(['node', 'test', '--status', 'invalid', 'archive']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid status'));
  });

  test('batch_InvalidTemp_LogsError', async () => {
    await batchCommand.parseAsync(['node', 'test', '--temp', 'invalid', 'archive']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid temperature'));
  });

  test('batch_InvalidSize_LogsError', async () => {
    await batchCommand.parseAsync(['node', 'test', '--size', 'invalid', 'archive']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid size'));
  });

  test('batch_NoCriteria_LogsError', async () => {
    await batchCommand.parseAsync(['node', 'test', 'archive']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No match criteria'));
  });

  test('batch_UnderNotFound_LogsError', async () => {
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([]);

    await batchCommand.parseAsync(['node', 'test', '--under', 'nonexistent', 'archive']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('batch_ChildrenNotFound_LogsError', async () => {
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([]);

    await batchCommand.parseAsync(['node', 'test', '--children', 'nonexistent', 'archive']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('batch_GroupNotFound_LogsError', async () => {
    mockStorage.getGroupById.mockReturnValue(undefined);
    mockStorage.getGroupByName.mockReturnValue(undefined);
    mockStorage.getAllGroups.mockReturnValue([]);

    await batchCommand.parseAsync(['node', 'test', '--group', 'nonexistent', 'archive']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('batch_NoMatches_LogsWarning', async () => {
    mockStorage.getAllThreads.mockReturnValue([]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'archive']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No threads match'));
  });

  test('batch_DryRun_NoAction_ShowsMatches', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'Thread 1', status: 'active' }),
    ]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', '--dry-run']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Dry run'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Thread 1'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No action specified'));
  });

  test('batch_DryRun_WithAction_ShowsPreview', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'Thread 1', status: 'active' }),
    ]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', '--dry-run', 'archive']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Dry run'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Action: archive'));
  });

  test('batch_NoActionArgs_LogsError', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'Thread 1', status: 'active' }),
    ]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No action specified'));
  });

  test('batch_InvalidAction_LogsError', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'Thread 1', status: 'active' }),
    ]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'invalid']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown action'));
  });

  test('batch_TagAdd_AddsTag', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread 1', status: 'active', tags: [] });
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'tag', 'add', 'newtag']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      tags: ['newtag'],
    }));
  });

  test('batch_TagAdd_DoesNotDuplicate', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread 1', status: 'active', tags: ['existing'] });
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'tag', 'add', 'existing']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      tags: ['existing'],
    }));
  });

  test('batch_TagRemove_RemovesTag', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread 1', status: 'active', tags: ['tag1', 'tag2'] });
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'tag', 'remove', 'tag1']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      tags: ['tag2'],
    }));
  });

  test('batch_TagInvalidSubcommand_LogsError', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', status: 'active' }),
    ]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'tag', 'invalid', 'foo']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown tag action'));
  });

  test('batch_TagMissingArgs_LogsError', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', status: 'active' }),
    ]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'tag']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Tag action requires'));
  });

  test('batch_SetStatus_UpdatesStatus', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread 1', status: 'active' });
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'set', 'status', 'paused']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      status: 'paused',
    }));
  });

  test('batch_SetInvalidStatus_LogsError', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread 1', status: 'active' });
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'set', 'status', 'invalid']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid status'));
  });

  test('batch_SetTemperature_UpdatesTemp', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread 1', status: 'active' });
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'set', 'temperature', 'hot']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      temperature: 'hot',
    }));
  });

  test('batch_SetTemp_Alias_Works', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread 1', status: 'active' });
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'set', 'temp', 'cold']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      temperature: 'cold',
    }));
  });

  test('batch_SetSize_UpdatesSize', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread 1', status: 'active' });
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'set', 'size', 'large']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      size: 'large',
    }));
  });

  test('batch_SetImportance_UpdatesImportance', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread 1', status: 'active' });
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'set', 'importance', '5']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      importance: 5,
    }));
  });

  test('batch_SetImportance_Alias_Works', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread 1', status: 'active' });
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'set', 'imp', '4']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      importance: 4,
    }));
  });

  test('batch_SetInvalidProperty_LogsError', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread 1', status: 'active' });
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'set', 'invalid', 'value']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown property'));
  });

  test('batch_SetMissingArgs_LogsError', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', status: 'active' }),
    ]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'set', 'status']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Set action requires'));
  });

  test('batch_Archive_SetsStatusAndTemp', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread 1', status: 'active' });
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'archive']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', {
      status: 'archived',
      temperature: 'frozen',
    });
  });

  test('batch_Progress_AddsProgressEntry', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread 1', status: 'active', progress: [] });
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'progress', 'Made', 'progress']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      progress: expect.arrayContaining([
        expect.objectContaining({ note: 'Made progress' }),
      ]),
    }));
  });

  test('batch_ProgressMissingNote_LogsError', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', status: 'active' }),
    ]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'progress']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Progress action requires'));
  });

  test('batch_ImportancePlus_FiltersGte', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'Low', status: 'active', importance: 2 }),
      createMockThread({ id: 't2', name: 'High', status: 'active', importance: 4 }),
    ]);

    await batchCommand.parseAsync(['node', 'test', '--importance', '4+', '--dry-run']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 thread'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('High'));
  });

  test('batch_ImportanceMinus_FiltersLte', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'Low', status: 'active', importance: 2 }),
      createMockThread({ id: 't2', name: 'High', status: 'active', importance: 4 }),
    ]);

    await batchCommand.parseAsync(['node', 'test', '--importance', '2-', '--dry-run']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 thread'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Low'));
  });

  test('batch_UnderFilter_IncludesDescendants', async () => {
    const parent = createMockThread({ id: 'p1', name: 'Parent', status: 'active' });
    const child = createMockThread({ id: 'c1', name: 'Child', status: 'active', parentId: 'p1' });
    const grandchild = createMockThread({ id: 'gc1', name: 'Grandchild', status: 'active', parentId: 'c1' });
    mockStorage.getAllThreads.mockReturnValue([parent, child, grandchild]);
    mockStorage.getThreadById.mockReturnValue(parent);

    await batchCommand.parseAsync(['node', 'test', '--under', 'p1', '--dry-run']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2 thread'));
  });

  test('batch_ChildrenFilter_OnlyDirectChildren', async () => {
    const parent = createMockThread({ id: 'p1', name: 'Parent', status: 'active' });
    const child = createMockThread({ id: 'c1', name: 'Child', status: 'active', parentId: 'p1' });
    const grandchild = createMockThread({ id: 'gc1', name: 'Grandchild', status: 'active', parentId: 'c1' });
    mockStorage.getAllThreads.mockReturnValue([parent, child, grandchild]);
    mockStorage.getThreadById.mockReturnValue(parent);

    await batchCommand.parseAsync(['node', 'test', '--children', 'p1', '--dry-run']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 thread'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Child'));
  });

  test('batch_GroupFilter_FiltersCorrectly', async () => {
    const group = createMockGroup({ id: 'g1', name: 'Group 1' });
    mockStorage.getGroupById.mockReturnValue(group);
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'In Group', status: 'active', groupId: 'g1' }),
      createMockThread({ id: 't2', name: 'No Group', status: 'active', groupId: null }),
    ]);

    await batchCommand.parseAsync(['node', 'test', '--group', 'g1', '--dry-run']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 thread'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('In Group'));
  });

  test('batch_CombinedFilters_Intersects', async () => {
    const group = createMockGroup({ id: 'g1', name: 'Group 1' });
    mockStorage.getGroupById.mockReturnValue(group);
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'Match', status: 'active', groupId: 'g1', temperature: 'hot' }),
      createMockThread({ id: 't2', name: 'No Match', status: 'active', groupId: 'g1', temperature: 'cold' }),
    ]);

    await batchCommand.parseAsync(['node', 'test', '--group', 'g1', '--temp', 'hot', '--dry-run']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 thread'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Match'));
  });

  test('batch_TagFilter_FiltersCorrectly', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'Tagged', status: 'active', tags: ['important'] }),
      createMockThread({ id: 't2', name: 'Not Tagged', status: 'active', tags: [] }),
    ]);

    await batchCommand.parseAsync(['node', 'test', '--tag', 'important', '--dry-run']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 thread'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Tagged'));
  });

  test('batch_SizeFilter_FiltersCorrectly', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'Large', status: 'active', size: 'large' }),
      createMockThread({ id: 't2', name: 'Small', status: 'active', size: 'small' }),
    ]);

    await batchCommand.parseAsync(['node', 'test', '--size', 'large', '--dry-run']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 thread'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Large'));
  });

  test('batch_MultipleTags_ParsedCorrectly', async () => {
    const thread = createMockThread({ id: 't1', status: 'active', tags: [] });
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'tag', 'add', 'tag1,tag2', 'tag3']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      tags: ['tag1', 'tag2', 'tag3'],
    }));
  });

  test('batch_SuccessFailureCounts_Displayed', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'Thread 1', status: 'active' }),
      createMockThread({ id: 't2', name: 'Thread 2', status: 'active' }),
    ]);

    await batchCommand.parseAsync(['node', 'test', '--status', 'active', 'archive']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2 succeeded'));
  });
});
