import { Command } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import { Thread, Link, LinkType } from '@redjay/threads-core';
import { getStorage } from '../context';
import chalk from 'chalk';

const VALID_LINK_TYPES: LinkType[] = ['web', 'file', 'thread', 'custom'];

// Find thread by id, name, or partial match
function findThread(identifier: string): Thread | undefined {
  const storage = getStorage();
  let thread = storage.getThreadById(identifier);
  if (!thread) thread = storage.getThreadByName(identifier);
  if (!thread) {
    const all = storage.getAllThreads();
    const matches = all.filter(t =>
      t.id.toLowerCase().startsWith(identifier.toLowerCase()) ||
      t.name.toLowerCase().includes(identifier.toLowerCase())
    );
    if (matches.length === 1) thread = matches[0];
  }
  return thread;
}

// Format a single link for display
function formatLink(link: Link): string {
  const typeColor = {
    web: chalk.blue,
    file: chalk.green,
    thread: chalk.magenta,
    custom: chalk.yellow,
  };
  const colorFn = typeColor[link.type] || chalk.white;
  const labelPart = link.label ? chalk.bold(link.label) : link.uri;
  const typeBadge = colorFn(`[${link.type}]`);
  const lines = [`  ${typeBadge} ${labelPart}`];
  if (link.label) {
    lines.push(`    ${chalk.dim(link.uri)}`);
  }
  if (link.description) {
    lines.push(`    ${chalk.gray(link.description)}`);
  }
  lines.push(`    ${chalk.dim(`ID: ${link.id.slice(0, 8)} | Added: ${new Date(link.addedAt).toLocaleString()}`)}`);
  return lines.join('\n');
}

// Format all links for display
export function formatLinks(links: Link[]): string {
  if (!links || links.length === 0) {
    return chalk.dim('(no links)');
  }
  return links.map(formatLink).join('\n\n');
}

// Add subcommand
const addCommand = new Command('add')
  .description('Add a link to a thread')
  .argument('<thread>', 'Thread name or ID')
  .argument('<uri>', 'URI to link (URL, file path, thread ID, etc.)')
  .requiredOption('-t, --type <type>', `Link type: ${VALID_LINK_TYPES.join(', ')}`)
  .option('-l, --label <label>', 'Display label for the link')
  .option('-d, --description <desc>', 'Description of the link')
  .action((threadIdentifier: string, uri: string, options) => {
    const thread = findThread(threadIdentifier);
    if (!thread) {
      console.log(chalk.red(`Thread "${threadIdentifier}" not found`));
      return;
    }

    // Validate link type
    if (!VALID_LINK_TYPES.includes(options.type as LinkType)) {
      console.log(chalk.red(`Invalid link type. Use: ${VALID_LINK_TYPES.join(', ')}`));
      return;
    }

    // Check for duplicate URI
    const currentLinks: Link[] = thread.links || [];
    const existingLink = currentLinks.find(l => l.uri === uri);
    if (existingLink) {
      console.log(chalk.yellow(`\nLink with URI "${uri}" already exists on "${thread.name}"`));
      return;
    }

    // Create link
    const link: Link = {
      id: uuidv4(),
      uri,
      type: options.type as LinkType,
      label: options.label,
      description: options.description,
      addedAt: new Date().toISOString(),
    };

    // Update thread
    const storage = getStorage();
    const newLinks = [...currentLinks, link];
    storage.updateThread(thread.id, { links: newLinks });

    console.log(chalk.green(`\nAdded link to "${thread.name}":\n`));
    console.log(formatLink(link));
    console.log('');
  });

// Remove subcommand
const removeCommand = new Command('remove')
  .description('Remove a link from a thread')
  .argument('<thread>', 'Thread name or ID')
  .argument('<uri-or-id>', 'Link URI or ID to remove')
  .action((threadIdentifier: string, uriOrId: string) => {
    const thread = findThread(threadIdentifier);
    if (!thread) {
      console.log(chalk.red(`Thread "${threadIdentifier}" not found`));
      return;
    }

    const currentLinks: Link[] = thread.links || [];
    if (currentLinks.length === 0) {
      console.log(chalk.yellow(`\nNo links on "${thread.name}"`));
      return;
    }

    // Find link by URI or ID (full or partial)
    const linkIndex = currentLinks.findIndex(l =>
      l.uri === uriOrId ||
      l.id === uriOrId ||
      l.id.toLowerCase().startsWith(uriOrId.toLowerCase())
    );

    if (linkIndex === -1) {
      console.log(chalk.red(`Link "${uriOrId}" not found on "${thread.name}"`));
      return;
    }

    const removedLink = currentLinks[linkIndex];
    const newLinks = currentLinks.filter((_, i) => i !== linkIndex);

    const storage = getStorage();
    storage.updateThread(thread.id, { links: newLinks });

    console.log(chalk.green(`\nRemoved link from "${thread.name}":`));
    console.log(`  ${chalk.dim(removedLink.label || removedLink.uri)}`);
    console.log('');
  });

// List subcommand
const listCommand = new Command('list')
  .description('List all links on a thread')
  .argument('<thread>', 'Thread name or ID')
  .action((threadIdentifier: string) => {
    const thread = findThread(threadIdentifier);
    if (!thread) {
      console.log(chalk.red(`Thread "${threadIdentifier}" not found`));
      return;
    }

    const links: Link[] = thread.links || [];
    console.log(`\n${chalk.bold(thread.name)} - Links (${links.length}):\n`);
    console.log(formatLinks(links));
    console.log('');
  });

// Main link command with subcommands
export const linkCommand = new Command('link')
  .description('Manage links on a thread')
  .addCommand(addCommand)
  .addCommand(removeCommand)
  .addCommand(listCommand);
