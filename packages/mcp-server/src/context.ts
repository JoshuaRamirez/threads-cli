/**
 * MCP Server Context Module
 *
 * Lightweight dependency injection container for the MCP server.
 * Similar pattern to CLI's context module.
 */

import { StorageService } from '@redjay/threads-storage';

let _storage: StorageService | null = null;

/**
 * Initialize the MCP server context with storage service.
 * Must be called before any tools or resources are used.
 */
export function initContext(storage: StorageService): void {
  _storage = storage;
}

/**
 * Get the storage service instance.
 * Throws if context not initialized.
 */
export function getStorage(): StorageService {
  if (!_storage) {
    throw new Error('MCP server context not initialized. Call initContext() first.');
  }
  return _storage;
}

/**
 * Check if context has been initialized.
 */
export function isContextInitialized(): boolean {
  return _storage !== null;
}
