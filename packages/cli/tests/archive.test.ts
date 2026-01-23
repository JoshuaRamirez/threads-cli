/**
 * Unit tests for commands/archive.ts
 */

import { Thread } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, MockStorageService } from './helpers/mockStorage';

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
  gray: jest.fn((s: string) => s),
  dim: jest.fn((s: string) => s),
  blue: jest.fn((s: string) => s),
  bold: jest.fn((s: string) => s),
}));

import { archiveCommand } from '../src/commands/archive';

describe('archiveCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('archive_ThreadNotFound_LogsError', async () => {
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([]);

    await archiveCommand.parseAsync(['node', 'test', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('archive_ThreadFound_ArchivesThread', async () => {
    const thread = createMockThread({ id: 'thread-1', status: 'active' });
    mockStorage.getThreadById.mockReturnValue(thread);
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await archiveCommand.parseAsync(['node', 'test', 'thread-1']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('thread-1', {
      status: 'archived',
      temperature: 'frozen',
    });
  });

  test('archive_WithRestore_RestoresArchivedThread', async () => {
    const thread = createMockThread({ id: 'thread-1', status: 'archived' });
    mockStorage.getThreadById.mockReturnValue(thread);
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await archiveCommand.parseAsync(['node', 'test', 'thread-1', '--restore']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('thread-1', {
      status: 'active',
      temperature: 'tepid',
    });
  });

  test('archive_WithChildren_ShowsWarningWithoutCascade', async () => {
    const parent = createMockThread({ id: 'parent-1' });
    const child = createMockThread({ id: 'child-1', parentId: 'parent-1' });
    mockStorage.getThreadById.mockReturnValue(parent);
    mockStorage.getAllThreads.mockReturnValue([parent, child]);

    await archiveCommand.parseAsync(['node', 'test', 'parent-1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('sub-thread'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('archive_WithCascade_ArchivesParentAndChildren', async () => {
    const parent = createMockThread({ id: 'parent-1', status: 'active' });
    const child = createMockThread({ id: 'child-1', parentId: 'parent-1', status: 'active' });
    mockStorage.getThreadById.mockReturnValue(parent);
    mockStorage.getAllThreads.mockReturnValue([parent, child]);

    await archiveCommand.parseAsync(['node', 'test', 'parent-1', '--cascade']);

    expect(mockStorage.updateThread).toHaveBeenCalledTimes(2);
  });

  test('archive_WithDryRun_DoesNotArchive', async () => {
    const parent = createMockThread({ id: 'parent-1' });
    const child = createMockThread({ id: 'child-1', parentId: 'parent-1' });
    mockStorage.getThreadById.mockReturnValue(parent);
    mockStorage.getAllThreads.mockReturnValue([parent, child]);

    await archiveCommand.parseAsync(['node', 'test', 'parent-1', '--cascade', '--dry-run']);

    expect(mockStorage.updateThread).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Dry run'));
  });

  test('archive_AlreadyArchived_ShowsNoActiveMessage', async () => {
    const thread = createMockThread({ id: 'thread-1', status: 'archived' });
    mockStorage.getThreadById.mockReturnValue(thread);
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await archiveCommand.parseAsync(['node', 'test', 'thread-1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No active'));
  });

  test('restore_NotArchived_ShowsNoArchivedMessage', async () => {
    const thread = createMockThread({ id: 'thread-1', status: 'active' });
    mockStorage.getThreadById.mockReturnValue(thread);
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await archiveCommand.parseAsync(['node', 'test', 'thread-1', '--restore']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No archived'));
  });

  test('archive_ByPartialId_FindsThread', async () => {
    const thread = createMockThread({ id: 'abc123def456' });
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await archiveCommand.parseAsync(['node', 'test', 'abc']);

    expect(mockStorage.updateThread).toHaveBeenCalled();
  });
});
