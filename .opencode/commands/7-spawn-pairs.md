---
description: Spawn multiple executor/validator pairs in parallel for batch task execution
---

# /7-spawn-pairs

Orchestrate N executor/validator pairs for concurrent task execution. YOU (the main agent) are the orchestrator — spawn executor and validator subagents directly.

## Context

```
`npx s7n task list`
```

```
`npx s7n task list --status to-do`
```

## Instructions

You are the orchestrator for multiple pairs. You spawn executors and validators directly using the Task tool. You NEVER implement or verify yourself.

**Important:** All IDs in 7even are UUIDs or shortIds (e.g. O1KR1T1). Both are accepted by CLI commands.

### Agents

| Role       | subagent_type   | Model               | Purpose                        |
|------------|-----------------|----------------------|--------------------------------|
| Executor   | `7-executor`    | Sonnet 4.5 (Copilot)| Proposes AC, implements code   |
| Validator  | `7-validator`   | Opus 4.6 (Copilot)  | Reviews AC, verifies, finishes |

### Parse task IDs

**If argument provided:**
Parse task IDs from the argument. Accepts:
- Comma-separated: `O1KR1T1,O1KR1T2,O1KR1T3`
- Space-separated: `O1KR1T1 O1KR1T2 O1KR1T3`
- Range notation: `O1KR1T1-T3` (expands to T1, T2, T3 under O1KR1)

**If no argument:**
1. Show all tasks in `to-do` status (from context above)
2. Ask user which tasks to run

### Pre-flight checks

**Dependency validation:**
For each requested task, check if its dependencies are satisfied:
```
npx s7n task show <task-id>
```
- If a task depends on another task that is NOT `done`, **exclude it** and warn:
  > "Skipping <shortId>: depends on <dep-shortId> (status: <status>)"
- Show the final list of tasks that will actually run

**Concurrency check:**
- Warn if >5 tasks: "Running N pairs. This will use many parallel agents. Proceed?"
- Show estimated total SP for the batch

### Gather context for all tasks

For each validated task, run:
```
npx s7n task show <task-id>
npx s7n key-result show <parent-kr-id>
```

Collect: task UUID, shortId, description, parent KR context, MECE comments, git email.

---

### Batch Phase 1: All executors propose acceptance criteria (PARALLEL)

Spawn ALL executors in a SINGLE message using multiple Task tool calls:

```
Task(subagent_type="7-executor", description="AC: O1KR1T1", prompt="[task context]\nPropose 3-5 acceptance criteria.")
Task(subagent_type="7-executor", description="AC: O1KR1T2", prompt="[task context]\nPropose 3-5 acceptance criteria.")
Task(subagent_type="7-executor", description="AC: O1KR1T3", prompt="[task context]\nPropose 3-5 acceptance criteria.")
```

Save each executor's `task_id` for later resumption. Map each `task_id` to its 7even task.

---

### Batch Phase 2: All validators review criteria (PARALLEL)

As soon as all executors return, spawn ALL validators in a SINGLE message:

```
Task(subagent_type="7-validator", description="Review AC: O1KR1T1", prompt="[task context]\n[executor's proposed criteria]\nReview these acceptance criteria.")
Task(subagent_type="7-validator", description="Review AC: O1KR1T2", prompt="[task context]\n[executor's proposed criteria]\nReview these acceptance criteria.")
```

Save each validator's `task_id`.

---

### Phase 2b: Handle rejections

For any validator that returned `REJECTED:`:
1. Resume that executor (same `task_id`) with validator's feedback
2. Resume that validator (same `task_id`) with revised criteria
3. Max 2 rejection rounds per pair — after that, approve best version with concerns noted

Handle rejections before proceeding. Rejected pairs may run slightly behind — that's fine.

---

### Batch Phase 3: All executors implement (PARALLEL)

Resume ALL executors in a SINGLE message with their approved criteria:

```
Task(task_id="<executor-task-id>", subagent_type="7-executor", description="Impl: O1KR1T1", prompt="Criteria APPROVED:\n[criteria]\nTask UUID: [uuid]\nGit email: [email]\nImplement now.")
Task(task_id="<executor-task-id>", subagent_type="7-executor", description="Impl: O1KR1T2", prompt="...")
```

---

### Batch Phase 4: All validators verify (PARALLEL)

As soon as executors return, spawn ALL validators in a SINGLE message:

```
Task(subagent_type="7-validator", description="Verify: O1KR1T1", prompt="[task context]\n[criteria]\n[executor summary]\nVerify implementation.")
Task(subagent_type="7-validator", description="Verify: O1KR1T2", prompt="...")
```

Save each validator's `task_id`.

---

### Phase 5: Handle failures and finish

**For each validator that returned `FAIL:`:**
1. Resume that executor with validator's failure feedback
2. When executor returns, resume validator (or spawn new one) with updated summary
3. Max 3 verification loops per pair. After that:
   > "ESCALATE: Task <shortId> failed verification 3 times. Issues: [list]"

**For each validator that returned `ALL_PASS`:**
Resume that validator (same `task_id`) with:
> All criteria passed. Finalize the task.

Handle failures/finishes per pair — some may finish while others are still looping.

---

### Progress tracking

Report as each pair completes:
```
DONE  O1KR1T1 (3 SP, 1 iteration)
DONE  O1KR1T2 (5 SP, 2 iterations)
FAIL  O1KR1T3 — escalated after 3 iterations
```

### After all pairs complete

1. Show summary table:
   ```
   Task       Status      SP    Iterations
   O1KR1T1    done         3    1
   O1KR1T2    done         5    2
   O1KR1T3    ESCALATED    8    3 (max)
   ```
2. Check if any KRs are now fully complete:
   ```
   npx s7n key-result list
   ```
3. Suggest next steps:
   - If blocked tasks are now unblocked: "These tasks are now unblocked: [list]. Run `/7-spawn-pairs` again."
   - If a KR is complete: "All tasks for <KR shortId> done! Run `/7-check-measurements` to validate."
   - If failed tasks exist: "Failed tasks need manual attention: [list]"

### Rules:
- NEVER spawn `7-orchestrator` subagents — you ARE the orchestrator
- NEVER implement or verify yourself — always delegate to executor/validator
- ALWAYS launch parallel batches in a SINGLE message with multiple Task calls
- ALWAYS relay full context between agents — include the full task UUID
- NEVER spawn tasks with unsatisfied dependencies
- Track iteration count per pair — escalate after 3 failed verifications
- Report individual pair results as they complete
