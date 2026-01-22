/**
 * Storage interface definitions for the Threads platform.
 *
 * IThreadStore defines the contract for any storage backend (JSON file, Firebase, etc.)
 * Implementations handle persistence details while CLI consumes the interface.
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
 * Core storage interface for thread data operations.
 *
 * All methods that modify data are synchronous for simplicity in the CLI context.
 * Future async variants can be added for network-based backends.
 */
export interface IThreadStore {
  // === Thread Operations ===

  /** Get all threads. */
  getAllThreads(): Thread[];

  /** Get a thread by its ID. */
  getThreadById(id: string): Thread | undefined;

  /** Get a thread by its name (case-insensitive). */
  getThreadByName(name: string): Thread | undefined;

  /** Find threads matching filter criteria. */
  findThreads(filter: ThreadFilter): Thread[];

  /** Add a new thread. Returns the created thread. */
  addThread(thread: Thread): Thread;

  /** Update an existing thread. Returns true if found and updated. */
  updateThread(id: string, updates: Partial<Thread>): boolean;

  /** Delete a thread by ID. Returns true if found and deleted. */
  deleteThread(id: string): boolean;

  // === Container Operations ===

  /** Get all containers. */
  getAllContainers(): Container[];

  /** Get a container by its ID. */
  getContainerById(id: string): Container | undefined;

  /** Get a container by its name (case-insensitive). */
  getContainerByName(name: string): Container | undefined;

  /** Find containers matching filter criteria. */
  findContainers(filter: ContainerFilter): Container[];

  /** Add a new container. Returns the created container. */
  addContainer(container: Container): Container;

  /** Update an existing container. Returns true if found and updated. */
  updateContainer(id: string, updates: Partial<Container>): boolean;

  /** Delete a container by ID. Returns true if found and deleted. */
  deleteContainer(id: string): boolean;

  // === Group Operations ===

  /** Get all groups. */
  getAllGroups(): Group[];

  /** Get a group by its ID. */
  getGroupById(id: string): Group | undefined;

  /** Get a group by its name (case-insensitive). */
  getGroupByName(name: string): Group | undefined;

  /** Add a new group. Returns the created group. */
  addGroup(group: Group): Group;

  /** Update an existing group. Returns true if found and updated. */
  updateGroup(id: string, updates: Partial<Group>): boolean;

  /** Delete a group by ID. Returns true if found and deleted. */
  deleteGroup(id: string): boolean;

  // === Entity Operations (unified access) ===

  /** Get any entity (thread or container) by ID. */
  getEntityById(id: string): Entity | undefined;

  /** Get any entity by name (case-insensitive). */
  getEntityByName(name: string): Entity | undefined;

  /** Get all entities (threads and containers). */
  getAllEntities(): Entity[];

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
 * Same operations as IThreadStore but with Promise-based returns.
 */
export interface IAsyncThreadStore {
  // === Thread Operations ===

  getAllThreads(): Promise<Thread[]>;
  getThreadById(id: string): Promise<Thread | undefined>;
  getThreadByName(name: string): Promise<Thread | undefined>;
  findThreads(filter: ThreadFilter): Promise<Thread[]>;
  addThread(thread: Thread): Promise<Thread>;
  updateThread(id: string, updates: Partial<Thread>): Promise<boolean>;
  deleteThread(id: string): Promise<boolean>;

  // === Container Operations ===

  getAllContainers(): Promise<Container[]>;
  getContainerById(id: string): Promise<Container | undefined>;
  getContainerByName(name: string): Promise<Container | undefined>;
  findContainers(filter: ContainerFilter): Promise<Container[]>;
  addContainer(container: Container): Promise<Container>;
  updateContainer(id: string, updates: Partial<Container>): Promise<boolean>;
  deleteContainer(id: string): Promise<boolean>;

  // === Group Operations ===

  getAllGroups(): Promise<Group[]>;
  getGroupById(id: string): Promise<Group | undefined>;
  getGroupByName(name: string): Promise<Group | undefined>;
  addGroup(group: Group): Promise<Group>;
  updateGroup(id: string, updates: Partial<Group>): Promise<boolean>;
  deleteGroup(id: string): Promise<boolean>;

  // === Entity Operations ===

  getEntityById(id: string): Promise<Entity | undefined>;
  getEntityByName(name: string): Promise<Entity | undefined>;
  getAllEntities(): Promise<Entity[]>;
  isContainer(entity: Entity): entity is Container;
  isThread(entity: Entity): entity is Thread;
}
