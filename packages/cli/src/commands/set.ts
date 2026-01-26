import { Command } from 'commander';
import { ThreadStatus, Temperature, ThreadSize, Importance, Entity } from '@redjay/threads-core';
import { formatStatus, formatTemperature, formatSize, formatImportance } from '../utils';
import { getStorage } from '../context';
import chalk from 'chalk';

const validStatuses: ThreadStatus[] = ['active', 'paused', 'stopped', 'completed', 'archived'];
const validTemps: Temperature[] = ['frozen', 'freezing', 'cold', 'tepid', 'warm', 'hot'];
const validSizes: ThreadSize[] = ['tiny', 'small', 'medium', 'large', 'huge'];

function findEntity(identifier: string): Entity | undefined {
  const storage = getStorage();
  const entities = storage.getAllEntities();
  let entity = entities.find(e => e.id === identifier);
  if (!entity) entity = entities.find(e => e.name.toLowerCase() === identifier.toLowerCase());
  if (!entity) {
    const matches = entities.filter(e =>
      e.id.toLowerCase().startsWith(identifier.toLowerCase()) ||
      e.name.toLowerCase().includes(identifier.toLowerCase())
    );
    if (matches.length === 1) entity = matches[0];
  }
  return entity;
}

// Thread-only properties
const threadOnlyProps = ['status', 'temperature', 'temp', 'size', 'importance', 'imp'];

export const setCommand = new Command('set')
  .description('Set a property on a thread or container')
  .argument('<identifier>', 'Thread or container name/ID')
  .argument('<property>', 'Property to set (status, temperature, size, importance, name, description, parent)')
  .argument('<value>', 'New value')
  .action((identifier: string, property: string, value: string) => {
    const storage = getStorage();
    const entity = findEntity(identifier);

    if (!entity) {
      console.log(chalk.red(`Entity "${identifier}" not found`));
      return;
    }

    const isContainer = storage.isContainer(entity);
    const prop = property.toLowerCase();

    // Check if trying to set thread-only property on container
    if (isContainer && threadOnlyProps.includes(prop)) {
      console.log(chalk.red(`Property "${property}" is only valid for threads, not containers`));
      return;
    }

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

      case 'parent':
        if (value.toLowerCase() === 'none' || value === '') {
          updates.parentId = null;
          displayValue = 'none';
        } else {
          const parentEntity = findEntity(value);
          if (!parentEntity) {
            console.log(chalk.red(`Parent "${value}" not found`));
            return;
          }
          if (parentEntity.id === entity.id) {
            console.log(chalk.red('Entity cannot be its own parent'));
            return;
          }
          updates.parentId = parentEntity.id;
          // Inherit group from parent if it has one
          if (parentEntity.groupId) {
            updates.groupId = parentEntity.groupId;
          }
          displayValue = parentEntity.name;
        }
        break;

      default:
        const validProps = isContainer
          ? 'name, description, parent'
          : 'status, temperature, size, importance, name, description, parent';
        console.log(chalk.red(`Unknown property "${property}". Use: ${validProps}`));
        return;
    }

    if (isContainer) {
      storage.updateContainer(entity.id, updates);
    } else {
      storage.updateThread(entity.id, updates);
    }

    console.log(chalk.green(`\nUpdated "${entity.name}":`));
    console.log(`  ${property} → ${displayValue}`);
    console.log('');
  });
