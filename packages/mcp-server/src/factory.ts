/**
 * MCP Server Factory
 *
 * Creates the MCP server instance with injected storage.
 * Follows the same DI pattern as the CLI factory.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IFileThreadStore, StorageService } from '@redjay/threads-storage';
import { initContext } from './context';
import { registerTools } from './tools';
import { registerResources } from './resources';

/**
 * Create MCP server with injected storage implementation.
 *
 * @param store - The storage implementation to use
 * @returns Configured McpServer ready for transport connection
 */
export function createMCPServer(store: IFileThreadStore): McpServer {
  // Create storage service and initialize context
  const storage = new StorageService(store);
  initContext(storage);

  // Create MCP server
  const server = new McpServer({
    name: 'threads',
    version: '1.0.0',
  });

  // Register tools and resources
  registerTools(server);
  registerResources(server);

  return server;
}
