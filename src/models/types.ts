// Thread status lifecycle
export type ThreadStatus = 'active' | 'paused' | 'stopped' | 'completed' | 'archived';

// Temperature indicates momentum/recency (6 levels)
export type Temperature = 'frozen' | 'freezing' | 'cold' | 'tepid' | 'warm' | 'hot';

// Size indicates scope of work (5 levels)
export type ThreadSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

// Importance 1-5
export type Importance = 1 | 2 | 3 | 4 | 5;

// Progress entry - user's self-reported progress
export interface ProgressEntry {
  id: string;
  timestamp: string; // ISO date
  note: string;
}

// Dependency with context
export interface Dependency {
  threadId: string;
  why: string;
  what: string;
  how: string;
  when: string;
}

// Core Thread entity
export interface Thread {
  id: string;
  name: string;
  description: string;
  status: ThreadStatus;
  importance: Importance;
  temperature: Temperature;
  size: ThreadSize;
  parentId: string | null;  // for sub-threads
  groupId: string | null;
  dependencies: Dependency[];
  progress: ProgressEntry[];
  createdAt: string;
  updatedAt: string;
}

// Group for organizing threads
export interface Group {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// The complete data store
export interface ThreadsData {
  threads: Thread[];
  groups: Group[];
  version: string;
}
