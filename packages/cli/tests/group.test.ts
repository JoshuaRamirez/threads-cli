/**
 * Unit tests for commands/group.ts
 */

import { Thread, Group, Container } from '@redjay/threads-core';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'new-group-uuid'),
}));

// Mock storage module
jest.mock('@redjay/threads-storage', () => ({
  getAllGroups: jest.fn(),
  getGroupById: jest.fn(),
  getGroupByName: jest.fn(),
  addGroup: jest.fn(),
  updateGroup: jest.fn(),
  deleteGroup: jest.fn(),
  getAllThreads: jest.fn(),
  getThreadById: jest.fn(),
  getThreadByName: jest.fn(),
  updateThread: jest.fn(),
  getAllContainers: jest.fn(),
  updateContainer: jest.fn(),
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

import {
  getAllGroups,
  getGroupById,
  getGroupByName,
  addGroup,
  deleteGroup,
  getAllThreads,
  getThreadById,
  getThreadByName,
  updateThread,
  getAllContainers,
  updateContainer,
} from '@redjay/threads-storage';
import { groupCommand } from '../src/commands/group';

const mockGetAllGroups = getAllGroups as jest.MockedFunction<typeof getAllGroups>;
const mockGetGroupById = getGroupById as jest.MockedFunction<typeof getGroupById>;
const mockGetGroupByName = getGroupByName as jest.MockedFunction<typeof getGroupByName>;
const mockAddGroup = addGroup as jest.MockedFunction<typeof addGroup>;
const mockDeleteGroup = deleteGroup as jest.MockedFunction<typeof deleteGroup>;
const mockGetAllThreads = getAllThreads as jest.MockedFunction<typeof getAllThreads>;
const mockGetThreadById = getThreadById as jest.MockedFunction<typeof getThreadById>;
const mockGetThreadByName = getThreadByName as jest.MockedFunction<typeof getThreadByName>;
const mockUpdateThread = updateThread as jest.MockedFunction<typeof updateThread>;
const mockGetAllContainers = getAllContainers as jest.MockedFunction<typeof getAllContainers>;
const mockUpdateContainer = updateContainer as jest.MockedFunction<typeof updateContainer>;

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

function createMockContainer(overrides: Partial<Container> = {}): Container {
  return {
    type: 'container',
    id: 'container-123',
    name: 'Test Container',
    description: '',
    parentId: null,
    groupId: null,
    tags: [],
    details: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('groupCommand', () => {
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

  describe('list action', () => {
    test('list_NoGroups_LogsNoGroups', async () => {
      mockGetAllGroups.mockReturnValue([]);
      mockGetAllThreads.mockReturnValue([]);

      await groupCommand.parseAsync(['node', 'test']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No groups'));
    });

    test('list_WithGroups_DisplaysGroups', async () => {
      mockGetAllGroups.mockReturnValue([createMockGroup({ name: 'My Group' })]);
      mockGetAllThreads.mockReturnValue([]);

      await groupCommand.parseAsync(['node', 'test', 'list']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Groups'));
    });

    test('list_ShowsThreadCount', async () => {
      const group = createMockGroup({ id: 'grp-1', name: 'Work' });
      mockGetAllGroups.mockReturnValue([group]);
      mockGetAllThreads.mockReturnValue([
        createMockThread({ groupId: 'grp-1' }),
        createMockThread({ groupId: 'grp-1' }),
      ]);

      await groupCommand.parseAsync(['node', 'test', 'list']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2 thread(s)'));
    });
  });

  describe('new action', () => {
    test('new_WithName_CreatesGroup', async () => {
      mockGetGroupByName.mockReturnValue(undefined);

      await groupCommand.parseAsync(['node', 'test', 'new', 'My Group']);

      expect(mockAddGroup).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Group' })
      );
    });

    test('new_DuplicateName_LogsError', async () => {
      mockGetGroupByName.mockReturnValue(createMockGroup());

      await groupCommand.parseAsync(['node', 'test', 'new', 'Existing Group']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'));
      expect(mockAddGroup).not.toHaveBeenCalled();
    });

    test('new_NoName_LogsUsage', async () => {
      await groupCommand.parseAsync(['node', 'test', 'new']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Usage'));
    });

    test('new_WithDescription_SetsDescription', async () => {
      mockGetGroupByName.mockReturnValue(undefined);

      await groupCommand.parseAsync(['node', 'test', 'new', 'Group', '-d', 'My desc']);

      expect(mockAddGroup).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'My desc' })
      );
    });
  });

  describe('add action', () => {
    test('add_ValidThreadAndGroup_AddsToGroup', async () => {
      const thread = createMockThread({ id: 'thread-1' });
      const group = createMockGroup({ id: 'group-1' });
      mockGetThreadById.mockReturnValue(thread);
      mockGetGroupById.mockReturnValue(group);
      mockGetAllThreads.mockReturnValue([thread]);
      mockGetAllGroups.mockReturnValue([group]);

      await groupCommand.parseAsync(['node', 'test', 'add', 'thread-1', 'group-1']);

      expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', { groupId: 'group-1' });
    });

    test('add_ThreadNotFound_LogsError', async () => {
      mockGetThreadById.mockReturnValue(undefined);
      mockGetThreadByName.mockReturnValue(undefined);
      mockGetAllThreads.mockReturnValue([]);

      await groupCommand.parseAsync(['node', 'test', 'add', 'nonexistent', 'group-1']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });

    test('add_GroupNotFound_LogsError', async () => {
      const thread = createMockThread({ id: 'thread-1' });
      mockGetThreadById.mockReturnValue(thread);
      mockGetGroupById.mockReturnValue(undefined);
      mockGetGroupByName.mockReturnValue(undefined);
      mockGetAllGroups.mockReturnValue([]);

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
      mockGetThreadById.mockReturnValue(thread);

      await groupCommand.parseAsync(['node', 'test', 'remove', 'thread-1']);

      expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', { groupId: null });
    });

    test('remove_ThreadNotInGroup_LogsWarning', async () => {
      const thread = createMockThread({ id: 'thread-1', groupId: null });
      mockGetThreadById.mockReturnValue(thread);

      await groupCommand.parseAsync(['node', 'test', 'remove', 'thread-1']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not in a group'));
    });

    test('remove_ThreadNotFound_LogsError', async () => {
      mockGetThreadById.mockReturnValue(undefined);
      mockGetThreadByName.mockReturnValue(undefined);
      mockGetAllThreads.mockReturnValue([]);

      await groupCommand.parseAsync(['node', 'test', 'remove', 'nonexistent']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });
  });

  describe('delete action', () => {
    test('delete_ValidGroup_DeletesGroup', async () => {
      const group = createMockGroup({ id: 'group-1' });
      mockGetGroupById.mockReturnValue(group);
      mockGetAllThreads.mockReturnValue([]);
      mockGetAllContainers.mockReturnValue([]);

      await groupCommand.parseAsync(['node', 'test', 'delete', 'group-1']);

      expect(mockDeleteGroup).toHaveBeenCalledWith('group-1');
    });

    test('delete_UngroupsThreadsAndContainers', async () => {
      const group = createMockGroup({ id: 'group-1' });
      const thread = createMockThread({ id: 't1', groupId: 'group-1' });
      const container = createMockContainer({ id: 'c1', groupId: 'group-1' });
      mockGetGroupById.mockReturnValue(group);
      mockGetAllThreads.mockReturnValue([thread]);
      mockGetAllContainers.mockReturnValue([container]);

      await groupCommand.parseAsync(['node', 'test', 'delete', 'group-1']);

      expect(mockUpdateThread).toHaveBeenCalledWith('t1', { groupId: null });
      expect(mockUpdateContainer).toHaveBeenCalledWith('c1', { groupId: null });
    });

    test('delete_GroupNotFound_LogsError', async () => {
      mockGetGroupById.mockReturnValue(undefined);
      mockGetGroupByName.mockReturnValue(undefined);
      mockGetAllGroups.mockReturnValue([]);

      await groupCommand.parseAsync(['node', 'test', 'delete', 'nonexistent']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });
  });

  test('unknownAction_LogsError', async () => {
    await groupCommand.parseAsync(['node', 'test', 'unknown']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown action'));
  });
});
