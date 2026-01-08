import { Command } from 'commander';
import { getThreadById, getThreadByName, getAllThreads } from '../storage';
import { formatThreadDetail } from '../utils';
import chalk from 'chalk';

export const showCommand = new Command('show')
  .description('Show detailed information about a thread')
  .argument('<identifier>', 'Thread name or ID (partial ID match supported)')
  .action((identifier: string) => {
    // Try exact ID match first
    let thread = getThreadById(identifier);

    // Try name match
    if (!thread) {
      thread = getThreadByName(identifier);
    }

    // Try partial ID match
    if (!thread) {
      const all = getAllThreads();
      const matches = all.filter(t => t.id.toLowerCase().startsWith(identifier.toLowerCase()));
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

    // Try partial name match as last resort
    if (!thread) {
      const all = getAllThreads();
      const matches = all.filter(t => t.name.toLowerCase().includes(identifier.toLowerCase()));
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

    console.log('');
    console.log(formatThreadDetail(thread));
    console.log('');
  });
