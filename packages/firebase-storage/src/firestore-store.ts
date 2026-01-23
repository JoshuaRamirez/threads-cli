/**
 * Firestore implementation of IAsyncThreadStore.
 *
 * Data model (per architecture):
 *   tenants/{tenantId}/threads/{threadId}
 *   tenants/{tenantId}/containers/{containerId}
 *   tenants/{tenantId}/groups/{groupId}
 *
 * Uses callback pattern: operations invoke IStorageClient methods on completion.
 */

import { Firestore, CollectionReference, DocumentData } from 'firebase-admin/firestore';
import { Thread, Container, Group, Entity } from '@redjay/threads-core';
import { IAsyncThreadStore, IStorageClient, ThreadFilter, ContainerFilter } from '@redjay/threads-storage';

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
 * All operations invoke the registered IStorageClient callbacks on completion.
 */
export class FirestoreStore implements IAsyncThreadStore {
  private readonly db: Firestore;
  private readonly tenantId: string;
  private client: IStorageClient | null = null;

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

  /**
   * Register the client that receives operation callbacks.
   */
  setClient(client: IStorageClient): void {
    this.client = client;
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

  async getAllThreads(): Promise<void> {
    try {
      const snapshot = await this.threadsCollection.get();
      const threads = snapshot.docs.map((doc) => doc.data() as Thread);
      this.client?.onThreadsListed(threads);
    } catch (error) {
      console.error('[FirestoreStore] getAllThreads failed:', error);
      this.client?.onError('getAllThreads', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async getThreadById(id: string): Promise<void> {
    try {
      const doc = await this.threadsCollection.doc(id).get();
      const thread = doc.exists ? (doc.data() as Thread) : undefined;
      this.client?.onThreadFound(thread);
    } catch (error) {
      console.error(`[FirestoreStore] getThreadById(${id}) failed:`, error);
      this.client?.onError('getThreadById', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async getThreadByName(name: string): Promise<void> {
    try {
      const lower = name.toLowerCase();
      const snapshot = await this.threadsCollection.get();
      const thread = snapshot.docs
        .map((doc) => doc.data() as Thread)
        .find((t) => t.name.toLowerCase() === lower);
      this.client?.onThreadFound(thread);
    } catch (error) {
      console.error(`[FirestoreStore] getThreadByName(${name}) failed:`, error);
      this.client?.onError('getThreadByName', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async findThreads(filter: ThreadFilter): Promise<void> {
    try {
      // Start with all threads, apply filters in memory
      // Firestore compound queries require indexes; for flexibility, filter client-side
      const snapshot = await this.threadsCollection.get();
      const all = snapshot.docs.map((doc) => doc.data() as Thread);
      const filtered = all.filter((t) => {
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
      this.client?.onThreadsListed(filtered);
    } catch (error) {
      console.error('[FirestoreStore] findThreads failed:', error);
      this.client?.onError('findThreads', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async addThread(thread: Thread): Promise<void> {
    try {
      await this.threadsCollection.doc(thread.id).set(thread);
      this.client?.onThreadCreated(thread);
    } catch (error) {
      console.error(`[FirestoreStore] addThread(${thread.id}) failed:`, error);
      this.client?.onError('addThread', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async updateThread(id: string, updates: Partial<Thread>): Promise<void> {
    try {
      const docRef = this.threadsCollection.doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        this.client?.onError('updateThread', new Error(`Thread not found: ${id}`));
        return;
      }

      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await docRef.update(updatedData);

      // Fetch updated document to return complete thread
      const updatedDoc = await docRef.get();
      const thread = updatedDoc.data() as Thread;
      this.client?.onThreadUpdated(thread);
    } catch (error) {
      console.error(`[FirestoreStore] updateThread(${id}) failed:`, error);
      this.client?.onError('updateThread', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async deleteThread(id: string): Promise<void> {
    try {
      const docRef = this.threadsCollection.doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        this.client?.onError('deleteThread', new Error(`Thread not found: ${id}`));
        return;
      }

      await docRef.delete();
      this.client?.onThreadDeleted(id);
    } catch (error) {
      console.error(`[FirestoreStore] deleteThread(${id}) failed:`, error);
      this.client?.onError('deleteThread', error instanceof Error ? error : new Error(String(error)));
    }
  }

  // === Container Operations ===

  async getAllContainers(): Promise<void> {
    try {
      const snapshot = await this.containersCollection.get();
      const containers = snapshot.docs.map((doc) => doc.data() as Container);
      this.client?.onContainersListed(containers);
    } catch (error) {
      console.error('[FirestoreStore] getAllContainers failed:', error);
      this.client?.onError('getAllContainers', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async getContainerById(id: string): Promise<void> {
    try {
      const doc = await this.containersCollection.doc(id).get();
      const container = doc.exists ? (doc.data() as Container) : undefined;
      this.client?.onContainerFound(container);
    } catch (error) {
      console.error(`[FirestoreStore] getContainerById(${id}) failed:`, error);
      this.client?.onError('getContainerById', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async getContainerByName(name: string): Promise<void> {
    try {
      const lower = name.toLowerCase();
      const snapshot = await this.containersCollection.get();
      const container = snapshot.docs
        .map((doc) => doc.data() as Container)
        .find((c) => c.name.toLowerCase() === lower);
      this.client?.onContainerFound(container);
    } catch (error) {
      console.error(`[FirestoreStore] getContainerByName(${name}) failed:`, error);
      this.client?.onError('getContainerByName', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async findContainers(filter: ContainerFilter): Promise<void> {
    try {
      const snapshot = await this.containersCollection.get();
      const all = snapshot.docs.map((doc) => doc.data() as Container);
      const filtered = all.filter((c) => {
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
      this.client?.onContainersListed(filtered);
    } catch (error) {
      console.error('[FirestoreStore] findContainers failed:', error);
      this.client?.onError('findContainers', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async addContainer(container: Container): Promise<void> {
    try {
      await this.containersCollection.doc(container.id).set(container);
      this.client?.onContainerCreated(container);
    } catch (error) {
      console.error(`[FirestoreStore] addContainer(${container.id}) failed:`, error);
      this.client?.onError('addContainer', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async updateContainer(id: string, updates: Partial<Container>): Promise<void> {
    try {
      const docRef = this.containersCollection.doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        this.client?.onError('updateContainer', new Error(`Container not found: ${id}`));
        return;
      }

      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await docRef.update(updatedData);

      // Fetch updated document to return complete container
      const updatedDoc = await docRef.get();
      const container = updatedDoc.data() as Container;
      this.client?.onContainerUpdated(container);
    } catch (error) {
      console.error(`[FirestoreStore] updateContainer(${id}) failed:`, error);
      this.client?.onError('updateContainer', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async deleteContainer(id: string): Promise<void> {
    try {
      const docRef = this.containersCollection.doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        this.client?.onError('deleteContainer', new Error(`Container not found: ${id}`));
        return;
      }

      await docRef.delete();
      this.client?.onContainerDeleted(id);
    } catch (error) {
      console.error(`[FirestoreStore] deleteContainer(${id}) failed:`, error);
      this.client?.onError('deleteContainer', error instanceof Error ? error : new Error(String(error)));
    }
  }

  // === Group Operations ===

  async getAllGroups(): Promise<void> {
    try {
      const snapshot = await this.groupsCollection.get();
      const groups = snapshot.docs.map((doc) => doc.data() as Group);
      this.client?.onGroupsListed(groups);
    } catch (error) {
      console.error('[FirestoreStore] getAllGroups failed:', error);
      this.client?.onError('getAllGroups', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async getGroupById(id: string): Promise<void> {
    try {
      const doc = await this.groupsCollection.doc(id).get();
      const group = doc.exists ? (doc.data() as Group) : undefined;
      this.client?.onGroupFound(group);
    } catch (error) {
      console.error(`[FirestoreStore] getGroupById(${id}) failed:`, error);
      this.client?.onError('getGroupById', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async getGroupByName(name: string): Promise<void> {
    try {
      const lower = name.toLowerCase();
      const snapshot = await this.groupsCollection.get();
      const group = snapshot.docs
        .map((doc) => doc.data() as Group)
        .find((g) => g.name.toLowerCase() === lower);
      this.client?.onGroupFound(group);
    } catch (error) {
      console.error(`[FirestoreStore] getGroupByName(${name}) failed:`, error);
      this.client?.onError('getGroupByName', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async addGroup(group: Group): Promise<void> {
    try {
      await this.groupsCollection.doc(group.id).set(group);
      this.client?.onGroupCreated(group);
    } catch (error) {
      console.error(`[FirestoreStore] addGroup(${group.id}) failed:`, error);
      this.client?.onError('addGroup', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async updateGroup(id: string, updates: Partial<Group>): Promise<void> {
    try {
      const docRef = this.groupsCollection.doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        this.client?.onError('updateGroup', new Error(`Group not found: ${id}`));
        return;
      }

      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await docRef.update(updatedData);

      // Fetch updated document to return complete group
      const updatedDoc = await docRef.get();
      const group = updatedDoc.data() as Group;
      this.client?.onGroupUpdated(group);
    } catch (error) {
      console.error(`[FirestoreStore] updateGroup(${id}) failed:`, error);
      this.client?.onError('updateGroup', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async deleteGroup(id: string): Promise<void> {
    try {
      const docRef = this.groupsCollection.doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        this.client?.onError('deleteGroup', new Error(`Group not found: ${id}`));
        return;
      }

      await docRef.delete();
      this.client?.onGroupDeleted(id);
    } catch (error) {
      console.error(`[FirestoreStore] deleteGroup(${id}) failed:`, error);
      this.client?.onError('deleteGroup', error instanceof Error ? error : new Error(String(error)));
    }
  }

  // === Entity Operations ===

  async getEntityById(id: string): Promise<void> {
    try {
      // Check threads first
      const threadDoc = await this.threadsCollection.doc(id).get();
      if (threadDoc.exists) {
        this.client?.onEntityFound(threadDoc.data() as Thread);
        return;
      }
      // Then containers
      const containerDoc = await this.containersCollection.doc(id).get();
      if (containerDoc.exists) {
        this.client?.onEntityFound(containerDoc.data() as Container);
        return;
      }
      this.client?.onEntityFound(undefined);
    } catch (error) {
      console.error(`[FirestoreStore] getEntityById(${id}) failed:`, error);
      this.client?.onError('getEntityById', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async getEntityByName(name: string): Promise<void> {
    try {
      const lower = name.toLowerCase();

      // Check threads first
      const threadSnapshot = await this.threadsCollection.get();
      const thread = threadSnapshot.docs
        .map((doc) => doc.data() as Thread)
        .find((t) => t.name.toLowerCase() === lower);
      if (thread) {
        this.client?.onEntityFound(thread);
        return;
      }

      // Then containers
      const containerSnapshot = await this.containersCollection.get();
      const container = containerSnapshot.docs
        .map((doc) => doc.data() as Container)
        .find((c) => c.name.toLowerCase() === lower);
      this.client?.onEntityFound(container);
    } catch (error) {
      console.error(`[FirestoreStore] getEntityByName(${name}) failed:`, error);
      this.client?.onError('getEntityByName', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async getAllEntities(): Promise<void> {
    try {
      const [threadSnapshot, containerSnapshot] = await Promise.all([
        this.threadsCollection.get(),
        this.containersCollection.get(),
      ]);
      const threads = threadSnapshot.docs.map((doc) => doc.data() as Thread);
      const containers = containerSnapshot.docs.map((doc) => doc.data() as Container);
      this.client?.onEntitiesListed([...threads, ...containers]);
    } catch (error) {
      console.error('[FirestoreStore] getAllEntities failed:', error);
      this.client?.onError('getAllEntities', error instanceof Error ? error : new Error(String(error)));
    }
  }

  isContainer(entity: Entity): entity is Container {
    return entity.type === 'container';
  }

  isThread(entity: Entity): entity is Thread {
    return entity.type !== 'container';
  }
}
