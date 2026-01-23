/**
 * Unit tests for commands/container.ts
 */

import { Container, Thread, Group, Entity } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, createMockContainer, createMockGroup, MockStorageService } from './helpers/mockStorage';

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

// Create mock storage instance
let mockStorage: MockStorageService;

// Mock context module to return our mock storage
jest.mock('../src/context', () => ({
  getStorage: jest.fn(() => mockStorage),
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

import { containerCommand } from '../src/commands/container';

describe('containerCommand', () => {
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

  describe('list action', () => {
    test('list_NoContainers_LogsNoContainers', async () => {
      mockStorage.getAllContainers.mockReturnValue([]);
      mockStorage.getAllGroups.mockReturnValue([]);
      mockStorage.getAllThreads.mockReturnValue([]);

      await containerCommand.parseAsync(['node', 'test']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No containers'));
    });

    test('list_WithContainers_DisplaysContainers', async () => {
      mockStorage.getAllContainers.mockReturnValue([createMockContainer()]);
      mockStorage.getAllGroups.mockReturnValue([]);
      mockStorage.getAllThreads.mockReturnValue([]);

      await containerCommand.parseAsync(['node', 'test', 'list']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Containers'));
    });
  });

  describe('new action', () => {
    test('new_ValidName_CreatesContainer', async () => {
      mockStorage.getContainerByName.mockReturnValue(undefined);

      await containerCommand.parseAsync(['node', 'test', 'new', 'My Container']);

      expect(mockStorage.addContainer).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Container', type: 'container' })
      );
    });

    test('new_DuplicateName_LogsError', async () => {
      mockStorage.getContainerByName.mockReturnValue(createMockContainer());

      await containerCommand.parseAsync(['node', 'test', 'new', 'Existing']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'));
      expect(mockStorage.addContainer).not.toHaveBeenCalled();
    });

    test('new_WithGroup_SetsGroupId', async () => {
      mockStorage.getContainerByName.mockReturnValue(undefined);
      mockStorage.getGroupByName.mockReturnValue(createMockGroup({ id: 'grp-1' }));

      await containerCommand.parseAsync(['node', 'test', 'new', 'Container', '-g', 'Group']);

      expect(mockStorage.addContainer).toHaveBeenCalledWith(
        expect.objectContaining({ groupId: 'grp-1' })
      );
    });

    test('new_WithParent_SetsParentId', async () => {
      const parent = createMockContainer({ id: 'parent-1' });
      mockStorage.getContainerByName.mockReturnValue(undefined);
      mockStorage.getAllEntities.mockReturnValue([parent]);

      await containerCommand.parseAsync(['node', 'test', 'new', 'Container', '-p', 'parent-1']);

      expect(mockStorage.addContainer).toHaveBeenCalledWith(
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
      mockStorage.getContainerById.mockReturnValue(container);

      await containerCommand.parseAsync(['node', 'test', 'show', 'c1']);

      expect(consoleSpy).toHaveBeenCalledWith('formatted-container-detail');
    });

    test('show_NotFound_LogsError', async () => {
      mockStorage.getContainerById.mockReturnValue(undefined);
      mockStorage.getContainerByName.mockReturnValue(undefined);
      mockStorage.getAllContainers.mockReturnValue([]);

      await containerCommand.parseAsync(['node', 'test', 'show', 'nonexistent']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });
  });

  describe('update action', () => {
    test('update_WithDescription_UpdatesDescription', async () => {
      const container = createMockContainer({ id: 'c1' });
      mockStorage.getContainerById.mockReturnValue(container);
      mockStorage.getAllThreads.mockReturnValue([]);
      mockStorage.getAllContainers.mockReturnValue([container]);

      await containerCommand.parseAsync(['node', 'test', 'update', 'c1', '-d', 'New desc']);

      expect(mockStorage.updateContainer).toHaveBeenCalledWith('c1', expect.objectContaining({
        description: 'New desc',
      }));
    });

    test('update_NoUpdates_LogsWarning', async () => {
      const container = createMockContainer({ id: 'c1' });
      mockStorage.getContainerById.mockReturnValue(container);

      await containerCommand.parseAsync(['node', 'test', 'update', 'c1']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No updates'));
    });

    test('update_NotFound_LogsError', async () => {
      mockStorage.getContainerById.mockReturnValue(undefined);
      mockStorage.getContainerByName.mockReturnValue(undefined);
      mockStorage.getAllContainers.mockReturnValue([]);

      await containerCommand.parseAsync(['node', 'test', 'update', 'nonexistent', '-d', 'desc']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });
  });

  describe('delete action', () => {
    test('delete_NoChildren_DeletesContainer', async () => {
      const container = createMockContainer({ id: 'c1' });
      mockStorage.getContainerById.mockReturnValue(container);
      mockStorage.getAllThreads.mockReturnValue([]);
      mockStorage.getAllContainers.mockReturnValue([container]);

      await containerCommand.parseAsync(['node', 'test', 'delete', 'c1']);

      expect(mockStorage.deleteContainer).toHaveBeenCalledWith('c1');
    });

    test('delete_WithChildren_ShowsOptions', async () => {
      const container = createMockContainer({ id: 'c1' });
      const child = createMockThread({ id: 't1', parentId: 'c1' });
      mockStorage.getContainerById.mockReturnValue(container);
      mockStorage.getAllThreads.mockReturnValue([child]);
      mockStorage.getAllContainers.mockReturnValue([container]);

      await containerCommand.parseAsync(['node', 'test', 'delete', 'c1']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('has children'));
      expect(mockStorage.deleteContainer).not.toHaveBeenCalled();
    });

    test('delete_WithDryRun_DoesNotDelete', async () => {
      const container = createMockContainer({ id: 'c1' });
      mockStorage.getContainerById.mockReturnValue(container);
      mockStorage.getAllThreads.mockReturnValue([]);
      mockStorage.getAllContainers.mockReturnValue([container]);

      await containerCommand.parseAsync(['node', 'test', 'delete', 'c1', '--dry-run']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Dry run'));
      expect(mockStorage.deleteContainer).not.toHaveBeenCalled();
    });

    test('delete_NotFound_LogsError', async () => {
      mockStorage.getContainerById.mockReturnValue(undefined);
      mockStorage.getContainerByName.mockReturnValue(undefined);
      mockStorage.getAllContainers.mockReturnValue([]);

      await containerCommand.parseAsync(['node', 'test', 'delete', 'nonexistent']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });
  });

  test('unknownAction_LogsError', async () => {
    await containerCommand.parseAsync(['node', 'test', 'unknown']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown action'));
  });
});
