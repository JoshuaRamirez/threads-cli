/**
 * Tests for container delete operations in commands/container.ts
 * Covers cascade, orphan, and move deletion strategies
 */

import { Container, Thread } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, createMockContainer, MockStorageService } from './helpers/mockStorage';

// Mock uuid first - must be before other imports that use uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
}));

// Create mock storage instance
let mockStorage: MockStorageService;

// Mock context module
jest.mock('../src/context', () => ({
  getStorage: jest.fn(() => mockStorage),
}));

// Mock utils
jest.mock('../src/utils', () => ({
  formatContainerDetail: jest.fn(() => 'formatted-container'),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((s: string) => s),
  yellow: jest.fn((s: string) => s),
  dim: jest.fn((s: string) => s),
  bold: jest.fn((s: string) => s),
  cyan: jest.fn((s: string) => s),
  green: jest.fn((s: string) => s),
  magenta: jest.fn((s: string) => s),
  blue: jest.fn((s: string) => s),
  gray: jest.fn((s: string) => s),
}));

// Mock readline for confirmAction
jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    question: jest.fn((q: string, cb: (answer: string) => void) => cb('y')),
    close: jest.fn(),
  })),
}));

import { containerCommand } from '../src/commands/container';

describe('containerCommand delete', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('delete_NoIdentifier_LogsUsage', async () => {
    await containerCommand.parseAsync(['node', 'test', 'delete']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
  });

  test('delete_ContainerNotFound_LogsError', async () => {
    mockStorage.getContainerById.mockReturnValue(undefined);
    mockStorage.getContainerByName.mockReturnValue(undefined);
    mockStorage.getAllContainers.mockReturnValue([]);

    await containerCommand.parseAsync(['node', 'test', 'delete', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('delete_EmptyContainer_DeletesDirectly', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Empty Container' });
    mockStorage.getContainerById.mockReturnValue(container);
    mockStorage.getAllThreads.mockReturnValue([]);
    mockStorage.getAllContainers.mockReturnValue([container]);

    await containerCommand.parseAsync(['node', 'test', 'delete', 'c1']);

    expect(mockStorage.deleteContainer).toHaveBeenCalledWith('c1');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Deleted container'));
  });

  test('delete_WithChildren_NoStrategy_ShowsOptions', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Parent' });
    const child = createMockThread({ id: 't1', name: 'Child', parentId: 'c1' });
    mockStorage.getContainerById.mockReturnValue(container);
    mockStorage.getAllThreads.mockReturnValue([child]);
    mockStorage.getAllContainers.mockReturnValue([container]);

    await containerCommand.parseAsync(['node', 'test', 'delete', 'c1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('--cascade'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('--orphan'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('--move'));
    expect(mockStorage.deleteContainer).not.toHaveBeenCalled();
  });

  test('delete_MultipleStrategies_LogsError', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Parent' });
    const child = createMockThread({ id: 't1', name: 'Child', parentId: 'c1' });
    mockStorage.getContainerById.mockReturnValue(container);
    mockStorage.getAllThreads.mockReturnValue([child]);
    mockStorage.getAllContainers.mockReturnValue([container]);

    await containerCommand.parseAsync(['node', 'test', 'delete', 'c1', '--cascade', '--orphan']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cannot combine'));
  });

  test('delete_Cascade_DryRun_ShowsPreview', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Parent' });
    const child = createMockThread({ id: 't1', name: 'Child', parentId: 'c1' });
    mockStorage.getContainerById.mockReturnValue(container);
    mockStorage.getAllThreads.mockReturnValue([child]);
    mockStorage.getAllContainers.mockReturnValue([container]);

    await containerCommand.parseAsync(['node', 'test', 'delete', 'c1', '--cascade', '--dry-run']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Dry run'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 descendant'));
    expect(mockStorage.deleteContainer).not.toHaveBeenCalled();
    expect(mockStorage.deleteThread).not.toHaveBeenCalled();
  });

  test('delete_Cascade_Force_DeletesAll', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Parent' });
    const child = createMockThread({ id: 't1', name: 'Child', parentId: 'c1' });
    mockStorage.getContainerById.mockReturnValue(container);
    mockStorage.getAllThreads.mockReturnValue([child]);
    mockStorage.getAllContainers.mockReturnValue([container]);

    await containerCommand.parseAsync(['node', 'test', 'delete', 'c1', '--cascade', '-f']);

    expect(mockStorage.deleteThread).toHaveBeenCalledWith('t1');
    expect(mockStorage.deleteContainer).toHaveBeenCalledWith('c1');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Deleted'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 descendant'));
  });

  test('delete_Orphan_DryRun_ShowsPreview', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Parent', parentId: null });
    const child = createMockThread({ id: 't1', name: 'Child', parentId: 'c1' });
    mockStorage.getContainerById.mockReturnValue(container);
    mockStorage.getAllThreads.mockReturnValue([child]);
    mockStorage.getAllContainers.mockReturnValue([container]);
    mockStorage.getAllEntities.mockReturnValue([container, child]);

    await containerCommand.parseAsync(['node', 'test', 'delete', 'c1', '--orphan', '--dry-run']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Dry run'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 direct child'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
    expect(mockStorage.deleteContainer).not.toHaveBeenCalled();
  });

  test('delete_Orphan_Force_MovesChildrenAndDeletes', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Parent', parentId: 'grandparent' });
    const child = createMockThread({ id: 't1', name: 'Child', parentId: 'c1' });
    mockStorage.getContainerById.mockReturnValue(container);
    mockStorage.getAllThreads.mockReturnValue([child]);
    mockStorage.getAllContainers.mockReturnValue([container]);
    mockStorage.getAllEntities.mockReturnValue([container, child]);

    await containerCommand.parseAsync(['node', 'test', 'delete', 'c1', '--orphan', '-f']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({ parentId: 'grandparent' }));
    expect(mockStorage.deleteContainer).toHaveBeenCalledWith('c1');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Orphaned'));
  });

  test('delete_Move_TargetNotFound_LogsError', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Parent' });
    const child = createMockThread({ id: 't1', name: 'Child', parentId: 'c1' });
    mockStorage.getContainerById.mockReturnValue(container);
    mockStorage.getAllThreads.mockReturnValue([child]);
    mockStorage.getAllContainers.mockReturnValue([container]);
    mockStorage.getAllEntities.mockReturnValue([container, child]);

    await containerCommand.parseAsync(['node', 'test', 'delete', 'c1', '--move', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Target'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('delete_Move_ToSelf_LogsError', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Parent' });
    const child = createMockThread({ id: 't1', name: 'Child', parentId: 'c1' });
    mockStorage.getContainerById.mockReturnValue(container);
    mockStorage.getAllThreads.mockReturnValue([child]);
    mockStorage.getAllContainers.mockReturnValue([container]);
    mockStorage.getAllEntities.mockReturnValue([container, child]);

    await containerCommand.parseAsync(['node', 'test', 'delete', 'c1', '--move', 'c1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('same container'));
  });

  test('delete_Move_ToDescendant_LogsError', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Parent' });
    const childContainer = createMockContainer({ id: 'c2', name: 'Child Container', parentId: 'c1' });
    mockStorage.getContainerById.mockImplementation((id: string) =>
      id === 'c1' ? container : id === 'c2' ? childContainer : undefined
    );
    mockStorage.getAllThreads.mockReturnValue([]);
    mockStorage.getAllContainers.mockReturnValue([container, childContainer]);
    mockStorage.getAllEntities.mockReturnValue([container, childContainer]);

    await containerCommand.parseAsync(['node', 'test', 'delete', 'c1', '--move', 'c2']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('descendant'));
  });

  test('delete_Move_DryRun_ShowsPreview', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Parent' });
    const target = createMockContainer({ id: 'c2', name: 'Target' });
    const child = createMockThread({ id: 't1', name: 'Child', parentId: 'c1' });
    mockStorage.getContainerById.mockImplementation((id: string) =>
      id === 'c1' ? container : id === 'c2' ? target : undefined
    );
    mockStorage.getAllThreads.mockReturnValue([child]);
    mockStorage.getAllContainers.mockReturnValue([container, target]);
    mockStorage.getAllEntities.mockReturnValue([container, target, child]);

    await containerCommand.parseAsync(['node', 'test', 'delete', 'c1', '--move', 'c2', '--dry-run']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Dry run'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 child'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Target'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
    expect(mockStorage.deleteContainer).not.toHaveBeenCalled();
  });

  test('delete_Move_Force_MovesChildrenAndDeletes', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Parent', groupId: 'g1' });
    const target = createMockContainer({ id: 'c2', name: 'Target', groupId: 'g2' });
    const child = createMockThread({ id: 't1', name: 'Child', parentId: 'c1' });
    mockStorage.getContainerById.mockImplementation((id: string) =>
      id === 'c1' ? container : id === 'c2' ? target : undefined
    );
    mockStorage.getAllThreads.mockReturnValue([child]);
    mockStorage.getAllContainers.mockReturnValue([container, target]);
    mockStorage.getAllEntities.mockReturnValue([container, target, child]);

    await containerCommand.parseAsync(['node', 'test', 'delete', 'c1', '--move', 'c2', '-f']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', expect.objectContaining({
      parentId: 'c2',
      groupId: 'g2',
    }));
    expect(mockStorage.deleteContainer).toHaveBeenCalledWith('c1');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Moved'));
  });

  test('delete_Empty_DryRun_ShowsPreview', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Empty' });
    mockStorage.getContainerById.mockReturnValue(container);
    mockStorage.getAllThreads.mockReturnValue([]);
    mockStorage.getAllContainers.mockReturnValue([container]);

    await containerCommand.parseAsync(['node', 'test', 'delete', 'c1', '--dry-run']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Dry run'));
    expect(mockStorage.deleteContainer).not.toHaveBeenCalled();
  });

  test('delete_DeepHierarchy_CascadeDeletesInOrder', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Root' });
    const childContainer = createMockContainer({ id: 'c2', name: 'Child Container', parentId: 'c1' });
    const grandchild = createMockThread({ id: 't1', name: 'Grandchild', parentId: 'c2' });
    mockStorage.getContainerById.mockReturnValue(container);
    mockStorage.getAllThreads.mockReturnValue([grandchild]);
    mockStorage.getAllContainers.mockReturnValue([container, childContainer]);

    await containerCommand.parseAsync(['node', 'test', 'delete', 'c1', '--cascade', '-f']);

    // Should delete deepest first, then container
    const deleteThreadCalls = mockStorage.deleteThread.mock.calls;
    const deleteContainerCalls = mockStorage.deleteContainer.mock.calls;

    // Grandchild should be deleted
    expect(deleteThreadCalls).toContainEqual(['t1']);
    // Child container should be deleted
    expect(deleteContainerCalls).toContainEqual(['c2']);
    // Root container should be deleted
    expect(deleteContainerCalls).toContainEqual(['c1']);
  });
});
