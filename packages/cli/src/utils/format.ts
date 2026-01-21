import chalk from 'chalk';
import { Thread, ThreadStatus, Temperature, ThreadSize, Importance, Group, Container, Entity } from '@joshua2048/threads-core';
import { getLabel } from '../config';

// Tree drawing characters (Unicode box-drawing)
export const TreeChars = {
  branch: '├── ',
  lastBranch: '└── ',
  vertical: '│   ',
  empty: '    ',
} as const;

// Color mappings
const statusColors: Record<ThreadStatus, (s: string) => string> = {
  active: chalk.green,
  paused: chalk.yellow,
  stopped: chalk.red,
  completed: chalk.blue,
  archived: chalk.gray
};

const temperatureColors: Record<Temperature, (s: string) => string> = {
  frozen: chalk.blueBright,
  freezing: chalk.cyan,
  cold: chalk.blue,
  tepid: chalk.white,
  warm: chalk.yellow,
  hot: chalk.red
};

const sizeLabels: Record<ThreadSize, string> = {
  tiny: 'Tiny',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  huge: 'Huge'
};

export function formatStatus(status: ThreadStatus): string {
  return statusColors[status](status.toUpperCase());
}

export function formatTemperature(temp: Temperature): string {
  return temperatureColors[temp](temp.charAt(0).toUpperCase() + temp.slice(1));
}

export function formatSize(size: ThreadSize): string {
  return sizeLabels[size];
}

export function formatImportance(imp: Importance): string {
  const filled = '[*]'.repeat(imp);
  const empty = '[ ]'.repeat(5 - imp);
  return chalk.yellow(filled) + chalk.dim(empty);
}

// Format tags for display
export function formatTags(tags: string[]): string {
  if (!tags || tags.length === 0) return '';
  return tags.map(t => chalk.cyan(`#${t}`)).join(' ');
}

export function formatThreadSummary(thread: Thread): string {
  const lines = [
    `${chalk.bold(thread.name)} ${chalk.gray(`[${thread.id.slice(0, 8)}]`)}`,
    `  Status: ${formatStatus(thread.status)} | Temp: ${formatTemperature(thread.temperature)} | Size: ${formatSize(thread.size)} | Importance: ${formatImportance(thread.importance)}`
  ];

  if (thread.description) {
    lines.push(`  ${chalk.dim(thread.description)}`);
  }

  return lines.join('\n');
}

export function formatThreadDetail(thread: Thread): string {
  const lines = [
    chalk.bold.underline(thread.name),
    '',
    `ID:          ${thread.id}`,
    `Status:      ${formatStatus(thread.status)}`,
    `Temperature: ${formatTemperature(thread.temperature)}`,
    `Size:        ${formatSize(thread.size)}`,
    `Importance:  ${formatImportance(thread.importance)}`,
    `Created:     ${new Date(thread.createdAt).toLocaleString()}`,
    `Updated:     ${new Date(thread.updatedAt).toLocaleString()}`,
  ];

  // Display tags if present
  if (thread.tags && thread.tags.length > 0) {
    lines.push(`Tags:        ${formatTags(thread.tags)}`);
  }

  if (thread.description) {
    lines.push('', `Description: ${thread.description}`);
  }

  // Show current details if present
  if (thread.details && thread.details.length > 0) {
    const current = thread.details[thread.details.length - 1];
    const updatedDate = new Date(current.timestamp).toLocaleString();
    lines.push('', `${chalk.bold('Details:')} ${chalk.dim(`(updated ${updatedDate})`)}`);
    // Indent each line of content
    current.content.split('\n').forEach(line => {
      lines.push(`  ${line}`);
    });
  }

  if (thread.parentId) {
    lines.push(`Parent:      ${thread.parentId}`);
  }

  if (thread.groupId) {
    lines.push(`Group:       ${thread.groupId}`);
  }

  if (thread.dependencies.length > 0) {
    lines.push('', chalk.bold('Dependencies:'));
    thread.dependencies.forEach(dep => {
      lines.push(`  → ${dep.threadId}`);
      if (dep.why) lines.push(`    Why: ${dep.why}`);
      if (dep.what) lines.push(`    What: ${dep.what}`);
      if (dep.how) lines.push(`    How: ${dep.how}`);
      if (dep.when) lines.push(`    When: ${dep.when}`);
    });
  }

  if (thread.progress.length > 0) {
    lines.push('', chalk.bold('Progress:'));
    // Show last 5 entries
    const recent = thread.progress.slice(-5);
    recent.forEach(p => {
      const date = new Date(p.timestamp).toLocaleString();
      lines.push(`  [${chalk.dim(date)}] ${p.note}`);
    });
    if (thread.progress.length > 5) {
      lines.push(chalk.dim(`  ... and ${thread.progress.length - 5} more entries`));
    }
  }

  return lines.join('\n');
}

// Compact importance display using stars
export function formatImportanceStars(imp: Importance): string {
  const filled = '\u2605'.repeat(imp);  // filled star
  const empty = '\u2606'.repeat(5 - imp);  // empty star
  return chalk.yellow(filled) + chalk.dim(empty);
}

// Compact thread line for tree view
export function formatThreadTreeLine(thread: Thread): string {
  const threadLabel = getLabel('thread');
  const labelPrefix = threadLabel ? chalk.green(threadLabel) + ' ' : '';
  const shortId = chalk.gray(`[${thread.id.slice(0, 8)}]`);
  const tempLabel = formatTemperature(thread.temperature);
  const stars = formatImportanceStars(thread.importance);
  // Show primary tag (first tag) if available
  const primaryTag = thread.tags && thread.tags.length > 0
    ? ' ' + chalk.cyan(`#${thread.tags[0]}`)
    : '';
  return `${labelPrefix}${chalk.bold(thread.name)} ${shortId} ${tempLabel} ${stars}${primaryTag}`;
}

// Compact container line for tree view
export function formatContainerTreeLine(container: Container): string {
  const containerLabel = getLabel('container');
  const shortId = chalk.gray(`[${container.id.slice(0, 8)}]`);
  const labelIcon = containerLabel ? chalk.magenta(containerLabel) : '';
  // Show primary tag (first tag) if available
  const primaryTag = container.tags && container.tags.length > 0
    ? ' ' + chalk.cyan(`#${container.tags[0]}`)
    : '';
  return `${labelIcon} ${chalk.bold.magenta(container.name)} ${shortId}${primaryTag}`;
}

// Detailed container display
export function formatContainerDetail(container: Container): string {
  const lines = [
    chalk.bold.underline.magenta(container.name) + chalk.dim(' (container)'),
    '',
    `ID:          ${container.id}`,
    `Created:     ${new Date(container.createdAt).toLocaleString()}`,
    `Updated:     ${new Date(container.updatedAt).toLocaleString()}`,
  ];

  if (container.tags && container.tags.length > 0) {
    lines.push(`Tags:        ${formatTags(container.tags)}`);
  }

  if (container.description) {
    lines.push('', `Description: ${container.description}`);
  }

  if (container.details && container.details.length > 0) {
    const current = container.details[container.details.length - 1];
    const updatedDate = new Date(current.timestamp).toLocaleString();
    lines.push('', `${chalk.bold('Details:')} ${chalk.dim(`(updated ${updatedDate})`)}`);
    current.content.split('\n').forEach(line => {
      lines.push(`  ${line}`);
    });
  }

  if (container.parentId) {
    lines.push(`Parent:      ${container.parentId}`);
  }

  if (container.groupId) {
    lines.push(`Group:       ${container.groupId}`);
  }

  return lines.join('\n');
}

// Format a group header for tree view
export function formatGroupHeader(group: Group): string {
  const groupLabel = getLabel('group');
  return `${groupLabel}  ${chalk.bold.underline(group.name)}`;
}

// Check if entity is a container
export function isContainer(entity: Entity): entity is Container {
  return entity.type === 'container';
}

// Check if entity is a thread
export function isThread(entity: Entity): entity is Thread {
  return entity.type !== 'container';
}

// Node type for tree structure
export interface TreeNode {
  type: 'group' | 'thread' | 'container' | 'ungrouped-header';
  group?: Group;
  thread?: Thread;
  container?: Container;
  children: TreeNode[];
}

// Build a tree structure from entities (threads + containers) and groups
export function buildTree(threads: Thread[], groups: Group[], containers: Container[] = []): TreeNode[] {
  const result: TreeNode[] = [];

  // Combine all entities
  const allEntities: Entity[] = [...threads, ...containers];

  // Create a map of groups by ID
  const groupMap = new Map<string, Group>();
  groups.forEach(g => groupMap.set(g.id, g));

  // Create a map of entities by ID for quick lookup
  const entityMap = new Map<string, Entity>();
  allEntities.forEach(e => entityMap.set(e.id, e));

  // Separate entities by group
  const entitiesByGroup = new Map<string | null, Entity[]>();
  allEntities.forEach(e => {
    const groupId = e.groupId;
    if (!entitiesByGroup.has(groupId)) {
      entitiesByGroup.set(groupId, []);
    }
    entitiesByGroup.get(groupId)!.push(e);
  });

  // Helper: get child entities of a given parent
  function getChildren(parentId: string, groupEntities: Entity[]): Entity[] {
    return groupEntities.filter(e => e.parentId === parentId);
  }

  // Helper: build entity nodes recursively
  function buildEntityNode(entity: Entity, groupEntities: Entity[]): TreeNode {
    const children = getChildren(entity.id, groupEntities);
    if (isContainer(entity)) {
      return {
        type: 'container',
        container: entity,
        children: children.map(child => buildEntityNode(child, groupEntities))
      };
    } else {
      return {
        type: 'thread',
        thread: entity as Thread,
        children: children.map(child => buildEntityNode(child, groupEntities))
      };
    }
  }

  // Process groups that have entities
  const processedGroupIds = new Set<string>();

  // Sort groups by name
  const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));

  for (const group of sortedGroups) {
    const groupEntities = entitiesByGroup.get(group.id) || [];
    if (groupEntities.length === 0) continue;

    processedGroupIds.add(group.id);

    // Get root entities (those without a parent, or whose parent is not in this group)
    const rootEntities = groupEntities.filter(e => {
      if (!e.parentId) return true;
      // Parent must be in the same group to be a child
      const parent = entityMap.get(e.parentId);
      return !parent || parent.groupId !== group.id;
    });

    const groupNode: TreeNode = {
      type: 'group',
      group,
      children: rootEntities.map(e => buildEntityNode(e, groupEntities))
    };

    result.push(groupNode);
  }

  // Process ungrouped entities (groupId is null)
  const ungroupedEntities = entitiesByGroup.get(null) || [];
  if (ungroupedEntities.length > 0) {
    // Get root ungrouped entities
    const rootUngrouped = ungroupedEntities.filter(e => {
      if (!e.parentId) return true;
      const parent = entityMap.get(e.parentId);
      return !parent || parent.groupId !== null;
    });

    const ungroupedNode: TreeNode = {
      type: 'ungrouped-header',
      children: rootUngrouped.map(e => buildEntityNode(e, ungroupedEntities))
    };

    result.push(ungroupedNode);
  }

  return result;
}

// Render a tree to string lines
export function renderTree(nodes: TreeNode[]): string[] {
  const lines: string[] = [];

  function renderNode(node: TreeNode, prefix: string, isLast: boolean, isRoot: boolean): void {
    if (node.type === 'group') {
      // Group header - no prefix for root groups
      lines.push(formatGroupHeader(node.group!));
      // Render children with indentation
      node.children.forEach((child, i) => {
        const childIsLast = i === node.children.length - 1;
        renderNode(child, '', childIsLast, false);
      });
      // Add blank line after group (except if it's the last one)
      lines.push('');
    } else if (node.type === 'ungrouped-header') {
      lines.push(chalk.bold.underline('Ungrouped'));
      node.children.forEach((child, i) => {
        const childIsLast = i === node.children.length - 1;
        renderNode(child, '', childIsLast, false);
      });
      lines.push('');
    } else if (node.type === 'thread') {
      // Thread line with tree drawing
      const connector = isLast ? TreeChars.lastBranch : TreeChars.branch;
      const threadLine = formatThreadTreeLine(node.thread!);
      lines.push(prefix + connector + threadLine);

      // Render children (sub-threads or containers)
      const newPrefix = prefix + (isLast ? TreeChars.empty : TreeChars.vertical);
      node.children.forEach((child, i) => {
        const childIsLast = i === node.children.length - 1;
        renderNode(child, newPrefix, childIsLast, false);
      });
    } else if (node.type === 'container') {
      // Container line with tree drawing
      const connector = isLast ? TreeChars.lastBranch : TreeChars.branch;
      const containerLine = formatContainerTreeLine(node.container!);
      lines.push(prefix + connector + containerLine);

      // Render children (threads or containers)
      const newPrefix = prefix + (isLast ? TreeChars.empty : TreeChars.vertical);
      node.children.forEach((child, i) => {
        const childIsLast = i === node.children.length - 1;
        renderNode(child, newPrefix, childIsLast, false);
      });
    }
  }

  nodes.forEach((node, i) => {
    renderNode(node, '', i === nodes.length - 1, true);
  });

  return lines;
}
