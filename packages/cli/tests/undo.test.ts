/**
 * Unit tests for the undo command and backup utilities.
 *
 * Structure:
 * - UndoCommand tests: command behavior with mocked storage
 * - BackupInfo tests: getBackupInfo utility
 * - RestoreFromBackup tests: restoreFromBackup utility
 * - SaveData tests: backup creation during save
 */

import { Command } from 'commander';
import { ThreadsData, Thread, Group } from '@joshua2048/threads-core';

// Mock the storage module before importing the command
jest.mock('@joshua2048/threads-storage', () => ({
  loadData: jest.fn(),
  loadBackupData: jest.fn(),
  getBackupInfo: jest.fn(),
  restoreFromBackup: jest.fn(),
  getBackupFilePath: jest.fn(),
}));

// Mock chalk to capture raw output
jest.mock('chalk', () => ({
  default: {
    bold: (s: string) => s,
    red: (s: string) => s,
    green: (s: string) => s,
    yellow: (s: string) => s,
    dim: (s: string) => s,
  },
  bold: (s: string) => s,
  red: (s: string) => s,
  green: (s: string) => s,
  yellow: (s: string) => s,
  dim: (s: string) => s,
}));

import { undoCommand } from '../src/commands/undo';
import {
  loadData,
  loadBackupData,
  getBackupInfo,
  restoreFromBackup,
  getBackupFilePath,
} from '@joshua2048/threads-storage';

// Type the mocks
const mockLoadData = loadData as jest.MockedFunction<typeof loadData>;
const mockLoadBackupData = loadBackupData as jest.MockedFunction<typeof loadBackupData>;
const mockGetBackupInfo = getBackupInfo as jest.MockedFunction<typeof getBackupInfo>;
const mockRestoreFromBackup = restoreFromBackup as jest.MockedFunction<typeof restoreFromBackup>;
const mockGetBackupFilePath = getBackupFilePath as jest.MockedFunction<typeof getBackupFilePath>;

// Test fixtures
function createMockThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: 'thread-1',
    name: 'Test Thread',
    description: 'A test thread',
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

function createMockThreadsData(overrides: Partial<ThreadsData> = {}): ThreadsData {
  return {
    threads: [],
    containers: [],
    groups: [],
    version: '1.0.0',
    ...overrides,
  };
}

describe('UndoCommand', () => {
  let consoleLogSpy: jest.SpyInstance;
  let capturedOutput: string[];

  beforeEach(() => {
    jest.clearAllMocks();
    capturedOutput = [];
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation((...args) => {
      capturedOutput.push(args.join(' '));
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  // Helper to run command with options
  async function runCommand(options: string[] = []): Promise<void> {
    const program = new Command();
    program.addCommand(undoCommand);
    await program.parseAsync(['node', 'test', 'undo', ...options]);
  }

  describe('--list option', () => {
    test('UndoCommand_ListOption_DisplaysNoBackupMessageWhenBackupDoesNotExist', async () => {
      // Arrange
      mockGetBackupInfo.mockReturnValue({ exists: false });

      // Act
      await runCommand(['--list']);

      // Assert
      expect(capturedOutput.some(line => line.includes('No backup exists yet'))).toBe(true);
    });

    test('UndoCommand_ListOption_DisplaysBackupPathWhenBackupExists', async () => {
      // Arrange
      const backupPath = '/home/user/.threads/threads.backup.json';
      mockGetBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date('2024-01-15T10:30:00.000Z'),
        threadCount: 5,
        groupCount: 2,
      });
      mockGetBackupFilePath.mockReturnValue(backupPath);

      // Act
      await runCommand(['--list']);

      // Assert
      expect(capturedOutput.some(line => line.includes(backupPath))).toBe(true);
    });

    test('UndoCommand_ListOption_DisplaysThreadCountWhenBackupExists', async () => {
      // Arrange
      mockGetBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date('2024-01-15T10:30:00.000Z'),
        threadCount: 5,
        groupCount: 2,
      });
      mockGetBackupFilePath.mockReturnValue('/path/to/backup');

      // Act
      await runCommand(['--list']);

      // Assert
      expect(capturedOutput.some(line => line.includes('Threads:') && line.includes('5'))).toBe(true);
    });

    test('UndoCommand_ListOption_DisplaysGroupCountWhenBackupExists', async () => {
      // Arrange
      mockGetBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date('2024-01-15T10:30:00.000Z'),
        threadCount: 5,
        groupCount: 2,
      });
      mockGetBackupFilePath.mockReturnValue('/path/to/backup');

      // Act
      await runCommand(['--list']);

      // Assert
      expect(capturedOutput.some(line => line.includes('Groups:') && line.includes('2'))).toBe(true);
    });

    test('UndoCommand_ListOption_DoesNotCallRestoreFromBackup', async () => {
      // Arrange
      mockGetBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 1,
        groupCount: 0,
      });
      mockGetBackupFilePath.mockReturnValue('/path/to/backup');

      // Act
      await runCommand(['--list']);

      // Assert
      expect(mockRestoreFromBackup).not.toHaveBeenCalled();
    });
  });

  describe('--dry-run option', () => {
    test('UndoCommand_DryRunOption_DisplaysNoBackupMessageWhenBackupDoesNotExist', async () => {
      // Arrange
      mockGetBackupInfo.mockReturnValue({ exists: false });

      // Act
      await runCommand(['--dry-run']);

      // Assert
      expect(capturedOutput.some(line => line.includes('No backup available'))).toBe(true);
    });

    test('UndoCommand_DryRunOption_DisplaysFailedToLoadMessageWhenBackupDataIsNull', async () => {
      // Arrange
      mockGetBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 0,
        groupCount: 0,
      });
      mockLoadBackupData.mockReturnValue(undefined);

      // Act
      await runCommand(['--dry-run']);

      // Assert
      expect(capturedOutput.some(line => line.includes('Failed to load backup data'))).toBe(true);
    });

    test('UndoCommand_DryRunOption_DisplaysCurrentThreadCount', async () => {
      // Arrange
      const currentData = createMockThreadsData({
        threads: [createMockThread({ id: '1' }), createMockThread({ id: '2' })],
      });
      const backupData = createMockThreadsData({
        threads: [createMockThread({ id: '1' })],
      });
      mockGetBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 1,
        groupCount: 0,
      });
      mockLoadBackupData.mockReturnValue(backupData);
      mockLoadData.mockReturnValue(currentData);

      // Act
      await runCommand(['--dry-run']);

      // Assert
      expect(capturedOutput.some(line => line.includes('Current state') || (line.includes('Threads:') && line.includes('2')))).toBe(true);
    });

    test('UndoCommand_DryRunOption_DisplaysThreadsToBeRemoved', async () => {
      // Arrange
      const addedThread = createMockThread({ id: 'new-thread', name: 'New Thread' });
      const currentData = createMockThreadsData({
        threads: [addedThread],
      });
      const backupData = createMockThreadsData({
        threads: [],
      });
      mockGetBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 0,
        groupCount: 0,
      });
      mockLoadBackupData.mockReturnValue(backupData);
      mockLoadData.mockReturnValue(currentData);

      // Act
      await runCommand(['--dry-run']);

      // Assert
      expect(capturedOutput.some(line => line.includes('Remove:') && line.includes('New Thread'))).toBe(true);
    });

    test('UndoCommand_DryRunOption_DisplaysThreadsToBeRestored', async () => {
      // Arrange
      const deletedThread = createMockThread({ id: 'deleted-thread', name: 'Deleted Thread' });
      const currentData = createMockThreadsData({
        threads: [],
      });
      const backupData = createMockThreadsData({
        threads: [deletedThread],
      });
      mockGetBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 1,
        groupCount: 0,
      });
      mockLoadBackupData.mockReturnValue(backupData);
      mockLoadData.mockReturnValue(currentData);

      // Act
      await runCommand(['--dry-run']);

      // Assert
      expect(capturedOutput.some(line => line.includes('Restore:') && line.includes('Deleted Thread'))).toBe(true);
    });

    test('UndoCommand_DryRunOption_DisplaysModifiedThreads', async () => {
      // Arrange
      const currentThread = createMockThread({
        id: 'mod-thread',
        name: 'Modified Thread',
        updatedAt: '2024-01-02T00:00:00.000Z',
      });
      const backupThread = createMockThread({
        id: 'mod-thread',
        name: 'Modified Thread',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      const currentData = createMockThreadsData({
        threads: [currentThread],
      });
      const backupData = createMockThreadsData({
        threads: [backupThread],
      });
      mockGetBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 1,
        groupCount: 0,
      });
      mockLoadBackupData.mockReturnValue(backupData);
      mockLoadData.mockReturnValue(currentData);

      // Act
      await runCommand(['--dry-run']);

      // Assert
      expect(capturedOutput.some(line => line.includes('Revert:') && line.includes('Modified Thread'))).toBe(true);
    });

    test('UndoCommand_DryRunOption_DoesNotCallRestoreFromBackup', async () => {
      // Arrange
      mockGetBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 0,
        groupCount: 0,
      });
      mockLoadBackupData.mockReturnValue(createMockThreadsData());
      mockLoadData.mockReturnValue(createMockThreadsData());

      // Act
      await runCommand(['--dry-run']);

      // Assert
      expect(mockRestoreFromBackup).not.toHaveBeenCalled();
    });

    test('UndoCommand_DryRunOption_DisplaysInstructionToApply', async () => {
      // Arrange
      mockGetBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 0,
        groupCount: 0,
      });
      mockLoadBackupData.mockReturnValue(createMockThreadsData());
      mockLoadData.mockReturnValue(createMockThreadsData());

      // Act
      await runCommand(['--dry-run']);

      // Assert
      expect(capturedOutput.some(line => line.includes('without --dry-run to apply'))).toBe(true);
    });
  });

  describe('restore operation (no flags)', () => {
    test('UndoCommand_Restore_DisplaysNoBackupMessageWhenBackupDoesNotExist', async () => {
      // Arrange
      mockGetBackupInfo.mockReturnValue({ exists: false });

      // Act
      await runCommand([]);

      // Assert
      expect(capturedOutput.some(line => line.includes('No backup available'))).toBe(true);
    });

    test('UndoCommand_Restore_DisplaysFailedMessageWhenLoadBackupReturnsUndefined', async () => {
      // Arrange
      mockGetBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 0,
        groupCount: 0,
      });
      mockLoadBackupData.mockReturnValue(undefined);

      // Act
      await runCommand([]);

      // Assert
      expect(capturedOutput.some(line => line.includes('Failed to load backup data'))).toBe(true);
    });

    test('UndoCommand_Restore_CallsRestoreFromBackupOnce', async () => {
      // Arrange
      mockGetBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 1,
        groupCount: 0,
      });
      mockLoadBackupData.mockReturnValue(createMockThreadsData());
      mockLoadData.mockReturnValue(createMockThreadsData());
      mockRestoreFromBackup.mockReturnValue(true);

      // Act
      await runCommand([]);

      // Assert
      expect(mockRestoreFromBackup).toHaveBeenCalledTimes(1);
    });

    test('UndoCommand_Restore_DisplaysSuccessMessageWhenRestoreSucceeds', async () => {
      // Arrange
      mockGetBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 1,
        groupCount: 0,
      });
      mockLoadBackupData.mockReturnValue(createMockThreadsData());
      mockLoadData.mockReturnValue(createMockThreadsData());
      mockRestoreFromBackup.mockReturnValue(true);

      // Act
      await runCommand([]);

      // Assert
      expect(capturedOutput.some(line => line.includes('Restored from backup'))).toBe(true);
    });

    test('UndoCommand_Restore_DisplaysRedoHintAfterSuccess', async () => {
      // Arrange
      mockGetBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 1,
        groupCount: 0,
      });
      mockLoadBackupData.mockReturnValue(createMockThreadsData());
      mockLoadData.mockReturnValue(createMockThreadsData());
      mockRestoreFromBackup.mockReturnValue(true);

      // Act
      await runCommand([]);

      // Assert
      expect(capturedOutput.some(line => line.includes('undo') && line.includes('redo'))).toBe(true);
    });

    test('UndoCommand_Restore_DisplaysFailedMessageWhenRestoreFails', async () => {
      // Arrange
      mockGetBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 1,
        groupCount: 0,
      });
      mockLoadBackupData.mockReturnValue(createMockThreadsData());
      mockLoadData.mockReturnValue(createMockThreadsData());
      mockRestoreFromBackup.mockReturnValue(false);

      // Act
      await runCommand([]);

      // Assert
      expect(capturedOutput.some(line => line.includes('Failed to restore'))).toBe(true);
    });
  });
});
