import { Command } from 'commander';
import { getThreadById, getThreadByName, getAllThreads, updateThread } from '../storage';
import chalk from 'chalk';

function findThread(identifier: string) {
  let thread = getThreadById(identifier);
  if (!thread) thread = getThreadByName(identifier);
  if (!thread) {
    const all = getAllThreads();
    const matches = all.filter(t =>
      t.id.toLowerCase().startsWith(identifier.toLowerCase()) ||
      t.name.toLowerCase().includes(identifier.toLowerCase())
    );
    if (matches.length === 1) thread = matches[0];
  }
  return thread;
}

export const archiveCommand = new Command('archive')
  .description('Archive a thread (or unarchive with --restore)')
  .argument('<identifier>', 'Thread name or ID')
  .option('--restore', 'Restore an archived thread to active status')
  .action((identifier: string, options) => {
    const thread = findThread(identifier);

    if (!thread) {
      console.log(chalk.red(`Thread "${identifier}" not found`));
      return;
    }

    if (options.restore) {
      if (thread.status !== 'archived') {
        console.log(chalk.yellow(`"${thread.name}" is not archived (status: ${thread.status})`));
        return;
      }

      updateThread(thread.id, {
        status: 'active',
        temperature: 'tepid'  // Restored threads come back tepid
      });
      console.log(chalk.green(`\nRestored "${thread.name}" to active status\n`));
    } else {
      if (thread.status === 'archived') {
        console.log(chalk.yellow(`"${thread.name}" is already archived`));
        return;
      }

      updateThread(thread.id, {
        status: 'archived',
        temperature: 'frozen'
      });
      console.log(chalk.green(`\nArchived "${thread.name}"\n`));
    }
  });
