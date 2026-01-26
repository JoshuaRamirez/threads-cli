/**
 * CLI factory module.
 *
 * Creates a configured CLI program with dependency-injected storage.
 * This is the main entry point for creating the CLI programmatically.
 */

import { Command } from 'commander';
import { IFileThreadStore, StorageService } from '@redjay/threads-storage';
import { initContext } from './context';

// Import all commands
import { listCommand } from './commands/list';
import { newCommand } from './commands/new';
import { showCommand } from './commands/show';
import { progressCommand } from './commands/progress';
import { editProgressCommand } from './commands/edit-progress';
import { setCommand } from './commands/set';
import { spawnCommand } from './commands/spawn';
import { dependCommand } from './commands/depend';
import { groupCommand } from './commands/group';
import { archiveCommand } from './commands/archive';
import { moveProgressCommand } from './commands/move-progress';
import { overviewCommand } from './commands/overview';
import { detailsCommand } from './commands/details';
import { tagCommand } from './commands/tag';
import { batchCommand } from './commands/batch';
import { agendaCommand } from './commands/agenda';
import { cloneCommand } from './commands/clone';
import { timelineCommand } from './commands/timeline';
import { nextCommand } from './commands/next';
import { searchCommand } from './commands/search';
import { undoCommand } from './commands/undo';
import { mergeCommand } from './commands/merge';
import { configCommand } from './commands/config';
import { updateCommand } from './commands/update';
import { containerCommand } from './commands/container';

/**
 * Create a fully configured CLI program with the provided storage backend.
 *
 * @param store - The storage implementation to use (e.g., JsonFileStore)
 * @returns A configured Commander program ready to parse arguments
 */
export function createCLI(store: IFileThreadStore): Command {
  // Initialize the storage service and context
  const storage = new StorageService(store);
  initContext(storage);

  // Create the program
  const program = new Command();

  program
    .name('threads')
    .description('Conversational thread tracker for managing streams of activity')
    .version('1.1.0');

  // Register all commands
  program.addCommand(listCommand);
  program.addCommand(newCommand);
  program.addCommand(showCommand);
  program.addCommand(progressCommand);
  program.addCommand(editProgressCommand);
  program.addCommand(setCommand);
  program.addCommand(spawnCommand);
  program.addCommand(dependCommand);
  program.addCommand(groupCommand);
  program.addCommand(archiveCommand);
  program.addCommand(overviewCommand);
  program.addCommand(moveProgressCommand);
  program.addCommand(detailsCommand);
  program.addCommand(tagCommand);
  program.addCommand(batchCommand);
  program.addCommand(agendaCommand);
  program.addCommand(cloneCommand);
  program.addCommand(nextCommand);
  program.addCommand(timelineCommand);
  program.addCommand(searchCommand);
  program.addCommand(mergeCommand);
  program.addCommand(undoCommand);
  program.addCommand(configCommand);
  program.addCommand(updateCommand);
  program.addCommand(containerCommand);

  return program;
}
