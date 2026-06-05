---
name: GitHub sync workflow
description: How the user collaborates — edits on GitHub, pulls to Replit, agent integrates.
---

## Rule
When the user says "sudah pull" or similar, immediately run `git log --oneline -10`, check which files changed, read them, and verify everything is consistent with the rest of the workspace (imports, DataContext usage, CACHE_KEYS, etc.).

**Why:** The user maintains a GitHub repo and edits code there, then pulls into Replit. The agent must observe and integrate — not overwrite — those changes.

**How to apply:** On every session start or after a pull, check `git log` and diff against previous HEAD to understand what changed before making any edits.
