/**
 * Unit tests for commands/new.ts
 */

import { Thread, Group } from 'threads-types';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'new-uuid-123'),
}));

// Mock storage module
jest.mock('threads-storage', () => ({
  addThread: jest.fn(),
  getThreadByName: jest.fn(),
  getThreadById: jest.fn(),
  getAllThreads: jest.fn(),
  getContainerById: jest.fn(),
  getAllContainers: jest.fn(),
  getGroupByName: jest.fn(),
  getGroupById: jest.fn(),
}));

// Mock utils
jest.mock('../src/utils', () => ({
  formatThreadSummary: jest.fn(() => 'formatted-summary'),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((s: string) => s),
  green: jest.fn((s: string) => s),
}));

import {
  addThread,
  getThreadByName,
  getThreadById,
  getAllThreads,
  getContainerById,
  getAllContainers,
  getGroupByName,
  getGroupById,
} from 'threads-storage';
import { newCommand } from '../src/commands/new';

const mockAddThread = addThread as jest.MockedFunction<typeof addThread>;
const mockGetThreadByName = getThreadByName as jest.MockedFunction<typeof getThreadByName>;
const mockGetThreadById = getThreadById as jest.MockedFunction<typeof getThreadById>;
const mockGetAllThreads = getAllThreads as jest.MockedFunction<typeof getAllThreads>;
const mockGetContainerById = getContainerById as jest.MockedFunction<typeof getContainerById>;
const mockGetAllContainers = getAllContainers as jest.MockedFunction<typeof getAllContainers>;
const mockGetGroupByName = getGroupByName as jest.MockedFunction<typeof getGroupByName>;
const mockGetGroupById = getGroupById as jest.MockedFunction<typeof getGroupById>;

function createMockThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: 'test-id-123',
    name: 'Test Thread',
    type: 'thread',
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
    description: 'Test description',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('newCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
    // Default mock returns
    mockGetThreadById.mockReturnValue(undefined);
    mockGetAllThreads.mockReturnValue([]);
    mockGetContainerById.mockReturnValue(undefined);
    mockGetAllContainers.mockReturnValue([]);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.useRealTimers();
  });

  test('new_ValidName_CreatesThread', async () => {
    mockGetThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'My New Thread']);

    expect(mockAddThread).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'My New Thread' })
    );
  });

  test('new_DuplicateName_LogsError', async () => {
    mockGetThreadByName.mockReturnValue({ id: 'existing' } as Thread);

    await newCommand.parseAsync(['node', 'test', 'Existing Thread']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'));
    expect(mockAddThread).not.toHaveBeenCalled();
  });

  test('new_WithDescription_SetsDescription', async () => {
    mockGetThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread', '-d', 'My description']);

    expect(mockAddThread).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'My description' })
    );
  });

  test('new_WithStatus_SetsStatus', async () => {
    mockGetThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread', '-s', 'paused']);

    expect(mockAddThread).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'paused' })
    );
  });

  test('new_InvalidStatus_LogsError', async () => {
    mockGetThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread', '-s', 'invalid']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid status'));
    expect(mockAddThread).not.toHaveBeenCalled();
  });

  test('new_WithTemp_SetsTemperature', async () => {
    mockGetThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread', '-t', 'hot']);

    expect(mockAddThread).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 'hot' })
    );
  });

  test('new_InvalidTemperature_LogsError', async () => {
    mockGetThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread', '-t', 'invalid']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid temperature'));
    expect(mockAddThread).not.toHaveBeenCalled();
  });

  test('new_WithSize_SetsSize', async () => {
    mockGetThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread', '-z', 'huge']);

    expect(mockAddThread).toHaveBeenCalledWith(
      expect.objectContaining({ size: 'huge' })
    );
  });

  test('new_InvalidSize_LogsError', async () => {
    mockGetThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread', '-z', 'invalid']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid size'));
    expect(mockAddThread).not.toHaveBeenCalled();
  });

  test('new_WithImportance_SetsImportance', async () => {
    mockGetThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread', '-i', '5']);

    expect(mockAddThread).toHaveBeenCalledWith(
      expect.objectContaining({ importance: 5 })
    );
  });

  test('new_ImportanceOutOfRange_LogsError', async () => {
    mockGetThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread', '-i', '10']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('between 1 and 5'));
    expect(mockAddThread).not.toHaveBeenCalled();
  });

  test('new_WithTags_SetsTags', async () => {
    mockGetThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread', '-T', 'tag1,tag2,tag3']);

    expect(mockAddThread).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['tag1', 'tag2', 'tag3'] })
    );
  });

  test('new_WithGroup_SetsGroupId', async () => {
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetGroupByName.mockReturnValue(createMockGroup({ id: 'grp-1' }));

    await newCommand.parseAsync(['node', 'test', 'Thread', '-g', 'Test Group']);

    expect(mockAddThread).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: 'grp-1' })
    );
  });

  test('new_InvalidGroup_LogsError', async () => {
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetGroupByName.mockReturnValue(undefined);
    mockGetGroupById.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread', '-g', 'Nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    expect(mockAddThread).not.toHaveBeenCalled();
  });

  test('new_Defaults_UsesCorrectDefaults', async () => {
    mockGetThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread']);

    expect(mockAddThread).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
        temperature: 'warm',
        size: 'medium',
        importance: 3,
      })
    );
  });

  test('new_Success_LogsSuccess', async () => {
    mockGetThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Thread created'));
  });

  test('new_WithParent_SetsParentId', async () => {
    const parent = createMockThread({ id: 'parent-1', name: 'Parent Thread' });
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetThreadById.mockReturnValue(parent);

    await newCommand.parseAsync(['node', 'test', 'Child', '-p', 'parent-1']);

    expect(mockAddThread).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: 'parent-1' })
    );
  });

  test('new_WithParent_InheritsGroup', async () => {
    const parent = createMockThread({ id: 'parent-1', groupId: 'grp-1' });
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetThreadById.mockReturnValue(parent);

    await newCommand.parseAsync(['node', 'test', 'Child', '-p', 'parent-1']);

    expect(mockAddThread).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: 'grp-1' })
    );
  });

  test('new_WithParentAndGroup_ExplicitGroupWins', async () => {
    const parent = createMockThread({ id: 'parent-1', groupId: 'parent-grp' });
    const explicitGroup = createMockGroup({ id: 'explicit-grp' });
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetThreadById.mockReturnValue(parent);
    mockGetGroupByName.mockReturnValue(explicitGroup);

    await newCommand.parseAsync(['node', 'test', 'Child', '-p', 'parent-1', '-g', 'Test Group']);

    expect(mockAddThread).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: 'explicit-grp' })
    );
  });

  test('new_ParentNotFound_LogsError', async () => {
    mockGetThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Child', '-p', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    expect(mockAddThread).not.toHaveBeenCalled();
  });

  test('new_WithoutParent_ParentIdIsNull', async () => {
    mockGetThreadByName.mockReturnValue(undefined);

    await newCommand.parseAsync(['node', 'test', 'Thread']);

    expect(mockAddThread).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: null })
    );
  });
});
