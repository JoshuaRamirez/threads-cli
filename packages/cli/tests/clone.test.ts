/**
 * Unit tests for commands/clone.ts
 *
 * Tests the cloneThread, cloneWithChildren, getChildren, and findThread functions
 * with full mocking of storage dependencies.
 */

import { Thread, ThreadsData, Group } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, createMockGroup, MockStorageService } from './helpers/mockStorage';

// Mock uuid to return predictable IDs
jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

// Create mock storage instance
let mockStorage: MockStorageService;

// Mock context module to return our mock storage
jest.mock('../src/context', () => ({
  getStorage: jest.fn(() => mockStorage),
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

import { v4 as uuidv4 } from 'uuid';
import {
  cloneThread,
  cloneWithChildren,
  getChildren,
  findThread,
  cloneCommand,
} from '../src/commands/clone';

// Cast to jest.Mock to avoid type issues with uuid's overloaded signatures
const mockUuidv4 = uuidv4 as jest.Mock;

describe('cloneThread', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    mockUuidv4.mockReturnValue('new-uuid-456');
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('cloneThread_Clone_CopiesName', () => {
    // Arrange
    const source = createMockThread({ name: 'Original Name' });

    // Act
    const result = cloneThread(source, 'Cloned Name', null, null);

    // Assert
    expect(result.name).toBe('Cloned Name');
  });

  test('cloneThread_Clone_CopiesStatus', () => {
    // Arrange
    const source = createMockThread({ status: 'paused' });

    // Act
    const result = cloneThread(source, 'Clone', null, null);

    // Assert
    expect(result.status).toBe('paused');
  });

  test('cloneThread_Clone_CopiesTemperature', () => {
    // Arrange
    const source = createMockThread({ temperature: 'hot' });

    // Act
    const result = cloneThread(source, 'Clone', null, null);

    // Assert
    expect(result.temperature).toBe('hot');
  });

  test('cloneThread_Clone_CopiesSize', () => {
    // Arrange
    const source = createMockThread({ size: 'huge' });

    // Act
    const result = cloneThread(source, 'Clone', null, null);

    // Assert
    expect(result.size).toBe('huge');
  });

  test('cloneThread_Clone_CopiesImportance', () => {
    // Arrange
    const source = createMockThread({ importance: 5 });

    // Act
    const result = cloneThread(source, 'Clone', null, null);

    // Assert
    expect(result.importance).toBe(5);
  });

  test('cloneThread_Clone_CopiesDescription', () => {
    // Arrange
    const source = createMockThread({ description: 'Detailed description' });

    // Act
    const result = cloneThread(source, 'Clone', null, null);

    // Assert
    expect(result.description).toBe('Detailed description');
  });

  test('cloneThread_Clone_CopiesTags', () => {
    // Arrange
    const source = createMockThread({ tags: ['urgent', 'review'] });

    // Act
    const result = cloneThread(source, 'Clone', null, null);

    // Assert
    expect(result.tags).toEqual(['urgent', 'review']);
  });

  test('cloneThread_Clone_CreatesIndependentTagsArray', () => {
    // Arrange
    const source = createMockThread({ tags: ['tag1'] });

    // Act
    const result = cloneThread(source, 'Clone', null, null);
    result.tags.push('tag2');

    // Assert
    expect(source.tags).toEqual(['tag1']);
  });

  test('cloneThread_Clone_DoesNotCopyProgress', () => {
    // Arrange
    const source = createMockThread({
      progress: [{ id: 'p1', timestamp: '2024-01-01', note: 'note' }],
    });

    // Act
    const result = cloneThread(source, 'Clone', null, null);

    // Assert
    expect(result.progress).toEqual([]);
  });

  test('cloneThread_Clone_DoesNotCopyDetails', () => {
    // Arrange
    const source = createMockThread({
      details: [{ id: 'd1', timestamp: '2024-01-01', content: 'content' }],
    });

    // Act
    const result = cloneThread(source, 'Clone', null, null);

    // Assert
    expect(result.details).toEqual([]);
  });

  test('cloneThread_Clone_DoesNotCopyDependencies', () => {
    // Arrange
    const source = createMockThread({
      dependencies: [{ threadId: 'dep1', why: 'y', what: 'w', how: 'h', when: 'wh' }],
    });

    // Act
    const result = cloneThread(source, 'Clone', null, null);

    // Assert
    expect(result.dependencies).toEqual([]);
  });

  test('cloneThread_Clone_GeneratesNewId', () => {
    // Arrange
    const source = createMockThread({ id: 'original-id' });
    mockUuidv4.mockReturnValue('generated-new-id');

    // Act
    const result = cloneThread(source, 'Clone', null, null);

    // Assert
    expect(result.id).toBe('generated-new-id');
  });

  test('cloneThread_Clone_SetsNewCreatedAt', () => {
    // Arrange
    const source = createMockThread({ createdAt: '2020-01-01T00:00:00.000Z' });

    // Act
    const result = cloneThread(source, 'Clone', null, null);

    // Assert
    expect(result.createdAt).toBe('2024-06-15T12:00:00.000Z');
  });

  test('cloneThread_Clone_SetsNewUpdatedAt', () => {
    // Arrange
    const source = createMockThread({ updatedAt: '2020-01-01T00:00:00.000Z' });

    // Act
    const result = cloneThread(source, 'Clone', null, null);

    // Assert
    expect(result.updatedAt).toBe('2024-06-15T12:00:00.000Z');
  });

  test('cloneThread_Clone_UsesProvidedParentId', () => {
    // Arrange
    const source = createMockThread({ parentId: 'old-parent' });

    // Act
    const result = cloneThread(source, 'Clone', 'new-parent-id', null);

    // Assert
    expect(result.parentId).toBe('new-parent-id');
  });

  test('cloneThread_Clone_UsesProvidedGroupId', () => {
    // Arrange
    const source = createMockThread({ groupId: 'old-group' });

    // Act
    const result = cloneThread(source, 'Clone', null, 'new-group-id');

    // Assert
    expect(result.groupId).toBe('new-group-id');
  });

  test('cloneThread_Clone_AllowsNullParentId', () => {
    // Arrange
    const source = createMockThread({ parentId: 'has-parent' });

    // Act
    const result = cloneThread(source, 'Clone', null, null);

    // Assert
    expect(result.parentId).toBeNull();
  });

  test('cloneThread_Clone_AllowsNullGroupId', () => {
    // Arrange
    const source = createMockThread({ groupId: 'has-group' });

    // Act
    const result = cloneThread(source, 'Clone', null, null);

    // Assert
    expect(result.groupId).toBeNull();
  });
});

describe('getChildren', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
  });

  test('getChildren_WithMatchingParent_ReturnsChildThreads', () => {
    // Arrange
    const parent = createMockThread({ id: 'parent-1' });
    const child1 = createMockThread({ id: 'child-1', parentId: 'parent-1' });
    const child2 = createMockThread({ id: 'child-2', parentId: 'parent-1' });
    const unrelated = createMockThread({ id: 'other', parentId: 'other-parent' });
    const threads = [parent, child1, child2, unrelated];

    // Act
    const result = getChildren('parent-1', threads);

    // Assert
    expect(result).toHaveLength(2);
  });

  test('getChildren_WithNoChildren_ReturnsEmptyArray', () => {
    // Arrange
    const threads = [
      createMockThread({ id: 't1', parentId: null }),
      createMockThread({ id: 't2', parentId: 'other' }),
    ];

    // Act
    const result = getChildren('non-existent', threads);

    // Assert
    expect(result).toEqual([]);
  });

  test('getChildren_WithMatchingChildren_ReturnsCorrectIds', () => {
    // Arrange
    const child1 = createMockThread({ id: 'child-a', parentId: 'parent-x' });
    const child2 = createMockThread({ id: 'child-b', parentId: 'parent-x' });
    const threads = [child1, child2];

    // Act
    const result = getChildren('parent-x', threads);

    // Assert
    expect(result.map(t => t.id)).toContain('child-a');
  });

  test('getChildren_WithEmptyArray_ReturnsEmptyArray', () => {
    // Arrange
    const threads: Thread[] = [];

    // Act
    const result = getChildren('any-id', threads);

    // Assert
    expect(result).toEqual([]);
  });
});

describe('cloneWithChildren', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    let uuidCounter = 0;
    mockUuidv4.mockImplementation(() => `uuid-${++uuidCounter}`);
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('cloneWithChildren_SingleThread_ReturnsOneClone', () => {
    // Arrange
    const source = createMockThread({ id: 'source-1' });
    const allThreads = [source];

    // Act
    const result = cloneWithChildren(source, 'Clone', null, null, allThreads);

    // Assert
    expect(result).toHaveLength(1);
  });

  test('cloneWithChildren_WithOneChild_ReturnsTwoClones', () => {
    // Arrange
    const parent = createMockThread({ id: 'parent-1', name: 'Parent' });
    const child = createMockThread({ id: 'child-1', name: 'Child', parentId: 'parent-1' });
    const allThreads = [parent, child];

    // Act
    const result = cloneWithChildren(parent, 'Parent Clone', null, null, allThreads);

    // Assert
    expect(result).toHaveLength(2);
  });

  test('cloneWithChildren_WithChildren_SetsClonedParentIdToClonedParent', () => {
    // Arrange
    const parent = createMockThread({ id: 'parent-1', name: 'Parent' });
    const child = createMockThread({ id: 'child-1', name: 'Child', parentId: 'parent-1' });
    const allThreads = [parent, child];

    // Act
    const result = cloneWithChildren(parent, 'Clone', null, null, allThreads);

    // Assert
    const clonedParent = result[0];
    const clonedChild = result[1];
    expect(clonedChild.parentId).toBe(clonedParent.id);
  });

  test('cloneWithChildren_WithChildren_KeepsChildOriginalName', () => {
    // Arrange
    const parent = createMockThread({ id: 'parent-1', name: 'Parent' });
    const child = createMockThread({ id: 'child-1', name: 'Original Child Name', parentId: 'parent-1' });
    const allThreads = [parent, child];

    // Act
    const result = cloneWithChildren(parent, 'New Parent Name', null, null, allThreads);

    // Assert
    const clonedChild = result[1];
    expect(clonedChild.name).toBe('Original Child Name');
  });

  test('cloneWithChildren_WithGroupId_PropagatesGroupToChildren', () => {
    // Arrange
    const parent = createMockThread({ id: 'p1', groupId: 'old-group' });
    const child = createMockThread({ id: 'c1', parentId: 'p1', groupId: 'old-group' });
    const allThreads = [parent, child];

    // Act
    const result = cloneWithChildren(parent, 'Clone', null, 'new-group', allThreads);

    // Assert
    expect(result[1].groupId).toBe('new-group');
  });

  test('cloneWithChildren_WithNestedChildren_ClonesAllLevels', () => {
    // Arrange
    const grandparent = createMockThread({ id: 'gp', name: 'Grandparent' });
    const parent = createMockThread({ id: 'p', name: 'Parent', parentId: 'gp' });
    const child = createMockThread({ id: 'c', name: 'Child', parentId: 'p' });
    const allThreads = [grandparent, parent, child];

    // Act
    const result = cloneWithChildren(grandparent, 'Clone', null, null, allThreads);

    // Assert
    expect(result).toHaveLength(3);
  });

  test('cloneWithChildren_RootClone_UsesProvidedName', () => {
    // Arrange
    const source = createMockThread({ id: 's1', name: 'Original' });
    const allThreads = [source];

    // Act
    const result = cloneWithChildren(source, 'Custom Name', null, null, allThreads);

    // Assert
    expect(result[0].name).toBe('Custom Name');
  });

  test('cloneWithChildren_RootClone_UsesProvidedParentId', () => {
    // Arrange
    const source = createMockThread({ id: 's1', parentId: 'old-parent' });
    const allThreads = [source];

    // Act
    const result = cloneWithChildren(source, 'Clone', 'new-parent', null, allThreads);

    // Assert
    expect(result[0].parentId).toBe('new-parent');
  });
});

describe('findThread', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
  });

  test('findThread_ByExactId_ReturnsThread', () => {
    // Arrange
    const thread = createMockThread({ id: 'exact-id-123' });
    mockStorage.getThreadById.mockReturnValue(thread);

    // Act
    const result = findThread('exact-id-123');

    // Assert
    expect(result).toBe(thread);
  });

  test('findThread_ByExactName_ReturnsThread', () => {
    // Arrange
    const thread = createMockThread({ name: 'Exact Name' });
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(thread);

    // Act
    const result = findThread('Exact Name');

    // Assert
    expect(result).toBe(thread);
  });

  test('findThread_ByPartialId_ReturnsThreadWhenUniqueMatch', () => {
    // Arrange
    const thread = createMockThread({ id: 'abc123def456' });
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([thread]);

    // Act
    const result = findThread('abc');

    // Assert
    expect(result).toBe(thread);
  });

  test('findThread_ByPartialName_ReturnsThreadWhenUniqueMatch', () => {
    // Arrange
    const thread = createMockThread({ id: 'id-1', name: 'My Special Thread' });
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([thread]);

    // Act
    const result = findThread('special');

    // Assert
    expect(result).toBe(thread);
  });

  test('findThread_WithMultiplePartialMatches_ReturnsUndefined', () => {
    // Arrange
    const thread1 = createMockThread({ id: 'abc-1', name: 'Thread ABC' });
    const thread2 = createMockThread({ id: 'abc-2', name: 'Thread DEF' });
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([thread1, thread2]);

    // Act
    const result = findThread('abc');

    // Assert
    expect(result).toBeUndefined();
  });

  test('findThread_WithNoMatch_ReturnsUndefined', () => {
    // Arrange
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([]);

    // Act
    const result = findThread('nonexistent');

    // Assert
    expect(result).toBeUndefined();
  });

  test('findThread_CaseInsensitive_MatchesPartialIdIgnoringCase', () => {
    // Arrange
    const thread = createMockThread({ id: 'ABC123' });
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([thread]);

    // Act
    const result = findThread('abc');

    // Assert
    expect(result).toBe(thread);
  });

  test('findThread_CaseInsensitive_MatchesPartialNameIgnoringCase', () => {
    // Arrange
    const thread = createMockThread({ id: 'id-1', name: 'UPPERCASE Name' });
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([thread]);

    // Act
    const result = findThread('uppercase');

    // Assert
    expect(result).toBe(thread);
  });

  test('findThread_ById_CallsGetThreadByIdFirst', () => {
    // Arrange
    mockStorage.getThreadById.mockReturnValue(createMockThread());

    // Act
    findThread('any-id');

    // Assert
    expect(mockStorage.getThreadById).toHaveBeenCalledWith('any-id');
  });
});

describe('cloneCommand action', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    mockUuidv4.mockReturnValue('cloned-uuid');
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.useRealTimers();
  });

  test('cloneCommand_SourceNotFound_LogsErrorMessage', async () => {
    // Arrange
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([]);

    // Act
    await cloneCommand.parseAsync(['node', 'test', 'nonexistent']);

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('cloneCommand_WithoutNewName_UsesDefaultCopySuffix', async () => {
    // Arrange
    const source = createMockThread({ name: 'Original' });
    mockStorage.getThreadById.mockReturnValue(source);
    mockStorage.getThreadByName.mockImplementation((name: string) => {
      if (name === 'Original') return source;
      return undefined;
    });
    mockStorage.getAllThreads.mockReturnValue([source]);

    // Act
    await cloneCommand.parseAsync(['node', 'test', 'Original']);

    // Assert
    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Original (copy)' })
    );
  });

  test('cloneCommand_WithCustomName_UsesProvidedName', async () => {
    // Arrange
    const source = createMockThread({ name: 'Original' });
    mockStorage.getThreadById.mockReturnValue(source);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([source]);

    // Act
    await cloneCommand.parseAsync(['node', 'test', 'Original', 'Custom Name']);

    // Assert
    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Custom Name' })
    );
  });

  test('cloneCommand_DuplicateName_LogsErrorMessage', async () => {
    // Arrange
    const source = createMockThread({ id: 'source-id', name: 'Original' });
    const existing = createMockThread({ id: 'existing-id', name: 'Original (copy)' });
    mockStorage.getThreadById.mockReturnValue(source);
    mockStorage.getThreadByName.mockImplementation((name: string) => {
      if (name === 'Original (copy)') return existing;
      return undefined;
    });

    // Act
    await cloneCommand.parseAsync(['node', 'test', 'Original']);

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'));
  });

  test('cloneCommand_WithParentOption_SetsNewParentId', async () => {
    // Arrange
    const source = createMockThread({ id: 'source-id', name: 'Source' });
    const newParent = createMockThread({ id: 'new-parent-id', name: 'New Parent' });
    mockStorage.getThreadById.mockImplementation((id: string) => {
      if (id === 'source-id') return source;
      if (id === 'new-parent-id') return newParent;
      return undefined;
    });
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([source, newParent]);

    // Act
    await cloneCommand.parseAsync(['node', 'test', 'source-id', '--parent', 'new-parent-id']);

    // Assert
    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: 'new-parent-id' })
    );
  });

  test('cloneCommand_WithInvalidParent_LogsErrorMessage', async () => {
    // Arrange
    const source = createMockThread({ id: 'source-id', name: 'Source' });
    mockStorage.getThreadById.mockImplementation((id: string) => {
      if (id === 'source-id') return source;
      return undefined;
    });
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([source]);

    // Act
    await cloneCommand.parseAsync(['node', 'test', 'source-id', '--parent', 'invalid-parent']);

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Parent thread'));
  });

  test('cloneCommand_WithGroupOption_SetsGroupId', async () => {
    // Arrange
    const source = createMockThread({ id: 'source-id', name: 'Source' });
    const group = createMockGroup({ id: 'group-id', name: 'My Group' });
    mockStorage.getThreadById.mockReturnValue(source);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getGroupByName.mockReturnValue(group);
    mockStorage.getAllThreads.mockReturnValue([source]);

    // Act
    await cloneCommand.parseAsync(['node', 'test', 'source-id', '--group', 'My Group']);

    // Assert
    expect(mockStorage.addThread).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: 'group-id' })
    );
  });

  test('cloneCommand_WithInvalidGroup_LogsErrorMessage', async () => {
    // Arrange
    const source = createMockThread({ id: 'source-id', name: 'Source' });
    mockStorage.getThreadById.mockReturnValue(source);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getGroupByName.mockReturnValue(undefined);

    // Act
    await cloneCommand.parseAsync(['node', 'test', 'source-id', '--group', 'Invalid Group']);

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Group'));
  });

  test('cloneCommand_WithoutChildren_CallsAddThread', async () => {
    // Arrange
    const source = createMockThread({ id: 'source-id', name: 'Source' });
    mockStorage.getThreadById.mockReturnValue(source);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([source]);

    // Act
    await cloneCommand.parseAsync(['node', 'test', 'source-id']);

    // Assert
    expect(mockStorage.addThread).toHaveBeenCalled();
  });

  test('cloneCommand_Success_LogsSuccessMessage', async () => {
    // Arrange
    const source = createMockThread({ id: 'source-id', name: 'Source' });
    mockStorage.getThreadById.mockReturnValue(source);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([source]);

    // Act
    await cloneCommand.parseAsync(['node', 'test', 'source-id']);

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cloned'));
  });
});
