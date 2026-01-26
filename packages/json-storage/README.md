# @redjay/threads-json-storage

JSON file storage adapter for the Threads platform. Stores all data in a local JSON file.

## Installation

```bash
npm install @redjay/threads-json-storage
```

## Usage

```typescript
import { JsonStorageAdapter } from '@redjay/threads-json-storage';

const storage = new JsonStorageAdapter({
  filePath: '~/.threads/threads.json'
});

// Use storage adapter
const threads = await storage.getAllThreads();
```

## Features

- Local file-based storage
- Automatic backup before writes
- Human-readable JSON format
- No external dependencies

## Default Location

Data is stored at `~/.threads/threads.json` by default.

## License

MIT
