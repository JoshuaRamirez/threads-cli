/**
 * JSON file-based storage implementation for Threads platform.
 *
 * Implements IFileThreadStore with callback pattern - all operations
 * notify the registered IStorageClient upon completion.
 */

export { JsonFileStore } from './JsonFileStore';
