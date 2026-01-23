#!/usr/bin/env node
/**
 * @redjay/threads - Entry point composition package
 *
 * Wires together CLI + storage based on configuration.
 * This is the primary package users install.
 */

import { loadConfig, ThreadsConfig, FirebaseConfig } from './config';
import type { IFileThreadStore, IAsyncThreadStore } from '@redjay/threads-storage';

export { loadConfig, saveConfig, getConfigFilePath, ThreadsConfig, FirebaseConfig } from './config';

/**
 * Storage type discriminated union for type-safe storage access.
 */
export type StorageInstance =
  | { type: 'json'; store: IFileThreadStore }
  | { type: 'firebase'; store: IAsyncThreadStore };

/**
 * Create a storage instance based on configuration.
 *
 * For 'json' storage: returns synchronously with JsonFileStore
 * For 'firebase' storage: dynamically imports firebase-storage package
 *
 * @throws Error if firebase storage is configured but package not installed
 */
export async function createStorage(config?: ThreadsConfig): Promise<StorageInstance> {
  const resolvedConfig = config ?? loadConfig();

  if (resolvedConfig.storage === 'firebase') {
    if (!resolvedConfig.firebase) {
      throw new Error('Firebase storage requires firebase configuration (tenantId, projectId)');
    }

    // Dynamic import to avoid requiring firebase-storage when not needed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    try {
      // Use require for optional dependencies to avoid TypeScript import errors
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const firebaseAdmin = require('firebase-admin') as {
        app: () => { firestore: () => unknown };
        initializeApp: (config: { projectId: string }) => { firestore: () => unknown };
      };
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { FirestoreStore } = require('@redjay/threads-firebase-storage') as {
        FirestoreStore: new (config: { firestore: unknown; tenantId: string }) => IAsyncThreadStore;
      };

      // Initialize Firebase app if not already initialized
      let app: { firestore: () => unknown };
      try {
        app = firebaseAdmin.app();
      } catch {
        app = firebaseAdmin.initializeApp({
          projectId: resolvedConfig.firebase.projectId,
        });
      }

      const store = new FirestoreStore({
        firestore: app.firestore(),
        tenantId: resolvedConfig.firebase.tenantId,
      });
      return { type: 'firebase', store };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cannot find module')) {
        throw new Error(
          'Firebase storage requires @redjay/threads-firebase-storage and firebase-admin packages. ' +
            'Install them with: npm install @redjay/threads-firebase-storage firebase-admin'
        );
      }
      throw error;
    }
  }

  // Default: JSON file storage
  const { JsonFileStore } = await import('@redjay/threads-json-storage');
  const store = new JsonFileStore();
  return { type: 'json', store };
}

/**
 * Create JSON file storage directly (convenience function).
 */
export function createJsonStorage(): IFileThreadStore {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { JsonFileStore } = require('@redjay/threads-json-storage');
  return new JsonFileStore();
}

// CLI entry point - wires CLI + storage based on config
if (require.main === module) {
  (async () => {
    try {
      const storageResult = await createStorage();

      // For now, only JSON storage is supported for CLI
      // Firebase storage uses async API which requires different CLI handling
      if (storageResult.type === 'firebase') {
        console.error('Firebase storage is not yet supported for CLI. Use JSON storage.');
        console.error('Set storage: "json" in ~/.threads/config.json');
        process.exit(1);
      }

      // Dynamic import to avoid circular dependencies
      const { createCLI } = await import('@redjay/threads-cli');
      const program = createCLI(storageResult.store);
      program.parse();
    } catch (error) {
      console.error('Failed to initialize threads:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  })();
}
