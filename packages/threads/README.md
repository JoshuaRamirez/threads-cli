# @redjay/threads

Entry point composition package for Threads CLI - wires together CLI, MCP server, and storage based on configuration.

## Installation

```bash
npm install -g @redjay/threads
# or
pnpm add -g @redjay/threads
```

Requires Node.js 20 or later.

## Executables

After installation, three commands are available:

| Command | Description |
|---------|-------------|
| `threads` | Main CLI for managing threads |
| `threads-mcp` | MCP server for Claude Code integration |
| `threads-migrate` | Migration utilities for data upgrades |

## Quick Start

```bash
# Create a new thread
threads new "API refactoring" -d "Modernize REST endpoints" -t hot -i 4

# List active threads
threads list --active

# Add progress to a thread
threads progress "API refactoring" "Completed authentication endpoints"

# View a specific thread
threads show "API refactoring"
```

## Storage Backends

By default, data is stored locally at `~/.threads/threads.json`. Firebase storage is available as an optional backend via `@redjay/threads-firebase-storage`.

## Related Packages

| Package | Description |
|---------|-------------|
| `@redjay/threads-core` | Core types and models |
| `@redjay/threads-storage` | Storage interface definitions |
| `@redjay/threads-json-storage` | JSON file storage adapter |
| `@redjay/threads-firebase-storage` | Firebase Firestore adapter |
| `@redjay/threads-cli` | CLI command implementations |
| `@redjay/threads-mcp` | MCP server implementation |

## License

MIT
