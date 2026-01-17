import { Command, Option } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import { addThread, getThreadByName, getGroupByName, getGroupById, getThreadById, getAllThreads, getContainerById, getAllContainers } from '../storage';
import { Thread, ThreadStatus, Temperature, ThreadSize, Importance, Entity } from '../models';
import { formatThreadSummary } from '../utils';
import chalk from 'chalk';

function findParent(identifier: string): Entity | undefined {
  // Try threads first
  let entity: Entity | undefined = getThreadById(identifier);
  if (!entity) entity = getThreadByName(identifier);
  if (!entity) {
    const threads = getAllThreads();
    const matches = threads.filter(t =>
      t.id.toLowerCase().startsWith(identifier.toLowerCase()) ||
      t.name.toLowerCase().includes(identifier.toLowerCase())
    );
    if (matches.length === 1) entity = matches[0];
  }
  // Try containers
  if (!entity) {
    entity = getContainerById(identifier);
  }
  if (!entity) {
    const containers = getAllContainers();
    const matches = containers.filter(c =>
      c.id.toLowerCase().startsWith(identifier.toLowerCase()) ||
      c.name.toLowerCase().includes(identifier.toLowerCase())
    );
    if (matches.length === 1) entity = matches[0];
  }
  return entity;
}

export const newCommand = new Command('new')
  .description('Create a new thread')
  .argument('<name>', 'Name of the thread')
  .option('-d, --description <desc>', 'Description of the thread')
  .option('-s, --status <status>', 'Initial status (default: active)', 'active')
  .option('-t, --temp <temp>', 'Initial temperature (default: warm)', 'warm')
  .addOption(new Option('--temperature <temp>', 'Alias for --temp').hideHelp())
  .option('-z, --size <size>', 'Size estimate (default: medium)', 'medium')
  .option('-i, --importance <level>', 'Importance 1-5 (default: 3)')
  .option('-T, --tags <tags>', 'Comma-separated tags')
  .addOption(new Option('--tag <tags>').hideHelp())
  .option('-g, --group <group>', 'Group name or ID to assign thread to')
  .option('-p, --parent <parent>', 'Parent thread or container (creates sub-thread)')
  .action((name: string, options) => {
    // Apply defaults - coalesce --temp and --temperature aliases
    const temperatureValue = options.temp || options.temperature || 'warm';
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
    if (!validTemps.includes(temperatureValue as Temperature)) {
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

    // Resolve parent if provided
    let parentId: string | null = null;
    let parentEntity: Entity | undefined;
    if (options.parent) {
      parentEntity = findParent(options.parent);
      if (!parentEntity) {
        console.log(chalk.red(`Parent "${options.parent}" not found`));
        return;
      }
      parentId = parentEntity.id;
    }

    // Resolve group - explicit option takes precedence, then inherit from parent
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
    } else if (parentEntity?.groupId) {
      // Inherit group from parent
      groupId = parentEntity.groupId;
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
      status: options.status as ThreadStatus,
      importance: importance as Importance,
      temperature: temperatureValue as Temperature,
      size: options.size as ThreadSize,
      parentId,
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
