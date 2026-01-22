/**
 * Firestore implementation of IAsyncThreadStore.
 *
 * Data model (per architecture):
 *   tenants/{tenantId}/threads/{threadId}
 *   tenants/{tenantId}/containers/{containerId}
 *   tenants/{tenantId}/groups/{groupId}
 */

import { Firestore, CollectionReference, DocumentData } from 'firebase-admin/firestore';
import { Thread, Container, Group, Entity } from '@joshua2048/threads-core';
import { IAsyncThreadStore, ThreadFilter, ContainerFilter } from '@joshua2048/threads-storage';

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
    const snapshot = await this.threadsCollection.get();
    return snapshot.docs.map((doc) => doc.data() as Thread);
  }

  async getThreadById(id: string): Promise<Thread | undefined> {
    const doc = await this.threadsCollection.doc(id).get();
    return doc.exists ? (doc.data() as Thread) : undefined;
  }

  async getThreadByName(name: string): Promise<Thread | undefined> {
    const lower = name.toLowerCase();
    const snapshot = await this.threadsCollection.get();
    return snapshot.docs
      .map((doc) => doc.data() as Thread)
      .find((t) => t.name.toLowerCase() === lower);
  }

  async findThreads(filter: ThreadFilter): Promise<Thread[]> {
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
  }

  async addThread(thread: Thread): Promise<Thread> {
    await this.threadsCollection.doc(thread.id).set(thread);
    return thread;
  }

  async updateThread(id: string, updates: Partial<Thread>): Promise<boolean> {
    const docRef = this.threadsCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return false;

    await docRef.update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    return true;
  }

  async deleteThread(id: string): Promise<boolean> {
    const docRef = this.threadsCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  }

  // === Container Operations ===

  async getAllContainers(): Promise<Container[]> {
    const snapshot = await this.containersCollection.get();
    return snapshot.docs.map((doc) => doc.data() as Container);
  }

  async getContainerById(id: string): Promise<Container | undefined> {
    const doc = await this.containersCollection.doc(id).get();
    return doc.exists ? (doc.data() as Container) : undefined;
  }

  async getContainerByName(name: string): Promise<Container | undefined> {
    const lower = name.toLowerCase();
    const snapshot = await this.containersCollection.get();
    return snapshot.docs
      .map((doc) => doc.data() as Container)
      .find((c) => c.name.toLowerCase() === lower);
  }

  async findContainers(filter: ContainerFilter): Promise<Container[]> {
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
  }

  async addContainer(container: Container): Promise<Container> {
    await this.containersCollection.doc(container.id).set(container);
    return container;
  }

  async updateContainer(id: string, updates: Partial<Container>): Promise<boolean> {
    const docRef = this.containersCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return false;

    await docRef.update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    return true;
  }

  async deleteContainer(id: string): Promise<boolean> {
    const docRef = this.containersCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  }

  // === Group Operations ===

  async getAllGroups(): Promise<Group[]> {
    const snapshot = await this.groupsCollection.get();
    return snapshot.docs.map((doc) => doc.data() as Group);
  }

  async getGroupById(id: string): Promise<Group | undefined> {
    const doc = await this.groupsCollection.doc(id).get();
    return doc.exists ? (doc.data() as Group) : undefined;
  }

  async getGroupByName(name: string): Promise<Group | undefined> {
    const lower = name.toLowerCase();
    const snapshot = await this.groupsCollection.get();
    return snapshot.docs
      .map((doc) => doc.data() as Group)
      .find((g) => g.name.toLowerCase() === lower);
  }

  async addGroup(group: Group): Promise<Group> {
    await this.groupsCollection.doc(group.id).set(group);
    return group;
  }

  async updateGroup(id: string, updates: Partial<Group>): Promise<boolean> {
    const docRef = this.groupsCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return false;

    await docRef.update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    return true;
  }

  async deleteGroup(id: string): Promise<boolean> {
    const docRef = this.groupsCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  }

  // === Entity Operations ===

  async getEntityById(id: string): Promise<Entity | undefined> {
    const thread = await this.getThreadById(id);
    if (thread) return thread;
    return this.getContainerById(id);
  }

  async getEntityByName(name: string): Promise<Entity | undefined> {
    const thread = await this.getThreadByName(name);
    if (thread) return thread;
    return this.getContainerByName(name);
  }

  async getAllEntities(): Promise<Entity[]> {
    const [threads, containers] = await Promise.all([
      this.getAllThreads(),
      this.getAllContainers(),
    ]);
    return [...threads, ...containers];
  }

  isContainer(entity: Entity): entity is Container {
    return entity.type === 'container';
  }

  isThread(entity: Entity): entity is Thread {
    return entity.type !== 'container';
  }
}
