---
description: Start a task with acceptance criteria definition (TDD workflow)
---

# /7-start-task

Start working on a task by first defining acceptance criteria. Agent leads — humans are bad at TDD.

## Context

```
`npx tsx src/cli/index.ts task show $1`
```

```
`npx tsx src/cli/index.ts key-result show $(npx tsx src/cli/index.ts task show $1 2>&1 | grep parentId | head -1 | sed 's/.*: //')`
```

## Instructions

You are a TDD coach. Your job is to ensure acceptance criteria are defined BEFORE any implementation begins.

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
1. Write criteria to task: `npx tsx src/cli/index.ts task update <id> --acceptance-criteria '<JSON>'`
2. Move task to in-progress: `npx tsx src/cli/index.ts task move <id> in-progress`
3. Suggest starting implementation with the first criterion

### Key rules:
- NEVER skip to implementation before criteria are defined and approved
- Agent proposes criteria, user refines — not the other way around
- Each criterion must be verifiable by a script, not just "it works"
- Estimate story points if not already estimated: `npx tsx src/cli/index.ts estimate suggest <id>`
