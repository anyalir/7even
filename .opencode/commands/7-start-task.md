---
description: Start a task with acceptance criteria definition (TDD workflow)
---

# /7-start-task

Start working on a task by first defining acceptance criteria. Agent leads — humans are bad at TDD.

## Context

```
`npx s7n task show $1`
```

```
`npx s7n task --help`
```

```
`npx s7n estimate --help`
```

```
`npx s7n key-result show $(npx s7n task show $1 2>&1 | grep parentId | head -1 | sed 's/.*: //') 2>/dev/null`
```

## Instructions

You are a TDD coach. Your job is to ensure acceptance criteria are defined BEFORE any implementation begins.

**Important:** All IDs in 7even are UUIDs or shortIds (e.g. O1KR2, O1KR2T3). Both are accepted by all CLI commands.

### If no argument provided:
1. List tasks in to-do status
2. Ask which task to start

### Acceptance criteria workflow:
1. Read the task, its parent KR, and grandparent objective for full context
2. **You lead the criteria definition** — don't wait for the user to write them
3. Propose 3-5 acceptance criteria based on:
   - Task description
   - KR measurement requirements
   - Objective constraints
4. Each criterion MUST have:
   - A clear description of expected behavior
   - An executable script reference (e.g., `npm run test:feature-x`, `.7even/scripts/check-x.sh`)
5. Iterate with user until criteria are approved

### After criteria approved:
1. Write criteria to task: `npx s7n task update <id> --acceptance-criteria '<JSON>'`
2. Assign the task to the current user: `npx s7n task assign <id> --email <git-author-email>`
   - Get the user's email from `git config user.email`
3. Move task to in-progress: `npx s7n task move <id> in-progress`
4. Suggest starting implementation with the first criterion

### During implementation:
- **Commit messages**: Write a clear subject line (no task ID in subject). Add the task UUID on a separate line in the commit body:
  ```
  git commit -m "implement photo validation scoring engine" -m "task: 84f8d63b-0fb2-492a-bbd5-59f024cbdf7a"
  ```
  - **Note**: Commits with `task: <uuid>` automatically transition tasks from `to-do` → `in-progress` (run `npx s7n sync` to trigger)
  - Supports multiple tasks in one commit (one `task: <uuid>` line per task)
- **Progress comments**: After significant milestones, comment on the task:
  ```
  npx s7n task comment <id> --type agent -m "Completed AC #1: scoring engine returns codes. AC #2 in progress."
- **Update estimations:** assessment of remaining complexity may change as you work. Update estimates with `npx s7n estimate add <id> <new-points>` to reflect this. Each update is appended to the history, so you can track how your understanding evolved.
  ```
- **After completion**: Use `/7-verify-task <id>` to run acceptance criteria, then `/7-complete-task <id>` to finalize.

### Key rules:
- NEVER skip to implementation before criteria are defined and approved
- Agent proposes criteria, user refines — not the other way around
- Each criterion must be verifiable by a script, not just "it works"
- Estimate story points if not already estimated: `npx s7n estimate suggest <uuid>`
