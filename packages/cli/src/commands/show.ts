import { Command } from 'commander';
import { formatThreadDetail, formatContainerDetail } from '../utils';
import { getStorage } from '../context';
import { Entity, Thread, Container } from '@redjay/threads-core';
import chalk from 'chalk';

function findEntity(identifier: string): Entity | undefined {
  const storage = getStorage();
  // Try exact ID match first (threads)
  let entity: Entity | undefined = storage.getThreadById(identifier);
  if (entity) return entity;

  // Try exact ID match (containers)
  entity = storage.getContainerById(identifier);
  if (entity) return entity;

  // Try name match (threads)
  entity = storage.getThreadByName(identifier);
  if (entity) return entity;

  // Try name match (containers)
  entity = storage.getContainerByName(identifier);
  if (entity) return entity;

  // Try partial ID match across all entities
  const allThreads = storage.getAllThreads();
  const allContainers = storage.getAllContainers();
  const all: Entity[] = [...allThreads, ...allContainers];

  const idMatches = all.filter(e => e.id.toLowerCase().startsWith(identifier.toLowerCase()));
  if (idMatches.length === 1) return idMatches[0];
  if (idMatches.length > 1) return undefined; // ambiguous

  // Try partial name match as last resort
  const nameMatches = all.filter(e => e.name.toLowerCase().includes(identifier.toLowerCase()));
  if (nameMatches.length === 1) return nameMatches[0];

  return undefined;
}

function findAllMatches(identifier: string): Entity[] {
  const storage = getStorage();
  const allThreads = storage.getAllThreads();
  const allContainers = storage.getAllContainers();
  const all: Entity[] = [...allThreads, ...allContainers];

  // Check ID matches first
  const idMatches = all.filter(e => e.id.toLowerCase().startsWith(identifier.toLowerCase()));
  if (idMatches.length > 0) return idMatches;

  // Then name matches
  return all.filter(e => e.name.toLowerCase().includes(identifier.toLowerCase()));
}

export const showCommand = new Command('show')
  .description('Show detailed information about a thread or container')
  .argument('<identifier>', 'Thread/container name or ID (partial match supported)')
  .option('-n, --progress-limit <n>', 'Number of progress entries to show (0 = all, default 5)', parseInt)
  .action((identifier: string, options) => {
    const entity = findEntity(identifier);

    if (!entity) {
      const matches = findAllMatches(identifier);
      if (matches.length > 1) {
        console.log(chalk.yellow(`Multiple entities match "${identifier}":`));
        matches.forEach(e => {
          const type = getStorage().isContainer(e) ? chalk.magenta('container') : chalk.green('thread');
          console.log(`  ${e.id.slice(0, 8)} - ${e.name} (${type})`);
        });
        return;
      }
      console.log(chalk.red(`"${identifier}" not found`));
      return;
    }

    console.log('');
    if (getStorage().isContainer(entity)) {
      console.log(formatContainerDetail(entity as Container));
    } else {
      const progressLimit = options.progressLimit !== undefined ? options.progressLimit : 5;
      console.log(formatThreadDetail(entity as Thread, progressLimit));
    }
    console.log('');
  });
