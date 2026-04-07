# AI Arms Race Dashboard — Project Context

## What This Is
A React + Vite dashboard tracking the AI infrastructure race — compute buildout, power capacity, frontier model benchmarks, and METR time horizons across the top 5 AI labs. TypeScript throughout. Deployed on GitHub Pages.

**Live URL:** https://adi-wasserman.github.io/ai-arms-race/
**Repo:** https://github.com/Adi-Wasserman/ai-arms-race

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Framework** | React 18 + TypeScript | Largest ecosystem for charting/mapping; transferable skills |
| **Build** | Vite | Fast HMR, near-zero config, static output for GitHub Pages |
| **State** | Zustand (with slices) | Lightweight store — mirrors existing pub/sub, supports slice pattern for feature isolation |
| **Charting** | Chart.js 4 + react-chartjs-2 | Keeps parity with current charts (annotations, stepped lines, scatter) |
| **Mapping** | Leaflet + react-leaflet | ESRI satellite tiles, lab-colored markers, pulsing animations |
| **CSV parsing** | PapaParse | Epoch AI live data ingestion |
| **Dates** | date-fns + chartjs-adapter-date-fns | Replaces moment.js (~70KB savings, tree-shakeable) |
| **Styling** | CSS Modules (one per component) + global design tokens | Replaces 320 inline styles and minified class names |
| **Deployment** | GitHub Pages via `vite build` → `/dist` | No infra changes from current setup |

### Removed from Legacy
- **Lodash** → native `Array.prototype.sort/filter/reduce`, `Object.groupBy`, `Set`
- **Moment.js** → `date-fns` (tree-shakeable, ~10KB vs ~70KB)
- **CDN script tags** → npm dependencies, bundled by Vite

---

## Architecture Principles

### 1. Feature-Sliced Sections
Each dashboard section (Race, Map, Intel, Models) is a **self-contained feature folder** that owns its components, section-specific hooks, and export logic. Adding a new section means creating one new folder — you never edit existing section code to add a new one.

### 2. Separated Config from Data
- **Config** = structural constants that define how the app works (lab names, colors, benchmark metadata, projection parameters). Changes rarely.
- **Data** = values that update regularly (model scores, facility timelines, fleet estimates, METR measurements). Easy to update without touching app logic.

### 3. Centralized Types
All TypeScript interfaces live in `types/`. Every layer imports from here. No inline type definitions. One source of truth for what a `Facility`, `TimeSeriesPoint`, or `BenchmarkScore` looks like.

### 4. Pure Data Layer
Functions in `services/` are pure: data in, data out, no DOM, no state. They can be tested in isolation and reused by any feature. They don't know about React.

### 5. Thin Chart Abstraction
A shared `BaseChart` wrapper standardizes Chart.js configuration (dark theme defaults, tooltip styling, responsive behavior, export-to-PNG). Individual charts only specify what's unique to them — data and chart-specific options. If you ever swap Chart.js for another library, you change one file.

### 6. Store Slices per Feature
The Zustand store is split into slices — one for each feature plus a shared data slice. Features can read from any slice but only write to their own. This prevents features from accidentally coupling their state.

---

## Project Structure

```
ai-arms-race/
├── index.html                     # Vite entry (minimal — just mounts #root)
├── vite.config.ts
├── tsconfig.json
├── package.json
├── CLAUDE.md                      # ← this file
│
├── public/
│   └── og-image.png
│
├── src/
│   ├── main.tsx                   # ReactDOM.createRoot, register Chart.js plugins, mount <App />
│   ├── App.tsx                    # Layout shell: Nav + DataBanner + section components
│   │
│   │
│   │  ┌─────────────────────────────────────────────────────────────────┐
│   │  │  FOUNDATION LAYERS (shared across all features)                │
│   │  └─────────────────────────────────────────────────────────────────┘
│   │
│   ├── types/                     # ── Centralized TypeScript interfaces
│   │   ├── lab.ts                 # Lab, LabColor, LabChip
│   │   ├── facility.ts           # Facility, FacilityStatus, Coordinates, TimelineEntry
│   │   ├── timeseries.ts         # TimeSeriesPoint, SeriesData, LeadChange
│   │   ├── projection.ts         # ProjectionTarget, ProjectionPoint, UncertaintyBand
│   │   ├── benchmark.ts          # Model, BenchmarkMeta, BenchmarkScore, Domain
│   │   ├── metr.ts               # MetrDataPoint, MetrHorizon
│   │   └── index.ts              # Re-exports everything
│   │
│   ├── config/                    # ── Structural constants (RARELY changes)
│   │   ├── labs.ts               # LAB_NAMES, LAB_COLORS, LAB_CHIPS — who the 5 labs are
│   │   ├── benchmarks.ts         # BENCHMARK_META (name, domain, description), DOMAIN_GROUPS
│   │   ├── projections.ts        # PROJ_END, PROJ_UNCERTAINTY, EASE_OUT_EXPONENT
│   │   ├── signals.ts            # CONSTRUCTION_SIGNALS: emoji → meaning → significance
│   │   └── map.ts                # Default map center, zoom, tile URLs, region presets
│   │
│   ├── data/                      # ── Values that UPDATE regularly (quarterly/monthly)
│   │   ├── facilities.ts         # FACILITY_COORDS, LAB_MAP (handle→lab for 22 sites)
│   │   ├── timeline.ts           # RAW_TIMELINE: 65 rows of hardcoded fallback timeline data
│   │   ├── fleet.ts              # FLEET_ESTIMATES: cloud-lease capacity (EGC, EAI-AWS/GCP/AZR)
│   │   ├── models.ts             # MODEL_SPECS: 5 frontier models with 10+ benchmark scores
│   │   ├── metr.ts               # METR_HORIZONS: 21 data points for METR TH1.1
│   │   ├── projections.ts        # PROJ_2029_TARGETS, ANALYST_ESTIMATES per lab
│   │   └── index.ts              # Re-exports everything
│   │
│   ├── services/                  # ── Pure functions (no DOM, no React, no state mutation)
│   │   ├── timeseries.ts         # buildTimeSeries, detectLeadChanges
│   │   ├── velocity.ts           # buildVelocitySeries (trailing 12-month annualized)
│   │   ├── projections.ts        # buildProjections2029 (ease-out interpolation + uncertainty)
│   │   ├── confidence.ts         # scoreConfidence (0-100 per data center)
│   │   ├── observations.ts       # extractObservations (satellite signal badges)
│   │   ├── classify.ts           # classifyLab, classifyByHandle (Epoch CSV → lab mapping)
│   │   ├── epoch.ts              # fetchEpoch, fetchWithFallback, parseEpochData, buildFallbackData
│   │   └── export.ts             # exportCSV, exportJSON, downloadBlob — generic helpers
│   │
│   ├── store/                     # ── Zustand store with feature slices
│   │   ├── index.ts              # Combined store: createStore with all slices merged
│   │   ├── slices/
│   │   │   ├── dataSlice.ts      # Shared data: dataCenters, timeline, series, loading/error state
│   │   │   ├── raceSlice.ts      # metric, scope, projMode, velocityMode, hoveredLab
│   │   │   ├── intelSlice.ts     # labFilter, statusFilter, sortBy, expandedDC
│   │   │   ├── modelsSlice.ts    # selectedModels, scatterView
│   │   │   └── mapSlice.ts       # region, selectedFacility
│   │   └── selectors.ts          # Derived selectors: activeSeries(), activeProj(), getValue()
│   │
│   ├── styles/                    # ── Global design system
│   │   ├── tokens.css            # CSS custom properties: colors, fonts, spacing, transitions
│   │   ├── reset.css             # Box-sizing, margin reset, scroll-behavior
│   │   └── typography.css        # Font stacks, monospace number styling, heading gradients
│   │
│   │
│   │  ┌─────────────────────────────────────────────────────────────────┐
│   │  │  SHARED COMPONENTS (used by multiple features)                 │
│   │  └─────────────────────────────────────────────────────────────────┘
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Nav.tsx            # Fixed nav bar with section links + active scroll highlighting
│   │   │   ├── Nav.module.css
│   │   │   ├── DataBanner.tsx     # Live/stale data status bar + refresh button
│   │   │   └── DataBanner.module.css
│   │   │
│   │   ├── charts/
│   │   │   ├── BaseChart.tsx      # Thin Chart.js wrapper: dark theme, responsive, tooltip styling
│   │   │   ├── BaseChart.module.css
│   │   │   └── useChartExport.ts  # Composite canvas → PNG (title + subtitle + legend + chart)
│   │   │
│   │   └── ui/                    # Reusable UI primitives
│   │       ├── Toggle.tsx         # Button group toggle (replaces .T pattern)
│   │       ├── Toggle.module.css
│   │       ├── Pill.tsx           # Filter pill (replaces .P pattern)
│   │       ├── Pill.module.css
│   │       ├── ExportMenu.tsx     # CSV / JSON / PNG export dropdown
│   │       ├── ExportMenu.module.css
│   │       ├── SatelliteTile.tsx  # ESRI satellite image tile (shared by map + drawer)
│   │       ├── ConfidenceBar.tsx  # Inline confidence indicator
│   │       ├── ObservationBadge.tsx # Signal badge (pos/neg)
│   │       ├── SectionShell.tsx   # Standard section wrapper: title + subtitle + content
│   │       ├── ErrorBoundary.tsx  # Per-section error isolation
│   │       └── *.module.css
│   │
│   │
│   │  ┌─────────────────────────────────────────────────────────────────┐
│   │  │  FEATURE FOLDERS (each section is self-contained)              │
│   │  └─────────────────────────────────────────────────────────────────┘
│   │
│   ├── features/
│   │   ├── race/                  # ── THE RACE section (#race)
│   │   │   ├── RaceSection.tsx    # Container: toggles + chart + leaderboard + projection panel
│   │   │   ├── RaceChart.tsx      # Chart.js time series (absolute / velocity / 2029 projection)
│   │   │   ├── StatCards.tsx      # Dynamic key findings bar
│   │   │   ├── Leaderboard.tsx    # WHO'S WINNING sidebar + analyst cross-checks
│   │   │   ├── ProjectionPanel.tsx # APR 2026 → JAN 2029 comparison table
│   │   │   ├── useRaceExport.ts   # Section-specific: exportRaceCSV, exportRaceJSON, exportRacePNG
│   │   │   └── *.module.css
│   │   │
│   │   ├── map/                   # ── GEO MAP section (#geomap)
│   │   │   ├── MapSection.tsx     # Container: map + preview panel + region buttons
│   │   │   ├── GeoMap.tsx         # react-leaflet: ESRI tiles, Carto labels, lab-colored markers
│   │   │   ├── MapPreview.tsx     # Satellite preview sidebar
│   │   │   ├── LabMarker.tsx      # Custom pulsing marker component
│   │   │   └── *.module.css
│   │   │
│   │   ├── intel/                 # ── INTEL section (#sites)
│   │   │   ├── IntelSection.tsx   # Container: filters + table + drawer
│   │   │   ├── IntelTable.tsx     # Sortable facility table
│   │   │   ├── FacilityDrawer.tsx # Slide-out: satellite hero + timeline stepper
│   │   │   ├── SignalLegend.tsx   # Toggleable construction signal legend
│   │   │   ├── useIntelExport.ts  # exportIntelCSV
│   │   │   └── *.module.css
│   │   │
│   │   └── models/                # ── MODELS section (#models)
│   │       ├── ModelsSection.tsx  # Container: scatter + benchmarks + METR
│   │       ├── ScatterPlot.tsx    # Compute vs Performance (H100e × AA Index × GW bubble)
│   │       ├── BenchmarkTable.tsx # Interactive head-to-head (2-3 models, gold/silver/bronze)
│   │       ├── MetrChart.tsx      # METR Time Horizons scatter (exponential trend)
│   │       ├── useModelsExport.ts # exportModelCSV, exportScatterPNG, exportMetrPNG
│   │       └── *.module.css
│   │
│   │
│   │  ┌─────────────────────────────────────────────────────────────────┐
│   │  │  APP-LEVEL HOOKS (cross-cutting concerns)                      │
│   │  └─────────────────────────────────────────────────────────────────┘
│   │
│   └── hooks/
│       ├── useHashState.ts        # URL hash ↔ Zustand sync (parseHash, pushHash)
│       └── useEpochData.ts        # Fetch → parse → fallback → hydrate store on mount
│
└── .github/
    └── workflows/
        └── deploy.yml             # GitHub Actions: install → build → deploy to Pages
```

---

## Architecture Decisions

### Feature-Sliced Organization
Each section under `features/` owns everything it needs: components, section-specific hooks, export logic, and styles. The dependency flow is strictly **downward**:

```
features/*  →  components/*  →  (nothing)
    ↓              ↓
  store/       services/
    ↓              ↓
  types/        config/  +  data/
```

**A feature may import from:** types, config, data, services, store, components.
**A feature must NEVER import from:** another feature.

This means you can add, remove, or completely redesign a section without ripple effects. If you want to add a "Power Grid Analysis" section in 6 months, you create `features/power/` and wire it into `App.tsx` — nothing else changes.

### Config vs Data Separation

**`config/`** — App structure. Answers "what does the app know about?"
- Lab names and colors (the 5 labs exist)
- Benchmark metadata (what benchmarks exist, their domains)
- Projection parameters (ease-out exponent, uncertainty formula)
- Map settings (default center, zoom, tile URLs)

**`data/`** — Updatable values. Answers "what are the current numbers?"
- Model benchmark scores (updated when new models ship)
- Facility coordinates and lab mappings (updated when new sites appear)
- Fleet estimates (updated when cloud deals are announced)
- METR time horizons (updated when new measurements published)
- 2029 projection targets (updated as Epoch revises estimates)

**Why this matters:** When Anthropic announces a new cloud deal or a new model drops, you update files in `data/` and nothing else. The app structure stays untouched.

### Zustand Store Slices

```
store/
├── index.ts           # merges all slices into one store
└── slices/
    ├── dataSlice.ts   # SHARED: fetched data, loading/error state
    ├── raceSlice.ts   # FEATURE: metric, scope, projMode, velocityMode, hoveredLab
    ├── intelSlice.ts  # FEATURE: labFilter, statusFilter, sortBy, expandedDC
    ├── modelsSlice.ts # FEATURE: selectedModels, scatterView
    └── mapSlice.ts    # FEATURE: region, selectedFacility
```

Slices are merged into a single Zustand store but maintain logical boundaries. Each feature reads shared data from `dataSlice` and manages its own UI state in its own slice. Selectors in `selectors.ts` derive computed values (activeSeries, activeProj) from the combined state.

Usage in components:
```tsx
// Feature reads its own slice
const metric = useDashboard(s => s.metric);
const setMetric = useDashboard(s => s.setMetric);

// Feature reads shared data
const series = useDashboard(s => s.seriesFull);
const loading = useDashboard(s => s.loading);
```

### BaseChart Wrapper
All Chart.js instances go through `BaseChart.tsx` which provides:
- Dark theme defaults (background, grid lines, tick colors)
- Responsive container sizing
- Tooltip styling consistent with the dashboard aesthetic
- Ref forwarding for PNG export access
- Cleanup on unmount (prevents Chart.js canvas memory leaks)

Individual chart components pass only what's unique:
```tsx
<BaseChart
  type="line"
  data={chartData}
  options={chartSpecificOptions}
  exportTitle="AI Compute Race"
/>
```

### SectionShell + ErrorBoundary
Every feature section is wrapped in:
```tsx
<ErrorBoundary fallback={<SectionError name="Race" />}>
  <SectionShell id="race" title="THE RACE" subtitle="Compute buildout...">
    <RaceSection />
  </SectionShell>
</ErrorBoundary>
```

This means if the Map section crashes (e.g., ESRI tiles fail), the Race and Models sections keep working. Errors are isolated per section.

### CSS Architecture: Design Tokens + CSS Modules
Three global stylesheets set the design system:

**`tokens.css`** — All design decisions as CSS custom properties:
```css
:root {
  /* Colors */
  --color-bg-deep: #050510;
  --color-bg-surface: rgba(255, 255, 255, 0.015);
  --color-text-primary: #ffffff;
  --color-text-secondary: rgba(255, 255, 255, 0.5);
  --color-border: rgba(255, 255, 255, 0.08);

  /* Lab colors */
  --color-lab-openai: #10a37f;
  --color-lab-gemini: #4285f4;
  /* ... */

  /* Spacing scale */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 28px;
  --space-xl: 40px;

  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'SF Mono', Menlo, monospace;
}
```

**`reset.css`** — Minimal reset (box-sizing, margin, scroll-behavior).
**`typography.css`** — Heading gradients, monospace number styling.

Components use **CSS Modules** (`.module.css` files) that reference tokens:
```css
/* Leaderboard.module.css */
.container {
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  border-radius: 10px;
  padding: var(--space-lg);
}
```

**Why not Tailwind?** The existing design language is bespoke (gradient text, pulsing markers, satellite tiles). Named CSS classes with design tokens give better readability for a project where the visual design is central to the identity.

---

## 2029 Projection Engine

**Power-constrained target model** (unchanged from legacy):

| Lab | Today | 2029 Target | Growth | Basis |
|-----|-------|-------------|--------|-------|
| OpenAI | 1.6M | 12M | ~7.5× | Stargate pipeline + GB200 (Epoch satellite) |
| Gemini | 454K | 9M | ~20× | Epoch satellite (~4M) + Ironwood TPU fleet (~5M) |
| Meta | 761K | 6M | ~7.9× | Epoch satellite only, owned infra |
| xAI | 557K | 2.2M | ~3.9× | Colossus 1+2 (Epoch satellite) |
| Anthropic | 1.8M | 9M | ~5× | Epoch satellite (~2M) + 3-cloud fleet (~7M) |
| **TOTAL** | **5.3M** | **~38M** | **~7×** | |

**Layers:** L1 = Epoch satellite ramps (sourced). L2 = cloud-lease fleet (sourced announcements). No L3 speculative.
**Interpolation:** Ease-out `1-(1-t)^1.8` matching observed deceleration.
**Uncertainty:** ±8% base + 6%/yr → ~±24% by Jan 2029 → range 29M–47M.

## Construction Signals

| Signal | Meaning | Significance |
|--------|---------|-------------|
| 🗼 X towers | Cooling towers visible | Each ≈ 30MW. Count × 30 = power est. |
| ❄️ X units | Air-cooled chillers | Alternative cooling method |
| 🏗️ Complete | Building roof finished | ~5-7 months to operational |
| ⚡ Installed | Backup generators | Nearing power-on |
| 🔌 Connected | Grid substation live | Power flowing |
| 🔥 On-site | Gas turbines | Dedicated on-site power |
| ⚠️ Noted | Delay/pause | Timeline risk flag |

## URL Hash State

| Param | Values | Default |
|-------|--------|---------|
| `metric` | `h100e`, `power` | `h100e` |
| `scope` | `tracked`, `fleet` | `tracked` |
| `proj` | `current`, `2029` | `current` |
| `scatter` | `observed`, `projected` | `observed` |
| `velocity` | `absolute`, `velocity` | `absolute` |
| `lab` | lab name | `ALL` |

---

## 6 Sections (unchanged)

### THE RACE (#race)
Toggles: H100e/POWER · SAT-VERIFIED/+CLOUD-LEASE · CURRENT/2029 PROJECTION · ABSOLUTE/VELOCITY
Side leaderboard with mini scope toggle, 2029 projection per row, analyst cross-checks.
Comparison panel: APR 2026 → JAN 2029 with growth assumptions. Export: CSV/JSON/PNG.

### GEO MAP (#geomap)
Leaflet + ESRI satellite tiles. Lab-colored pins. Pulsing animation for building sites. Region jump (US/UAE). Satellite preview panel.

### INTEL (#sites)
Sortable table: rank, status, site, lab, confidence, power, H100e, cost, signals. Lab + status filters. Drawer with satellite hero + timeline stepper. Signal legend (toggleable). Export: CSV.

### COMPUTE vs PERFORMANCE (within #models)
Scatter: H100e (X) × AA Index (Y). Bubbles sized by GW. OLS trend line + R². Toggle: Observed/Projected. Export: PNG.

### MODELS (#models)
Interactive benchmark table: select 2-3 models → head-to-head wins, derived metrics (AA/GW, AA/100K H100e). Column dimming. Gold/silver/bronze. Export: CSV.

### METR TIME HORIZONS (within #models)
Scatter: 2019-2026, linear Y (hours). 21 data points. Exponential trend. Task annotations. Export: PNG.

---

## Export Module

| Function | Location | Output |
|----------|----------|--------|
| `exportRaceCSV()` | `features/race/useRaceExport.ts` | CSV: time series with scope/projection state |
| `exportRaceJSON()` | `features/race/useRaceExport.ts` | JSON: same as CSV |
| `exportRacePNG()` | `features/race/useRaceExport.ts` | PNG: composite chart |
| `exportIntelCSV()` | `features/intel/useIntelExport.ts` | CSV: facilities with confidence, power, H100e |
| `exportModelsCSV()` | `features/models/useModelsExport.ts` | CSV: benchmark scores per model |
| `exportScatterPNG()` | `features/models/useModelsExport.ts` | PNG: scatter chart |
| `exportMetrPNG()` | `features/models/useModelsExport.ts` | PNG: METR chart |
| `exportCSV()` | `services/export.ts` | Generic CSV builder (shared) |
| `exportJSON()` | `services/export.ts` | Generic JSON builder (shared) |
| `downloadBlob()` | `services/export.ts` | Download trigger (shared) |

---

## Design Principles
- **Feature isolation** — each section is independently renderable, testable, and removable
- **Downward-only dependencies** — features → components → services → types. Never sideways.
- **Config vs data separation** — app structure vs updatable values
- **Dark space aesthetic** — deep navy, monospace numbers, lab-colored accents
- **Satellite-grounded** — ESRI imagery for every facility
- **Source transparency** — every data point traceable to named source
- **Graceful degradation** — fetch failure never breaks the page (fallback data + error boundaries)
- **Power-constrained projections** — targets from Epoch + sourced fleet, not compound growth
- **Type safety** — all data shapes defined in `types/`, no `any`

---

## Known Issues (carried from legacy)

1. **METR data from secondary sources** — some values from LessWrong/OfficeChai, not primary YAML.
2. **ESRI API auth** — unauthenticated satellite tiles, rate-limited under traffic.
3. **METR tooltip stickiness** in 2025-2026 cluster — needs custom tooltip positioning logic.

---

## Migration Roadmap

### P1 — Scaffold + Foundation
- [ ] Initialize React + Vite + TypeScript project
- [ ] Install all dependencies (chart.js, react-chartjs-2, leaflet, react-leaflet, papaparse, date-fns, zustand)
- [ ] Set up folder structure exactly as shown above
- [ ] Create `types/` — all TypeScript interfaces
- [ ] Create `config/` — structural constants
- [ ] Create `data/` — updatable values extracted from CFG
- [ ] Create `styles/` — tokens.css, reset.css, typography.css
- [ ] Create `services/` — pure functions ported from legacy Data layer
- [ ] Create `store/` — Zustand slices + selectors
- [ ] Build `App.tsx` shell + `Nav` + `DataBanner`
- [ ] Wire `useEpochData` hook (fetch + fallback + store hydration)
- [ ] Wire `useHashState` hook (URL hash ↔ store sync)
- [ ] Verify `npm run dev` shows nav + data banner + no errors

### P2 — Port Sections (one at a time, verify visual parity after each)
- [ ] Build `BaseChart` + `useChartExport`
- [ ] Build shared `ui/` components (Toggle, Pill, SectionShell, ErrorBoundary)
- [ ] Port Race section (RaceChart, StatCards, Leaderboard, ProjectionPanel)
- [ ] Port Map section (GeoMap, MapPreview, LabMarker)
- [ ] Port Intel section (IntelTable, FacilityDrawer, SignalLegend)
- [ ] Port Models section (ScatterPlot, BenchmarkTable, MetrChart)
- [ ] Wire all export functions
- [ ] Deploy to GitHub Pages via Actions

### P3 — Polish
- [ ] Accessibility — aria labels, roles, heading hierarchy, keyboard nav
- [ ] Responsive — test at 360px, tablet breakpoints
- [ ] Performance — memoize chart data, lazy-load Map + Models sections
- [ ] METR improvements — missing models, primary YAML validation
- [ ] Error boundary fallback UI per section

### P4 — New Features (post-migration)
- [ ] Power/grid analysis section (`features/power/`)
- [ ] Dark/light theme toggle (swap token values)
- [ ] Shareable snapshots (encode full state in URL or generate image)
