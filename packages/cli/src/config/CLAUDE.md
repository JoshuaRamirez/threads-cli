# Config Module

User preferences stored in `~/.threads/config.json`. Separate from thread data.

## Structure

```typescript
interface ThreadsConfig {
  labels: NodeLabels;
}

interface NodeLabels {
  thread: string;     // e.g., "◆" or ""
  container: string;  // e.g., "📁" or ""
  group: string;      // e.g., "🏷️" or ""
}
```

## API

```typescript
loadConfig()              // Returns config with defaults merged
saveConfig(config)        // Writes full config
getLabel(nodeType)        // Get single label
setLabel(nodeType, value) // Set single label
resetLabels()             // Reset labels to defaults
resetConfig()             // Reset entire config
```

## Default Handling

- Missing config file returns defaults
- Partial config is merged with defaults via `mergeWithDefaults()`
- Corrupted JSON falls back to defaults (no crash)
