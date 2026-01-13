import { Command, Option } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllThreads,
  getAllGroups,
  getThreadById,
  getThreadByName,
  getGroupById,
  getGroupByName,
  updateThread
} from '../storage';
import { Thread, ThreadStatus, Temperature, ThreadSize, Importance, ProgressEntry } from '../models';
import chalk from 'chalk';

// Valid values for validation
const validStatuses: ThreadStatus[] = ['active', 'paused', 'stopped', 'completed', 'archived'];
const validTemps: Temperature[] = ['frozen', 'freezing', 'cold', 'tepid', 'warm', 'hot'];
const validSizes: ThreadSize[] = ['tiny', 'small', 'medium', 'large', 'huge'];

// Criteria interface for matching threads
interface MatchCriteria {
  under?: string;       // All descendants of thread (recursive)
  children?: string;    // Direct children only
  group?: string;       // All threads in group
  status?: ThreadStatus;
  temp?: Temperature;
  tag?: string;
  importance?: string;  // Supports: 4, 4+, 3-, etc.
  size?: ThreadSize;
}

// Find thread by id, name, or partial match
function findThread(identifier: string): Thread | undefined {
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

// Find group by id, name, or partial match
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

// Get all descendants of a thread (recursive)
function getDescendants(threadId: string): Thread[] {
  const allThreads = getAllThreads();
  const descendants: Thread[] = [];

  function collectDescendants(parentId: string): void {
    const children = allThreads.filter(t => t.parentId === parentId);
    for (const child of children) {
      descendants.push(child);
      collectDescendants(child.id);
    }
  }

  collectDescendants(threadId);
  return descendants;
}

// Get direct children of a thread
function getDirectChildren(threadId: string): Thread[] {
  return getAllThreads().filter(t => t.parentId === threadId);
}

// Parse importance criteria (e.g., "4", "4+", "3-")
function parseImportanceCriteria(criteria: string): { value: number; operator: 'eq' | 'gte' | 'lte' } {
  if (criteria.endsWith('+')) {
    return { value: parseInt(criteria.slice(0, -1)), operator: 'gte' };
  } else if (criteria.endsWith('-')) {
    return { value: parseInt(criteria.slice(0, -1)), operator: 'lte' };
  } else {
    return { value: parseInt(criteria), operator: 'eq' };
  }
}

// Check if a thread matches importance criteria
function matchesImportance(thread: Thread, criteria: string): boolean {
  const { value, operator } = parseImportanceCriteria(criteria);
  if (isNaN(value) || value < 1 || value > 5) return false;

  switch (operator) {
    case 'eq': return thread.importance === value;
    case 'gte': return thread.importance >= value;
    case 'lte': return thread.importance <= value;
  }
}

// Check if a thread matches all criteria (AND logic)
function matchesCriteria(thread: Thread, criteria: MatchCriteria, matchedIds: Set<string>): boolean {
  // If we have pre-computed matched IDs (from under/children/group), use that
  if (matchedIds.size > 0 && !matchedIds.has(thread.id)) {
    return false;
  }

  // Status filter
  if (criteria.status && thread.status !== criteria.status) {
    return false;
  }

  // Temperature filter
  if (criteria.temp && thread.temperature !== criteria.temp) {
    return false;
  }

  // Tag filter
  if (criteria.tag) {
    const tags = thread.tags || [];
    if (!tags.includes(criteria.tag)) {
      return false;
    }
  }

  // Importance filter
  if (criteria.importance && !matchesImportance(thread, criteria.importance)) {
    return false;
  }

  // Size filter
  if (criteria.size && thread.size !== criteria.size) {
    return false;
  }

  return true;
}

// Get threads matching criteria
function getMatchingThreads(criteria: MatchCriteria): { threads: Thread[]; error?: string } {
  const allThreads = getAllThreads();
  let matchedIds = new Set<string>();
  let hasStructuralCriteria = false;

  // Handle --under (all descendants)
  if (criteria.under) {
    hasStructuralCriteria = true;
    const parentThread = findThread(criteria.under);
    if (!parentThread) {
      return { threads: [], error: `Thread "${criteria.under}" not found` };
    }
    const descendants = getDescendants(parentThread.id);
    descendants.forEach(t => matchedIds.add(t.id));
  }

  // Handle --children (direct children only)
  if (criteria.children) {
    hasStructuralCriteria = true;
    const parentThread = findThread(criteria.children);
    if (!parentThread) {
      return { threads: [], error: `Thread "${criteria.children}" not found` };
    }
    const children = getDirectChildren(parentThread.id);
    if (matchedIds.size > 0) {
      // Intersect with existing matches
      const childIds = new Set(children.map(c => c.id));
      matchedIds = new Set([...matchedIds].filter(id => childIds.has(id)));
    } else {
      children.forEach(t => matchedIds.add(t.id));
    }
  }

  // Handle --group
  if (criteria.group) {
    hasStructuralCriteria = true;
    const group = findGroup(criteria.group);
    if (!group) {
      return { threads: [], error: `Group "${criteria.group}" not found` };
    }
    const groupThreads = allThreads.filter(t => t.groupId === group.id);
    if (matchedIds.size > 0) {
      // Intersect with existing matches
      const groupIds = new Set(groupThreads.map(t => t.id));
      matchedIds = new Set([...matchedIds].filter(id => groupIds.has(id)));
    } else {
      groupThreads.forEach(t => matchedIds.add(t.id));
    }
  }

  // If no structural criteria, consider all threads
  if (!hasStructuralCriteria) {
    allThreads.forEach(t => matchedIds.add(t.id));
  }

  // Filter by remaining criteria
  const matchedThreads = allThreads.filter(t => matchesCriteria(t, criteria, matchedIds));

  return { threads: matchedThreads };
}

// Parse action from remaining arguments
interface BatchAction {
  type: 'tag-add' | 'tag-remove' | 'set' | 'archive' | 'progress';
  args: string[];
}

function parseAction(actionArgs: string[]): { action?: BatchAction; error?: string } {
  if (actionArgs.length === 0) {
    return { error: 'No action specified' };
  }

  const [cmd, ...rest] = actionArgs;

  switch (cmd.toLowerCase()) {
    case 'tag':
      if (rest.length < 2) {
        return { error: 'Tag action requires: tag add|remove <tags>' };
      }
      if (rest[0] === 'add') {
        return { action: { type: 'tag-add', args: rest.slice(1) } };
      } else if (rest[0] === 'remove') {
        return { action: { type: 'tag-remove', args: rest.slice(1) } };
      } else {
        return { error: `Unknown tag action "${rest[0]}". Use: add, remove` };
      }

    case 'set':
      if (rest.length < 2) {
        return { error: 'Set action requires: set <property> <value>' };
      }
      return { action: { type: 'set', args: rest } };

    case 'archive':
      return { action: { type: 'archive', args: [] } };

    case 'progress':
      if (rest.length === 0) {
        return { error: 'Progress action requires: progress <note>' };
      }
      return { action: { type: 'progress', args: rest } };

    default:
      return { error: `Unknown action "${cmd}". Use: tag, set, archive, progress` };
  }
}

// Parse tags from arguments (space or comma separated)
function parseTags(args: string[]): string[] {
  const tags: string[] = [];
  for (const arg of args) {
    const parts = arg.split(',').map(t => t.trim()).filter(t => t.length > 0);
    tags.push(...parts);
  }
  return tags;
}

// Execute action on a single thread
function executeAction(thread: Thread, action: BatchAction): { success: boolean; error?: string } {
  try {
    switch (action.type) {
      case 'tag-add': {
        const tagsToAdd = parseTags(action.args);
        const currentTags = thread.tags || [];
        const newTags = [...currentTags];
        for (const tag of tagsToAdd) {
          if (!newTags.includes(tag)) {
            newTags.push(tag);
          }
        }
        updateThread(thread.id, { tags: newTags });
        return { success: true };
      }

      case 'tag-remove': {
        const tagsToRemove = parseTags(action.args);
        const currentTags = thread.tags || [];
        const newTags = currentTags.filter(t => !tagsToRemove.includes(t));
        updateThread(thread.id, { tags: newTags });
        return { success: true };
      }

      case 'set': {
        const [prop, value] = action.args;
        const propLower = prop.toLowerCase();
        const updates: Partial<Thread> = {};

        switch (propLower) {
          case 'status':
            if (!validStatuses.includes(value as ThreadStatus)) {
              return { success: false, error: `Invalid status: ${value}` };
            }
            updates.status = value as ThreadStatus;
            break;

          case 'temperature':
          case 'temp':
            if (!validTemps.includes(value as Temperature)) {
              return { success: false, error: `Invalid temperature: ${value}` };
            }
            updates.temperature = value as Temperature;
            break;

          case 'size':
            if (!validSizes.includes(value as ThreadSize)) {
              return { success: false, error: `Invalid size: ${value}` };
            }
            updates.size = value as ThreadSize;
            break;

          case 'importance':
          case 'imp':
            const imp = parseInt(value);
            if (isNaN(imp) || imp < 1 || imp > 5) {
              return { success: false, error: 'Importance must be 1-5' };
            }
            updates.importance = imp as Importance;
            break;

          default:
            return { success: false, error: `Unknown property: ${prop}` };
        }

        updateThread(thread.id, updates);
        return { success: true };
      }

      case 'archive': {
        updateThread(thread.id, { status: 'archived', temperature: 'frozen' });
        return { success: true };
      }

      case 'progress': {
        const note = action.args.join(' ');
        const entry: ProgressEntry = {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          note
        };
        updateThread(thread.id, { progress: [...thread.progress, entry] });
        return { success: true };
      }

      default:
        return { success: false, error: 'Unknown action type' };
    }
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// Format action for display
function formatAction(action: BatchAction): string {
  switch (action.type) {
    case 'tag-add':
      return `tag add ${action.args.join(' ')}`;
    case 'tag-remove':
      return `tag remove ${action.args.join(' ')}`;
    case 'set':
      return `set ${action.args.join(' ')}`;
    case 'archive':
      return 'archive';
    case 'progress':
      return `progress "${action.args.join(' ')}"`;
    default:
      return 'unknown';
  }
}

export const batchCommand = new Command('batch')
  .description('Bulk operations on threads matching criteria')
  .option('--under <thread>', 'All descendants of thread (recursive)')
  .option('--children <thread>', 'Direct children only')
  .option('--group <group>', 'All threads in group')
  .option('--status <status>', 'By status (active, paused, stopped, completed, archived)')
  .option('--temp <temp>', 'By temperature (frozen, freezing, cold, tepid, warm, hot)')
  .option('--tag <tag>', 'Has this tag')
  .addOption(new Option('--tags <tag>').hideHelp())
  .option('--importance <n>', 'By importance (supports: 4, 4+, 3-, etc.)')
  .option('--size <size>', 'By size (tiny, small, medium, large, huge)')
  .option('--dry-run', 'Preview without executing')
  .argument('[action...]', 'Action to execute (tag add|remove, set, archive, progress)')
  .action((actionArgs: string[], options) => {
    // Build criteria from options
    const criteria: MatchCriteria = {};

    if (options.under) criteria.under = options.under;
    if (options.children) criteria.children = options.children;
    if (options.group) criteria.group = options.group;
    if (options.status) {
      if (!validStatuses.includes(options.status)) {
        console.log(chalk.red(`Invalid status. Use: ${validStatuses.join(', ')}`));
        return;
      }
      criteria.status = options.status;
    }
    if (options.temp) {
      if (!validTemps.includes(options.temp)) {
        console.log(chalk.red(`Invalid temperature. Use: ${validTemps.join(', ')}`));
        return;
      }
      criteria.temp = options.temp;
    }
    if (options.tag || options.tags) criteria.tag = options.tag || options.tags;
    if (options.importance) criteria.importance = options.importance;
    if (options.size) {
      if (!validSizes.includes(options.size)) {
        console.log(chalk.red(`Invalid size. Use: ${validSizes.join(', ')}`));
        return;
      }
      criteria.size = options.size;
    }

    // Check if any criteria were specified
    const hasCriteria = Object.keys(criteria).length > 0;
    if (!hasCriteria) {
      console.log(chalk.red('No match criteria specified. Use --under, --children, --group, --status, --temp, --tag, --importance, or --size'));
      return;
    }

    // Get matching threads
    const { threads, error: matchError } = getMatchingThreads(criteria);
    if (matchError) {
      console.log(chalk.red(matchError));
      return;
    }

    if (threads.length === 0) {
      console.log(chalk.yellow('\nNo threads match the specified criteria\n'));
      return;
    }

    // Handle dry-run mode
    if (options.dryRun) {
      console.log(chalk.cyan(`\nDry run: would match ${threads.length} thread(s)\n`));
      threads.forEach(t => {
        console.log(`  ${chalk.dim('\u2022')} ${t.name}`);
      });
      if (actionArgs.length > 0) {
        const { action, error: actionError } = parseAction(actionArgs);
        if (actionError) {
          console.log(chalk.red(`\nAction error: ${actionError}`));
        } else if (action) {
          console.log(chalk.dim(`\nAction: ${formatAction(action)}`));
        }
      } else {
        console.log(chalk.dim('\nNo action specified'));
      }
      console.log('');
      return;
    }

    // Parse action
    if (actionArgs.length === 0) {
      console.log(chalk.red('No action specified. Use: tag add|remove <tags>, set <prop> <value>, archive, progress <note>'));
      return;
    }

    const { action, error: actionError } = parseAction(actionArgs);
    if (actionError) {
      console.log(chalk.red(actionError));
      return;
    }

    if (!action) {
      console.log(chalk.red('Failed to parse action'));
      return;
    }

    // Execute action on each thread
    console.log(chalk.cyan(`\nBatch: matched ${threads.length} thread(s)\n`));

    let succeeded = 0;
    let failed = 0;

    threads.forEach((thread, index) => {
      const { success, error } = executeAction(thread, action);
      const num = `[${index + 1}/${threads.length}]`;

      if (success) {
        succeeded++;
        console.log(`  ${chalk.dim(num)} ${thread.name} - ${formatAction(action)} ${chalk.green('\u2713')}`);
      } else {
        failed++;
        console.log(`  ${chalk.dim(num)} ${thread.name} - ${formatAction(action)} ${chalk.red('\u2717')} ${chalk.red(error || '')}`);
      }
    });

    console.log(`\nDone: ${chalk.green(`${succeeded} succeeded`)}, ${failed > 0 ? chalk.red(`${failed} failed`) : chalk.dim('0 failed')}\n`);
  });
