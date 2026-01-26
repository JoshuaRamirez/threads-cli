/**
 * Synchronous storage service facade for file-based backends.
 *
 * Wraps IFileThreadStore with a synchronous API that returns values directly.
 * Uses StorageClient internally to capture callback results.
 */

import {
  IFileThreadStore,
  ThreadFilter,
  ContainerFilter,
  BackupInfo,
} from './interfaces';
import {
  Thread,
  Container,
  Group,
  Entity,
  ThreadsData,
} from '@redjay/threads-core';
import { StorageClient } from './StorageClient';

export class StorageService {
  private readonly store: IFileThreadStore;
  private readonly client: StorageClient;

  constructor(store: IFileThreadStore) {
    this.store = store;
    this.client = new StorageClient();
    this.store.setClient(this.client);
  }

  // === Thread Operations ===

  getAllThreads(): Thread[] {
    this.client.clear();
    this.store.getAllThreads();
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.threads;
  }

  getThreadById(id: string): Thread | undefined {
    this.client.clear();
    this.store.getThreadById(id);
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.thread;
  }

  getThreadByName(name: string): Thread | undefined {
    this.client.clear();
    this.store.getThreadByName(name);
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.thread;
  }

  findThreads(filter: ThreadFilter): Thread[] {
    this.client.clear();
    this.store.findThreads(filter);
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.threads;
  }

  /**
   * Find threads using a predicate function.
   * Legacy API - filters all threads in-memory.
   */
  findThreadsByPredicate(predicate: (t: Thread) => boolean): Thread[] {
    return this.getAllThreads().filter(predicate);
  }

  addThread(thread: Thread): void {
    this.client.clear();
    this.store.addThread(thread);
    if (this.client.hasError()) {
      throw this.client.error;
    }
  }

  /**
   * Update a thread and return the updated thread.
   * Returns undefined if thread not found.
   */
  updateThread(id: string, updates: Partial<Thread>): Thread | undefined {
    this.client.clear();
    this.store.updateThread(id, updates);
    if (this.client.hasError()) {
      // Not found is reported as error in callback pattern
      if (this.client.error?.message.includes('not found')) {
        return undefined;
      }
      throw this.client.error;
    }
    return this.client.thread;
  }

  deleteThread(id: string): boolean {
    this.client.clear();
    this.store.deleteThread(id);
    if (this.client.hasError()) {
      if (this.client.error?.message.includes('not found')) {
        return false;
      }
      throw this.client.error;
    }
    return this.client.deletedId !== undefined;
  }

  // === Container Operations ===

  getAllContainers(): Container[] {
    this.client.clear();
    this.store.getAllContainers();
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.containers;
  }

  getContainerById(id: string): Container | undefined {
    this.client.clear();
    this.store.getContainerById(id);
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.container;
  }

  getContainerByName(name: string): Container | undefined {
    this.client.clear();
    this.store.getContainerByName(name);
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.container;
  }

  findContainers(filter: ContainerFilter): Container[] {
    this.client.clear();
    this.store.findContainers(filter);
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.containers;
  }

  /**
   * Find containers using a predicate function.
   * Legacy API - filters all containers in-memory.
   */
  findContainersByPredicate(predicate: (c: Container) => boolean): Container[] {
    return this.getAllContainers().filter(predicate);
  }

  addContainer(container: Container): void {
    this.client.clear();
    this.store.addContainer(container);
    if (this.client.hasError()) {
      throw this.client.error;
    }
  }

  updateContainer(id: string, updates: Partial<Container>): Container | undefined {
    this.client.clear();
    this.store.updateContainer(id, updates);
    if (this.client.hasError()) {
      if (this.client.error?.message.includes('not found')) {
        return undefined;
      }
      throw this.client.error;
    }
    return this.client.container;
  }

  deleteContainer(id: string): boolean {
    this.client.clear();
    this.store.deleteContainer(id);
    if (this.client.hasError()) {
      if (this.client.error?.message.includes('not found')) {
        return false;
      }
      throw this.client.error;
    }
    return this.client.deletedId !== undefined;
  }

  // === Group Operations ===

  getAllGroups(): Group[] {
    this.client.clear();
    this.store.getAllGroups();
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.groups;
  }

  getGroupById(id: string): Group | undefined {
    this.client.clear();
    this.store.getGroupById(id);
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.group;
  }

  getGroupByName(name: string): Group | undefined {
    this.client.clear();
    this.store.getGroupByName(name);
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.group;
  }

  addGroup(group: Group): void {
    this.client.clear();
    this.store.addGroup(group);
    if (this.client.hasError()) {
      throw this.client.error;
    }
  }

  updateGroup(id: string, updates: Partial<Group>): Group | undefined {
    this.client.clear();
    this.store.updateGroup(id, updates);
    if (this.client.hasError()) {
      if (this.client.error?.message.includes('not found')) {
        return undefined;
      }
      throw this.client.error;
    }
    return this.client.group;
  }

  deleteGroup(id: string): boolean {
    this.client.clear();
    this.store.deleteGroup(id);
    if (this.client.hasError()) {
      if (this.client.error?.message.includes('not found')) {
        return false;
      }
      throw this.client.error;
    }
    return this.client.deletedId !== undefined;
  }

  // === Entity Operations ===

  getEntityById(id: string): Entity | undefined {
    this.client.clear();
    this.store.getEntityById(id);
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.entity;
  }

  getEntityByName(name: string): Entity | undefined {
    this.client.clear();
    this.store.getEntityByName(name);
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.entity;
  }

  getAllEntities(): Entity[] {
    this.client.clear();
    this.store.getAllEntities();
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.entities;
  }

  isContainer(entity: Entity): entity is Container {
    return this.store.isContainer(entity);
  }

  isThread(entity: Entity): entity is Thread {
    return this.store.isThread(entity);
  }

  // === File-specific Operations ===

  getBackupInfo(): BackupInfo {
    return this.store.getBackupInfo();
  }

  loadBackupData(): ThreadsData | undefined {
    return this.store.loadBackupData();
  }

  restoreFromBackup(): boolean {
    return this.store.restoreFromBackup();
  }

  getDataFilePath(): string {
    return this.store.getDataFilePath();
  }

  getBackupFilePath(): string {
    return this.store.getBackupFilePath();
  }
}
