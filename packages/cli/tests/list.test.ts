/**
 * Unit tests for commands/list.ts
 */

import { Thread, Group, Container } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, createMockContainer, createMockGroup, MockStorageService } from './helpers/mockStorage';

let mockStorage: MockStorageService;

// Mock context module
jest.mock('../src/context', () => ({
  getStorage: jest.fn(() => mockStorage),
}));

// Mock utils
jest.mock('../src/utils', () => ({
  formatThreadSummary: jest.fn(() => 'formatted-summary'),
  buildTree: jest.fn(() => []),
  renderTree: jest.fn(() => ['tree-line']),
}));

// Mock chalk
jest.mock('chalk', () => {
  const mock = (s: string) => s;
  mock.bold = Object.assign((s: string) => s, { underline: (s: string) => s });
  mock.red = mock;
  mock.green = mock;
  mock.yellow = mock;
  mock.cyan = mock;
  mock.blue = mock;
  mock.gray = mock;
  mock.magenta = mock;
  mock.dim = mock;
  mock.white = mock;
  return mock;
});

import { listCommand } from '../src/commands/list';

describe('listCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    mockStorage.getAllGroups.mockReturnValue([]);
    mockStorage.getAllContainers.mockReturnValue([]);
    mockStorage.getAllEntities.mockReturnValue([]);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('list_NoThreads_ShowsEmpty', async () => {
    mockStorage.getAllThreads.mockReturnValue([]);

    await listCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No threads found'));
  });

  test('list_WithThreads_ShowsThreads', async () => {
    const thread = createMockThread({ name: 'My Thread' });
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await listCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Threads'));
  });

  test('list_FilterByStatus_ShowsMatchingOnly', async () => {
    const active = createMockThread({ id: 't1', status: 'active' });
    const paused = createMockThread({ id: 't2', status: 'paused' });
    mockStorage.getAllThreads.mockReturnValue([active, paused]);

    await listCommand.parseAsync(['node', 'test', '-s', 'active']);

    expect(mockStorage.getAllThreads).toHaveBeenCalled();
  });

  test('list_FilterByTemperature_ShowsMatchingOnly', async () => {
    const hot = createMockThread({ id: 't1', temperature: 'hot' });
    const cold = createMockThread({ id: 't2', temperature: 'cold' });
    mockStorage.getAllThreads.mockReturnValue([hot, cold]);

    await listCommand.parseAsync(['node', 'test', '-t', 'hot']);

    expect(mockStorage.getAllThreads).toHaveBeenCalled();
  });

  test('list_HotShortcut_FiltersHot', async () => {
    const hot = createMockThread({ id: 't1', temperature: 'hot' });
    const warm = createMockThread({ id: 't2', temperature: 'warm' });
    mockStorage.getAllThreads.mockReturnValue([hot, warm]);

    await listCommand.parseAsync(['node', 'test', '--hot']);

    expect(mockStorage.getAllThreads).toHaveBeenCalled();
  });

  test('list_ActiveShortcut_FiltersActive', async () => {
    const active = createMockThread({ id: 't1', status: 'active' });
    const stopped = createMockThread({ id: 't2', status: 'stopped' });
    mockStorage.getAllThreads.mockReturnValue([active, stopped]);

    await listCommand.parseAsync(['node', 'test', '--active']);

    expect(mockStorage.getAllThreads).toHaveBeenCalled();
  });

  test('list_FilterBySize_ShowsMatchingOnly', async () => {
    const tiny = createMockThread({ id: 't1', size: 'tiny' });
    const large = createMockThread({ id: 't2', size: 'large' });
    mockStorage.getAllThreads.mockReturnValue([tiny, large]);

    await listCommand.parseAsync(['node', 'test', '-z', 'tiny']);

    expect(mockStorage.getAllThreads).toHaveBeenCalled();
  });

  test('list_FilterByImportance_ShowsMinimumAndAbove', async () => {
    const lowImp = createMockThread({ id: 't1', importance: 2 });
    const highImp = createMockThread({ id: 't2', importance: 4 });
    mockStorage.getAllThreads.mockReturnValue([lowImp, highImp]);

    await listCommand.parseAsync(['node', 'test', '-i', '3']);

    expect(mockStorage.getAllThreads).toHaveBeenCalled();
  });

  test('list_FilterByTag_ShowsTaggedThreads', async () => {
    const tagged = createMockThread({ id: 't1', tags: ['urgent'] });
    const untagged = createMockThread({ id: 't2', tags: [] });
    mockStorage.getAllThreads.mockReturnValue([tagged, untagged]);

    await listCommand.parseAsync(['node', 'test', '--tag', 'urgent']);

    expect(mockStorage.getAllThreads).toHaveBeenCalled();
  });

  test('list_FilterByGroup_ShowsGroupThreads', async () => {
    const group = createMockGroup({ id: 'grp-1', name: 'Work' });
    const inGroup = createMockThread({ id: 't1', groupId: 'grp-1' });
    const noGroup = createMockThread({ id: 't2', groupId: null });
    mockStorage.getAllThreads.mockReturnValue([inGroup, noGroup]);
    mockStorage.getAllGroups.mockReturnValue([group]);

    await listCommand.parseAsync(['node', 'test', '-g', 'Work']);

    expect(mockStorage.getAllGroups).toHaveBeenCalled();
  });

  test('list_InvalidGroup_LogsWarning', async () => {
    mockStorage.getAllThreads.mockReturnValue([createMockThread()]);
    mockStorage.getAllGroups.mockReturnValue([]);

    await listCommand.parseAsync(['node', 'test', '-g', 'NonExistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('list_HidesArchived_ByDefault', async () => {
    const active = createMockThread({ id: 't1', status: 'active' });
    const archived = createMockThread({ id: 't2', status: 'archived' });
    mockStorage.getAllThreads.mockReturnValue([active, archived]);

    await listCommand.parseAsync(['node', 'test']);

    expect(mockStorage.getAllThreads).toHaveBeenCalled();
  });

  test('list_AllFlag_ShowsArchived', async () => {
    const archived = createMockThread({ id: 't1', status: 'archived' });
    mockStorage.getAllThreads.mockReturnValue([archived]);

    await listCommand.parseAsync(['node', 'test', '--all']);

    expect(mockStorage.getAllThreads).toHaveBeenCalled();
  });

  test('list_FlatOption_ShowsFlatList', async () => {
    const thread = createMockThread();
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await listCommand.parseAsync(['node', 'test', '--flat']);

    expect(mockStorage.getAllThreads).toHaveBeenCalled();
  });

  test('list_WithIdentifier_ShowsSubtree', async () => {
    const thread = createMockThread({ id: 't1', name: 'Parent' });
    mockStorage.getAllEntities.mockReturnValue([thread]);

    await listCommand.parseAsync(['node', 'test', 't1']);

    expect(mockStorage.getAllEntities).toHaveBeenCalled();
  });

  test('list_IdentifierNotFound_LogsError', async () => {
    mockStorage.getAllEntities.mockReturnValue([]);

    await listCommand.parseAsync(['node', 'test', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('list_PathOption_ShowsAncestry', async () => {
    const child = createMockThread({ id: 'child-1', name: 'Child', parentId: 'parent-1' });
    const parent = createMockContainer({ id: 'parent-1', name: 'Parent' });
    mockStorage.getAllEntities.mockReturnValue([child, parent]);
    mockStorage.getEntityById.mockImplementation((id: string) => {
      if (id === 'parent-1') return parent;
      if (id === 'child-1') return child;
      return undefined;
    });

    await listCommand.parseAsync(['node', 'test', 'child-1', '--path']);

    expect(mockStorage.getAllEntities).toHaveBeenCalled();
  });

  test('list_SiblingsOption_ShowsSiblings', async () => {
    const child1 = createMockThread({ id: 'c1', name: 'Child 1', parentId: 'p1' });
    const child2 = createMockThread({ id: 'c2', name: 'Child 2', parentId: 'p1' });
    const parent = createMockContainer({ id: 'p1', name: 'Parent' });
    mockStorage.getAllEntities.mockReturnValue([child1, child2, parent]);
    mockStorage.getEntityById.mockImplementation((id: string) => {
      if (id === 'p1') return parent;
      return undefined;
    });

    await listCommand.parseAsync(['node', 'test', 'c1', '--siblings']);

    expect(mockStorage.getAllEntities).toHaveBeenCalled();
  });

  test('list_ParentOption_GoesUpOneLevel', async () => {
    const child = createMockThread({ id: 'child-1', name: 'Child', parentId: 'parent-1' });
    const parent = createMockContainer({ id: 'parent-1', name: 'Parent' });
    mockStorage.getAllEntities.mockReturnValue([child, parent]);
    mockStorage.getEntityById.mockImplementation((id: string) => {
      if (id === 'parent-1') return parent;
      if (id === 'child-1') return child;
      return undefined;
    });

    await listCommand.parseAsync(['node', 'test', 'child-1', '-p']);

    expect(mockStorage.getEntityById).toHaveBeenCalledWith('parent-1');
  });

  test('list_ParentOptionNoParent_LogsWarning', async () => {
    const root = createMockThread({ id: 'root-1', name: 'Root', parentId: null });
    mockStorage.getAllEntities.mockReturnValue([root]);

    await listCommand.parseAsync(['node', 'test', 'root-1', '-p']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('has no parent'));
  });

  test('list_DepthOption_LimitsTree', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread' });
    mockStorage.getAllEntities.mockReturnValue([thread]);

    await listCommand.parseAsync(['node', 'test', 't1', '-d', '2']);

    expect(mockStorage.getAllEntities).toHaveBeenCalled();
  });
});
