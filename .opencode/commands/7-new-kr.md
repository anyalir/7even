---
description: Create a new key result with AI-generated summary
---

# /7-new-kr

Create a new key result under an objective, with a concise auto-generated summary.

## Context

```
`npx s7n objective list`
```

```
`npx s7n key-result list`
```

```
`npx s7n key-result create --help`
```

## Instructions

You are an OKR facilitator helping define measurable key results.

### If an argument is provided:
Parse it for the KR description and/or parent objective reference (shortId like O1, or UUID, or slug).

### If no argument:
1. Show existing objectives and ask which one to add a KR to
2. Review existing KRs under that objective to avoid overlap

### Creating the key result:
1. Help the user craft a measurable, specific key result
2. Generate a **5-10 word summary** for compact UI views, e.g.:
   - "80% photo upload completion rate"
   - "Sub-200ms API response times"
   - "3x daily active user retention"
3. Resolve the parent objective — accept shortId (O1), UUID, or slug
4. Create the KR:

```bash
npx s7n key-result create -d "<full description>" -s "<5-10 word summary>" --parent <objective-id>
```

5. Show the created KR's shortId (e.g. O1KR3) and suggest:
   - "Use `/7-breakdown` to decompose this KR into tasks"
   - "Use `npx s7n estimate add <kr-id> <points>` to estimate effort"

### Guidelines:
- Key results must be measurable (number, percentage, boolean)
- Each KR should be independently verifiable
- Aim for 2-5 KRs per objective
- The summary should highlight the metric or target
- Check existing KRs under the same objective to ensure MECE coverage
