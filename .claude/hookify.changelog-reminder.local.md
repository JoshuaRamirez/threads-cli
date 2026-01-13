---
name: changelog-reminder
enabled: true
event: bash
pattern: git\s+commit
action: warn
---

**Changelog Reminder**

A commit was just made. Consider updating `CHANGELOG.md`:

1. Run `/changelog` to auto-update from recent commits
2. Or manually add entry under `[Unreleased]` section

Keep the changelog current for release tracking.
