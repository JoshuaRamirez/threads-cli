# threads-cli

A conversational thread tracker for managing streams of activity through self-reported progress. Unlike traditional task managers, Threads tracks momentum and context rather than deadlines.

## Installation

```bash
npm install -g @redjay/threads
# or
pnpm add -g @redjay/threads
```

Requires Node.js 20 or later.

## Packages

This monorepo contains the following packages:

| Package | Description |
|---------|-------------|
| [`@redjay/threads`](./packages/threads) | Main entry point (CLI + MCP server) |
| [`@redjay/threads-core`](./packages/core) | Core types and models |
| [`@redjay/threads-storage`](./packages/storage) | Storage interface definitions |
| [`@redjay/threads-json-storage`](./packages/json-storage) | JSON file storage adapter |
| [`@redjay/threads-firebase-storage`](./packages/firebase-storage) | Firebase Firestore adapter |
| [`@redjay/threads-cli`](./packages/cli) | CLI command implementations |
| [`@redjay/threads-mcp`](./packages/mcp-server) | MCP server for AI assistants |

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

## Core Concepts

- **Thread**: A stream of activity with status, temperature (momentum), size (scope), and importance
- **Progress**: Timestamped notes you report to yourself about a thread
- **Temperature**: Indicates momentum (frozen, freezing, cold, tepid, warm, hot)
- **Sub-threads**: Threads can spawn children for breaking down work
- **Groups**: Organizational containers for related threads
- **Dependencies**: Links between threads with why/what/how/when context

## Commands

### Thread Management

```bash
threads new <name>              # Create a new thread
threads show <name>             # Display thread details
threads set <name> <property>   # Update thread properties
threads spawn <parent> <child>  # Create sub-thread
threads archive <name>          # Archive a thread
threads clone <name>            # Duplicate a thread
threads merge <source> <target> # Merge threads
```

### Progress Tracking

```bash
threads progress <name> <note>  # Add progress entry
threads move-progress <s> <t>   # Move progress between threads
threads timeline         # View progress timeline
threads undo                    # Restore from backup
```

### Listing and Filtering

```bash
threads list                    # List all threads (tree view)
threads list --active           # Show only active threads
threads list --hot              # Show hot threads
threads list -g <group>         # Filter by group
threads list --tag <tag>        # Filter by tag
threads list --flat             # Flat list instead of tree
threads search <query>          # Search threads
```

### Organization

```bash
threads group new <name>        # Create a group
threads group add <thread> <g>  # Add thread to group
threads tag add <name> <tags>   # Add tags to thread
threads depend <from> <to>      # Create dependency
```

### Views

```bash
threads overview                # High-level summary
threads agenda                  # Prioritized view
threads next                    # Suggest next thread to work on
threads details <name>          # View/manage detail snapshots
```

### Batch Operations

```bash
threads batch set status=paused "Thread1" "Thread2"
threads batch tag add urgent "Thread1" "Thread2"
```

## Thread Properties

| Property    | Values                                          |
|-------------|-------------------------------------------------|
| status      | active, paused, stopped, completed, archived    |
| temperature | frozen, freezing, cold, tepid, warm, hot        |
| size        | tiny, small, medium, large, huge                |
| importance  | 1-5                                             |

## Data Storage

Data is stored locally at `~/.threads/threads.json`. This file is managed entirely by the CLI.

## Development

```bash
git clone https://github.com/JoshuaRamirez/threads-cli.git
cd threads-cli
pnpm install
pnpm run build
pnpm link --global  # Install locally for testing
```

### Scripts

```bash
pnpm run build      # Compile all packages
pnpm run dev        # Run directly via tsx
pnpm test           # Run all tests
pnpm run typecheck  # Type checking only
```

### Monorepo Tools

This project uses:
- **pnpm** for package management with workspaces
- **Turbo** for build orchestration
- **Changesets** for versioning and publishing

## License

MIT
