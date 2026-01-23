import { Command } from 'commander';
import { Thread, ThreadStatus, Temperature, ThreadSize, Importance } from '@redjay/threads-core';
import { formatStatus, formatTemperature, formatSize, formatImportance } from '../utils';
import { getStorage } from '../context';
import chalk from 'chalk';

const validStatuses: ThreadStatus[] = ['active', 'paused', 'stopped', 'completed', 'archived'];
const validTemps: Temperature[] = ['frozen', 'freezing', 'cold', 'tepid', 'warm', 'hot'];
const validSizes: ThreadSize[] = ['tiny', 'small', 'medium', 'large', 'huge'];

function findThread(identifier: string): Thread | undefined {
  const storage = getStorage();
  let thread = storage.getThreadById(identifier);
  if (!thread) thread = storage.getThreadByName(identifier);
  if (!thread) {
    const all = storage.getAllThreads();
    const matches = all.filter(t =>
      t.id.toLowerCase().startsWith(identifier.toLowerCase()) ||
      t.name.toLowerCase().includes(identifier.toLowerCase())
    );
    if (matches.length === 1) thread = matches[0];
  }
  return thread;
}

function formatTags(tags: string[]): string {
  if (tags.length === 0) return chalk.dim('(no tags)');
  return tags.map(t => chalk.cyan(`#${t}`)).join(' ');
}

interface UpdateOptions {
  status?: string;
  temperature?: string;
  size?: string;
  importance?: string;
  name?: string;
  description?: string;
  tags?: string;
  addTag?: string;
  removeTag?: string;
}

export const updateCommand = new Command('update')
  .description('Update properties on a thread')
  .argument('<identifier>', 'Thread name or ID')
  .option('-s, --status <status>', 'Set status (active, paused, stopped, completed, archived)')
  .option('-t, --temperature <temp>', 'Set temperature (frozen, freezing, cold, tepid, warm, hot)')
  .option('-z, --size <size>', 'Set size (tiny, small, medium, large, huge)')
  .option('-i, --importance <n>', 'Set importance (1-5)')
  .option('-n, --name <name>', 'Set name')
  .option('-d, --description <desc>', 'Set description')
  .option('--tags <tags>', 'Set tags (comma-separated, replaces existing)')
  .option('--add-tag <tag>', 'Add a single tag')
  .option('--remove-tag <tag>', 'Remove a single tag')
  .action((identifier: string, options: UpdateOptions) => {
    const thread = findThread(identifier);

    if (!thread) {
      console.log(chalk.red(`Thread "${identifier}" not found`));
      return;
    }

    const updates: Partial<Thread> = {};
    const changes: string[] = [];

    // Handle status
    if (options.status) {
      if (!validStatuses.includes(options.status as ThreadStatus)) {
        console.log(chalk.red(`Invalid status. Use: ${validStatuses.join(', ')}`));
        return;
      }
      updates.status = options.status as ThreadStatus;
      changes.push(`status -> ${formatStatus(options.status as ThreadStatus)}`);
    }

    // Handle temperature
    if (options.temperature) {
      if (!validTemps.includes(options.temperature as Temperature)) {
        console.log(chalk.red(`Invalid temperature. Use: ${validTemps.join(', ')}`));
        return;
      }
      updates.temperature = options.temperature as Temperature;
      changes.push(`temperature -> ${formatTemperature(options.temperature as Temperature)}`);
    }

    // Handle size
    if (options.size) {
      if (!validSizes.includes(options.size as ThreadSize)) {
        console.log(chalk.red(`Invalid size. Use: ${validSizes.join(', ')}`));
        return;
      }
      updates.size = options.size as ThreadSize;
      changes.push(`size -> ${formatSize(options.size as ThreadSize)}`);
    }

    // Handle importance
    if (options.importance) {
      const imp = parseInt(options.importance);
      if (isNaN(imp) || imp < 1 || imp > 5) {
        console.log(chalk.red('Importance must be between 1 and 5'));
        return;
      }
      updates.importance = imp as Importance;
      changes.push(`importance -> ${formatImportance(imp as Importance)}`);
    }

    // Handle name
    if (options.name) {
      updates.name = options.name;
      changes.push(`name -> ${options.name}`);
    }

    // Handle description
    if (options.description) {
      updates.description = options.description;
      changes.push(`description -> ${options.description}`);
    }

    // Handle tags - get current tags first
    let currentTags: string[] = thread.tags || [];

    // --tags replaces all tags
    if (options.tags !== undefined) {
      const newTags = options.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      updates.tags = newTags;
      currentTags = newTags;
      changes.push(`tags -> ${formatTags(newTags)}`);
    }

    // --add-tag adds a single tag (after --tags if both specified)
    if (options.addTag) {
      const tagToAdd = options.addTag.trim();
      if (tagToAdd.length > 0) {
        // Use currentTags which may have been updated by --tags
        const tagsArray = updates.tags || [...currentTags];
        if (!tagsArray.includes(tagToAdd)) {
          tagsArray.push(tagToAdd);
          updates.tags = tagsArray;
          changes.push(`added tag -> ${chalk.cyan(`#${tagToAdd}`)}`);
        } else {
          console.log(chalk.yellow(`Tag "${tagToAdd}" already exists`));
        }
      }
    }

    // --remove-tag removes a single tag
    if (options.removeTag) {
      const tagToRemove = options.removeTag.trim();
      if (tagToRemove.length > 0) {
        const tagsArray = updates.tags || [...currentTags];
        const index = tagsArray.indexOf(tagToRemove);
        if (index !== -1) {
          tagsArray.splice(index, 1);
          updates.tags = tagsArray;
          changes.push(`removed tag -> ${chalk.cyan(`#${tagToRemove}`)}`);
        } else {
          console.log(chalk.yellow(`Tag "${tagToRemove}" not found on thread`));
        }
      }
    }

    // Check if any updates were specified
    if (Object.keys(updates).length === 0) {
      console.log(chalk.yellow('No updates specified. Use --help to see available options.'));
      return;
    }

    getStorage().updateThread(thread.id, updates);

    console.log(chalk.green(`\nUpdated "${thread.name}":`));
    for (const change of changes) {
      console.log(`  ${change}`);
    }
    console.log('');
  });
