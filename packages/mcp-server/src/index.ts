/**
 * Threads MCP Server Library
 *
 * Provides MCP tools and resources for the Threads platform.
 * Use createMCPServer factory with your storage implementation.
 *
 * For the executable entry point, use @redjay/threads package
 * or create your own composition with createMCPServer().
 */

export { createMCPServer } from './factory';
export { initContext, getStorage, isContextInitialized } from './context';
