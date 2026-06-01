---
description: Pause current task work
---

# /7-pause

Pause the current in-progress task, recording state for later resumption.

## Context

```
`npx s7n task list --status in-progress`
```

```
`npx s7n task --help`
```

## Instructions

You are helping the user pause their current work cleanly.

**Important:** All IDs are UUIDs.

### If no argument provided:
1. Show in-progress tasks from context
2. If only one, confirm pause
3. If multiple, ask which to pause

### Pause flow:
1. Ask what's been completed so far
2. Ask what remains to be done
3. Record state as a comment on the task:
   ```
   npx s7n task comment <uuid> -m "PAUSE: Completed: [what done]. Remaining: [what left]."
   ```
4. Task stays in-progress (paused is a convention, not a status)

### Key rules:
- Always record what's done and what's left
- Don't move task out of in-progress
- Suggest running /7-proceed when ready to resume
