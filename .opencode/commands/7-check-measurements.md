---
description: Check KRs with all tasks done and prompt for measurement validation
---

# /7-check-measurements

Scan for Key Results that have all tasks completed but require measurement validation before achieving.

## Context

```
`npx s7n key-result list`
```

```
`npx s7n task list`
```

## Instructions

You are a measurement validation agent. Your job is to identify Key Results that are ready for measurement and guide the user through validation.

**Important:** All IDs in 7even are UUIDs or shortIds (e.g. O1KR2). Both are accepted by all CLI commands.

### Workflow:

1. **Scan for KRs ready for measurement**:
   - Get all key results with status `aspirational`
   - For each KR, check if:
     - All child tasks are in `done` status
     - The KR has `structuredMeasurement` or `measureScript` defined
   - Build a list of KRs that meet both criteria

2. **If no KRs need measurement**:
   ```
   No KRs require measurement validation. All KRs either:
   - Have incomplete tasks
   - Have no measurement defined (will auto-achieve)
   - Are already achieved
   ```

3. **For each KR needing measurement**:
   - Show KR details: shortId, description, parent objective
   - Show the measurement criteria:
     - If `structuredMeasurement`: "Target: {target} {unit}, Operator: {operator}"
     - If `measureScript`: "Run script: {measureScript}"
   - List all completed tasks under this KR
   
4. **Prompt for validation**:
   ```
   All tasks for {shortId} are done. Ready to validate measurement:
   
   Measurement: {criteria}
   
   Options:
   1. Run measurement now and report result
   2. Mark as achieved (measurement confirmed)
   3. Skip for now
   4. Add blocking task (not actually done yet)
   ```

5. **Based on user choice**:

   **Option 1 (Run measurement)**:
   - If `measureScript`: Suggest running the script and ask for result
   - If `structuredMeasurement`: Ask user to check/measure manually and report
   - If measurement passes → proceed to Option 2
   - If measurement fails → proceed to Option 4

   **Option 2 (Mark achieved)**:
   ```bash
   npx s7n key-result move {shortId} achieved
   npx s7n key-result comment {shortId} --type agent -m "All tasks complete. Measurement validated: {summary of result}. Marked as achieved."
   npx s7n commit
   ```

   **Option 3 (Skip)**:
   - Move to next KR or exit

   **Option 4 (Add blocking task)**:
   - Help user create a new task describing what's missing
   - Do NOT mark KR as achieved

6. **After processing all KRs**:
   - Show summary: "{X} KRs validated, {Y} skipped, {Z} blocked"
   - If any KRs achieved, mention which objectives might have auto-achieved as a result

### Key rules:
- NEVER mark a KR as achieved without explicit user confirmation that measurement passed
- ALWAYS commit 7even state changes with `npx s7n commit`
- If measureScript exists, suggest running it but don't execute automatically (security)
- Check for auto-achieved objectives after marking KRs as achieved

### Example output format:

```
Scanning for KRs ready for measurement...

Found 2 KRs with completed tasks requiring validation:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 O1KR1: Multi-provider payment with <3s confirmation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Parent: O1 - Modernize checkout experience

Measurement: Response time ≤ 3000ms

Completed tasks:
  ✓ O1KR1T1: Stripe integration
  ✓ O1KR1T2: Payment form UI
  ✓ O1KR1T3: Error handling

Ready to validate? [1] Run measurement [2] Confirm achieved [3] Skip [4] Add task
```
