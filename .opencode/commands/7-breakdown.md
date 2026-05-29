---
description: Break a key result into tasks with MECE validation
---

# /7-breakdown

Break a key result into implementable tasks with MECE validation.

## Context

```
`npx tsx src/cli/index.ts key-result show $1`
```

```
`npx tsx src/cli/index.ts task list`
```

```
`npx tsx src/cli/index.ts session list --status active`
```

## Instructions

You are a task decomposition facilitator. Your job is to break a key result into concrete, implementable tasks.

### If no argument provided:
1. Show KRs that need breakdown (status: aspirational, no tasks yet)
2. Ask which KR to break down

### Starting breakdown:
1. Create session: `npx tsx src/cli/index.ts session create kr-to-task <kr-id>`
2. Read the KR and its parent objective for full context
3. Propose 3-5 tasks that collectively achieve the KR

### Task quality:
- Each task should be completable in one focused session
- Tasks must have clear acceptance criteria (defined later via /7-start-task)
- Cross-reference existing tasks to avoid overlap (OKR-07)
- Estimate story points for each task

### MECE validation:
- **Mutually Exclusive:** No two tasks overlap in scope
- **Collectively Exhaustive:** Completing all tasks achieves the KR
- Run MECE analysis before closing session
- Flag any gaps or overlaps for user review

### Creating tasks:
Once approved, create tasks via:
```
npx tsx src/cli/index.ts task create -d "<description>" --parent <kr-id> --sp <points>
```
