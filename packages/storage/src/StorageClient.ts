/**
 * Generic implementation of IStorageClient.
 *
 * Uses field-based result capture pattern. Each callback stores its result
 * in a corresponding field that can be read after the store operation completes.
 * Works with both sync (IThreadStore) and async (IAsyncThreadStore) stores.
 */

import { IStorageClient } from './interfaces';
import {
  Thread,
  Container,
  Group,
  Entity,
} from '@redjay/threads-core';

export class StorageClient implements IStorageClient {
  // === Result Fields ===
  private _thread: Thread | undefined;
  private _threads: Thread[] = [];
  private _container: Container | undefined;
  private _containers: Container[] = [];
  private _group: Group | undefined;
  private _groups: Group[] = [];
  private _entity: Entity | undefined;
  private _entities: Entity[] = [];
  private _deletedId: string | undefined;
  private _error: Error | undefined;
  private _errorOperation: string | undefined;

  // === Result Accessors ===

  get thread(): Thread | undefined {
    return this._thread;
  }

  get threads(): Thread[] {
    return this._threads;
  }

  get container(): Container | undefined {
    return this._container;
  }

  get containers(): Container[] {
    return this._containers;
  }

  get group(): Group | undefined {
    return this._group;
  }

  get groups(): Group[] {
    return this._groups;
  }

  get entity(): Entity | undefined {
    return this._entity;
  }

  get entities(): Entity[] {
    return this._entities;
  }

  get deletedId(): string | undefined {
    return this._deletedId;
  }

  get error(): Error | undefined {
    return this._error;
  }

  get errorOperation(): string | undefined {
    return this._errorOperation;
  }

  /** Clear all stored results and errors. */
  clear(): void {
    this._thread = undefined;
    this._threads = [];
    this._container = undefined;
    this._containers = [];
    this._group = undefined;
    this._groups = [];
    this._entity = undefined;
    this._entities = [];
    this._deletedId = undefined;
    this._error = undefined;
    this._errorOperation = undefined;
  }

  /** Check if last operation resulted in an error. */
  hasError(): boolean {
    return this._error !== undefined;
  }

  // === Thread Callbacks ===

  onThreadCreated(thread: Thread): void {
    this._thread = thread;
  }

  onThreadUpdated(thread: Thread): void {
    this._thread = thread;
  }

  onThreadDeleted(id: string): void {
    this._deletedId = id;
  }

  onThreadFound(thread: Thread | undefined): void {
    this._thread = thread;
  }

  onThreadsListed(threads: Thread[]): void {
    this._threads = threads;
  }

  // === Container Callbacks ===

  onContainerCreated(container: Container): void {
    this._container = container;
  }

  onContainerUpdated(container: Container): void {
    this._container = container;
  }

  onContainerDeleted(id: string): void {
    this._deletedId = id;
  }

  onContainerFound(container: Container | undefined): void {
    this._container = container;
  }

  onContainersListed(containers: Container[]): void {
    this._containers = containers;
  }

  // === Group Callbacks ===

  onGroupCreated(group: Group): void {
    this._group = group;
  }

  onGroupUpdated(group: Group): void {
    this._group = group;
  }

  onGroupDeleted(id: string): void {
    this._deletedId = id;
  }

  onGroupFound(group: Group | undefined): void {
    this._group = group;
  }

  onGroupsListed(groups: Group[]): void {
    this._groups = groups;
  }

  // === Entity Callbacks ===

  onEntityFound(entity: Entity | undefined): void {
    this._entity = entity;
  }

  onEntitiesListed(entities: Entity[]): void {
    this._entities = entities;
  }

  // === Error Callback ===

  onError(operation: string, error: Error): void {
    this._errorOperation = operation;
    this._error = error;
  }
}
