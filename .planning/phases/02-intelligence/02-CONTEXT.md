# Phase 2: Intelligence - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Agent-driven guided OKR sessions that decompose objectives into KRs and tasks with MECE validation. Lifecycle automation: auto-evaluate result measures when tasks complete, trigger re-breakdown or achievement. Estimation with non-destructive history and agent-suggested daily re-estimation. OpenCode slash commands for agent interaction. Task acceptance criteria with TDD-style workflow.

</domain>

<decisions>
## Implementation Decisions

### Guided session flow
- Agent proposes 2-3 seed KRs from objective description, then iterates based on feedback
- Humans can respond with structured accept/reject/modify per KR OR free-form text — both accepted
- Collaborative session closure: agent checks MECE criteria, proposes "session complete", human confirms
- Sessions are explicitly saveable and resumable — session state persisted to a file, resume via command (`npx 7 session resume <id>` or `/7-session <objective-id>`)
- Same flow applies to KR→task breakdown sessions

### MECE checking behavior
- Graded strictness: minor overlaps noted as warnings, significant overlaps block until resolved
- Two detection dimensions:
  1. Semantic + shared deliverables — overlapping if they describe similar outcomes or touch the same files/components
  2. Result measure collision — overlapping if achieving one would automatically achieve the other
- Inline warnings during proposal flow ("KR-3 overlaps with KR-1 because...")
- Full MECE analysis report before session closes
- Exhaustiveness checking covers both functional gaps (objective requirements not addressed by any KR) AND non-functional/constraint gaps from the objective description

### Lifecycle automation
- Result measures defined as free-form text; agent proposes structured measurement (type, target, operator) parsed from the free-form input; human approves the structured form
- When all tasks for a KR are done, agent prompts: "All tasks done, ready to evaluate result measure?" — also nudges human to seek stakeholder/PO approval
- Automated evaluation: agent reads git/CI output as baseline; optional `measureScript` field in KR JSON (shell script or `npm run <task>`) runs if present, agent interprets results
- When result measure NOT met: full new breakdown session required (not targeted gap closure) — rationale: stakeholder/PO proxy must be present for re-decomposition decisions
- When result measure met: KR → achieved automatically; when all KRs achieved, objective → achieved

### Task acceptance criteria (TDD workflow)
- `/7-start-task` triggers acceptance criteria definition BEFORE implementation begins
- Agent guides human through defining acceptance criteria — assumption is humans are bad at TDD, agent leads
- Each acceptance criterion points to an executable script or command (`npm run test:acceptance:<task-slug>`, shell script, or similar)
- Acceptance criteria written to the task JSON as structured entries with script references
- Implementation starts only after acceptance criteria are defined and approved
- On `/7-finish`, acceptance scripts are run to verify task completion

### Slash command design
- Session-oriented commands: `/7-session`, `/7-breakdown`, `/7-evaluate`
- Task lifecycle commands: `/7-start-task`, `/7-pause`, `/7-proceed`, `/7-finish`
- Full context load on every slash command — reads objective → KR → task chain, index, related items
- Arguments optional: `/7-session` alone prompts agent to ask which objective; `/7-session <id>` targets directly
- Sessions (guided OKR decomposition) are slash-command-only — no CLI equivalent; sessions are inherently conversational

### Estimation workflow
- Initial SP estimation on task creation
- Non-destructive re-estimation history: `{date, spRemaining, estimator}` array in task JSON
- Agent suggests daily re-estimation, human approves — agent reads task state and proposes new estimate with rationale
- Re-estimations documented in task JSON, viewable in task detail

### Claude's Discretion
- Session state file format and storage location within `.7even/`
- MECE similarity threshold tuning
- Exact structured measurement types and operators
- How agent discovers and reads CI/git output for evaluation
- Estimation suggestion algorithm (how agent determines new SP estimate)

</decisions>

<specifics>
## Specific Ideas

- Sessions require stakeholder/PO presence for re-breakdown — this is a governance decision, not just a workflow preference
- TDD acceptance criteria workflow inspired by the observation that "humans are bad at TDD" — agent should be proactive and guiding, not passive
- `/7-start-task` is the entry point for all task work — it enforces the "define done before doing" discipline
- `measureScript` supports both shell scripts and npm run commands, giving teams flexibility in how they automate result measurement

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-intelligence*
*Context gathered: 2026-05-29*
