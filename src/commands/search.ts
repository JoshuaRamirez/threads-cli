import { Command } from 'commander';
import { getAllThreads } from '../storage';
import { Thread } from '../models';
import chalk from 'chalk';

export type SearchScope = 'name' | 'progress' | 'details' | 'tags' | 'all';

export interface SearchMatch {
  thread: Thread;
  matches: MatchContext[];
}

export interface MatchContext {
  scope: SearchScope;
  text: string;
  matchStart: number;
  matchEnd: number;
}

/**
 * Find all matches of a pattern in text, returning match contexts.
 */
export function findMatches(
  text: string,
  pattern: string,
  scope: SearchScope,
  caseSensitive: boolean
): MatchContext[] {
  const results: MatchContext[] = [];
  const searchText = caseSensitive ? text : text.toLowerCase();
  const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();

  let pos = 0;
  while (pos < searchText.length) {
    const idx = searchText.indexOf(searchPattern, pos);
    if (idx === -1) break;

    results.push({
      scope,
      text,
      matchStart: idx,
      matchEnd: idx + pattern.length
    });
    pos = idx + 1;
  }

  return results;
}

/**
 * Search a thread for matches in the specified scope.
 */
export function searchThread(
  thread: Thread,
  pattern: string,
  scope: SearchScope,
  caseSensitive: boolean
): MatchContext[] {
  const matches: MatchContext[] = [];

  // Search name
  if (scope === 'all' || scope === 'name') {
    matches.push(...findMatches(thread.name, pattern, 'name', caseSensitive));
  }

  // Search progress notes
  if (scope === 'all' || scope === 'progress') {
    for (const entry of thread.progress || []) {
      matches.push(...findMatches(entry.note, pattern, 'progress', caseSensitive));
    }
  }

  // Search details content
  if (scope === 'all' || scope === 'details') {
    for (const entry of thread.details || []) {
      matches.push(...findMatches(entry.content, pattern, 'details', caseSensitive));
    }
  }

  // Search tags
  if (scope === 'all' || scope === 'tags') {
    for (const tag of thread.tags || []) {
      matches.push(...findMatches(tag, pattern, 'tags', caseSensitive));
    }
  }

  return matches;
}

/**
 * Highlight a match within text, showing context around it.
 */
function formatMatchSnippet(ctx: MatchContext, maxLen: number = 80): string {
  const { text, matchStart, matchEnd } = ctx;
  const matchLen = matchEnd - matchStart;

  // Calculate context window
  const contextBefore = Math.floor((maxLen - matchLen) / 2);
  const contextAfter = maxLen - matchLen - contextBefore;

  let start = Math.max(0, matchStart - contextBefore);
  let end = Math.min(text.length, matchEnd + contextAfter);

  // Adjust to not cut words
  if (start > 0) {
    const spaceIdx = text.indexOf(' ', start);
    if (spaceIdx !== -1 && spaceIdx < matchStart) {
      start = spaceIdx + 1;
    }
  }
  if (end < text.length) {
    const spaceIdx = text.lastIndexOf(' ', end);
    if (spaceIdx !== -1 && spaceIdx > matchEnd) {
      end = spaceIdx;
    }
  }

  // Build snippet with highlighting
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';

  const beforeMatch = text.slice(start, matchStart);
  const match = text.slice(matchStart, matchEnd);
  const afterMatch = text.slice(matchEnd, end);

  // Replace newlines with visible marker for readability
  const clean = (s: string) => s.replace(/\n/g, ' ');

  return prefix + clean(beforeMatch) + chalk.bgYellow.black(clean(match)) + clean(afterMatch) + suffix;
}

/**
 * Format scope label with color.
 */
function formatScopeLabel(scope: SearchScope): string {
  switch (scope) {
    case 'name': return chalk.blue('name');
    case 'progress': return chalk.green('progress');
    case 'details': return chalk.magenta('details');
    case 'tags': return chalk.cyan('tags');
    default: return scope;
  }
}

export const searchCommand = new Command('search')
  .description('Search across threads for matching text')
  .argument('<query>', 'Text to search for')
  .option('--in <scope>', 'Limit search scope (name|progress|details|tags|all)', 'all')
  .option('-c, --case-sensitive', 'Perform case-sensitive search', false)
  .option('-l, --limit <n>', 'Limit number of results', parseInt)
  .action((query: string, options) => {
    const scope = options.in as SearchScope;
    const caseSensitive = options.caseSensitive;
    const limit = options.limit;

    // Validate scope
    const validScopes: SearchScope[] = ['name', 'progress', 'details', 'tags', 'all'];
    if (!validScopes.includes(scope)) {
      console.log(chalk.red(`Invalid scope "${scope}". Use: ${validScopes.join(', ')}`));
      return;
    }

    if (query.length < 2) {
      console.log(chalk.yellow('Search query must be at least 2 characters'));
      return;
    }

    const threads = getAllThreads();
    const results: SearchMatch[] = [];

    for (const thread of threads) {
      const matches = searchThread(thread, query, scope, caseSensitive);
      if (matches.length > 0) {
        results.push({ thread, matches });
      }
    }

    if (results.length === 0) {
      console.log(chalk.dim(`No matches found for "${query}"`));
      return;
    }

    // Sort by match count (most matches first)
    results.sort((a, b) => b.matches.length - a.matches.length);

    // Apply limit if specified
    const displayResults = limit ? results.slice(0, limit) : results;
    const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);

    console.log('');
    console.log(chalk.bold(`Found ${totalMatches} match${totalMatches === 1 ? '' : 'es'} in ${results.length} thread${results.length === 1 ? '' : 's'}:`));
    console.log('');

    for (const result of displayResults) {
      const { thread, matches } = result;
      const shortId = chalk.gray(`[${thread.id.slice(0, 8)}]`);

      console.log(`${chalk.bold(thread.name)} ${shortId}`);

      // Group matches by scope for cleaner display
      const byScope = new Map<SearchScope, MatchContext[]>();
      for (const m of matches) {
        if (!byScope.has(m.scope)) {
          byScope.set(m.scope, []);
        }
        byScope.get(m.scope)!.push(m);
      }

      // Show up to 3 snippets per thread
      let shown = 0;
      const maxSnippets = 3;

      for (const [matchScope, scopeMatches] of byScope) {
        if (shown >= maxSnippets) break;

        for (const m of scopeMatches) {
          if (shown >= maxSnippets) break;
          console.log(`  ${formatScopeLabel(matchScope)}: ${formatMatchSnippet(m)}`);
          shown++;
        }

        // Indicate more matches in this scope
        if (scopeMatches.length > 1 && shown < matches.length) {
          const remaining = scopeMatches.length - 1;
          if (remaining > 0 && shown >= maxSnippets) {
            console.log(chalk.dim(`  ... +${remaining} more in ${matchScope}`));
          }
        }
      }

      // Summary of total matches if more than shown
      if (matches.length > maxSnippets) {
        console.log(chalk.dim(`  (${matches.length} total matches)`));
      }

      console.log('');
    }

    if (limit && results.length > limit) {
      console.log(chalk.dim(`... ${results.length - limit} more threads with matches (use --limit to show more)`));
    }
  });
