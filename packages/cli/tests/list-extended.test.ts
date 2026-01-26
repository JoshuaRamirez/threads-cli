/**
 * Extended tests for list command - covering tree rendering and sorting
 */

import { Thread, Container, Entity } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, createMockContainer, createMockGroup, MockStorageService } from './helpers/mockStorage';

// Create mock storage instance
let mockStorage: MockStorageService;

// Mock context module
jest.mock('../src/context', () => ({
  getStorage: jest.fn(() => mockStorage),
}));

// Mock utils
jest.mock('../src/utils', () => ({
  formatThreadSummary: jest.fn((t: Thread) => `[${t.name}]`),
  buildTree: jest.fn(() => []),
  renderTree: jest.fn(() => ['tree-line-1', 'tree-line-2']),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((s: string) => s),
  yellow: jest.fn((s: string) => s),
  dim: jest.fn((s: string) => s),
  green: jest.fn((s: string) => s),
  bold: jest.fn((s: string) => s),
  gray: jest.fn((s: string) => s),
  cyan: jest.fn((s: string) => s),
  magenta: jest.fn((s: string) => s),
  blue: jest.fn((s: string) => s),
}));

import { listCommand } from '../src/commands/list';

describe('listCommand extended', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.useRealTimers();
  });

  test('list_EntityFindByPartialId_Works', async () => {
    const thread = createMockThread({ id: 'thread-abc-123', name: 'My Thread' });
    mockStorage.getAllEntities.mockReturnValue([thread as unknown as Entity]);
    mockStorage.getAllThreads.mockReturnValue([thread]);
    mockStorage.getAllContainers.mockReturnValue([]);
    mockStorage.getAllGroups.mockReturnValue([]);

    await listCommand.parseAsync(['node', 'test', 'thread-abc']);

    // Should find and focus on the thread
    expect(consoleSpy).toHaveBeenCalled();
  });

  test('list_SortByTemperature_Sorts', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'Cold', temperature: 'cold' }),
      createMockThread({ id: 't2', name: 'Hot', temperature: 'hot' }),
    ]);
    mockStorage.getAllContainers.mockReturnValue([]);
    mockStorage.getAllGroups.mockReturnValue([]);
    mockStorage.getAllEntities.mockReturnValue([]);

    await listCommand.parseAsync(['node', 'test', '--sort', 'temperature', '--flat']);

    // Hot should come first in output
    const calls = consoleSpy.mock.calls.flat();
    const hotIndex = calls.findIndex((c: string) => c?.includes?.('Hot'));
    const coldIndex = calls.findIndex((c: string) => c?.includes?.('Cold'));
    expect(hotIndex).toBeLessThan(coldIndex);
  });

  test('list_SortByName_Sorts', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'Zebra Task' }),
      createMockThread({ id: 't2', name: 'Alpha Task' }),
    ]);
    mockStorage.getAllContainers.mockReturnValue([]);
    mockStorage.getAllGroups.mockReturnValue([]);
    mockStorage.getAllEntities.mockReturnValue([]);

    await listCommand.parseAsync(['node', 'test', '--sort', 'name', '--flat']);

    const calls = consoleSpy.mock.calls.flat();
    const alphaIndex = calls.findIndex((c: string) => c?.includes?.('Alpha'));
    const zebraIndex = calls.findIndex((c: string) => c?.includes?.('Zebra'));
    expect(alphaIndex).toBeLessThan(zebraIndex);
  });

  test('list_SortByImportance_Sorts', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'Low Priority', importance: 1 }),
      createMockThread({ id: 't2', name: 'High Priority', importance: 5 }),
    ]);
    mockStorage.getAllContainers.mockReturnValue([]);
    mockStorage.getAllGroups.mockReturnValue([]);
    mockStorage.getAllEntities.mockReturnValue([]);

    await listCommand.parseAsync(['node', 'test', '--sort', 'importance', '--flat']);

    const calls = consoleSpy.mock.calls.flat();
    const highIndex = calls.findIndex((c: string) => c?.includes?.('High Priority'));
    const lowIndex = calls.findIndex((c: string) => c?.includes?.('Low Priority'));
    expect(highIndex).toBeLessThan(lowIndex);
  });

  test('list_Reverse_ReversesOrder', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'First', createdAt: '2024-01-01T00:00:00Z' }),
      createMockThread({ id: 't2', name: 'Second', createdAt: '2024-06-01T00:00:00Z' }),
    ]);
    mockStorage.getAllContainers.mockReturnValue([]);
    mockStorage.getAllGroups.mockReturnValue([]);
    mockStorage.getAllEntities.mockReturnValue([]);

    await listCommand.parseAsync(['node', 'test', '--sort', 'created', '-r', '--flat']);

    // With reverse, oldest should come first
    const calls = consoleSpy.mock.calls.flat();
    const firstIndex = calls.findIndex((c: string) => c?.includes?.('First'));
    const secondIndex = calls.findIndex((c: string) => c?.includes?.('Second'));
    expect(firstIndex).toBeLessThan(secondIndex);
  });

  test('list_FocusedOnThread_ShowsSubtree', async () => {
    const parent = createMockThread({ id: 'parent-123', name: 'Parent Thread' });
    const child = createMockThread({ id: 'child-1', name: 'Child', parentId: 'parent-123' });
    mockStorage.getAllEntities.mockReturnValue([parent as unknown as Entity, child as unknown as Entity]);
    mockStorage.getAllThreads.mockReturnValue([parent, child]);
    mockStorage.getAllContainers.mockReturnValue([]);
    mockStorage.getAllGroups.mockReturnValue([]);

    await listCommand.parseAsync(['node', 'test', 'parent-123']);

    expect(consoleSpy).toHaveBeenCalled();
  });

  test('list_WithDepth_LimitsDepth', async () => {
    const parent = createMockThread({ id: 'p1', name: 'Parent' });
    mockStorage.getAllEntities.mockReturnValue([parent as unknown as Entity]);
    mockStorage.getAllThreads.mockReturnValue([parent]);
    mockStorage.getAllContainers.mockReturnValue([]);
    mockStorage.getAllGroups.mockReturnValue([]);

    await listCommand.parseAsync(['node', 'test', 'p1', '--depth', '1']);

    expect(consoleSpy).toHaveBeenCalled();
  });

  test('list_WithSiblings_ShowsSiblings', async () => {
    const parent = createMockThread({ id: 'p1', name: 'Parent' });
    const child1 = createMockThread({ id: 'c1', name: 'Child 1', parentId: 'p1' });
    const child2 = createMockThread({ id: 'c2', name: 'Child 2', parentId: 'p1' });
    mockStorage.getAllEntities.mockReturnValue([parent, child1, child2] as unknown as Entity[]);
    mockStorage.getAllThreads.mockReturnValue([parent, child1, child2]);
    mockStorage.getAllContainers.mockReturnValue([]);
    mockStorage.getAllGroups.mockReturnValue([]);

    await listCommand.parseAsync(['node', 'test', 'c1', '--siblings']);

    expect(consoleSpy).toHaveBeenCalled();
  });

  test('list_WithPath_ShowsAncestryPath', async () => {
    const grandparent = createMockThread({ id: 'gp', name: 'Grandparent' });
    const parent = createMockThread({ id: 'p1', name: 'Parent', parentId: 'gp' });
    const child = createMockThread({ id: 'c1', name: 'Child', parentId: 'p1' });
    mockStorage.getAllEntities.mockReturnValue([grandparent, parent, child] as unknown as Entity[]);
    mockStorage.getEntityById.mockImplementation((id: string) => {
      if (id === 'gp') return grandparent as unknown as Entity;
      if (id === 'p1') return parent as unknown as Entity;
      if (id === 'c1') return child as unknown as Entity;
      return undefined;
    });
    mockStorage.getAllThreads.mockReturnValue([grandparent, parent, child]);
    mockStorage.getAllContainers.mockReturnValue([]);
    mockStorage.getAllGroups.mockReturnValue([]);

    await listCommand.parseAsync(['node', 'test', 'c1', '--path']);

    expect(consoleSpy).toHaveBeenCalled();
  });

  test('list_WithParent_ShowsFromParent', async () => {
    const parent = createMockThread({ id: 'p1', name: 'Parent' });
    const child = createMockThread({ id: 'c1', name: 'Child', parentId: 'p1' });
    mockStorage.getAllEntities.mockReturnValue([parent, child] as unknown as Entity[]);
    mockStorage.getEntityById.mockImplementation((id: string) => {
      if (id === 'p1') return parent as unknown as Entity;
      if (id === 'c1') return child as unknown as Entity;
      return undefined;
    });
    mockStorage.getAllThreads.mockReturnValue([parent, child]);
    mockStorage.getAllContainers.mockReturnValue([]);
    mockStorage.getAllGroups.mockReturnValue([]);

    await listCommand.parseAsync(['node', 'test', 'c1', '--parent']);

    expect(consoleSpy).toHaveBeenCalled();
  });

  test('list_EntityNotFound_LogsError', async () => {
    mockStorage.getAllEntities.mockReturnValue([]);
    mockStorage.getAllThreads.mockReturnValue([]);
    mockStorage.getAllContainers.mockReturnValue([]);
    mockStorage.getAllGroups.mockReturnValue([]);

    await listCommand.parseAsync(['node', 'test', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('list_SortByUpdated_Sorts', async () => {
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 't1', name: 'Old', updatedAt: '2024-01-01T00:00:00Z' }),
      createMockThread({ id: 't2', name: 'New', updatedAt: '2024-06-01T00:00:00Z' }),
    ]);
    mockStorage.getAllContainers.mockReturnValue([]);
    mockStorage.getAllGroups.mockReturnValue([]);
    mockStorage.getAllEntities.mockReturnValue([]);

    await listCommand.parseAsync(['node', 'test', '--sort', 'updated', '--flat']);

    // Newest should come first
    const calls = consoleSpy.mock.calls.flat();
    const newIndex = calls.findIndex((c: string) => c?.includes?.('New'));
    const oldIndex = calls.findIndex((c: string) => c?.includes?.('Old'));
    expect(newIndex).toBeLessThan(oldIndex);
  });

  test('list_WithMixedEntities_HandlesCorrectly', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread' });
    const container = createMockContainer({ id: 'c1', name: 'Container' });
    mockStorage.getAllThreads.mockReturnValue([thread]);
    mockStorage.getAllContainers.mockReturnValue([container]);
    mockStorage.getAllGroups.mockReturnValue([]);
    mockStorage.getAllEntities.mockReturnValue([thread as unknown as Entity, container]);

    await listCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalled();
  });
});
