import { Command } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import { getThreadById, getThreadByName, getAllThreads, updateThread } from 'threads-storage';
import { ProgressEntry } from 'threads-types';
import chalk from 'chalk';

function parseDateTime(input: string): Date | null {
  const date = new Date(input);
  if (!isNaN(date.getTime())) {
    return date;
  }
  const now = new Date();
  const lower = input.toLowerCase();
  if (lower === 'yesterday') {
    now.setDate(now.getDate() - 1);
    return now;
  }
  const daysAgoMatch = lower.match(/^(\d+)\s*days?\s*ago$/);
  if (daysAgoMatch) {
    now.setDate(now.getDate() - parseInt(daysAgoMatch[1]));
    return now;
  }
  return null;
}

export const progressCommand = new Command('progress')
  .alias('p')
  .description('Add a progress note to a thread')
  .argument('<identifier>', 'Thread name or ID')
  .argument('<note>', 'Progress note to add')
  .option('--warm', 'Also set temperature to warm')
  .option('--hot', 'Also set temperature to hot')
  .option('--at <datetime>', 'Set custom timestamp (e.g., "2026-01-10 3pm", "yesterday")')
  .action((identifier: string, note: string, options) => {
    let thread = getThreadById(identifier);
    if (!thread) {
      thread = getThreadByName(identifier);
    }
    if (!thread) {
      const all = getAllThreads();
      const matches = all.filter(t =>
        t.id.toLowerCase().startsWith(identifier.toLowerCase()) ||
        t.name.toLowerCase().includes(identifier.toLowerCase())
      );
      if (matches.length === 1) {
        thread = matches[0];
      } else if (matches.length > 1) {
        console.log(chalk.yellow(`Multiple threads match "${identifier}":`));
        matches.forEach(t => {
          console.log(`  ${t.id.slice(0, 8)} - ${t.name}`);
        });
        return;
      }
    }

    if (!thread) {
      console.log(chalk.red(`Thread "${identifier}" not found`));
      return;
    }

    // Parse timestamp
    let timestamp = new Date().toISOString();
    if (options.at) {
      const parsed = parseDateTime(options.at);
      if (!parsed) {
        console.log(chalk.red(`Invalid datetime: "${options.at}"`));
        return;
      }
      timestamp = parsed.toISOString();
    }

    const entry: ProgressEntry = {
      id: uuidv4(),
      timestamp,
      note
    };

    const updates: any = {
      progress: [...thread.progress, entry]
    };

    if (options.hot) {
      updates.temperature = 'hot';
    } else if (options.warm) {
      updates.temperature = 'warm';
    }

    updateThread(thread.id, updates);

    console.log(chalk.green(`\nProgress added to "${thread.name}":`));
    console.log(`  [${new Date(entry.timestamp).toLocaleString()}] ${note}`);
    if (options.hot || options.warm) {
      console.log(chalk.dim(`  Temperature set to ${options.hot ? 'hot' : 'warm'}`));
    }
    console.log('');
  });
