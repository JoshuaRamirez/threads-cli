import { Command } from 'commander';
import { Thread, ProgressEntry, DetailsEntry, Dependency } from '@redjay/threads-core';
import { getStorage } from '../context';
import chalk from 'chalk';

/**
 * Find thread by identifier (exact ID, exact name, partial ID, or partial name).
 * Returns null with message if not found or ambiguous.
 */
export function findThread(identifier: string, label: string): Thread | null {
  const storage = getStorage();
  let thread = storage.getThreadById(identifier);

  if (!thread) {
    thread = storage.getThreadByName(identifier);
  }

  if (!thread) {
    const all = storage.getAllThreads();
    const matches = all.filter(t =>
      t.id.toLowerCase().startsWith(identifier.toLowerCase())
    );
    if (matches.length === 1) {
      thread = matches[0];
    } else if (matches.length > 1) {
      console.log(chalk.yellow(`Multiple threads match ${label} "${identifier}":`));
      matches.forEach(t => {
        console.log(`  ${t.id.slice(0, 8)} - ${t.name}`);
      });
      return null;
    }
  }

  if (!thread) {
    const all = storage.getAllThreads();
    const matches = all.filter(t =>
      t.name.toLowerCase().includes(identifier.toLowerCase())
    );
    if (matches.length === 1) {
      thread = matches[0];
    } else if (matches.length > 1) {
      console.log(chalk.yellow(`Multiple threads match ${label} "${identifier}":`));
      matches.forEach(t => {
        console.log(`  ${t.id.slice(0, 8)} - ${t.name}`);
      });
      return null;
    }
  }

  if (!thread) {
    console.log(chalk.red(`${label} thread "${identifier}" not found`));
    return null;
  }

  return thread;
}

/**
 * Merge progress entries, sorted by timestamp.
 */
export function mergeProgress(target: ProgressEntry[], source: ProgressEntry[]): ProgressEntry[] {
  return [...target, ...source].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Merge details entries, sorted by timestamp.
 */
export function mergeDetails(target: DetailsEntry[], source: DetailsEntry[]): DetailsEntry[] {
  return [...target, ...source].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Merge tags as a union (no duplicates).
 */
export function mergeTags(target: string[], source: string[]): string[] {
  const set = new Set([...target, ...source]);
  return Array.from(set);
}

/**
 * Merge dependencies as a union by threadId. If both have the same threadId,
 * prefer the target's version.
 */
export function mergeDependencies(target: Dependency[], source: Dependency[]): Dependency[] {
  const byThreadId = new Map<string, Dependency>();

  // Add source first so target can override
  for (const dep of source) {
    byThreadId.set(dep.threadId, dep);
  }
  for (const dep of target) {
    byThreadId.set(dep.threadId, dep);
  }

  return Array.from(byThreadId.values());
}

export const mergeCommand = new Command('merge')
  .description('Merge source thread into target thread')
  .argument('<source>', 'Source thread name or ID (will be merged into target)')
  .argument('<target>', 'Target thread name or ID (receives merged content)')
  .option('--keep', 'Keep source thread instead of archiving after merge')
  .option('--dry-run', 'Preview merge without making changes')
  .action((sourceIdentifier: string, targetIdentifier: string, options) => {
    const storage = getStorage();
    const sourceThread = findThread(sourceIdentifier, 'Source');
    if (!sourceThread) return;

    const targetThread = findThread(targetIdentifier, 'Target');
    if (!targetThread) return;

    if (sourceThread.id === targetThread.id) {
      console.log(chalk.red('Cannot merge a thread into itself'));
      return;
    }

    // Get all threads for finding children
    const allThreads = storage.getAllThreads();

    // Find children of source thread that need reparenting
    const children = allThreads.filter(t => t.parentId === sourceThread.id);

    // Compute merged values
    const mergedProgress = mergeProgress(targetThread.progress, sourceThread.progress);
    const mergedDetails = mergeDetails(targetThread.details, sourceThread.details);
    const mergedTags = mergeTags(targetThread.tags, sourceThread.tags);

    // Filter out self-references from merged dependencies
    const filteredSourceDeps = sourceThread.dependencies.filter(d => d.threadId !== targetThread.id);
    const filteredTargetDeps = targetThread.dependencies.filter(d => d.threadId !== sourceThread.id);
    const mergedDependencies = mergeDependencies(filteredTargetDeps, filteredSourceDeps);

    // Dry run output
    if (options.dryRun) {
      console.log(chalk.cyan('\n[DRY RUN] Merge preview:\n'));
      console.log(chalk.white(`Source: ${sourceThread.name} (${sourceThread.id.slice(0, 8)})`));
      console.log(chalk.white(`Target: ${targetThread.name} (${targetThread.id.slice(0, 8)})\n`));

      console.log(chalk.gray('Progress entries:'));
      console.log(`  Target has: ${targetThread.progress.length}`);
      console.log(`  Source has: ${sourceThread.progress.length}`);
      console.log(`  After merge: ${mergedProgress.length}`);

      console.log(chalk.gray('\nDetails entries:'));
      console.log(`  Target has: ${targetThread.details.length}`);
      console.log(`  Source has: ${sourceThread.details.length}`);
      console.log(`  After merge: ${mergedDetails.length}`);

      console.log(chalk.gray('\nTags:'));
      console.log(`  Target: [${targetThread.tags.join(', ')}]`);
      console.log(`  Source: [${sourceThread.tags.join(', ')}]`);
      console.log(`  After merge: [${mergedTags.join(', ')}]`);

      console.log(chalk.gray('\nDependencies:'));
      console.log(`  Target has: ${targetThread.dependencies.length}`);
      console.log(`  Source has: ${sourceThread.dependencies.length}`);
      console.log(`  After merge: ${mergedDependencies.length}`);

      if (children.length > 0) {
        console.log(chalk.gray('\nChildren to reparent:'));
        children.forEach(c => {
          console.log(`  ${c.name} (${c.id.slice(0, 8)})`);
        });
      }

      console.log(chalk.gray('\nSource thread will be:'), options.keep ? 'kept' : 'archived');
      console.log('');
      return;
    }

    // Apply merge to target thread
    storage.updateThread(targetThread.id, {
      progress: mergedProgress,
      details: mergedDetails,
      tags: mergedTags,
      dependencies: mergedDependencies
    });

    // Reparent children
    for (const child of children) {
      storage.updateThread(child.id, { parentId: targetThread.id });
    }

    // Archive source thread unless --keep
    if (!options.keep) {
      storage.updateThread(sourceThread.id, {
        status: 'archived',
        temperature: 'frozen'
      });
    }

    // Output results
    console.log(chalk.green(`\nMerged "${sourceThread.name}" into "${targetThread.name}"`));

    const stats: string[] = [];
    if (sourceThread.progress.length > 0) {
      stats.push(`${sourceThread.progress.length} progress entries`);
    }
    if (sourceThread.details.length > 0) {
      stats.push(`${sourceThread.details.length} details entries`);
    }
    const newTags = sourceThread.tags.filter(t => !targetThread.tags.includes(t));
    if (newTags.length > 0) {
      stats.push(`${newTags.length} new tags`);
    }
    const newDeps = sourceThread.dependencies.filter(
      sd => !targetThread.dependencies.some(td => td.threadId === sd.threadId) && sd.threadId !== targetThread.id
    );
    if (newDeps.length > 0) {
      stats.push(`${newDeps.length} new dependencies`);
    }

    if (stats.length > 0) {
      console.log(chalk.gray(`  Added: ${stats.join(', ')}`));
    }

    if (children.length > 0) {
      console.log(chalk.gray(`  Reparented ${children.length} child thread${children.length > 1 ? 's' : ''}`));
    }

    if (options.keep) {
      console.log(chalk.gray(`  Source thread kept (not archived)`));
    } else {
      console.log(chalk.gray(`  Source thread archived`));
    }

    console.log('');
  });
