/**
 * Async storage service facade for network-based backends (Firebase, REST APIs).
 *
 * Wraps IAsyncThreadStore with a Promise-based API that returns values directly.
 * Uses StorageClient internally to capture callback results.
 */

import {
  IAsyncThreadStore,
  ThreadFilter,
  ContainerFilter,
} from './interfaces';
import {
  Thread,
  Container,
  Group,
  Entity,
} from '@redjay/threads-core';
import { StorageClient } from './StorageClient';

export class AsyncStorageService {
  private readonly store: IAsyncThreadStore;
  private readonly client: StorageClient;

  constructor(store: IAsyncThreadStore) {
    this.store = store;
    this.client = new StorageClient();
    this.store.setClient(this.client);
  }

  // === Thread Operations ===

  async getAllThreads(): Promise<Thread[]> {
    this.client.clear();
    await this.store.getAllThreads();
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.threads;
  }

  async getThreadById(id: string): Promise<Thread | undefined> {
    this.client.clear();
    await this.store.getThreadById(id);
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.thread;
  }

  async getThreadByName(name: string): Promise<Thread | undefined> {
    this.client.clear();
    await this.store.getThreadByName(name);
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.thread;
  }

  async findThreads(filter: ThreadFilter): Promise<Thread[]> {
    this.client.clear();
    await this.store.findThreads(filter);
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.threads;
  }

  async addThread(thread: Thread): Promise<void> {
    this.client.clear();
    await this.store.addThread(thread);
    if (this.client.hasError()) {
      throw this.client.error;
    }
  }

  async updateThread(id: string, updates: Partial<Thread>): Promise<Thread | undefined> {
    this.client.clear();
    await this.store.updateThread(id, updates);
    if (this.client.hasError()) {
      if (this.client.error?.message.includes('not found')) {
        return undefined;
      }
      throw this.client.error;
    }
    return this.client.thread;
  }

  async deleteThread(id: string): Promise<boolean> {
    this.client.clear();
    await this.store.deleteThread(id);
    if (this.client.hasError()) {
      if (this.client.error?.message.includes('not found')) {
        return false;
      }
      throw this.client.error;
    }
    return this.client.deletedId !== undefined;
  }

  // === Container Operations ===

  async getAllContainers(): Promise<Container[]> {
    this.client.clear();
    await this.store.getAllContainers();
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.containers;
  }

  async getContainerById(id: string): Promise<Container | undefined> {
    this.client.clear();
    await this.store.getContainerById(id);
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.container;
  }

  async getContainerByName(name: string): Promise<Container | undefined> {
    this.client.clear();
    await this.store.getContainerByName(name);
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.container;
  }

  async findContainers(filter: ContainerFilter): Promise<Container[]> {
    this.client.clear();
    await this.store.findContainers(filter);
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.containers;
  }

  async addContainer(container: Container): Promise<void> {
    this.client.clear();
    await this.store.addContainer(container);
    if (this.client.hasError()) {
      throw this.client.error;
    }
  }

  async updateContainer(id: string, updates: Partial<Container>): Promise<Container | undefined> {
    this.client.clear();
    await this.store.updateContainer(id, updates);
    if (this.client.hasError()) {
      if (this.client.error?.message.includes('not found')) {
        return undefined;
      }
      throw this.client.error;
    }
    return this.client.container;
  }

  async deleteContainer(id: string): Promise<boolean> {
    this.client.clear();
    await this.store.deleteContainer(id);
    if (this.client.hasError()) {
      if (this.client.error?.message.includes('not found')) {
        return false;
      }
      throw this.client.error;
    }
    return this.client.deletedId !== undefined;
  }

  // === Group Operations ===

  async getAllGroups(): Promise<Group[]> {
    this.client.clear();
    await this.store.getAllGroups();
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.groups;
  }

  async getGroupById(id: string): Promise<Group | undefined> {
    this.client.clear();
    await this.store.getGroupById(id);
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.group;
  }

  async getGroupByName(name: string): Promise<Group | undefined> {
    this.client.clear();
    await this.store.getGroupByName(name);
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.group;
  }

  async addGroup(group: Group): Promise<void> {
    this.client.clear();
    await this.store.addGroup(group);
    if (this.client.hasError()) {
      throw this.client.error;
    }
  }

  async updateGroup(id: string, updates: Partial<Group>): Promise<Group | undefined> {
    this.client.clear();
    await this.store.updateGroup(id, updates);
    if (this.client.hasError()) {
      if (this.client.error?.message.includes('not found')) {
        return undefined;
      }
      throw this.client.error;
    }
    return this.client.group;
  }

  async deleteGroup(id: string): Promise<boolean> {
    this.client.clear();
    await this.store.deleteGroup(id);
    if (this.client.hasError()) {
      if (this.client.error?.message.includes('not found')) {
        return false;
      }
      throw this.client.error;
    }
    return this.client.deletedId !== undefined;
  }

  // === Entity Operations ===

  async getEntityById(id: string): Promise<Entity | undefined> {
    this.client.clear();
    await this.store.getEntityById(id);
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.entity;
  }

  async getEntityByName(name: string): Promise<Entity | undefined> {
    this.client.clear();
    await this.store.getEntityByName(name);
    if (this.client.hasError()) {
      throw this.client.error;
    }
    return this.client.entity;
  }

  async getAllEntities(): Promise<Entity[]> {
    this.client.clear();
    await this.store.getAllEntities();
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
}
