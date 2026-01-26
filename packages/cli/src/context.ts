/**
 * CLI context module.
 *
 * Provides access to shared services (StorageService) for commands.
 * This module acts as a lightweight dependency injection container.
 *
 * The context is initialized by the factory before commands are executed.
 */

import { StorageService } from '@redjay/threads-storage';

let _storage: StorageService | null = null;

/**
 * Initialize the CLI context with the storage service.
 * Called by the factory during CLI creation.
 */
export function initContext(storage: StorageService): void {
  _storage = storage;
}

/**
 * Get the storage service.
 * Throws if context not initialized.
 */
export function getStorage(): StorageService {
  if (!_storage) {
    throw new Error('CLI context not initialized. Call initContext() first.');
  }
  return _storage;
}

/**
 * Check if context is initialized.
 */
export function isContextInitialized(): boolean {
  return _storage !== null;
}
