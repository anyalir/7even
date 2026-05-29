# Phase 1: Foundation - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Data model, JSON storage, CLI with CRUD and concurrency. Users can create, read, update, and transition OKR work items (objectives, key results, tasks) via CLI, with all data persisted as JSON files in `.7even/`. Includes index maintenance, inline comments, commit conventions, and git-based CAS concurrency.

</domain>

<decisions>
## Implementation Decisions

### CLI command design
- Noun-verb pattern: `npx 7 objective create`, `npx 7 task move`
- Both short and long entity aliases: `o`/`objective`, `kr`/`key-result`, `t`/`task`
- Pretty terminal output by default (colored text, status indicators)
- Explicit `npx 7 init` command to create `.7even/` directory with `index.json`
- No auto-init on first use

### JSON schema details
- ISO 8601 timestamps throughout (`2026-05-29T14:30:00Z`)
- Required fields on all item types: `id` (UUID), `status`, `createdAt`, `createdBy`, `description`
- Parent reference (`parentId`) is source of truth; children array derived and maintained for convenience
- Per-file `schemaVersion` field (starting at 1) for future migrations
- No name/title field inside JSON — filename is the canonical name

### Directory conventions
- kebab-case slugs for all directory and file names (e.g., `improve-signup-conversion`)
- Status directory names match status names exactly: `proposed`, `accepted`, `achieved`, `aspirational`, `to-do`, `in-progress`, `done`
- Lazy directory creation — dirs created only when first item needs them
- No `.gitkeep` files — empty dirs not tracked

### Concurrency model
- Batch mode: CLI mutations write/move files locally, user commits explicitly via `npx 7 commit`
- `npx 7 commit` command for convenience + git pre-commit hook for safety/validation
- Git-based CAS: on conflict, visible retry with progress (`Conflict detected, retrying (1/3)...`)
- No enforcement on dirty state — user can run mutations with uncommitted `.7even/` changes

### Comment workflow
- Add comments via `-m` flag for quick (`npx 7 task comment <id> -m 'message'`) or `--edit` to open `$EDITOR`
- Comment author derived from git config (name + email) automatically
- Comments have a `type` field: `"human"` or `"agent"` to distinguish source
- Comments displayed as part of `npx 7 task show <id>` output

### Repair behavior
- `npx 7 repair-index` auto-fixes by default, `--dry-run` flag shows diff without applying
- Orphan entries (index points to nonexistent files) are cleaned and reported
- Unindexed files (exist on disk but not in index) are added

### Commit messages
- Auto-generated from staged `.7even/` changes: `7even: <action> <item-slug>`
- Task UUID included in commit body (after newline) — keeps oneline history clean
- `-m` flag not supported on `npx 7 commit` — messages are always auto-generated for consistency
- Format example:
  ```
  7even: move run-perf-tests to in-progress

  task: 550e8400-e29b-41d4-a716-446655440000
  ```

### Claude's Discretion
- Exact CLI help text and error message wording
- Internal data validation logic
- Index.json internal structure beyond UUID→path mapping
- Pre-commit hook implementation details
- Slug generation rules for edge cases (special characters, length limits)

</decisions>

<specifics>
## Specific Ideas

- CLI binary name is `7` (invoked as `npx 7`), package name is `7even`
- Commit message format inspired by conventional commits but with `7even:` prefix instead of `feat:`/`fix:`
- The `type` field on comments enables dashboard to render agent vs human comments differently in Phase 3

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-05-29*
