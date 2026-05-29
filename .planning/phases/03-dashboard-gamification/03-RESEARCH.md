# Phase 3: Dashboard & Gamification - Research

**Researched:** 2026-05-29
**Domain:** Local web dashboard (React + Vite), data visualization, gamification
**Confidence:** HIGH

## Summary

Phase 3 builds a local-only web dashboard that reads `.7even/` JSON data and visualizes it as a kanban board, Gantt timeline, burndown/velocity charts, and achievement system. The existing codebase is a Node.js CLI tool (TypeScript, ESM, Zod schemas, tsup build). The dashboard is a separate Vite+React frontend app that consumes data via a lightweight local API server.

The architecture splits into: (1) a data API layer that aggregates `.7even/` JSON into dashboard-ready shapes (velocity, burndown series, commit metrics), (2) a React SPA with react-router for multi-page navigation, (3) Recharts for all chart types, and (4) a plugin badge module system using dynamic imports.

**Primary recommendation:** Use React 19 + Vite 6 + React Router 7 + Recharts 2 + TanStack Table. Serve via `npx 7 dashboard` which spawns a Vite dev server with a simple Express/Hono API middleware for reading `.7even/` data.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Multi-page layout with URL routes (browser back/forward works)
- Left sidebar navigation with LCARS-inspired blocky colored surfaces
- Three main pages: **Project Timeline** (O/KR Gantt), **Tasks Board** (KR-lane kanban), **Achieved Objectives** (hall of fame)
- Project Timeline: objectives as expandable rows, KRs as nested bars, horizontal time axis
- Tasks Board: each KR has its own lane, tasks populate within KR lanes, achieved KRs are collapsed
- Achieved Objectives: hall-of-fame style page with achievements and badges associated to people
- Task detail: slide-in panel from right with LCARS-style vertical divider for quick nav of all tasks in that KR
- Interactive charts with hover tooltips, zoom, pan
- Burndown: both per-KR and per-objective, toggle between them. Ideal line vs actual.
- Gantt: integrated into Project Timeline page (not a separate charts page)
- Velocity/ETA: persistent widget summary in sidebar/header + dedicated drill-down analytics page
- **Loosely** LCARS-inspired — not cosplay. Modern, sleek, blocky.
- Warm pastels on near-black background. Broad palette.
- Each objective gets a primary color; associated KRs get derived shades of that color
- Modern sans-serif font (not LCARS typography). All Caps for buttons.
- No rounded corners anywhere. Sharp edges.
- 3px wide vertical and horizontal bars as decorative elements. 3x3px squares.
- Decorations placed off-center, aligned to top-left padding of elements
- Full framing treatment: page borders, section frames, card corners, dividers, headers
- Dark-on-light mode for detail panels and expanded views (slide-in panels, modals, expanded card content)
- Light-on-dark for navigation, action surfaces, board backgrounds
- Task cards: color block on left side, width scales with SP estimate (visual cue for complexity)
- Remaining estimate displayed in bottom-left corner of task cards with 3px margins
- Plugin badge modules: badge definitions as modules that export check functions
- Motivational level: badges + achievement timeline + progress bars. Not childish, not RPG.
- Achievement notifications: sidebar indicator that pulses until clicked. No interrupting toasts.
- Hall of fame: achievement timeline (when badges earned + associated O/KRs) + per-person badge showcase
- Custom badges defined by users via plugin modules

### Claude's Discretion
- Specific chart library choice
- Web framework for local dashboard
- Dev server implementation
- Plugin badge module API shape
- Exact color values for warm pastel palette
- Animation/transition details
- Responsive breakpoints

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Local dev server (Vite-based) serving the dashboard | Vite 6 dev server, `npx 7 dashboard` CLI command spawns it |
| DASH-02 | Kanban board view showing all O/KR/tasks by status | React DnD not needed (read-only board), CSS grid KR-lane layout |
| DASH-03 | LCARS-inspired pastel-on-dark design | CSS custom properties for palette, `border-radius: 0` globally |
| DASH-04 | Color-coded remaining SP estimates in dashboard views | Estimation data from `task.estimationHistory`, color block width on cards |
| DASH-05 | Burndown chart visualization at KR level | Recharts AreaChart with ideal vs actual lines, computed from estimation history |
| DASH-06 | Velocity and ETA projection charts | Rolling velocity from completed SP + dates, linear projection |
| DASH-07 | Gantt-chart-like timeline view for O/KR/task hierarchy | Custom Gantt component using SVG or div-based bars (Recharts doesn't do Gantt) |
| DASH-08 | Task detail view with inline comments and git commit history | Slide-in panel, API calls `getTaskCommits()` and reads task JSON comments |
| DASH-09 | Commit frequency/size and weighted PR metric visualizations | Git log parsing for frequency/size; PR metrics from `git log --merges` |
| DASH-10 | Assignee view showing who is working on what | Group tasks by `assignee.email`, render per-person task lists |
| EST-04 | Velocity calculation from completed SP and dates | New `velocity.ts` module: completed SP / time windows |
| EST-05 | Burndown charts at KR level | Aggregate task estimation histories within KR children |
| EST-06 | Timeline projection: ETA from rolling velocity | Linear extrapolation from remaining SP / avg velocity |
| EST-07 | Gantt view for O/KR/tasks | Date ranges from createdAt + estimation history + completion dates |
| EST-08 | Commit frequency and size metrics | `git log --format` parsing, group by task UUID |
| EST-09 | Weighted PR metrics | `git log --merges` parsing, additions/deletions per task |
| GAME-01 | Badge system with visual display | Badge definitions + earned state stored in `.7even/badges/` |
| GAME-02 | Achievement system triggered by milestones | Badge checker functions evaluate project state |
| GAME-03 | Pluggable architecture for custom badges | Dynamic import of user badge modules from `.7even/badges/custom/` |
| GAME-04 | Productivity game aesthetic throughout UI | LCARS design + progress bars + achievement indicators in sidebar |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | UI framework | Dominant ecosystem, excellent DevTools, large component ecosystem |
| Vite | 6.x | Dev server + bundler | Already in project devDeps (vitest uses it), fastest DX |
| React Router | 7.x | Client-side routing | Standard for React SPAs, supports browser history |
| Recharts | 2.x | Charts (burndown, velocity, bar) | React-native composable charts, built on D3, easy customization |
| TypeScript | 6.x | Type safety | Already used in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Hono | 4.x | Lightweight API server | Serve `.7even/` data to frontend; tiny, fast, TypeScript-native |
| @tanstack/react-table | 8.x | Table rendering | Assignee views, data tables if needed |
| date-fns | 4.x | Date manipulation | Velocity windows, Gantt date math, burndown x-axis |
| oklch color functions | (CSS native) | Color derivation | Objective→KR color shade derivation using CSS `oklch()` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | D3 directly | More power but 5x more code; Recharts wraps D3 already |
| Recharts | Chart.js + react-chartjs-2 | Less composable in React, imperative API |
| Hono | Express | Heavier, more dependencies; Hono is <15KB |
| React | Svelte | Smaller bundle but ecosystem lock-in; React has more charting libs |
| React Router | TanStack Router | Newer, less mature; React Router is battle-tested |

**Installation:**
```bash
npm install react react-dom react-router recharts hono date-fns @tanstack/react-table
npm install -D @types/react @types/react-dom @vitejs/plugin-react
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli/                 # Existing CLI
├── core/                # Existing core logic
├── dashboard/           # NEW: Dashboard app
│   ├── api/             # Hono API routes (reads .7even/)
│   │   ├── server.ts    # Hono app with routes
│   │   └── routes/      # /objectives, /tasks, /metrics, /badges
│   ├── app/             # React SPA
│   │   ├── main.tsx     # Entry point
│   │   ├── router.tsx   # React Router config
│   │   ├── layouts/     # Sidebar layout, LCARS frame
│   │   ├── pages/       # Timeline, Board, Achievements, Analytics
│   │   ├── components/  # Charts, cards, panels, badges
│   │   ├── hooks/       # useData, useMetrics, useBadges
│   │   └── styles/      # CSS custom properties, LCARS theme
│   └── vite.config.ts   # Dashboard-specific Vite config
├── metrics/             # NEW: Velocity, burndown, commit metrics logic
│   ├── velocity.ts      # EST-04: SP/time calculations
│   ├── burndown.ts      # EST-05: KR-level burndown series
│   ├── projection.ts    # EST-06: ETA from rolling velocity
│   ├── gantt.ts         # EST-07: Date range computation
│   └── git-metrics.ts   # EST-08, EST-09: Commit/PR stats
└── types/               # Existing types
```

### Pattern 1: Data Flow — File System → API → React
**What:** Dashboard reads `.7even/` via a Hono API, not directly from the filesystem.
**When to use:** Always. Browser can't read local files; need a server.
**Example:**
```typescript
// src/dashboard/api/routes/objectives.ts
import { Hono } from "hono";
import { readIndex } from "../../../core/index-manager.js";
import { readItem } from "../../../core/storage.js";

const app = new Hono();

app.get("/api/objectives", async (c) => {
  const sevenDir = c.get("sevenDir");
  const index = await readIndex(sevenDir);
  const objectives = [];
  for (const [id, path] of Object.entries(index)) {
    if (path.includes("objective.json")) {
      const { data } = await readItem(sevenDir, id);
      objectives.push({ id, ...data });
    }
  }
  return c.json(objectives);
});
```

### Pattern 2: LCARS Color System with CSS Custom Properties
**What:** Define objective colors as CSS custom properties, derive KR shades using `oklch()`.
**When to use:** All colored elements.
**Example:**
```css
:root {
  --bg-primary: #0a0a0f;
  --bg-surface: #14141f;
  --text-primary: #e8e0d4;
  
  /* Warm pastel palette — one per objective */
  --color-obj-0: oklch(0.75 0.12 30);   /* warm coral */
  --color-obj-1: oklch(0.75 0.12 60);   /* warm amber */
  --color-obj-2: oklch(0.75 0.12 150);  /* sage green */
  --color-obj-3: oklch(0.75 0.12 240);  /* soft blue */
  --color-obj-4: oklch(0.75 0.12 300);  /* lavender */
  --color-obj-5: oklch(0.75 0.12 350);  /* rose */
}

/* KR shade derivation: lower lightness */
.kr-shade-1 { color: oklch(from var(--obj-color) calc(l - 0.08) c h); }
.kr-shade-2 { color: oklch(from var(--obj-color) calc(l - 0.16) c h); }

/* Global: no rounded corners */
* { border-radius: 0 !important; }

/* LCARS decorative bars */
.lcars-bar-h { height: 3px; background: currentColor; }
.lcars-bar-v { width: 3px; background: currentColor; }
.lcars-dot { width: 3px; height: 3px; background: currentColor; }
```

### Pattern 3: Gantt Chart as Custom Component
**What:** Recharts doesn't support Gantt natively. Build with div-based horizontal bars.
**When to use:** Project Timeline page.
**Example:**
```tsx
function GanttBar({ start, end, total, color, label }: GanttBarProps) {
  const leftPct = (start / total) * 100;
  const widthPct = ((end - start) / total) * 100;
  return (
    <div
      style={{
        position: "absolute",
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        height: "24px",
        background: color,
      }}
    >
      <span>{label}</span>
    </div>
  );
}
```

### Pattern 4: Badge Plugin System
**What:** Badge definitions as JS/TS modules exporting a check function.
**When to use:** GAME-01 through GAME-04.
**Example:**
```typescript
// Badge module interface
interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji or SVG path
  check: (state: ProjectState) => boolean;
}

// Built-in badge example
export default {
  id: "first-blood",
  name: "First Blood",
  description: "Complete your first task",
  icon: "⚔️",
  check: (state) => state.tasks.some(t => t.status === "done"),
} satisfies BadgeDefinition;

// User custom badges loaded from .7even/badges/custom/*.js
async function loadCustomBadges(sevenDir: string): Promise<BadgeDefinition[]> {
  const customDir = join(sevenDir, "badges", "custom");
  const files = await glob("*.js", { cwd: customDir });
  return Promise.all(files.map(f => import(join(customDir, f))));
}
```

### Anti-Patterns to Avoid
- **Filesystem access from React:** Browser can't read files. Always go through API.
- **Polling for data updates:** This is a local tool, not real-time. Load data on page navigation; add manual refresh button.
- **Complex state management (Redux/Zustand):** Data is read-only from API. React Query or simple fetch + useState suffices.
- **Rounded corners anywhere:** LCARS design explicitly forbids them.
- **Toast notifications for achievements:** User specified sidebar pulse indicator only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart rendering | Custom SVG chart engine | Recharts | Handles axes, tooltips, responsive sizing, zoom |
| Date math | Manual date arithmetic | date-fns | Time zones, intervals, formatting edge cases |
| HTTP server | Raw Node http module | Hono | Routing, middleware, TypeScript types in <15KB |
| Color manipulation | RGB math | CSS oklch() | Perceptually uniform, browser-native, no JS needed |
| Drag-and-drop kanban | Custom mouse event handling | Not needed (read-only) | Board is display-only; status changes via CLI |

**Key insight:** The dashboard is read-only — it visualizes data managed by the CLI. This eliminates entire categories of complexity (forms, validation, optimistic updates, write conflict handling).

## Common Pitfalls

### Pitfall 1: Vite Config Collision with Existing tsup Build
**What goes wrong:** Dashboard Vite config interferes with existing CLI tsup build.
**Why it happens:** Both tools might try to resolve the same TypeScript paths.
**How to avoid:** Dashboard gets its own `vite.config.ts` in `src/dashboard/` with explicit `root` setting. CLI build (tsup) is unchanged. Add a `dashboard` script to package.json that points to the dashboard Vite config.
**Warning signs:** `tsup` builds start failing after adding Vite.

### Pitfall 2: Serving API and SPA from Same Port
**What goes wrong:** API routes and SPA routes collide.
**Why it happens:** Both need to handle `GET /`.
**How to avoid:** Use Vite's `server.proxy` or Hono as Vite middleware. API routes all prefixed with `/api/`. SPA handles all other routes.
**Warning signs:** 404s on page refresh, API calls returning HTML.

### Pitfall 3: Gantt Timeline Without Real Dates
**What goes wrong:** Tasks only have `createdAt` — no explicit start/end dates.
**Why it happens:** OKR model tracks estimation history, not calendar scheduling.
**How to avoid:** Derive timeline from: `createdAt` as start, estimated completion from velocity projection as end. For done tasks, use last estimation history entry date or commit date.
**Warning signs:** Gantt bars all starting at the same point.

### Pitfall 4: Color Assignment Stability
**What goes wrong:** Objective colors change when objectives are added/removed.
**Why it happens:** Assigning colors by array index.
**How to avoid:** Hash the objective UUID to a palette index, or store color assignment in objective metadata. Hash approach is simpler and stable.
**Warning signs:** Dashboard colors shift between page loads.

### Pitfall 5: Large Repos — Index Scan Performance
**What goes wrong:** Dashboard is slow for repos with many items.
**Why it happens:** Reading every JSON file on every API call.
**How to avoid:** Cache parsed data in memory on the API server, invalidate on file change (fs.watch on `.7even/`). Don't pre-optimize — start simple, add caching if needed.
**Warning signs:** >1s page load times.

## Code Examples

### Velocity Calculation (EST-04)
```typescript
// src/metrics/velocity.ts
import type { Task } from "../types/index.js";

interface VelocityWindow {
  start: string; // ISO date
  end: string;
  completedSp: number;
  taskCount: number;
}

export function calculateVelocity(
  doneTasks: Task[],
  windowDays: number = 7
): VelocityWindow[] {
  // Group done tasks by completion date (last estimation entry or status change)
  const completed = doneTasks
    .filter(t => t.status === "done" && t.estimationHistory.length > 0)
    .map(t => ({
      date: t.estimationHistory[0].date, // first estimate = initial SP
      sp: t.estimationHistory[0].spRemaining,
      completedDate: t.estimationHistory.at(-1)!.date,
    }))
    .sort((a, b) => a.completedDate.localeCompare(b.completedDate));

  // Bucket into windows and sum SP
  // ... implementation
  return [];
}
```

### Burndown Series (EST-05)
```typescript
// src/metrics/burndown.ts
import type { Task } from "../types/index.js";

interface BurndownPoint {
  date: string;
  remaining: number;
  ideal: number;
}

export function computeBurndown(tasks: Task[], startDate: string): BurndownPoint[] {
  // Collect all estimation history entries across tasks
  // Sort by date, compute running total of remaining SP
  // Ideal line: linear from initial total to 0
  const allEstimates = tasks
    .flatMap(t => t.estimationHistory.map(e => ({ ...e, taskId: t.id })))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ... reduce into BurndownPoint[]
  return [];
}
```

### Dashboard Launch Command
```typescript
// Added to CLI: npx 7 dashboard
import { createServer } from "vite";

async function launchDashboard(sevenDir: string, port = 7777) {
  const server = await createServer({
    configFile: resolve(__dirname, "../dashboard/vite.config.ts"),
    server: { port, open: true },
  });
  await server.listen();
  console.log(`Dashboard: http://localhost:${port}`);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Create React App | Vite | 2023+ | CRA deprecated, Vite is standard |
| D3 for everything | Recharts/Nivo for common charts, D3 for custom | 2022+ | Less boilerplate for standard charts |
| CSS-in-JS (styled-components) | CSS Modules / vanilla CSS + custom properties | 2024+ | Better performance, simpler tooling |
| Express for everything | Hono/Elysia for lightweight servers | 2024+ | Smaller, faster, better TypeScript |
| RGB/HSL color spaces | oklch() for perceptual uniformity | 2024+ | Better color derivation, CSS-native |

**Deprecated/outdated:**
- Create React App: deprecated, do not use
- Webpack for new projects: Vite is faster and simpler
- styled-components: performance concerns, CSS custom properties preferred

## Open Questions

1. **Commit metrics data source**
   - What we know: `getTaskCommits()` greps git log for `task: <uuid>`. Returns hash, date, message.
   - What's unclear: How to get additions/deletions/file count per commit efficiently for EST-08/EST-09.
   - Recommendation: Use `git log --format="%H" | xargs git show --stat` or `git log --numstat`. Cache results aggressively — git log is expensive.

2. **Badge persistence**
   - What we know: Badges need to be computed and displayed. User wants plugin modules.
   - What's unclear: Whether earned badges should be stored (persisted) or recomputed on each dashboard load.
   - Recommendation: Store earned badges in `.7even/badges/earned.json` with timestamps. Recomputing on every load is wasteful and loses "when earned" data.

3. **Gantt date ranges**
   - What we know: Items have `createdAt` but no explicit start/end dates.
   - What's unclear: Best way to derive meaningful Gantt bars.
   - Recommendation: Start = `createdAt`, End = projected completion (velocity-based) for active items, actual completion date for done items. Accept that bars may be approximate.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `src/core/schemas/`, `src/core/storage.ts`, `src/core/estimation.ts`, `src/core/git.ts` — direct inspection of data shapes and available functions
- Vite documentation — dev server API, middleware mode, proxy configuration
- React Router v7 — routing patterns for SPA
- Recharts — composable chart API

### Secondary (MEDIUM confidence)
- Hono framework — lightweight API server patterns (well-established, 40K+ GitHub stars)
- oklch() CSS color function — browser support (baseline 2024)

### Tertiary (LOW confidence)
- Gantt implementation patterns — no standard React Gantt library is dominant; custom div-based approach is most common recommendation but specific patterns vary

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — React/Vite/Recharts are well-established, dominant choices
- Architecture: HIGH — file→API→SPA pattern is straightforward and proven
- Pitfalls: HIGH — based on direct codebase analysis of data shapes and constraints
- Gantt implementation: MEDIUM — no great library exists, custom approach needed
- Badge plugin system: MEDIUM — pattern is clear but API shape needs iteration during implementation

**Research date:** 2026-05-29
**Valid until:** 2026-06-28 (stable domain, 30 days)
