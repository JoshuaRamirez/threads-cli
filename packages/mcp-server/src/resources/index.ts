/**
 * MCP Resources for Threads platform.
 *
 * Resources provide read-only access to thread data.
 * Uses getStorage() from context for all storage operations (DI pattern).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getStorage } from '../context';

export function registerResources(server: McpServer): void {
  // Resource templates for dynamic access
  server.resource(
    'threads://list',
    'threads://list',
    async () => {
      const threads = getStorage().getAllThreads();
      return {
        contents: [{
          uri: 'threads://list',
          mimeType: 'application/json',
          text: JSON.stringify(threads, null, 2),
        }],
      };
    }
  );

  server.resource(
    'containers://list',
    'containers://list',
    async () => {
      const containers = getStorage().getAllContainers();
      return {
        contents: [{
          uri: 'containers://list',
          mimeType: 'application/json',
          text: JSON.stringify(containers, null, 2),
        }],
      };
    }
  );

  server.resource(
    'groups://list',
    'groups://list',
    async () => {
      const groups = getStorage().getAllGroups();
      return {
        contents: [{
          uri: 'groups://list',
          mimeType: 'application/json',
          text: JSON.stringify(groups, null, 2),
        }],
      };
    }
  );

  // Summary resource for quick overview
  server.resource(
    'threads://summary',
    'threads://summary',
    async () => {
      const storage = getStorage();
      const threads = storage.getAllThreads();
      const containers = storage.getAllContainers();
      const groups = storage.getAllGroups();

      const summary = {
        counts: {
          threads: threads.length,
          containers: containers.length,
          groups: groups.length,
        },
        byStatus: {
          active: threads.filter(t => t.status === 'active').length,
          paused: threads.filter(t => t.status === 'paused').length,
          stopped: threads.filter(t => t.status === 'stopped').length,
          completed: threads.filter(t => t.status === 'completed').length,
          archived: threads.filter(t => t.status === 'archived').length,
        },
        byTemperature: {
          hot: threads.filter(t => t.temperature === 'hot').length,
          warm: threads.filter(t => t.temperature === 'warm').length,
          tepid: threads.filter(t => t.temperature === 'tepid').length,
          cold: threads.filter(t => t.temperature === 'cold').length,
          freezing: threads.filter(t => t.temperature === 'freezing').length,
          frozen: threads.filter(t => t.temperature === 'frozen').length,
        },
      };

      return {
        contents: [{
          uri: 'threads://summary',
          mimeType: 'application/json',
          text: JSON.stringify(summary, null, 2),
        }],
      };
    }
  );
}
