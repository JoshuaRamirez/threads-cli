/**
 * Storage interface definitions for the Threads platform.
 *
 * IThreadStore defines the contract for any storage backend (JSON file, Firebase, etc.)
 * IStorageClient defines the callback interface that clients (CLI, UI) implement.
 */

import {
  Thread,
  Container,
  Group,
  Entity,
  ThreadsData,
} from '@redjay/threads-core';

/**
 * Filter criteria for finding threads.
 */
export interface ThreadFilter {
  status?: Thread['status'];
  temperature?: Thread['temperature'];
  size?: Thread['size'];
  importance?: number;
  parentId?: string | null;
  groupId?: string | null;
  tags?: string[];
  search?: string;
}

/**
 * Filter criteria for finding containers.
 */
export interface ContainerFilter {
  parentId?: string | null;
  groupId?: string | null;
  tags?: string[];
  search?: string;
}

/**
 * Backup metadata for file-based storage.
 */
export interface BackupInfo {
  exists: boolean;
  timestamp?: Date;
  threadCount?: number;
  containerCount?: number;
  groupCount?: number;
}

/**
 * Callback interface that clients (CLI, UI, etc.) implement to receive
 * notifications from storage operations. This enables the double-inversion
 * pattern where storage is decoupled from its consumers.
 */
export interface IStorageClient {
  // === Thread Callbacks ===
  onThreadCreated(thread: Thread): void;
  onThreadUpdated(thread: Thread): void;
  onThreadDeleted(id: string): void;
  onThreadFound(thread: Thread | undefined): void;
  onThreadsListed(threads: Thread[]): void;

  // === Container Callbacks ===
  onContainerCreated(container: Container): void;
  onContainerUpdated(container: Container): void;
  onContainerDeleted(id: string): void;
  onContainerFound(container: Container | undefined): void;
  onContainersListed(containers: Container[]): void;

  // === Group Callbacks ===
  onGroupCreated(group: Group): void;
  onGroupUpdated(group: Group): void;
  onGroupDeleted(id: string): void;
  onGroupFound(group: Group | undefined): void;
  onGroupsListed(groups: Group[]): void;

  // === Entity Callbacks ===
  onEntityFound(entity: Entity | undefined): void;
  onEntitiesListed(entities: Entity[]): void;

  // === Error Callback ===
  onError(operation: string, error: Error): void;
}

/**
 * Core storage interface for thread data operations.
 *
 * Implementations call the IStorageClient callbacks after operations complete,
 * enabling decoupled communication between storage and consumers.
 */
export interface IThreadStore {
  /** Set the client that receives operation callbacks. */
  setClient(client: IStorageClient): void;

  // === Thread Operations ===

  /** Get all threads. Calls client.onThreadsListed(). */
  getAllThreads(): void;

  /** Get a thread by its ID. Calls client.onThreadFound(). */
  getThreadById(id: string): void;

  /** Get a thread by its name (case-insensitive). Calls client.onThreadFound(). */
  getThreadByName(name: string): void;

  /** Find threads matching filter criteria. Calls client.onThreadsListed(). */
  findThreads(filter: ThreadFilter): void;

  /** Add a new thread. Calls client.onThreadCreated(). */
  addThread(thread: Thread): void;

  /** Update an existing thread. Calls client.onThreadUpdated() or onError(). */
  updateThread(id: string, updates: Partial<Thread>): void;

  /** Delete a thread by ID. Calls client.onThreadDeleted() or onError(). */
  deleteThread(id: string): void;

  // === Container Operations ===

  /** Get all containers. Calls client.onContainersListed(). */
  getAllContainers(): void;

  /** Get a container by its ID. Calls client.onContainerFound(). */
  getContainerById(id: string): void;

  /** Get a container by its name (case-insensitive). Calls client.onContainerFound(). */
  getContainerByName(name: string): void;

  /** Find containers matching filter criteria. Calls client.onContainersListed(). */
  findContainers(filter: ContainerFilter): void;

  /** Add a new container. Calls client.onContainerCreated(). */
  addContainer(container: Container): void;

  /** Update an existing container. Calls client.onContainerUpdated() or onError(). */
  updateContainer(id: string, updates: Partial<Container>): void;

  /** Delete a container by ID. Calls client.onContainerDeleted() or onError(). */
  deleteContainer(id: string): void;

  // === Group Operations ===

  /** Get all groups. Calls client.onGroupsListed(). */
  getAllGroups(): void;

  /** Get a group by its ID. Calls client.onGroupFound(). */
  getGroupById(id: string): void;

  /** Get a group by its name (case-insensitive). Calls client.onGroupFound(). */
  getGroupByName(name: string): void;

  /** Add a new group. Calls client.onGroupCreated(). */
  addGroup(group: Group): void;

  /** Update an existing group. Calls client.onGroupUpdated() or onError(). */
  updateGroup(id: string, updates: Partial<Group>): void;

  /** Delete a group by ID. Calls client.onGroupDeleted() or onError(). */
  deleteGroup(id: string): void;

  // === Entity Operations (unified access) ===

  /** Get any entity (thread or container) by ID. Calls client.onEntityFound(). */
  getEntityById(id: string): void;

  /** Get any entity by name (case-insensitive). Calls client.onEntityFound(). */
  getEntityByName(name: string): void;

  /** Get all entities (threads and containers). Calls client.onEntitiesListed(). */
  getAllEntities(): void;

  /** Check if an entity is a container. */
  isContainer(entity: Entity): entity is Container;

  /** Check if an entity is a thread. */
  isThread(entity: Entity): entity is Thread;
}

/**
 * Extended interface for file-based storage with backup capabilities.
 */
export interface IFileThreadStore extends IThreadStore {
  /** Get info about the backup file. */
  getBackupInfo(): BackupInfo;

  /** Load data from the backup file. */
  loadBackupData(): ThreadsData | undefined;

  /** Restore from backup (swap current and backup). Returns true if successful. */
  restoreFromBackup(): boolean;

  /** Get the path to the data file. */
  getDataFilePath(): string;

  /** Get the path to the backup file. */
  getBackupFilePath(): string;
}

/**
 * Async storage interface for network-based backends (Firestore, REST APIs, etc.)
 *
 * Same callback pattern as IThreadStore but operations are async.
 */
export interface IAsyncThreadStore {
  /** Set the client that receives operation callbacks. */
  setClient(client: IStorageClient): void;

  // === Thread Operations ===
  getAllThreads(): Promise<void>;
  getThreadById(id: string): Promise<void>;
  getThreadByName(name: string): Promise<void>;
  findThreads(filter: ThreadFilter): Promise<void>;
  addThread(thread: Thread): Promise<void>;
  updateThread(id: string, updates: Partial<Thread>): Promise<void>;
  deleteThread(id: string): Promise<void>;

  // === Container Operations ===
  getAllContainers(): Promise<void>;
  getContainerById(id: string): Promise<void>;
  getContainerByName(name: string): Promise<void>;
  findContainers(filter: ContainerFilter): Promise<void>;
  addContainer(container: Container): Promise<void>;
  updateContainer(id: string, updates: Partial<Container>): Promise<void>;
  deleteContainer(id: string): Promise<void>;

  // === Group Operations ===
  getAllGroups(): Promise<void>;
  getGroupById(id: string): Promise<void>;
  getGroupByName(name: string): Promise<void>;
  addGroup(group: Group): Promise<void>;
  updateGroup(id: string, updates: Partial<Group>): Promise<void>;
  deleteGroup(id: string): Promise<void>;

  // === Entity Operations ===
  getEntityById(id: string): Promise<void>;
  getEntityByName(name: string): Promise<void>;
  getAllEntities(): Promise<void>;
  isContainer(entity: Entity): entity is Container;
  isThread(entity: Entity): entity is Thread;
}
