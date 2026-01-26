/**
 * Tests for container new/show/update/list actions in commands/container.ts
 */

import { Container, Thread, Group, Entity } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, createMockContainer, createMockGroup, MockStorageService } from './helpers/mockStorage';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'new-container-uuid'),
}));

// Create mock storage instance
let mockStorage: MockStorageService;

// Mock context module
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
  yellow: jest.fn((s: string) => s),
  dim: jest.fn((s: string) => s),
  bold: jest.fn((s: string) => s),
  cyan: jest.fn((s: string) => s),
  green: jest.fn((s: string) => s),
  magenta: jest.fn((s: string) => s),
  gray: jest.fn((s: string) => s),
}));

import { containerCommand } from '../src/commands/container';

describe('containerCommand list', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('list_NoContainers_LogsMessage', async () => {
    mockStorage.getAllContainers.mockReturnValue([]);

    await containerCommand.parseAsync(['node', 'test', 'list']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No containers'));
  });

  test('list_WithContainers_DisplaysList', async () => {
    mockStorage.getAllContainers.mockReturnValue([
      createMockContainer({ id: 'c1', name: 'Container 1' }),
    ]);
    mockStorage.getAllGroups.mockReturnValue([]);
    mockStorage.getAllThreads.mockReturnValue([]);

    await containerCommand.parseAsync(['node', 'test', 'list']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Container 1'));
  });

  test('list_Default_ShowsList', async () => {
    mockStorage.getAllContainers.mockReturnValue([
      createMockContainer({ id: 'c1', name: 'Container 1' }),
    ]);
    mockStorage.getAllGroups.mockReturnValue([]);
    mockStorage.getAllThreads.mockReturnValue([]);

    await containerCommand.parseAsync(['node', 'test']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Container 1'));
  });

  test('list_WithGroup_ShowsGroupLabel', async () => {
    const group = createMockGroup({ id: 'g1', name: 'My Group' });
    mockStorage.getAllContainers.mockReturnValue([
      createMockContainer({ id: 'c1', name: 'Container 1', groupId: 'g1' }),
    ]);
    mockStorage.getAllGroups.mockReturnValue([group]);
    mockStorage.getAllThreads.mockReturnValue([]);

    await containerCommand.parseAsync(['node', 'test', 'list']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('My Group'));
  });

  test('list_WithChildren_ShowsChildCount', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Parent Container' });
    const child = createMockThread({ id: 't1', name: 'Child Thread', parentId: 'c1' });
    mockStorage.getAllContainers.mockReturnValue([container]);
    mockStorage.getAllGroups.mockReturnValue([]);
    mockStorage.getAllThreads.mockReturnValue([child]);

    await containerCommand.parseAsync(['node', 'test', 'list']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 children'));
  });

  test('list_WithTags_ShowsTags', async () => {
    mockStorage.getAllContainers.mockReturnValue([
      createMockContainer({ id: 'c1', name: 'Tagged', tags: ['important', 'urgent'] }),
    ]);
    mockStorage.getAllGroups.mockReturnValue([]);
    mockStorage.getAllThreads.mockReturnValue([]);

    await containerCommand.parseAsync(['node', 'test', 'list']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('#important'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('#urgent'));
  });

  test('list_WithDescription_ShowsDescription', async () => {
    mockStorage.getAllContainers.mockReturnValue([
      createMockContainer({ id: 'c1', name: 'Container', description: 'A detailed description' }),
    ]);
    mockStorage.getAllGroups.mockReturnValue([]);
    mockStorage.getAllThreads.mockReturnValue([]);

    await containerCommand.parseAsync(['node', 'test', 'list']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('A detailed description'));
  });

  test('list_WithLimit_LimitsResults', async () => {
    mockStorage.getAllContainers.mockReturnValue([
      createMockContainer({ id: 'c1', name: 'Container 1' }),
      createMockContainer({ id: 'c2', name: 'Container 2' }),
      createMockContainer({ id: 'c3', name: 'Container 3' }),
    ]);
    mockStorage.getAllGroups.mockReturnValue([]);
    mockStorage.getAllThreads.mockReturnValue([]);

    await containerCommand.parseAsync(['node', 'test', 'list', '-n', '2']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2 of 3'));
  });
});

describe('containerCommand new', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('new_NoName_LogsUsage', async () => {
    await containerCommand.parseAsync(['node', 'test', 'new']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
  });

  test('new_DuplicateName_LogsError', async () => {
    mockStorage.getContainerByName.mockReturnValue(createMockContainer({ name: 'Existing' }));

    await containerCommand.parseAsync(['node', 'test', 'new', 'Existing']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'));
  });

  test('new_ValidName_CreatesContainer', async () => {
    mockStorage.getContainerByName.mockReturnValue(undefined);

    await containerCommand.parseAsync(['node', 'test', 'new', 'New Container']);

    expect(mockStorage.addContainer).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Container',
      type: 'container',
    }));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Created container'));
  });

  test('new_WithDescription_SetsDescription', async () => {
    mockStorage.getContainerByName.mockReturnValue(undefined);

    await containerCommand.parseAsync(['node', 'test', 'new', 'Container', '-d', 'My description']);

    expect(mockStorage.addContainer).toHaveBeenCalledWith(expect.objectContaining({
      description: 'My description',
    }));
  });

  test('new_WithGroup_SetsGroup', async () => {
    const group = createMockGroup({ id: 'g1', name: 'My Group' });
    mockStorage.getContainerByName.mockReturnValue(undefined);
    mockStorage.getGroupByName.mockReturnValue(group);

    await containerCommand.parseAsync(['node', 'test', 'new', 'Container', '-g', 'My Group']);

    expect(mockStorage.addContainer).toHaveBeenCalledWith(expect.objectContaining({
      groupId: 'g1',
    }));
  });

  test('new_GroupNotFound_LogsError', async () => {
    mockStorage.getContainerByName.mockReturnValue(undefined);
    mockStorage.getGroupByName.mockReturnValue(undefined);

    await containerCommand.parseAsync(['node', 'test', 'new', 'Container', '-g', 'NonExistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Group'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    expect(mockStorage.addContainer).not.toHaveBeenCalled();
  });

  test('new_WithParent_SetsParent', async () => {
    const parent = createMockContainer({ id: 'p1', name: 'Parent', groupId: 'g1' });
    mockStorage.getContainerByName.mockImplementation((name: string) =>
      name === 'Container' ? undefined : name === 'Parent' ? parent : undefined
    );
    mockStorage.getAllEntities.mockReturnValue([parent]);

    await containerCommand.parseAsync(['node', 'test', 'new', 'Container', '-p', 'Parent']);

    expect(mockStorage.addContainer).toHaveBeenCalledWith(expect.objectContaining({
      parentId: 'p1',
      groupId: 'g1', // Inherited from parent
    }));
  });

  test('new_ParentNotFound_LogsError', async () => {
    mockStorage.getContainerByName.mockReturnValue(undefined);
    mockStorage.getAllEntities.mockReturnValue([]);

    await containerCommand.parseAsync(['node', 'test', 'new', 'Container', '-p', 'NonExistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Parent'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    expect(mockStorage.addContainer).not.toHaveBeenCalled();
  });

  test('new_WithTag_AddsTag', async () => {
    mockStorage.getContainerByName.mockReturnValue(undefined);

    await containerCommand.parseAsync(['node', 'test', 'new', 'Container', '--tag', 'mytag']);

    expect(mockStorage.addContainer).toHaveBeenCalledWith(expect.objectContaining({
      tags: ['mytag'],
    }));
  });

  test('create_Alias_Works', async () => {
    mockStorage.getContainerByName.mockReturnValue(undefined);

    await containerCommand.parseAsync(['node', 'test', 'create', 'Container']);

    expect(mockStorage.addContainer).toHaveBeenCalled();
  });
});

describe('containerCommand show', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('show_NoIdentifier_LogsUsage', async () => {
    await containerCommand.parseAsync(['node', 'test', 'show']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
  });

  test('show_NotFound_LogsError', async () => {
    mockStorage.getContainerById.mockReturnValue(undefined);
    mockStorage.getContainerByName.mockReturnValue(undefined);
    mockStorage.getAllContainers.mockReturnValue([]);

    await containerCommand.parseAsync(['node', 'test', 'show', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('show_Found_DisplaysDetail', async () => {
    const container = createMockContainer({ id: 'c1', name: 'My Container' });
    mockStorage.getContainerById.mockReturnValue(container);

    await containerCommand.parseAsync(['node', 'test', 'show', 'c1']);

    expect(consoleSpy).toHaveBeenCalledWith('formatted-container-detail');
  });

  test('show_ByName_Works', async () => {
    const container = createMockContainer({ id: 'c1', name: 'My Container' });
    mockStorage.getContainerById.mockReturnValue(undefined);
    mockStorage.getContainerByName.mockReturnValue(container);

    await containerCommand.parseAsync(['node', 'test', 'show', 'My Container']);

    expect(consoleSpy).toHaveBeenCalledWith('formatted-container-detail');
  });

  test('show_PartialMatch_Works', async () => {
    const container = createMockContainer({ id: 'container-123', name: 'My Container' });
    mockStorage.getContainerById.mockReturnValue(undefined);
    mockStorage.getContainerByName.mockReturnValue(undefined);
    mockStorage.getAllContainers.mockReturnValue([container]);

    await containerCommand.parseAsync(['node', 'test', 'show', 'My']);

    expect(consoleSpy).toHaveBeenCalledWith('formatted-container-detail');
  });
});

describe('containerCommand update', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('update_NoIdentifier_LogsUsage', async () => {
    await containerCommand.parseAsync(['node', 'test', 'update']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
  });

  test('update_NotFound_LogsError', async () => {
    mockStorage.getContainerById.mockReturnValue(undefined);
    mockStorage.getContainerByName.mockReturnValue(undefined);
    mockStorage.getAllContainers.mockReturnValue([]);

    await containerCommand.parseAsync(['node', 'test', 'update', 'nonexistent', '-d', 'New desc']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('update_NoChanges_LogsWarning', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Container' });
    mockStorage.getContainerById.mockReturnValue(container);

    await containerCommand.parseAsync(['node', 'test', 'update', 'c1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No updates'));
  });

  test('update_Description_Updates', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Container' });
    mockStorage.getContainerById.mockReturnValue(container);
    mockStorage.getAllThreads.mockReturnValue([]);
    mockStorage.getAllContainers.mockReturnValue([container]);

    await containerCommand.parseAsync(['node', 'test', 'update', 'c1', '-d', 'New description']);

    expect(mockStorage.updateContainer).toHaveBeenCalledWith('c1', expect.objectContaining({
      description: 'New description',
    }));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Updated'));
  });

  test('update_Group_Updates', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Container' });
    const group = createMockGroup({ id: 'g1', name: 'New Group' });
    mockStorage.getContainerById.mockReturnValue(container);
    mockStorage.getGroupByName.mockReturnValue(group);
    mockStorage.getAllThreads.mockReturnValue([]);
    mockStorage.getAllContainers.mockReturnValue([container]);

    await containerCommand.parseAsync(['node', 'test', 'update', 'c1', '-g', 'New Group']);

    expect(mockStorage.updateContainer).toHaveBeenCalledWith('c1', expect.objectContaining({
      groupId: 'g1',
    }));
  });

  test('update_GroupNone_ClearsGroup', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Container', groupId: 'g1' });
    mockStorage.getContainerById.mockReturnValue(container);
    mockStorage.getAllThreads.mockReturnValue([]);
    mockStorage.getAllContainers.mockReturnValue([container]);

    await containerCommand.parseAsync(['node', 'test', 'update', 'c1', '-g', 'none']);

    expect(mockStorage.updateContainer).toHaveBeenCalledWith('c1', expect.objectContaining({
      groupId: null,
    }));
  });

  test('update_GroupNotFound_LogsError', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Container' });
    mockStorage.getContainerById.mockReturnValue(container);
    mockStorage.getGroupByName.mockReturnValue(undefined);

    await containerCommand.parseAsync(['node', 'test', 'update', 'c1', '-g', 'NonExistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Group'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    expect(mockStorage.updateContainer).not.toHaveBeenCalled();
  });

  test('update_Parent_Updates', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Container' });
    const newParent = createMockContainer({ id: 'p1', name: 'New Parent' });
    mockStorage.getContainerById.mockReturnValue(container);
    mockStorage.getAllEntities.mockReturnValue([container, newParent]);
    mockStorage.getAllThreads.mockReturnValue([]);
    mockStorage.getAllContainers.mockReturnValue([container, newParent]);

    await containerCommand.parseAsync(['node', 'test', 'update', 'c1', '-p', 'New Parent']);

    expect(mockStorage.updateContainer).toHaveBeenCalledWith('c1', expect.objectContaining({
      parentId: 'p1',
    }));
  });

  test('update_ParentNone_ClearsParent', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Container', parentId: 'p1' });
    mockStorage.getContainerById.mockReturnValue(container);
    mockStorage.getAllThreads.mockReturnValue([]);
    mockStorage.getAllContainers.mockReturnValue([container]);

    await containerCommand.parseAsync(['node', 'test', 'update', 'c1', '-p', 'none']);

    expect(mockStorage.updateContainer).toHaveBeenCalledWith('c1', expect.objectContaining({
      parentId: null,
    }));
  });

  test('update_SelfParent_LogsError', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Container' });
    mockStorage.getContainerById.mockReturnValue(container);
    mockStorage.getAllEntities.mockReturnValue([container]);

    await containerCommand.parseAsync(['node', 'test', 'update', 'c1', '-p', 'c1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('own parent'));
  });

  test('update_Tag_AddsTag', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Container', tags: ['existing'] });
    mockStorage.getContainerById.mockReturnValue(container);
    mockStorage.getAllThreads.mockReturnValue([]);
    mockStorage.getAllContainers.mockReturnValue([container]);

    await containerCommand.parseAsync(['node', 'test', 'update', 'c1', '--tag', 'newtag']);

    expect(mockStorage.updateContainer).toHaveBeenCalledWith('c1', expect.objectContaining({
      tags: ['existing', 'newtag'],
    }));
  });

  test('update_GroupChange_Cascades', async () => {
    const container = createMockContainer({ id: 'c1', name: 'Container' });
    const child = createMockThread({ id: 't1', name: 'Child', parentId: 'c1' });
    const group = createMockGroup({ id: 'g2', name: 'New Group' });
    mockStorage.getContainerById.mockReturnValue(container);
    mockStorage.getGroupByName.mockReturnValue(group);
    mockStorage.getAllThreads.mockReturnValue([child]);
    mockStorage.getAllContainers.mockReturnValue([container]);

    await containerCommand.parseAsync(['node', 'test', 'update', 'c1', '-g', 'New Group']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', { groupId: 'g2' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 descendants'));
  });
});

describe('containerCommand unknown action', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('unknown_Action_LogsError', async () => {
    await containerCommand.parseAsync(['node', 'test', 'invalid']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown action'));
  });
});
