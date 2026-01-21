import { Command } from 'commander';
import { getThreadById, getThreadByName, getAllThreads, updateThread } from '@joshua2048/threads-storage';
import { Dependency } from '@joshua2048/threads-core';
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

export const dependCommand = new Command('depend')
  .description('Add a dependency between threads')
  .argument('<identifier>', 'Thread that has the dependency')
  .option('--on <target>', 'Thread that is depended upon (required)')
  .option('--why <text>', 'Why this dependency exists')
  .option('--what <text>', 'What specifically is needed')
  .option('--how <text>', 'How the dependency will be satisfied')
  .option('--when <text>', 'When the dependency is needed by')
  .option('--remove', 'Remove dependency instead of adding')
  .action((identifier: string, options) => {
    if (!options.on) {
      console.log(chalk.red('Must specify --on <target> to identify the dependency'));
      return;
    }

    const thread = findThread(identifier);
    if (!thread) {
      console.log(chalk.red(`Thread "${identifier}" not found`));
      return;
    }

    const target = findThread(options.on);
    if (!target) {
      console.log(chalk.red(`Target thread "${options.on}" not found`));
      return;
    }

    if (thread.id === target.id) {
      console.log(chalk.red('A thread cannot depend on itself'));
      return;
    }

    if (options.remove) {
      // Remove dependency
      const newDeps = thread.dependencies.filter(d => d.threadId !== target.id);
      if (newDeps.length === thread.dependencies.length) {
        console.log(chalk.yellow(`"${thread.name}" does not depend on "${target.name}"`));
        return;
      }

      updateThread(thread.id, { dependencies: newDeps });
      console.log(chalk.green(`\nRemoved dependency: "${thread.name}" no longer depends on "${target.name}"`));
      console.log('');
      return;
    }

    // Check if dependency already exists
    const existing = thread.dependencies.find(d => d.threadId === target.id);
    if (existing) {
      // Update existing dependency
      const newDeps = thread.dependencies.map(d => {
        if (d.threadId === target.id) {
          return {
            threadId: target.id,
            why: options.why ?? d.why ?? '',
            what: options.what ?? d.what ?? '',
            how: options.how ?? d.how ?? '',
            when: options.when ?? d.when ?? ''
          };
        }
        return d;
      });

      updateThread(thread.id, { dependencies: newDeps });
      console.log(chalk.green(`\nUpdated dependency: "${thread.name}" → "${target.name}"`));
    } else {
      // Add new dependency
      const dep: Dependency = {
        threadId: target.id,
        why: options.why || '',
        what: options.what || '',
        how: options.how || '',
        when: options.when || ''
      };

      updateThread(thread.id, { dependencies: [...thread.dependencies, dep] });
      console.log(chalk.green(`\nAdded dependency: "${thread.name}" → "${target.name}"`));
    }

    // Show context if provided
    if (options.why) console.log(`  Why:  ${options.why}`);
    if (options.what) console.log(`  What: ${options.what}`);
    if (options.how) console.log(`  How:  ${options.how}`);
    if (options.when) console.log(`  When: ${options.when}`);
    console.log('');
  });
