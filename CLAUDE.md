# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
pnpm install                                    # Install all workspace dependencies
pnpm run build                                  # Build all packages (via Turbo)
pnpm run test                                   # Run all tests
pnpm run typecheck                              # Type-check all packages

# Package-specific
pnpm --filter @redjay/threads-cli test          # Test CLI package only
pnpm --filter @redjay/threads-cli test -- list  # Single test file
pnpm --filter @redjay/threads-cli run dev -- list  # Run CLI command directly via tsx

# Global install for testing
pnpm link --global --filter @redjay/threads    # Install 'threads' command globally
threads <command>                               # Run installed CLI
```

## Architecture

Threads is a CLI tool for tracking streams of activity through self-reported progress. Data is stored in `~/.threads/threads.json`.

### Philosophy

- **Self-reported progress over task management**: Users describe what they're doing, not what needs to be done
- **Temperature = momentum**: How actively you're working on something (hot = active focus, frozen = dormant)
- **Threads evolve**: Status, temperature, and details change as work progresses

### Core Concepts

- **Thread**: A stream of activity with status, temperature (momentum), size (scope), and importance
- **Container**: Organizational node without momentum semantics (pure hierarchy)
- **Progress**: Timestamped notes you report to yourself about a thread
- **Sub-threads**: Threads can spawn children via `parentId`
- **Groups**: Organizational containers for threads

### Monorepo Structure

```
packages/
├── threads/              # Entry point - wires CLI + storage by config
│   └── src/index.ts      # Creates StorageService, calls createCLI(), runs it
├── cli/                  # Command implementations
│   ├── src/commands/     # One file per command (exports Command object)
│   ├── src/context.ts    # DI container - getStorage() for commands
│   ├── src/factory.ts    # createCLI(storage) factory function
│   └── src/utils/        # Console output formatting with chalk
├── core/                 # Types only: Thread, Container, Group, enums
├── storage/              # Interfaces: IStorageClient, StorageService
├── json-storage/         # JSON file adapter (~/.threads/threads.json)
├── firebase-storage/     # Firebase Firestore adapter (optional)
└── mcp-server/           # MCP server for AI assistants
```

### Dependency Flow

```
@redjay/threads (entry point)
    ├── creates StorageService from json-storage
    ├── calls createCLI(storage) from cli/factory
    └── runs the Commander program

@redjay/threads-cli
    ├── factory.ts: createCLI() receives storage, calls initContext()
    ├── context.ts: stores storage instance, exposes getStorage()
    └── commands/*.ts: call getStorage() to access data
```

### Adding New Commands

1. Create `packages/cli/src/commands/<name>.ts` exporting a `Command` object
2. Add export to `packages/cli/src/commands/index.ts`
3. Import and register in `packages/cli/src/factory.ts` via `program.addCommand()`
4. Follow Commander.js pattern: `.argument()` for positional args, `.option()` for flags

### Thread Properties

| Property | Values | Description |
|----------|--------|-------------|
| status | active, paused, stopped, completed, archived | Lifecycle state |
| temperature | frozen, freezing, cold, tepid, warm, hot | Momentum/recency indicator |
| size | tiny, small, medium, large, huge | Scope of work |
| importance | 1-5 | Priority level (5 = highest) |

## MCP Server

The MCP server exposes threads data to AI assistants like Claude Desktop.

```bash
# Run directly
threads-mcp

# Claude Desktop config (~/.config/claude/claude_desktop_config.json)
{
  "mcpServers": {
    "threads": {
      "command": "threads-mcp"
    }
  }
}
```

## CLI Usage Notes

### Shell Escaping
- `$` characters get interpreted by the shell. Use `USD` or escape: `\$36.72`
- Quotes in arguments need escaping or alternate quote styles

### Important: Use CLI Commands
**Always use CLI commands for data operations.** Do not manipulate `~/.threads/threads.json` directly.

## Changelog Maintenance

**Keep `CHANGELOG.md` updated after commits.** Uses Keep a Changelog format.

- **Hook**: A hookify rule reminds you after git commits
- **Command**: Run `/changelog` to auto-update from recent commits

| Commit Prefix | Changelog Section |
|---------------|-------------------|
| feat: | Added |
| fix: | Fixed |
| refactor: | Changed |
| docs: | (skip) |
| chore: | (skip) |

## Monorepo Tools

- **pnpm**: Package manager with workspaces
- **Turbo**: Build orchestration (see `turbo.json`)
- **Changesets**: Versioning and npm publishing
