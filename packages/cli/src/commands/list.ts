import { Command, Option } from 'commander';
import { getAllThreads, getAllGroups, getGroupById, getAllContainers, getAllEntities, getEntityById } from '@redjay/threads-storage';
import { Thread, ThreadStatus, Temperature, ThreadSize, Importance, Entity, Container } from '@redjay/threads-core';
import { formatThreadSummary, buildTree, renderTree } from '../utils';
import chalk from 'chalk';

// Find entity by id, name, or partial match
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

// Get ancestry path from root to entity
function getAncestryPath(entity: Entity): Entity[] {
  const path: Entity[] = [];
  let current: Entity | undefined = entity;

  while (current) {
    path.unshift(current);
    if (current.parentId) {
      current = getEntityById(current.parentId);
    } else {
      break;
    }
  }

  return path;
}

// Get all descendants of an entity
function getDescendants(entityId: string, maxDepth: number = Infinity, currentDepth: number = 0): Entity[] {
  if (currentDepth >= maxDepth) return [];

  const entities = getAllEntities();
  const children = entities.filter(e => e.parentId === entityId);
  const descendants: Entity[] = [];

  for (const child of children) {
    descendants.push(child);
    if (currentDepth + 1 < maxDepth) {
      descendants.push(...getDescendants(child.id, maxDepth, currentDepth + 1));
    }
  }

  return descendants;
}

// Get siblings (entities with same parent)
function getSiblings(entity: Entity): Entity[] {
  const entities = getAllEntities();
  return entities.filter(e => e.parentId === entity.parentId && e.id !== entity.id);
}

// Check if entity is a thread (has temperature property)
function isThread(entity: Entity): entity is Thread {
  return 'temperature' in entity;
}

// Render a subtree rooted at an entity
function renderSubtree(root: Entity, descendants: Entity[], depth: number): string[] {
  const lines: string[] = [];

  function renderEntity(entity: Entity, prefix: string, isLast: boolean): void {
    const connector = isLast ? '└── ' : '├── ';
    const icon = isThread(entity) ? chalk.blue('◆') : chalk.magenta('📁');
    const thread = isThread(entity) ? entity as Thread : null;

    let info = '';
    if (thread) {
      const tempColors: Record<string, typeof chalk.red> = {
        hot: chalk.red, warm: chalk.yellow, tepid: chalk.white,
        cold: chalk.cyan, freezing: chalk.blue, frozen: chalk.gray
      };
      const tempColor = tempColors[thread.temperature] || chalk.white;
      const stars = '★'.repeat(thread.importance) + '☆'.repeat(5 - thread.importance);
      const tags = thread.tags?.length ? ' ' + thread.tags.map(t => chalk.cyan(`#${t}`)).join(' ') : '';
      info = ` ${tempColor(thread.temperature.charAt(0).toUpperCase() + thread.temperature.slice(1))} ${chalk.yellow(stars)}${tags}`;
    }

    lines.push(`${prefix}${connector}${icon} ${entity.name} ${chalk.gray(`[${entity.id.slice(0, 8)}]`)}${info}`);

    // Get children of this entity from descendants
    const children = descendants.filter(d => d.parentId === entity.id);
    const childPrefix = prefix + (isLast ? '    ' : '│   ');

    children.forEach((child, i) => {
      renderEntity(child, childPrefix, i === children.length - 1);
    });
  }

  // Render root
  const icon = isThread(root) ? chalk.blue('◆') : chalk.magenta('📁');
  const thread = isThread(root) ? root as Thread : null;
  let info = '';
  if (thread) {
    const tempColors: Record<string, typeof chalk.red> = {
      hot: chalk.red, warm: chalk.yellow, tepid: chalk.white,
      cold: chalk.cyan, freezing: chalk.blue, frozen: chalk.gray
    };
    const tempColor = tempColors[thread.temperature] || chalk.white;
    const stars = '★'.repeat(thread.importance) + '☆'.repeat(5 - thread.importance);
    const tags = thread.tags?.length ? ' ' + thread.tags.map(t => chalk.cyan(`#${t}`)).join(' ') : '';
    info = ` ${tempColor(thread.temperature.charAt(0).toUpperCase() + thread.temperature.slice(1))} ${chalk.yellow(stars)}${tags}`;
  }
  lines.push(`${icon} ${chalk.bold(root.name)} ${chalk.gray(`[${root.id.slice(0, 8)}]`)}${info}`);

  // Render direct children
  const directChildren = descendants.filter(d => d.parentId === root.id);
  directChildren.forEach((child, i) => {
    renderEntity(child, '', i === directChildren.length - 1);
  });

  return lines;
}

// Render ancestry path as breadcrumb
function renderPath(path: Entity[]): string[] {
  const lines: string[] = [];
  const groups = getAllGroups();

  // Find group name if first entity has groupId
  const firstEntity = path[0];
  const group = firstEntity?.groupId ? groups.find(g => g.id === firstEntity.groupId) : null;

  const breadcrumb = path.map((e, i) => {
    const icon = e.type === 'container' ? '📁' : '◆';
    const isLast = i === path.length - 1;
    return isLast ? chalk.bold(`${icon} ${e.name}`) : `${icon} ${e.name}`;
  });

  if (group) {
    lines.push(chalk.gray(`🏷️  ${group.name}`) + ' › ' + breadcrumb.join(chalk.gray(' › ')));
  } else {
    lines.push(breadcrumb.join(chalk.gray(' › ')));
  }

  return lines;
}

export const listCommand = new Command('list')
  .alias('ls')
  .description('List threads with optional filters')
  .argument('[identifier]', 'Optional thread/container to root the list at')
  .option('-s, --status <status>', 'Filter by status (active, paused, stopped, completed, archived)')
  .option('-t, --temp <temp>', 'Filter by temperature (frozen, freezing, cold, tepid, warm, hot)')
  .addOption(new Option('--temperature <temp>', 'Alias for --temp').hideHelp())
  .option('-z, --size <size>', 'Filter by size (tiny, small, medium, large, huge)')
  .option('-i, --importance <level>', 'Filter by minimum importance (1-5)', parseInt)
  .option('-g, --group <name>', 'Filter by group name')
  .option('--tag <tag>', 'Filter by tag')
  .addOption(new Option('--tags <tag>').hideHelp())
  .option('--hot', 'Shortcut for --temp hot')
  .option('--active', 'Shortcut for --status active')
  .option('--all', 'Show all threads including archived')
  .option('--flat', 'Display as flat list (non-hierarchical)')
  .option('--tree', 'Display as hierarchical tree (default)')
  .option('-d, --depth <n>', 'Limit tree depth (0 = node only)', parseInt)
  .option('-p, --parent', 'Show parent\'s subtree instead')
  .option('--siblings', 'Show siblings at same level')
  .option('--path', 'Show ancestry breadcrumb to root')
  .action((identifier: string | undefined, options) => {
    // If identifier provided, use focused view
    if (identifier) {
      const entity = findEntity(identifier);
      if (!entity) {
        console.log(chalk.red(`Entity "${identifier}" not found`));
        return;
      }

      console.log('');

      // --path: Show ancestry breadcrumb
      if (options.path) {
        const path = getAncestryPath(entity);
        const lines = renderPath(path);
        lines.forEach(line => console.log(line));
        console.log('');
        return;
      }

      // --siblings: Show siblings
      if (options.siblings) {
        const siblings = getSiblings(entity);
        if (siblings.length === 0) {
          console.log(chalk.dim('No siblings found'));
          console.log('');
          return;
        }

        const parent = entity.parentId ? getEntityById(entity.parentId) : null;
        if (parent) {
          console.log(chalk.dim(`Siblings under ${parent.name}:`));
        } else {
          console.log(chalk.dim('Siblings at root level:'));
        }
        console.log('');

        // Include current entity highlighted
        const allAtLevel = [entity, ...siblings].sort((a, b) => a.name.localeCompare(b.name));
        for (const e of allAtLevel) {
          const icon = e.type === 'container' ? chalk.magenta('📁') : chalk.blue('◆');
          const highlight = e.id === entity.id ? chalk.bold : (s: string) => s;
          const marker = e.id === entity.id ? chalk.green(' ◀') : '';
          console.log(`  ${icon} ${highlight(e.name)} ${chalk.gray(`[${e.id.slice(0, 8)}]`)}${marker}`);
        }
        console.log('');
        return;
      }

      // --parent: Go up one level
      let targetEntity = entity;
      if (options.parent) {
        if (!entity.parentId) {
          console.log(chalk.yellow(`"${entity.name}" has no parent`));
          console.log('');
          return;
        }
        const parent = getEntityById(entity.parentId);
        if (!parent) {
          console.log(chalk.red('Parent not found'));
          return;
        }
        targetEntity = parent;
      }

      // Get descendants with depth limit
      const maxDepth = options.depth !== undefined ? options.depth : Infinity;
      const descendants = getDescendants(targetEntity.id, maxDepth);

      const lines = renderSubtree(targetEntity, descendants, maxDepth);
      lines.forEach(line => console.log(line));
      console.log('');
      return;
    }

    // Original full list behavior
    let threads = getAllThreads();

    // Coalesce --temp and --temperature aliases
    const temperatureFilter = options.temp || options.temperature;

    // By default, hide archived unless --all or --status archived
    if (!options.all && options.status !== 'archived') {
      threads = threads.filter(t => t.status !== 'archived');
    }

    // Apply filters
    if (options.status) {
      threads = threads.filter(t => t.status === options.status);
    }
    if (options.active) {
      threads = threads.filter(t => t.status === 'active');
    }
    if (temperatureFilter) {
      threads = threads.filter(t => t.temperature === temperatureFilter);
    }
    if (options.hot) {
      threads = threads.filter(t => t.temperature === 'hot');
    }
    if (options.size) {
      threads = threads.filter(t => t.size === options.size);
    }
    if (options.importance) {
      threads = threads.filter(t => t.importance >= options.importance);
    }
    if (options.group) {
      const groups = getAllGroups();
      const group = groups.find(g => g.name.toLowerCase() === options.group.toLowerCase());
      if (group) {
        threads = threads.filter(t => t.groupId === group.id);
      } else {
        console.log(chalk.yellow(`Group "${options.group}" not found`));
        return;
      }
    }
    // Coalesce --tag and --tags aliases
    const tagFilter = options.tag || options.tags;
    if (tagFilter) {
      const tagLower = tagFilter.toLowerCase();
      threads = threads.filter(t =>
        t.tags && t.tags.some(tag => tag.toLowerCase() === tagLower)
      );
    }

    if (threads.length === 0) {
      console.log(chalk.dim('No threads found matching criteria'));
      return;
    }

    // Sort: hot first, then by importance, then by updatedAt
    threads.sort((a, b) => {
      const tempOrder = ['hot', 'warm', 'tepid', 'cold', 'freezing', 'frozen'];
      const tempDiff = tempOrder.indexOf(a.temperature) - tempOrder.indexOf(b.temperature);
      if (tempDiff !== 0) return tempDiff;

      if (a.importance !== b.importance) return b.importance - a.importance;

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    console.log(chalk.bold(`\nThreads (${threads.length}):\n`));

    // Determine display mode: tree is default unless --flat is specified
    const useFlat = options.flat && !options.tree;

    if (useFlat) {
      // Flat list view (original behavior)
      threads.forEach(t => {
        console.log(formatThreadSummary(t));
        console.log('');
      });
    } else {
      // Tree view (default)
      const groups = getAllGroups();
      const containers = getAllContainers();
      // Filter containers by group if group filter is active
      let filteredContainers = containers;
      if (options.group) {
        const group = groups.find(g => g.name.toLowerCase() === options.group.toLowerCase());
        if (group) {
          filteredContainers = containers.filter(c => c.groupId === group.id);
        }
      }
      const tree = buildTree(threads, groups, filteredContainers);
      const lines = renderTree(tree);
      lines.forEach(line => console.log(line));
    }
  });
