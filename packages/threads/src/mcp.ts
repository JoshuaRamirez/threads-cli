#!/usr/bin/env node
/**
 * MCP Server Entry Point
 *
 * Wires together MCP server + JSON storage.
 * Run via: threads-mcp
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '@redjay/threads-mcp';
import { JsonFileStore } from '@redjay/threads-json-storage';

const store = new JsonFileStore();
const server = createMCPServer(store);

const transport = new StdioServerTransport();
server.connect(transport).catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
