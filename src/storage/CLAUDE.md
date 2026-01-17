# Storage Module

JSON file I/O layer. All data lives in `~/.threads/threads.json`.

## Design

- **No caching**: Every read loads from disk, every write saves to disk
- **Auto-backup**: `saveData()` copies current file to `threads.backup.json` before writing
- **Migration**: `loadData()` adds missing fields (e.g., `containers` array) for backward compat

## CRUD Pattern

Each entity type (Thread, Container, Group) has:
- `getAll*()` - Returns array
- `get*ById(id)` - Returns entity or undefined
- `get*ByName(name)` - Case-insensitive lookup
- `add*(entity)` - Appends to array
- `update*(id, updates)` - Merges partial, sets `updatedAt`
- `delete*(id)` - Removes from array

## Entity Utilities

```typescript
getAllEntities()     // Threads + Containers combined
getEntityById(id)    // Looks up both types
getEntityByName(name)
isThread(entity)     // Type guard
isContainer(entity)  // Type guard
```

## Backup/Restore

```typescript
getBackupInfo()      // Check if backup exists, get stats
loadBackupData()     // Load backup without restoring
restoreFromBackup()  // Swaps current ↔ backup
```

## File Paths

- Data: `~/.threads/threads.json`
- Backup: `~/.threads/threads.backup.json`
- Config: `~/.threads/config.json` (handled by config module)
