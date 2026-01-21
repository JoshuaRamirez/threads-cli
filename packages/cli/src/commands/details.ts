import { Command } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import { getThreadById, getThreadByName, getAllThreads, updateThread } from '@joshua2048/threads-storage';
import { Thread, DetailsEntry } from '@joshua2048/threads-core';
import chalk from 'chalk';

// Helper to find a thread by identifier (ID, name, or partial match)
function findThread(identifier: string): Thread | undefined {
  // Try exact ID match first
  let thread = getThreadById(identifier);
  if (thread) return thread;

  // Try name match
  thread = getThreadByName(identifier);
  if (thread) return thread;

  // Try partial ID match
  const all = getAllThreads();
  const idMatches = all.filter(t => t.id.toLowerCase().startsWith(identifier.toLowerCase()));
  if (idMatches.length === 1) return idMatches[0];

  // Try partial name match as last resort
  const nameMatches = all.filter(t => t.name.toLowerCase().includes(identifier.toLowerCase()));
  if (nameMatches.length === 1) return nameMatches[0];

  return undefined;
}

// Show multiple matches to help user disambiguate
function showMultipleMatches(identifier: string): boolean {
  const all = getAllThreads();
  const idMatches = all.filter(t => t.id.toLowerCase().startsWith(identifier.toLowerCase()));
  if (idMatches.length > 1) {
    console.log(chalk.yellow(`Multiple threads match "${identifier}":`));
    idMatches.forEach(t => {
      console.log(`  ${t.id.slice(0, 8)} - ${t.name}`);
    });
    return true;
  }

  const nameMatches = all.filter(t => t.name.toLowerCase().includes(identifier.toLowerCase()));
  if (nameMatches.length > 1) {
    console.log(chalk.yellow(`Multiple threads match "${identifier}":`));
    nameMatches.forEach(t => {
      console.log(`  ${t.id.slice(0, 8)} - ${t.name}`);
    });
    return true;
  }

  return false;
}

// Format a timestamp for display
function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

export const detailsCommand = new Command('details')
  .description('View or update the details snapshot for a thread')
  .argument('<thread>', 'Thread name or ID')
  .argument('[content]', 'New details content (sets details directly)')
  .option('--set', 'Set/update details (reads from stdin if no content argument)')
  .option('--history', 'Show all detail versions')
  .action(async (threadIdentifier: string, contentArg: string | undefined, options) => {
    const thread = findThread(threadIdentifier);

    if (!thread) {
      if (!showMultipleMatches(threadIdentifier)) {
        console.log(chalk.red(`Thread "${threadIdentifier}" not found`));
      }
      return;
    }

    // Ensure thread has details array (backward compatibility for old data)
    const details = thread.details || [];

    // Show history
    if (options.history) {
      if (details.length === 0) {
        console.log(chalk.dim(`No details history for "${thread.name}"`));
        return;
      }

      console.log('');
      console.log(chalk.bold.underline(`Details History for "${thread.name}"`));
      console.log('');

      details.forEach((entry, index) => {
        const isCurrent = index === details.length - 1;
        const label = isCurrent ? chalk.green('[CURRENT]') : chalk.dim(`[v${index + 1}]`);
        console.log(`${label} ${chalk.dim(formatTimestamp(entry.timestamp))}`);
        // Indent each line of content
        entry.content.split('\n').forEach(line => {
          console.log(`  ${line}`);
        });
        console.log('');
      });
      return;
    }

    // Set details with content argument or --set flag
    if (contentArg !== undefined || options.set) {
      let newContent: string;

      if (contentArg !== undefined) {
        // Content provided as argument
        newContent = contentArg;
      } else {
        // Read from stdin
        console.log(chalk.dim('Enter details (Ctrl+D when done):'));
        const chunks: Buffer[] = [];
        for await (const chunk of process.stdin) {
          chunks.push(chunk);
        }
        newContent = Buffer.concat(chunks).toString('utf-8').trim();

        if (!newContent) {
          console.log(chalk.red('No content provided'));
          return;
        }
      }

      // Create new details entry
      const newEntry: DetailsEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        content: newContent
      };

      // Add to details array (keep history)
      const updatedDetails = [...details, newEntry];
      updateThread(thread.id, { details: updatedDetails });

      console.log(chalk.green(`\nDetails updated for "${thread.name}"\n`));
      return;
    }

    // Default: show current details (latest entry)
    if (details.length === 0) {
      console.log(chalk.dim(`No details set for "${thread.name}"`));
      console.log(chalk.dim(`Use: threads details "${thread.name}" "your details content"`));
      return;
    }

    const current = details[details.length - 1];
    console.log('');
    console.log(chalk.bold(`Details for "${thread.name}"`) + chalk.dim(` (updated ${formatTimestamp(current.timestamp)})`));
    console.log('');
    // Display content with indentation
    current.content.split('\n').forEach(line => {
      console.log(`  ${line}`);
    });
    console.log('');
  });
