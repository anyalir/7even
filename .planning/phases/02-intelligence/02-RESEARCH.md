# Phase 2: Intelligence - Research

**Researched:** 2026-05-29
**Domain:** Agent-driven OKR sessions, MECE analysis, lifecycle automation, estimation, slash commands
**Confidence:** MEDIUM

## Summary

Phase 2 adds the "intelligence" layer to the existing JSON-based OKR tracker: guided decomposition sessions where an agent proposes KRs/tasks, MECE overlap checking, automated lifecycle transitions (KR achievement, objective completion), estimation workflows, acceptance criteria with TDD-style flow, and OpenCode slash commands for agent interaction.

The existing codebase provides a solid foundation — Zod schemas already include `estimationHistory`, `resultMeasure`, `goalParameters`, `children` arrays, and `comments`. The storage engine supports CRUD, status transitions, and index management. Phase 2 extends these schemas (adding `acceptanceCriteria`, `measureScript`, structured measurement fields to KR) and builds new modules: session state management, MECE analysis engine, lifecycle evaluator, and slash command definitions.

**Primary recommendation:** Build a session state machine persisted as JSON in `.7even/sessions/`, implement MECE as a pure function comparing semantic similarity and deliverable overlap, and use OpenCode custom commands (`.opencode/commands/`) for all slash commands that delegate to `npx 7` CLI subcommands.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Agent proposes 2-3 seed KRs from objective description, then iterates based on feedback
- Humans can respond with structured accept/reject/modify per KR OR free-form text — both accepted
- Collaborative session closure: agent checks MECE criteria, proposes "session complete", human confirms
- Sessions are explicitly saveable and resumable — session state persisted to a file, resume via command (`npx 7 session resume <id>` or `/7-session <objective-id>`)
- Same flow applies to KR→task breakdown sessions
- Graded strictness: minor overlaps noted as warnings, significant overlaps block until resolved
- Two detection dimensions: (1) Semantic + shared deliverables, (2) Result measure collision
- Inline warnings during proposal flow ("KR-3 overlaps with KR-1 because...")
- Full MECE analysis report before session closes
- Exhaustiveness checking covers both functional gaps AND non-functional/constraint gaps
- Result measures defined as free-form text; agent proposes structured measurement (type, target, operator) parsed from free-form input; human approves structured form
- When all tasks for a KR are done, agent prompts: "All tasks done, ready to evaluate result measure?" — also nudges for stakeholder/PO approval
- Automated evaluation: agent reads git/CI output as baseline; optional `measureScript` field in KR JSON runs if present, agent interprets results
- When result measure NOT met: full new breakdown session required (not targeted gap closure) — rationale: stakeholder/PO proxy must be present
- When result measure met: KR → achieved automatically; when all KRs achieved, objective → achieved
- `/7-start-task` triggers acceptance criteria definition BEFORE implementation begins
- Agent guides human through defining acceptance criteria — agent leads (humans are bad at TDD)
- Each acceptance criterion points to an executable script or command
- Acceptance criteria written to task JSON as structured entries with script references
- Implementation starts only after acceptance criteria are defined and approved
- On `/7-finish`, acceptance scripts are run to verify task completion
- Session-oriented commands: `/7-session`, `/7-breakdown`, `/7-evaluate`
- Task lifecycle commands: `/7-start-task`, `/7-pause`, `/7-proceed`, `/7-finish`
- Full context load on every slash command — reads objective → KR → task chain, index, related items
- Arguments optional: `/7-session` alone prompts agent to ask which objective; `/7-session <id>` targets directly
- Sessions (guided OKR decomposition) are slash-command-only — no CLI equivalent
- Initial SP estimation on task creation
- Non-destructive re-estimation history: `{date, spRemaining, estimator}` array in task JSON
- Agent suggests daily re-estimation, human approves
- Re-estimations documented in task JSON, viewable in task detail

### Claude's Discretion
- Session state file format and storage location within `.7even/`
- MECE similarity threshold tuning
- Exact structured measurement types and operators
- How agent discovers and reads CI/git output for evaluation
- Estimation suggestion algorithm (how agent determines new SP estimate)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OKR-05 | Guided OKR session: agent proposes key results from objective description, humans give feedback iteratively | Session state machine, OpenCode slash commands for conversational flow, context loading pattern |
| OKR-06 | MECE overlap checking when breaking objectives into key results | MECE analysis engine with semantic + deliverable + result measure dimensions |
| OKR-07 | MECE overlap checking when breaking key results into tasks, against existing tasks | Same MECE engine applied at task level, cross-referencing existing tasks via index |
| OKR-08 | When all tasks for a KR are done, evaluate result measure against goal parameters | Lifecycle evaluator: detect task completion, run measureScript, agent interprets results |
| OKR-09 | If result measure not met after task completion, trigger another round of task breakdown | Session resumption flow — triggers full new breakdown session |
| OKR-10 | When result measure met, KR status → achieved | Lifecycle automation using existing `moveItem()` with status transition |
| OKR-11 | When all KRs of an objective achieved, objective status → achieved | Cascade check: query all children KRs, if all achieved, auto-transition objective |
| CLI-06 | OpenCode slash commands mirroring CLI functionality for agent interaction | OpenCode custom commands in `.opencode/commands/` — markdown files with shell output injection |
| EST-01 | Initial story point estimation for tasks | Schema already has `estimationHistory`; add estimation to task creation flow |
| EST-02 | Non-destructive re-estimation history | Schema already supports `{date, spRemaining, estimator}` array — needs CLI/slash command support |
| EST-03 | Agent-suggested daily re-estimation of remaining complexity, human-approved | Slash command that reads task state, agent proposes new estimate with rationale |
| DOC-02 | Task detail view integrates git commit messages and git history for the task | Extend git.ts to query commits by task UUID (from commit body convention CLI-05) |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | ^4.4.3 | Schema validation | Already in project; extend for new fields |
| commander | ^15.0.0 | CLI commands | Already in project; add session/estimation subcommands |
| chalk | ^5.6.2 | Terminal output formatting | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node child_process | built-in | Run measureScript, git log queries | Lifecycle evaluation, DOC-02 git history |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom MECE | NLP library (natural, compromise) | Overkill — agent does semantic analysis, code just checks structural overlap |
| Session DB | SQLite | Unnecessary — JSON files match project philosophy (repo-local, no external deps) |

**Installation:**
```bash
# No new dependencies needed — existing stack covers all requirements
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── core/
│   ├── schemas/
│   │   ├── session.ts          # Session state schema
│   │   ├── acceptance.ts       # Acceptance criteria schema
│   │   ├── key-result.ts       # Extended with measureScript, structured measurement
│   │   └── task.ts             # Extended with acceptanceCriteria
│   ├── session-manager.ts      # Session CRUD, state transitions, persistence
│   ├── mece.ts                 # MECE structural overlap detection
│   ├── lifecycle.ts            # Lifecycle automation (evaluate, cascade)
│   ├── estimation.ts           # Estimation helpers (initial, re-estimate)
│   └── git.ts                  # Extended: git log by task UUID
├── cli/
│   └── commands/
│       ├── session.ts          # `npx 7 session` subcommands
│       ├── estimate.ts         # `npx 7 estimate` subcommands
│       └── evaluate.ts         # `npx 7 evaluate` subcommands
.opencode/
└── commands/
    ├── 7-session.md            # /7-session slash command
    ├── 7-breakdown.md          # /7-breakdown slash command
    ├── 7-evaluate.md           # /7-evaluate slash command
    ├── 7-start-task.md         # /7-start-task slash command
    ├── 7-pause.md              # /7-pause slash command
    ├── 7-proceed.md            # /7-proceed slash command
    └── 7-finish.md             # /7-finish slash command
```

### Pattern 1: Session State Machine
**What:** Sessions persisted as JSON files in `.7even/sessions/<session-id>.json` with explicit state transitions
**When to use:** All guided OKR decomposition flows (objective→KR, KR→task)

```typescript
// Session state schema
const SessionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["objective-to-kr", "kr-to-task"]),
  targetId: z.string().uuid(),          // objective or KR being decomposed
  status: z.enum(["active", "paused", "completed"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  proposals: z.array(z.object({
    id: z.string().uuid(),
    description: z.string(),
    status: z.enum(["proposed", "accepted", "rejected", "modified"]),
    feedback: z.string().optional(),
    meceWarnings: z.array(z.string()).default([]),
  })),
  meceReport: z.object({
    overlaps: z.array(z.object({
      items: z.tuple([z.string(), z.string()]),
      dimension: z.enum(["semantic", "deliverable", "result-measure"]),
      severity: z.enum(["warning", "blocking"]),
      reason: z.string(),
    })),
    gaps: z.array(z.object({
      type: z.enum(["functional", "non-functional"]),
      description: z.string(),
    })),
    isComplete: z.boolean(),
  }).optional(),
});
```

### Pattern 2: OpenCode Slash Commands via Custom Commands
**What:** Markdown files in `.opencode/commands/` that inject context and delegate to CLI
**When to use:** Every agent-facing interaction point

```markdown
<!-- .opencode/commands/7-session.md -->
---
description: Start or resume a guided OKR decomposition session
---
You are the 7even OKR decomposition agent. Load full context for this session.

Current objectives:
!`npx 7 objective list`

Current session state (if resuming):
!`npx 7 session show $1 2>/dev/null || echo "No active session for $1"`

Full objective context:
!`npx 7 objective show $1 2>/dev/null`

Existing KRs for this objective:
!`npx 7 key-result list --parent $1 2>/dev/null`

## Your Role
- If no session exists for $1, start a new guided session
- Propose 2-3 seed KRs based on the objective description
- Accept structured (accept/reject/modify) OR free-form feedback
- Check MECE criteria inline as you propose
- Before closing, run full MECE analysis and propose "session complete"
- Save session state after each interaction: `npx 7 session save <session-id>`
```

### Pattern 3: Lifecycle Cascade
**What:** When tasks complete, check if KR can be evaluated; when KR achieved, check if objective completes
**When to use:** Every status transition to "done" or "achieved"

```typescript
// After task moves to "done", check parent KR
async function checkKrCompletion(sevenDir: string, krId: string): Promise<void> {
  const tasks = await listItems(sevenDir, "task");
  const krTasks = tasks.filter(t => t.data.parentId === krId);
  const allDone = krTasks.every(t => t.data.status === "done");

  if (allDone) {
    // Don't auto-evaluate — prompt user
    console.log("All tasks done for this KR. Ready to evaluate result measure?");
  }
}

// After KR moves to "achieved", check parent objective
async function checkObjectiveCompletion(sevenDir: string, objectiveId: string): Promise<void> {
  const krs = await listItems(sevenDir, "key-result");
  const objKrs = krs.filter(kr => kr.data.parentId === objectiveId);
  const allAchieved = objKrs.every(kr => kr.data.status === "achieved");

  if (allAchieved) {
    await moveItem(sevenDir, objectiveId, "achieved");
  }
}
```

### Anti-Patterns to Avoid
- **Agent-only sessions without persistence:** Sessions MUST be saveable/resumable. Never rely on conversation context alone — always persist to `.7even/sessions/`.
- **Auto-evaluating without human confirmation:** The agent prompts "ready to evaluate?" — never silently evaluates and transitions.
- **Targeted gap closure on failure:** When result measure not met, ALWAYS trigger full new breakdown session, not piecemeal fixes.
- **Blocking on minor MECE overlaps:** Minor overlaps are warnings, only significant overlaps block.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom ID gen | `crypto.randomUUID()` | Already used in project |
| Schema validation | Manual checks | Zod schemas | Already used, extend existing |
| Git commit queries | Custom git parser | `git log --grep` with task UUID | CLI-05 already embeds UUIDs in commit messages |
| Slash command system | Custom agent protocol | OpenCode custom commands (`.opencode/commands/`) | Built-in feature, markdown-based, supports shell injection |

**Key insight:** The agent (Claude/LLM) handles all semantic analysis (MECE similarity, acceptance criteria quality, estimation reasoning). The code handles structural checks (file overlap, measure collision) and state management. Don't try to implement NLP in code.

## Common Pitfalls

### Pitfall 1: Session State Corruption
**What goes wrong:** Session file gets out of sync with actual items created during session
**Why it happens:** Session creates KRs/tasks but crash before updating session state
**How to avoid:** Write session state AFTER item creation succeeds; include item IDs in session state for reconciliation
**Warning signs:** Session shows proposals as "accepted" but no corresponding items in index

### Pitfall 2: Circular Lifecycle Triggers
**What goes wrong:** Task→done triggers KR check, which triggers evaluate, which creates new tasks, which trigger more checks
**Why it happens:** Lifecycle hooks firing during setup of new breakdown session
**How to avoid:** Use a flag/guard to disable lifecycle checks during bulk operations (session creation)
**Warning signs:** Unexpected status transitions during session

### Pitfall 3: measureScript Security
**What goes wrong:** Arbitrary shell command execution from JSON field
**Why it happens:** `measureScript` in KR JSON runs via `child_process`
**How to avoid:** Validate measureScript format (only allow `npm run *` or scripts in a known directory), display command before running, require human confirmation
**Warning signs:** KR JSON contains unexpected shell commands

### Pitfall 4: Slash Command Context Overload
**What goes wrong:** Loading full objective→KR→task chain on every command overwhelms context
**Why it happens:** Decision says "full context load on every slash command"
**How to avoid:** Load summary first (IDs + names + statuses), load detail only for the targeted item and its direct parent/children
**Warning signs:** Slash commands producing multi-thousand-line context dumps

### Pitfall 5: Estimation History Bloat
**What goes wrong:** Daily re-estimations accumulate unlimited entries in task JSON
**Why it happens:** Non-destructive history with no pruning
**How to avoid:** This is by design (non-destructive), but consider capping display to last N entries. Storage is fine — JSON files are small.
**Warning signs:** Task JSON files growing very large

## Code Examples

### Extending KR Schema for Structured Measurement
```typescript
// Source: existing schema pattern in src/core/schemas/key-result.ts
const StructuredMeasurementSchema = z.object({
  type: z.enum(["numeric", "boolean", "percentage", "count"]),
  target: z.union([z.number(), z.boolean(), z.string()]),
  operator: z.enum(["gte", "lte", "eq", "gt", "lt"]),
  unit: z.string().optional(),
});

// Extend KeyResultSchema
export const KeyResultSchema = z.object({
  // ... existing fields ...
  resultMeasure: z.string().default(""),
  structuredMeasurement: StructuredMeasurementSchema.nullable().default(null),
  measureScript: z.string().nullable().default(null),
  goalParameters: z.record(z.string(), z.unknown()).default({}),
});
```

### Adding Acceptance Criteria to Task Schema
```typescript
// Source: extension of existing task schema
const AcceptanceCriterionSchema = z.object({
  description: z.string(),
  script: z.string(),  // e.g., "npm run test:acceptance:setup-auth"
  status: z.enum(["pending", "passed", "failed"]).default("pending"),
});

// Extend TaskSchema
export const TaskSchema = z.object({
  // ... existing fields ...
  acceptanceCriteria: z.array(AcceptanceCriterionSchema).default([]),
});
```

### Git Log by Task UUID (DOC-02)
```typescript
// Source: extending existing git.ts
export function getTaskCommits(taskId: string): Array<{hash: string; date: string; message: string}> {
  try {
    const log = execSync(
      `git log --all --grep="task: ${taskId}" --format="%H|%aI|%s"`,
      { encoding: "utf-8" }
    ).trim();
    if (!log) return [];
    return log.split("\n").map(line => {
      const [hash, date, message] = line.split("|");
      return { hash: hash!, date: date!, message: message! };
    });
  } catch {
    return [];
  }
}
```

### Running measureScript
```typescript
export async function runMeasureScript(script: string): Promise<{stdout: string; exitCode: number}> {
  try {
    const stdout = execSync(script, {
      encoding: "utf-8",
      timeout: 30000,  // 30 second timeout
      cwd: getGitRoot(),
    });
    return { stdout, exitCode: 0 };
  } catch (err: any) {
    return { stdout: err.stdout || "", exitCode: err.status || 1 };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom slash command protocols | OpenCode custom commands (markdown in `.opencode/commands/`) | OpenCode v1 | No custom protocol needed — use built-in feature |
| Zod v3 | Zod v4 (^4.4.3 in project) | 2025 | Different import patterns, `.default()` behavior |
| Commander v11 | Commander v15 (^15.0.0 in project) | 2025 | Latest API, subcommand improvements |

**Deprecated/outdated:**
- Zod v3: Project already on v4 — ensure any examples use v4 API

## Open Questions

1. **MECE Semantic Similarity**
   - What we know: Agent handles semantic analysis, code handles structural overlap (shared files/deliverables, result measure collision)
   - What's unclear: How much structural overlap detection is needed vs. leaving it entirely to the agent
   - Recommendation: Implement structural checks (shared parent, keyword overlap in descriptions) as a starting point; agent augments with deeper semantic analysis. Threshold tuning is at Claude's discretion per CONTEXT.md.

2. **CI Output Discovery for Evaluation**
   - What we know: Agent reads git/CI output as baseline; measureScript runs if present
   - What's unclear: How agent discovers CI status without external integrations (project is repo-local only)
   - Recommendation: Agent reads local git state (recent commits, test output from measureScript). CI integration is out of scope per project constraints. Agent can ask user to paste CI results.

3. **Session Concurrency**
   - What we know: Only one session per objective/KR should be active at a time
   - What's unclear: Whether CAS mechanism from Phase 1 should protect sessions too
   - Recommendation: Simple file lock — check for existing active session before starting new one. Full CAS unnecessary for sessions (single-user conversational flow).

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/core/schemas/*.ts`, `src/core/storage.ts`, `src/core/git.ts` — verified current schema structure
- OpenCode docs (https://opencode.ai/docs/commands) — verified custom commands feature, markdown format, shell injection, arguments
- CONTEXT.md — user decisions locked

### Secondary (MEDIUM confidence)
- OpenCode docs general structure — slash commands map to `.opencode/commands/` markdown files with `!`backtick`` shell injection and `$ARGUMENTS`/`$1` positional params

### Tertiary (LOW confidence)
- Zod v4 API nuances — project is on ^4.4.3 which is very recent; verify `.extend()` or spread patterns work as expected during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, extending existing patterns
- Architecture: MEDIUM - session state machine and slash command integration are novel for this project
- Pitfalls: MEDIUM - based on engineering judgment, not documented prior art

**Research date:** 2026-05-29
**Valid until:** 2026-06-28 (30 days — stable domain, existing stack)
