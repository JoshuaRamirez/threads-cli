import { Command } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import { Group } from '@redjay/threads-core';
import { getStorage } from '../context';
import chalk from 'chalk';

function findThread(identifier: string) {
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

function findGroup(identifier: string) {
  const storage = getStorage();
  let group = storage.getGroupById(identifier);
  if (!group) group = storage.getGroupByName(identifier);
  if (!group) {
    const all = storage.getAllGroups();
    const matches = all.filter(g =>
      g.id.toLowerCase().startsWith(identifier.toLowerCase()) ||
      g.name.toLowerCase().includes(identifier.toLowerCase())
    );
    if (matches.length === 1) group = matches[0];
  }
  return group;
}

export const groupCommand = new Command('group')
  .description('Manage thread groups')
  .argument('[action]', 'Action: list, new, add, remove, delete')
  .argument('[args...]', 'Arguments for the action')
  .option('-d, --description <desc>', 'Description for new group')
  .action((action: string | undefined, args: string[], options) => {
    const storage = getStorage();
    if (!action || action === 'list') {
      // List all groups
      const groups = storage.getAllGroups();
      const threads = storage.getAllThreads();

      if (groups.length === 0) {
        console.log(chalk.dim('\nNo groups defined\n'));
        return;
      }

      console.log(chalk.bold('\nGroups:\n'));
      groups.forEach(g => {
        const count = threads.filter(t => t.groupId === g.id).length;
        console.log(`  ${chalk.bold(g.name)} ${chalk.gray(`[${g.id.slice(0, 8)}]`)} - ${count} thread(s)`);
        if (g.description) {
          console.log(`    ${chalk.dim(g.description)}`);
        }
      });
      console.log('');
      return;
    }

    switch (action) {
      case 'new':
      case 'create': {
        const name = args[0];
        if (!name) {
          console.log(chalk.red('Usage: threads group new <name> [-d description]'));
          return;
        }

        const existing = storage.getGroupByName(name);
        if (existing) {
          console.log(chalk.red(`Group "${name}" already exists`));
          return;
        }

        const now = new Date().toISOString();
        const group: Group = {
          id: uuidv4(),
          name,
          description: options.description || '',
          createdAt: now,
          updatedAt: now
        };

        storage.addGroup(group);
        console.log(chalk.green(`\nCreated group "${name}"\n`));
        break;
      }

      case 'add': {
        // Add a thread to a group
        const [threadId, groupId] = args;
        if (!threadId || !groupId) {
          console.log(chalk.red('Usage: threads group add <thread> <group>'));
          return;
        }

        const thread = findThread(threadId);
        if (!thread) {
          console.log(chalk.red(`Thread "${threadId}" not found`));
          return;
        }

        const group = findGroup(groupId);
        if (!group) {
          console.log(chalk.red(`Group "${groupId}" not found`));
          return;
        }

        storage.updateThread(thread.id, { groupId: group.id });
        console.log(chalk.green(`\nAdded "${thread.name}" to group "${group.name}"\n`));
        break;
      }

      case 'remove': {
        // Remove a thread from its group
        const threadId = args[0];
        if (!threadId) {
          console.log(chalk.red('Usage: threads group remove <thread>'));
          return;
        }

        const thread = findThread(threadId);
        if (!thread) {
          console.log(chalk.red(`Thread "${threadId}" not found`));
          return;
        }

        if (!thread.groupId) {
          console.log(chalk.yellow(`"${thread.name}" is not in a group`));
          return;
        }

        storage.updateThread(thread.id, { groupId: null });
        console.log(chalk.green(`\nRemoved "${thread.name}" from its group\n`));
        break;
      }

      case 'delete': {
        const groupId = args[0];
        if (!groupId) {
          console.log(chalk.red('Usage: threads group delete <group>'));
          return;
        }

        const group = findGroup(groupId);
        if (!group) {
          console.log(chalk.red(`Group "${groupId}" not found`));
          return;
        }

        // Remove group from all threads and containers
        const threads = storage.getAllThreads().filter(t => t.groupId === group.id);
        const containers = storage.getAllContainers().filter(c => c.groupId === group.id);

        threads.forEach(t => storage.updateThread(t.id, { groupId: null }));
        containers.forEach(c => storage.updateContainer(c.id, { groupId: null }));

        storage.deleteGroup(group.id);
        const total = threads.length + containers.length;
        console.log(chalk.green(`\nDeleted group "${group.name}" (${total} item(s) ungrouped)\n`));
        break;
      }

      default:
        console.log(chalk.red(`Unknown action "${action}". Use: list, new, add, remove, delete`));
    }
  });
