# Utils Module

Console output formatting with chalk. No data operations.

## Formatters

| Function | Purpose |
|----------|---------|
| `formatStatus(status)` | Colored uppercase status |
| `formatTemperature(temp)` | Colored temperature label |
| `formatSize(size)` | Plain size label |
| `formatImportance(imp)` | `[*][*][*][ ][ ]` style |
| `formatImportanceStars(imp)` | `★★★☆☆` style |
| `formatTags(tags)` | Cyan `#tag` format |
| `formatThreadSummary(thread)` | Multi-line summary |
| `formatThreadDetail(thread)` | Full detail view |
| `formatContainerDetail(container)` | Full container view |
| `formatThreadTreeLine(thread)` | Single-line for tree |
| `formatContainerTreeLine(container)` | Single-line for tree |
| `formatGroupHeader(group)` | Group header with icon |

## Tree Rendering

```typescript
buildTree(threads, groups, containers)  // Returns TreeNode[]
renderTree(nodes)                       // Returns string[]
```

Tree uses Unicode box-drawing: `├── `, `└── `, `│   `

## Type Guards

```typescript
isThread(entity)    // entity is Thread
isContainer(entity) // entity is Container
```

## Color Scheme

- Status: green=active, yellow=paused, red=stopped, blue=completed, gray=archived
- Temperature: gradient from blueBright (frozen) to red (hot)
- Containers: magenta
- Tags: cyan
