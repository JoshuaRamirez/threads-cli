import { Command } from 'commander';
import { getAllThreads } from '../storage';
import { Thread, Temperature, Importance } from '../models';
import { formatTemperature, formatImportanceStars } from '../utils';
import chalk from 'chalk';

// Temperature score mapping (0-5 scale)
export const temperatureScores: Record<Temperature, number> = {
  frozen: 0,
  freezing: 1,
  cold: 2,
  tepid: 3,
  warm: 4,
  hot: 5
};

// Calculate hours since a given ISO date string
export function hoursSince(isoDate: string): number {
  const then = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  return diffMs / (1000 * 60 * 60);
}

// Recency score: decays over time using inverse function
// Recent activity scores higher; activity > 30 days old approaches 0
export function recencyScore(isoDate: string): number {
  const hours = hoursSince(isoDate);
  const days = hours / 24;
  // Inverse decay: score = 5 * (1 / (1 + days/7))
  // At 0 days: ~5, at 7 days: ~2.5, at 30 days: ~0.9
  return 5 * (1 / (1 + days / 7));
}

// Get most recent activity date (latest of updatedAt or last progress)
export function getMostRecentActivity(thread: Thread): string {
  let latest = thread.updatedAt;
  if (thread.progress.length > 0) {
    const lastProgress = thread.progress[thread.progress.length - 1].timestamp;
    if (new Date(lastProgress) > new Date(latest)) {
      latest = lastProgress;
    }
  }
  return latest;
}

export interface ScoredThread {
  thread: Thread;
  totalScore: number;
  importanceScore: number;
  temperatureScore: number;
  recencyScore: number;
}

// Calculate composite score for a thread
export function scoreThread(thread: Thread): ScoredThread {
  const impScore = thread.importance; // 1-5
  const tempScore = temperatureScores[thread.temperature]; // 0-5
  const recentActivity = getMostRecentActivity(thread);
  const recScore = recencyScore(recentActivity); // ~0-5

  // Weighted composite: importance carries most weight, then temperature, then recency
  // Weights: importance=3, temperature=2, recency=1
  const total = (impScore * 3) + (tempScore * 2) + recScore;

  return {
    thread,
    totalScore: total,
    importanceScore: impScore,
    temperatureScore: tempScore,
    recencyScore: recScore
  };
}

// Format a scored thread for display
function formatScoredThread(scored: ScoredThread, rank: number, showExplain: boolean): string[] {
  const t = scored.thread;
  const lines: string[] = [];

  const scoreStr = chalk.bold.magenta(`[${scored.totalScore.toFixed(1)}]`);
  const rankStr = chalk.gray(`#${rank}`);
  const shortId = chalk.gray(`[${t.id.slice(0, 8)}]`);

  lines.push(`${rankStr} ${scoreStr} ${chalk.bold(t.name)} ${shortId}`);

  if (showExplain) {
    const impExpl = `importance=${scored.importanceScore}*3`;
    const tempExpl = `temp=${scored.temperatureScore}*2`;
    const recExpl = `recency=${scored.recencyScore.toFixed(2)}*1`;
    lines.push(chalk.dim(`     = ${impExpl} + ${tempExpl} + ${recExpl}`));
  }

  // Show key properties
  const tempLabel = formatTemperature(t.temperature);
  const stars = formatImportanceStars(t.importance);
  lines.push(`     ${tempLabel} ${stars}`);

  // Show description if present (truncated)
  if (t.description) {
    const desc = t.description.length > 60 ? t.description.slice(0, 57) + '...' : t.description;
    lines.push(chalk.dim(`     ${desc}`));
  }

  // Show last progress if present
  if (t.progress.length > 0) {
    const lastProgress = t.progress[t.progress.length - 1];
    const note = lastProgress.note.length > 50 ? lastProgress.note.slice(0, 47) + '...' : lastProgress.note;
    const date = new Date(lastProgress.timestamp);
    const relTime = formatRelativeTime(date);
    lines.push(chalk.dim(`     Last: "${note}" (${relTime})`));
  }

  return lines;
}

// Format relative time (e.g., "2 hours ago", "3 days ago")
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

export const nextCommand = new Command('next')
  .alias('focus')
  .description('Recommend what to work on next based on importance, temperature, and recency')
  .option('-c, --count <n>', 'Number of recommendations to show', parseInt, 5)
  .option('-e, --explain', 'Show scoring breakdown for each thread')
  .action((options) => {
    const count = options.count || 5;
    const showExplain = options.explain || false;

    // Get all threads, filter to active only
    const threads = getAllThreads().filter(t => t.status === 'active');

    if (threads.length === 0) {
      console.log(chalk.dim('No active threads to recommend'));
      return;
    }

    // Score and sort
    const scored = threads.map(scoreThread);
    scored.sort((a, b) => b.totalScore - a.totalScore);

    // Take top N
    const topN = scored.slice(0, count);

    console.log(chalk.bold(`\nNext Focus (top ${topN.length} of ${threads.length} active):\n`));

    if (showExplain) {
      console.log(chalk.dim('Score = importance*3 + temperature*2 + recency*1\n'));
    }

    topN.forEach((s, idx) => {
      const lines = formatScoredThread(s, idx + 1, showExplain);
      lines.forEach(line => console.log(line));
      console.log('');
    });
  });
