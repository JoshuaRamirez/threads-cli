---
description: Update CHANGELOG.md from recent git commits
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
---

# Changelog Update

Update `CHANGELOG.md` based on recent commits since the last documented version.

## Process

1. **Read current CHANGELOG.md** to find the last documented version
2. **Get commits since last version** using git log
3. **Categorize commits** by type (feat, fix, refactor, docs, chore, etc.)
4. **Update the [Unreleased] section** with new entries grouped by:
   - **Added** - new features (feat:)
   - **Changed** - changes to existing functionality (refactor:, change:)
   - **Fixed** - bug fixes (fix:)
   - **Removed** - removed features
   - **Security** - security fixes
   - **Documentation** - docs changes (docs:)

## Commit Convention Mapping

| Prefix | Changelog Section |
|--------|------------------|
| feat: | Added |
| fix: | Fixed |
| refactor: | Changed |
| perf: | Changed |
| docs: | (skip or Documentation) |
| chore: | (skip unless significant) |
| test: | (skip) |
| style: | (skip) |

## Output Format

Use Keep a Changelog format:
```markdown
## [Unreleased]

### Added
- **Feature name** - brief description

### Changed
- Description of change

### Fixed
- Bug fix description
```

## Execution

Run the analysis and update the changelog now.
