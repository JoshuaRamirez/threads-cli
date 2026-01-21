/**
 * Unit tests for commands/archive.ts
 */

import { Thread } from '@joshua2048/threads-core';

// Mock storage module
jest.mock('@joshua2048/threads-storage', () => ({
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
  gray: jest.fn((s: string) => s),
  dim: jest.fn((s: string) => s),
  blue: jest.fn((s: string) => s),
  bold: jest.fn((s: string) => s),
}));

import {
  getThreadById,
  getThreadByName,
  getAllThreads,
  updateThread,
} from '@joshua2048/threads-storage';
import { archiveCommand } from '../src/commands/archive';

const mockGetThreadById = getThreadById as jest.MockedFunction<typeof getThreadById>;
const mockGetThreadByName = getThreadByName as jest.MockedFunction<typeof getThreadByName>;
const mockGetAllThreads = getAllThreads as jest.MockedFunction<typeof getAllThreads>;
const mockUpdateThread = updateThread as jest.MockedFunction<typeof updateThread>;

function createMockThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: 'test-id-123',
    name: 'Test Thread',
    description: 'Test description',
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

describe('archiveCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('archive_ThreadNotFound_LogsError', async () => {
    mockGetThreadById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetAllThreads.mockReturnValue([]);

    await archiveCommand.parseAsync(['node', 'test', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('archive_ThreadFound_ArchivesThread', async () => {
    const thread = createMockThread({ id: 'thread-1', status: 'active' });
    mockGetThreadById.mockReturnValue(thread);
    mockGetAllThreads.mockReturnValue([thread]);

    await archiveCommand.parseAsync(['node', 'test', 'thread-1']);

    expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', {
      status: 'archived',
      temperature: 'frozen',
    });
  });

  test('archive_WithRestore_RestoresArchivedThread', async () => {
    const thread = createMockThread({ id: 'thread-1', status: 'archived' });
    mockGetThreadById.mockReturnValue(thread);
    mockGetAllThreads.mockReturnValue([thread]);

    await archiveCommand.parseAsync(['node', 'test', 'thread-1', '--restore']);

    expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', {
      status: 'active',
      temperature: 'tepid',
    });
  });

  test('archive_WithChildren_ShowsWarningWithoutCascade', async () => {
    const parent = createMockThread({ id: 'parent-1' });
    const child = createMockThread({ id: 'child-1', parentId: 'parent-1' });
    mockGetThreadById.mockReturnValue(parent);
    mockGetAllThreads.mockReturnValue([parent, child]);

    await archiveCommand.parseAsync(['node', 'test', 'parent-1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('sub-thread'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('archive_WithCascade_ArchivesParentAndChildren', async () => {
    const parent = createMockThread({ id: 'parent-1', status: 'active' });
    const child = createMockThread({ id: 'child-1', parentId: 'parent-1', status: 'active' });
    mockGetThreadById.mockReturnValue(parent);
    mockGetAllThreads.mockReturnValue([parent, child]);

    await archiveCommand.parseAsync(['node', 'test', 'parent-1', '--cascade']);

    expect(mockUpdateThread).toHaveBeenCalledTimes(2);
  });

  test('archive_WithDryRun_DoesNotArchive', async () => {
    const parent = createMockThread({ id: 'parent-1' });
    const child = createMockThread({ id: 'child-1', parentId: 'parent-1' });
    mockGetThreadById.mockReturnValue(parent);
    mockGetAllThreads.mockReturnValue([parent, child]);

    await archiveCommand.parseAsync(['node', 'test', 'parent-1', '--cascade', '--dry-run']);

    expect(mockUpdateThread).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Dry run'));
  });

  test('archive_AlreadyArchived_ShowsNoActiveMessage', async () => {
    const thread = createMockThread({ id: 'thread-1', status: 'archived' });
    mockGetThreadById.mockReturnValue(thread);
    mockGetAllThreads.mockReturnValue([thread]);

    await archiveCommand.parseAsync(['node', 'test', 'thread-1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No active'));
  });

  test('restore_NotArchived_ShowsNoArchivedMessage', async () => {
    const thread = createMockThread({ id: 'thread-1', status: 'active' });
    mockGetThreadById.mockReturnValue(thread);
    mockGetAllThreads.mockReturnValue([thread]);

    await archiveCommand.parseAsync(['node', 'test', 'thread-1', '--restore']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No archived'));
  });

  test('archive_ByPartialId_FindsThread', async () => {
    const thread = createMockThread({ id: 'abc123def456' });
    mockGetThreadById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetAllThreads.mockReturnValue([thread]);

    await archiveCommand.parseAsync(['node', 'test', 'abc']);

    expect(mockUpdateThread).toHaveBeenCalled();
  });
});
