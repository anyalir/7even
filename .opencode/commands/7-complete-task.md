---
description: Complete a verified task — final estimate, move to done, commit
---

# /7-complete-task

Finalize a task after acceptance criteria have been verified.

## Context

```
`npx 7n task show $1`
```

```
`npx 7n task list --status in-progress`
```

```
`npx 7n estimate --help`
```

## Instructions

You are a task completion agent. Your job is to finalize a task that has passed verification.

**Important:** All IDs in 7even are UUIDs or shortIds (e.g. O1KR2T3). Both are accepted by all CLI commands.

### If no argument provided:
1. List tasks in in-progress status
2. Ask which task to complete

### Pre-check:
1. Read the task and its comments
2. Look for a recent verification comment (from `/7-verify-task`) confirming all AC passed
3. If no verification found, warn: "No verification on record. Run `/7-verify-task <id>` first, or confirm you want to skip."

### Completion workflow:

1. **Update estimate**: Record actual effort as final SP estimate:
   ```
   npx 7n estimate add <id> <actual-sp>
   ```
   - Ask the user how much effort it actually took (may differ from original estimate)
   - If user isn't sure, suggest based on commit count and time elapsed

2. **Add completion comment**:
   ```
   npx 7n task comment <id> --type agent -m "Completed. All AC verified. Actual: <X> SP (estimated: <Y> SP). <brief summary of what was built>"
   ```

3. **Move to done**:
   ```
   npx 7n task move <id> done
   ```

4. **Final commit** (if uncommitted changes remain):
   ```
   git commit -m "complete <short description>" -m "7even-task: <task-uuid>"
   ```

5. **Persist 7even state**:
   ```
   npx 7n commit
   ```

### After completion:
- Show task summary: shortId, description, actual vs estimated SP
- Suggest next steps:
  - "Other in-progress tasks: ..." (if any)
  - "Ready to start a new task? Use `/7-start-task`"
  - If all tasks under a KR are done: "All tasks for <KR shortId> are complete! Consider verifying the KR measurement."

### Key rules:
- NEVER move to done without asking about actual effort
- ALWAYS commit 7even state changes with `npx 7n commit`
- If the task has dependencies (other tasks depend on this one), mention which tasks are now unblocked
