import { Command } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import { Thread } from '@redjay/threads-core';
import { formatThreadSummary } from '../utils';
import { getStorage } from '../context';
import chalk from 'chalk';

export function findThread(identifier: string): Thread | undefined {
  const storage = getStorage();
  let thread = storage.getThreadById(identifier);
  if (!thread) thread = storage.getThreadByName(identifier);
  if (!thread) {
    const all = storage.getAllThreads();
    const matches = all.filter(t =>
      t.id.toLowerCase().startsWith(identifier.toLowerCase()) ||
      t.name.toLowerCase().includes(identifier.toLowerCase())
    );
    if (matches.length === 1) thread = matches[0];
  }
  return thread;
}

export function getChildren(parentId: string, threads: Thread[]): Thread[] {
  return threads.filter(t => t.parentId === parentId);
}

interface CloneResult {
  original: Thread;
  cloned: Thread;
}

export function cloneThread(
  source: Thread,
  newName: string,
  parentId: string | null,
  groupId: string | null
): Thread {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name: newName,
    description: source.description,
    status: source.status,
    importance: source.importance,
    temperature: source.temperature,
    size: source.size,
    parentId,
    groupId,
    tags: [...source.tags],
    dependencies: [],  // Don't copy dependencies
    progress: [],      // Don't copy progress
    details: [],       // Don't copy details
    createdAt: now,
    updatedAt: now
  };
}

export function cloneWithChildren(
  source: Thread,
  newName: string,
  parentId: string | null,
  groupId: string | null,
  allThreads: Thread[]
): Thread[] {
  const cloned = cloneThread(source, newName, parentId, groupId);
  const results: Thread[] = [cloned];

  // Recursively clone children
  const children = getChildren(source.id, allThreads);
  for (const child of children) {
    const childClones = cloneWithChildren(
      child,
      child.name,  // Keep original name for children
      cloned.id,   // Set parent to the cloned parent
      groupId,     // Inherit group from root clone
      allThreads
    );
    results.push(...childClones);
  }

  return results;
}

export const cloneCommand = new Command('clone')
  .description('Clone a thread as a template')
  .argument('<source>', 'Source thread name or ID')
  .argument('[new-name]', 'Name for the cloned thread')
  .option('--with-children', 'Recursively clone children')
  .option('--parent <id>', 'Set a different parent for the clone')
  .option('--group <name>', 'Set a different group for the clone')
  .action((sourceIdentifier: string, newName: string | undefined, options) => {
    const storage = getStorage();
    const source = findThread(sourceIdentifier);

    if (!source) {
      console.log(chalk.red(`Thread "${sourceIdentifier}" not found`));
      return;
    }

    // Determine the new name
    const cloneName = newName || `${source.name} (copy)`;

    // Check for duplicate name
    const existing = storage.getThreadByName(cloneName);
    if (existing) {
      console.log(chalk.red(`Thread "${cloneName}" already exists`));
      return;
    }

    // Determine parent
    let parentId: string | null = source.parentId;
    if (options.parent) {
      const parentThread = findThread(options.parent);
      if (!parentThread) {
        console.log(chalk.red(`Parent thread "${options.parent}" not found`));
        return;
      }
      parentId = parentThread.id;
    }

    // Determine group
    let groupId: string | null = source.groupId;
    if (options.group) {
      const group = storage.getGroupByName(options.group);
      if (!group) {
        console.log(chalk.red(`Group "${options.group}" not found`));
        return;
      }
      groupId = group.id;
    }

    const allThreads = storage.getAllThreads();

    if (options.withChildren) {
      // Clone with children - add each thread individually
      const clonedThreads = cloneWithChildren(source, cloneName, parentId, groupId, allThreads);

      for (const thread of clonedThreads) {
        storage.addThread(thread);
      }

      console.log(chalk.green(`\nCloned "${source.name}" with ${clonedThreads.length} thread(s):\n`));
      for (const thread of clonedThreads) {
        console.log(formatThreadSummary(thread));
        console.log('');
      }
    } else {
      // Clone single thread
      const cloned = cloneThread(source, cloneName, parentId, groupId);
      storage.addThread(cloned);

      console.log(chalk.green(`\nCloned "${source.name}":\n`));
      console.log(formatThreadSummary(cloned));
      console.log('');
    }
  });
