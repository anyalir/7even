---
description: Complete a verified task — final estimate, move to done, commit
---

# /7-complete-task

Finalize a task after acceptance criteria have been verified.

## Context

```
`npx s7n task show $1`
```

```
`npx s7n task list --status in-progress`
```

```
`npx s7n estimate --help`
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

1. **Update estimate**: Done tasks should have remaining estimate 0
   ```
   npx s7n estimate add <id> 0
   ```
   - Ask the user if there is any work left to do. If so, update the estimate to reflect remaining effort and DO NOT COMPLETE.

2. **Add completion comment**:
   ```
   npx s7n task comment <id> --type agent -m "Completed. All AC verified. <brief summary of what was built>"
   ```

3. **Move to done**:
   ```
   npx s7n task move <id> done
   ```

4. **Final commit** (if uncommitted changes remain):
   ```
   git commit -m "complete <short description>" -m "7even-task: <task-uuid>"
   ```

5. **Persist 7even state**:
   ```
   npx s7n commit
   ```

### After completion:
- Show task summary: shortId, description, actual vs estimated SP
- **Check for auto-transitions**: This task completion may have triggered:
  - Parent KR auto-achieving (if all KR tasks done + no measurement)
  - Parent objective auto-achieving (if all objective KRs achieved)
  - Mention any auto-transitions that occurred
- Suggest next steps:
  - "Other in-progress tasks: ..." (if any)
  - "Ready to start a new task? Use `/7-start-task`"
  - If all tasks under a KR are done AND KR has measurement: "All tasks for <KR shortId> complete! Run `/7-check-measurements` to validate."
  - If KR auto-achieved: "✓ <KR shortId> automatically achieved!"
  - If objective auto-achieved: "✓ <Objective shortId> automatically achieved!"

### Key rules:
- NEVER move to done without asking about actual effort
- ALWAYS commit 7even state changes with `npx s7n commit`
- After committing, check if parent KR or objective auto-transitioned
- If the task has dependencies (other tasks depend on this one), mention which tasks are now unblocked
