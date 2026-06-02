# 7even

![Fun will now commence](https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWU3OGJpb3FmZWlid3Q0YjBycWljamJiMHZ2OTYwZHdteXFpeDdmMyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/VhpuNI1KejNbBGXCxS/giphy.gif)

Repository-local, agentic-AI-enabled OKR issue tracker. All data lives as JSON files in `.7even/`, committed alongside your code. No external services, no accounts, no sync issues.

Built for AI-assisted development workflows. Works standalone via CLI, or with [OpenCode](https://opencode.ai) slash commands for guided OKR decomposition, task breakdown, and MECE validation.

## Install

```bash
npm install @anyalir/7even
```

## Quick Start

```bash
# Initialize in any git repo
npx s7n init

# after init, you can also call it as
npx 7

# Create an objective, then follow the prompts
/7-new-objective "Build a photo validation system for seasonal colour analysis"

# Or use the cli directly
npx s7n objective create -d "Build a photo validation system for seasonal colour analysis" \
  -s "Photo validation for colour analysis"

# Decompose into key results (agent-guided with OpenCode)
/7-okr-breakdown O1

# Or manually
npx s7n key-result create -d "Validation achieves ≥90% accuracy vs expert review" \
  -s "Photo quality validation at 90% accuracy" \
  --parent O1

# Break KRs into tasks
/7-breakdown O1KR1

# Or manually
npx s7n task create -d "Create 100-photo test set with expert labels" --parent O1KR1
npx s7n estimate add O1KR1T1 5

# Launch the dashboard
npx s7n dashboard

```
## Work Loop

```bash
# Pick a task and start. The agent will help you define acceptance criteria, assign to you, and move to in-progress. You can hand off implementation itself to a subagent if you like, or do it yourself
/7-start-task O1KR1T1

# Run acceptance criteria scripts, report pass/fail
/7-verify-task O1KR1T1

# Move to done, final commit
/7-complete-task O1KR1T1
```
```

## Concepts

### OKR Hierarchy

```
```
Objective (O1)
├── Key Result (O1KR1)
│   ├── Task (O1KR1T1)
│   ├── Task (O1KR1T2)
│   └── Task (O1KR1T3)
├── Key Result (O1KR2)
│   ├── Task (O1KR2T1)
│   └── Task (O1KR2T2)
└── Key Result (O1KR3)
    └──
```

**Objectives** define what you want to achieve. **Key Results** are measurable outcomes that prove the objective is met. **Tasks** are the concrete work items.

### Status Transitions (Automatic)

7even automatically transitions item statuses based on progress to reduce manual overhead:

#### Objectives
- **proposed → accepted**: When the first Key Result is created
- **accepted → achieved**: When all tasks under all Key Results are marked as `done`

#### Key Results
- **aspirational → achieved**: When all child tasks are `done` AND no measurement is defined
- If a KR has `structuredMeasurement` or `measureScript`, it stays `aspirational` until manually confirmed by a human (requires measurement validation)

#### Tasks
- **to-do → in-progress**: When a git commit references the task (format: `task: <uuid>` in commit message body)
- Run `npx s7n sync` to scan recent commits and auto-transition tasks
- **in-progress → done**: Always manual (requires human or agent confirmation)

You can still manually transition any item using the `move` command if needed.

### Short IDs

Every item gets a hierarchical short ID: `O1`, `O1KR1`, `O1KR1T1`. These are persistent (stored in JSON), globally unique within a project, and accepted by all CLI commands. Case-insensitive.

```bash
npx s7n task show O1KR1T1    # works
npx s7n task show o1kr1t1    # also works
npx s7n task show 01kr1t1    # helpful error: "Did you mean O1KR1T1? (letter O, not zero)"
```

### Data Storage

All data lives in `.7even/` as JSON files, organized by type and status:

```
.7even/
├── objective/
│   └── proposed/
│       └── 48c0264c-...json
├── key-result/
│   └── aspirational/
│       └── 0bab38aa-...json
├── task/
│   ├── to-do/
│   ├── in-progress/
│   └── done/
├── index.json
├── short-ids.json
└── counters.json
```

Commit `.7even/` to git. Your issue tracker travels with your code.

## CLI Reference

All commands follow a noun-verb pattern with short aliases.

### Objectives

```bash
npx s7n objective create -d "Description" -s "Short summary"
npx s7n objective list
npx s7n objective show O1
npx s7n objective comment O1 -m "Some note" --type agent

# Aliases
npx s7n o create ...
npx s7n o list
```

### Key Results

```bash
npx s7n key-result create -d "Measurable outcome description" \
  -s "5-10 word summary" --parent O1
npx s7n key-result list
npx s7n key-result show O1KR1
npx s7n key-result comment O1KR1 -m "Adjacent to O1KR2" --type agent

# Aliases
npx s7n kr create ...
```

### Tasks

```bash
npx s7n task create -d "Concrete work item" --parent O1KR1
npx s7n task list
npx s7n task list --status to-do
npx s7n task show O1KR1T1
npx s7n task move O1KR1T1 in-progress
npx s7n task move O1KR1T1 done
npx s7n task assign O1KR1T1 --email dev@example.com
npx s7n task comment O1KR1T1 -m "Progress update" --type agent

# Aliases
npx s7n t create ...
npx s7n t list
```

### Dependencies

Tasks can depend on other tasks. Dependencies are visible on the dashboard (Gantt arrows, blocked badges on Board) and enforced by the forecast engine for scheduling.

```bash
# T2 depends on T1 (T1 must finish before T2 can start)
npx s7n task depend O1KR1T2 O1KR1T1

# Remove a dependency
npx s7n task undepend O1KR1T2 O1KR1T1

# Dependencies can cross KR boundaries
npx s7n task depend O1KR2T1 O1KR1T3
```

### Estimation

Non-destructive estimation history. Re-estimate as you learn more.

```bash
npx s7n estimate add O1KR1T1 5          # Initial: 5 story points
npx s7n estimate add O1KR1T1 3          # Re-estimate: 3 SP remaining
npx s7n estimate show O1KR1T1           # Show history
```

### Other Commands

```bash
npx s7n commit                          # Commit .7even/ changes to git
npx s7n sync                            # Scan git commits and auto-transition tasks to in-progress
npx s7n repair-index                    # Rebuild index from filesystem
npx s7n evaluate O1KR1                  # Evaluate KR completion
npx s7n dashboard                       # Launch local dashboard
npx s7n config show                     # Show project configuration
npx s7n config set --team-size 3        # Set team size (default: 1)
npx s7n config set --initial-velocity 15  # Set initial velocity estimate (SP/week)
```

### Team Configuration

Configure team size and initial velocity for forecasting. Stored in `.7even/config.json`.

```bash
# Set team size (affects parallel task scheduling in forecasts)
npx s7n config set --team-size 3

# Set initial velocity estimate (used when no historical data exists)
npx s7n config set --initial-velocity 15

# Both at once
npx s7n config set --team-size 3 --initial-velocity 15

# View current config
npx s7n config show
```

Team size limits how many tasks run in parallel. With `--team-size 3`, the forecast schedules at most 3 tasks concurrently. Assigned tasks route to their person's slot; unassigned tasks fill the earliest-free slot.

## Dashboard

Local dashboard with timeline, board, achievements, and analytics views. Data is read directly from `.7even/` JSON files. No backend server or database required.

```bash
npx s7n dashboard                       # Opens at localhost:7777
npx s7n dashboard --port 8080           # Custom port
```

### Timeline

Gantt chart with expandable objective/KR/task hierarchy. Day/week/month granularity. Dependency arrows between tasks. Click a KR for inline burndown chart.

**Forecasting:** Non-done tasks show projected start/end dates as dashed, semi-transparent bars. The forecast engine builds a dependency DAG, topologically sorts tasks, then simulates scheduling across `teamSize` parallel slots. Assigned tasks route to their person's slot; unassigned tasks fill the earliest-free slot. Objective and KR bars automatically span from their earliest child's start to their latest child's end.

### Board

Kanban board organized by objective and KR. Three-column layout: TO DO, IN PROGRESS, DONE. Task cards show short IDs, SP estimates, assignee badges. Dependency indicators: blocked tasks show "BLOCKED BY O1KR1T2", resolved dependencies show "← O1KR1T2". Click any card for a detail panel with comments, estimation history, and acceptance criteria.

Switch to assignee view to see tasks grouped by person.

### Achievements

Badge system with 7 built-in badges. Custom badges via `.7even/badges/custom/`. Achievement timeline and hall of fame.

### Analytics

Burndown charts (per KR or objective), velocity tracking with rolling average and per-person normalization, ETA projection with confidence levels (low/medium/high based on data volume). Commit frequency metrics. All charts interactive with Recharts.

Velocity is displayed as both team total and per-person (dashed line). ETA uses the forecast engine when team configuration is set, falling back to `initialVelocity` when no historical data exists.

## OpenCode Integration

7even ships with slash commands for [OpenCode](https://opencode.ai). Running `npx s7n init` symlinks them into `.opencode/commands/`.

### Workflow: New Project

```
/7-new-objective          Create an objective with summary
/7-okr-breakdown O1       Decompose objective into key results (MECE validated)
/7-breakdown O1KR1        Break KR into tasks (MECE validated, dependencies recorded)
```

The MECE analysis checks every proposed item against all existing items across the entire project. Overlaps, dependencies, and scope boundaries are recorded as comments on each item.

### Workflow: Task Execution

```
/7-start-task O1KR1T1     Define acceptance criteria, assign, move to in-progress
                          (implement the task)
/7-verify-task O1KR1T1    Run acceptance criteria scripts, report pass/fail
/7-complete-task O1KR1T1  Record actual SP, move to done, final commit
```

### Commit Format

During task work, commits reference the task UUID in the body (not the subject line):

```
git commit -m "implement photo validation scoring engine" \
           -m "7even-task: 84f8d63b-0fb2-492a-bbd5-59f024cbdf7a"
```

### All Slash Commands

| Command | Purpose |
|---------|---------|
| `/7-new-objective` | Create objective with guided summary |
| `/7-new-kr` | Create key result with summary and measurement |
| `/7-okr-breakdown` | Decompose objective → key results with MECE |
| `/7-breakdown` | Decompose KR → tasks with MECE and dependencies |
| `/7-start-task` | Define acceptance criteria, assign, start |
| `/7-verify-task` | Run AC scripts, report results |
| `/7-complete-task` | Finalize task, record effort, commit |
| `/7-evaluate` | Evaluate KR/objective completion |
| `/7-pause` | Pause current work with context |
| `/7-proceed` | Resume paused work |
| `/7-finish` | Wrap up a session |

## Example: Real Project

From a fictional seasonal colour analysis app.

```
$ npx s7n objective list
● O1  OBJ proposed  Photo validation for seasonal colour analysis
● O2  OBJ proposed  Colour season analysis with modification guidance
● O3  OBJ proposed  Seasonal product recommendations with affiliate monetization

$ npx s7n key-result list
● O1KR1  KR aspirational  Photo quality validation at 90% accuracy
● O1KR2  KR aspirational  All rejections include specific guidance
● O1KR3  KR aspirational  80% complete valid photo set in 3 attempts
● O2KR1  KR aspirational  85% accuracy on synthetic set, consistent classifications
● O2KR2  KR aspirational  Ambiguous cases show 2 seasons with modification paths
● O2KR3  KR aspirational  10 real transformations validate modification advice
● O3KR1  KR aspirational  3 affiliate partners with conversion tracking
● O3KR2  KR aspirational  20 personalized recommendations in 5s
● O3KR3  KR aspirational  Product catalog with 200 seasonally tagged items

$ npx s7n task show O1KR1T1
● O1KR1T1 Create 100-photo test set with expert labels [in-progress]
  ID: 84f8d63b-0fb2-492a-bbd5-59f024cbdf7a
  Assignee: anya@lean.tech
  Estimates:
    2026-06-01 — 5 SP by Anya Livia Rudolph
  Comments:
    [agent] MECE: No overlap with O2KR1T1 (season classification test set -
    different purpose). Scope: photo quality labels only, NOT season labels.
    No dependencies.
```

## Design Decisions

- **JSON files, not a database.** Git is the sync layer. Merge conflicts are rare (items are separate files) and resolvable.
- **Short IDs are persisted, not computed.** `O1KR1T1` is stored in the JSON file, not derived at runtime. This means IDs are stable even if items are reordered.
- **Non-destructive estimation.** Every estimate is appended to history. You can see how estimates evolved over time. The dashboard uses the latest `.spRemaining` value.
- **MECE is global.** When decomposing, every proposed item is cross-checked against the entire project — not just the current parent. This catches overlaps between objectives.
- **Agent comments are labeled.** The `--type agent` flag on comments distinguishes human notes from AI-generated analysis. Both are valuable; knowing the source matters.
- **Dependencies cross KR boundaries.** A task under O1KR2 can depend on a task under O1KR1. The dependency graph is project-wide.
- **Forecast respects team capacity.** Team size limits parallel execution. Dependencies force linearity. Assigned tasks route to their person's slot. The result is a realistic schedule, not an optimistic one.

## Tech Stack

- **CLI:** Node.js, Commander.js, Chalk
- **Schemas:** Zod validation
- **Dashboard:** React 19, Vite 6, React Router 7, Recharts 2
- **API:** Hono (read-only, localhost)
- **Storage:** JSON files in `.7even/`, git for persistence
- **Forecasting:** DAG-based topological scheduling with team capacity constraints

## License

Apache 2.0
