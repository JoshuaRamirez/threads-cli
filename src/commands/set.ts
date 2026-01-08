import { Command } from 'commander';
import { getThreadById, getThreadByName, getAllThreads, updateThread } from '../storage';
import { ThreadStatus, Temperature, ThreadSize, Importance } from '../models';
import { formatStatus, formatTemperature, formatSize, formatImportance } from '../utils';
import chalk from 'chalk';

const validStatuses: ThreadStatus[] = ['active', 'paused', 'stopped', 'completed', 'archived'];
const validTemps: Temperature[] = ['frozen', 'freezing', 'cold', 'tepid', 'warm', 'hot'];
const validSizes: ThreadSize[] = ['tiny', 'small', 'medium', 'large', 'huge'];

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

export const setCommand = new Command('set')
  .description('Set a property on a thread')
  .argument('<identifier>', 'Thread name or ID')
  .argument('<property>', 'Property to set (status, temperature, size, importance, name, description)')
  .argument('<value>', 'New value')
  .action((identifier: string, property: string, value: string) => {
    const thread = findThread(identifier);

    if (!thread) {
      console.log(chalk.red(`Thread "${identifier}" not found`));
      return;
    }

    const prop = property.toLowerCase();
    let updates: any = {};
    let displayValue: string = value;

    switch (prop) {
      case 'status':
        if (!validStatuses.includes(value as ThreadStatus)) {
          console.log(chalk.red(`Invalid status. Use: ${validStatuses.join(', ')}`));
          return;
        }
        updates.status = value;
        displayValue = formatStatus(value as ThreadStatus);
        break;

      case 'temperature':
      case 'temp':
        if (!validTemps.includes(value as Temperature)) {
          console.log(chalk.red(`Invalid temperature. Use: ${validTemps.join(', ')}`));
          return;
        }
        updates.temperature = value;
        displayValue = formatTemperature(value as Temperature);
        break;

      case 'size':
        if (!validSizes.includes(value as ThreadSize)) {
          console.log(chalk.red(`Invalid size. Use: ${validSizes.join(', ')}`));
          return;
        }
        updates.size = value;
        displayValue = formatSize(value as ThreadSize);
        break;

      case 'importance':
      case 'imp':
        const imp = parseInt(value);
        if (isNaN(imp) || imp < 1 || imp > 5) {
          console.log(chalk.red('Importance must be between 1 and 5'));
          return;
        }
        updates.importance = imp;
        displayValue = formatImportance(imp as Importance);
        break;

      case 'name':
        updates.name = value;
        break;

      case 'description':
      case 'desc':
        updates.description = value;
        break;

      default:
        console.log(chalk.red(`Unknown property "${property}". Use: status, temperature, size, importance, name, description`));
        return;
    }

    updateThread(thread.id, updates);

    console.log(chalk.green(`\nUpdated "${thread.name}":`));
    console.log(`  ${property} → ${displayValue}`);
    console.log('');
  });
