# Architecture Review Findings

Findings from code review cycles (January 2026) that represent architectural decisions rather than bugs. These are documented for future consideration if requirements change.

## Storage Layer Concurrency

### JsonFileStore Race Conditions
**Confidence:** 95%

The `updateThread`, `deleteThread`, and similar methods have a race condition between `loadData()` and `saveData()`. If two processes call these methods simultaneously, the second operation overwrites the first.

```typescript
updateThread(id: string, updates: Partial<Thread>): boolean {
  const data = this.loadData();  // Both processes load same state
  // ... modify
  this.saveData(data);  // Second save overwrites first
  return true;
}
```

**Why Acceptable:** The CLI is designed for single-user operation. The CLAUDE.md explicitly states "no caching" as a design choice for simplicity.

**If Needed Later:**
- Implement file locking with `fs-ext` or `proper-lockfile`
- Switch to SQLite with built-in concurrency
- Add optimistic locking with version numbers

### Backup Inconsistency Under Concurrent Writes
**Confidence:** 85%

During simultaneous writes, the backup might be from Process A while the current file is from Process B, creating an inconsistent backup state.

**Why Acceptable:** Same rationale - single-user CLI design.

**If Needed Later:** Atomic file operations (write to temp, then rename).

---

## FirestoreStore Error Handling

### Error Swallowing Returns Empty Results
**Confidence:** 85%

All read operations catch errors and return empty arrays or `undefined`, making "not found" indistinguishable from "operation failed":

```typescript
async getThreadById(id: string): Promise<Thread | undefined> {
  try {
    const doc = await this.threadsCollection.doc(id).get();
    return doc.exists ? (doc.data() as Thread) : undefined;
  } catch (error) {
    console.error(`[FirestoreStore] getThreadById(${id}) failed:`, error);
    return undefined;  // Error looks like "not found"
  }
}
```

**Why Acceptable:** Defensive coding for ChatGPT Actions integration where graceful degradation is preferred over throwing. Errors are logged.

**If Needed Later:**
- Custom error types distinguishing NotFound vs OperationalError
- Let errors propagate to caller
- Add health check endpoint

### Unsafe Type Casting
**Confidence:** 82%

Firestore document data is cast directly to types (`as Thread`) without runtime validation.

```typescript
return snapshot.docs.map((doc) => doc.data() as Thread);  // No validation
```

**Why Acceptable:** Firestore data is only written by our code, and TypeScript provides compile-time safety.

**If Needed Later:**
- Add Zod schemas for runtime validation
- Implement type guards for critical fields
- Schema migration tooling

### Partial Update Corruption Risk
**Confidence:** 90%

The `update*` methods spread updates directly without validating field types, allowing potential document corruption if invalid data is passed.

**Why Acceptable:** TypeScript enforces `Partial<Thread>` at compile time. API layer validates before calling store.

**If Needed Later:** Runtime schema validation on updates.

---

## MCP Server Operations

### Cascade Archive Race Condition
**Confidence:** 95%

When archiving with `cascade=true`, multiple sequential `updateThread()` calls create the same race condition as the storage layer.

**Why Acceptable:** Inherits from storage layer design. Single-user CLI assumption.

### Progress Edit Concurrency
**Confidence:** 82%

Editing progress follows read-modify-write without protection. Between load and save, another client could modify the same entry.

**Why Acceptable:** MCP server typically has single active session. Progress entries are append-mostly.

**If Needed Later:** Optimistic locking with entry version numbers.

### Search Performance at Scale
**Confidence:** 80%

Every search loads all threads into memory, then filters. No pagination.

**Why Acceptable:** Target use case is personal productivity with hundreds, not thousands, of threads.

**If Needed Later:**
- Add `limit`/`offset` parameters
- Implement cursor-based pagination
- Consider indexing for large datasets

### Partial Failure in Group Deletion
**Confidence:** 90%

If unlinking members fails mid-loop, partial cleanup occurs but group deletion aborts, leaving inconsistent state.

**Why Acceptable:** Rare edge case. Console errors logged. Manual cleanup possible.

**If Needed Later:** Batch operations or transactional semantics.

---

## REST API Security

### API Key Timing Attack
**Confidence:** 85%

Early returns for invalid keys vs database lookups for valid keys create timing differences an attacker could measure.

**Why Acceptable:**
- Firebase Cloud Functions have network jitter
- API keys are SHA256 hashed (can't reverse from timing)
- Rate limiting at infrastructure level

**If Needed Later:** Constant-time comparison patterns.

### UUID Path Traversal
**Confidence:** 82%

UUID validation happens after path parsing. Sophisticated encodings might bypass checks.

**Why Acceptable:**
- Firestore sanitizes document IDs
- UUID regex rejects `/` and `..`
- Defense in depth at multiple layers

**If Needed Later:** Explicit path traversal checks before UUID validation.

---

## Summary

| Category | Count | Risk Level |
|----------|-------|------------|
| Concurrency | 4 | Low (single-user design) |
| Error Handling | 2 | Low (graceful degradation) |
| Type Safety | 2 | Low (TypeScript + API validation) |
| Security | 2 | Low (infrastructure mitigations) |
| Performance | 1 | Low (target scale) |
| Data Consistency | 1 | Low (rare edge case) |

These findings are architectural trade-offs appropriate for the current use case (personal productivity CLI + ChatGPT integration). Revisit if:
- Multi-user or concurrent access becomes a requirement
- Dataset size exceeds ~1000 threads
- Security requirements increase (enterprise deployment)
