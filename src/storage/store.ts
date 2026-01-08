import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ThreadsData, Thread, Group } from '../models';

const DATA_DIR = path.join(os.homedir(), '.threads');
const DATA_FILE = path.join(DATA_DIR, 'threads.json');

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

// Load all data
export function loadData(): ThreadsData {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw) as ThreadsData;
}

// Save all data
export function saveData(data: ThreadsData): void {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
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
