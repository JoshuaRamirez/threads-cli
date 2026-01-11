/**
 * Unit tests for storage/store.ts backup utilities.
 *
 * These tests mock the fs module to test:
 * - getBackupInfo behavior
 * - loadBackupData behavior
 * - restoreFromBackup behavior
 * - saveData creates backup before writing
 */

import * as path from 'path';
import * as os from 'os';
import { ThreadsData } from '../src/models/types';

// Calculate expected paths (matching store.ts logic)
const DATA_DIR = path.join(os.homedir(), '.threads');
const DATA_FILE = path.join(DATA_DIR, 'threads.json');
const BACKUP_FILE = path.join(DATA_DIR, 'threads.backup.json');

// Test fixture
function createMockThreadsData(overrides: Partial<ThreadsData> = {}): ThreadsData {
  return {
    threads: [],
    groups: [],
    version: '1.0.0',
    ...overrides,
  };
}

// Mock fs module - must be before any imports that use it
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  statSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  copyFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

// Import fs after mocking
import * as fs from 'fs';

const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
const mockStatSync = fs.statSync as jest.MockedFunction<typeof fs.statSync>;
const mockReadFileSync = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;
const mockWriteFileSync = fs.writeFileSync as jest.MockedFunction<typeof fs.writeFileSync>;
const mockCopyFileSync = fs.copyFileSync as jest.MockedFunction<typeof fs.copyFileSync>;
const mockMkdirSync = fs.mkdirSync as jest.MockedFunction<typeof fs.mkdirSync>;

// Import store functions after mocking fs
import {
  getBackupInfo,
  loadBackupData,
  restoreFromBackup,
  saveData,
  loadData,
  getBackupFilePath,
} from '../src/storage/store';

describe('Store_GetBackupInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Store_GetBackupInfo_ReturnsExistsFalseWhenBackupFileDoesNotExist', () => {
    // Arrange
    mockExistsSync.mockReturnValue(false);

    // Act
    const result = getBackupInfo();

    // Assert
    expect(result.exists).toBe(false);
  });

  test('Store_GetBackupInfo_ReturnsExistsTrueWhenBackupFileExists', () => {
    // Arrange
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ mtime: new Date('2024-01-15T10:00:00.000Z') } as fs.Stats);
    mockReadFileSync.mockReturnValue(JSON.stringify(createMockThreadsData()));

    // Act
    const result = getBackupInfo();

    // Assert
    expect(result.exists).toBe(true);
  });

  test('Store_GetBackupInfo_ReturnsCorrectTimestampFromFileStat', () => {
    // Arrange
    const expectedDate = new Date('2024-01-15T10:00:00.000Z');
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ mtime: expectedDate } as fs.Stats);
    mockReadFileSync.mockReturnValue(JSON.stringify(createMockThreadsData()));

    // Act
    const result = getBackupInfo();

    // Assert
    expect(result.timestamp).toEqual(expectedDate);
  });

  test('Store_GetBackupInfo_ReturnsCorrectThreadCount', () => {
    // Arrange
    const dataWithThreads = createMockThreadsData({
      threads: [
        { id: '1', name: 'Thread 1' } as any,
        { id: '2', name: 'Thread 2' } as any,
        { id: '3', name: 'Thread 3' } as any,
      ],
    });
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ mtime: new Date() } as fs.Stats);
    mockReadFileSync.mockReturnValue(JSON.stringify(dataWithThreads));

    // Act
    const result = getBackupInfo();

    // Assert
    expect(result.threadCount).toBe(3);
  });

  test('Store_GetBackupInfo_ReturnsCorrectGroupCount', () => {
    // Arrange
    const dataWithGroups = createMockThreadsData({
      groups: [
        { id: '1', name: 'Group 1' } as any,
        { id: '2', name: 'Group 2' } as any,
      ],
    });
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ mtime: new Date() } as fs.Stats);
    mockReadFileSync.mockReturnValue(JSON.stringify(dataWithGroups));

    // Act
    const result = getBackupInfo();

    // Assert
    expect(result.groupCount).toBe(2);
  });

  test('Store_GetBackupInfo_ChecksBackupFilePath', () => {
    // Arrange
    mockExistsSync.mockReturnValue(false);

    // Act
    getBackupInfo();

    // Assert
    expect(mockExistsSync).toHaveBeenCalledWith(expect.stringContaining('threads.backup.json'));
  });
});

describe('Store_LoadBackupData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Store_LoadBackupData_ReturnsUndefinedWhenBackupDoesNotExist', () => {
    // Arrange
    mockExistsSync.mockReturnValue(false);

    // Act
    const result = loadBackupData();

    // Assert
    expect(result).toBeUndefined();
  });

  test('Store_LoadBackupData_ReturnsThreadsDataWhenBackupExists', () => {
    // Arrange
    const expectedData = createMockThreadsData({ version: '2.0.0' });
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(expectedData));

    // Act
    const result = loadBackupData();

    // Assert
    expect(result).toEqual(expectedData);
  });

  test('Store_LoadBackupData_ReadsFromBackupFilePath', () => {
    // Arrange
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(createMockThreadsData()));

    // Act
    loadBackupData();

    // Assert
    expect(mockReadFileSync).toHaveBeenCalledWith(
      expect.stringContaining('threads.backup.json'),
      'utf-8'
    );
  });
});

describe('Store_RestoreFromBackup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Store_RestoreFromBackup_ReturnsFalseWhenBackupDoesNotExist', () => {
    // Arrange
    mockExistsSync.mockImplementation((p) => {
      const pathStr = String(p);
      if (pathStr.includes('backup')) return false;
      return true;
    });

    // Act
    const result = restoreFromBackup();

    // Assert
    expect(result).toBe(false);
  });

  test('Store_RestoreFromBackup_ReturnsTrueWhenSuccessful', () => {
    // Arrange
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation((p) => {
      const pathStr = String(p);
      if (pathStr.includes('backup')) return JSON.stringify({ backup: true });
      return JSON.stringify({ current: true });
    });

    // Act
    const result = restoreFromBackup();

    // Assert
    expect(result).toBe(true);
  });

  test('Store_RestoreFromBackup_WritesBackupDataToDataFile', () => {
    // Arrange
    const backupContent = JSON.stringify({ backup: true });
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation((p) => {
      const pathStr = String(p);
      if (pathStr.includes('backup')) return backupContent;
      return JSON.stringify({ current: true });
    });

    // Act
    restoreFromBackup();

    // Assert
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining('threads.json'),
      backupContent
    );
  });

  test('Store_RestoreFromBackup_WritesCurrentDataToBackupFile', () => {
    // Arrange
    const currentContent = JSON.stringify({ current: true });
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation((p) => {
      const pathStr = String(p);
      if (pathStr.includes('backup')) return JSON.stringify({ backup: true });
      return currentContent;
    });

    // Act
    restoreFromBackup();

    // Assert
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining('backup'),
      currentContent
    );
  });

  test('Store_RestoreFromBackup_CallsWriteFileSyncTwiceForSwap', () => {
    // Arrange
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation((p) => {
      const pathStr = String(p);
      if (pathStr.includes('backup')) return JSON.stringify({ backup: true });
      return JSON.stringify({ current: true });
    });

    // Act
    restoreFromBackup();

    // Assert
    expect(mockWriteFileSync).toHaveBeenCalledTimes(2);
  });
});

describe('Store_SaveData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Store_SaveData_CallsCopyFileSyncBeforeWriteFileSync', () => {
    // Arrange
    const callOrder: string[] = [];
    mockExistsSync.mockReturnValue(true);
    mockCopyFileSync.mockImplementation(() => {
      callOrder.push('copyFileSync');
    });
    mockWriteFileSync.mockImplementation(() => {
      callOrder.push('writeFileSync');
    });

    // Act
    saveData(createMockThreadsData());

    // Assert
    expect(callOrder.indexOf('copyFileSync')).toBeLessThan(callOrder.indexOf('writeFileSync'));
  });

  test('Store_SaveData_CreatesBackupFromDataFile', () => {
    // Arrange
    mockExistsSync.mockReturnValue(true);

    // Act
    saveData(createMockThreadsData());

    // Assert
    expect(mockCopyFileSync).toHaveBeenCalledWith(
      expect.stringContaining('threads.json'),
      expect.stringContaining('threads.backup.json')
    );
  });

  test('Store_SaveData_WritesDataToDataFile', () => {
    // Arrange
    const dataToSave = createMockThreadsData({ version: '3.0.0' });
    mockExistsSync.mockReturnValue(true);

    // Act
    saveData(dataToSave);

    // Assert
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining('threads.json'),
      JSON.stringify(dataToSave, null, 2)
    );
  });

  test('Store_SaveData_SkipsBackupWhenDataFileDoesNotExist', () => {
    // Arrange
    mockExistsSync.mockImplementation((p) => {
      const pathStr = String(p);
      // Data dir exists, data file does not (for createBackup check)
      if (pathStr.endsWith('.threads')) return true;
      if (pathStr.includes('threads.json') && !pathStr.includes('backup')) return false;
      return false;
    });

    // Act
    saveData(createMockThreadsData());

    // Assert
    expect(mockCopyFileSync).not.toHaveBeenCalled();
  });
});

describe('Store_GetBackupFilePath', () => {
  test('Store_GetBackupFilePath_ReturnsPathContainingBackupFilename', () => {
    // Arrange - no setup needed

    // Act
    const result = getBackupFilePath();

    // Assert
    expect(result).toContain('threads.backup.json');
  });

  test('Store_GetBackupFilePath_ReturnsPathInThreadsDirectory', () => {
    // Arrange - no setup needed

    // Act
    const result = getBackupFilePath();

    // Assert
    expect(result).toContain('.threads');
  });
});

describe('Store_LoadData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Store_LoadData_CreatesDataDirectoryWhenMissing', () => {
    // Arrange
    mockExistsSync.mockImplementation((p) => {
      const pathStr = String(p);
      if (pathStr.endsWith('.threads')) return false;
      if (pathStr.includes('threads.json')) return true; // After creation
      return false;
    });
    mockReadFileSync.mockReturnValue(JSON.stringify(createMockThreadsData()));

    // Act
    loadData();

    // Assert
    expect(mockMkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('.threads'),
      { recursive: true }
    );
  });

  test('Store_LoadData_CreatesInitialDataFileWhenMissing', () => {
    // Arrange
    let fileCreated = false;
    mockExistsSync.mockImplementation((p) => {
      const pathStr = String(p);
      if (pathStr.endsWith('.threads')) return true;
      if (pathStr.includes('threads.json')) return fileCreated;
      return false;
    });
    mockWriteFileSync.mockImplementation(() => {
      fileCreated = true;
    });
    mockReadFileSync.mockReturnValue(JSON.stringify(createMockThreadsData()));

    // Act
    loadData();

    // Assert
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining('threads.json'),
      expect.any(String)
    );
  });

  test('Store_LoadData_ReturnsExistingData', () => {
    // Arrange
    const existingData = createMockThreadsData({ version: '5.0.0' });
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(existingData));

    // Act
    const result = loadData();

    // Assert
    expect(result).toEqual(existingData);
  });

  test('Store_LoadData_ReadsFromDataFilePath', () => {
    // Arrange
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(createMockThreadsData()));

    // Act
    loadData();

    // Assert
    expect(mockReadFileSync).toHaveBeenCalledWith(
      expect.stringContaining('threads.json'),
      'utf-8'
    );
  });
});
