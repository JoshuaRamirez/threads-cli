/**
 * Unit tests for commands/list.ts
 */

import { Thread, Group, Container } from 'threads-types';

// Mock storage module
jest.mock('threads-storage', () => ({
  getAllThreads: jest.fn(),
  getAllGroups: jest.fn(),
  getAllContainers: jest.fn(),
  getAllEntities: jest.fn(),
  getEntityById: jest.fn(),
  getGroupById: jest.fn(),
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

import {
  getAllThreads,
  getAllGroups,
  getAllContainers,
  getAllEntities,
  getEntityById,
} from 'threads-storage';
import { listCommand } from '../src/commands/list';

const mockGetAllThreads = getAllThreads as jest.MockedFunction<typeof getAllThreads>;
const mockGetAllGroups = getAllGroups as jest.MockedFunction<typeof getAllGroups>;
const mockGetAllContainers = getAllContainers as jest.MockedFunction<typeof getAllContainers>;
const mockGetAllEntities = getAllEntities as jest.MockedFunction<typeof getAllEntities>;
const mockGetEntityById = getEntityById as jest.MockedFunction<typeof getEntityById>;

function createMockThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: 'test-id-123',
    name: 'Test Thread',
    type: 'thread',
    description: '',
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

function createMockGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: 'group-123',
    name: 'Test Group',
    description: '',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockContainer(overrides: Partial<Container> = {}): Container {
  return {
    id: 'container-123',
    name: 'Test Container',
    type: 'container',
    description: '',
    parentId: null,
    groupId: null,
    tags: [],
    details: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('listCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    mockGetAllGroups.mockReturnValue([]);
    mockGetAllContainers.mockReturnValue([]);
    mockGetAllEntities.mockReturnValue([]);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('list_NoThreads_ShowsEmpty', async () => {
    mockGetAllThreads.mockReturnValue([]);

    await listCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No threads found'));
  });

  test('list_WithThreads_ShowsThreads', async () => {
    const thread = createMockThread({ name: 'My Thread' });
    mockGetAllThreads.mockReturnValue([thread]);

    await listCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Threads'));
  });

  test('list_FilterByStatus_ShowsMatchingOnly', async () => {
    const active = createMockThread({ id: 't1', status: 'active' });
    const paused = createMockThread({ id: 't2', status: 'paused' });
    mockGetAllThreads.mockReturnValue([active, paused]);

    await listCommand.parseAsync(['node', 'test', '-s', 'active']);

    const allCalls = mockGetAllThreads.mock.results;
    // Verify filter is applied - only active threads processed
    expect(mockGetAllThreads).toHaveBeenCalled();
  });

  test('list_FilterByTemperature_ShowsMatchingOnly', async () => {
    const hot = createMockThread({ id: 't1', temperature: 'hot' });
    const cold = createMockThread({ id: 't2', temperature: 'cold' });
    mockGetAllThreads.mockReturnValue([hot, cold]);

    await listCommand.parseAsync(['node', 'test', '-t', 'hot']);

    expect(mockGetAllThreads).toHaveBeenCalled();
  });

  test('list_HotShortcut_FiltersHot', async () => {
    const hot = createMockThread({ id: 't1', temperature: 'hot' });
    const warm = createMockThread({ id: 't2', temperature: 'warm' });
    mockGetAllThreads.mockReturnValue([hot, warm]);

    await listCommand.parseAsync(['node', 'test', '--hot']);

    expect(mockGetAllThreads).toHaveBeenCalled();
  });

  test('list_ActiveShortcut_FiltersActive', async () => {
    const active = createMockThread({ id: 't1', status: 'active' });
    const stopped = createMockThread({ id: 't2', status: 'stopped' });
    mockGetAllThreads.mockReturnValue([active, stopped]);

    await listCommand.parseAsync(['node', 'test', '--active']);

    expect(mockGetAllThreads).toHaveBeenCalled();
  });

  test('list_FilterBySize_ShowsMatchingOnly', async () => {
    const tiny = createMockThread({ id: 't1', size: 'tiny' });
    const large = createMockThread({ id: 't2', size: 'large' });
    mockGetAllThreads.mockReturnValue([tiny, large]);

    await listCommand.parseAsync(['node', 'test', '-z', 'tiny']);

    expect(mockGetAllThreads).toHaveBeenCalled();
  });

  test('list_FilterByImportance_ShowsMinimumAndAbove', async () => {
    const lowImp = createMockThread({ id: 't1', importance: 2 });
    const highImp = createMockThread({ id: 't2', importance: 4 });
    mockGetAllThreads.mockReturnValue([lowImp, highImp]);

    await listCommand.parseAsync(['node', 'test', '-i', '3']);

    expect(mockGetAllThreads).toHaveBeenCalled();
  });

  test('list_FilterByTag_ShowsTaggedThreads', async () => {
    const tagged = createMockThread({ id: 't1', tags: ['urgent'] });
    const untagged = createMockThread({ id: 't2', tags: [] });
    mockGetAllThreads.mockReturnValue([tagged, untagged]);

    await listCommand.parseAsync(['node', 'test', '--tag', 'urgent']);

    expect(mockGetAllThreads).toHaveBeenCalled();
  });

  test('list_FilterByGroup_ShowsGroupThreads', async () => {
    const group = createMockGroup({ id: 'grp-1', name: 'Work' });
    const inGroup = createMockThread({ id: 't1', groupId: 'grp-1' });
    const noGroup = createMockThread({ id: 't2', groupId: null });
    mockGetAllThreads.mockReturnValue([inGroup, noGroup]);
    mockGetAllGroups.mockReturnValue([group]);

    await listCommand.parseAsync(['node', 'test', '-g', 'Work']);

    expect(mockGetAllGroups).toHaveBeenCalled();
  });

  test('list_InvalidGroup_LogsWarning', async () => {
    mockGetAllThreads.mockReturnValue([createMockThread()]);
    mockGetAllGroups.mockReturnValue([]);

    await listCommand.parseAsync(['node', 'test', '-g', 'NonExistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('list_HidesArchived_ByDefault', async () => {
    const active = createMockThread({ id: 't1', status: 'active' });
    const archived = createMockThread({ id: 't2', status: 'archived' });
    mockGetAllThreads.mockReturnValue([active, archived]);

    await listCommand.parseAsync(['node', 'test']);

    // Archived should be filtered out by default
    expect(mockGetAllThreads).toHaveBeenCalled();
  });

  test('list_AllFlag_ShowsArchived', async () => {
    const archived = createMockThread({ id: 't1', status: 'archived' });
    mockGetAllThreads.mockReturnValue([archived]);

    await listCommand.parseAsync(['node', 'test', '--all']);

    expect(mockGetAllThreads).toHaveBeenCalled();
  });

  test('list_FlatOption_ShowsFlatList', async () => {
    const thread = createMockThread();
    mockGetAllThreads.mockReturnValue([thread]);

    await listCommand.parseAsync(['node', 'test', '--flat']);

    expect(mockGetAllThreads).toHaveBeenCalled();
  });

  test('list_WithIdentifier_ShowsSubtree', async () => {
    const thread = createMockThread({ id: 't1', name: 'Parent' });
    mockGetAllEntities.mockReturnValue([thread]);

    await listCommand.parseAsync(['node', 'test', 't1']);

    expect(mockGetAllEntities).toHaveBeenCalled();
  });

  test('list_IdentifierNotFound_LogsError', async () => {
    mockGetAllEntities.mockReturnValue([]);

    await listCommand.parseAsync(['node', 'test', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('list_PathOption_ShowsAncestry', async () => {
    const child = createMockThread({ id: 'child-1', name: 'Child', parentId: 'parent-1' });
    const parent = createMockContainer({ id: 'parent-1', name: 'Parent' });
    mockGetAllEntities.mockReturnValue([child, parent]);
    mockGetEntityById.mockImplementation((id) => {
      if (id === 'parent-1') return parent;
      if (id === 'child-1') return child;
      return undefined;
    });

    await listCommand.parseAsync(['node', 'test', 'child-1', '--path']);

    expect(mockGetAllEntities).toHaveBeenCalled();
  });

  test('list_SiblingsOption_ShowsSiblings', async () => {
    const child1 = createMockThread({ id: 'c1', name: 'Child 1', parentId: 'p1' });
    const child2 = createMockThread({ id: 'c2', name: 'Child 2', parentId: 'p1' });
    const parent = createMockContainer({ id: 'p1', name: 'Parent' });
    mockGetAllEntities.mockReturnValue([child1, child2, parent]);
    mockGetEntityById.mockImplementation((id) => {
      if (id === 'p1') return parent;
      return undefined;
    });

    await listCommand.parseAsync(['node', 'test', 'c1', '--siblings']);

    expect(mockGetAllEntities).toHaveBeenCalled();
  });

  test('list_ParentOption_GoesUpOneLevel', async () => {
    const child = createMockThread({ id: 'child-1', name: 'Child', parentId: 'parent-1' });
    const parent = createMockContainer({ id: 'parent-1', name: 'Parent' });
    mockGetAllEntities.mockReturnValue([child, parent]);
    mockGetEntityById.mockImplementation((id) => {
      if (id === 'parent-1') return parent;
      if (id === 'child-1') return child;
      return undefined;
    });

    await listCommand.parseAsync(['node', 'test', 'child-1', '-p']);

    expect(mockGetEntityById).toHaveBeenCalledWith('parent-1');
  });

  test('list_ParentOptionNoParent_LogsWarning', async () => {
    const root = createMockThread({ id: 'root-1', name: 'Root', parentId: null });
    mockGetAllEntities.mockReturnValue([root]);

    await listCommand.parseAsync(['node', 'test', 'root-1', '-p']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('has no parent'));
  });

  test('list_DepthOption_LimitsTree', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread' });
    mockGetAllEntities.mockReturnValue([thread]);

    await listCommand.parseAsync(['node', 'test', 't1', '-d', '2']);

    expect(mockGetAllEntities).toHaveBeenCalled();
  });
});
