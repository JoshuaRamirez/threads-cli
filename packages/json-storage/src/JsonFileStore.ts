import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ThreadsData, Thread, Group, Container, Entity } from '@redjay/threads-core';
import {
  IFileThreadStore,
  IStorageClient,
  ThreadFilter,
  ContainerFilter,
  BackupInfo,
} from '@redjay/threads-storage';

const DEFAULT_DATA_DIR = path.join(os.homedir(), '.threads');
const DEFAULT_DATA_FILE = path.join(DEFAULT_DATA_DIR, 'threads.json');
const DEFAULT_BACKUP_FILE = path.join(DEFAULT_DATA_DIR, 'threads.backup.json');

/**
 * JSON file-based implementation of IFileThreadStore.
 *
 * Reads/writes to ~/.threads/threads.json with automatic backup on save.
 * Uses callback pattern - all operations notify the registered IStorageClient.
 */
export class JsonFileStore implements IFileThreadStore {
  private readonly dataDir: string;
  private readonly dataFile: string;
  private readonly backupFile: string;
  private client: IStorageClient | null = null;

  constructor(
    dataDir: string = DEFAULT_DATA_DIR,
    dataFile: string = DEFAULT_DATA_FILE,
    backupFile: string = DEFAULT_BACKUP_FILE
  ) {
    this.dataDir = dataDir;
    this.dataFile = dataFile;
    this.backupFile = backupFile;
  }

  /** Set the client that receives operation callbacks. */
  setClient(client: IStorageClient): void {
    this.client = client;
  }

  // === Internal Helpers ===

  private ensureDataFile(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.dataFile)) {
      const initialData: ThreadsData = {
        threads: [],
        containers: [],
        groups: [],
        version: '1.0.0',
      };
      fs.writeFileSync(this.dataFile, JSON.stringify(initialData, null, 2));
    }
  }

  private migrateData(data: ThreadsData): ThreadsData {
    if (!data.containers) {
      data.containers = [];
    }
    return data;
  }

  private createBackup(): void {
    if (fs.existsSync(this.dataFile)) {
      fs.copyFileSync(this.dataFile, this.backupFile);
    }
  }

  private loadData(): ThreadsData {
    this.ensureDataFile();
    try {
      const raw = fs.readFileSync(this.dataFile, 'utf-8');
      const data = JSON.parse(raw) as ThreadsData;
      return this.migrateData(data);
    } catch (error) {
      // Try to recover from backup
      if (fs.existsSync(this.backupFile)) {
        try {
          const backupRaw = fs.readFileSync(this.backupFile, 'utf-8');
          const backupData = JSON.parse(backupRaw) as ThreadsData;
          const migratedData = this.migrateData(backupData);
          fs.writeFileSync(this.dataFile, JSON.stringify(migratedData, null, 2));
          return migratedData;
        } catch {
          // Backup recovery failed
        }
      }

      // Last resort: return empty state
      const emptyData: ThreadsData = { threads: [], containers: [], groups: [], version: '1.0.0' };
      try {
        fs.writeFileSync(this.dataFile, JSON.stringify(emptyData, null, 2));
      } catch {
        // Write failed - continue with empty data
      }
      return emptyData;
    }
  }

  private saveData(data: ThreadsData): void {
    this.ensureDataFile();
    this.createBackup();
    fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
  }

  // === Thread Operations ===

  /** Get all threads. Calls client.onThreadsListed(). */
  getAllThreads(): void {
    try {
      const threads = this.loadData().threads;
      this.client?.onThreadsListed(threads);
    } catch (error) {
      this.client?.onError('getAllThreads', error as Error);
    }
  }

  /** Get a thread by its ID. Calls client.onThreadFound(). */
  getThreadById(id: string): void {
    try {
      const thread = this.loadData().threads.find((t) => t.id === id);
      this.client?.onThreadFound(thread);
    } catch (error) {
      this.client?.onError('getThreadById', error as Error);
    }
  }

  /** Get a thread by its name (case-insensitive). Calls client.onThreadFound(). */
  getThreadByName(name: string): void {
    try {
      const lower = name.toLowerCase();
      const thread = this.loadData().threads.find((t) => t.name.toLowerCase() === lower);
      this.client?.onThreadFound(thread);
    } catch (error) {
      this.client?.onError('getThreadByName', error as Error);
    }
  }

  /** Find threads matching filter criteria. Calls client.onThreadsListed(). */
  findThreads(filter: ThreadFilter): void {
    try {
      const threads = this.loadData().threads.filter((t) => {
        if (filter.status !== undefined && t.status !== filter.status) return false;
        if (filter.temperature !== undefined && t.temperature !== filter.temperature) return false;
        if (filter.size !== undefined && t.size !== filter.size) return false;
        if (filter.importance !== undefined && t.importance !== filter.importance) return false;
        if (filter.parentId !== undefined && t.parentId !== filter.parentId) return false;
        if (filter.groupId !== undefined && t.groupId !== filter.groupId) return false;
        if (filter.tags && filter.tags.length > 0) {
          const threadTags = t.tags || [];
          if (!filter.tags.some((tag) => threadTags.includes(tag))) return false;
        }
        if (filter.search) {
          const searchLower = filter.search.toLowerCase();
          const inName = t.name.toLowerCase().includes(searchLower);
          const inDesc = t.description?.toLowerCase().includes(searchLower) ?? false;
          if (!inName && !inDesc) return false;
        }
        return true;
      });
      this.client?.onThreadsListed(threads);
    } catch (error) {
      this.client?.onError('findThreads', error as Error);
    }
  }

  /** Add a new thread. Calls client.onThreadCreated(). */
  addThread(thread: Thread): void {
    try {
      const data = this.loadData();
      data.threads.push(thread);
      this.saveData(data);
      this.client?.onThreadCreated(thread);
    } catch (error) {
      this.client?.onError('addThread', error as Error);
    }
  }

  /** Update an existing thread. Calls client.onThreadUpdated() or onError(). */
  updateThread(id: string, updates: Partial<Thread>): void {
    try {
      const data = this.loadData();
      const index = data.threads.findIndex((t) => t.id === id);
      if (index === -1) {
        this.client?.onError('updateThread', new Error(`Thread not found: ${id}`));
        return;
      }

      data.threads[index] = {
        ...data.threads[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.saveData(data);
      this.client?.onThreadUpdated(data.threads[index]);
    } catch (error) {
      this.client?.onError('updateThread', error as Error);
    }
  }

  /** Delete a thread by ID. Calls client.onThreadDeleted() or onError(). */
  deleteThread(id: string): void {
    try {
      const data = this.loadData();
      const index = data.threads.findIndex((t) => t.id === id);
      if (index === -1) {
        this.client?.onError('deleteThread', new Error(`Thread not found: ${id}`));
        return;
      }

      data.threads.splice(index, 1);
      this.saveData(data);
      this.client?.onThreadDeleted(id);
    } catch (error) {
      this.client?.onError('deleteThread', error as Error);
    }
  }

  // === Container Operations ===

  /** Get all containers. Calls client.onContainersListed(). */
  getAllContainers(): void {
    try {
      const containers = this.loadData().containers;
      this.client?.onContainersListed(containers);
    } catch (error) {
      this.client?.onError('getAllContainers', error as Error);
    }
  }

  /** Get a container by its ID. Calls client.onContainerFound(). */
  getContainerById(id: string): void {
    try {
      const container = this.loadData().containers.find((c) => c.id === id);
      this.client?.onContainerFound(container);
    } catch (error) {
      this.client?.onError('getContainerById', error as Error);
    }
  }

  /** Get a container by its name (case-insensitive). Calls client.onContainerFound(). */
  getContainerByName(name: string): void {
    try {
      const lower = name.toLowerCase();
      const container = this.loadData().containers.find((c) => c.name.toLowerCase() === lower);
      this.client?.onContainerFound(container);
    } catch (error) {
      this.client?.onError('getContainerByName', error as Error);
    }
  }

  /** Find containers matching filter criteria. Calls client.onContainersListed(). */
  findContainers(filter: ContainerFilter): void {
    try {
      const containers = this.loadData().containers.filter((c) => {
        if (filter.parentId !== undefined && c.parentId !== filter.parentId) return false;
        if (filter.groupId !== undefined && c.groupId !== filter.groupId) return false;
        if (filter.tags && filter.tags.length > 0) {
          const containerTags = c.tags || [];
          if (!filter.tags.some((tag) => containerTags.includes(tag))) return false;
        }
        if (filter.search) {
          const searchLower = filter.search.toLowerCase();
          const inName = c.name.toLowerCase().includes(searchLower);
          const inDesc = c.description?.toLowerCase().includes(searchLower) ?? false;
          if (!inName && !inDesc) return false;
        }
        return true;
      });
      this.client?.onContainersListed(containers);
    } catch (error) {
      this.client?.onError('findContainers', error as Error);
    }
  }

  /** Add a new container. Calls client.onContainerCreated(). */
  addContainer(container: Container): void {
    try {
      const data = this.loadData();
      data.containers.push(container);
      this.saveData(data);
      this.client?.onContainerCreated(container);
    } catch (error) {
      this.client?.onError('addContainer', error as Error);
    }
  }

  /** Update an existing container. Calls client.onContainerUpdated() or onError(). */
  updateContainer(id: string, updates: Partial<Container>): void {
    try {
      const data = this.loadData();
      const index = data.containers.findIndex((c) => c.id === id);
      if (index === -1) {
        this.client?.onError('updateContainer', new Error(`Container not found: ${id}`));
        return;
      }

      data.containers[index] = {
        ...data.containers[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.saveData(data);
      this.client?.onContainerUpdated(data.containers[index]);
    } catch (error) {
      this.client?.onError('updateContainer', error as Error);
    }
  }

  /** Delete a container by ID. Calls client.onContainerDeleted() or onError(). */
  deleteContainer(id: string): void {
    try {
      const data = this.loadData();
      const index = data.containers.findIndex((c) => c.id === id);
      if (index === -1) {
        this.client?.onError('deleteContainer', new Error(`Container not found: ${id}`));
        return;
      }

      data.containers.splice(index, 1);
      this.saveData(data);
      this.client?.onContainerDeleted(id);
    } catch (error) {
      this.client?.onError('deleteContainer', error as Error);
    }
  }

  // === Group Operations ===

  /** Get all groups. Calls client.onGroupsListed(). */
  getAllGroups(): void {
    try {
      const groups = this.loadData().groups;
      this.client?.onGroupsListed(groups);
    } catch (error) {
      this.client?.onError('getAllGroups', error as Error);
    }
  }

  /** Get a group by its ID. Calls client.onGroupFound(). */
  getGroupById(id: string): void {
    try {
      const group = this.loadData().groups.find((g) => g.id === id);
      this.client?.onGroupFound(group);
    } catch (error) {
      this.client?.onError('getGroupById', error as Error);
    }
  }

  /** Get a group by its name (case-insensitive). Calls client.onGroupFound(). */
  getGroupByName(name: string): void {
    try {
      const lower = name.toLowerCase();
      const group = this.loadData().groups.find((g) => g.name.toLowerCase() === lower);
      this.client?.onGroupFound(group);
    } catch (error) {
      this.client?.onError('getGroupByName', error as Error);
    }
  }

  /** Add a new group. Calls client.onGroupCreated(). */
  addGroup(group: Group): void {
    try {
      const data = this.loadData();
      data.groups.push(group);
      this.saveData(data);
      this.client?.onGroupCreated(group);
    } catch (error) {
      this.client?.onError('addGroup', error as Error);
    }
  }

  /** Update an existing group. Calls client.onGroupUpdated() or onError(). */
  updateGroup(id: string, updates: Partial<Group>): void {
    try {
      const data = this.loadData();
      const index = data.groups.findIndex((g) => g.id === id);
      if (index === -1) {
        this.client?.onError('updateGroup', new Error(`Group not found: ${id}`));
        return;
      }

      data.groups[index] = {
        ...data.groups[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.saveData(data);
      this.client?.onGroupUpdated(data.groups[index]);
    } catch (error) {
      this.client?.onError('updateGroup', error as Error);
    }
  }

  /** Delete a group by ID. Calls client.onGroupDeleted() or onError(). */
  deleteGroup(id: string): void {
    try {
      const data = this.loadData();
      const index = data.groups.findIndex((g) => g.id === id);
      if (index === -1) {
        this.client?.onError('deleteGroup', new Error(`Group not found: ${id}`));
        return;
      }

      data.groups.splice(index, 1);
      this.saveData(data);
      this.client?.onGroupDeleted(id);
    } catch (error) {
      this.client?.onError('deleteGroup', error as Error);
    }
  }

  // === Entity Operations ===

  /** Get any entity (thread or container) by ID. Calls client.onEntityFound(). */
  getEntityById(id: string): void {
    try {
      const data = this.loadData();
      const thread = data.threads.find((t) => t.id === id);
      if (thread) {
        this.client?.onEntityFound(thread);
        return;
      }
      const container = data.containers.find((c) => c.id === id);
      this.client?.onEntityFound(container);
    } catch (error) {
      this.client?.onError('getEntityById', error as Error);
    }
  }

  /** Get any entity by name (case-insensitive). Calls client.onEntityFound(). */
  getEntityByName(name: string): void {
    try {
      const lower = name.toLowerCase();
      const data = this.loadData();
      const thread = data.threads.find((t) => t.name.toLowerCase() === lower);
      if (thread) {
        this.client?.onEntityFound(thread);
        return;
      }
      const container = data.containers.find((c) => c.name.toLowerCase() === lower);
      this.client?.onEntityFound(container);
    } catch (error) {
      this.client?.onError('getEntityByName', error as Error);
    }
  }

  /** Get all entities (threads and containers). Calls client.onEntitiesListed(). */
  getAllEntities(): void {
    try {
      const data = this.loadData();
      const entities: Entity[] = [...data.threads, ...data.containers];
      this.client?.onEntitiesListed(entities);
    } catch (error) {
      this.client?.onError('getAllEntities', error as Error);
    }
  }

  /** Check if an entity is a container. */
  isContainer(entity: Entity): entity is Container {
    return entity.type === 'container';
  }

  /** Check if an entity is a thread. */
  isThread(entity: Entity): entity is Thread {
    return entity.type !== 'container';
  }

  // === Backup Operations (IFileThreadStore) ===

  /** Get info about the backup file. */
  getBackupInfo(): BackupInfo {
    if (!fs.existsSync(this.backupFile)) {
      return { exists: false };
    }

    try {
      const stats = fs.statSync(this.backupFile);
      const raw = fs.readFileSync(this.backupFile, 'utf-8');
      const data = this.migrateData(JSON.parse(raw) as ThreadsData);

      return {
        exists: true,
        timestamp: stats.mtime,
        threadCount: data.threads.length,
        containerCount: data.containers.length,
        groupCount: data.groups.length,
      };
    } catch {
      return { exists: false };
    }
  }

  /** Load data from the backup file. */
  loadBackupData(): ThreadsData | undefined {
    if (!fs.existsSync(this.backupFile)) {
      return undefined;
    }
    try {
      const raw = fs.readFileSync(this.backupFile, 'utf-8');
      return this.migrateData(JSON.parse(raw) as ThreadsData);
    } catch {
      return undefined;
    }
  }

  /** Restore from backup (swap current and backup). Returns true if successful. */
  restoreFromBackup(): boolean {
    if (!fs.existsSync(this.backupFile)) {
      return false;
    }

    this.ensureDataFile();

    const currentData = fs.readFileSync(this.dataFile, 'utf-8');
    const backupData = fs.readFileSync(this.backupFile, 'utf-8');

    // Validate backup JSON before swapping
    try {
      JSON.parse(backupData);
    } catch {
      return false;
    }

    // Swap: backup becomes current, current becomes backup
    fs.writeFileSync(this.dataFile, backupData);
    fs.writeFileSync(this.backupFile, currentData);

    return true;
  }

  /** Get the path to the data file. */
  getDataFilePath(): string {
    return this.dataFile;
  }

  /** Get the path to the backup file. */
  getBackupFilePath(): string {
    return this.backupFile;
  }
}
