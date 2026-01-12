import { Command } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import { addThread, getThreadByName, getGroupByName, getGroupById } from '../storage';
import { Thread, ThreadStatus, Temperature, ThreadSize, Importance } from '../models';
import { formatThreadSummary } from '../utils';
import chalk from 'chalk';

export const newCommand = new Command('new')
  .description('Create a new thread')
  .argument('<name>', 'Name of the thread')
  .option('-d, --description <desc>', 'Description of the thread')
  .option('-s, --status <status>', 'Initial status (default: active)', 'active')
  .option('-t, --temperature <temp>', 'Initial temperature (default: warm)', 'warm')
  .option('-z, --size <size>', 'Size estimate (default: medium)', 'medium')
  .option('-i, --importance <level>', 'Importance 1-5 (default: 3)')
  .option('-T, --tags <tags>', 'Comma-separated tags')
  .option('-g, --group <group>', 'Group name or ID to assign thread to')
  .action((name: string, options) => {
    // Apply defaults
    const importance = options.importance ? parseInt(options.importance) : 3;
    // Check for duplicate name
    const existing = getThreadByName(name);
    if (existing) {
      console.log(chalk.red(`Thread "${name}" already exists`));
      return;
    }

    // Validate options
    const validStatuses: ThreadStatus[] = ['active', 'paused', 'stopped', 'completed', 'archived'];
    const validTemps: Temperature[] = ['frozen', 'freezing', 'cold', 'tepid', 'warm', 'hot'];
    const validSizes: ThreadSize[] = ['tiny', 'small', 'medium', 'large', 'huge'];

    if (!validStatuses.includes(options.status as ThreadStatus)) {
      console.log(chalk.red(`Invalid status. Use: ${validStatuses.join(', ')}`));
      return;
    }
    if (!validTemps.includes(options.temperature as Temperature)) {
      console.log(chalk.red(`Invalid temperature. Use: ${validTemps.join(', ')}`));
      return;
    }
    if (!validSizes.includes(options.size as ThreadSize)) {
      console.log(chalk.red(`Invalid size. Use: ${validSizes.join(', ')}`));
      return;
    }
    if (importance < 1 || importance > 5) {
      console.log(chalk.red('Importance must be between 1 and 5'));
      return;
    }

    // Resolve group if provided
    let groupId: string | null = null;
    if (options.group) {
      // Try by name first, then by ID
      const groupByName = getGroupByName(options.group);
      if (groupByName) {
        groupId = groupByName.id;
      } else {
        const groupById = getGroupById(options.group);
        if (groupById) {
          groupId = groupById.id;
        } else {
          console.log(chalk.red(`Group "${options.group}" not found`));
          return;
        }
      }
    }

    // Parse tags from comma-separated string
    const tags: string[] = options.tags
      ? options.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)
      : [];

    const now = new Date().toISOString();
    const thread: Thread = {
      id: uuidv4(),
      name,
      description: options.description || '',
      status: options.status as ThreadStatus,
      importance: importance as Importance,
      temperature: options.temperature as Temperature,
      size: options.size as ThreadSize,
      parentId: null,
      groupId,
      tags,
      dependencies: [],
      progress: [],
      details: [],
      createdAt: now,
      updatedAt: now
    };

    addThread(thread);

    console.log(chalk.green('\nThread created:\n'));
    console.log(formatThreadSummary(thread));
    console.log('');
  });
