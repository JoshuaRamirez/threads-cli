# Models Module

TypeScript type definitions only. No runtime code.

## Entity Hierarchy

```
Entity (union)
├── Thread    - Activity stream with momentum semantics
└── Container - Organizational node (pure hierarchy)

Group         - Cross-cutting organization (separate from hierarchy)
```

## Type Discrimination

- `Thread.type` is optional (backward compat), defaults to `'thread'`
- `Container.type` is always `'container'`
- Use `'temperature' in entity` to detect threads (more reliable than `type` field)

## Enums as Union Types

```typescript
ThreadStatus = 'active' | 'paused' | 'stopped' | 'completed' | 'archived'
Temperature  = 'frozen' | 'freezing' | 'cold' | 'tepid' | 'warm' | 'hot'
ThreadSize   = 'tiny' | 'small' | 'medium' | 'large' | 'huge'
Importance   = 1 | 2 | 3 | 4 | 5
```

## Nested Types

- `ProgressEntry` - Timestamped note (append-only log)
- `DetailsEntry` - Timestamped snapshot (versioned, latest is current)
- `Dependency` - Link with why/what/how/when context
