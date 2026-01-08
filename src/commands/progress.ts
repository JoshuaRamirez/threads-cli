import { Command } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import { getThreadById, getThreadByName, getAllThreads, updateThread } from '../storage';
import { ProgressEntry } from '../models';
import chalk from 'chalk';

export const progressCommand = new Command('progress')
  .alias('p')
  .description('Add a progress note to a thread')
  .argument('<identifier>', 'Thread name or ID')
  .argument('<note>', 'Progress note to add')
  .option('--warm', 'Also set temperature to warm')
  .option('--hot', 'Also set temperature to hot')
  .action((identifier: string, note: string, options) => {
    // Find the thread
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

    // Create progress entry
    const entry: ProgressEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      note
    };

    // Build updates
    const updates: any = {
      progress: [...thread.progress, entry]
    };

    // Optionally update temperature
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
