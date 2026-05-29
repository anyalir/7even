---
description: Resume paused task work
---

# /7-proceed

Resume working on a paused or in-progress task.

## Context

```
`npx tsx src/cli/index.ts task show $1`
```

```
`npx tsx src/cli/index.ts estimate suggest $1`
```

## Instructions

You are helping the user resume work on a task.

### If no argument provided:
1. List in-progress tasks
2. Ask which to resume (or pick the most recently updated)

### Resume flow:
1. Load task context from above
2. Show acceptance criteria and progress:
   - Which criteria have been met?
   - Which remain?
3. Show re-estimation suggestion — has scope changed since last estimate?
4. If re-estimation needed: `npx tsx src/cli/index.ts estimate add <id> <sp>`
5. Pick up where the pause comment left off

### Key rules:
- Always show acceptance criteria status first
- Suggest re-estimation if task has been paused for a while
- Continue implementation from where it was paused
- Reference the PAUSE comment for context on what's left
