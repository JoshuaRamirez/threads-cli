#!/usr/bin/env node

/**
 * CLI entry point and library exports.
 *
 * When run directly: Uses JsonFileStore and executes CLI
 * When imported: Exports createCLI for composition packages
 */

export { createCLI } from './factory';
export { StorageService, CLIStorageClient } from './client';
export { initContext, getStorage, isContextInitialized } from './context';

// Only run CLI when executed directly (not imported as a library)
if (require.main === module) {
  // Dynamic imports to avoid loading storage when used as library
  Promise.all([
    import('./factory'),
    import('@redjay/threads-json-storage'),
  ]).then(([{ createCLI }, { JsonFileStore }]) => {
    const store = new JsonFileStore();
    const program = createCLI(store);
    program.parse();
  });
}
