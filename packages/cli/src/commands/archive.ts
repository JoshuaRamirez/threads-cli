import { Command } from 'commander';
import { Thread } from '@redjay/threads-core';
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

interface Descendant {
  thread: Thread;
  depth: number;
}

// Collect all descendant threads recursively
function collectDescendants(parentId: string, depth: number = 0): Descendant[] {
  const storage = getStorage();
  const threads = storage.getAllThreads();
  const descendants: Descendant[] = [];

  const children = threads.filter(t => t.parentId === parentId);
  for (const child of children) {
    descendants.push({ thread: child, depth });
    descendants.push(...collectDescendants(child.id, depth + 1));
  }

  return descendants;
}

// Display tree of affected threads
function displayAffectedTree(thread: Thread, descendants: Descendant[], action: string): void {
  console.log(chalk.bold(`\nThreads to ${action}:\n`));
  console.log(`  ${chalk.blue('◆')} ${chalk.bold(thread.name)} ${chalk.gray(`[${thread.id.slice(0, 8)}]`)}`);

  for (let i = 0; i < descendants.length; i++) {
    const { thread: t, depth } = descendants[i];
    const indent = '  '.repeat(depth + 2);
    const isLast = i === descendants.length - 1 || descendants[i + 1]?.depth <= depth;
    const prefix = isLast ? '└── ' : '├── ';
    console.log(`${indent}${prefix}${chalk.blue('◆')} ${t.name} ${chalk.gray(`[${t.id.slice(0, 8)}]`)}`);
  }
  console.log('');
}

export const archiveCommand = new Command('archive')
  .description('Archive a thread (or unarchive with --restore)')
  .argument('<identifier>', 'Thread name or ID')
  .option('--restore', 'Restore an archived thread to active status')
  .option('-c, --cascade', 'Include all sub-threads')
  .option('--dry-run', 'Preview what would be affected')
  .action((identifier: string, options) => {
    const thread = findThread(identifier);

    if (!thread) {
      console.log(chalk.red(`Thread "${identifier}" not found`));
      return;
    }

    const descendants = collectDescendants(thread.id);
    const hasChildren = descendants.length > 0;
    const action = options.restore ? 'restore' : 'archive';

    // If has children and no cascade flag, show warning
    if (hasChildren && !options.cascade) {
      displayAffectedTree(thread, descendants, action);
      console.log(chalk.yellow(`Thread has ${descendants.length} sub-thread(s).\n`));
      console.log(`Add ${chalk.cyan('--cascade, -c')} to ${action} all sub-threads too.`);
      console.log(`Add ${chalk.cyan('--dry-run')} to preview.\n`);
      return;
    }

    // Collect threads to process
    const toProcess = options.cascade ? [thread, ...descendants.map(d => d.thread)] : [thread];

    // Show preview if cascade
    if (options.cascade && hasChildren) {
      displayAffectedTree(thread, descendants, action);
    }

    // Dry run
    if (options.dryRun) {
      console.log(chalk.cyan(`Dry run: Would ${action} ${toProcess.length} thread(s)\n`));
      return;
    }

    if (options.restore) {
      // Filter to only archived threads
      const archived = toProcess.filter(t => t.status === 'archived');
      if (archived.length === 0) {
        console.log(chalk.yellow(`No archived threads to restore`));
        return;
      }

      const storage = getStorage();
      for (const t of archived) {
        storage.updateThread(t.id, {
          status: 'active',
          temperature: 'tepid'
        });
      }
      console.log(chalk.green(`\nRestored ${archived.length} thread(s)\n`));
    } else {
      // Filter to only non-archived threads
      const active = toProcess.filter(t => t.status !== 'archived');
      if (active.length === 0) {
        console.log(chalk.yellow(`No active threads to archive`));
        return;
      }

      const storage = getStorage();
      for (const t of active) {
        storage.updateThread(t.id, {
          status: 'archived',
          temperature: 'frozen'
        });
      }
      console.log(chalk.green(`\nArchived ${active.length} thread(s)\n`));
    }
  });
