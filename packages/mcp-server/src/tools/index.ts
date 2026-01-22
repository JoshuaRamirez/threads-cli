/**
 * MCP Tools for Threads platform.
 *
 * Tools provide CRUD operations for threads, containers, groups, and progress.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllThreads,
  getThreadById,
  getThreadByName,
  addThread,
  updateThread,
  deleteThread,
  getAllContainers,
  getContainerById,
  addContainer,
  updateContainer,
  deleteContainer,
  getAllGroups,
  getGroupById,
  addGroup,
  updateGroup,
  deleteGroup,
  getEntityById,
  getEntityByName,
} from 'threads-storage';
import { Thread, Container, Group, ProgressEntry } from 'threads-types';

// Reusable schema fragments - defined once to avoid type inference depth issues
const statusEnum = ['active', 'paused', 'stopped', 'completed', 'archived'] as const;
const tempEnum = ['frozen', 'freezing', 'cold', 'tepid', 'warm', 'hot'] as const;
const sizeEnum = ['tiny', 'small', 'medium', 'large', 'huge'] as const;

// Type helper to bypass MCP SDK's deep type inference
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SchemaShape = Record<string, any>;

export function registerTools(server: McpServer): void {
  // === Thread Tools ===

  server.tool(
    'create_thread',
    'Create a new thread for tracking an activity stream',
    {
      name: z.string().describe('Thread name'),
      description: z.string().optional().describe('Brief thread description'),
      status: z.enum(statusEnum).optional().describe('Initial status (default: active)'),
      temperature: z.enum(tempEnum).optional().describe('Thread momentum (default: warm)'),
      size: z.enum(sizeEnum).optional().describe('Scope of work (default: medium)'),
      importance: z.number().int().min(1).max(5).optional().describe('Priority level 1-5 (default: 3)'),
      tags: z.array(z.string()).optional().describe('Tags for categorization'),
      parentId: z.string().optional().describe('Parent thread/container ID'),
      groupId: z.string().optional().describe('Group ID to assign to'),
    } as SchemaShape,
    async (args) => {
      // Validate parentId exists if provided
      if (args.parentId) {
        const parent = getThreadById(args.parentId) ?? getContainerById(args.parentId);
        if (!parent) {
          return { content: [{ type: 'text' as const, text: `Parent not found: ${args.parentId}` }], isError: true };
        }
      }

      // Validate groupId exists if provided
      if (args.groupId) {
        const group = getGroupById(args.groupId);
        if (!group) {
          return { content: [{ type: 'text' as const, text: `Group not found: ${args.groupId}` }], isError: true };
        }
      }

      const now = new Date().toISOString();
      const thread: Thread = {
        type: 'thread',
        id: uuidv4(),
        name: args.name,
        description: args.description ?? '',
        status: args.status ?? 'active',
        temperature: args.temperature ?? 'warm',
        size: args.size ?? 'medium',
        importance: (args.importance ?? 3) as 1 | 2 | 3 | 4 | 5,
        tags: args.tags ?? [],
        parentId: args.parentId ?? null,
        groupId: args.groupId ?? null,
        dependencies: [],
        progress: [],
        details: [],
        createdAt: now,
        updatedAt: now,
      };

      addThread(thread);
      return { content: [{ type: 'text' as const, text: JSON.stringify(thread, null, 2) }] };
    }
  );

  server.tool(
    'update_thread',
    'Update properties of an existing thread',
    {
      id: z.string().describe('Thread ID to update'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('New description'),
      status: z.enum(statusEnum).optional().describe('New status'),
      temperature: z.enum(tempEnum).optional().describe('New temperature'),
      size: z.enum(sizeEnum).optional().describe('New size'),
      importance: z.number().int().min(1).max(5).optional().describe('New importance'),
      tags: z.array(z.string()).optional().describe('Replace tags array'),
    } as SchemaShape,
    async (args) => {
      const { id, ...updates } = args;
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      );

      const updated = updateThread(id, filteredUpdates);
      if (!updated) {
        return { content: [{ type: 'text' as const, text: `Thread not found: ${id}` }], isError: true };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(updated, null, 2) }] };
    }
  );

  server.tool(
    'archive_thread',
    'Archive a thread (optionally with children)',
    {
      id: z.string().describe('Thread ID to archive'),
      cascade: z.boolean().optional().describe('Also archive child threads (default: false)'),
    } as SchemaShape,
    async (args) => {
      const thread = getThreadById(args.id);
      if (!thread) {
        return { content: [{ type: 'text' as const, text: `Thread not found: ${args.id}` }], isError: true };
      }

      const success = updateThread(args.id, { status: 'archived' });
      if (!success) {
        return { content: [{ type: 'text' as const, text: `Failed to archive thread: ${args.id}` }], isError: true };
      }

      if (args.cascade) {
        const children = getAllThreads().filter(t => t.parentId === args.id);
        for (const child of children) {
          const childSuccess = updateThread(child.id, { status: 'archived' });
          if (!childSuccess) {
            return { content: [{ type: 'text' as const, text: `Failed to archive child thread: ${child.id}` }], isError: true };
          }
        }
      }

      return { content: [{ type: 'text' as const, text: `Archived thread: ${thread.name}` }] };
    }
  );

  server.tool(
    'delete_thread',
    'Permanently delete a thread',
    {
      id: z.string().describe('Thread ID to delete'),
    } as SchemaShape,
    async (args) => {
      // Check for child threads before deleting
      const children = getAllThreads().filter(t => t.parentId === args.id);
      if (children.length > 0) {
        return {
          content: [{ type: 'text' as const, text: `Cannot delete thread: has ${children.length} child thread(s). Delete or move them first.` }],
          isError: true
        };
      }

      const success = deleteThread(args.id);
      if (!success) {
        return { content: [{ type: 'text' as const, text: `Thread not found: ${args.id}` }], isError: true };
      }
      return { content: [{ type: 'text' as const, text: `Deleted thread: ${args.id}` }] };
    }
  );

  server.tool(
    'get_thread',
    'Get a single thread by ID or name',
    {
      identifier: z.string().describe('Thread ID or name'),
    } as SchemaShape,
    async (args) => {
      const thread = getThreadById(args.identifier) ?? getThreadByName(args.identifier);
      if (!thread) {
        return { content: [{ type: 'text' as const, text: `Thread not found: ${args.identifier}` }], isError: true };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(thread, null, 2) }] };
    }
  );

  server.tool(
    'add_progress',
    'Add a progress note to a thread',
    {
      threadId: z.string().describe('Thread ID to add progress to'),
      note: z.string().describe('Progress note text'),
      timestamp: z.string().datetime().optional().describe('Custom timestamp (ISO 8601, default: now)'),
    } as SchemaShape,
    async (args) => {
      const thread = getThreadById(args.threadId);
      if (!thread) {
        return { content: [{ type: 'text' as const, text: `Thread not found: ${args.threadId}` }], isError: true };
      }

      const progressEntry: ProgressEntry = {
        id: uuidv4(),
        note: args.note,
        timestamp: args.timestamp ?? new Date().toISOString(),
      };

      const updatedProgress = [...(thread.progress ?? []), progressEntry];
      const success = updateThread(args.threadId, { progress: updatedProgress });
      if (!success) {
        return { content: [{ type: 'text' as const, text: `Failed to add progress to thread: ${args.threadId}` }], isError: true };
      }

      return { content: [{ type: 'text' as const, text: JSON.stringify(progressEntry, null, 2) }] };
    }
  );

  server.tool(
    'list_progress',
    'Get progress history for a thread',
    {
      threadId: z.string().describe('Thread ID'),
      limit: z.number().int().min(1).optional().describe('Max entries to return (most recent first)'),
    } as SchemaShape,
    async (args) => {
      const thread = getThreadById(args.threadId);
      if (!thread) {
        return { content: [{ type: 'text' as const, text: `Thread not found: ${args.threadId}` }], isError: true };
      }

      let progress = [...(thread.progress ?? [])].reverse();
      if (args.limit) {
        progress = progress.slice(0, args.limit);
      }

      return { content: [{ type: 'text' as const, text: JSON.stringify(progress, null, 2) }] };
    }
  );

  server.tool(
    'edit_progress',
    'Edit an existing progress entry',
    {
      threadId: z.string().describe('Thread ID'),
      progressId: z.string().describe('Progress entry ID'),
      note: z.string().describe('New note text'),
    } as SchemaShape,
    async (args) => {
      const thread = getThreadById(args.threadId);
      if (!thread) {
        return { content: [{ type: 'text' as const, text: `Thread not found: ${args.threadId}` }], isError: true };
      }

      const progressIndex = thread.progress?.findIndex(p => p.id === args.progressId);
      if (progressIndex === undefined || progressIndex === -1) {
        return { content: [{ type: 'text' as const, text: `Progress entry not found: ${args.progressId}` }], isError: true };
      }

      const updatedProgress = [...(thread.progress ?? [])];
      updatedProgress[progressIndex] = { ...updatedProgress[progressIndex], note: args.note };
      const success = updateThread(args.threadId, { progress: updatedProgress });
      if (!success) {
        return { content: [{ type: 'text' as const, text: `Failed to edit progress on thread: ${args.threadId}` }], isError: true };
      }

      return { content: [{ type: 'text' as const, text: JSON.stringify(updatedProgress[progressIndex], null, 2) }] };
    }
  );

  server.tool(
    'delete_progress',
    'Delete a progress entry',
    {
      threadId: z.string().describe('Thread ID'),
      progressId: z.string().describe('Progress entry ID'),
    } as SchemaShape,
    async (args) => {
      const thread = getThreadById(args.threadId);
      if (!thread) {
        return { content: [{ type: 'text' as const, text: `Thread not found: ${args.threadId}` }], isError: true };
      }

      const updatedProgress = (thread.progress ?? []).filter(p => p.id !== args.progressId);
      if (updatedProgress.length === (thread.progress ?? []).length) {
        return { content: [{ type: 'text' as const, text: `Progress entry not found: ${args.progressId}` }], isError: true };
      }

      const success = updateThread(args.threadId, { progress: updatedProgress });
      if (!success) {
        return { content: [{ type: 'text' as const, text: `Failed to delete progress from thread: ${args.threadId}` }], isError: true };
      }
      return { content: [{ type: 'text' as const, text: `Deleted progress entry: ${args.progressId}` }] };
    }
  );

  // === Container Tools ===

  server.tool(
    'create_container',
    'Create a new container for organizing threads',
    {
      name: z.string().describe('Container name'),
      description: z.string().optional().describe('Container description'),
      parentId: z.string().optional().describe('Parent container ID'),
      groupId: z.string().optional().describe('Group ID to assign to'),
      tags: z.array(z.string()).optional().describe('Tags for categorization'),
    } as SchemaShape,
    async (args) => {
      // Validate parentId exists if provided
      if (args.parentId) {
        const parent = getThreadById(args.parentId) ?? getContainerById(args.parentId);
        if (!parent) {
          return { content: [{ type: 'text' as const, text: `Parent not found: ${args.parentId}` }], isError: true };
        }
      }

      // Validate groupId exists if provided
      if (args.groupId) {
        const group = getGroupById(args.groupId);
        if (!group) {
          return { content: [{ type: 'text' as const, text: `Group not found: ${args.groupId}` }], isError: true };
        }
      }

      const now = new Date().toISOString();
      const container: Container = {
        type: 'container',
        id: uuidv4(),
        name: args.name,
        description: args.description ?? '',
        parentId: args.parentId ?? null,
        groupId: args.groupId ?? null,
        tags: args.tags ?? [],
        details: [],
        createdAt: now,
        updatedAt: now,
      };

      addContainer(container);
      return { content: [{ type: 'text' as const, text: JSON.stringify(container, null, 2) }] };
    }
  );

  server.tool(
    'update_container',
    'Update properties of a container',
    {
      id: z.string().describe('Container ID'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('New description'),
      tags: z.array(z.string()).optional().describe('Replace tags array'),
    } as SchemaShape,
    async (args) => {
      const { id, ...updates } = args;
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      );

      const updated = updateContainer(id, filteredUpdates);
      if (!updated) {
        return { content: [{ type: 'text' as const, text: `Container not found: ${id}` }], isError: true };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(updated, null, 2) }] };
    }
  );

  server.tool(
    'delete_container',
    'Delete a container',
    {
      id: z.string().describe('Container ID'),
    } as SchemaShape,
    async (args) => {
      // Check for child threads and containers before deleting
      const childThreads = getAllThreads().filter(t => t.parentId === args.id);
      const childContainers = getAllContainers().filter(c => c.parentId === args.id);
      const totalChildren = childThreads.length + childContainers.length;
      if (totalChildren > 0) {
        return {
          content: [{ type: 'text' as const, text: `Cannot delete container: has ${totalChildren} child item(s). Delete or move them first.` }],
          isError: true
        };
      }

      const success = deleteContainer(args.id);
      if (!success) {
        return { content: [{ type: 'text' as const, text: `Container not found: ${args.id}` }], isError: true };
      }
      return { content: [{ type: 'text' as const, text: `Deleted container: ${args.id}` }] };
    }
  );

  // === Group Tools ===

  server.tool(
    'create_group',
    'Create a new group for cross-cutting organization',
    {
      name: z.string().describe('Group name'),
      description: z.string().optional().describe('Group description'),
    } as SchemaShape,
    async (args) => {
      const now = new Date().toISOString();
      const group: Group = {
        id: uuidv4(),
        name: args.name,
        description: args.description ?? '',
        createdAt: now,
        updatedAt: now,
      };

      addGroup(group);
      return { content: [{ type: 'text' as const, text: JSON.stringify(group, null, 2) }] };
    }
  );

  server.tool(
    'update_group',
    'Update properties of a group',
    {
      id: z.string().describe('Group ID'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('New description'),
    } as SchemaShape,
    async (args) => {
      const { id, ...updates } = args;
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      );

      const updated = updateGroup(id, filteredUpdates);
      if (!updated) {
        return { content: [{ type: 'text' as const, text: `Group not found: ${id}` }], isError: true };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(updated, null, 2) }] };
    }
  );

  server.tool(
    'delete_group',
    'Delete a group',
    {
      id: z.string().describe('Group ID'),
    } as SchemaShape,
    async (args) => {
      // Verify group exists first
      const group = getGroupById(args.id);
      if (!group) {
        return { content: [{ type: 'text' as const, text: `Group not found: ${args.id}` }], isError: true };
      }

      // Clear groupId from all members before deleting the group
      const memberThreads = getAllThreads().filter(t => t.groupId === args.id);
      const memberContainers = getAllContainers().filter(c => c.groupId === args.id);
      const cleanupFailures: string[] = [];

      for (const t of memberThreads) {
        const success = updateThread(t.id, { groupId: null });
        if (!success) {
          cleanupFailures.push(`thread:${t.id}`);
        }
      }
      for (const c of memberContainers) {
        const success = updateContainer(c.id, { groupId: null });
        if (!success) {
          cleanupFailures.push(`container:${c.id}`);
        }
      }

      if (cleanupFailures.length > 0) {
        return {
          content: [{ type: 'text' as const, text: `Failed to unlink some members: ${cleanupFailures.join(', ')}. Group not deleted.` }],
          isError: true
        };
      }

      const success = deleteGroup(args.id);
      if (!success) {
        return { content: [{ type: 'text' as const, text: `Failed to delete group: ${args.id}` }], isError: true };
      }
      return { content: [{ type: 'text' as const, text: `Deleted group: ${args.id}` }] };
    }
  );

  // === Navigation Tools ===

  server.tool(
    'set_parent',
    'Set the parent of a thread or container',
    {
      entityId: z.string().describe('Thread or container ID'),
      parentId: z.string().nullable().describe('New parent ID (null to make root)'),
    } as SchemaShape,
    async (args) => {
      // Validate parentId exists if provided
      if (args.parentId) {
        const parent = getThreadById(args.parentId) ?? getContainerById(args.parentId);
        if (!parent) {
          return { content: [{ type: 'text' as const, text: `Parent not found: ${args.parentId}` }], isError: true };
        }

        // Cycle detection: walk the proposed parent's ancestor chain
        const visited = new Set<string>([args.entityId]);
        let checkId: string | null = args.parentId;
        while (checkId) {
          if (visited.has(checkId)) {
            return { content: [{ type: 'text' as const, text: 'Cannot set parent: would create circular reference' }], isError: true };
          }
          visited.add(checkId);
          const checkEntity = getThreadById(checkId) ?? getContainerById(checkId);
          checkId = checkEntity?.parentId ?? null;
        }
      }

      const thread = getThreadById(args.entityId);
      if (thread) {
        const success = updateThread(args.entityId, { parentId: args.parentId });
        if (!success) {
          return { content: [{ type: 'text' as const, text: `Failed to set parent of thread: ${args.entityId}` }], isError: true };
        }
        return { content: [{ type: 'text' as const, text: `Set parent of thread ${thread.name} to ${args.parentId}` }] };
      }

      const container = getContainerById(args.entityId);
      if (container) {
        const success = updateContainer(args.entityId, { parentId: args.parentId });
        if (!success) {
          return { content: [{ type: 'text' as const, text: `Failed to set parent of container: ${args.entityId}` }], isError: true };
        }
        return { content: [{ type: 'text' as const, text: `Set parent of container ${container.name} to ${args.parentId}` }] };
      }

      return { content: [{ type: 'text' as const, text: `Entity not found: ${args.entityId}` }], isError: true };
    }
  );

  server.tool(
    'move_to_group',
    'Move a thread or container to a group',
    {
      entityId: z.string().describe('Thread or container ID'),
      groupId: z.string().nullable().describe('Group ID (null to remove from group)'),
    } as SchemaShape,
    async (args) => {
      // Validate groupId exists if provided (non-null)
      if (args.groupId) {
        const group = getGroupById(args.groupId);
        if (!group) {
          return { content: [{ type: 'text' as const, text: `Group not found: ${args.groupId}` }], isError: true };
        }
      }

      const thread = getThreadById(args.entityId);
      if (thread) {
        const success = updateThread(args.entityId, { groupId: args.groupId });
        if (!success) {
          return { content: [{ type: 'text' as const, text: `Failed to move thread to group: ${args.entityId}` }], isError: true };
        }
        return { content: [{ type: 'text' as const, text: `Moved thread ${thread.name} to group ${args.groupId}` }] };
      }

      const container = getContainerById(args.entityId);
      if (container) {
        const success = updateContainer(args.entityId, { groupId: args.groupId });
        if (!success) {
          return { content: [{ type: 'text' as const, text: `Failed to move container to group: ${args.entityId}` }], isError: true };
        }
        return { content: [{ type: 'text' as const, text: `Moved container ${container.name} to group ${args.groupId}` }] };
      }

      return { content: [{ type: 'text' as const, text: `Entity not found: ${args.entityId}` }], isError: true };
    }
  );

  server.tool(
    'get_children',
    'Get immediate children of an entity',
    {
      entityId: z.string().describe('Parent entity ID'),
    } as SchemaShape,
    async (args) => {
      const threads = getAllThreads().filter(t => t.parentId === args.entityId);
      const containers = getAllContainers().filter(c => c.parentId === args.entityId);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ threads, containers }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'get_ancestors',
    'Get all ancestors of an entity (path to root)',
    {
      entityId: z.string().describe('Entity ID'),
    } as SchemaShape,
    async (args) => {
      const ancestors: (Thread | Container)[] = [];
      const visited = new Set<string>();
      let currentId: string | null = args.entityId;

      while (currentId) {
        if (visited.has(currentId)) break;
        visited.add(currentId);

        const thread: Thread | undefined = getThreadById(currentId);
        const container: Container | undefined = thread ? undefined : getContainerById(currentId);
        const entity: Thread | Container | undefined = thread ?? container;

        if (!entity) break;
        if (currentId !== args.entityId) ancestors.push(entity);
        currentId = entity.parentId;
      }

      return { content: [{ type: 'text' as const, text: JSON.stringify(ancestors, null, 2) }] };
    }
  );

  server.tool(
    'get_subtree',
    'Get the full subtree rooted at an entity',
    {
      entityId: z.string().describe('Root entity ID'),
    } as SchemaShape,
    async (args) => {
      const visited = new Set<string>();
      const collectChildren = (parentId: string): { threads: Thread[]; containers: Container[] } => {
        if (visited.has(parentId)) return { threads: [], containers: [] };
        visited.add(parentId);

        const threads = getAllThreads().filter(t => t.parentId === parentId);
        const containers = getAllContainers().filter(c => c.parentId === parentId);

        const nestedThreads = threads.flatMap(t => collectChildren(t.id).threads);
        const nestedContainers = containers.flatMap(c => collectChildren(c.id).containers);

        return {
          threads: [...threads, ...nestedThreads],
          containers: [...containers, ...nestedContainers],
        };
      };

      const root = getEntityById(args.entityId);
      const children = collectChildren(args.entityId);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ root, children }, null, 2),
        }],
      };
    }
  );

  // === Query Tools ===

  server.tool(
    'list_threads',
    'List threads with optional filtering',
    {
      status: z.enum(statusEnum).optional().describe('Filter by status'),
      temperature: z.enum(tempEnum).optional().describe('Filter by temperature'),
      importance: z.number().int().min(1).max(5).optional().describe('Filter by importance'),
      size: z.enum(sizeEnum).optional().describe('Filter by size'),
      parentId: z.string().nullable().optional().describe('Filter by parent (null for root threads)'),
      groupId: z.string().optional().describe('Filter by group'),
      tags: z.array(z.string()).optional().describe('Filter by any of these tags'),
      search: z.string().optional().describe('Search in name and description'),
    } as SchemaShape,
    async (args) => {
      let threads = getAllThreads();

      if (args.status) threads = threads.filter(t => t.status === args.status);
      if (args.temperature) threads = threads.filter(t => t.temperature === args.temperature);
      if (args.importance) threads = threads.filter(t => t.importance === args.importance);
      if (args.size) threads = threads.filter(t => t.size === args.size);
      if (args.parentId !== undefined) threads = threads.filter(t => t.parentId === args.parentId);
      if (args.groupId) threads = threads.filter(t => t.groupId === args.groupId);
      if (args.tags && args.tags.length > 0) {
        threads = threads.filter(t =>
          args.tags!.some((tag: string) => t.tags?.includes(tag))
        );
      }
      if (args.search) {
        const searchLower = args.search.toLowerCase();
        threads = threads.filter(t =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description?.toLowerCase().includes(searchLower)
        );
      }

      return { content: [{ type: 'text' as const, text: JSON.stringify(threads, null, 2) }] };
    }
  );

  server.tool(
    'list_containers',
    'List containers with optional filtering',
    {
      parentId: z.string().nullable().optional().describe('Filter by parent (null for root containers)'),
      groupId: z.string().optional().describe('Filter by group'),
      tags: z.array(z.string()).optional().describe('Filter by any of these tags'),
      search: z.string().optional().describe('Search in name and description'),
    } as SchemaShape,
    async (args) => {
      let containers = getAllContainers();

      if (args.parentId !== undefined) containers = containers.filter(c => c.parentId === args.parentId);
      if (args.groupId) containers = containers.filter(c => c.groupId === args.groupId);
      if (args.tags && args.tags.length > 0) {
        containers = containers.filter(c =>
          args.tags!.some((tag: string) => c.tags?.includes(tag))
        );
      }
      if (args.search) {
        const searchLower = args.search.toLowerCase();
        containers = containers.filter(c =>
          c.name.toLowerCase().includes(searchLower) ||
          c.description?.toLowerCase().includes(searchLower)
        );
      }

      return { content: [{ type: 'text' as const, text: JSON.stringify(containers, null, 2) }] };
    }
  );

  server.tool(
    'list_groups',
    'List all groups',
    {} as SchemaShape,
    async () => {
      const groups = getAllGroups();
      return { content: [{ type: 'text' as const, text: JSON.stringify(groups, null, 2) }] };
    }
  );

  server.tool(
    'search_threads',
    'Search threads and containers by text query',
    {
      query: z.string().describe('Search query'),
    } as SchemaShape,
    async (args) => {
      const queryLower = args.query.toLowerCase();
      const threads = getAllThreads().filter(t =>
        t.name.toLowerCase().includes(queryLower) ||
        t.description?.toLowerCase().includes(queryLower)
      );
      const containers = getAllContainers().filter(c =>
        c.name.toLowerCase().includes(queryLower) ||
        c.description?.toLowerCase().includes(queryLower)
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ threads, containers }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'get_next_action',
    'Suggest the next thread to work on based on priority',
    {} as SchemaShape,
    async () => {
      const threads = getAllThreads()
        .filter(t => t.status === 'active')
        .sort((a, b) => {
          // Sort by importance (desc), then temperature (desc)
          if (a.importance !== b.importance) return b.importance - a.importance;
          const tempOrder = ['hot', 'warm', 'tepid', 'cold', 'freezing', 'frozen'];
          return tempOrder.indexOf(a.temperature) - tempOrder.indexOf(b.temperature);
        });

      if (threads.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No active threads to suggest' }] };
      }

      return { content: [{ type: 'text' as const, text: JSON.stringify(threads[0], null, 2) }] };
    }
  );

  server.tool(
    'get_full_tree',
    'Get the complete hierarchy tree',
    {} as SchemaShape,
    async () => {
      const threads = getAllThreads();
      const containers = getAllContainers();
      const groups = getAllGroups();

      // Build tree structure
      const tree = {
        groups: groups.map(g => ({
          ...g,
          entities: [...threads, ...containers].filter(e => e.groupId === g.id),
        })),
        rootEntities: [...threads, ...containers].filter(e => !e.parentId && !e.groupId),
      };

      return { content: [{ type: 'text' as const, text: JSON.stringify(tree, null, 2) }] };
    }
  );

  server.tool(
    'get_entity',
    'Get any entity (thread or container) by ID or name',
    {
      identifier: z.string().describe('Entity ID or name'),
    } as SchemaShape,
    async (args) => {
      const entity = getEntityById(args.identifier) ?? getEntityByName(args.identifier);
      if (!entity) {
        return { content: [{ type: 'text' as const, text: `Entity not found: ${args.identifier}` }], isError: true };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(entity, null, 2) }] };
    }
  );

  server.tool(
    'get_container',
    'Get a container by ID or name',
    {
      identifier: z.string().describe('Container ID or name'),
    } as SchemaShape,
    async (args) => {
      const container = getContainerById(args.identifier) ??
        getAllContainers().find(c => c.name.toLowerCase() === args.identifier.toLowerCase());
      if (!container) {
        return { content: [{ type: 'text' as const, text: `Container not found: ${args.identifier}` }], isError: true };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(container, null, 2) }] };
    }
  );

  server.tool(
    'get_group',
    'Get a group by ID or name',
    {
      identifier: z.string().describe('Group ID or name'),
    } as SchemaShape,
    async (args) => {
      const group = getGroupById(args.identifier) ??
        getAllGroups().find(g => g.name.toLowerCase() === args.identifier.toLowerCase());
      if (!group) {
        return { content: [{ type: 'text' as const, text: `Group not found: ${args.identifier}` }], isError: true };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(group, null, 2) }] };
    }
  );
}
