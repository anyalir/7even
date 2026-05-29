# Phase 3: Dashboard & Gamification - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Local web dashboard visualizing all OKR data — kanban board, burndown/velocity/Gantt charts, task detail with git history, badges/achievements, and LCARS-inspired pastel-on-dark design. Users launch a local dev server and interact with their project data visually.

</domain>

<decisions>
## Implementation Decisions

### Dashboard layout & navigation
- Multi-page layout with URL routes (browser back/forward works)
- Left sidebar navigation with LCARS-inspired blocky colored surfaces
- Three main pages: **Project Timeline** (O/KR Gantt), **Tasks Board** (KR-lane kanban), **Achieved Objectives** (hall of fame)
- Project Timeline: objectives as expandable rows, KRs as nested bars, horizontal time axis
- Tasks Board: each KR has its own lane, tasks populate within KR lanes, achieved KRs are collapsed
- Achieved Objectives: hall-of-fame style page with achievements and badges associated to people
- Task detail: slide-in panel from right with LCARS-style vertical divider for quick nav of all tasks in that KR

### Chart style & interactivity
- Interactive charts with hover tooltips, zoom, pan
- Burndown: both per-KR and per-objective, toggle between them. Ideal line vs actual.
- Gantt: integrated into Project Timeline page (not a separate charts page)
- Velocity/ETA: persistent widget summary in sidebar/header + dedicated drill-down analytics page

### LCARS visual identity
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

### Gamification feel
- Plugin badge modules: badge definitions as modules that export check functions
- Motivational level: badges + achievement timeline + progress bars. Not childish, not RPG.
- Achievement notifications: sidebar indicator that pulses until clicked. No interrupting toasts.
- Hall of fame: achievement timeline (when badges earned + associated O/KRs) + per-person badge showcase
- Custom badges defined by users via plugin modules

### Claude's Discretion
- Specific chart library choice (D3, Chart.js, Recharts, etc.)
- Web framework for local dashboard (React, Svelte, vanilla, etc.)
- Dev server implementation (Vite, custom, etc.)
- Plugin badge module API shape
- Exact color values for warm pastel palette
- Animation/transition details
- Responsive breakpoints (if any — this is a local tool)

</decisions>

<specifics>
## Specific Ideas

- Task card SP visualization: dynamic-width color block on left edge — bigger block = bigger task. Not heatmap colors, spatial size.
- Slide-in detail panel has LCARS-style vertical divider doubling as task quick-nav for the parent KR
- Objective colors propagate to KR shades — creates visual grouping across all views
- 3px decorative bars and 3x3 squares are the signature visual element — use consistently at top-left padding alignment
- Dark-on-light only for content-heavy detail areas, never for navigation or boards

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-dashboard-gamification*
*Context gathered: 2026-05-29*
