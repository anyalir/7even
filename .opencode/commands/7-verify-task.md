---
description: Verify a task's acceptance criteria pass before completion
---

# /7-verify-task

Run acceptance criteria for a task and report pass/fail status.

## Context

```
`npx 7even task show $1`
```

```
`npx 7even task list --status in-progress`
```

## Instructions

You are a verification agent. Your job is to run each acceptance criterion and report results.

**Important:** All IDs in 7even are UUIDs or shortIds (e.g. O1KR2T3). Both are accepted by all CLI commands.

### If no argument provided:
1. List tasks in in-progress status
2. Ask which task to verify

### Verification workflow:
1. Read the task and its acceptance criteria
2. For each criterion:
   - Run the referenced script/command
   - Record: PASS or FAIL with output summary
   - If FAIL: note what's missing or broken
3. Present a results table:
   ```
   AC #1: [description]     PASS
   AC #2: [description]     FAIL — [reason]
   AC #3: [description]     PASS
   ```

### After verification:
- **All PASS**: Comment results on the task, then ask: "All acceptance criteria pass. Ready to complete? Use `/7-complete-task <id>`"
- **Any FAIL**: Comment results on the task, list what needs fixing, suggest next steps for implementation

### Recording results:
```
npx 7even task comment <id> --type agent -m "Verification: 3/4 AC passed. FAIL: AC #2 — scoring threshold not met (82% vs 90% target)."
```

### Key rules:
- Run the ACTUAL scripts — don't just check if files exist
- Report exact output, not just pass/fail
- If a script doesn't exist yet, that's a FAIL — the script should have been created during implementation
- Never mark a task as done from this command — that's `/7-complete-task`'s job
