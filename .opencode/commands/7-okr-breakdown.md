---
description: Start or resume a guided OKR decomposition session (Objective → Key Results)
---

# /7-okr-breakdown

Start or resume a guided session to decompose an objective into key results.

## Context

```
`npx 7 session --help`
```

```
`npx 7 objective list`
```

```
`npx 7 key-result list`
```

```
`npx 7 session list --status active`
```

```
`npx 7 session show $1 2>/dev/null`
```

## Instructions

You are a guided OKR decomposition facilitator. Your job is to help the user break an objective into measurable key results.

**Important:** All IDs in 7even are UUIDs or shortIds (e.g. O1, O1KR2). Both are accepted by CLI commands.

### If no argument provided:
1. Show active sessions (from context above)
2. Show objectives without active sessions
3. Ask: resume existing session or start new one?

### Starting a new session:
1. Create session: `npx 7 session create objective-to-kr <objective-uuid>`
2. Read the objective details carefully
3. **Review ALL existing KRs across ALL objectives** (listed in context above)
4. Propose 2-3 seed KRs based on the objective's description, status quo, and desired outcome
5. Each KR must be measurable with a clear metric and target

### Session flow:
1. Present proposals, accept structured or free-form feedback
2. Iterate on KR definitions until user is satisfied
3. Run MECE analysis before closing session (see below)
4. Save session after each interaction: persist proposals to session state

### Global MECE validation:
MECE checks must be **cross-checked against ALL existing KRs and objectives**, not just the current objective:

1. **Mutually Exclusive (global):** Compare each proposed KR against every existing KR across all objectives. Flag if a proposed KR overlaps with a KR under a *different* objective — this often indicates the KR belongs elsewhere or the objectives themselves overlap.
2. **Collectively Exhaustive (local):** The KRs under *this* objective should fully cover achieving it.
3. **Objective-level overlap:** If the proposed KRs reveal that two objectives significantly overlap, flag this to the user and suggest merging or re-scoping.
4. Present a cross-reference table showing each proposed KR vs. potentially overlapping existing KRs, with a brief explanation of why they are or aren't duplicates.

### Creating KRs:
Once approved, create KRs via:
```
npx 7 key-result create -d "<description>" -s "<5-10 word summary>" --parent <objective-id>
```

### Persisting MECE analysis as comments:
After MECE validation, add a comment to each newly created KR summarizing the relevant findings. This serves as context for downstream task decomposition.

For each KR, add a comment noting:
- **Overlap risks**: which existing KRs (by shortId) are adjacent and how the boundary is drawn
- **Dependencies**: which KRs or objectives should be addressed first/in parallel and why
- **Scope boundary**: what is explicitly NOT in scope for this KR

```
npx 7 key-result comment <kr-id> --type agent -m "MECE: <overlap risks, dependencies, scope boundary>"
```

Keep comments concise (1-3 sentences). Example:
```
npx 7 key-result comment O1KR2 --type agent -m "MECE: Adjacent to O1KR1 (infra). This KR covers API layer only, NOT data model (O1KR1). Depends on O1KR1 completion for schema stability."
```

### Session lifecycle:
- Sessions stay active until the decomposition is complete
- Close session when done: `npx 7 session close <session-id>`
- Use `npx 7 commit` to persist all state changes to git

### Key rules:
- KRs must have `measureScript` — an executable way to verify achievement
- Each KR needs a clear metric (not just "improve X" but "X reaches Y")
- Always generate a `-s` summary (5-10 words) for each KR

### After completion:
Suggest next steps:
- "Use `/7-breakdown` to decompose KRs into tasks"
