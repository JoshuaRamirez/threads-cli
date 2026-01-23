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
import { ThreadsData, Thread, Group } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, MockStorageService } from './helpers/mockStorage';

// Create mock storage instance
let mockStorage: MockStorageService;

// Mock context module to return our mock storage
jest.mock('../src/context', () => ({
  getStorage: jest.fn(() => mockStorage),
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

// Test fixtures
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
    mockStorage = createMockStorageService();
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
      mockStorage.getBackupInfo.mockReturnValue({ exists: false });

      // Act
      await runCommand(['--list']);

      // Assert
      expect(capturedOutput.some(line => line.includes('No backup exists yet'))).toBe(true);
    });

    test('UndoCommand_ListOption_DisplaysBackupPathWhenBackupExists', async () => {
      // Arrange
      const backupPath = '/home/user/.threads/threads.backup.json';
      mockStorage.getBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date('2024-01-15T10:30:00.000Z'),
        threadCount: 5,
        groupCount: 2,
      });
      mockStorage.getBackupFilePath.mockReturnValue(backupPath);

      // Act
      await runCommand(['--list']);

      // Assert
      expect(capturedOutput.some(line => line.includes(backupPath))).toBe(true);
    });

    test('UndoCommand_ListOption_DisplaysThreadCountWhenBackupExists', async () => {
      // Arrange
      mockStorage.getBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date('2024-01-15T10:30:00.000Z'),
        threadCount: 5,
        groupCount: 2,
      });
      mockStorage.getBackupFilePath.mockReturnValue('/path/to/backup');

      // Act
      await runCommand(['--list']);

      // Assert
      expect(capturedOutput.some(line => line.includes('Threads:') && line.includes('5'))).toBe(true);
    });

    test('UndoCommand_ListOption_DisplaysGroupCountWhenBackupExists', async () => {
      // Arrange
      mockStorage.getBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date('2024-01-15T10:30:00.000Z'),
        threadCount: 5,
        groupCount: 2,
      });
      mockStorage.getBackupFilePath.mockReturnValue('/path/to/backup');

      // Act
      await runCommand(['--list']);

      // Assert
      expect(capturedOutput.some(line => line.includes('Groups:') && line.includes('2'))).toBe(true);
    });

    test('UndoCommand_ListOption_DoesNotCallRestoreFromBackup', async () => {
      // Arrange
      mockStorage.getBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 1,
        groupCount: 0,
      });
      mockStorage.getBackupFilePath.mockReturnValue('/path/to/backup');

      // Act
      await runCommand(['--list']);

      // Assert
      expect(mockStorage.restoreFromBackup).not.toHaveBeenCalled();
    });
  });

  describe('--dry-run option', () => {
    test('UndoCommand_DryRunOption_DisplaysNoBackupMessageWhenBackupDoesNotExist', async () => {
      // Arrange
      mockStorage.getBackupInfo.mockReturnValue({ exists: false });

      // Act
      await runCommand(['--dry-run']);

      // Assert
      expect(capturedOutput.some(line => line.includes('No backup available'))).toBe(true);
    });

    test('UndoCommand_DryRunOption_DisplaysFailedToLoadMessageWhenBackupDataIsNull', async () => {
      // Arrange
      mockStorage.getBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 0,
        groupCount: 0,
      });
      mockStorage.loadBackupData.mockReturnValue(undefined);

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
      mockStorage.getBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 1,
        groupCount: 0,
      });
      mockStorage.loadBackupData.mockReturnValue(backupData);
      mockStorage.getAllThreads.mockReturnValue(currentData.threads);

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
      mockStorage.getBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 0,
        groupCount: 0,
      });
      mockStorage.loadBackupData.mockReturnValue(backupData);
      mockStorage.getAllThreads.mockReturnValue(currentData.threads);
      mockStorage.getAllGroups.mockReturnValue([]);

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
      mockStorage.getBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 1,
        groupCount: 0,
      });
      mockStorage.loadBackupData.mockReturnValue(backupData);
      mockStorage.getAllThreads.mockReturnValue(currentData.threads);
      mockStorage.getAllGroups.mockReturnValue([]);

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
      mockStorage.getBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 1,
        groupCount: 0,
      });
      mockStorage.loadBackupData.mockReturnValue(backupData);
      mockStorage.getAllThreads.mockReturnValue(currentData.threads);
      mockStorage.getAllGroups.mockReturnValue([]);

      // Act
      await runCommand(['--dry-run']);

      // Assert
      expect(capturedOutput.some(line => line.includes('Revert:') && line.includes('Modified Thread'))).toBe(true);
    });

    test('UndoCommand_DryRunOption_DoesNotCallRestoreFromBackup', async () => {
      // Arrange
      mockStorage.getBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 0,
        groupCount: 0,
      });
      mockStorage.loadBackupData.mockReturnValue(createMockThreadsData());
      mockStorage.getAllThreads.mockReturnValue([]);
      mockStorage.getAllGroups.mockReturnValue([]);

      // Act
      await runCommand(['--dry-run']);

      // Assert
      expect(mockStorage.restoreFromBackup).not.toHaveBeenCalled();
    });

    test('UndoCommand_DryRunOption_DisplaysInstructionToApply', async () => {
      // Arrange
      mockStorage.getBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 0,
        groupCount: 0,
      });
      mockStorage.loadBackupData.mockReturnValue(createMockThreadsData());
      mockStorage.getAllThreads.mockReturnValue([]);
      mockStorage.getAllGroups.mockReturnValue([]);

      // Act
      await runCommand(['--dry-run']);

      // Assert
      expect(capturedOutput.some(line => line.includes('without --dry-run to apply'))).toBe(true);
    });
  });

  describe('restore operation (no flags)', () => {
    test('UndoCommand_Restore_DisplaysNoBackupMessageWhenBackupDoesNotExist', async () => {
      // Arrange
      mockStorage.getBackupInfo.mockReturnValue({ exists: false });

      // Act
      await runCommand([]);

      // Assert
      expect(capturedOutput.some(line => line.includes('No backup available'))).toBe(true);
    });

    test('UndoCommand_Restore_DisplaysFailedMessageWhenLoadBackupReturnsUndefined', async () => {
      // Arrange
      mockStorage.getBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 0,
        groupCount: 0,
      });
      mockStorage.loadBackupData.mockReturnValue(undefined);

      // Act
      await runCommand([]);

      // Assert
      expect(capturedOutput.some(line => line.includes('Failed to load backup data'))).toBe(true);
    });

    test('UndoCommand_Restore_CallsRestoreFromBackupOnce', async () => {
      // Arrange
      mockStorage.getBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 1,
        groupCount: 0,
      });
      mockStorage.loadBackupData.mockReturnValue(createMockThreadsData());
      mockStorage.getAllThreads.mockReturnValue([]);
      mockStorage.getAllGroups.mockReturnValue([]);
      mockStorage.restoreFromBackup.mockReturnValue(true);

      // Act
      await runCommand([]);

      // Assert
      expect(mockStorage.restoreFromBackup).toHaveBeenCalledTimes(1);
    });

    test('UndoCommand_Restore_DisplaysSuccessMessageWhenRestoreSucceeds', async () => {
      // Arrange
      mockStorage.getBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 1,
        groupCount: 0,
      });
      mockStorage.loadBackupData.mockReturnValue(createMockThreadsData());
      mockStorage.getAllThreads.mockReturnValue([]);
      mockStorage.getAllGroups.mockReturnValue([]);
      mockStorage.restoreFromBackup.mockReturnValue(true);

      // Act
      await runCommand([]);

      // Assert
      expect(capturedOutput.some(line => line.includes('Restored from backup'))).toBe(true);
    });

    test('UndoCommand_Restore_DisplaysRedoHintAfterSuccess', async () => {
      // Arrange
      mockStorage.getBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 1,
        groupCount: 0,
      });
      mockStorage.loadBackupData.mockReturnValue(createMockThreadsData());
      mockStorage.getAllThreads.mockReturnValue([]);
      mockStorage.getAllGroups.mockReturnValue([]);
      mockStorage.restoreFromBackup.mockReturnValue(true);

      // Act
      await runCommand([]);

      // Assert
      expect(capturedOutput.some(line => line.includes('undo') && line.includes('redo'))).toBe(true);
    });

    test('UndoCommand_Restore_DisplaysFailedMessageWhenRestoreFails', async () => {
      // Arrange
      mockStorage.getBackupInfo.mockReturnValue({
        exists: true,
        timestamp: new Date(),
        threadCount: 1,
        groupCount: 0,
      });
      mockStorage.loadBackupData.mockReturnValue(createMockThreadsData());
      mockStorage.getAllThreads.mockReturnValue([]);
      mockStorage.getAllGroups.mockReturnValue([]);
      mockStorage.restoreFromBackup.mockReturnValue(false);

      // Act
      await runCommand([]);

      // Assert
      expect(capturedOutput.some(line => line.includes('Failed to restore'))).toBe(true);
    });
  });
});
