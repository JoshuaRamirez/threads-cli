# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **`--sort` option for list command** - sort by created, updated, name, temperature, or importance
- **`-r`/`--reverse` option for list command** - reverse sort order

## [1.2.0] - 2025-01-22

### Added
- **@redjay/threads-json-storage package** - extracted JsonFileStore implementation
- **@redjay/threads composition package** - entry point wiring CLI + storage based on config
- **Dependency injection in CLI** - StorageService, context module, createCLI() factory
- **Config-based storage selection** - supports json (default) and firebase backends

### Changed
- **@redjay/threads-storage** (v2.0.0) - now exports interfaces only (IStorageClient, IFileThreadStore, IAsyncThreadStore)
- **"Double inversion" pattern** - storage calls client callbacks instead of returning values
- **CLI commands** - all 26 commands now use getStorage() from context module
- **Test mocking pattern** - tests mock context module instead of storage exports

## [1.1.0] - 2025-01-17

### Added
- **`--parent` option for `new` command** - create sub-threads directly without using `spawn`
- **Comprehensive test coverage** - unit tests for 18 command modules (19% → 71% statements)
- **Per-module documentation** - CLAUDE.md files for commands, config, models, storage, utils, tests
- **Container entity type** - organizational nodes without momentum semantics
- **Config command** - `config show|get|set|reset` for customizing display labels
- **Update command** - modify thread properties (status, temperature, tags, etc.)
- **Changelog automation** - `/changelog` command and hookify integration
- **Cascading container delete** - `--cascade`, `--orphan`, `--move` options with `--dry-run` and `-f`
- **Archive cascade** - `--cascade` option to archive/restore sub-threads together
- **Focused list navigation** - `list <id>` for subtree, plus `--depth`, `--parent`, `--siblings`, `--path`
- Container CRUD operations and entity lookup functions in storage layer
- Configurable labels for thread/container/group display prefixes
- Container support in `show` command with detailed view
- Container support in tree display with magenta styling

### Fixed
- Container group changes now cascade to all descendants
- Group delete now ungroups both threads and containers
- `set parent` now supports containers as targets (not just threads)

### Changed
- **CLAUDE.md** - simplified documentation, added build/test commands
- `--temp` is now the short form for `--temperature` (aliased for consistency)
- `--tag` and `--tags` are now interchangeable across all commands
- Tree display now supports mixed thread/container hierarchies

## [1.0.0] - 2025-01-12

### Added
- **edit-progress command** - edit or delete existing progress entries
- **--at option** - custom timestamps for progress entries
- **--group option** - assign group on thread creation
- CLI usage notes for shell escaping workarounds

### Changed
- Package name reverted to unscoped `threads-cli`
- Dropped Node 18 support (EOL), now requires Node 20+

## [0.9.0] - 2025-01-11

### Added
- **batch command** - bulk operations on filtered thread sets
- **7 new commands** - complete, archive, pause, resume, stop, heat, cool
- CI/CD workflows for GitHub Actions
- npm publish configuration
- Comprehensive test coverage

### Fixed
- Incorrect command syntax in README

## [0.8.0] - 2025-01-10

### Added
- **Tags feature** - categorize threads with tags, filter by tag
- **Details feature** - versioned thread snapshots with timestamps
- **overview command** - quick summary of thread state
- **move-progress command** - relocate progress entries between threads
- Parent property support in set command

## [0.7.0] - 2025-01-09

### Added
- **Hierarchical tree view** - nested display of threads and sub-threads
- Group headers in list output
- Unicode box-drawing characters for tree structure

## [0.6.0] - 2025-01-08

Initial npm package release.

### Added
- Core thread tracking with status, temperature, size, importance
- Progress logging with timestamps
- Sub-thread spawning via parentId
- Group organization
- JSON storage in `~/.threads/threads.json`
- Commands: new, list, show, set, progress, spawn, group, groups, delete

[Unreleased]: https://github.com/JoshuaRamirez/threads-cli/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/JoshuaRamirez/threads-cli/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/JoshuaRamirez/threads-cli/compare/v0.9.0...v1.0.0
[0.9.0]: https://github.com/JoshuaRamirez/threads-cli/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/JoshuaRamirez/threads-cli/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/JoshuaRamirez/threads-cli/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/JoshuaRamirez/threads-cli/releases/tag/v0.6.0
