# Git Hooks

This directory contains Git hooks that work in any environment (IDE, CLI, Claude Code).

## Setup (one-time)

After cloning, run:
```bash
git config core.hooksPath .githooks
```

## Hooks

| Hook | Purpose |
|------|---------|
| `post-commit` | Auto-updates `.claude/BRANCH_NOTES.md` after each commit |

## Notes

- Hooks only run on `claude/` branches by default
- Edit the hooks to change this behavior
- The notes file tracks all commits with author, timestamp, and files changed
