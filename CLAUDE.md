# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
npm run build          # Compile TypeScript to dist/
npm run dev -- <args>  # Run CLI directly via tsx (e.g., npm run dev -- list)
npm link               # Install 'threads' command globally
threads <command>      # Run installed CLI
npm test               # Run all tests
npm test -- store      # Run single test file
npm run typecheck      # Type checking only
```

## Architecture

Threads is a CLI tool for tracking streams of activity through self-reported progress rather than task management. Data is stored in `~/.threads/threads.json` and accessed only through the CLI.

### Philosophy

- **Self-reported progress over task management**: Users describe what they're doing, not what needs to be done
- **Temperature = momentum**: How actively you're working on something (hot = active focus, frozen = dormant)
- **Threads evolve**: Status, temperature, and details change as work progresses

### Core Concepts

- **Thread**: A stream of activity with status, temperature (momentum), size (scope), and importance
- **Container**: Organizational node without momentum semantics (pure hierarchy)
- **Progress**: Timestamped notes you report to yourself about a thread
- **Details**: Versioned snapshots of structured information about a thread (latest is current)
- **Sub-threads**: Threads can spawn children via `parentId`
- **Groups**: Organizational containers for threads
- **Dependencies**: Links between threads with why/what/how/when context

### Layer Structure

```
src/index.ts           # CLI entry point, registers all commands via Commander
src/commands/*.ts      # One file per command, each exports a Command object
src/storage/store.ts   # JSON file I/O, CRUD operations for threads, containers, groups
src/config/            # CLI configuration (labels, display settings)
src/models/types.ts    # All TypeScript types (Thread, Container, Group, enums)
src/utils/format.ts    # Console output formatting with chalk
```

### Data Flow

Commands import from `storage` for data operations and `utils` for display. Storage reads/writes `~/.threads/threads.json` on every operation (no in-memory caching). A backup is created before each write operation.

### Thread Properties

| Property | Values | Description |
|----------|--------|-------------|
| status | active, paused, stopped, completed, archived | Lifecycle state |
| temperature | frozen, freezing, cold, tepid, warm, hot | Momentum/recency indicator |
| size | tiny, small, medium, large, huge | Scope of work |
| importance | 1-5 | Priority level (5 = highest) |

### Adding New Commands

1. Create `src/commands/<name>.ts` exporting a `Command` object
2. Add export to `src/commands/index.ts`
3. Import and register in `src/index.ts` via `program.addCommand()`
4. Follow the Commander.js pattern: `.argument()` for positional args, `.option()` for flags

## CLI Usage Notes

### Shell Escaping
- `$` characters get interpreted by the shell. Use `USD` or escape: `\$36.72`
- Quotes in arguments need escaping or alternate quote styles

### Important: Use CLI Commands
**Always use CLI commands for data operations.** Do not manipulate `~/.threads/threads.json` directly. If a CLI operation is missing, implement it first.

### Known CLI Gaps
- `new` command lacks `--parent` option - must create then `set parent`
- Delete/edit progress entries - use `edit-progress` command
- Multiline content requires shell heredocs or escaping

### Data Structure Tips
- **Description**: Brief summary (single line preferred)
- **Details**: Structured info snapshot (multiline, replaced on update)
- **Progress**: Timestamped log entries (append-only via CLI)
- Sub-threads via `spawn` inherit parent's group but not tags

## Changelog Maintenance

**Keep `CHANGELOG.md` updated after commits.** This project uses Keep a Changelog format.

### Automated Support
- **Hook**: A hookify rule in `.claude/` reminds you after git commits
- **Command**: Run `/changelog` to auto-update from recent commits

### Manual Process
1. Add entries under `[Unreleased]` section
2. Group by: Added, Changed, Fixed, Removed, Security
3. Use format: `- **Feature** - description` for significant items
4. Move `[Unreleased]` to versioned section on release

### Commit Convention
| Prefix | Section |
|--------|---------|
| feat: | Added |
| fix: | Fixed |
| refactor: | Changed |
| docs: | (skip) |
| chore: | (skip) |

## Working Directory

Use relative paths from repo root when working with this codebase. Run commands from the repo directory.
