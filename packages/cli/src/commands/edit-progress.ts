import { Command } from 'commander';
import { getThreadById, getThreadByName, getAllThreads, updateThread } from '@redjay/threads-storage';
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

export const editProgressCommand = new Command('edit-progress')
  .alias('ep')
  .description('Edit a progress entry (note text and/or timestamp)')
  .argument('<thread>', 'Thread name or ID')
  .argument('<index>', 'Progress entry index (1-based, or "last")')
  .option('-n, --note <text>', 'New note text')
  .option('-t, --time <datetime>', 'New timestamp')
  .option('-d, --delete', 'Delete the progress entry')
  .action((threadId: string, indexArg: string, options) => {
    // Find thread
    let thread = getThreadById(threadId);
    if (!thread) {
      thread = getThreadByName(threadId);
    }
    if (!thread) {
      const all = getAllThreads();
      const matches = all.filter(t =>
        t.id.toLowerCase().startsWith(threadId.toLowerCase()) ||
        t.name.toLowerCase().includes(threadId.toLowerCase())
      );
      if (matches.length === 1) {
        thread = matches[0];
      } else if (matches.length > 1) {
        console.log(chalk.yellow(`Multiple threads match "${threadId}":`));
        matches.forEach(t => {
          console.log(`  ${t.id.slice(0, 8)} - ${t.name}`);
        });
        return;
      }
    }

    if (!thread) {
      console.log(chalk.red(`Thread "${threadId}" not found`));
      return;
    }

    if (thread.progress.length === 0) {
      console.log(chalk.red(`Thread "${thread.name}" has no progress entries`));
      return;
    }

    // Parse index
    let index: number;
    if (indexArg.toLowerCase() === 'last') {
      index = thread.progress.length - 1;
    } else {
      index = parseInt(indexArg) - 1; // Convert to 0-based
      if (isNaN(index) || index < 0 || index >= thread.progress.length) {
        console.log(chalk.red(`Invalid index. Use 1-${thread.progress.length} or "last"`));
        return;
      }
    }

    const entry = thread.progress[index];

    // Delete mode
    if (options.delete) {
      const newProgress = [...thread.progress];
      newProgress.splice(index, 1);
      updateThread(thread.id, { progress: newProgress });
      console.log(chalk.green(`\nDeleted progress entry from "${thread.name}":`));
      console.log(chalk.dim(`  [${new Date(entry.timestamp).toLocaleString()}] ${entry.note}`));
      console.log('');
      return;
    }

    // Edit mode - need at least one option
    if (!options.note && !options.time) {
      console.log(chalk.yellow(`Current entry [${index + 1}]:`));
      console.log(`  [${new Date(entry.timestamp).toLocaleString()}] ${entry.note}`);
      console.log(chalk.dim('\nUse --note and/or --time to edit, or --delete to remove'));
      return;
    }

    // Apply edits
    const newProgress = [...thread.progress];

    if (options.note) {
      newProgress[index] = { ...newProgress[index], note: options.note };
    }

    if (options.time) {
      const parsed = parseDateTime(options.time);
      if (!parsed) {
        console.log(chalk.red(`Invalid datetime: "${options.time}"`));
        return;
      }
      newProgress[index] = { ...newProgress[index], timestamp: parsed.toISOString() };
    }

    updateThread(thread.id, { progress: newProgress });

    const updated = newProgress[index];
    console.log(chalk.green(`\nUpdated progress entry in "${thread.name}":`));
    console.log(`  [${new Date(updated.timestamp).toLocaleString()}] ${updated.note}`);
    console.log('');
  });
