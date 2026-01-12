# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
npm run build      # Compile TypeScript to dist/
npm run dev -- <args>  # Run CLI directly via tsx (e.g., npm run dev -- list)
npm link           # Install 'threads' command globally
threads <command>  # Run installed CLI
```

## Architecture

Threads is a CLI tool for tracking streams of activity through self-reported progress rather than task management. Data is stored in `~/.threads/threads.json` and accessed only through the CLI.

### Core Concepts

- **Thread**: A stream of activity with status, temperature (momentum), size (scope), and importance
- **Progress**: Timestamped notes you report to yourself about a thread
- **Sub-threads**: Threads can spawn children via `parentId`
- **Groups**: Organizational containers for threads
- **Dependencies**: Links between threads with why/what/how/when context

### Layer Structure

```
src/index.ts           # CLI entry point, registers all commands via Commander
src/commands/*.ts      # One file per command, each exports a Command object
src/storage/store.ts   # JSON file I/O, CRUD operations for threads and groups
src/models/types.ts    # All TypeScript types (Thread, Group, enums)
src/utils/format.ts    # Console output formatting with chalk
```

### Data Flow

Commands import from `storage` for data operations and `utils` for display. Storage reads/writes `~/.threads/threads.json` on every operation (no in-memory caching).

### Thread Properties

| Property | Values |
|----------|--------|
| status | active, paused, stopped, completed, archived |
| temperature | frozen, freezing, cold, tepid, warm, hot |
| size | tiny, small, medium, large, huge |
| importance | 1-5 |

### Adding New Commands

1. Create `src/commands/<name>.ts` exporting a `Command` object
2. Add export to `src/commands/index.ts`
3. Import and register in `src/index.ts` via `program.addCommand()`

## CLI Usage Notes

### Shell Escaping
- `$` characters get interpreted by the shell. Use `USD` or escape: `\$36.72`
- Quotes in arguments need escaping or alternate quote styles

### Multiline Content
Shell strips newlines from arguments. For multiline details, use node directly:
```javascript
node -e "
const { getAllThreads, updateThread } = require('./dist/storage');
const { v4: uuidv4 } = require('uuid');
const thread = getAllThreads().find(t => t.id.startsWith('PARTIAL_ID'));
thread.details = [{
  id: uuidv4(),
  timestamp: new Date().toISOString(),
  content: \`Line 1
Line 2
Line 3\`
}];
updateThread(thread.id, { details: thread.details });
"
```

### Missing CLI Operations
These require direct JSON editing or node scripts:
- **Delete progress entries**: No CLI command, clear via `thread.progress = []`
- **Edit existing progress/details**: No CLI command, modify array directly

### Data Structure Tips
- **Description**: Brief summary (single line preferred)
- **Details**: Structured info snapshot (multiline, replaced on update)
- **Progress**: Timestamped log entries (append-only via CLI)
- Sub-threads via `spawn` inherit parent's group but not tags

## Working Directory

Use relative paths from repo root when working with this codebase. Run commands from the repo directory.
