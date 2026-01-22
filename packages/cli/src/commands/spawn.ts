import { Command, Option } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import { getThreadById, getThreadByName, getAllThreads, addThread } from 'threads-storage';
import { Thread, ThreadStatus, Temperature, ThreadSize, Importance } from 'threads-types';
import { formatThreadSummary } from '../utils';
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

export const spawnCommand = new Command('spawn')
  .description('Create a sub-thread under an existing thread')
  .argument('<parent>', 'Parent thread name or ID')
  .argument('<name>', 'Name of the new sub-thread')
  .option('-d, --description <desc>', 'Description of the sub-thread')
  .option('-z, --size <size>', 'Size estimate (default: inherits from parent or small)', 'small')
  .option('-i, --importance <level>', 'Importance 1-5 (default: inherits from parent)', parseInt)
  .option('-T, --tags <tags>', 'Comma-separated tags')
  .addOption(new Option('--tag <tags>').hideHelp())
  .action((parentIdentifier: string, name: string, options) => {
    const parent = findThread(parentIdentifier);

    if (!parent) {
      console.log(chalk.red(`Parent thread "${parentIdentifier}" not found`));
      return;
    }

    // Check for duplicate name
    const existing = getThreadByName(name);
    if (existing) {
      console.log(chalk.red(`Thread "${name}" already exists`));
      return;
    }

    const validSizes: ThreadSize[] = ['tiny', 'small', 'medium', 'large', 'huge'];
    if (!validSizes.includes(options.size as ThreadSize)) {
      console.log(chalk.red(`Invalid size. Use: ${validSizes.join(', ')}`));
      return;
    }

    const importance = options.importance ?? parent.importance;
    if (importance < 1 || importance > 5) {
      console.log(chalk.red('Importance must be between 1 and 5'));
      return;
    }

    // Parse tags from comma-separated string
    const tagsInput = options.tags || options.tag;
    const tags: string[] = tagsInput
      ? tagsInput.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)
      : [];

    const now = new Date().toISOString();
    const thread: Thread = {
      id: uuidv4(),
      name,
      description: options.description || '',
      status: 'active',
      importance: importance as Importance,
      temperature: 'warm',  // New sub-threads start warm
      size: options.size as ThreadSize,
      parentId: parent.id,
      groupId: parent.groupId,  // Inherit group from parent
      tags,
      dependencies: [],
      progress: [],
      details: [],
      createdAt: now,
      updatedAt: now
    };

    addThread(thread);

    console.log(chalk.green(`\nSub-thread spawned under "${parent.name}":\n`));
    console.log(formatThreadSummary(thread));
    console.log('');
  });
