---
name: 7even
description: >
  Repository-local OKR issue tracker. Manages objectives, key results, and tasks as JSON
  files in .7even/. Use when user says "track this", "create a task", "add an objective",
  "break this down", "what's the status", "show my tasks", "estimate this", or mentions
  OKRs, sprint planning, task tracking, or issue management. Auto-triggers when .7even/
  directory exists in the project.
---

# 7even — OKR Issue Tracker Skill

Repository-local issue tracker with OKR hierarchy. All data as JSON in `.7even/`, committed to git.

## When to Use

- User wants to track work items, objectives, or tasks
- User asks about project status, progress, or what to work on next
- User says "break this down" or "decompose this"
- User mentions story points, estimation, or sprint planning
- `.7even/` directory exists in the project

## Core Commands

All commands accept UUIDs or short IDs (e.g. `O1`, `O1KR1`, `O1KR1T1`). Case-insensitive.

### Creating Items

```bash
npx s7n objective create -d "Description" -s "Short summary"
npx s7n key-result create -d "Measurable outcome" -s "Summary" --parent O1
npx s7n task create -d "Concrete work item" --parent O1KR1
```

### Viewing

```bash
npx s7n objective list          # All objectives
npx s7n key-result list         # All KRs
npx s7n task list               # All tasks
npx s7n task list --status to-do
npx s7n task show O1KR1T1       # Detail view
```

### Task Lifecycle

```bash
npx s7n task move O1KR1T1 in-progress
npx s7n task move O1KR1T1 done
npx s7n task assign O1KR1T1 --email dev@example.com
```

### Dependencies

```bash
npx s7n task depend O1KR1T2 O1KR1T1     # T2 depends on T1
npx s7n task undepend O1KR1T2 O1KR1T1   # Remove
```

### Estimation

```bash
npx s7n estimate add O1KR1T1 5          # 5 story points
npx s7n estimate show O1KR1T1           # History
```

### Comments

```bash
npx s7n task comment O1KR1T1 -m "Note" --type agent
npx s7n key-result comment O1KR1 -m "Note" --type agent
npx s7n objective comment O1 -m "Note" --type agent
```

Always use `--type agent` when adding comments as an AI agent.

### Persistence

```bash
npx s7n commit                          # Commit .7even/ to git
npx s7n repair-index                    # Rebuild index from filesystem
```

## Slash Commands (Preferred for Complex Workflows)

| Command | Use When |
|---------|----------|
| `/7-new-objective` | User wants to define a new goal |
| `/7-new-kr` | User wants to add a measurable outcome to an objective |
| `/7-okr-breakdown` | User wants to decompose an objective into KRs (MECE validated) |
| `/7-breakdown` | User wants to decompose a KR into tasks (MECE validated, dependencies) |
| `/7-start-task` | User is ready to work on a task (defines AC, assigns, starts) |
| `/7-verify-task` | User wants to check if acceptance criteria pass |
| `/7-complete-task` | User finished a task (record effort, move to done) |
| `/7-evaluate` | User wants to check if a KR or objective is achieved |

**Prefer slash commands over raw CLI** for decomposition and task lifecycle — they include MECE cross-checking, guided workflows, and automatic comment/dependency recording.

## Commit Format

When working on a task, include the task UUID in the commit body:

```bash
git commit -m "implement feature X" -m "7even-task: <task-uuid>"
```

Clean subject line. UUID on separate line in body. Never in subject.

## OKR Hierarchy

```
Objective (O1)           — What you want to achieve
├── Key Result (O1KR1)   — Measurable proof it's achieved
│   ├── Task (O1KR1T1)   — Concrete work item
│   └── Task (O1KR1T2)
└── Key Result (O1KR2)
    └── Task (O1KR2T1)
```

## Short ID Format

- Objectives: `O1`, `O2`, `O3`
- Key Results: `O1KR1`, `O1KR2`
- Tasks: `O1KR1T1`, `O1KR1T2`

Persistent, globally unique within project, case-insensitive.

## Key Behaviors

1. **MECE is global** — when proposing new KRs or tasks, cross-check against ALL existing items, not just the current parent
2. **Comments get typed** — always use `--type agent` so humans can distinguish AI notes
3. **Dependencies cross boundaries** — tasks can depend on tasks in other KRs
4. **Estimation is non-destructive and updated during task progress** — each estimate is appended to history. Estimations can go up, if complexity increases, but are expected to trend down as work progresses
5. **.7even/ dir is issue tracker only** — do not write project files there
6. **Dashboard at localhost:7777** — `npx s7n dashboard` for visual overview 
