/**
 * Unit tests for the merge command.
 *
 * Structure:
 * - mergeProgress tests: combining and sorting progress entries
 * - mergeDetails tests: combining and sorting details entries
 * - mergeTags tests: union without duplicates
 * - mergeDependencies tests: union by threadId with target precedence
 * - findThread tests: thread lookup behavior
 * - mergeCommand tests: full command behavior with options
 */

import { Thread, ThreadsData, ProgressEntry, DetailsEntry, Dependency } from '@redjay/threads-core';
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
    gray: (s: string) => s,
    cyan: (s: string) => s,
    white: (s: string) => s,
  },
  bold: (s: string) => s,
  red: (s: string) => s,
  green: (s: string) => s,
  yellow: (s: string) => s,
  gray: (s: string) => s,
  cyan: (s: string) => s,
  white: (s: string) => s,
}));

import {
  mergeProgress,
  mergeDetails,
  mergeTags,
  mergeDependencies,
  findThread,
  mergeCommand,
} from '../src/commands/merge';

// Test fixtures
function createMockProgressEntry(overrides: Partial<ProgressEntry> = {}): ProgressEntry {
  return {
    id: 'progress-1',
    timestamp: '2024-01-01T00:00:00.000Z',
    note: 'Test progress',
    ...overrides,
  };
}

function createMockDetailsEntry(overrides: Partial<DetailsEntry> = {}): DetailsEntry {
  return {
    id: 'details-1',
    timestamp: '2024-01-01T00:00:00.000Z',
    content: 'Test details',
    ...overrides,
  };
}

function createMockDependency(overrides: Partial<Dependency> = {}): Dependency {
  return {
    threadId: 'dep-thread-1',
    why: 'Test why',
    what: 'Test what',
    how: 'Test how',
    when: 'Test when',
    ...overrides,
  };
}

// ============================================================================
// mergeProgress tests
// ============================================================================

describe('mergeProgress', () => {
  describe('mergeProgress_EmptyArrays_ReturnsEmptyArray', () => {
    it('should return empty array', () => {
      // Arrange
      const target: ProgressEntry[] = [];
      const source: ProgressEntry[] = [];

      // Act
      const result = mergeProgress(target, source);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('mergeProgress_TargetOnlyHasEntries_ReturnsTargetEntries', () => {
    it('should return target entries unchanged', () => {
      // Arrange
      const targetEntry = createMockProgressEntry({ id: 'p1', timestamp: '2024-01-01T00:00:00.000Z' });
      const target: ProgressEntry[] = [targetEntry];
      const source: ProgressEntry[] = [];

      // Act
      const result = mergeProgress(target, source);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('mergeProgress_SourceOnlyHasEntries_ReturnsSourceEntries', () => {
    it('should return source entries', () => {
      // Arrange
      const target: ProgressEntry[] = [];
      const sourceEntry = createMockProgressEntry({ id: 'p2', timestamp: '2024-01-02T00:00:00.000Z' });
      const source: ProgressEntry[] = [sourceEntry];

      // Act
      const result = mergeProgress(target, source);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('mergeProgress_BothHaveEntries_ReturnsCombinedCount', () => {
    it('should return combined length', () => {
      // Arrange
      const targetEntry = createMockProgressEntry({ id: 'p1', timestamp: '2024-01-01T00:00:00.000Z' });
      const sourceEntry = createMockProgressEntry({ id: 'p2', timestamp: '2024-01-02T00:00:00.000Z' });
      const target: ProgressEntry[] = [targetEntry];
      const source: ProgressEntry[] = [sourceEntry];

      // Act
      const result = mergeProgress(target, source);

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe('mergeProgress_BothHaveEntries_SortsByTimestampAscending', () => {
    it('should sort entries by timestamp ascending', () => {
      // Arrange
      const laterEntry = createMockProgressEntry({ id: 'p1', timestamp: '2024-01-03T00:00:00.000Z' });
      const earlierEntry = createMockProgressEntry({ id: 'p2', timestamp: '2024-01-01T00:00:00.000Z' });
      const target: ProgressEntry[] = [laterEntry];
      const source: ProgressEntry[] = [earlierEntry];

      // Act
      const result = mergeProgress(target, source);

      // Assert
      expect(result[0].id).toBe('p2');
    });
  });

  describe('mergeProgress_MultipleEntriesInterleavedTimestamps_SortsCorrectly', () => {
    it('should interleave entries by timestamp', () => {
      // Arrange
      const t1 = createMockProgressEntry({ id: 't1', timestamp: '2024-01-01T00:00:00.000Z' });
      const t3 = createMockProgressEntry({ id: 't3', timestamp: '2024-01-05T00:00:00.000Z' });
      const s2 = createMockProgressEntry({ id: 's2', timestamp: '2024-01-03T00:00:00.000Z' });
      const s4 = createMockProgressEntry({ id: 's4', timestamp: '2024-01-07T00:00:00.000Z' });
      const target: ProgressEntry[] = [t1, t3];
      const source: ProgressEntry[] = [s2, s4];

      // Act
      const result = mergeProgress(target, source);

      // Assert
      expect(result.map(e => e.id)).toEqual(['t1', 's2', 't3', 's4']);
    });
  });
});

// ============================================================================
// mergeDetails tests
// ============================================================================

describe('mergeDetails', () => {
  describe('mergeDetails_EmptyArrays_ReturnsEmptyArray', () => {
    it('should return empty array', () => {
      // Arrange
      const target: DetailsEntry[] = [];
      const source: DetailsEntry[] = [];

      // Act
      const result = mergeDetails(target, source);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('mergeDetails_TargetOnlyHasEntries_ReturnsTargetEntries', () => {
    it('should return target entries', () => {
      // Arrange
      const targetEntry = createMockDetailsEntry({ id: 'd1' });
      const target: DetailsEntry[] = [targetEntry];
      const source: DetailsEntry[] = [];

      // Act
      const result = mergeDetails(target, source);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('mergeDetails_BothHaveEntries_ReturnsCombinedCount', () => {
    it('should return combined length', () => {
      // Arrange
      const targetEntry = createMockDetailsEntry({ id: 'd1', timestamp: '2024-01-01T00:00:00.000Z' });
      const sourceEntry = createMockDetailsEntry({ id: 'd2', timestamp: '2024-01-02T00:00:00.000Z' });
      const target: DetailsEntry[] = [targetEntry];
      const source: DetailsEntry[] = [sourceEntry];

      // Act
      const result = mergeDetails(target, source);

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe('mergeDetails_BothHaveEntries_SortsByTimestampAscending', () => {
    it('should sort by timestamp ascending', () => {
      // Arrange
      const laterEntry = createMockDetailsEntry({ id: 'd1', timestamp: '2024-01-03T00:00:00.000Z' });
      const earlierEntry = createMockDetailsEntry({ id: 'd2', timestamp: '2024-01-01T00:00:00.000Z' });
      const target: DetailsEntry[] = [laterEntry];
      const source: DetailsEntry[] = [earlierEntry];

      // Act
      const result = mergeDetails(target, source);

      // Assert
      expect(result[0].id).toBe('d2');
    });
  });
});

// ============================================================================
// mergeTags tests
// ============================================================================

describe('mergeTags', () => {
  describe('mergeTags_EmptyArrays_ReturnsEmptyArray', () => {
    it('should return empty array', () => {
      // Arrange
      const target: string[] = [];
      const source: string[] = [];

      // Act
      const result = mergeTags(target, source);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('mergeTags_TargetOnlyHasTags_ReturnsTargetTags', () => {
    it('should return target tags', () => {
      // Arrange
      const target: string[] = ['tag1', 'tag2'];
      const source: string[] = [];

      // Act
      const result = mergeTags(target, source);

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe('mergeTags_SourceOnlyHasTags_ReturnsSourceTags', () => {
    it('should return source tags', () => {
      // Arrange
      const target: string[] = [];
      const source: string[] = ['tag3', 'tag4'];

      // Act
      const result = mergeTags(target, source);

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe('mergeTags_DisjointTags_ReturnsUnion', () => {
    it('should return union of disjoint sets', () => {
      // Arrange
      const target: string[] = ['tag1', 'tag2'];
      const source: string[] = ['tag3', 'tag4'];

      // Act
      const result = mergeTags(target, source);

      // Assert
      expect(result).toHaveLength(4);
    });
  });

  describe('mergeTags_OverlappingTags_RemovesDuplicates', () => {
    it('should not contain duplicates', () => {
      // Arrange
      const target: string[] = ['tag1', 'tag2', 'shared'];
      const source: string[] = ['shared', 'tag3'];

      // Act
      const result = mergeTags(target, source);

      // Assert
      expect(result).toHaveLength(4);
    });
  });

  describe('mergeTags_IdenticalTags_ReturnsOriginalCount', () => {
    it('should return same count as original', () => {
      // Arrange
      const target: string[] = ['tag1', 'tag2'];
      const source: string[] = ['tag1', 'tag2'];

      // Act
      const result = mergeTags(target, source);

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe('mergeTags_OverlappingTags_ContainsAllUniqueTags', () => {
    it('should contain all unique tags', () => {
      // Arrange
      const target: string[] = ['tag1', 'shared'];
      const source: string[] = ['shared', 'tag2'];

      // Act
      const result = mergeTags(target, source);

      // Assert
      expect(result).toContain('tag1');
    });
  });
});

// ============================================================================
// mergeDependencies tests
// ============================================================================

describe('mergeDependencies', () => {
  describe('mergeDependencies_EmptyArrays_ReturnsEmptyArray', () => {
    it('should return empty array', () => {
      // Arrange
      const target: Dependency[] = [];
      const source: Dependency[] = [];

      // Act
      const result = mergeDependencies(target, source);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('mergeDependencies_TargetOnlyHasDeps_ReturnsTargetDeps', () => {
    it('should return target dependencies', () => {
      // Arrange
      const targetDep = createMockDependency({ threadId: 'dep-1' });
      const target: Dependency[] = [targetDep];
      const source: Dependency[] = [];

      // Act
      const result = mergeDependencies(target, source);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('mergeDependencies_SourceOnlyHasDeps_ReturnsSourceDeps', () => {
    it('should return source dependencies', () => {
      // Arrange
      const target: Dependency[] = [];
      const sourceDep = createMockDependency({ threadId: 'dep-2' });
      const source: Dependency[] = [sourceDep];

      // Act
      const result = mergeDependencies(target, source);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('mergeDependencies_DisjointDeps_ReturnsUnion', () => {
    it('should return union of disjoint dependencies', () => {
      // Arrange
      const targetDep = createMockDependency({ threadId: 'dep-1' });
      const sourceDep = createMockDependency({ threadId: 'dep-2' });
      const target: Dependency[] = [targetDep];
      const source: Dependency[] = [sourceDep];

      // Act
      const result = mergeDependencies(target, source);

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe('mergeDependencies_SameThreadId_PrefersTargetVersion', () => {
    it('should use target version for same threadId', () => {
      // Arrange
      const targetDep = createMockDependency({ threadId: 'shared-dep', why: 'target-why' });
      const sourceDep = createMockDependency({ threadId: 'shared-dep', why: 'source-why' });
      const target: Dependency[] = [targetDep];
      const source: Dependency[] = [sourceDep];

      // Act
      const result = mergeDependencies(target, source);

      // Assert
      expect(result[0].why).toBe('target-why');
    });
  });

  describe('mergeDependencies_SameThreadId_ReturnsOneDep', () => {
    it('should not duplicate same threadId', () => {
      // Arrange
      const targetDep = createMockDependency({ threadId: 'shared-dep' });
      const sourceDep = createMockDependency({ threadId: 'shared-dep' });
      const target: Dependency[] = [targetDep];
      const source: Dependency[] = [sourceDep];

      // Act
      const result = mergeDependencies(target, source);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('mergeDependencies_MixedOverlap_ReturnsCorrectCount', () => {
    it('should return correct count with mixed overlap', () => {
      // Arrange
      const t1 = createMockDependency({ threadId: 'dep-1' });
      const t2 = createMockDependency({ threadId: 'shared' });
      const s1 = createMockDependency({ threadId: 'shared' });
      const s2 = createMockDependency({ threadId: 'dep-3' });
      const target: Dependency[] = [t1, t2];
      const source: Dependency[] = [s1, s2];

      // Act
      const result = mergeDependencies(target, source);

      // Assert
      expect(result).toHaveLength(3);
    });
  });
});

// ============================================================================
// findThread tests
// ============================================================================

describe('findThread', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('findThread_ExactIdMatch_ReturnsThread', () => {
    it('should return thread for exact id', () => {
      // Arrange
      const thread = createMockThread({ id: 'exact-id-123' });
      mockStorage.getThreadById.mockReturnValue(thread);

      // Act
      const result = findThread('exact-id-123', 'Source');

      // Assert
      expect(result).toBe(thread);
    });
  });

  describe('findThread_ExactNameMatch_ReturnsThread', () => {
    it('should return thread for exact name', () => {
      // Arrange
      const thread = createMockThread({ name: 'My Thread' });
      mockStorage.getThreadById.mockReturnValue(undefined);
      mockStorage.getThreadByName.mockReturnValue(thread);

      // Act
      const result = findThread('My Thread', 'Source');

      // Assert
      expect(result).toBe(thread);
    });
  });

  describe('findThread_PartialIdMatchSingle_ReturnsThread', () => {
    it('should return thread for single partial id match', () => {
      // Arrange
      const thread = createMockThread({ id: 'abc12345-full-id' });
      mockStorage.getThreadById.mockReturnValue(undefined);
      mockStorage.getThreadByName.mockReturnValue(undefined);
      mockStorage.getAllThreads.mockReturnValue([thread]);

      // Act
      const result = findThread('abc', 'Source');

      // Assert
      expect(result).toBe(thread);
    });
  });

  describe('findThread_PartialIdMatchMultiple_ReturnsNull', () => {
    it('should return null for ambiguous partial id', () => {
      // Arrange
      const thread1 = createMockThread({ id: 'abc12345-one', name: 'Thread One' });
      const thread2 = createMockThread({ id: 'abc67890-two', name: 'Thread Two' });
      mockStorage.getThreadById.mockReturnValue(undefined);
      mockStorage.getThreadByName.mockReturnValue(undefined);
      mockStorage.getAllThreads.mockReturnValue([thread1, thread2]);

      // Act
      const result = findThread('abc', 'Source');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findThread_PartialNameMatchSingle_ReturnsThread', () => {
    it('should return thread for single partial name match', () => {
      // Arrange
      const thread = createMockThread({ id: 'unique-id', name: 'Unique Thread Name' });
      mockStorage.getThreadById.mockReturnValue(undefined);
      mockStorage.getThreadByName.mockReturnValue(undefined);
      mockStorage.getAllThreads.mockReturnValue([thread]);

      // Act
      const result = findThread('Unique', 'Source');

      // Assert
      expect(result).toBe(thread);
    });
  });

  describe('findThread_PartialNameMatchMultiple_ReturnsNull', () => {
    it('should return null for ambiguous partial name', () => {
      // Arrange
      const thread1 = createMockThread({ id: 'id-1', name: 'Test Thread Alpha' });
      const thread2 = createMockThread({ id: 'id-2', name: 'Test Thread Beta' });
      mockStorage.getThreadById.mockReturnValue(undefined);
      mockStorage.getThreadByName.mockReturnValue(undefined);
      mockStorage.getAllThreads.mockReturnValue([thread1, thread2]);

      // Act
      const result = findThread('Test Thread', 'Target');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findThread_NoMatch_ReturnsNull', () => {
    it('should return null when no match found', () => {
      // Arrange
      mockStorage.getThreadById.mockReturnValue(undefined);
      mockStorage.getThreadByName.mockReturnValue(undefined);
      mockStorage.getAllThreads.mockReturnValue([]);

      // Act
      const result = findThread('nonexistent', 'Source');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findThread_NoMatch_LogsErrorMessage', () => {
    it('should log error message with label', () => {
      // Arrange
      mockStorage.getThreadById.mockReturnValue(undefined);
      mockStorage.getThreadByName.mockReturnValue(undefined);
      mockStorage.getAllThreads.mockReturnValue([]);

      // Act
      findThread('nonexistent', 'Source');

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Source'));
    });
  });
});

// ============================================================================
// mergeCommand integration tests
// ============================================================================

describe('mergeCommand', () => {
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

  describe('mergeCommand_SourceNotFound_DoesNotCallUpdateThread', () => {
    it('should not update when source not found', async () => {
      // Arrange
      mockStorage.getThreadById.mockReturnValue(undefined);
      mockStorage.getThreadByName.mockReturnValue(undefined);
      mockStorage.getAllThreads.mockReturnValue([]);

      // Act
      await mergeCommand.parseAsync(['node', 'test', 'source', 'target']);

      // Assert
      expect(mockStorage.updateThread).not.toHaveBeenCalled();
    });
  });

  describe('mergeCommand_TargetNotFound_DoesNotCallUpdateThread', () => {
    it('should not update when target not found', async () => {
      // Arrange
      const sourceThread = createMockThread({ id: 'source-id', name: 'Source' });
      mockStorage.getThreadById.mockImplementation((id: string) => id === 'source-id' ? sourceThread : undefined);
      mockStorage.getThreadByName.mockImplementation((name: string) => name === 'Source' ? sourceThread : undefined);
      mockStorage.getAllThreads.mockReturnValue([sourceThread]);

      // Act
      await mergeCommand.parseAsync(['node', 'test', 'Source', 'nonexistent']);

      // Assert
      expect(mockStorage.updateThread).not.toHaveBeenCalled();
    });
  });

  describe('mergeCommand_SourceEqualsTarget_DoesNotCallUpdateThread', () => {
    it('should not update when merging thread into itself', async () => {
      // Arrange
      const thread = createMockThread({ id: 'same-id', name: 'Same Thread' });
      mockStorage.getThreadById.mockReturnValue(thread);
      mockStorage.getThreadByName.mockReturnValue(thread);

      // Act
      await mergeCommand.parseAsync(['node', 'test', 'Same Thread', 'Same Thread']);

      // Assert
      expect(mockStorage.updateThread).not.toHaveBeenCalled();
    });
  });

  describe('mergeCommand_SourceEqualsTarget_LogsErrorMessage', () => {
    it('should log error about self-merge', async () => {
      // Arrange
      const thread = createMockThread({ id: 'same-id', name: 'Same Thread' });
      mockStorage.getThreadById.mockReturnValue(thread);
      mockStorage.getThreadByName.mockReturnValue(thread);

      // Act
      await mergeCommand.parseAsync(['node', 'test', 'Same Thread', 'Same Thread']);

      // Assert
      expect(capturedOutput.some(line => line.includes('Cannot merge a thread into itself'))).toBe(true);
    });
  });

  describe('mergeCommand_ValidMerge_CallsUpdateThread', () => {
    it('should call updateThread for target', async () => {
      // Arrange
      const sourceThread = createMockThread({
        id: 'source-id',
        name: 'Source Thread',
        progress: [],
        details: [],
        tags: [],
        dependencies: [],
      });
      const targetThread = createMockThread({
        id: 'target-id',
        name: 'Target Thread',
        progress: [],
        details: [],
        tags: [],
        dependencies: [],
      });

      mockStorage.getThreadById.mockImplementation((id: string) => {
        if (id === 'source-id') return sourceThread;
        if (id === 'target-id') return targetThread;
        return undefined;
      });
      mockStorage.getThreadByName.mockImplementation((name: string) => {
        if (name === 'Source Thread') return sourceThread;
        if (name === 'Target Thread') return targetThread;
        return undefined;
      });
      mockStorage.getAllThreads.mockReturnValue([sourceThread, targetThread]);

      // Act
      await mergeCommand.parseAsync(['node', 'test', 'Source Thread', 'Target Thread']);

      // Assert
      expect(mockStorage.updateThread).toHaveBeenCalledWith('target-id', expect.anything());
    });
  });

  describe('mergeCommand_ValidMerge_ArchivesSourceByDefault', () => {
    it('should set source status to archived', async () => {
      // Arrange
      const sourceThread = createMockThread({
        id: 'source-id',
        name: 'Source Thread',
        status: 'active',
      });
      const targetThread = createMockThread({
        id: 'target-id',
        name: 'Target Thread',
      });

      mockStorage.getThreadById.mockImplementation((id: string) => {
        if (id === 'source-id') return sourceThread;
        if (id === 'target-id') return targetThread;
        return undefined;
      });
      mockStorage.getThreadByName.mockImplementation((name: string) => {
        if (name === 'Source Thread') return sourceThread;
        if (name === 'Target Thread') return targetThread;
        return undefined;
      });
      mockStorage.getAllThreads.mockReturnValue([sourceThread, targetThread]);

      // Act
      await mergeCommand.parseAsync(['node', 'test', 'Source Thread', 'Target Thread']);

      // Assert
      expect(mockStorage.updateThread).toHaveBeenCalledWith('source-id', expect.objectContaining({
        status: 'archived',
        temperature: 'frozen',
      }));
    });
  });

  describe('mergeCommand_KeepOption_PreservesSourceStatus', () => {
    it('should not archive source with --keep', async () => {
      // Arrange
      const sourceThread = createMockThread({
        id: 'source-id',
        name: 'Source Thread',
        status: 'active',
      });
      const targetThread = createMockThread({
        id: 'target-id',
        name: 'Target Thread',
      });

      mockStorage.getThreadById.mockImplementation((id: string) => {
        if (id === 'source-id') return sourceThread;
        if (id === 'target-id') return targetThread;
        return undefined;
      });
      mockStorage.getThreadByName.mockImplementation((name: string) => {
        if (name === 'Source Thread') return sourceThread;
        if (name === 'Target Thread') return targetThread;
        return undefined;
      });
      mockStorage.getAllThreads.mockReturnValue([sourceThread, targetThread]);

      // Act
      await mergeCommand.parseAsync(['node', 'test', 'Source Thread', 'Target Thread', '--keep']);

      // Assert
      // Should NOT have called updateThread with archived status for source
      expect(mockStorage.updateThread).not.toHaveBeenCalledWith('source-id', expect.objectContaining({
        status: 'archived',
      }));
    });
  });

  describe('mergeCommand_DryRunOption_DoesNotCallUpdateThread', () => {
    it('should not update with --dry-run', async () => {
      // Arrange
      const sourceThread = createMockThread({
        id: 'source-id',
        name: 'Source Thread',
      });
      const targetThread = createMockThread({
        id: 'target-id',
        name: 'Target Thread',
      });

      mockStorage.getThreadById.mockImplementation((id: string) => {
        if (id === 'source-id') return sourceThread;
        if (id === 'target-id') return targetThread;
        return undefined;
      });
      mockStorage.getThreadByName.mockImplementation((name: string) => {
        if (name === 'Source Thread') return sourceThread;
        if (name === 'Target Thread') return targetThread;
        return undefined;
      });
      mockStorage.getAllThreads.mockReturnValue([sourceThread, targetThread]);

      // Act
      await mergeCommand.parseAsync(['node', 'test', 'Source Thread', 'Target Thread', '--dry-run']);

      // Assert
      expect(mockStorage.updateThread).not.toHaveBeenCalled();
    });
  });

  describe('mergeCommand_DryRunOption_OutputsPreview', () => {
    it('should output DRY RUN label', async () => {
      // Arrange
      const sourceThread = createMockThread({
        id: 'source-id',
        name: 'Source Thread',
      });
      const targetThread = createMockThread({
        id: 'target-id',
        name: 'Target Thread',
      });

      mockStorage.getThreadById.mockImplementation((id: string) => {
        if (id === 'source-id') return sourceThread;
        if (id === 'target-id') return targetThread;
        return undefined;
      });
      mockStorage.getThreadByName.mockImplementation((name: string) => {
        if (name === 'Source Thread') return sourceThread;
        if (name === 'Target Thread') return targetThread;
        return undefined;
      });
      mockStorage.getAllThreads.mockReturnValue([sourceThread, targetThread]);

      // Act
      await mergeCommand.parseAsync(['node', 'test', 'Source Thread', 'Target Thread', '--dry-run']);

      // Assert
      expect(capturedOutput.some(line => line.includes('[DRY RUN]'))).toBe(true);
    });
  });

  describe('mergeCommand_MergeWithProgress_CombinesProgressEntries', () => {
    it('should combine progress entries from both threads', async () => {
      // Arrange
      const sourceProgress = [createMockProgressEntry({ id: 'sp1' })];
      const targetProgress = [createMockProgressEntry({ id: 'tp1' })];
      const sourceThread = createMockThread({
        id: 'source-id',
        name: 'Source Thread',
        progress: sourceProgress,
      });
      const targetThread = createMockThread({
        id: 'target-id',
        name: 'Target Thread',
        progress: targetProgress,
      });

      mockStorage.getThreadById.mockImplementation((id: string) => {
        if (id === 'source-id') return sourceThread;
        if (id === 'target-id') return targetThread;
        return undefined;
      });
      mockStorage.getThreadByName.mockImplementation((name: string) => {
        if (name === 'Source Thread') return sourceThread;
        if (name === 'Target Thread') return targetThread;
        return undefined;
      });
      mockStorage.getAllThreads.mockReturnValue([sourceThread, targetThread]);

      // Act
      await mergeCommand.parseAsync(['node', 'test', 'Source Thread', 'Target Thread']);

      // Assert
      expect(mockStorage.updateThread).toHaveBeenCalledWith('target-id', expect.objectContaining({
        progress: expect.arrayContaining([
          expect.objectContaining({ id: 'tp1' }),
          expect.objectContaining({ id: 'sp1' }),
        ]),
      }));
    });
  });

  describe('mergeCommand_MergeWithTags_CombinesTagsWithoutDuplicates', () => {
    it('should combine tags without duplicates', async () => {
      // Arrange
      const sourceThread = createMockThread({
        id: 'source-id',
        name: 'Source Thread',
        tags: ['shared', 'source-only'],
      });
      const targetThread = createMockThread({
        id: 'target-id',
        name: 'Target Thread',
        tags: ['shared', 'target-only'],
      });

      mockStorage.getThreadById.mockImplementation((id: string) => {
        if (id === 'source-id') return sourceThread;
        if (id === 'target-id') return targetThread;
        return undefined;
      });
      mockStorage.getThreadByName.mockImplementation((name: string) => {
        if (name === 'Source Thread') return sourceThread;
        if (name === 'Target Thread') return targetThread;
        return undefined;
      });
      mockStorage.getAllThreads.mockReturnValue([sourceThread, targetThread]);

      // Act
      await mergeCommand.parseAsync(['node', 'test', 'Source Thread', 'Target Thread']);

      // Assert
      expect(mockStorage.updateThread).toHaveBeenCalledWith('target-id', expect.objectContaining({
        tags: expect.arrayContaining(['shared', 'source-only', 'target-only']),
      }));
    });
  });

  describe('mergeCommand_ChildReparenting_UpdatesChildParentId', () => {
    it('should reparent children to target thread', async () => {
      // Arrange
      const sourceThread = createMockThread({
        id: 'source-id',
        name: 'Source Thread',
      });
      const targetThread = createMockThread({
        id: 'target-id',
        name: 'Target Thread',
      });
      const childThread = createMockThread({
        id: 'child-id',
        name: 'Child Thread',
        parentId: 'source-id',
      });

      mockStorage.getThreadById.mockImplementation((id: string) => {
        if (id === 'source-id') return sourceThread;
        if (id === 'target-id') return targetThread;
        if (id === 'child-id') return childThread;
        return undefined;
      });
      mockStorage.getThreadByName.mockImplementation((name: string) => {
        if (name === 'Source Thread') return sourceThread;
        if (name === 'Target Thread') return targetThread;
        if (name === 'Child Thread') return childThread;
        return undefined;
      });
      mockStorage.getAllThreads.mockReturnValue([sourceThread, targetThread, childThread]);

      // Act
      await mergeCommand.parseAsync(['node', 'test', 'Source Thread', 'Target Thread']);

      // Assert
      expect(mockStorage.updateThread).toHaveBeenCalledWith('child-id', { parentId: 'target-id' });
    });
  });
});
