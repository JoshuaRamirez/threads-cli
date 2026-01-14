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
  getAllEntities,
  updateThread,
  deleteThread
} from '../storage';
import { Container, Entity, Thread } from '../models';
import { formatContainerDetail } from '../utils';
import chalk from 'chalk';
import * as readline from 'readline';

interface Descendant {
  entity: Entity;
  depth: number;
}

// Collect all descendants recursively with depth info
function collectDescendants(parentId: string, depth: number = 0): Descendant[] {
  const threads = getAllThreads();
  const containers = getAllContainers();
  const descendants: Descendant[] = [];

  // Direct children
  const childThreads = threads.filter(t => t.parentId === parentId);
  const childContainers = containers.filter(c => c.parentId === parentId);

  for (const thread of childThreads) {
    descendants.push({ entity: thread, depth });
    // Threads can have sub-threads
    descendants.push(...collectDescendants(thread.id, depth + 1));
  }

  for (const container of childContainers) {
    descendants.push({ entity: container, depth });
    descendants.push(...collectDescendants(container.id, depth + 1));
  }

  return descendants;
}

// Display tree preview of affected entities
function displayAffectedTree(container: Container, descendants: Descendant[]): void {
  console.log(chalk.bold('\nAffected entities:\n'));
  console.log(`  ${chalk.magenta('📁')} ${chalk.bold(container.name)} ${chalk.gray(`[${container.id.slice(0, 8)}]`)}`);

  for (let i = 0; i < descendants.length; i++) {
    const { entity, depth } = descendants[i];
    const indent = '  '.repeat(depth + 2);
    const isLast = i === descendants.length - 1 || descendants[i + 1]?.depth <= depth;
    const prefix = isLast ? '└── ' : '├── ';
    const icon = entity.type === 'container' ? chalk.magenta('📁') : chalk.blue('◆');
    console.log(`${indent}${prefix}${icon} ${entity.name} ${chalk.gray(`[${entity.id.slice(0, 8)}]`)}`);
  }
  console.log('');
}

// Prompt for confirmation
async function confirmAction(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(chalk.yellow(`${message} [y/N] `), (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Delete entity (thread or container)
function deleteEntity(entity: Entity): void {
  if (entity.type === 'container') {
    deleteContainer(entity.id);
  } else {
    deleteThread(entity.id);
  }
}

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
  .option('-c, --cascade', 'Delete container and all descendants')
  .option('--orphan', 'Unparent children before deleting container')
  .option('--move <target>', 'Move children to target before deleting')
  .option('--dry-run', 'Preview what would be affected')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (action: string | undefined, args: string[], options) => {
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

        // Cascade group change to all descendants
        if (updates.groupId !== undefined) {
          const allThreads = getAllThreads();
          const allContainers = getAllContainers();
          const newGroupId = updates.groupId;
          let cascadeCount = 0;

          // Recursive function to update all descendants
          function cascadeGroup(parentId: string): void {
            // Update child threads
            allThreads.filter(t => t.parentId === parentId).forEach(t => {
              updateThread(t.id, { groupId: newGroupId });
              cascadeCount++;
            });
            // Update child containers and recurse
            allContainers.filter(c => c.parentId === parentId).forEach(c => {
              updateContainer(c.id, { groupId: newGroupId });
              cascadeCount++;
              cascadeGroup(c.id);
            });
          }

          cascadeGroup(container.id);
          if (cascadeCount > 0) {
            console.log(chalk.green(`\nUpdated container "${container.name}" (+ ${cascadeCount} descendants)\n`));
          } else {
            console.log(chalk.green(`\nUpdated container "${container.name}"\n`));
          }
        } else {
          console.log(chalk.green(`\nUpdated container "${container.name}"\n`));
        }
        break;
      }

      case 'delete': {
        const identifier = args[0];
        if (!identifier) {
          console.log(chalk.red('Usage: threads container delete <identifier> [--cascade|--orphan|--move <target>] [--dry-run] [-f]'));
          return;
        }

        const container = findContainer(identifier);
        if (!container) {
          console.log(chalk.red(`Container "${identifier}" not found`));
          return;
        }

        const descendants = collectDescendants(container.id);
        const hasChildren = descendants.length > 0;

        // Validate option combinations
        const modeCount = [options.cascade, options.orphan, options.move].filter(Boolean).length;
        if (modeCount > 1) {
          console.log(chalk.red('Cannot combine --cascade, --orphan, and --move. Choose one.'));
          return;
        }

        // No children - simple delete
        if (!hasChildren) {
          if (options.dryRun) {
            console.log(chalk.cyan(`\nDry run: Would delete container "${container.name}"\n`));
            return;
          }
          deleteContainer(container.id);
          console.log(chalk.green(`\nDeleted container "${container.name}"\n`));
          break;
        }

        // Has children but no mode specified - show helpful message
        if (!options.cascade && !options.orphan && !options.move) {
          displayAffectedTree(container, descendants);
          console.log(chalk.yellow('Container has children. Choose a strategy:\n'));
          console.log(`  ${chalk.cyan('--cascade, -c')}    Delete container and all ${descendants.length} descendant(s)`);
          console.log(`  ${chalk.cyan('--orphan')}        Move children to parent (or ungrouped) then delete`);
          console.log(`  ${chalk.cyan('--move <target>')} Move children to another container then delete`);
          console.log(`\nAdd ${chalk.cyan('--dry-run')} to preview, ${chalk.cyan('-f')} to skip confirmation.\n`);
          return;
        }

        // Handle --cascade
        if (options.cascade) {
          displayAffectedTree(container, descendants);

          if (options.dryRun) {
            console.log(chalk.cyan(`Dry run: Would delete container and ${descendants.length} descendant(s)\n`));
            return;
          }

          if (!options.force) {
            const confirmed = await confirmAction(`Delete container and ${descendants.length} descendant(s)?`);
            if (!confirmed) {
              console.log(chalk.dim('\nCancelled.\n'));
              return;
            }
          }

          // Delete in reverse order (deepest first)
          const sorted = [...descendants].sort((a, b) => b.depth - a.depth);
          for (const { entity } of sorted) {
            deleteEntity(entity);
          }
          deleteContainer(container.id);
          console.log(chalk.green(`\nDeleted "${container.name}" and ${descendants.length} descendant(s)\n`));
          break;
        }

        // Handle --orphan
        if (options.orphan) {
          const directChildren = descendants.filter(d => d.depth === 0);
          const newParentId = container.parentId || null;
          const newGroupId = container.parentId
            ? getAllEntities().find(e => e.id === container.parentId)?.groupId || null
            : null;

          displayAffectedTree(container, descendants);
          const destLabel = newParentId
            ? getAllEntities().find(e => e.id === newParentId)?.name || 'parent'
            : 'ungrouped';
          console.log(chalk.dim(`Children will be moved to: ${destLabel}\n`));

          if (options.dryRun) {
            console.log(chalk.cyan(`Dry run: Would orphan ${directChildren.length} direct child(ren) and delete container\n`));
            return;
          }

          if (!options.force) {
            const confirmed = await confirmAction(`Orphan ${directChildren.length} child(ren) and delete container?`);
            if (!confirmed) {
              console.log(chalk.dim('\nCancelled.\n'));
              return;
            }
          }

          // Move direct children to container's parent
          for (const { entity } of directChildren) {
            if (entity.type === 'container') {
              updateContainer(entity.id, { parentId: newParentId, groupId: newGroupId });
            } else {
              updateThread(entity.id, { parentId: newParentId, groupId: newGroupId });
            }
          }
          deleteContainer(container.id);
          console.log(chalk.green(`\nOrphaned ${directChildren.length} child(ren) and deleted "${container.name}"\n`));
          break;
        }

        // Handle --move
        if (options.move) {
          const target = findEntity(options.move);
          if (!target) {
            console.log(chalk.red(`Target "${options.move}" not found`));
            return;
          }
          if (target.id === container.id) {
            console.log(chalk.red('Cannot move children to the same container'));
            return;
          }
          // Check if target is a descendant (would create cycle)
          if (descendants.some(d => d.entity.id === target.id)) {
            console.log(chalk.red('Cannot move children to a descendant'));
            return;
          }

          const directChildren = descendants.filter(d => d.depth === 0);

          displayAffectedTree(container, descendants);
          console.log(chalk.dim(`Children will be moved to: ${target.name}\n`));

          if (options.dryRun) {
            console.log(chalk.cyan(`Dry run: Would move ${directChildren.length} child(ren) to "${target.name}" and delete container\n`));
            return;
          }

          if (!options.force) {
            const confirmed = await confirmAction(`Move ${directChildren.length} child(ren) to "${target.name}" and delete container?`);
            if (!confirmed) {
              console.log(chalk.dim('\nCancelled.\n'));
              return;
            }
          }

          // Move direct children to target
          for (const { entity } of directChildren) {
            if (entity.type === 'container') {
              updateContainer(entity.id, { parentId: target.id, groupId: target.groupId });
            } else {
              updateThread(entity.id, { parentId: target.id, groupId: target.groupId });
            }
          }
          deleteContainer(container.id);
          console.log(chalk.green(`\nMoved ${directChildren.length} child(ren) to "${target.name}" and deleted "${container.name}"\n`));
          break;
        }

        break;
      }

      default:
        console.log(chalk.red(`Unknown action "${action}". Use: list, new, show, update, delete`));
    }
  });
