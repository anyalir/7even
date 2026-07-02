---
description: Orchestrate an executor/validator pair to implement and verify a task
---

# /7-spawn-pair

Orchestrate an executor/validator pair to implement and verify a task. YOU (the main agent) are the orchestrator — spawn executor and validator subagents directly using the Task tool.

## Context

```
`npx s7n task show $1`
```

```
`npx s7n key-result show $(npx s7n task show $1 2>&1 | grep parentId | head -1 | sed 's/.*: //') 2>/dev/null`
```

```
`npx s7n task list --status in-progress`
```

```
`git config user.email`
```

## Instructions

You are the orchestrator. You do NOT implement or verify — you spawn subagents and relay messages between them.

**Important:** All IDs in 7even are UUIDs or shortIds (e.g. O1KR1T1). Both are accepted by CLI commands.

Extract from context above: task ID (shortId and UUID), description, parent KR, MECE comments, git email.

### Agents

| Role       | subagent_type   | Model               | Purpose                        |
|------------|-----------------|----------------------|--------------------------------|
| Executor   | `7-executor`    | Sonnet 4.5 (Copilot)| Proposes AC, implements code   |
| Validator  | `7-validator`   | Opus 4.6 (Copilot)  | Reviews AC, verifies, finishes |

---

### Phase 1: Executor proposes acceptance criteria

Spawn Task tool with `subagent_type: "7-executor"`:

> **Task:** [full task context from above]
> **Parent KR:** [KR context from above]
> **Git email:** [email from above]
>
> Propose 3-5 acceptance criteria for this task.

Save the executor's `task_id` for later resumption.

---

### Phase 2: Validator reviews acceptance criteria

Spawn Task tool with `subagent_type: "7-validator"`:

> **Task:** [task context]
> **Parent KR:** [KR context]
> **Proposed criteria from executor:**
> [paste executor's proposed criteria verbatim]
>
> Review these acceptance criteria.

Save the validator's `task_id` for later resumption.

---

### Phase 2b: Rejection loop (max 2 rounds)

If validator returned `REJECTED:`:
1. Resume executor (same `task_id`) with validator's feedback
2. Executor revises criteria
3. Resume validator (same `task_id`) with revised criteria
4. If still rejected after 2 rounds, approve best version with concerns noted

---

### Phase 3: Executor implements

Resume executor (same `task_id`) with:

> Acceptance criteria APPROVED by validator:
> [paste approved criteria]
>
> **Task UUID:** [full UUID — executor needs this for commit messages]
> **Git email:** [email]
> Implement with these approved criteria. IMPORTANT: Every commit MUST include `task: <full-uuid>` in the body. Re-estimate via `npx s7n estimate add` if complexity changes.

---

### Phase 4: Validator verifies

Spawn Task tool with `subagent_type: "7-validator"`:

> **Task:** [task context]
> **Task UUID:** [full UUID]
> **Acceptance criteria:** [approved criteria]
> **Executor's implementation summary:** [paste executor's summary verbatim]
>
> Verify implementation against acceptance criteria.

Save the validator's `task_id` for later resumption.

---

### Phase 5: Loop or finish

**If validator returned `FAIL:`:**
1. Resume executor (same `task_id`) with validator's failure feedback
2. When executor returns, go back to Phase 4 (resume validator with new summary)
3. Max 3 verification loops. After that, escalate to user:
   > "Task <shortId> failed verification 3 times. Remaining issues: [list]. Manual intervention needed."

**If validator returned `ALL_PASS`:**
Resume validator (same `task_id`) with:

> All criteria passed. Finalize the task.

---

### Final report

Report to user:
```
Task: <shortId>
Status: DONE | ESCALATED
Iterations: N
Summary: <what was built>
```

### Rules:
- NEVER implement or verify yourself — always delegate to subagents
- ALWAYS use `subagent_type: "7-executor"` for executor, `subagent_type: "7-validator"` for validator
- ALWAYS relay full context between agents — include the full task UUID so executor can use it in commits
- Track iteration count — escalate after 3 failed verifications
- Report final status when the pair completes
