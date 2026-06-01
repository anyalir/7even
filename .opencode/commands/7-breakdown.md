---
description: Break a key result into tasks with MECE validation
---

# /7-breakdown

Break a key result into implementable tasks with MECE validation.

## Context

```
`npx 7 task create --help`
```

```
`npx 7 key-result show $1`
```

```
`npx 7 objective list`
```

```
`npx 7 key-result list`
```

```
`npx 7 task list`
```

```
`npx 7 session list --status active`
```

## Instructions

You are a task decomposition facilitator. Your job is to break a key result into concrete, implementable tasks.

**Important:** All IDs in 7even are UUIDs or shortIds (e.g. O1KR2, O1KR2T3). Both are accepted by CLI commands.

### If no argument provided:
1. Show KRs that need breakdown (status: aspirational, no tasks yet)
2. Ask which KR to break down

### Starting breakdown:
1. Create session: `npx 7 session create kr-to-task <kr-uuid>`
2. Read the KR and its parent objective for full context
3. **Review ALL existing tasks across ALL KRs** (listed in context above)
4. Propose 3-5 tasks that collectively achieve the KR

### Task quality:
- Each task should be completable in one focused session
- Tasks must have clear acceptance criteria (defined later via /7-start-task)
- Estimate story points for each task (add after creation via `npx 7 estimate add <task-uuid> <points>`)

### Global MECE validation:
MECE checks must be **cross-checked against ALL existing tasks across ALL KRs and objectives**, not just the current KR:

1. **Mutually Exclusive (global):** Compare each proposed task against every existing task across all KRs. Flag if a proposed task overlaps with a task under a *different* KR — this indicates shared work that should be a single task under the most appropriate KR, or refactored into a shared subtask.
2. **Collectively Exhaustive (local):** The tasks under *this* KR should fully cover achieving it.
3. **Cross-KR dependencies:** If a proposed task depends on or duplicates work in another KR's tasks, explicitly call this out. Suggest whether to:
   - Move the existing task to be shared
   - Reference the dependency explicitly
   - Re-scope to avoid the overlap
4. Present a cross-reference table: each proposed task vs. potentially overlapping existing tasks (by shortId), with brief rationale.

### Creating tasks:
Once approved, create tasks via:
```
npx 7 task create -d "<description>" --parent <kr-uuid>
```

Then estimate each task:
```
npx 7 estimate add <task-uuid> <points>
```

### Recording dependencies:
After creating all tasks, record any identified dependencies between them. A dependency means task A must be completed before task B can start.

For each dependency:
```
npx 7 task depend <dependent-task-id> <dependency-task-id>
```

Dependencies can cross KR boundaries — if a task in this KR depends on a task in another KR, still record it. Use shortIds for clarity (e.g. `npx 7 task depend O1KR2T3 O1KR1T1`).

### Persisting MECE analysis as comments:
After MECE validation, add a comment to each newly created task summarizing the relevant MECE findings. This serves as execution context for whoever picks up the task.

For each task, add a comment noting:
- **Overlap risks**: which existing tasks (by shortId) overlap and how the boundary is drawn
- **Dependencies**: which tasks (by shortId) must come before/after and why
- **Scope boundary**: what is explicitly NOT in scope for this task (to prevent accidental duplication)

```
npx 7 task comment <task-id> --type agent -m "MECE: <overlap risks, dependencies, scope boundary>"
```

Keep comments concise (1-3 sentences). Example:
```
npx 7 task comment O1KR2T1 --type agent -m "MECE: Depends on O1KR1T2 (auth system). Boundary: this task handles data model only, NOT API endpoints (see O1KR2T2). No overlap with O2 tasks."
```
