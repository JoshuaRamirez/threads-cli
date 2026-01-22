import { Command } from 'commander';
import { getThreadById, getThreadByName, getAllThreads, updateThread } from 'threads-storage';
import { Thread } from 'threads-types';
import chalk from 'chalk';

// Find thread by id, name, or partial match
function findThread(identifier: string): Thread | undefined {
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

// Parse tags from multiple arguments (space-separated) or comma-separated strings
function parseTags(args: string[]): string[] {
  const tags: string[] = [];
  for (const arg of args) {
    // Split by comma and trim each tag
    const parts = arg.split(',').map(t => t.trim()).filter(t => t.length > 0);
    tags.push(...parts);
  }
  return tags;
}

// Format tags for display
function formatTags(tags: string[]): string {
  if (tags.length === 0) return chalk.dim('(no tags)');
  return tags.map(t => chalk.cyan(`#${t}`)).join(' ');
}

export const tagCommand = new Command('tag')
  .description('Manage tags on a thread')
  .argument('<thread>', 'Thread name or ID')
  .argument('[tags...]', 'Tags to add (space or comma separated)')
  .option('-r, --remove <tags...>', 'Remove specific tags')
  .option('-c, --clear', 'Remove all tags')
  .action((threadIdentifier: string, tagsArgs: string[], options) => {
    const thread = findThread(threadIdentifier);

    if (!thread) {
      console.log(chalk.red(`Thread "${threadIdentifier}" not found`));
      return;
    }

    // Ensure tags array exists (for older threads without tags)
    const currentTags: string[] = thread.tags || [];

    // Handle --clear option
    if (options.clear) {
      updateThread(thread.id, { tags: [] });
      console.log(chalk.green(`\nCleared all tags from "${thread.name}"`));
      return;
    }

    // Handle --remove option
    if (options.remove && options.remove.length > 0) {
      const tagsToRemove = parseTags(options.remove);
      const newTags = currentTags.filter(t => !tagsToRemove.includes(t));
      const removedCount = currentTags.length - newTags.length;

      if (removedCount === 0) {
        console.log(chalk.yellow(`\nNo matching tags found to remove from "${thread.name}"`));
        console.log(`Current tags: ${formatTags(currentTags)}`);
      } else {
        updateThread(thread.id, { tags: newTags });
        console.log(chalk.green(`\nRemoved ${removedCount} tag(s) from "${thread.name}"`));
        console.log(`Tags: ${formatTags(newTags)}`);
      }
      return;
    }

    // Handle adding tags (if provided)
    if (tagsArgs && tagsArgs.length > 0) {
      const tagsToAdd = parseTags(tagsArgs);
      // Add new tags, avoiding duplicates
      const newTags = [...currentTags];
      for (const tag of tagsToAdd) {
        if (!newTags.includes(tag)) {
          newTags.push(tag);
        }
      }

      const addedCount = newTags.length - currentTags.length;
      if (addedCount === 0) {
        console.log(chalk.yellow(`\nAll specified tags already exist on "${thread.name}"`));
        console.log(`Tags: ${formatTags(currentTags)}`);
      } else {
        updateThread(thread.id, { tags: newTags });
        console.log(chalk.green(`\nAdded ${addedCount} tag(s) to "${thread.name}"`));
        console.log(`Tags: ${formatTags(newTags)}`);
      }
      return;
    }

    // No options provided - just show current tags
    console.log(`\n${chalk.bold(thread.name)}`);
    console.log(`Tags: ${formatTags(currentTags)}`);
  });
