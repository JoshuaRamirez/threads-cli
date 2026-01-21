#!/usr/bin/env node

/**
 * Threads MCP Server
 *
 * Provides MCP tools and resources for the Threads platform.
 * Supports both local (JSON file) and hosted (Firestore) storage modes.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools';
import { registerResources } from './resources';

async function main() {
  const server = new McpServer({
    name: 'threads',
    version: '1.0.0',
  });

  // Register tools and resources
  registerTools(server);
  registerResources(server);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
