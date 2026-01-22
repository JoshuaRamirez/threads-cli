import { Command } from 'commander';
import { getAllThreads, getThreadById, getThreadByName } from '@redjay/threads-storage';
import { Thread, ProgressEntry } from '@redjay/threads-core';
import chalk from 'chalk';

export interface TimelineEntry {
  thread: Thread;
  progress: ProgressEntry;
}

export interface TimelineOptions {
  since?: string;
  until?: string;
  limit?: number;
  thread?: string;
  reverse?: boolean;
}

export function parseDate(dateStr: string): Date | null {
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '\u2026';
}

export function formatTimelineEntry(entry: TimelineEntry): string {
  const timestamp = new Date(entry.progress.timestamp);
  const dateStr = timestamp.toLocaleString();
  const threadName = truncate(entry.thread.name, 20);
  const note = entry.progress.note;

  return chalk.dim(dateStr) + ' ' + chalk.cyan(threadName.padEnd(20)) + ' ' + note;
}

export function collectTimelineEntries(threads: Thread[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  for (const thread of threads) {
    for (const progress of thread.progress) {
      entries.push({ thread, progress });
    }
  }
  return entries;
}

export function filterByDateRange(
  entries: TimelineEntry[],
  since?: Date,
  until?: Date
): TimelineEntry[] {
  let filtered = entries;

  if (since) {
    filtered = filtered.filter(e => new Date(e.progress.timestamp) >= since);
  }

  if (until) {
    filtered = filtered.filter(e => new Date(e.progress.timestamp) <= until);
  }

  return filtered;
}

export function sortTimelineEntries(
  entries: TimelineEntry[],
  reverse: boolean = false
): TimelineEntry[] {
  const sorted = [...entries];
  sorted.sort((a, b) => {
    const timeA = new Date(a.progress.timestamp).getTime();
    const timeB = new Date(b.progress.timestamp).getTime();
    return reverse ? timeA - timeB : timeB - timeA;
  });
  return sorted;
}

export function applyLimit(entries: TimelineEntry[], limit?: number): TimelineEntry[] {
  if (limit && limit > 0) {
    return entries.slice(0, limit);
  }
  return entries;
}

export const timelineCommand = new Command('timeline')
  .alias('tl')
  .description('Show progress entries across threads in chronological order')
  .option('--since <date>', 'Show entries since date (ISO or parseable date string)')
  .option('--until <date>', 'Show entries until date (ISO or parseable date string)')
  .option('-n, --limit <n>', 'Limit number of entries shown', parseInt)
  .option('-t, --thread <id>', 'Filter to specific thread (id or name)')
  .option('-r, --reverse', 'Show oldest first instead of newest first')
  .action((options) => {
    let threads = getAllThreads();

    // Filter to specific thread if requested
    if (options.thread) {
      const thread = getThreadById(options.thread) || getThreadByName(options.thread);
      if (!thread) {
        console.log(chalk.red('Thread "' + options.thread + '" not found'));
        return;
      }
      threads = [thread];
    }

    // Collect all progress entries with thread context
    const entries = collectTimelineEntries(threads);

    if (entries.length === 0) {
      console.log(chalk.dim('No progress entries found'));
      return;
    }

    // Filter by date range
    let filtered = entries;

    if (options.since) {
      const sinceDate = parseDate(options.since);
      if (!sinceDate) {
        console.log(chalk.red('Invalid --since date: "' + options.since + '"'));
        return;
      }
      filtered = filterByDateRange(filtered, sinceDate, undefined);
    }

    if (options.until) {
      const untilDate = parseDate(options.until);
      if (!untilDate) {
        console.log(chalk.red('Invalid --until date: "' + options.until + '"'));
        return;
      }
      filtered = filterByDateRange(filtered, undefined, untilDate);
    }

    if (filtered.length === 0) {
      console.log(chalk.dim('No progress entries match the specified criteria'));
      return;
    }

    // Sort chronologically (newest first by default)
    filtered = sortTimelineEntries(filtered, options.reverse);

    // Apply limit
    filtered = applyLimit(filtered, options.limit);

    // Output
    const order = options.reverse ? 'oldest' : 'newest';
    console.log(chalk.bold('\nTimeline (' + filtered.length + ' entries, ' + order + ' first):\n'));

    for (const entry of filtered) {
      console.log(formatTimelineEntry(entry));
    }

    console.log('');
  });
