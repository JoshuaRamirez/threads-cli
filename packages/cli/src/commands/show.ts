import { Command } from 'commander';
import { getThreadById, getThreadByName, getAllThreads, getContainerById, getContainerByName, getAllContainers, isContainer } from '@joshua2048/threads-storage';
import { formatThreadDetail, formatContainerDetail } from '../utils';
import { Entity, Thread, Container } from '@joshua2048/threads-core';
import chalk from 'chalk';

function findEntity(identifier: string): Entity | undefined {
  // Try exact ID match first (threads)
  let entity: Entity | undefined = getThreadById(identifier);
  if (entity) return entity;

  // Try exact ID match (containers)
  entity = getContainerById(identifier);
  if (entity) return entity;

  // Try name match (threads)
  entity = getThreadByName(identifier);
  if (entity) return entity;

  // Try name match (containers)
  entity = getContainerByName(identifier);
  if (entity) return entity;

  // Try partial ID match across all entities
  const allThreads = getAllThreads();
  const allContainers = getAllContainers();
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
  const allThreads = getAllThreads();
  const allContainers = getAllContainers();
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
  .action((identifier: string) => {
    const entity = findEntity(identifier);

    if (!entity) {
      const matches = findAllMatches(identifier);
      if (matches.length > 1) {
        console.log(chalk.yellow(`Multiple entities match "${identifier}":`));
        matches.forEach(e => {
          const type = isContainer(e) ? chalk.magenta('container') : chalk.green('thread');
          console.log(`  ${e.id.slice(0, 8)} - ${e.name} (${type})`);
        });
        return;
      }
      console.log(chalk.red(`"${identifier}" not found`));
      return;
    }

    console.log('');
    if (isContainer(entity)) {
      console.log(formatContainerDetail(entity as Container));
    } else {
      console.log(formatThreadDetail(entity as Thread));
    }
    console.log('');
  });
