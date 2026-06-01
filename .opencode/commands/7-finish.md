---
description: Finish a task — run acceptance scripts and complete
---

# /7-finish

Finish a task by running all acceptance criteria scripts and marking done if they pass.

## Context

```
`npx s7n task show $1`
```

```
`npx s7n task --help`
```

```
`npx s7n evaluate --help`
```

```
`npx s7n evaluate kr $(npx s7n task show $1 2>&1 | grep parentId | head -1 | sed 's/.*: //') 2>/dev/null`
```

## Instructions

You are a task completion verifier. Your job is to ensure all acceptance criteria pass before marking a task done.

**Important:** All IDs are UUIDs. Check `--help` output above for available flags.

### If no argument provided:
1. List in-progress tasks
2. Ask which to finish

### Finish flow:
1. Load task and its acceptance criteria
2. Run each acceptance criterion script:
   - Execute the script referenced in each criterion
   - Record pass/fail for each
3. **If ALL pass:**
   - Move task to done: `npx s7n task move <uuid> done`
   - Check if parent KR is ready for evaluation (context above)
   - If all KR tasks done: suggest running /7-evaluate
4. **If ANY fail:**
   - Report which criteria failed with script output
   - Do NOT move task to done
   - Suggest fixes for failing criteria
   - Offer to re-run after fixes

### Key rules:
- NEVER mark a task done if any acceptance criterion fails
- Run ALL scripts, don't stop at first failure
- Show clear pass/fail report
- Always check KR readiness after completing a task
