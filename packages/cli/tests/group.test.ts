/**
 * Unit tests for commands/group.ts
 */

import { Thread, Group, Container } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, createMockContainer, createMockGroup, MockStorageService } from './helpers/mockStorage';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'new-group-uuid'),
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
  gray: jest.fn((s: string) => s),
  dim: jest.fn((s: string) => s),
  bold: jest.fn((s: string) => s),
}));

import { groupCommand } from '../src/commands/group';

describe('groupCommand', () => {
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

  describe('list action', () => {
    test('list_NoGroups_LogsNoGroups', async () => {
      mockStorage.getAllGroups.mockReturnValue([]);
      mockStorage.getAllThreads.mockReturnValue([]);

      await groupCommand.parseAsync(['node', 'test']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No groups'));
    });

    test('list_WithGroups_DisplaysGroups', async () => {
      mockStorage.getAllGroups.mockReturnValue([createMockGroup({ name: 'My Group' })]);
      mockStorage.getAllThreads.mockReturnValue([]);

      await groupCommand.parseAsync(['node', 'test', 'list']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Groups'));
    });

    test('list_ShowsThreadCount', async () => {
      const group = createMockGroup({ id: 'grp-1', name: 'Work' });
      mockStorage.getAllGroups.mockReturnValue([group]);
      mockStorage.getAllThreads.mockReturnValue([
        createMockThread({ groupId: 'grp-1' }),
        createMockThread({ groupId: 'grp-1' }),
      ]);

      await groupCommand.parseAsync(['node', 'test', 'list']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2 thread(s)'));
    });
  });

  describe('new action', () => {
    test('new_WithName_CreatesGroup', async () => {
      mockStorage.getGroupByName.mockReturnValue(undefined);

      await groupCommand.parseAsync(['node', 'test', 'new', 'My Group']);

      expect(mockStorage.addGroup).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Group' })
      );
    });

    test('new_DuplicateName_LogsError', async () => {
      mockStorage.getGroupByName.mockReturnValue(createMockGroup());

      await groupCommand.parseAsync(['node', 'test', 'new', 'Existing Group']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'));
      expect(mockStorage.addGroup).not.toHaveBeenCalled();
    });

    test('new_NoName_LogsUsage', async () => {
      await groupCommand.parseAsync(['node', 'test', 'new']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Usage'));
    });

    test('new_WithDescription_SetsDescription', async () => {
      mockStorage.getGroupByName.mockReturnValue(undefined);

      await groupCommand.parseAsync(['node', 'test', 'new', 'Group', '-d', 'My desc']);

      expect(mockStorage.addGroup).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'My desc' })
      );
    });
  });

  describe('add action', () => {
    test('add_ValidThreadAndGroup_AddsToGroup', async () => {
      const thread = createMockThread({ id: 'thread-1' });
      const group = createMockGroup({ id: 'group-1' });
      mockStorage.getAllEntities.mockReturnValue([thread]);
      mockStorage.isContainer.mockReturnValue(false);
      mockStorage.getGroupById.mockReturnValue(group);
      mockStorage.getAllGroups.mockReturnValue([group]);

      await groupCommand.parseAsync(['node', 'test', 'add', 'thread-1', 'group-1']);

      expect(mockStorage.updateThread).toHaveBeenCalledWith('thread-1', { groupId: 'group-1' });
    });

    test('add_ThreadNotFound_LogsError', async () => {
      mockStorage.getAllEntities.mockReturnValue([]);

      await groupCommand.parseAsync(['node', 'test', 'add', 'nonexistent', 'group-1']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });

    test('add_GroupNotFound_LogsError', async () => {
      const thread = createMockThread({ id: 'thread-1' });
      mockStorage.getAllEntities.mockReturnValue([thread]);
      mockStorage.isContainer.mockReturnValue(false);
      mockStorage.getGroupById.mockReturnValue(undefined);
      mockStorage.getGroupByName.mockReturnValue(undefined);
      mockStorage.getAllGroups.mockReturnValue([]);

      await groupCommand.parseAsync(['node', 'test', 'add', 'thread-1', 'nonexistent']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });

    test('add_MissingArgs_LogsUsage', async () => {
      await groupCommand.parseAsync(['node', 'test', 'add', 'thread-1']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Usage'));
    });
  });

  describe('remove action', () => {
    test('remove_ThreadInGroup_RemovesFromGroup', async () => {
      const thread = createMockThread({ id: 'thread-1', groupId: 'group-1' });
      mockStorage.getAllEntities.mockReturnValue([thread]);
      mockStorage.isContainer.mockReturnValue(false);

      await groupCommand.parseAsync(['node', 'test', 'remove', 'thread-1']);

      expect(mockStorage.updateThread).toHaveBeenCalledWith('thread-1', { groupId: null });
    });

    test('remove_ThreadNotInGroup_LogsWarning', async () => {
      const thread = createMockThread({ id: 'thread-1', groupId: null });
      mockStorage.getAllEntities.mockReturnValue([thread]);
      mockStorage.isContainer.mockReturnValue(false);

      await groupCommand.parseAsync(['node', 'test', 'remove', 'thread-1']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not in a group'));
    });

    test('remove_ThreadNotFound_LogsError', async () => {
      mockStorage.getAllEntities.mockReturnValue([]);

      await groupCommand.parseAsync(['node', 'test', 'remove', 'nonexistent']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });
  });

  describe('delete action', () => {
    test('delete_ValidGroup_DeletesGroup', async () => {
      const group = createMockGroup({ id: 'group-1' });
      mockStorage.getGroupById.mockReturnValue(group);
      mockStorage.getAllThreads.mockReturnValue([]);
      mockStorage.getAllContainers.mockReturnValue([]);

      await groupCommand.parseAsync(['node', 'test', 'delete', 'group-1']);

      expect(mockStorage.deleteGroup).toHaveBeenCalledWith('group-1');
    });

    test('delete_UngroupsThreadsAndContainers', async () => {
      const group = createMockGroup({ id: 'group-1' });
      const thread = createMockThread({ id: 't1', groupId: 'group-1' });
      const container = createMockContainer({ id: 'c1', groupId: 'group-1' });
      mockStorage.getGroupById.mockReturnValue(group);
      mockStorage.getAllThreads.mockReturnValue([thread]);
      mockStorage.getAllContainers.mockReturnValue([container]);

      await groupCommand.parseAsync(['node', 'test', 'delete', 'group-1']);

      expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', { groupId: null });
      expect(mockStorage.updateContainer).toHaveBeenCalledWith('c1', { groupId: null });
    });

    test('delete_GroupNotFound_LogsError', async () => {
      mockStorage.getGroupById.mockReturnValue(undefined);
      mockStorage.getGroupByName.mockReturnValue(undefined);
      mockStorage.getAllGroups.mockReturnValue([]);

      await groupCommand.parseAsync(['node', 'test', 'delete', 'nonexistent']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });
  });

  test('unknownAction_LogsError', async () => {
    await groupCommand.parseAsync(['node', 'test', 'unknown']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown action'));
  });
});
