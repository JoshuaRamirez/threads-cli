import { Command, Option } from 'commander';
import { getAllThreads, getAllGroups, getGroupById, getAllContainers } from '../storage';
import { Thread, ThreadStatus, Temperature, ThreadSize, Importance } from '../models';
import { formatThreadSummary, buildTree, renderTree } from '../utils';
import chalk from 'chalk';

export const listCommand = new Command('list')
  .alias('ls')
  .description('List threads with optional filters')
  .option('-s, --status <status>', 'Filter by status (active, paused, stopped, completed, archived)')
  .option('-t, --temp <temp>', 'Filter by temperature (frozen, freezing, cold, tepid, warm, hot)')
  .addOption(new Option('--temperature <temp>', 'Alias for --temp').hideHelp())
  .option('-z, --size <size>', 'Filter by size (tiny, small, medium, large, huge)')
  .option('-i, --importance <level>', 'Filter by minimum importance (1-5)', parseInt)
  .option('-g, --group <name>', 'Filter by group name')
  .option('--tag <tag>', 'Filter by tag')
  .addOption(new Option('--tags <tag>').hideHelp())
  .option('--hot', 'Shortcut for --temp hot')
  .option('--active', 'Shortcut for --status active')
  .option('--all', 'Show all threads including archived')
  .option('--flat', 'Display as flat list (non-hierarchical)')
  .option('--tree', 'Display as hierarchical tree (default)')
  .action((options) => {
    let threads = getAllThreads();

    // Coalesce --temp and --temperature aliases
    const temperatureFilter = options.temp || options.temperature;

    // By default, hide archived unless --all or --status archived
    if (!options.all && options.status !== 'archived') {
      threads = threads.filter(t => t.status !== 'archived');
    }

    // Apply filters
    if (options.status) {
      threads = threads.filter(t => t.status === options.status);
    }
    if (options.active) {
      threads = threads.filter(t => t.status === 'active');
    }
    if (temperatureFilter) {
      threads = threads.filter(t => t.temperature === temperatureFilter);
    }
    if (options.hot) {
      threads = threads.filter(t => t.temperature === 'hot');
    }
    if (options.size) {
      threads = threads.filter(t => t.size === options.size);
    }
    if (options.importance) {
      threads = threads.filter(t => t.importance >= options.importance);
    }
    if (options.group) {
      const groups = getAllGroups();
      const group = groups.find(g => g.name.toLowerCase() === options.group.toLowerCase());
      if (group) {
        threads = threads.filter(t => t.groupId === group.id);
      } else {
        console.log(chalk.yellow(`Group "${options.group}" not found`));
        return;
      }
    }
    // Coalesce --tag and --tags aliases
    const tagFilter = options.tag || options.tags;
    if (tagFilter) {
      const tagLower = tagFilter.toLowerCase();
      threads = threads.filter(t =>
        t.tags && t.tags.some(tag => tag.toLowerCase() === tagLower)
      );
    }

    if (threads.length === 0) {
      console.log(chalk.dim('No threads found matching criteria'));
      return;
    }

    // Sort: hot first, then by importance, then by updatedAt
    threads.sort((a, b) => {
      const tempOrder = ['hot', 'warm', 'tepid', 'cold', 'freezing', 'frozen'];
      const tempDiff = tempOrder.indexOf(a.temperature) - tempOrder.indexOf(b.temperature);
      if (tempDiff !== 0) return tempDiff;

      if (a.importance !== b.importance) return b.importance - a.importance;

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    console.log(chalk.bold(`\nThreads (${threads.length}):\n`));

    // Determine display mode: tree is default unless --flat is specified
    const useFlat = options.flat && !options.tree;

    if (useFlat) {
      // Flat list view (original behavior)
      threads.forEach(t => {
        console.log(formatThreadSummary(t));
        console.log('');
      });
    } else {
      // Tree view (default)
      const groups = getAllGroups();
      const containers = getAllContainers();
      // Filter containers by group if group filter is active
      let filteredContainers = containers;
      if (options.group) {
        const group = groups.find(g => g.name.toLowerCase() === options.group.toLowerCase());
        if (group) {
          filteredContainers = containers.filter(c => c.groupId === group.id);
        }
      }
      const tree = buildTree(threads, groups, filteredContainers);
      const lines = renderTree(tree);
      lines.forEach(line => console.log(line));
    }
  });
