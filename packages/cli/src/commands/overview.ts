import { Command } from 'commander';
import { getAllThreads, getAllGroups, getGroupById } from '@joshua2048/threads-storage';
import { Thread, Group, Temperature } from '@joshua2048/threads-core';
import chalk from 'chalk';

// Calculate days since a given ISO date string
function daysSince(isoDate: string): number {
  const then = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Get the most recent progress timestamp for a thread
function getLastProgressDate(thread: Thread): string | null {
  if (thread.progress.length === 0) return null;
  // Progress entries are stored chronologically, last is most recent
  return thread.progress[thread.progress.length - 1].timestamp;
}

// Get the most recent progress note for a thread
function getLastProgressNote(thread: Thread): string | null {
  if (thread.progress.length === 0) return null;
  return thread.progress[thread.progress.length - 1].note;
}

// Truncate a string to a max length with ellipsis
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

export const overviewCommand = new Command('overview')
  .alias('ov')
  .description('Display a personal dashboard overview of threads')
  .option('-d, --days <n>', 'Days threshold for recent/cold (default: 7)', parseInt)
  .action((options) => {
    const daysThreshold = options.days || 7;
    const threads = getAllThreads();
    const groups = getAllGroups();

    // Filter out archived threads for the overview
    const activeThreads = threads.filter(t => t.status !== 'archived');

    // Build group lookup map
    const groupMap = new Map<string, Group>();
    groups.forEach(g => groupMap.set(g.id, g));

    // Hot threads: temperature === 'hot'
    const hotThreads = activeThreads.filter(t => t.temperature === 'hot');

    // Recent activity: threads with progress updates in the last N days
    const recentThreads: { thread: Thread; updateCount: number; lastNote: string }[] = [];
    activeThreads.forEach(t => {
      const lastDate = getLastProgressDate(t);
      if (lastDate && daysSince(lastDate) <= daysThreshold) {
        // Count updates within the threshold
        const recentUpdates = t.progress.filter(p => daysSince(p.timestamp) <= daysThreshold);
        const lastNote = getLastProgressNote(t) || '';
        recentThreads.push({ thread: t, updateCount: recentUpdates.length, lastNote });
      }
    });
    // Sort by most recent update first
    recentThreads.sort((a, b) => {
      const aDate = getLastProgressDate(a.thread) || a.thread.updatedAt;
      const bDate = getLastProgressDate(b.thread) || b.thread.updatedAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

    // Going cold: active threads with no updates in N+ days
    const coldThreads: Thread[] = activeThreads.filter(t => {
      if (t.status !== 'active') return false;
      const lastDate = getLastProgressDate(t);
      if (!lastDate) {
        // No progress at all, check createdAt
        return daysSince(t.createdAt) > daysThreshold;
      }
      return daysSince(lastDate) > daysThreshold;
    });

    // Summary stats by group
    const statsByGroup = new Map<string, { count: number; hot: number; warm: number }>();
    const ungroupedStats = { count: 0, hot: 0, warm: 0 };

    activeThreads.forEach(t => {
      const isHot = t.temperature === 'hot';
      const isWarm = t.temperature === 'warm';
      if (t.groupId) {
        if (!statsByGroup.has(t.groupId)) {
          statsByGroup.set(t.groupId, { count: 0, hot: 0, warm: 0 });
        }
        const stats = statsByGroup.get(t.groupId)!;
        stats.count++;
        if (isHot) stats.hot++;
        if (isWarm) stats.warm++;
      } else {
        ungroupedStats.count++;
        if (isHot) ungroupedStats.hot++;
        if (isWarm) ungroupedStats.warm++;
      }
    });

    // Count by status
    const statusCounts = {
      active: threads.filter(t => t.status === 'active').length,
      paused: threads.filter(t => t.status === 'paused').length,
      stopped: threads.filter(t => t.status === 'stopped').length,
      completed: threads.filter(t => t.status === 'completed').length,
      archived: threads.filter(t => t.status === 'archived').length
    };

    // Render the overview
    console.log(chalk.bold('\n=== THREADS OVERVIEW ===\n'));

    // Hot section
    console.log(chalk.red.bold(`Hot (${hotThreads.length})`));
    if (hotThreads.length === 0) {
      console.log(chalk.dim('  No hot threads'));
    } else {
      hotThreads.forEach(t => {
        const lastNote = getLastProgressNote(t);
        if (lastNote) {
          console.log(`  * ${chalk.bold(t.name)} - "${truncate(lastNote, 50)}"`);
        } else {
          console.log(`  * ${chalk.bold(t.name)}`);
        }
      });
    }
    console.log('');

    // Recent activity section
    console.log(chalk.green.bold(`Recent Activity (last ${daysThreshold} days)`));
    if (recentThreads.length === 0) {
      console.log(chalk.dim('  No recent activity'));
    } else {
      recentThreads.forEach(({ thread, updateCount, lastNote }) => {
        const updateLabel = updateCount === 1 ? '1 update' : `${updateCount} updates`;
        console.log(`  * ${chalk.bold(thread.name)} (${updateLabel}) - last: "${truncate(lastNote, 40)}"`);
      });
    }
    console.log('');

    // Going cold section
    console.log(chalk.cyan.bold(`Going Cold (no updates in ${daysThreshold}+ days)`));
    if (coldThreads.length === 0) {
      console.log(chalk.dim('  No threads going cold'));
    } else {
      coldThreads.forEach(t => {
        console.log(`  * ${t.name} - active but no recent progress`);
      });
    }
    console.log('');

    // Summary stats section
    console.log(chalk.bold('Summary'));
    statsByGroup.forEach((stats, groupId) => {
      const group = groupMap.get(groupId);
      const groupName = group ? group.name : 'Unknown';
      console.log(chalk.dim(`  ${groupName}: ${stats.count} threads (${stats.hot} hot, ${stats.warm} warm)`));
    });
    if (ungroupedStats.count > 0) {
      console.log(chalk.dim(`  Ungrouped: ${ungroupedStats.count} threads (${ungroupedStats.hot} hot, ${ungroupedStats.warm} warm)`));
    }

    // Total by status
    const nonArchivedTotal = statusCounts.active + statusCounts.paused + statusCounts.stopped + statusCounts.completed;
    console.log(chalk.dim(`  Total: ${statusCounts.active} active, ${statusCounts.paused} paused, ${statusCounts.archived} archived`));
    console.log('');
  });
