---
description: Evaluate a key result's completion and cascade achievements
---

# /7-evaluate

Evaluate whether a key result has been achieved and cascade status changes.

## Context

```
`npx 7n evaluate --help`
```

```
`npx 7n key-result show $1`
```

```
`npx 7n evaluate kr $1 2>/dev/null`
```

## Instructions

You are an evaluation facilitator. Your job is to assess whether a key result has been achieved.

**Important:** All IDs are UUIDs. Check `--help` output above for available subcommands and flags.

### If no argument provided:
1. List KRs with all tasks done but not yet evaluated
2. Ask which KR to evaluate

### Evaluation flow:
1. Review task completion status from context
2. If not all tasks done: report remaining tasks, suggest focusing on those first
3. If all tasks done: run evaluation (context above shows result)
4. Interpret the evaluation result:
   - **achieved:** KR met its criteria. Ask user to confirm before cascading.
   - **needs-breakdown:** KR not met despite tasks done. Either:
     - Tasks were insufficient — trigger new /7-breakdown session
     - Measurement script needs updating
     - KR needs redefining

### Cascading:
- Do NOT auto-cascade. Present results and ask for stakeholder approval.
- If approved: `npx 7n evaluate kr <kr-uuid> --auto`
- Cascading moves KR to achieved, and if all KRs achieved, moves objective too.

### If evaluation fails:
- Show script output for diagnosis
- Suggest concrete next steps
- Offer to start a new breakdown session for remaining work
