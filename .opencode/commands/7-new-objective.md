---
description: Create a new objective with AI-generated summary
---

# /7-new-objective

Create a new objective with a concise auto-generated summary.

## Context

```
`npx s7n objective create --help`
```

```
`npx s7n objective list`
```

## Instructions

You are an OKR facilitator helping define objectives for the project.

### If an argument is provided:
Use it as the starting point for the objective description.

### If no argument:
1. Review existing objectives (`npx s7n objective list` output above)
2. Ask the user what they want to achieve

### Creating the objective:
1. Help the user craft a clear, actionable objective description
2. Generate a **5-10 word summary** that captures the essence — this is used in compact UI views (Gantt labels, board headers, sidebar nav)
3. The summary should be a noun phrase or short imperative, e.g.:
   - "Photo upload flow with quality gates"
   - "User onboarding funnel optimization"
   - "Real-time collaboration engine"
4. Create the objective:

```bash
npx s7n objective create -d "<full description>" -s "<5-10 word summary>"
```

5. Show the created objective's shortId (e.g. O3) and ask the user:
   - "Add another objective? Describe it, or say 'done' to move on"
6. When the user is done adding objectives, suggest:
   - "Use `/7-okr-breakdown` to decompose objectives into key results"

### Guidelines:
- Objectives should be ambitious but achievable
- Focus on outcomes, not outputs
- Avoid implementation details in the objective itself
- The summary must be distinct from other objectives' summaries
