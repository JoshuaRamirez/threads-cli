/**
 * CLI library exports.
 *
 * This package provides the CLI logic as a library.
 * Use @redjay/threads for the executable entry point.
 */

export { createCLI } from './factory';
export { StorageService, StorageClient, AsyncStorageService } from '@redjay/threads-storage';
// Backward compatibility alias
export { StorageClient as CLIStorageClient } from '@redjay/threads-storage';
export { initContext, getStorage, isContextInitialized } from './context';
