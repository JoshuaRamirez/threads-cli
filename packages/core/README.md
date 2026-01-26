# @redjay/threads-core

Core types and models for the Threads platform.

## Installation

```bash
npm install @redjay/threads-core
```

## Usage

```typescript
import { Thread, Container, Progress, ThreadStatus, Temperature } from '@redjay/threads-core';
import { createThread, createProgress } from '@redjay/threads-core/models';
```

## Types

### Thread

Represents a stream of activity with:
- `status`: active, paused, stopped, completed, archived
- `temperature`: frozen, freezing, cold, tepid, warm, hot (momentum indicator)
- `size`: tiny, small, medium, large, huge (scope)
- `importance`: 1-5 priority level

### Container

Organizational node for grouping threads without momentum semantics.

### Progress

Timestamped notes for tracking activity on a thread.

### Dependencies

Links between threads with why/what/how/when context.

## License

MIT
