import { Command } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllGroups,
  getGroupById,
  getGroupByName,
  addGroup,
  updateGroup,
  deleteGroup,
  getAllThreads,
  getThreadById,
  getThreadByName,
  updateThread,
  getAllContainers,
  updateContainer
} from '../storage';
import { Group } from '../models';
import chalk from 'chalk';

function findThread(identifier: string) {
  let thread = getThreadById(identifier);
  if (!thread) thread = getThreadByName(identifier);
  if (!thread) {
    const all = getAllThreads();
    const matches = all.filter(t =>
      t.id.toLowerCase().startsWith(identifier.toLowerCase()) ||
      t.name.toLowerCase().includes(identifier.toLowerCase())
    );
    if (matches.length === 1) thread = matches[0];
  }
  return thread;
}

function findGroup(identifier: string) {
  let group = getGroupById(identifier);
  if (!group) group = getGroupByName(identifier);
  if (!group) {
    const all = getAllGroups();
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
    if (!action || action === 'list') {
      // List all groups
      const groups = getAllGroups();
      const threads = getAllThreads();

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

        const existing = getGroupByName(name);
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

        addGroup(group);
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

        updateThread(thread.id, { groupId: group.id });
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

        updateThread(thread.id, { groupId: null });
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
        const threads = getAllThreads().filter(t => t.groupId === group.id);
        const containers = getAllContainers().filter(c => c.groupId === group.id);

        threads.forEach(t => updateThread(t.id, { groupId: null }));
        containers.forEach(c => updateContainer(c.id, { groupId: null }));

        deleteGroup(group.id);
        const total = threads.length + containers.length;
        console.log(chalk.green(`\nDeleted group "${group.name}" (${total} item(s) ungrouped)\n`));
        break;
      }

      default:
        console.log(chalk.red(`Unknown action "${action}". Use: list, new, add, remove, delete`));
    }
  });
