import { Command } from 'commander';
import { getAllThreads } from 'threads-storage';
import { Thread, Temperature } from 'threads-types';
import { formatTemperature, formatImportanceStars } from '../utils';
import chalk from 'chalk';

// Temperature order for sorting (hottest first)
export const TEMP_ORDER: Temperature[] = ['hot', 'warm', 'tepid', 'cold', 'freezing', 'frozen'];

// Cold temperature values
export const COLD_TEMPS: Temperature[] = ['cold', 'freezing', 'frozen'];

// Calculate days since a given ISO date string
export function daysSince(isoDate: string, now: Date = new Date()): number {
  const then = new Date(isoDate);
  const diffMs = now.getTime() - then.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Check if a date is today
export function isToday(isoDate: string, now: Date = new Date()): boolean {
  const date = new Date(isoDate);
  return date.toDateString() === now.toDateString();
}

// Check if a date is within the last N days
export function isWithinDays(isoDate: string, days: number, now: Date = new Date()): boolean {
  return daysSince(isoDate, now) <= days;
}

// Get the most recent progress timestamp for a thread
export function getLastProgressDate(thread: Thread): string | null {
  if (thread.progress.length === 0) return null;
  return thread.progress[thread.progress.length - 1].timestamp;
}

// Get the most recent progress note for a thread
export function getLastProgressNote(thread: Thread): string | null {
  if (thread.progress.length === 0) return null;
  return thread.progress[thread.progress.length - 1].note;
}

// Truncate a string to a max length with ellipsis
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

// Format relative time for display
export function formatRelativeTime(isoDate: string, now: Date = new Date()): string {
  const days = daysSince(isoDate, now);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// Sort threads by temperature (hottest first), then importance, then updatedAt
export function sortByPriority(threads: Thread[]): Thread[] {
  return [...threads].sort((a, b) => {
    const tempDiff = TEMP_ORDER.indexOf(a.temperature) - TEMP_ORDER.indexOf(b.temperature);
    if (tempDiff !== 0) return tempDiff;
    if (a.importance !== b.importance) return b.importance - a.importance;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

/**
 * Categorize threads into agenda sections.
 * Exported for testability.
 */
export interface AgendaCategories {
  hotThreads: Thread[];
  activeInPeriod: Thread[];
  needsAttention: Thread[];
  otherActive: Thread[];
}

export function categorizeThreads(
  threads: Thread[],
  options: { week?: boolean; all?: boolean },
  now: Date = new Date()
): AgendaCategories {
  const lookbackDays = options.week ? 7 : 1;

  // Filter to active threads only (not archived, not completed)
  const activeThreads = threads.filter(t =>
    t.status === 'active' || t.status === 'paused'
  );

  // Section 1: Hot threads (temperature === 'hot')
  const hotThreads = sortByPriority(
    activeThreads.filter(t => t.temperature === 'hot')
  );

  // Section 2: Active Today/This Week (threads with progress in the period)
  const activeInPeriodRaw = sortByPriority(
    activeThreads.filter(t => {
      const lastProgress = getLastProgressDate(t);
      if (!lastProgress) return false;
      return isWithinDays(lastProgress, lookbackDays - 1, now); // -1 because 0 days = today
    })
  );
  // Exclude hot threads from this section to avoid duplication
  const activeInPeriod = activeInPeriodRaw.filter(
    t => t.temperature !== 'hot'
  );

  // Section 3: Needs Attention (active but cold/freezing/frozen OR no recent progress)
  const needsAttention = sortByPriority(
    activeThreads.filter(t => {
      // Only truly active threads (not paused)
      if (t.status !== 'active') return false;
      // Exclude hot threads
      if (t.temperature === 'hot') return false;

      const lastProgress = getLastProgressDate(t);
      const isColdTemp = COLD_TEMPS.includes(t.temperature);
      const noRecentProgress = !lastProgress || daysSince(lastProgress, now) > 7;

      return isColdTemp || noRecentProgress;
    })
  );

  // If --all flag, show remaining active threads too
  let otherActive: Thread[] = [];
  if (options.all) {
    const shownIds = new Set([
      ...hotThreads.map(t => t.id),
      ...activeInPeriod.map(t => t.id),
      ...needsAttention.map(t => t.id)
    ]);
    otherActive = sortByPriority(
      activeThreads.filter(t => !shownIds.has(t.id))
    );
  }

  return { hotThreads, activeInPeriod, needsAttention, otherActive };
}

// Compact thread line for agenda display
function formatAgendaLine(thread: Thread, showLastActivity: boolean = true): string {
  const temp = formatTemperature(thread.temperature);
  const stars = formatImportanceStars(thread.importance);
  const name = chalk.bold(thread.name);

  let activityInfo = '';
  if (showLastActivity) {
    const lastProgress = getLastProgressDate(thread);
    if (lastProgress) {
      activityInfo = chalk.dim(` (${formatRelativeTime(lastProgress)})`);
    } else {
      activityInfo = chalk.dim(` (no progress)`);
    }
  }

  return `  ${temp} ${stars} ${name}${activityInfo}`;
}

// Compact thread line with last note
function formatAgendaLineWithNote(thread: Thread): string {
  const temp = formatTemperature(thread.temperature);
  const stars = formatImportanceStars(thread.importance);
  const name = chalk.bold(thread.name);
  const lastNote = getLastProgressNote(thread);

  let noteLine = '';
  if (lastNote) {
    noteLine = `\n      ${chalk.dim(truncate(lastNote, 60))}`;
  }

  return `  ${temp} ${stars} ${name}${noteLine}`;
}

export const agendaCommand = new Command('agenda')
  .alias('ag')
  .description('Show daily/weekly focus view of threads requiring attention')
  .option('-w, --week', 'Expand view to 7 days instead of today')
  .option('-a, --all', 'Include all active threads, not just priority items')
  .action((options) => {
    const threads = getAllThreads();
    const { hotThreads, activeInPeriod, needsAttention, otherActive } = categorizeThreads(threads, options);

    // Render the agenda
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    console.log(chalk.bold(`\n=== AGENDA: ${dateStr} ===\n`));

    // Hot section
    console.log(chalk.red.bold(`Hot (${hotThreads.length})`));
    if (hotThreads.length === 0) {
      console.log(chalk.dim('  No hot threads'));
    } else {
      hotThreads.forEach(t => {
        console.log(formatAgendaLineWithNote(t));
      });
    }
    console.log('');

    // Active in period section
    const activeLabel = options.week ? 'Active This Week' : 'Active Today';
    console.log(chalk.green.bold(`${activeLabel} (${activeInPeriod.length})`));
    if (activeInPeriod.length === 0) {
      console.log(chalk.dim(`  No progress recorded ${options.week ? 'this week' : 'today'}`));
    } else {
      activeInPeriod.forEach(t => {
        console.log(formatAgendaLine(t, true));
      });
    }
    console.log('');

    // Needs attention section
    console.log(chalk.yellow.bold(`Needs Attention (${needsAttention.length})`));
    if (needsAttention.length === 0) {
      console.log(chalk.dim('  All active threads are warm'));
    } else {
      needsAttention.forEach(t => {
        const lastProgress = getLastProgressDate(t);
        const reason = lastProgress
          ? `${formatRelativeTime(lastProgress)}`
          : 'no progress yet';
        console.log(`  ${formatTemperature(t.temperature)} ${formatImportanceStars(t.importance)} ${chalk.bold(t.name)} ${chalk.dim(`(${reason})`)}`);
      });
    }
    console.log('');

    // Other active threads (only if --all)
    if (options.all && otherActive.length > 0) {
      console.log(chalk.blue.bold(`Other Active (${otherActive.length})`));
      otherActive.forEach(t => {
        console.log(formatAgendaLine(t, true));
      });
      console.log('');
    }

    // Summary line
    const activeThreads = threads.filter(t => t.status === 'active' || t.status === 'paused');
    const totalActive = activeThreads.filter(t => t.status === 'active').length;
    const totalPaused = activeThreads.filter(t => t.status === 'paused').length;
    console.log(chalk.dim(`Total: ${totalActive} active, ${totalPaused} paused`));
    console.log('');
  });
