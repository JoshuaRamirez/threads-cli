// Thread status lifecycle
export type ThreadStatus = 'active' | 'paused' | 'stopped' | 'completed' | 'archived';

// Temperature indicates momentum/recency (6 levels)
// Note: Temperature is now derived from updatedAt, not stored.
// Use computeTemperature() from temperature.ts.
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

// Details entry - versioned snapshot of current state
export interface DetailsEntry {
  id: string;
  timestamp: string; // ISO date
  content: string;
}

// Dependency with context
export interface Dependency {
  threadId: string;
  why: string;
  what: string;
  how: string;
  when: string;
}

// Link type for related resources
export type LinkType = 'web' | 'file' | 'thread' | 'custom';

// Link to related resource
export interface Link {
  id: string;
  uri: string;
  type: LinkType;
  label?: string;
  description?: string;
  addedAt: string;  // ISO timestamp
}

// Entity type discriminator
export type EntityType = 'thread' | 'container';

// Core Thread entity
export interface Thread {
  type?: 'thread';  // Optional for backward compat, defaults to 'thread'
  id: string;
  name: string;
  description: string;
  status: ThreadStatus;
  importance: Importance;
  /** @deprecated Temperature is now derived from updatedAt. Stored value is ignored. */
  temperature?: Temperature;
  size: ThreadSize;
  parentId: string | null;  // for sub-threads
  groupId: string | null;
  tags: string[];  // Array of tag strings
  links: Link[];  // Related resources (URLs, files, other threads)
  dependencies: Dependency[];
  progress: ProgressEntry[];
  details: DetailsEntry[];  // Versioned snapshots, latest is current
  createdAt: string;
  updatedAt: string;
}

// Container entity - organizational node without momentum semantics
export interface Container {
  type: 'container';
  id: string;
  name: string;
  description: string;
  parentId: string | null;  // for hierarchy
  groupId: string | null;
  tags: string[];
  details: DetailsEntry[];
  createdAt: string;
  updatedAt: string;
}

// Union type for any entity that can be a parent/child
export type Entity = Thread | Container;

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
  containers: Container[];
  groups: Group[];
  version: string;
}
