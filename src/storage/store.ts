import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ThreadsData, Thread, Group } from '../models';

const DATA_DIR = path.join(os.homedir(), '.threads');
const DATA_FILE = path.join(DATA_DIR, 'threads.json');
const BACKUP_FILE = path.join(DATA_DIR, 'threads.backup.json');

export interface BackupInfo {
  exists: boolean;
  timestamp?: Date;
  threadCount?: number;
  groupCount?: number;
}

// Ensure data directory and file exist
function ensureDataFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initialData: ThreadsData = {
      threads: [],
      groups: [],
      version: '1.0.0'
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

// Create backup of current data before modification
function createBackup(): void {
  if (fs.existsSync(DATA_FILE)) {
    fs.copyFileSync(DATA_FILE, BACKUP_FILE);
  }
}

// Load all data
export function loadData(): ThreadsData {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw) as ThreadsData;
}

// Save all data (creates backup before writing)
export function saveData(data: ThreadsData): void {
  ensureDataFile();
  createBackup();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Get backup info for display
export function getBackupInfo(): BackupInfo {
  if (!fs.existsSync(BACKUP_FILE)) {
    return { exists: false };
  }

  const stats = fs.statSync(BACKUP_FILE);
  const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
  const data = JSON.parse(raw) as ThreadsData;

  return {
    exists: true,
    timestamp: stats.mtime,
    threadCount: data.threads.length,
    groupCount: data.groups.length
  };
}

// Load backup data (returns undefined if no backup exists)
export function loadBackupData(): ThreadsData | undefined {
  if (!fs.existsSync(BACKUP_FILE)) {
    return undefined;
  }
  const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
  return JSON.parse(raw) as ThreadsData;
}

// Restore from backup (swaps current with backup)
export function restoreFromBackup(): boolean {
  if (!fs.existsSync(BACKUP_FILE)) {
    return false;
  }

  ensureDataFile();

  // Read both files
  const currentData = fs.readFileSync(DATA_FILE, 'utf-8');
  const backupData = fs.readFileSync(BACKUP_FILE, 'utf-8');

  // Swap: backup becomes current, current becomes backup
  fs.writeFileSync(DATA_FILE, backupData);
  fs.writeFileSync(BACKUP_FILE, currentData);

  return true;
}

// Thread CRUD operations
export function getAllThreads(): Thread[] {
  return loadData().threads;
}

export function getThreadById(id: string): Thread | undefined {
  return getAllThreads().find(t => t.id === id);
}

export function getThreadByName(name: string): Thread | undefined {
  const lower = name.toLowerCase();
  return getAllThreads().find(t => t.name.toLowerCase() === lower);
}

export function findThreads(predicate: (t: Thread) => boolean): Thread[] {
  return getAllThreads().filter(predicate);
}

export function addThread(thread: Thread): void {
  const data = loadData();
  data.threads.push(thread);
  saveData(data);
}

export function updateThread(id: string, updates: Partial<Thread>): Thread | undefined {
  const data = loadData();
  const index = data.threads.findIndex(t => t.id === id);
  if (index === -1) return undefined;

  data.threads[index] = {
    ...data.threads[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  saveData(data);
  return data.threads[index];
}

export function deleteThread(id: string): boolean {
  const data = loadData();
  const index = data.threads.findIndex(t => t.id === id);
  if (index === -1) return false;

  data.threads.splice(index, 1);
  saveData(data);
  return true;
}

// Group CRUD operations
export function getAllGroups(): Group[] {
  return loadData().groups;
}

export function getGroupById(id: string): Group | undefined {
  return getAllGroups().find(g => g.id === id);
}

export function getGroupByName(name: string): Group | undefined {
  const lower = name.toLowerCase();
  return getAllGroups().find(g => g.name.toLowerCase() === lower);
}

export function addGroup(group: Group): void {
  const data = loadData();
  data.groups.push(group);
  saveData(data);
}

export function updateGroup(id: string, updates: Partial<Group>): Group | undefined {
  const data = loadData();
  const index = data.groups.findIndex(g => g.id === id);
  if (index === -1) return undefined;

  data.groups[index] = {
    ...data.groups[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  saveData(data);
  return data.groups[index];
}

export function deleteGroup(id: string): boolean {
  const data = loadData();
  const index = data.groups.findIndex(g => g.id === id);
  if (index === -1) return false;

  data.groups.splice(index, 1);
  saveData(data);
  return true;
}

// Utility: get data file path (for debugging)
export function getDataFilePath(): string {
  return DATA_FILE;
}

// Utility: get backup file path
export function getBackupFilePath(): string {
  return BACKUP_FILE;
}
