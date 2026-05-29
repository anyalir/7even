# Requirements: 7even

**Defined:** 2026-05-29
**Core Value:** Every piece of work is tracked, estimated, measured, and visualized without leaving the repository or depending on external services.

## v1 Requirements

### Data Model & Storage

- [x] **DATA-01**: All work items stored as JSON files in `.7even/` directory
- [x] **DATA-02**: Status-based directory structure where file moves represent status changes
- [x] **DATA-03**: Every objective, key result, and task has a UUID
- [x] **DATA-04**: Maintained `index.json` mapping UUID → filesystem path, updated on every mutation
- [x] **DATA-05**: Objective schema: `objective.json` with status quo, constraints, functional/nonfunctional requirements, desired outcome, comments array
- [x] **DATA-06**: Key Result schema: `kr.json` with result measure, goal parameters, estimation history, comments array
- [x] **DATA-07**: Task schema: `<task-slug>.json` with assignee (git email + GitHub username), estimation history, comments array
- [x] **DATA-08**: No name duplication inside JSON files — filename is the canonical name
- [x] **DATA-09**: Index repair command that rebuilds `index.json` from filesystem scan

### OKR Lifecycle

- [x] **OKR-01**: Create, read, update objectives with statuses: proposed, accepted, achieved
- [x] **OKR-02**: Create, read, update key results with statuses: aspirational, achieved
- [x] **OKR-03**: Create, read, update tasks with statuses: to-do, in-progress, done
- [x] **OKR-04**: Assign tasks to git users (identified by email and GitHub username)
- [x] **OKR-05**: Guided OKR session: agent proposes key results from objective description, humans give feedback iteratively
- [x] **OKR-06**: MECE overlap checking when breaking objectives into key results
- [x] **OKR-07**: MECE overlap checking when breaking key results into tasks, against existing tasks
- [x] **OKR-08**: When all tasks for a KR are done, evaluate result measure against goal parameters
- [x] **OKR-09**: If result measure not met after task completion, trigger another round of task breakdown to close the gap
- [x] **OKR-10**: When result measure met, KR status → achieved
- [x] **OKR-11**: When all KRs of an objective achieved, objective status → achieved
- [x] **OKR-12**: Cross-reference between items via UUIDs

### Estimation & Metrics

- [x] **EST-01**: Initial story point estimation for tasks
- [x] **EST-02**: Non-destructive re-estimation history: array of `{date, spRemaining, estimator}` entries in task JSON
- [x] **EST-03**: Agent-suggested daily re-estimation of remaining complexity, human-approved
- [x] **EST-04**: Velocity calculation from completed story points and completion dates
- [x] **EST-05**: Burndown charts at KR level (aggregated from task SP history)
- [x] **EST-06**: Timeline projection: estimated ETA based on rolling velocity averages
- [x] **EST-07**: Gantt-chart-like view for objectives, key results, and tasks (auto-updated from estimates)
- [x] **EST-08**: Commit frequency and size metrics at task, KR, and objective level
- [x] **EST-09**: Weighted PR metrics at task, KR, and objective level

### CLI & Agent Interface

- [x] **CLI-01**: CLI binary invocable via `npx 7 <command>`
- [x] **CLI-02**: CRUD commands for objectives, key results, and tasks
- [x] **CLI-03**: Status transition commands (move items between statuses, triggering directory moves)
- [x] **CLI-04**: Git-based CAS concurrency: compare-and-swap on commits, retry on conflict
- [x] **CLI-05**: Commit reference convention: task UID included in commit description after a newline
- [x] **CLI-06**: OpenCode slash commands mirroring CLI functionality for agent interaction

### Dashboard

- [x] **DASH-01**: Local dev server (Vite-based) serving the dashboard
- [x] **DASH-02**: Kanban board view showing all objectives, key results, and tasks by status
- [x] **DASH-03**: LCARS-inspired pastel-on-dark design with rich, tasteful color palette
- [x] **DASH-04**: Color-coded remaining story point estimates in dashboard views
- [x] **DASH-05**: Burndown chart visualization at KR level
- [x] **DASH-06**: Velocity and ETA projection charts
- [x] **DASH-07**: Gantt-chart-like timeline view for O/KR/task hierarchy
- [x] **DASH-08**: Task detail view displaying inline comments and git commit messages/history
- [x] **DASH-09**: Commit frequency/size and weighted PR metric visualizations
- [x] **DASH-10**: Assignee view showing who is working on what

### Gamification

- [x] **GAME-01**: Badge system with visual display in dashboard
- [x] **GAME-02**: Achievement system triggered by work milestones and patterns
- [x] **GAME-03**: Pluggable architecture: users can define custom badges and achievements via configuration
- [x] **GAME-04**: Productivity game aesthetic throughout the dashboard UI

### Work Documentation

- [x] **DOC-01**: Inline comments in JSON files as array of `{author, date, text}` objects
- [x] **DOC-02**: Task detail view integrates git commit messages and git history for the task

## v2 Requirements

(None — full scope committed to v1)

## Out of Scope

| Feature | Reason |
|---------|--------|
| External tool integrations (Linear, Jira, etc.) | Core value is repo-local independence |
| Cloud hosting / SaaS dashboard | Dashboard runs locally only |
| User authentication system | Relies on git identity |
| Real-time collaboration / websockets | Git-based CAS handles concurrency |
| Mobile app | Desktop/browser only |
| Notifications / email | Work tracking is pull-based |
| Sprint/iteration management | Kanban continuous flow only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Complete |
| DATA-05 | Phase 1 | Complete |
| DATA-06 | Phase 1 | Complete |
| DATA-07 | Phase 1 | Complete |
| DATA-08 | Phase 1 | Complete |
| DATA-09 | Phase 1 | Complete |
| OKR-01 | Phase 1 | Complete |
| OKR-02 | Phase 1 | Complete |
| OKR-03 | Phase 1 | Complete |
| OKR-04 | Phase 1 | Complete |
| OKR-05 | Phase 2 | Complete |
| OKR-06 | Phase 2 | Complete |
| OKR-07 | Phase 2 | Complete |
| OKR-08 | Phase 2 | Complete |
| OKR-09 | Phase 2 | Complete |
| OKR-10 | Phase 2 | Complete |
| OKR-11 | Phase 2 | Complete |
| OKR-12 | Phase 1 | Complete |
| EST-01 | Phase 2 | Complete |
| EST-02 | Phase 2 | Complete |
| EST-03 | Phase 2 | Complete |
| EST-04 | Phase 3 | Complete |
| EST-05 | Phase 3 | Complete |
| EST-06 | Phase 3 | Complete |
| EST-07 | Phase 3 | Complete |
| EST-08 | Phase 3 | Complete |
| EST-09 | Phase 3 | Complete |
| CLI-01 | Phase 1 | Complete |
| CLI-02 | Phase 1 | Complete |
| CLI-03 | Phase 1 | Complete |
| CLI-04 | Phase 1 | Complete |
| CLI-05 | Phase 1 | Complete |
| CLI-06 | Phase 2 | Complete |
| DASH-01 | Phase 3 | Complete |
| DASH-02 | Phase 3 | Complete |
| DASH-03 | Phase 3 | Complete |
| DASH-04 | Phase 3 | Complete |
| DASH-05 | Phase 3 | Complete |
| DASH-06 | Phase 3 | Complete |
| DASH-07 | Phase 3 | Complete |
| DASH-08 | Phase 3 | Complete |
| DASH-09 | Phase 3 | Complete |
| DASH-10 | Phase 3 | Complete |
| GAME-01 | Phase 3 | Complete |
| GAME-02 | Phase 3 | Complete |
| GAME-03 | Phase 3 | Complete |
| GAME-04 | Phase 3 | Complete |
| DOC-01 | Phase 1 | Complete |
| DOC-02 | Phase 2 | Complete |

**Coverage:**
- v1 requirements: 47 total
- Mapped to phases: 47 ✓
- Unmapped: 0

---
*Requirements defined: 2026-05-29*
*Last updated: 2026-05-29 after initial definition*
