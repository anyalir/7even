# 7even

## What This Is

A repository-local, agentic-AI-enabled issue tracker distributed as an npm module. All work items — objectives, key results, and tasks — are stored as JSON files committed to a `.7even/` directory inside the project repository. It provides both a CLI (for humans and AI agents) and a locally-runnable dashboard with a gamified, LCARS-inspired dark UI. No external tools required — the repository is the single source of truth.

## Core Value

Every piece of work — from strategic objectives to individual tasks — is tracked, estimated, measured, and visualized without leaving the repository or depending on external services.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] OKR hierarchy: Objective → Key Result → Task, with status-based directory structure in `.7even/`
- [ ] JSON document storage with UUID-based identity and maintained index.json for UUID→path lookup
- [ ] Objectives with statuses: proposed, accepted, achieved — containing business/outcome-oriented descriptions, status quo, constraints, functional/nonfunctional requirements, desired outcome
- [ ] Key Results with statuses: aspirational, achieved — measurable, with explicit result measures agreed and documented; hybrid evaluation (automated where possible, manual fallback)
- [ ] Tasks with statuses: to-do, in-progress, done — assigned to git users (email + GitHub username)
- [ ] Kanban flow: in-planning → to-do → in-progress → done (no in-review phase; feedback creates new tasks)
- [ ] Guided OKR sessions: agent proposes KRs from objectives, humans give feedback; agent challenges overlaps, aims for MECE (mutually exclusive, collectively exhaustive)
- [ ] Agent-driven task breakdown from KRs with MECE overlap checking against existing tasks
- [ ] KR lifecycle: when all tasks done, result measure evaluated; if gap, another round of task breakdown; if met, KR → achieved; when all KRs achieved, Objective → achieved
- [ ] CLI binary (`npx 7 <command>`) for human interaction
- [ ] OpenCode slash commands for agent interaction
- [ ] Local dev server dashboard with kanban-style overview of all OKRs and tasks
- [ ] Git-based CAS (compare-and-swap) concurrency: retry on conflict
- [ ] Commit references: task UID in commit description (after newline, not polluting oneline history)
- [ ] Work documentation as inline comments in JSON files ({author, date, text} array)
- [ ] Task detail view showing git commit messages and git history
- [ ] Names not duplicated inside JSON files — file rename resolves merge conflicts, no drift
- [ ] Story point estimation: initial estimation, agent-suggested daily re-estimation, human-approved
- [ ] Non-destructive re-estimation history: {date, spRemaining, estimator} entries in task JSON
- [ ] Burndown charts at KR level
- [ ] Velocity calculation from SP estimates and completion dates
- [ ] Timeline projection: estimated ETA based on velocity averages
- [ ] Gantt-chart-like view for O/KR level and tasks (auto-updated from estimates)
- [ ] Commit frequency/size metrics at task, KR, and O level
- [ ] Weighted PR metrics at task, KR, and O level
- [ ] Dashboard color coding for remaining SP estimate
- [ ] LCARS-inspired pastel-on-dark design, sleek and modern, rich color palette
- [ ] Badges and achievements system (pluggable — users can define custom badges/achievements)
- [ ] Productivity game aesthetic throughout the dashboard
- [ ] npm module: installable to existing projects via `npm install 7even`

### Out of Scope

- External tool integrations (Linear, Jira, etc.) — the whole point is repo-local independence
- Cloud hosting or SaaS dashboard — dashboard runs locally only
- User authentication — relies on git identity
- Real-time collaboration — git-based CAS handles concurrency
- Mobile app — desktop/browser only
- Notifications/email — work tracking is pull-based

## Context

This project is inspired by the AI Agentic Vision adjunct to an enterprise SDLC (see `../sdlc/AI_Agentic_Vision.md`). Key concepts adopted:

- **OKR → KR → Task hierarchy** where humans operate at the intent/verification level and agents handle decomposition and execution (§2-§3 of the vision doc)
- **Plan-approve-execute-verify loop** adapted for individual contributors rather than enterprise teams
- **Git repository as system knowledge store** — structured data committed alongside code (§5.2)
- **Kanban continuous flow** rather than sprint-based cadence (§6.1)
- **MECE breakdown with conflict detection** — agents check for overlaps when decomposing work (Pattern 1)
- **Prototype-first approach** — build working things, measure, then refine

The departure from the vision doc: 7even eliminates external tooling dependencies (Linear, n8n, etc.). Everything lives in the repository. This makes it portable, zero-infrastructure, and suitable for solo developers, small teams, and open-source projects alike.

The directory structure mirrors work item status:
```
.7even/
  index.json                          # UUID → path map
  <proposed|accepted|achieved>/
    <objective-slug>/
      objective.json
      <aspirational|achieved>/
        <kr-slug>/
          kr.json
          <to-do|in-progress|done>/
            task-slug.json
```

## Constraints

- **Distribution**: npm module — must be installable with `npm install 7even` and work in any Node.js project
- **Storage**: JSON files only — no database, no binary formats, human-readable and git-diffable
- **Identity**: Git users only — email and GitHub username, no separate user management
- **Concurrency**: Git-based CAS — no file locking, retry on conflict
- **Dashboard**: Local dev server (Vite) — no deployment infrastructure
- **Agent interface**: OpenCode slash commands first, other agent frameworks can follow
- **Design**: LCARS-inspired pastel-on-dark, gamified productivity aesthetic

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Status-based directory structure | File moves = status changes, visible in git diff, merge conflicts resolved by rename | — Pending |
| JSON files, not SQLite | Human-readable, git-diffable, no binary merge conflicts | — Pending |
| No name duplication in JSON | File rename is single source of truth for naming, prevents drift on merge conflicts | — Pending |
| Maintained index.json over derived | Fast UUID lookup without filesystem scan; repair command as fallback | — Pending |
| Git-based CAS over file locking | Works with distributed git workflows, no lock cleanup needed | — Pending |
| Non-destructive re-estimation | Full history of SP estimates enables burndown/velocity calculations | — Pending |
| Pluggable badge/achievement system | Teams can define project-specific gamification without forking | — Pending |
| Hybrid result measures | Automated checks where possible (test results, metrics), manual fallback for subjective outcomes | — Pending |

---
*Last updated: 2026-05-29 after initialization*
