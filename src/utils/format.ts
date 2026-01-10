import chalk from 'chalk';
import { Thread, ThreadStatus, Temperature, ThreadSize, Importance, Group } from '../models';

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
  const shortId = chalk.gray(`[${thread.id.slice(0, 8)}]`);
  const tempLabel = formatTemperature(thread.temperature);
  const stars = formatImportanceStars(thread.importance);
  return `${chalk.bold(thread.name)} ${shortId} ${tempLabel} ${stars}`;
}

// Format a group header for tree view
export function formatGroupHeader(group: Group): string {
  return chalk.bold.underline(group.name);
}

// Node type for tree structure
export interface TreeNode {
  type: 'group' | 'thread' | 'ungrouped-header';
  group?: Group;
  thread?: Thread;
  children: TreeNode[];
}

// Build a tree structure from threads and groups
export function buildTree(threads: Thread[], groups: Group[]): TreeNode[] {
  const result: TreeNode[] = [];

  // Create a map of groups by ID
  const groupMap = new Map<string, Group>();
  groups.forEach(g => groupMap.set(g.id, g));

  // Create a map of threads by ID for quick lookup
  const threadMap = new Map<string, Thread>();
  threads.forEach(t => threadMap.set(t.id, t));

  // Separate threads by group
  const threadsByGroup = new Map<string | null, Thread[]>();
  threads.forEach(t => {
    const groupId = t.groupId;
    if (!threadsByGroup.has(groupId)) {
      threadsByGroup.set(groupId, []);
    }
    threadsByGroup.get(groupId)!.push(t);
  });

  // Helper: get child threads (sub-threads) of a given parent
  function getChildren(parentId: string, groupThreads: Thread[]): Thread[] {
    return groupThreads.filter(t => t.parentId === parentId);
  }

  // Helper: build thread nodes recursively
  function buildThreadNode(thread: Thread, groupThreads: Thread[]): TreeNode {
    const children = getChildren(thread.id, groupThreads);
    return {
      type: 'thread',
      thread,
      children: children.map(child => buildThreadNode(child, groupThreads))
    };
  }

  // Process groups that have threads
  const processedGroupIds = new Set<string>();

  // Sort groups by name
  const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));

  for (const group of sortedGroups) {
    const groupThreads = threadsByGroup.get(group.id) || [];
    if (groupThreads.length === 0) continue;

    processedGroupIds.add(group.id);

    // Get root threads (those without a parent, or whose parent is not in this group)
    const rootThreads = groupThreads.filter(t => {
      if (!t.parentId) return true;
      // Parent must be in the same group to be a sub-thread
      const parent = threadMap.get(t.parentId);
      return !parent || parent.groupId !== group.id;
    });

    const groupNode: TreeNode = {
      type: 'group',
      group,
      children: rootThreads.map(t => buildThreadNode(t, groupThreads))
    };

    result.push(groupNode);
  }

  // Process ungrouped threads (groupId is null)
  const ungroupedThreads = threadsByGroup.get(null) || [];
  if (ungroupedThreads.length > 0) {
    // Get root ungrouped threads
    const rootUngrouped = ungroupedThreads.filter(t => {
      if (!t.parentId) return true;
      const parent = threadMap.get(t.parentId);
      return !parent || parent.groupId !== null;
    });

    const ungroupedNode: TreeNode = {
      type: 'ungrouped-header',
      children: rootUngrouped.map(t => buildThreadNode(t, ungroupedThreads))
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

      // Render children (sub-threads)
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
