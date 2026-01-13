import { Command } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllContainers,
  getContainerById,
  getContainerByName,
  addContainer,
  updateContainer,
  deleteContainer,
  getAllGroups,
  getGroupByName,
  getAllThreads,
  getAllEntities
} from '../storage';
import { Container, Entity } from '../models';
import { formatContainerDetail } from '../utils';
import chalk from 'chalk';

function findContainer(identifier: string): Container | undefined {
  let container = getContainerById(identifier);
  if (!container) container = getContainerByName(identifier);
  if (!container) {
    const all = getAllContainers();
    const matches = all.filter(c =>
      c.id.toLowerCase().startsWith(identifier.toLowerCase()) ||
      c.name.toLowerCase().includes(identifier.toLowerCase())
    );
    if (matches.length === 1) container = matches[0];
  }
  return container;
}

function findEntity(identifier: string): Entity | undefined {
  const entities = getAllEntities();
  let entity = entities.find(e => e.id === identifier);
  if (!entity) entity = entities.find(e => e.name.toLowerCase() === identifier.toLowerCase());
  if (!entity) {
    const matches = entities.filter(e =>
      e.id.toLowerCase().startsWith(identifier.toLowerCase()) ||
      e.name.toLowerCase().includes(identifier.toLowerCase())
    );
    if (matches.length === 1) entity = matches[0];
  }
  return entity;
}

export const containerCommand = new Command('container')
  .alias('cont')
  .description('Manage containers (organizational nodes)')
  .argument('[action]', 'Action: list, new, show, update, delete')
  .argument('[args...]', 'Arguments for the action')
  .option('-d, --description <desc>', 'Description for container')
  .option('-g, --group <group>', 'Group to assign container to')
  .option('-p, --parent <parent>', 'Parent container or thread')
  .option('--tag <tag>', 'Add a tag')
  .action((action: string | undefined, args: string[], options) => {
    if (!action || action === 'list') {
      const containers = getAllContainers();
      const groups = getAllGroups();
      const threads = getAllThreads();

      if (containers.length === 0) {
        console.log(chalk.dim('\nNo containers defined\n'));
        return;
      }

      console.log(chalk.bold(`\nContainers (${containers.length}):\n`));
      containers.forEach(c => {
        const group = c.groupId ? groups.find(g => g.id === c.groupId) : null;
        const childCount = [...threads, ...containers].filter(e => e.parentId === c.id).length;
        const groupLabel = group ? chalk.gray(` in ${group.name}`) : '';
        const childLabel = childCount > 0 ? chalk.dim(` (${childCount} children)`) : '';
        const tags = c.tags && c.tags.length > 0 ? ' ' + c.tags.map(t => chalk.cyan(`#${t}`)).join(' ') : '';

        console.log(`  ${chalk.magenta('📦')} ${chalk.bold(c.name)} ${chalk.gray(`[${c.id.slice(0, 8)}]`)}${groupLabel}${childLabel}${tags}`);
        if (c.description) {
          console.log(`     ${chalk.dim(c.description)}`);
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
          console.log(chalk.red('Usage: threads container new <name> [-d description] [-g group] [-p parent]'));
          return;
        }

        const existing = getContainerByName(name);
        if (existing) {
          console.log(chalk.red(`Container "${name}" already exists`));
          return;
        }

        let groupId: string | null = null;
        if (options.group) {
          const group = getGroupByName(options.group);
          if (!group) {
            console.log(chalk.red(`Group "${options.group}" not found`));
            return;
          }
          groupId = group.id;
        }

        let parentId: string | null = null;
        if (options.parent) {
          const parent = findEntity(options.parent);
          if (!parent) {
            console.log(chalk.red(`Parent "${options.parent}" not found`));
            return;
          }
          parentId = parent.id;
          // Inherit group from parent if not specified
          if (!groupId && parent.groupId) {
            groupId = parent.groupId;
          }
        }

        const now = new Date().toISOString();
        const container: Container = {
          type: 'container',
          id: uuidv4(),
          name,
          description: options.description || '',
          parentId,
          groupId,
          tags: options.tag ? [options.tag] : [],
          details: [],
          createdAt: now,
          updatedAt: now
        };

        addContainer(container);
        console.log(chalk.green(`\nCreated container "${name}" [${container.id.slice(0, 8)}]\n`));
        break;
      }

      case 'show': {
        const identifier = args[0];
        if (!identifier) {
          console.log(chalk.red('Usage: threads container show <identifier>'));
          return;
        }

        const container = findContainer(identifier);
        if (!container) {
          console.log(chalk.red(`Container "${identifier}" not found`));
          return;
        }

        console.log('');
        console.log(formatContainerDetail(container));
        console.log('');
        break;
      }

      case 'update': {
        const identifier = args[0];
        if (!identifier) {
          console.log(chalk.red('Usage: threads container update <identifier> [-d description] [-g group] [-p parent]'));
          return;
        }

        const container = findContainer(identifier);
        if (!container) {
          console.log(chalk.red(`Container "${identifier}" not found`));
          return;
        }

        const updates: Partial<Container> = {};

        if (options.description !== undefined) {
          updates.description = options.description;
        }

        if (options.group !== undefined) {
          if (options.group === '' || options.group === 'none') {
            updates.groupId = null;
          } else {
            const group = getGroupByName(options.group);
            if (!group) {
              console.log(chalk.red(`Group "${options.group}" not found`));
              return;
            }
            updates.groupId = group.id;
          }
        }

        if (options.parent !== undefined) {
          if (options.parent === '' || options.parent === 'none') {
            updates.parentId = null;
          } else {
            const parent = findEntity(options.parent);
            if (!parent) {
              console.log(chalk.red(`Parent "${options.parent}" not found`));
              return;
            }
            if (parent.id === container.id) {
              console.log(chalk.red('Container cannot be its own parent'));
              return;
            }
            updates.parentId = parent.id;
          }
        }

        if (options.tag) {
          updates.tags = [...(container.tags || []), options.tag];
        }

        if (Object.keys(updates).length === 0) {
          console.log(chalk.yellow('No updates specified'));
          return;
        }

        updateContainer(container.id, updates);
        console.log(chalk.green(`\nUpdated container "${container.name}"\n`));
        break;
      }

      case 'delete': {
        const identifier = args[0];
        if (!identifier) {
          console.log(chalk.red('Usage: threads container delete <identifier>'));
          return;
        }

        const container = findContainer(identifier);
        if (!container) {
          console.log(chalk.red(`Container "${identifier}" not found`));
          return;
        }

        // Check for children
        const entities = getAllEntities();
        const children = entities.filter(e => e.parentId === container.id);
        if (children.length > 0) {
          console.log(chalk.red(`Cannot delete container with ${children.length} child(ren). Move or delete children first.`));
          return;
        }

        deleteContainer(container.id);
        console.log(chalk.green(`\nDeleted container "${container.name}"\n`));
        break;
      }

      default:
        console.log(chalk.red(`Unknown action "${action}". Use: list, new, show, update, delete`));
    }
  });
