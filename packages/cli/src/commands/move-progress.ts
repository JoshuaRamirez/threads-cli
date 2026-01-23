import { Command } from 'commander';
import { Thread, ProgressEntry } from '@redjay/threads-core';
import { getStorage } from '../context';
import chalk from 'chalk';

/**
 * Find a thread by identifier (exact ID, exact name, partial ID, or partial name match).
 * Returns the thread if exactly one match is found, or null if none/multiple found.
 * Prints appropriate messages for multiple matches or not found cases.
 */
function findThread(identifier: string, label: string): Thread | null {
  const storage = getStorage();
  // Try exact ID match first
  let thread = storage.getThreadById(identifier);

  // Try exact name match
  if (!thread) {
    thread = storage.getThreadByName(identifier);
  }

  // Try partial ID match
  if (!thread) {
    const all = storage.getAllThreads();
    const matches = all.filter(t => t.id.toLowerCase().startsWith(identifier.toLowerCase()));
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

  // Try partial name match as last resort
  if (!thread) {
    const all = storage.getAllThreads();
    const matches = all.filter(t => t.name.toLowerCase().includes(identifier.toLowerCase()));
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

export const moveProgressCommand = new Command('move-progress')
  .description('Move progress entries from one thread to another')
  .argument('<from-thread>', 'Source thread name or ID')
  .argument('<to-thread>', 'Destination thread name or ID')
  .option('--last', 'Move only the most recent progress entry (default)')
  .option('--all', 'Move all progress entries')
  .option('--count <n>', 'Move the last N progress entries', parseInt)
  .action((fromIdentifier: string, toIdentifier: string, options) => {
    // Find source thread
    const sourceThread = findThread(fromIdentifier, 'Source');
    if (!sourceThread) {
      return;
    }

    // Find destination thread
    const destThread = findThread(toIdentifier, 'Destination');
    if (!destThread) {
      return;
    }

    // Check if source and destination are the same
    if (sourceThread.id === destThread.id) {
      console.log(chalk.red('Source and destination threads cannot be the same'));
      return;
    }

    // Check if source has any progress entries
    if (sourceThread.progress.length === 0) {
      console.log(chalk.red(`Source thread "${sourceThread.name}" has no progress entries to move`));
      return;
    }

    // Determine how many entries to move
    let countToMove: number;
    if (options.all) {
      countToMove = sourceThread.progress.length;
    } else if (options.count !== undefined) {
      countToMove = Math.min(options.count, sourceThread.progress.length);
      if (options.count > sourceThread.progress.length) {
        console.log(chalk.yellow(`Note: Source thread only has ${sourceThread.progress.length} progress entries`));
      }
      if (countToMove <= 0) {
        console.log(chalk.red('Count must be a positive number'));
        return;
      }
    } else {
      // Default behavior: move only the most recent entry (same as --last)
      countToMove = 1;
    }

    // Sort source progress by timestamp to ensure we get the most recent entries
    const sortedSourceProgress = [...sourceThread.progress].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Extract the entries to move (last N entries)
    const entriesToMove: ProgressEntry[] = sortedSourceProgress.slice(-countToMove);
    const remainingEntries: ProgressEntry[] = sortedSourceProgress.slice(0, -countToMove);

    // Combine destination progress with moved entries and sort by timestamp
    const newDestProgress = [...destThread.progress, ...entriesToMove].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Update both threads
    const storage = getStorage();
    storage.updateThread(sourceThread.id, { progress: remainingEntries });
    storage.updateThread(destThread.id, { progress: newDestProgress });

    // Display confirmation
    if (countToMove === 1) {
      const entry = entriesToMove[0];
      console.log(chalk.green(`\nMoved 1 progress entry from "${sourceThread.name}" to "${destThread.name}":`));
      console.log(`  [${new Date(entry.timestamp).toLocaleString()}] ${entry.note}`);
    } else {
      console.log(chalk.green(`\nMoved ${countToMove} progress entries from "${sourceThread.name}" to "${destThread.name}"`));
    }
    console.log('');
  });
