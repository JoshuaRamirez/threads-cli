/**
 * Unit tests for commands/container.ts
 */

import { Container, Thread, Group, Entity } from '../src/models/types';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'new-container-uuid'),
}));

// Mock readline for confirmAction
jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    question: jest.fn((_, callback) => callback('n')),
    close: jest.fn(),
  })),
}));

// Mock storage module
jest.mock('../src/storage', () => ({
  getAllContainers: jest.fn(),
  getContainerById: jest.fn(),
  getContainerByName: jest.fn(),
  addContainer: jest.fn(),
  updateContainer: jest.fn(),
  deleteContainer: jest.fn(),
  getAllGroups: jest.fn(),
  getGroupByName: jest.fn(),
  getAllThreads: jest.fn(),
  getAllEntities: jest.fn(),
  updateThread: jest.fn(),
  deleteThread: jest.fn(),
}));

// Mock utils
jest.mock('../src/utils', () => ({
  formatContainerDetail: jest.fn(() => 'formatted-container-detail'),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((s: string) => s),
  green: jest.fn((s: string) => s),
  yellow: jest.fn((s: string) => s),
  cyan: jest.fn((s: string) => s),
  gray: jest.fn((s: string) => s),
  dim: jest.fn((s: string) => s),
  bold: jest.fn((s: string) => s),
  magenta: jest.fn((s: string) => s),
  blue: jest.fn((s: string) => s),
}));

import {
  getAllContainers,
  getContainerById,
  getContainerByName,
  addContainer,
  updateContainer,
  deleteContainer,
  getAllGroups,
  getGroupByName,
  getAllThreads,
  getAllEntities,
  updateThread,
} from '../src/storage';
import { containerCommand } from '../src/commands/container';

const mockGetAllContainers = getAllContainers as jest.MockedFunction<typeof getAllContainers>;
const mockGetContainerById = getContainerById as jest.MockedFunction<typeof getContainerById>;
const mockGetContainerByName = getContainerByName as jest.MockedFunction<typeof getContainerByName>;
const mockAddContainer = addContainer as jest.MockedFunction<typeof addContainer>;
const mockUpdateContainer = updateContainer as jest.MockedFunction<typeof updateContainer>;
const mockDeleteContainer = deleteContainer as jest.MockedFunction<typeof deleteContainer>;
const mockGetAllGroups = getAllGroups as jest.MockedFunction<typeof getAllGroups>;
const mockGetGroupByName = getGroupByName as jest.MockedFunction<typeof getGroupByName>;
const mockGetAllThreads = getAllThreads as jest.MockedFunction<typeof getAllThreads>;
const mockGetAllEntities = getAllEntities as jest.MockedFunction<typeof getAllEntities>;
const mockUpdateThread = updateThread as jest.MockedFunction<typeof updateThread>;

function createMockContainer(overrides: Partial<Container> = {}): Container {
  return {
    type: 'container',
    id: 'container-123',
    name: 'Test Container',
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

function createMockThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: 'thread-123',
    name: 'Test Thread',
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

describe('containerCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.useRealTimers();
  });

  describe('list action', () => {
    test('list_NoContainers_LogsNoContainers', async () => {
      mockGetAllContainers.mockReturnValue([]);
      mockGetAllGroups.mockReturnValue([]);
      mockGetAllThreads.mockReturnValue([]);

      await containerCommand.parseAsync(['node', 'test']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No containers'));
    });

    test('list_WithContainers_DisplaysContainers', async () => {
      mockGetAllContainers.mockReturnValue([createMockContainer()]);
      mockGetAllGroups.mockReturnValue([]);
      mockGetAllThreads.mockReturnValue([]);

      await containerCommand.parseAsync(['node', 'test', 'list']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Containers'));
    });
  });

  describe('new action', () => {
    test('new_ValidName_CreatesContainer', async () => {
      mockGetContainerByName.mockReturnValue(undefined);

      await containerCommand.parseAsync(['node', 'test', 'new', 'My Container']);

      expect(mockAddContainer).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Container', type: 'container' })
      );
    });

    test('new_DuplicateName_LogsError', async () => {
      mockGetContainerByName.mockReturnValue(createMockContainer());

      await containerCommand.parseAsync(['node', 'test', 'new', 'Existing']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'));
      expect(mockAddContainer).not.toHaveBeenCalled();
    });

    test('new_WithGroup_SetsGroupId', async () => {
      mockGetContainerByName.mockReturnValue(undefined);
      mockGetGroupByName.mockReturnValue(createMockGroup({ id: 'grp-1' }));

      await containerCommand.parseAsync(['node', 'test', 'new', 'Container', '-g', 'Group']);

      expect(mockAddContainer).toHaveBeenCalledWith(
        expect.objectContaining({ groupId: 'grp-1' })
      );
    });

    test('new_WithParent_SetsParentId', async () => {
      const parent = createMockContainer({ id: 'parent-1' });
      mockGetContainerByName.mockReturnValue(undefined);
      mockGetAllEntities.mockReturnValue([parent]);

      await containerCommand.parseAsync(['node', 'test', 'new', 'Container', '-p', 'parent-1']);

      expect(mockAddContainer).toHaveBeenCalledWith(
        expect.objectContaining({ parentId: 'parent-1' })
      );
    });

    test('new_NoName_LogsUsage', async () => {
      await containerCommand.parseAsync(['node', 'test', 'new']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Usage'));
    });
  });

  describe('show action', () => {
    test('show_ValidContainer_DisplaysDetail', async () => {
      const container = createMockContainer({ id: 'c1' });
      mockGetContainerById.mockReturnValue(container);

      await containerCommand.parseAsync(['node', 'test', 'show', 'c1']);

      expect(consoleSpy).toHaveBeenCalledWith('formatted-container-detail');
    });

    test('show_NotFound_LogsError', async () => {
      mockGetContainerById.mockReturnValue(undefined);
      mockGetContainerByName.mockReturnValue(undefined);
      mockGetAllContainers.mockReturnValue([]);

      await containerCommand.parseAsync(['node', 'test', 'show', 'nonexistent']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });
  });

  describe('update action', () => {
    test('update_WithDescription_UpdatesDescription', async () => {
      const container = createMockContainer({ id: 'c1' });
      mockGetContainerById.mockReturnValue(container);
      mockGetAllThreads.mockReturnValue([]);
      mockGetAllContainers.mockReturnValue([container]);

      await containerCommand.parseAsync(['node', 'test', 'update', 'c1', '-d', 'New desc']);

      expect(mockUpdateContainer).toHaveBeenCalledWith('c1', expect.objectContaining({
        description: 'New desc',
      }));
    });

    test('update_NoUpdates_LogsWarning', async () => {
      const container = createMockContainer({ id: 'c1' });
      mockGetContainerById.mockReturnValue(container);

      await containerCommand.parseAsync(['node', 'test', 'update', 'c1']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No updates'));
    });

    test('update_NotFound_LogsError', async () => {
      mockGetContainerById.mockReturnValue(undefined);
      mockGetContainerByName.mockReturnValue(undefined);
      mockGetAllContainers.mockReturnValue([]);

      await containerCommand.parseAsync(['node', 'test', 'update', 'nonexistent', '-d', 'desc']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });
  });

  describe('delete action', () => {
    test('delete_NoChildren_DeletesContainer', async () => {
      const container = createMockContainer({ id: 'c1' });
      mockGetContainerById.mockReturnValue(container);
      mockGetAllThreads.mockReturnValue([]);
      mockGetAllContainers.mockReturnValue([container]);

      await containerCommand.parseAsync(['node', 'test', 'delete', 'c1']);

      expect(mockDeleteContainer).toHaveBeenCalledWith('c1');
    });

    test('delete_WithChildren_ShowsOptions', async () => {
      const container = createMockContainer({ id: 'c1' });
      const child = createMockThread({ id: 't1', parentId: 'c1' });
      mockGetContainerById.mockReturnValue(container);
      mockGetAllThreads.mockReturnValue([child]);
      mockGetAllContainers.mockReturnValue([container]);

      await containerCommand.parseAsync(['node', 'test', 'delete', 'c1']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('has children'));
      expect(mockDeleteContainer).not.toHaveBeenCalled();
    });

    test('delete_WithDryRun_DoesNotDelete', async () => {
      const container = createMockContainer({ id: 'c1' });
      mockGetContainerById.mockReturnValue(container);
      mockGetAllThreads.mockReturnValue([]);
      mockGetAllContainers.mockReturnValue([container]);

      await containerCommand.parseAsync(['node', 'test', 'delete', 'c1', '--dry-run']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Dry run'));
      expect(mockDeleteContainer).not.toHaveBeenCalled();
    });

    test('delete_NotFound_LogsError', async () => {
      mockGetContainerById.mockReturnValue(undefined);
      mockGetContainerByName.mockReturnValue(undefined);
      mockGetAllContainers.mockReturnValue([]);

      await containerCommand.parseAsync(['node', 'test', 'delete', 'nonexistent']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });
  });

  test('unknownAction_LogsError', async () => {
    await containerCommand.parseAsync(['node', 'test', 'unknown']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown action'));
  });
});
