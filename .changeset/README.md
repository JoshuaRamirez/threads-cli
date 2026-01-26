# Changesets

This directory contains changeset files that document changes to packages in this monorepo.

## Usage

### Adding a changeset

When you make a change that should be released, run:

```bash
pnpm changeset
```

This will prompt you to:
1. Select which packages have changed
2. Choose the semver bump type (major/minor/patch)
3. Write a summary of the changes

### Versioning packages

To update package versions based on changesets:

```bash
pnpm changeset version
```

This will:
- Consume all changeset files
- Update package.json versions
- Update CHANGELOG.md files

### Publishing packages

To publish all packages with pending releases:

```bash
pnpm changeset publish
```

## Guidelines

- Create a changeset for any user-facing change
- Use `patch` for bug fixes
- Use `minor` for new features
- Use `major` for breaking changes
- Write clear, user-focused descriptions

## Automated Workflow

The publish workflow automatically:
1. Detects changesets on push to master
2. Creates a "Version Packages" PR when changesets exist
3. Publishes packages when that PR is merged
