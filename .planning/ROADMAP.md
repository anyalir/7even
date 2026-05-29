# Roadmap: 7even

## Overview

Build a repository-local issue tracker in three phases: first the data layer and CLI that stores/retrieves OKR work items as JSON files, then the agent-driven intelligence layer (guided sessions, MECE checking, lifecycle automation, estimation), then the LCARS dashboard with metrics visualization and gamification.

## Phases

- [ ] **Phase 1: Foundation** - Data model, JSON storage, CLI with CRUD and concurrency
- [ ] **Phase 2: Intelligence** - Guided OKR sessions, MECE checking, lifecycle automation, estimation
- [ ] **Phase 3: Dashboard & Gamification** - LCARS UI, kanban views, metrics charts, badges

## Phase Details

### Phase 1: Foundation
**Goal**: Users can create, read, update, and transition OKR work items via CLI, with all data persisted as JSON in `.7even/`
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09, CLI-01, CLI-02, CLI-03, CLI-04, CLI-05, OKR-01, OKR-02, OKR-03, OKR-04, OKR-12, DOC-01
**Success Criteria** (what must be TRUE):
  1. User can run `npx 7` and create an objective, key result, and task — each stored as JSON in the correct `.7even/` status directory
  2. User can transition a task from to-do → in-progress → done and the file physically moves between status directories
  3. `index.json` stays consistent after every mutation, and `npx 7 repair-index` rebuilds it from scratch
  4. Concurrent edits on the same item trigger CAS retry instead of silent data loss
  5. User can add inline comments to any work item and see them persisted in the JSON file
**Plans**: 2 plans
Plans:
- [ ] 01-01-PLAN.md — Core data layer: project setup, Zod schemas, storage engine, index manager, tests
- [ ] 01-02-PLAN.md — CLI layer: Commander.js commands for all CRUD, status transitions, commit, repair-index

### Phase 2: Intelligence
**Goal**: Agent can run guided OKR sessions that decompose objectives into KRs and tasks with MECE validation, and the system tracks estimation and lifecycle completion automatically
**Depends on**: Phase 1
**Requirements**: OKR-05, OKR-06, OKR-07, OKR-08, OKR-09, OKR-10, OKR-11, CLI-06, EST-01, EST-02, EST-03, DOC-02
**Success Criteria** (what must be TRUE):
  1. Agent can propose key results from an objective description, and user can accept/reject/modify them iteratively
  2. MECE overlap warnings surface when a proposed KR or task overlaps with existing items
  3. When all tasks for a KR are done, the system evaluates the result measure and either marks KR achieved or triggers another task breakdown round
  4. Tasks carry non-destructive re-estimation history and agent can suggest daily re-estimates for human approval
  5. OpenCode slash commands mirror full CLI functionality for agent-driven workflows
**Plans**: TBD

### Phase 3: Dashboard & Gamification
**Goal**: Users can launch a local dashboard that visualizes all OKR data with burndown charts, velocity metrics, Gantt views, and a gamified LCARS aesthetic
**Depends on**: Phase 2
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08, DASH-09, DASH-10, EST-04, EST-05, EST-06, EST-07, EST-08, EST-09, GAME-01, GAME-02, GAME-03, GAME-04
**Success Criteria** (what must be TRUE):
  1. User can run a local dev server and see a kanban board of all objectives, key results, and tasks organized by status
  2. Dashboard displays burndown charts at KR level, velocity/ETA projections, and Gantt-like timeline views
  3. Task detail view shows inline comments, git commit messages, and commit history for that task
  4. Badges and achievements appear in the dashboard, and users can define custom badges via configuration
  5. UI follows LCARS-inspired pastel-on-dark design with color-coded SP estimates and productivity game aesthetic
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/2 | Planning complete | - |
| 2. Intelligence | 0/? | Not started | - |
| 3. Dashboard & Gamification | 0/? | Not started | - |
