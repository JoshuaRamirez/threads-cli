# Threads Platform Architecture Snapshot

**Date:** 2026-01-20
**Status:** Planning / Vision Document

---

## Current State

### Published Packages
- `@joshua2048/threads-cli@1.1.0` on npm
- GitHub: https://github.com/JoshuaRamirez/threads-cli

### Current Architecture
```
threads-cli/
├── src/
│   ├── commands/     # CLI commands (Commander.js)
│   ├── models/       # TypeScript types
│   ├── storage/      # JSON file I/O (~/.threads/threads.json)
│   ├── config/       # CLI config
│   └── utils/        # Formatting (chalk)
└── dist/             # Compiled output
```

### Recent Changes (this session)
- Added `exports` field to package.json for library consumption
- Subpath exports: `@joshua2048/threads-cli/models`, `@joshua2048/threads-cli/storage`
- Enables dependent packages to import types and storage functions

---

## Future Vision

### Target Product
A **multi-tenant Threads platform** with:
1. Local CLI tool (current)
2. MCP server (local + hosted)
3. ChatGPT custom GPT integration (via OpenAI Actions API)
4. Web dashboard (future)

### Key Requirements
- Multi-tenancy with tenant isolation
- Multiple instances per tenant
- Schemaless/morphable data (like current JSON file)
- Real-time sync capability
- Firebase as backend platform

---

## Planned Architecture

### Monorepo Structure (Turborepo + pnpm)

```
threads/
├── turbo.json                    # Turborepo config
├── pnpm-workspace.yaml           # Workspace definition
├── tsconfig.base.json            # Shared TypeScript config
│
├── packages/
│   ├── core/                     # @joshua2048/threads-core
│   │   ├── package.json
│   │   └── src/
│   │       ├── models/           # Thread, Container, Group, types
│   │       ├── services/         # Pure domain logic
│   │       └── index.ts
│   │
│   ├── storage/                  # @joshua2048/threads-storage
│   │   ├── package.json
│   │   └── src/
│   │       ├── interface.ts      # IThreadStore contract
│   │       ├── json/             # JSON file adapter (local)
│   │       ├── firestore/        # Firestore adapter (hosted)
│   │       └── index.ts
│   │
│   ├── cli/                      # @joshua2048/threads-cli
│   │   ├── package.json
│   │   └── src/
│   │       ├── commands/         # CLI commands
│   │       └── index.ts          # Entry point
│   │
│   └── mcp-server/               # @joshua2048/threads-mcp
│       ├── package.json
│       └── src/
│           ├── tools/            # MCP tool definitions
│           ├── resources/        # MCP resources
│           └── index.ts
│
└── apps/
    └── firebase/                 # Firebase deployment
        ├── functions/            # Cloud Functions
        │   └── src/
        │       ├── mcp/          # Hosted MCP endpoints
        │       └── api/          # REST API for ChatGPT Actions
        ├── firestore.rules       # Security rules
        ├── firestore.indexes.json
        └── firebase.json
```

### Package Dependency Graph

```
                    ┌─────────────┐
                    │    core     │  (types, domain logic)
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌───────────┐
        │ storage │  │   cli   │  │mcp-server │
        └────┬────┘  └────┬────┘  └─────┬─────┘
             │            │             │
             │      ┌─────┴─────┐       │
             └─────►│  cli uses │◄──────┘
                    │  storage  │
                    └───────────┘
```

---

## Firebase Architecture

### Choice: Firestore
- Document database, schemaless
- Same mental model as current JSON file
- Native multi-tenancy via collection paths
- Real-time subscriptions for MCP
- Built-in auth, hosting, functions

### Data Model

**Option A: Collection per entity type**
```
tenants/
  {tenantId}/
    threads/{threadId}           # Thread document
    containers/{containerId}     # Container document
    groups/{groupId}             # Group document
    progress/{progressId}        # Progress entries (optional subcollection)
```

**Option B: Single document (mirrors JSON file)**
```
tenants/
  {tenantId}/
    data/main                    # { threads: [], containers: [], groups: [] }
```

**Recommendation:** Option A for scalability, with lazy loading.

### Security Rules (tenant isolation)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tenants/{tenantId}/{document=**} {
      allow read, write: if request.auth != null
        && request.auth.token.tenantId == tenantId;
    }
  }
}
```

### Auth Strategy
- Firebase Auth for user identity
- Custom claims for tenant membership
- API keys for ChatGPT Actions (stored in Firestore, validated in Functions)

---

## Storage Interface Contract

```typescript
// packages/storage/src/interface.ts

export interface IThreadStore {
  // Thread CRUD
  getAllThreads(): Promise<Thread[]>;
  getThreadById(id: string): Promise<Thread | undefined>;
  getThreadByName(name: string): Promise<Thread | undefined>;
  addThread(thread: Thread): Promise<void>;
  updateThread(id: string, updates: Partial<Thread>): Promise<void>;
  deleteThread(id: string): Promise<void>;

  // Container CRUD
  getAllContainers(): Promise<Container[]>;
  getContainerById(id: string): Promise<Container | undefined>;
  addContainer(container: Container): Promise<void>;
  updateContainer(id: string, updates: Partial<Container>): Promise<void>;
  deleteContainer(id: string): Promise<void>;

  // Group CRUD
  getAllGroups(): Promise<Group[]>;
  getGroupById(id: string): Promise<Group | undefined>;
  addGroup(group: Group): Promise<void>;
  updateGroup(id: string, updates: Partial<Group>): Promise<void>;
  deleteGroup(id: string): Promise<void>;

  // Utility
  getAllEntities(): Promise<Entity[]>;
  getEntityById(id: string): Promise<Entity | undefined>;

  // Backup (optional, adapter-specific)
  backup?(): Promise<void>;
  restore?(): Promise<void>;
}
```

**Adapters:**
- `JsonFileStore` — implements for local CLI (`~/.threads/threads.json`)
- `FirestoreStore` — implements for hosted service (tenant-scoped)

---

## ChatGPT Integration

### OpenAI Actions API
- Cloud Function HTTP endpoints
- OpenAPI spec for action definitions
- Bearer token auth (API key per ChatGPT GPT instance)

### Endpoints
```
POST /api/threads          # Create thread
GET  /api/threads          # List threads
GET  /api/threads/:id      # Get thread
PUT  /api/threads/:id      # Update thread
POST /api/threads/:id/progress  # Add progress
```

### Custom GPT Configuration
- Action schema points to Firebase Functions URL
- API key stored in GPT configuration
- System prompt instructs GPT on thread semantics

---

## Migration Path

### Phase 1: Monorepo Setup
1. Create new `threads` monorepo with Turborepo + pnpm
2. Move current `threads-cli` code into `packages/cli`
3. Extract `core` and `storage` packages
4. Ensure `@joshua2048/threads-cli` still publishes correctly

### Phase 2: Storage Abstraction
1. Define `IThreadStore` interface
2. Refactor current JSON storage as `JsonFileStore` adapter
3. Update CLI to use interface (dependency injection)
4. All tests pass with JSON adapter

### Phase 3: Firebase Setup
1. Create Firebase project
2. Implement `FirestoreStore` adapter
3. Set up auth and security rules
4. Deploy Cloud Functions skeleton

### Phase 4: MCP Server
1. Move/create `packages/mcp-server`
2. Use storage interface (configurable adapter)
3. Local mode: JSON adapter
4. Hosted mode: Firestore adapter

### Phase 5: ChatGPT Actions
1. Add REST API endpoints in Cloud Functions
2. Generate OpenAPI spec
3. Create custom GPT with actions
4. Test end-to-end

---

## Tooling Decisions

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Monorepo | Turborepo + pnpm | Build caching, strict deps, scales well |
| Database | Firestore | Schemaless, real-time, managed, auth included |
| Hosting | Firebase | Functions, Hosting, integrated with Firestore |
| Auth | Firebase Auth | Built-in, custom claims for tenants |
| TypeScript | Yes | Already using, type safety across packages |
| Testing | Jest | Already using, works with monorepo |

---

## Open Questions

1. **Package publishing strategy** — Publish all packages or just cli + mcp?
2. **Versioning** — Independent versions or lockstep?
3. **Local MCP vs hosted MCP** — Same package, different entry points?
4. **Firestore pricing model** — Reads/writes per operation, optimize?
5. **Offline support** — Firestore persistence for local-first?

---

## References

- Current repo: https://github.com/JoshuaRamirez/threads-cli
- npm: https://www.npmjs.com/package/@joshua2048/threads-cli
- Turborepo: https://turbo.build/repo
- Firebase: https://firebase.google.com/docs/firestore
- MCP Protocol: https://modelcontextprotocol.io
- OpenAI Actions: https://platform.openai.com/docs/actions
