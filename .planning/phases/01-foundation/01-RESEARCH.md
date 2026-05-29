# Phase 1: Foundation - Research

**Researched:** 2026-05-29
**Domain:** CLI tooling, JSON file storage, Git-based concurrency, OKR data model
**Confidence:** HIGH

## Summary

Phase 1 builds a TypeScript CLI npm module (`7even`, binary `7`) that manages OKR work items (objectives, key results, tasks) as JSON files in a `.7even/` directory. The directory structure mirrors item status — moving a file between directories is a status transition. An `index.json` maps UUIDs to filesystem paths for fast lookup.

The technical domain is well-understood: CLI argument parsing, JSON file I/O, UUID generation, and git operations. No exotic libraries needed. The main complexity lies in the git-based CAS concurrency model (compare-and-swap on commits with retry) and maintaining index consistency across mutations.

**Primary recommendation:** Use Commander.js for CLI, Zod for schema validation, `crypto.randomUUID()` (Node built-in) for UUIDs, and simple `fs` operations for JSON persistence. Keep it minimal — no ORMs, no databases, no abstraction layers.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Noun-verb CLI pattern: `npx 7 objective create`, `npx 7 task move`
- Both short and long entity aliases: `o`/`objective`, `kr`/`key-result`, `t`/`task`
- Pretty terminal output by default (colored text, status indicators)
- Explicit `npx 7 init` command to create `.7even/` directory with `index.json`
- No auto-init on first use
- ISO 8601 timestamps throughout (`2026-05-29T14:30:00Z`)
- Required fields on all item types: `id` (UUID), `status`, `createdAt`, `createdBy`, `description`
- Parent reference (`parentId`) is source of truth; children array derived and maintained for convenience
- Per-file `schemaVersion` field (starting at 1) for future migrations
- No name/title field inside JSON — filename is the canonical name
- kebab-case slugs for all directory and file names
- Status directory names match status names exactly: `proposed`, `accepted`, `achieved`, `aspirational`, `to-do`, `in-progress`, `done`
- Lazy directory creation — dirs created only when first item needs them
- No `.gitkeep` files — empty dirs not tracked
- Batch mode: CLI mutations write/move files locally, user commits explicitly via `npx 7 commit`
- `npx 7 commit` command for convenience + git pre-commit hook for safety/validation
- Git-based CAS: on conflict, visible retry with progress (`Conflict detected, retrying (1/3)...`)
- No enforcement on dirty state — user can run mutations with uncommitted `.7even/` changes
- Add comments via `-m` flag for quick or `--edit` to open `$EDITOR`
- Comment author derived from git config (name + email) automatically
- Comments have a `type` field: `"human"` or `"agent"` to distinguish source
- Comments displayed as part of `npx 7 task show <id>` output
- `npx 7 repair-index` auto-fixes by default, `--dry-run` flag shows diff without applying
- Auto-generated commit messages: `7even: <action> <item-slug>` with task UUID in body
- No `-m` flag on `npx 7 commit` — always auto-generated

### Claude's Discretion
- Exact CLI help text and error message wording
- Internal data validation logic
- Index.json internal structure beyond UUID→path mapping
- Pre-commit hook implementation details
- Slug generation rules for edge cases (special characters, length limits)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | All work items stored as JSON files in `.7even/` directory | Standard fs operations, JSON.stringify/parse with indentation |
| DATA-02 | Status-based directory structure where file moves represent status changes | fs.rename for moves, path construction from status enum |
| DATA-03 | Every objective, key result, and task has a UUID | `crypto.randomUUID()` — Node 19+ built-in, no library needed |
| DATA-04 | Maintained `index.json` mapping UUID → filesystem path, updated on every mutation | Read-modify-write pattern with atomic write (write to temp, rename) |
| DATA-05 | Objective schema: objective.json with status quo, constraints, requirements, desired outcome, comments | Zod schema validation |
| DATA-06 | Key Result schema: kr.json with result measure, goal parameters, estimation history, comments | Zod schema validation |
| DATA-07 | Task schema: task-slug.json with assignee, estimation history, comments | Zod schema validation |
| DATA-08 | No name duplication inside JSON files — filename is canonical name | Enforced by schema design — no `name`/`title` field |
| DATA-09 | Index repair command that rebuilds index.json from filesystem scan | Recursive directory walk, match *.json files, rebuild map |
| CLI-01 | CLI binary invocable via `npx 7 <command>` | Commander.js with `bin` field in package.json |
| CLI-02 | CRUD commands for objectives, key results, and tasks | Commander subcommands with noun-verb pattern |
| CLI-03 | Status transition commands (move items between statuses) | `fs.rename` to move files between status directories |
| CLI-04 | Git-based CAS concurrency: compare-and-swap on commits, retry on conflict | `child_process.execSync` for git commands, retry loop |
| CLI-05 | Commit reference convention: task UID included in commit description | Auto-generated commit message formatting |
| OKR-01 | Create, read, update objectives with statuses: proposed, accepted, achieved | CRUD module + status enum + directory mapping |
| OKR-02 | Create, read, update key results with statuses: aspirational, achieved | CRUD module + status enum + directory mapping |
| OKR-03 | Create, read, update tasks with statuses: to-do, in-progress, done | CRUD module + status enum + directory mapping |
| OKR-04 | Assign tasks to git users (email and GitHub username) | Read git config for current user, store in task JSON |
| OKR-12 | Cross-reference between items via UUIDs | parentId field + derived children array in index |
| DOC-01 | Inline comments in JSON files as array of {author, date, text} objects | Comments array in each item schema, append-only pattern |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x | Type safety, build | Industry standard for npm CLI tools |
| Commander.js | 15.0.0 | CLI argument parsing | Most popular Node CLI framework, noun-verb subcommands built-in |
| Zod | 4.4.3 | Schema validation | Runtime type checking for JSON files, great TS inference |
| chalk | 5.6.2 | Terminal colors | De facto standard for colored CLI output |
| tsup | latest | Build/bundle | Fast esbuild-based bundler, perfect for CLI tools |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:crypto` | built-in | UUID generation | `crypto.randomUUID()` — no external dep needed |
| `node:fs/promises` | built-in | File I/O | All JSON read/write operations |
| `node:child_process` | built-in | Git operations | CAS commits, git config reading |
| `node:path` | built-in | Path manipulation | Directory structure navigation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Commander.js | yargs | Commander has cleaner subcommand API for noun-verb pattern |
| Zod | ajv + JSON Schema | Zod gives TypeScript types for free; ajv needs separate type definitions |
| chalk | picocolors | chalk has richer API for pretty output; picocolors is smaller but barebones |
| tsup | esbuild direct | tsup wraps esbuild with sensible defaults for library/CLI publishing |

**Installation:**
```bash
npm install commander zod chalk
npm install -D typescript tsup @types/node
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli/                # Commander setup, subcommands
│   ├── index.ts        # Main CLI entry point
│   ├── commands/       # One file per noun (objective.ts, key-result.ts, task.ts)
│   └── formatters/     # Pretty-print output helpers
├── core/               # Business logic (no CLI dependency)
│   ├── schemas/        # Zod schemas for each item type
│   ├── storage.ts      # JSON file read/write/move operations
│   ├── index-manager.ts # index.json CRUD
│   ├── slug.ts         # Slug generation from descriptions
│   └── git.ts          # Git operations (CAS, commit, config)
├── types/              # Shared TypeScript types (inferred from Zod)
└── index.ts            # Public API entry point
```

### Pattern 1: Noun-Verb CLI with Commander Subcommands
**What:** Each entity type is a Commander program with verb subcommands
**When to use:** All CLI commands
**Example:**
```typescript
import { Command } from 'commander';

const program = new Command();
program.name('7').description('7even work tracker').version('0.1.0');

const objective = program.command('objective').alias('o').description('Manage objectives');
objective.command('create').description('Create a new objective')
  .option('-d, --description <text>', 'Objective description')
  .action(async (opts) => { /* ... */ });
objective.command('show').argument('<id>', 'UUID or slug')
  .action(async (id) => { /* ... */ });
objective.command('list').action(async () => { /* ... */ });
objective.command('update').argument('<id>').action(async (id, opts) => { /* ... */ });
```

### Pattern 2: Atomic Index Updates
**What:** Write index.json via temp file + rename to prevent corruption
**When to use:** Every mutation that changes index.json
**Example:**
```typescript
import { writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';

async function writeIndex(sevenDir: string, index: Record<string, string>): Promise<void> {
  const indexPath = join(sevenDir, 'index.json');
  const tmpPath = indexPath + '.tmp';
  await writeFile(tmpPath, JSON.stringify(index, null, 2) + '\n');
  await rename(tmpPath, indexPath);
}
```

### Pattern 3: Status Transition via File Move
**What:** Changing status = moving file to new directory
**When to use:** All status transitions (move command)
**Example:**
```typescript
import { rename, mkdir } from 'node:fs/promises';

async function moveItem(oldPath: string, newStatusDir: string): Promise<string> {
  await mkdir(newStatusDir, { recursive: true }); // lazy dir creation
  const filename = path.basename(oldPath);
  const newPath = path.join(newStatusDir, filename);
  await rename(oldPath, newPath);
  return newPath;
}
```

### Pattern 4: Git-Based CAS with Retry
**What:** Commit with conflict detection and automatic retry
**When to use:** `npx 7 commit`
**Example:**
```typescript
import { execSync } from 'node:child_process';

function casCommit(message: string, maxRetries = 3): boolean {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      execSync('git add .7even/', { stdio: 'pipe' });
      execSync(`git commit -m "${message}"`, { stdio: 'pipe' });
      execSync('git pull --rebase', { stdio: 'pipe' });
      execSync('git push', { stdio: 'pipe' });
      return true;
    } catch {
      if (attempt < maxRetries) {
        console.log(`Conflict detected, retrying (${attempt}/${maxRetries})...`);
        execSync('git pull --rebase', { stdio: 'pipe' });
      }
    }
  }
  return false;
}
```

### Anti-Patterns to Avoid
- **In-memory caching of index:** Always read index.json fresh before mutations — another process may have changed it
- **Synchronous fs operations in CLI:** Use async throughout; Commander supports async actions
- **Hardcoded `.7even/` path:** Resolve from git root (`git rev-parse --show-toplevel`) so CLI works from subdirectories
- **Storing derived data as source of truth:** `children` array is derived from `parentId` references — rebuild on read or maintain as convenience copy

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLI argument parsing | Custom arg parser | Commander.js | Edge cases: help text, aliases, option types, error handling |
| Schema validation | Manual if/typeof checks | Zod | Handles nested objects, arrays, defaults, error messages |
| Terminal colors | ANSI escape codes | chalk | Cross-platform terminal compatibility |
| UUID generation | Custom ID function | `crypto.randomUUID()` | RFC 4122 compliant, cryptographically random |
| Slug generation | Simple regex | Dedicated function with tests | Edge cases: unicode, consecutive hyphens, length limits, reserved names |

**Key insight:** The core complexity is in the data model relationships and git CAS — don't waste effort on solved problems.

## Common Pitfalls

### Pitfall 1: Race Conditions in Index Updates
**What goes wrong:** Two concurrent CLI invocations read index, both modify, last write wins — data lost
**Why it happens:** No file locking in the design (by decision)
**How to avoid:** Batch mode design already handles this — mutations are local, only `npx 7 commit` touches git. Document that concurrent local mutations before commit could cause index inconsistency; `repair-index` is the safety net.
**Warning signs:** Index shows UUID pointing to nonexistent file

### Pitfall 2: Path Separators on Windows
**What goes wrong:** Hardcoded `/` in paths breaks on Windows
**Why it happens:** `path.join` returns `\` on Windows
**How to avoid:** Always use `path.join`/`path.resolve`; store POSIX paths in index.json (normalize on write)
**Warning signs:** Tests pass on macOS, fail on Windows CI

### Pitfall 3: Slug Collisions
**What goes wrong:** Two items with similar descriptions generate the same slug
**Why it happens:** Slug function strips too aggressively
**How to avoid:** Check for existing slug in target directory before creating; append `-2`, `-3` etc. on collision
**Warning signs:** `EEXIST` errors on file creation

### Pitfall 4: Deep Nested Directory Moves
**What goes wrong:** Moving an objective's status requires moving its entire subtree (KRs and tasks)
**Why it happens:** Directory structure mirrors hierarchy — objective dir contains KR dirs
**How to avoid:** Move the entire objective directory (with all contents) atomically; update all affected paths in index.json
**Warning signs:** Orphaned index entries after objective status change

### Pitfall 5: Git Config Not Available
**What goes wrong:** `git config user.name` / `user.email` returns empty — comment author is blank
**Why it happens:** Git not configured (CI environments, new machines)
**How to avoid:** Check git config on `init`, warn if not set; fail gracefully with meaningful error on comment creation
**Warning signs:** Empty `createdBy` fields

### Pitfall 6: Binary Name `7` Conflicts
**What goes wrong:** `npx 7` may conflict with npm package name resolution
**Why it happens:** Package name `7even` but binary name `7` — numeric binary names can be tricky
**How to avoid:** Set `"bin": { "7": "./dist/cli.js" }` in package.json; test `npx 7` early
**Warning signs:** `npx 7` runs wrong package or fails to resolve

## Code Examples

### Item Schema (Zod)
```typescript
import { z } from 'zod';

const CommentSchema = z.object({
  author: z.string(),
  date: z.string().datetime(),
  text: z.string(),
  type: z.enum(['human', 'agent']),
});

const BaseItemSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  createdAt: z.string().datetime(),
  createdBy: z.string(),
  description: z.string(),
  schemaVersion: z.number().int().default(1),
  parentId: z.string().uuid().nullable().default(null),
  comments: z.array(CommentSchema).default([]),
});

const ObjectiveSchema = BaseItemSchema.extend({
  status: z.enum(['proposed', 'accepted', 'achieved']),
  statusQuo: z.string().optional(),
  constraints: z.array(z.string()).default([]),
  functionalRequirements: z.array(z.string()).default([]),
  nonfunctionalRequirements: z.array(z.string()).default([]),
  desiredOutcome: z.string().optional(),
  children: z.array(z.string().uuid()).default([]), // derived
});

const KeyResultSchema = BaseItemSchema.extend({
  status: z.enum(['aspirational', 'achieved']),
  resultMeasure: z.string().optional(),
  goalParameters: z.record(z.unknown()).default({}),
  estimationHistory: z.array(z.object({
    date: z.string().datetime(),
    spRemaining: z.number(),
    estimator: z.string(),
  })).default([]),
  children: z.array(z.string().uuid()).default([]), // derived
});

const TaskSchema = BaseItemSchema.extend({
  status: z.enum(['to-do', 'in-progress', 'done']),
  assignee: z.object({
    email: z.string().email(),
    github: z.string().optional(),
  }).nullable().default(null),
  estimationHistory: z.array(z.object({
    date: z.string().datetime(),
    spRemaining: z.number(),
    estimator: z.string(),
  })).default([]),
});
```

### Index.json Structure
```typescript
// index.json maps UUID → relative path from .7even/
{
  "550e8400-e29b-41d4-a716-446655440000": "proposed/improve-signup-conversion/objective.json",
  "6ba7b810-9dad-11d1-80b4-00c04fd430c8": "proposed/improve-signup-conversion/aspirational/increase-trial-rate/kr.json",
  "f47ac10b-58cc-4372-a567-0e02b2c3d479": "proposed/improve-signup-conversion/aspirational/increase-trial-rate/to-do/add-social-login.json"
}
```

### Directory Structure Example
```
.7even/
  index.json
  proposed/
    improve-signup-conversion/
      objective.json
      aspirational/
        increase-trial-rate/
          kr.json
          to-do/
            add-social-login.json
            optimize-landing-page.json
          in-progress/
            run-ab-tests.json
  accepted/
    reduce-churn/
      objective.json
      ...
```

### Git Author from Config
```typescript
import { execSync } from 'node:child_process';

function getGitAuthor(): { name: string; email: string } {
  const name = execSync('git config user.name', { encoding: 'utf-8' }).trim();
  const email = execSync('git config user.email', { encoding: 'utf-8' }).trim();
  if (!name || !email) throw new Error('Git user.name and user.email must be configured');
  return { name, email };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `uuid` npm package | `crypto.randomUUID()` | Node 19 (2022) | No external dependency needed |
| CommonJS CLI tools | ESM with tsup bundling | 2023+ | Better tree-shaking, modern imports |
| chalk v4 (CJS) | chalk v5 (ESM-only) | 2022 | Must use ESM or bundle with tsup |
| `fs.writeFileSync` | `fs/promises` async | Always available | Non-blocking I/O, better for concurrent operations |

**Deprecated/outdated:**
- `uuid` package: unnecessary when targeting Node 19+ (use `crypto.randomUUID()`)
- `commander` v8/v9: v15 has much better TypeScript support and async actions

## Open Questions

1. **Node.js minimum version**
   - What we know: `crypto.randomUUID()` requires Node 19+; project is an npm module
   - What's unclear: What minimum Node version to target
   - Recommendation: Target Node 20 LTS (current LTS). Set `"engines": { "node": ">=20" }` in package.json

2. **ESM vs CJS module format**
   - What we know: chalk v5 is ESM-only; Commander v15 supports both
   - What's unclear: Whether consumers of this package need CJS
   - Recommendation: Build as ESM (`"type": "module"` in package.json), use tsup to produce both ESM and CJS dist if needed. CLI entry point can be ESM.

3. **Pre-commit hook installation**
   - What we know: User wants git pre-commit hook for validation
   - What's unclear: Whether to auto-install hooks or require manual setup
   - Recommendation: `npx 7 init` could optionally install a pre-commit hook. Use simple shell script in `.git/hooks/pre-commit` rather than husky dependency.

## Sources

### Primary (HIGH confidence)
- Node.js built-in modules documentation — crypto, fs, path, child_process
- npm registry — verified current versions of commander (15.0.0), zod (4.4.3), chalk (5.6.2)

### Secondary (MEDIUM confidence)
- Commander.js subcommand patterns — based on established API (stable since v7+)
- Zod schema patterns — widely used, stable API

### Tertiary (LOW confidence)
- None — all findings verified against npm registry or Node.js docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified current, well-established
- Architecture: HIGH — standard CLI + JSON file patterns, well-understood domain
- Pitfalls: HIGH — common issues with file-based storage and git operations are well-documented

**Research date:** 2026-05-29
**Valid until:** 2026-06-28 (stable domain, 30 days)
