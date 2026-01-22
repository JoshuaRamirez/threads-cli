import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ThreadsData, Thread, Group, Container, Entity } from '@joshua2048/threads-core';
import {
  IFileThreadStore,
  ThreadFilter,
  ContainerFilter,
  BackupInfo,
} from './interfaces';

// Re-export for backwards compat
export type { BackupInfo } from './interfaces';

const DEFAULT_DATA_DIR = path.join(os.homedir(), '.threads');
const DEFAULT_DATA_FILE = path.join(DEFAULT_DATA_DIR, 'threads.json');
const DEFAULT_BACKUP_FILE = path.join(DEFAULT_DATA_DIR, 'threads.backup.json');

/**
 * JSON file-based implementation of IFileThreadStore.
 *
 * Reads/writes to ~/.threads/threads.json with automatic backup on save.
 */
export class JsonFileStore implements IFileThreadStore {
  private readonly dataDir: string;
  private readonly dataFile: string;
  private readonly backupFile: string;

  constructor(
    dataDir: string = DEFAULT_DATA_DIR,
    dataFile: string = DEFAULT_DATA_FILE,
    backupFile: string = DEFAULT_BACKUP_FILE
  ) {
    this.dataDir = dataDir;
    this.dataFile = dataFile;
    this.backupFile = backupFile;
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
      console.error(`[JsonFileStore] Failed to load data from ${this.dataFile}:`, error);

      // Try to recover from backup
      if (fs.existsSync(this.backupFile)) {
        console.warn('[JsonFileStore] Attempting to recover from backup...');
        try {
          const backupRaw = fs.readFileSync(this.backupFile, 'utf-8');
          const backupData = JSON.parse(backupRaw) as ThreadsData;
          const migratedData = this.migrateData(backupData);
          fs.writeFileSync(this.dataFile, JSON.stringify(migratedData, null, 2));
          console.warn('[JsonFileStore] Successfully recovered from backup');
          return migratedData;
        } catch (backupError) {
          console.error('[JsonFileStore] Backup recovery failed:', backupError);
        }
      }

      // Last resort: return empty state
      console.error('[JsonFileStore] All recovery attempts failed. Initializing with empty state.');
      const emptyData: ThreadsData = { threads: [], containers: [], groups: [], version: '1.0.0' };
      try {
        fs.writeFileSync(this.dataFile, JSON.stringify(emptyData, null, 2));
      } catch (writeError) {
        console.error('[JsonFileStore] Failed to write empty state:', writeError);
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

  getAllThreads(): Thread[] {
    return this.loadData().threads;
  }

  getThreadById(id: string): Thread | undefined {
    return this.getAllThreads().find((t) => t.id === id);
  }

  getThreadByName(name: string): Thread | undefined {
    const lower = name.toLowerCase();
    return this.getAllThreads().find((t) => t.name.toLowerCase() === lower);
  }

  findThreads(filter: ThreadFilter): Thread[] {
    return this.getAllThreads().filter((t) => {
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
  }

  addThread(thread: Thread): Thread {
    const data = this.loadData();
    data.threads.push(thread);
    this.saveData(data);
    return thread;
  }

  updateThread(id: string, updates: Partial<Thread>): boolean {
    const data = this.loadData();
    const index = data.threads.findIndex((t) => t.id === id);
    if (index === -1) return false;

    data.threads[index] = {
      ...data.threads[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveData(data);
    return true;
  }

  deleteThread(id: string): boolean {
    const data = this.loadData();
    const index = data.threads.findIndex((t) => t.id === id);
    if (index === -1) return false;

    data.threads.splice(index, 1);
    this.saveData(data);
    return true;
  }

  // === Container Operations ===

  getAllContainers(): Container[] {
    return this.loadData().containers;
  }

  getContainerById(id: string): Container | undefined {
    return this.getAllContainers().find((c) => c.id === id);
  }

  getContainerByName(name: string): Container | undefined {
    const lower = name.toLowerCase();
    return this.getAllContainers().find((c) => c.name.toLowerCase() === lower);
  }

  findContainers(filter: ContainerFilter): Container[] {
    return this.getAllContainers().filter((c) => {
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
  }

  addContainer(container: Container): Container {
    const data = this.loadData();
    data.containers.push(container);
    this.saveData(data);
    return container;
  }

  updateContainer(id: string, updates: Partial<Container>): boolean {
    const data = this.loadData();
    const index = data.containers.findIndex((c) => c.id === id);
    if (index === -1) return false;

    data.containers[index] = {
      ...data.containers[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveData(data);
    return true;
  }

  deleteContainer(id: string): boolean {
    const data = this.loadData();
    const index = data.containers.findIndex((c) => c.id === id);
    if (index === -1) return false;

    data.containers.splice(index, 1);
    this.saveData(data);
    return true;
  }

  // === Group Operations ===

  getAllGroups(): Group[] {
    return this.loadData().groups;
  }

  getGroupById(id: string): Group | undefined {
    return this.getAllGroups().find((g) => g.id === id);
  }

  getGroupByName(name: string): Group | undefined {
    const lower = name.toLowerCase();
    return this.getAllGroups().find((g) => g.name.toLowerCase() === lower);
  }

  addGroup(group: Group): Group {
    const data = this.loadData();
    data.groups.push(group);
    this.saveData(data);
    return group;
  }

  updateGroup(id: string, updates: Partial<Group>): boolean {
    const data = this.loadData();
    const index = data.groups.findIndex((g) => g.id === id);
    if (index === -1) return false;

    data.groups[index] = {
      ...data.groups[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveData(data);
    return true;
  }

  deleteGroup(id: string): boolean {
    const data = this.loadData();
    const index = data.groups.findIndex((g) => g.id === id);
    if (index === -1) return false;

    data.groups.splice(index, 1);
    this.saveData(data);
    return true;
  }

  // === Entity Operations ===

  getEntityById(id: string): Entity | undefined {
    return this.getThreadById(id) || this.getContainerById(id);
  }

  getEntityByName(name: string): Entity | undefined {
    return this.getThreadByName(name) || this.getContainerByName(name);
  }

  getAllEntities(): Entity[] {
    const data = this.loadData();
    return [...data.threads, ...data.containers];
  }

  isContainer(entity: Entity): entity is Container {
    return entity.type === 'container';
  }

  isThread(entity: Entity): entity is Thread {
    return entity.type !== 'container';
  }

  // === Backup Operations (IFileThreadStore) ===

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
    } catch (error) {
      console.error('[JsonFileStore] Failed to parse backup file:', error);
      return { exists: false };
    }
  }

  loadBackupData(): ThreadsData | undefined {
    if (!fs.existsSync(this.backupFile)) {
      return undefined;
    }
    try {
      const raw = fs.readFileSync(this.backupFile, 'utf-8');
      return this.migrateData(JSON.parse(raw) as ThreadsData);
    } catch (error) {
      console.error('[JsonFileStore] Failed to parse backup file:', error);
      return undefined;
    }
  }

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
    } catch (error) {
      console.error('[JsonFileStore] Backup file contains invalid JSON:', error);
      return false;
    }

    // Swap: backup becomes current, current becomes backup
    fs.writeFileSync(this.dataFile, backupData);
    fs.writeFileSync(this.backupFile, currentData);

    return true;
  }

  getDataFilePath(): string {
    return this.dataFile;
  }

  getBackupFilePath(): string {
    return this.backupFile;
  }
}

// === Default Instance & Backwards-Compatible Exports ===

const defaultStore = new JsonFileStore();

// Thread operations
export const getAllThreads = () => defaultStore.getAllThreads();
export const getThreadById = (id: string) => defaultStore.getThreadById(id);
export const getThreadByName = (name: string) => defaultStore.getThreadByName(name);
export const findThreads = (predicate: (t: Thread) => boolean): Thread[] => {
  // Legacy: accepts predicate function, filters in-memory
  return defaultStore.getAllThreads().filter(predicate);
};
export const addThread = (thread: Thread) => {
  defaultStore.addThread(thread);
};
export const updateThread = (id: string, updates: Partial<Thread>): Thread | undefined => {
  const success = defaultStore.updateThread(id, updates);
  return success ? defaultStore.getThreadById(id) : undefined;
};
export const deleteThread = (id: string) => defaultStore.deleteThread(id);

// Container operations
export const getAllContainers = () => defaultStore.getAllContainers();
export const getContainerById = (id: string) => defaultStore.getContainerById(id);
export const getContainerByName = (name: string) => defaultStore.getContainerByName(name);
export const findContainers = (predicate: (c: Container) => boolean): Container[] => {
  return defaultStore.getAllContainers().filter(predicate);
};
export const addContainer = (container: Container) => {
  defaultStore.addContainer(container);
};
export const updateContainer = (id: string, updates: Partial<Container>): Container | undefined => {
  const success = defaultStore.updateContainer(id, updates);
  return success ? defaultStore.getContainerById(id) : undefined;
};
export const deleteContainer = (id: string) => defaultStore.deleteContainer(id);

// Group operations
export const getAllGroups = () => defaultStore.getAllGroups();
export const getGroupById = (id: string) => defaultStore.getGroupById(id);
export const getGroupByName = (name: string) => defaultStore.getGroupByName(name);
export const addGroup = (group: Group) => {
  defaultStore.addGroup(group);
};
export const updateGroup = (id: string, updates: Partial<Group>): Group | undefined => {
  const success = defaultStore.updateGroup(id, updates);
  return success ? defaultStore.getGroupById(id) : undefined;
};
export const deleteGroup = (id: string) => defaultStore.deleteGroup(id);

// Entity operations
export const getEntityById = (id: string) => defaultStore.getEntityById(id);
export const getEntityByName = (name: string) => defaultStore.getEntityByName(name);
export const getAllEntities = () => defaultStore.getAllEntities();
export const isContainer = (entity: Entity): entity is Container => defaultStore.isContainer(entity);
export const isThread = (entity: Entity): entity is Thread => defaultStore.isThread(entity);

// Backup operations
export const getBackupInfo = () => defaultStore.getBackupInfo();
export const loadBackupData = () => defaultStore.loadBackupData();
export const restoreFromBackup = () => defaultStore.restoreFromBackup();
export const getDataFilePath = () => defaultStore.getDataFilePath();
export const getBackupFilePath = () => defaultStore.getBackupFilePath();

// Raw data access (legacy)
export const loadData = (): ThreadsData => {
  const store = defaultStore as any;
  return store.loadData();
};
export const saveData = (data: ThreadsData): void => {
  const store = defaultStore as any;
  store.ensureDataFile();
  store.createBackup();
  fs.writeFileSync(store.dataFile, JSON.stringify(data, null, 2));
};
