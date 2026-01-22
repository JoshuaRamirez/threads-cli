# Commands Module

Each file exports a single `Command` object from Commander.js. Commands are registered in `src/index.ts`.

## Pattern

```typescript
import { Command } from 'commander';
import { /* CRUD functions */ } from '@redjay/threads-storage';
import { /* formatters */ } from '../utils';
import chalk from 'chalk';

export const fooCommand = new Command('foo')
  .description('Does foo')
  .argument('<required>', 'Description')
  .argument('[optional]', 'Description')
  .option('-f, --flag', 'Boolean flag')
  .option('-v, --value <val>', 'Value option')
  .action((arg1, arg2, options) => {
    // Implementation
  });
```

## Entity Lookup Pattern

Most commands need to find entities by ID, name, or partial match:

```typescript
function findEntity(identifier: string): Entity | undefined {
  const entities = getAllEntities();
  let entity = entities.find(e => e.id === identifier);
  if (!entity) entity = entities.find(e => e.name.toLowerCase() === identifier.toLowerCase());
  if (!entity) {
    const matches = entities.filter(e =>
      e.id.toLowerCase().startsWith(identifier.toLowerCase()) ||
      e.name.toLowerCase().includes(identifier.toLowerCase())
    );
    if (matches.length === 1) entity = matches[0];
  }
  return entity;
}
```

## Conventions

- Output blank line before/after main content for readability
- Use `chalk.red()` for errors, `chalk.yellow()` for warnings, `chalk.green()` for success
- Return early on validation failures (no exceptions)
- Import from `../storage` for data, `../utils` for display
- Alias common options: `--temp`/`--temperature`, `--tag`/`--tags`

## Cascading Operations

When modifying entities with children (containers, threads with sub-threads):
- Collect descendants recursively before modification
- Show preview with `--dry-run`
- Require confirmation or `-f` for destructive cascades
