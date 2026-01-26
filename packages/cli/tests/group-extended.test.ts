/**
 * Extended tests for group command - covering uncovered lines
 */

import { Thread, Container, Group, Entity } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, createMockContainer, createMockGroup, MockStorageService } from './helpers/mockStorage';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'new-group-uuid'),
}));

// Create mock storage instance
let mockStorage: MockStorageService;

// Mock context module
jest.mock('../src/context', () => ({
  getStorage: jest.fn(() => mockStorage),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((s: string) => s),
  yellow: jest.fn((s: string) => s),
  dim: jest.fn((s: string) => s),
  green: jest.fn((s: string) => s),
  bold: jest.fn((s: string) => s),
  gray: jest.fn((s: string) => s),
}));

import { groupCommand } from '../src/commands/group';

describe('groupCommand extended', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('group_FindByPartialId_FindsSingleMatch', async () => {
    const group = createMockGroup({ id: 'group-unique-id', name: 'My Group' });
    mockStorage.getGroupById.mockReturnValue(undefined);
    mockStorage.getGroupByName.mockReturnValue(undefined);
    mockStorage.getAllGroups.mockReturnValue([group]);
    mockStorage.getAllThreads.mockReturnValue([]);
    mockStorage.getAllContainers.mockReturnValue([]);

    await groupCommand.parseAsync(['node', 'test', 'delete', 'group-unique']);

    expect(mockStorage.deleteGroup).toHaveBeenCalledWith('group-unique-id');
  });

  test('group_FindByPartialName_FindsSingleMatch', async () => {
    const group = createMockGroup({ id: 'g1', name: 'Development Tasks' });
    mockStorage.getGroupById.mockReturnValue(undefined);
    mockStorage.getGroupByName.mockReturnValue(undefined);
    mockStorage.getAllGroups.mockReturnValue([group]);
    mockStorage.getAllThreads.mockReturnValue([]);
    mockStorage.getAllContainers.mockReturnValue([]);

    await groupCommand.parseAsync(['node', 'test', 'delete', 'Development']);

    expect(mockStorage.deleteGroup).toHaveBeenCalledWith('g1');
  });

  test('group_ListWithLimit_ShowsLimitNote', async () => {
    const groups = [
      createMockGroup({ id: 'g1', name: 'Group 1' }),
      createMockGroup({ id: 'g2', name: 'Group 2' }),
      createMockGroup({ id: 'g3', name: 'Group 3' }),
    ];
    mockStorage.getAllGroups.mockReturnValue(groups);
    mockStorage.getAllThreads.mockReturnValue([]);

    await groupCommand.parseAsync(['node', 'test', 'list', '-n', '2']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2 of 3'));
  });

  test('group_AddContainer_UpdatesContainer', async () => {
    const container = createMockContainer({ id: 'c1', name: 'My Container' });
    const group = createMockGroup({ id: 'g1', name: 'My Group' });
    mockStorage.getAllEntities.mockReturnValue([container]);
    mockStorage.getGroupById.mockReturnValue(group);
    mockStorage.isContainer.mockReturnValue(true);

    await groupCommand.parseAsync(['node', 'test', 'add', 'c1', 'g1']);

    expect(mockStorage.updateContainer).toHaveBeenCalledWith('c1', { groupId: 'g1' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Added'));
  });

  test('group_RemoveContainer_UpdatesContainer', async () => {
    const container = createMockContainer({ id: 'c1', name: 'My Container', groupId: 'g1' });
    mockStorage.getAllEntities.mockReturnValue([container]);
    mockStorage.isContainer.mockReturnValue(true);

    await groupCommand.parseAsync(['node', 'test', 'remove', 'c1']);

    expect(mockStorage.updateContainer).toHaveBeenCalledWith('c1', { groupId: null });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Removed'));
  });

  test('group_RemoveNotInGroup_LogsWarning', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread', groupId: null });
    mockStorage.getAllEntities.mockReturnValue([thread as unknown as Entity]);
    mockStorage.isContainer.mockReturnValue(false);

    await groupCommand.parseAsync(['node', 'test', 'remove', 't1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not in a group'));
  });

  test('group_DeleteWithContainers_UngroupsAll', async () => {
    const group = createMockGroup({ id: 'g1', name: 'My Group' });
    const thread = createMockThread({ id: 't1', name: 'Thread', groupId: 'g1' });
    const container = createMockContainer({ id: 'c1', name: 'Container', groupId: 'g1' });
    mockStorage.getGroupById.mockReturnValue(group);
    mockStorage.getAllThreads.mockReturnValue([thread]);
    mockStorage.getAllContainers.mockReturnValue([container]);

    await groupCommand.parseAsync(['node', 'test', 'delete', 'g1']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', { groupId: null });
    expect(mockStorage.updateContainer).toHaveBeenCalledWith('c1', { groupId: null });
    expect(mockStorage.deleteGroup).toHaveBeenCalledWith('g1');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2 item(s) ungrouped'));
  });

  test('group_EntityFindByPartialId_FindsSingleMatch', async () => {
    const thread = createMockThread({ id: 'thread-abc-123', name: 'My Thread' });
    const group = createMockGroup({ id: 'g1', name: 'My Group' });
    mockStorage.getAllEntities.mockReturnValue([thread as unknown as Entity]);
    mockStorage.getGroupById.mockReturnValue(group);
    mockStorage.isContainer.mockReturnValue(false);

    await groupCommand.parseAsync(['node', 'test', 'add', 'thread-abc', 'g1']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('thread-abc-123', { groupId: 'g1' });
  });

  test('group_EntityFindByPartialName_FindsSingleMatch', async () => {
    const thread = createMockThread({ id: 't1', name: 'Development Task' });
    const group = createMockGroup({ id: 'g1', name: 'My Group' });
    mockStorage.getAllEntities.mockReturnValue([thread as unknown as Entity]);
    mockStorage.getGroupById.mockReturnValue(group);
    mockStorage.isContainer.mockReturnValue(false);

    await groupCommand.parseAsync(['node', 'test', 'add', 'Development', 'g1']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', { groupId: 'g1' });
  });
});
