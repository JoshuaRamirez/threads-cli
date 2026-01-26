/**
 * Test helper for mocking StorageService in CLI command tests.
 *
 * Creates a mock StorageService with all methods as jest mocks,
 * allowing tests to configure return values and verify calls.
 */

import { StorageService } from '@redjay/threads-storage';
import { Thread, Container, Group, Entity, ThreadsData } from '@redjay/threads-core';
import { BackupInfo } from '@redjay/threads-storage';

/**
 * Type for a fully mocked StorageService.
 * All methods are jest.Mock instances.
 */
export type MockStorageService = {
  [K in keyof StorageService]: jest.Mock;
};

/**
 * Creates a mock StorageService with all methods stubbed.
 * By default, methods return empty arrays/undefined as appropriate.
 */
export function createMockStorageService(): MockStorageService {
  return {
    // Thread operations
    getAllThreads: jest.fn<Thread[], []>(() => []),
    getThreadById: jest.fn<Thread | undefined, [string]>(() => undefined),
    getThreadByName: jest.fn<Thread | undefined, [string]>(() => undefined),
    findThreads: jest.fn<Thread[], [any]>(() => []),
    findThreadsByPredicate: jest.fn<Thread[], [(t: Thread) => boolean]>(() => []),
    addThread: jest.fn<void, [Thread]>(),
    updateThread: jest.fn<Thread | undefined, [string, Partial<Thread>]>(() => undefined),
    deleteThread: jest.fn<boolean, [string]>(() => false),

    // Container operations
    getAllContainers: jest.fn<Container[], []>(() => []),
    getContainerById: jest.fn<Container | undefined, [string]>(() => undefined),
    getContainerByName: jest.fn<Container | undefined, [string]>(() => undefined),
    findContainers: jest.fn<Container[], [any]>(() => []),
    findContainersByPredicate: jest.fn<Container[], [(c: Container) => boolean]>(() => []),
    addContainer: jest.fn<void, [Container]>(),
    updateContainer: jest.fn<Container | undefined, [string, Partial<Container>]>(() => undefined),
    deleteContainer: jest.fn<boolean, [string]>(() => false),

    // Group operations
    getAllGroups: jest.fn<Group[], []>(() => []),
    getGroupById: jest.fn<Group | undefined, [string]>(() => undefined),
    getGroupByName: jest.fn<Group | undefined, [string]>(() => undefined),
    addGroup: jest.fn<void, [Group]>(),
    updateGroup: jest.fn<Group | undefined, [string, Partial<Group>]>(() => undefined),
    deleteGroup: jest.fn<boolean, [string]>(() => false),

    // Entity operations
    getEntityById: jest.fn<Entity | undefined, [string]>(() => undefined),
    getEntityByName: jest.fn<Entity | undefined, [string]>(() => undefined),
    getAllEntities: jest.fn<Entity[], []>(() => []),
    isContainer: jest.fn<boolean, [Entity]>(() => false),
    isThread: jest.fn<boolean, [Entity]>(() => false),

    // File-specific operations
    getBackupInfo: jest.fn<BackupInfo, []>(() => ({
      exists: false,
      timestamp: undefined,
      threadCount: 0,
      groupCount: 0,
    })),
    loadBackupData: jest.fn<ThreadsData | undefined, []>(() => undefined),
    restoreFromBackup: jest.fn<boolean, []>(() => false),
    getDataFilePath: jest.fn<string, []>(() => '~/.threads/threads.json'),
    getBackupFilePath: jest.fn<string, []>(() => '~/.threads/threads.backup.json'),
  } as MockStorageService;
}

/**
 * Creates a mock thread with default values.
 * Use overrides to customize specific fields.
 */
export function createMockThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: 'test-id-123',
    name: 'Test Thread',
    description: 'Test description',
    status: 'active',
    importance: 3,
    temperature: 'warm',
    size: 'medium',
    parentId: null,
    groupId: null,
    tags: [],
    links: [],
    dependencies: [],
    progress: [],
    details: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Creates a mock container with default values.
 */
export function createMockContainer(overrides: Partial<Container> = {}): Container {
  return {
    type: 'container',
    id: 'container-id-123',
    name: 'Test Container',
    description: 'Test container description',
    parentId: null,
    groupId: null,
    tags: [],
    details: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Creates a mock group with default values.
 */
export function createMockGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: 'group-id-123',
    name: 'Test Group',
    description: 'Test group description',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}
