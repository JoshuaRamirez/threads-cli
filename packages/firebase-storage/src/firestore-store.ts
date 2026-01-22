/**
 * Firestore implementation of IAsyncThreadStore.
 *
 * Data model (per architecture):
 *   tenants/{tenantId}/threads/{threadId}
 *   tenants/{tenantId}/containers/{containerId}
 *   tenants/{tenantId}/groups/{groupId}
 */

import { Firestore, CollectionReference, DocumentData } from 'firebase-admin/firestore';
import { Thread, Container, Group, Entity } from '@redjay/threads-core';
import { IAsyncThreadStore, ThreadFilter, ContainerFilter } from '@redjay/threads-storage';

export interface FirestoreStoreOptions {
  /** Firestore instance (from firebase-admin) */
  firestore: Firestore;
  /** Tenant ID for multi-tenant isolation */
  tenantId: string;
}

/**
 * Firestore-backed storage for Threads data.
 *
 * Each tenant has isolated collections under tenants/{tenantId}/.
 */
export class FirestoreStore implements IAsyncThreadStore {
  private readonly db: Firestore;
  private readonly tenantId: string;

  constructor(options: FirestoreStoreOptions) {
    // Validate tenant ID to prevent invalid collection paths
    if (!options.tenantId || typeof options.tenantId !== 'string') {
      throw new Error('tenantId is required');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(options.tenantId)) {
      throw new Error('tenantId contains invalid characters');
    }

    this.db = options.firestore;
    this.tenantId = options.tenantId;
  }

  // === Collection References ===

  private get threadsCollection(): CollectionReference<DocumentData> {
    return this.db.collection(`tenants/${this.tenantId}/threads`);
  }

  private get containersCollection(): CollectionReference<DocumentData> {
    return this.db.collection(`tenants/${this.tenantId}/containers`);
  }

  private get groupsCollection(): CollectionReference<DocumentData> {
    return this.db.collection(`tenants/${this.tenantId}/groups`);
  }

  // === Thread Operations ===

  async getAllThreads(): Promise<Thread[]> {
    try {
      const snapshot = await this.threadsCollection.get();
      return snapshot.docs.map((doc) => doc.data() as Thread);
    } catch (error) {
      console.error('[FirestoreStore] getAllThreads failed:', error);
      return [];
    }
  }

  async getThreadById(id: string): Promise<Thread | undefined> {
    try {
      const doc = await this.threadsCollection.doc(id).get();
      return doc.exists ? (doc.data() as Thread) : undefined;
    } catch (error) {
      console.error(`[FirestoreStore] getThreadById(${id}) failed:`, error);
      return undefined;
    }
  }

  async getThreadByName(name: string): Promise<Thread | undefined> {
    try {
      const lower = name.toLowerCase();
      const snapshot = await this.threadsCollection.get();
      return snapshot.docs
        .map((doc) => doc.data() as Thread)
        .find((t) => t.name.toLowerCase() === lower);
    } catch (error) {
      console.error(`[FirestoreStore] getThreadByName(${name}) failed:`, error);
      return undefined;
    }
  }

  async findThreads(filter: ThreadFilter): Promise<Thread[]> {
    try {
      // Start with all threads, apply filters in memory
      // Firestore compound queries require indexes; for flexibility, filter client-side
      const all = await this.getAllThreads();
      return all.filter((t) => {
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
    } catch (error) {
      console.error('[FirestoreStore] findThreads failed:', error);
      return [];
    }
  }

  async addThread(thread: Thread): Promise<Thread> {
    try {
      await this.threadsCollection.doc(thread.id).set(thread);
      return thread;
    } catch (error) {
      console.error(`[FirestoreStore] addThread(${thread.id}) failed:`, error);
      throw new Error(`Failed to add thread: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateThread(id: string, updates: Partial<Thread>): Promise<boolean> {
    try {
      const docRef = this.threadsCollection.doc(id);
      const doc = await docRef.get();
      if (!doc.exists) return false;

      await docRef.update({
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error(`[FirestoreStore] updateThread(${id}) failed:`, error);
      return false;
    }
  }

  async deleteThread(id: string): Promise<boolean> {
    try {
      const docRef = this.threadsCollection.doc(id);
      const doc = await docRef.get();
      if (!doc.exists) return false;

      await docRef.delete();
      return true;
    } catch (error) {
      console.error(`[FirestoreStore] deleteThread(${id}) failed:`, error);
      return false;
    }
  }

  // === Container Operations ===

  async getAllContainers(): Promise<Container[]> {
    try {
      const snapshot = await this.containersCollection.get();
      return snapshot.docs.map((doc) => doc.data() as Container);
    } catch (error) {
      console.error('[FirestoreStore] getAllContainers failed:', error);
      return [];
    }
  }

  async getContainerById(id: string): Promise<Container | undefined> {
    try {
      const doc = await this.containersCollection.doc(id).get();
      return doc.exists ? (doc.data() as Container) : undefined;
    } catch (error) {
      console.error(`[FirestoreStore] getContainerById(${id}) failed:`, error);
      return undefined;
    }
  }

  async getContainerByName(name: string): Promise<Container | undefined> {
    try {
      const lower = name.toLowerCase();
      const snapshot = await this.containersCollection.get();
      return snapshot.docs
        .map((doc) => doc.data() as Container)
        .find((c) => c.name.toLowerCase() === lower);
    } catch (error) {
      console.error(`[FirestoreStore] getContainerByName(${name}) failed:`, error);
      return undefined;
    }
  }

  async findContainers(filter: ContainerFilter): Promise<Container[]> {
    try {
      const all = await this.getAllContainers();
      return all.filter((c) => {
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
    } catch (error) {
      console.error('[FirestoreStore] findContainers failed:', error);
      return [];
    }
  }

  async addContainer(container: Container): Promise<Container> {
    try {
      await this.containersCollection.doc(container.id).set(container);
      return container;
    } catch (error) {
      console.error(`[FirestoreStore] addContainer(${container.id}) failed:`, error);
      throw new Error(`Failed to add container: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateContainer(id: string, updates: Partial<Container>): Promise<boolean> {
    try {
      const docRef = this.containersCollection.doc(id);
      const doc = await docRef.get();
      if (!doc.exists) return false;

      await docRef.update({
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error(`[FirestoreStore] updateContainer(${id}) failed:`, error);
      return false;
    }
  }

  async deleteContainer(id: string): Promise<boolean> {
    try {
      const docRef = this.containersCollection.doc(id);
      const doc = await docRef.get();
      if (!doc.exists) return false;

      await docRef.delete();
      return true;
    } catch (error) {
      console.error(`[FirestoreStore] deleteContainer(${id}) failed:`, error);
      return false;
    }
  }

  // === Group Operations ===

  async getAllGroups(): Promise<Group[]> {
    try {
      const snapshot = await this.groupsCollection.get();
      return snapshot.docs.map((doc) => doc.data() as Group);
    } catch (error) {
      console.error('[FirestoreStore] getAllGroups failed:', error);
      return [];
    }
  }

  async getGroupById(id: string): Promise<Group | undefined> {
    try {
      const doc = await this.groupsCollection.doc(id).get();
      return doc.exists ? (doc.data() as Group) : undefined;
    } catch (error) {
      console.error(`[FirestoreStore] getGroupById(${id}) failed:`, error);
      return undefined;
    }
  }

  async getGroupByName(name: string): Promise<Group | undefined> {
    try {
      const lower = name.toLowerCase();
      const snapshot = await this.groupsCollection.get();
      return snapshot.docs
        .map((doc) => doc.data() as Group)
        .find((g) => g.name.toLowerCase() === lower);
    } catch (error) {
      console.error(`[FirestoreStore] getGroupByName(${name}) failed:`, error);
      return undefined;
    }
  }

  async addGroup(group: Group): Promise<Group> {
    try {
      await this.groupsCollection.doc(group.id).set(group);
      return group;
    } catch (error) {
      console.error(`[FirestoreStore] addGroup(${group.id}) failed:`, error);
      throw new Error(`Failed to add group: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateGroup(id: string, updates: Partial<Group>): Promise<boolean> {
    try {
      const docRef = this.groupsCollection.doc(id);
      const doc = await docRef.get();
      if (!doc.exists) return false;

      await docRef.update({
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error(`[FirestoreStore] updateGroup(${id}) failed:`, error);
      return false;
    }
  }

  async deleteGroup(id: string): Promise<boolean> {
    try {
      const docRef = this.groupsCollection.doc(id);
      const doc = await docRef.get();
      if (!doc.exists) return false;

      await docRef.delete();
      return true;
    } catch (error) {
      console.error(`[FirestoreStore] deleteGroup(${id}) failed:`, error);
      return false;
    }
  }

  // === Entity Operations ===

  async getEntityById(id: string): Promise<Entity | undefined> {
    try {
      const thread = await this.getThreadById(id);
      if (thread) return thread;
      return this.getContainerById(id);
    } catch (error) {
      console.error(`[FirestoreStore] getEntityById(${id}) failed:`, error);
      return undefined;
    }
  }

  async getEntityByName(name: string): Promise<Entity | undefined> {
    try {
      const thread = await this.getThreadByName(name);
      if (thread) return thread;
      return this.getContainerByName(name);
    } catch (error) {
      console.error(`[FirestoreStore] getEntityByName(${name}) failed:`, error);
      return undefined;
    }
  }

  async getAllEntities(): Promise<Entity[]> {
    try {
      const [threads, containers] = await Promise.all([
        this.getAllThreads(),
        this.getAllContainers(),
      ]);
      return [...threads, ...containers];
    } catch (error) {
      console.error('[FirestoreStore] getAllEntities failed:', error);
      return [];
    }
  }

  isContainer(entity: Entity): entity is Container {
    return entity.type === 'container';
  }

  isThread(entity: Entity): entity is Thread {
    return entity.type !== 'container';
  }
}
