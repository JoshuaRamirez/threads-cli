# @redjay/threads-storage

Storage interface definitions for the Threads platform. This package defines the abstract storage layer that concrete implementations (JSON file, Firebase, etc.) must implement.

## Installation

```bash
npm install @redjay/threads-storage
```

## Usage

```typescript
import { StorageAdapter } from '@redjay/threads-storage';

// Implement the StorageAdapter interface for custom storage backends
class MyStorageAdapter implements StorageAdapter {
  // ... implementation
}
```

## Storage Implementations

| Package | Backend |
|---------|---------|
| `@redjay/threads-json-storage` | Local JSON file |
| `@redjay/threads-firebase-storage` | Firebase Firestore |

## Interface

The `StorageAdapter` interface provides methods for:
- Thread CRUD operations
- Container management
- Progress tracking
- Dependency management
- Backup and restore

## License

MIT
