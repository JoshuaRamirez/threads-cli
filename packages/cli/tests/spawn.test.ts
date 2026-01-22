/**
 * Unit tests for commands/spawn.ts
 */

import { Thread } from '@redjay/threads-core';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'new-spawn-uuid'),
}));

// Mock storage module
jest.mock('@redjay/threads-storage', () => ({
  getThreadById: jest.fn(),
  getThreadByName: jest.fn(),
  getAllThreads: jest.fn(),
  addThread: jest.fn(),
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
  getThreadById,
  getThreadByName,
  getAllThreads,
  addThread,
} from '@redjay/threads-storage';
import { spawnCommand } from '../src/commands/spawn';

const mockGetThreadById = getThreadById as jest.MockedFunction<typeof getThreadById>;
const mockGetThreadByName = getThreadByName as jest.MockedFunction<typeof getThreadByName>;
const mockGetAllThreads = getAllThreads as jest.MockedFunction<typeof getAllThreads>;
const mockAddThread = addThread as jest.MockedFunction<typeof addThread>;

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

describe('spawnCommand', () => {
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

  test('spawn_ParentNotFound_LogsError', async () => {
    mockGetThreadById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetAllThreads.mockReturnValue([]);

    await spawnCommand.parseAsync(['node', 'test', 'nonexistent', 'Child']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    expect(mockAddThread).not.toHaveBeenCalled();
  });

  test('spawn_ValidParent_CreatesSubThread', async () => {
    const parent = createMockThread({ id: 'parent-1', name: 'Parent' });
    mockGetThreadById.mockReturnValue(parent);
    mockGetThreadByName.mockImplementation((name) => name === 'Child' ? undefined : undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child']);

    expect(mockAddThread).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Child',
        parentId: 'parent-1',
      })
    );
  });

  test('spawn_InheritsGroupFromParent', async () => {
    const parent = createMockThread({ id: 'parent-1', groupId: 'grp-1' });
    mockGetThreadById.mockReturnValue(parent);
    mockGetThreadByName.mockReturnValue(undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child']);

    expect(mockAddThread).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: 'grp-1' })
    );
  });

  test('spawn_InheritsImportanceFromParent', async () => {
    const parent = createMockThread({ id: 'parent-1', importance: 5 });
    mockGetThreadById.mockReturnValue(parent);
    mockGetThreadByName.mockReturnValue(undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child']);

    expect(mockAddThread).toHaveBeenCalledWith(
      expect.objectContaining({ importance: 5 })
    );
  });

  test('spawn_DuplicateName_LogsError', async () => {
    const parent = createMockThread({ id: 'parent-1' });
    const existing = createMockThread({ name: 'Child' });
    mockGetThreadById.mockReturnValue(parent);
    mockGetThreadByName.mockImplementation((name) => name === 'Child' ? existing : undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'));
    expect(mockAddThread).not.toHaveBeenCalled();
  });

  test('spawn_WithDescription_SetsDescription', async () => {
    const parent = createMockThread({ id: 'parent-1' });
    mockGetThreadById.mockReturnValue(parent);
    mockGetThreadByName.mockReturnValue(undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child', '-d', 'Child desc']);

    expect(mockAddThread).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Child desc' })
    );
  });

  test('spawn_WithSize_SetsSize', async () => {
    const parent = createMockThread({ id: 'parent-1' });
    mockGetThreadById.mockReturnValue(parent);
    mockGetThreadByName.mockReturnValue(undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child', '-z', 'tiny']);

    expect(mockAddThread).toHaveBeenCalledWith(
      expect.objectContaining({ size: 'tiny' })
    );
  });

  test('spawn_InvalidSize_LogsError', async () => {
    const parent = createMockThread({ id: 'parent-1' });
    mockGetThreadById.mockReturnValue(parent);
    mockGetThreadByName.mockReturnValue(undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child', '-z', 'invalid']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid size'));
    expect(mockAddThread).not.toHaveBeenCalled();
  });

  test('spawn_WithImportance_OverridesInheritance', async () => {
    const parent = createMockThread({ id: 'parent-1', importance: 3 });
    mockGetThreadById.mockReturnValue(parent);
    mockGetThreadByName.mockReturnValue(undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child', '-i', '5']);

    expect(mockAddThread).toHaveBeenCalledWith(
      expect.objectContaining({ importance: 5 })
    );
  });

  test('spawn_InvalidImportance_LogsError', async () => {
    const parent = createMockThread({ id: 'parent-1' });
    mockGetThreadById.mockReturnValue(parent);
    mockGetThreadByName.mockReturnValue(undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child', '-i', '10']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('between 1 and 5'));
    expect(mockAddThread).not.toHaveBeenCalled();
  });

  test('spawn_WithTags_SetsTags', async () => {
    const parent = createMockThread({ id: 'parent-1' });
    mockGetThreadById.mockReturnValue(parent);
    mockGetThreadByName.mockReturnValue(undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child', '-T', 'tag1,tag2']);

    expect(mockAddThread).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['tag1', 'tag2'] })
    );
  });

  test('spawn_StartsWarm', async () => {
    const parent = createMockThread({ id: 'parent-1' });
    mockGetThreadById.mockReturnValue(parent);
    mockGetThreadByName.mockReturnValue(undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child']);

    expect(mockAddThread).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 'warm' })
    );
  });

  test('spawn_Success_LogsSuccess', async () => {
    const parent = createMockThread({ id: 'parent-1', name: 'Parent' });
    mockGetThreadById.mockReturnValue(parent);
    mockGetThreadByName.mockReturnValue(undefined);

    await spawnCommand.parseAsync(['node', 'test', 'parent-1', 'Child']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Sub-thread spawned'));
  });
});
