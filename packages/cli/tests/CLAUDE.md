# Tests Module

Jest tests with fs mocking for storage layer isolation.

## Run Commands

```bash
npm test              # All tests
npm test -- store     # Single file
npm test -- --watch   # Watch mode
```

## Pattern

```typescript
// Mock fs before imports
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  // ...
}));

import * as fs from 'fs';
const mockReadFileSync = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;

// Test fixture
function createMockThreadsData(overrides = {}): ThreadsData {
  return {
    threads: [],
    containers: [],
    groups: [],
    version: '1.0.0',
    ...overrides,
  };
}

describe('featureName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should do something', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify(createMockThreadsData()));
    // test logic
  });
});
```

## Coverage

Tests focus on:
- Storage CRUD operations
- Backup/restore logic
- Command-specific logic (clone, merge, search, etc.)

Commands are tested via their exported functions, not CLI parsing.
