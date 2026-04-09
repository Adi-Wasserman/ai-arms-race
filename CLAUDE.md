# AI Arms Race Dashboard — Project Context

## What This Is
A React + Vite dashboard tracking the AI infrastructure race — compute buildout, power capacity, frontier model benchmarks, and METR time horizons across the top 5 AI labs. TypeScript throughout. Deployed on GitHub Pages.

**Live URL:** https://adi-wasserman.github.io/ai-arms-race/
**Repo:** https://github.com/Adi-Wasserman/ai-arms-race

---

## Current State (post-migration)

All 4 sections ship and render from live Epoch AI data with fallback.

### Recent feature work

- **Muse Spark replaces Llama 4 Maverick** (`src/data/models.ts`):
  Meta's new frontier flagship (2026-04-08). `aaIndex: 52` is independently measured by Artificial Analysis; per-benchmark scores are self-reported by Meta (flagged in `notes`). When AA/Epoch publish independent runs, update fields and remove the self-reported caveat.

- **Hardware Ownership view** (Race → scope=fleet → mode=ownership):
  `OwnershipTable` sourced from `useEpochChipOwners` (fetches Epoch ZIP, JSZip + PapaParse, localStorage cache 24h TTL `epochChipOwnersCache_v1`).

- **% Owned column**: `LAB_OWNERSHIP_CONFIG` in `src/config/labOwnershipMapping.ts` with `selfOwned` names + optional `overridePct`. Calculation in `src/services/ownershipMath.ts`. Expected: Gemini/Meta 100%, xAI ~99%, Anthropic 25% (override), OpenAI 0% (override).

- **"Who Owns the AI Chips?" panel** (`OwnershipSidePanel.tsx`): full-width 5-card strip (NOT a sidebar despite filename). Cards click-through to OwnershipTable with row highlight.

- **FrontierOutlookCard**: collapsible "2027+" summary, ranks 5 labs by % Owned, sparklines for self-operated labs. OpenAI row is gray (#7a7a7a), not green. Dated callout block for breaking news (Anthropic-Google TPU deal 2026-04-06).

- **Master ACCESS / OWNERSHIP terminal-tab toggle**: flat mono-caps tabs in `RaceSection.tsx`. ACCESS = `scope='fleet', raceMode='effective'`, OWNERSHIP = `scope='fleet', raceMode='ownership'`. Both force `scope=fleet`. Tab subtitles are editorial — don't change without asking.

- **LabBadge taxonomy** in `OwnershipTable.tsx`: `Pure Owner` (green: Meta, xAI, Google), `Cloud Provider` (blue: Microsoft, Oracle, Amazon), `Major Tenant` (gray: OpenAI, Anthropic).

- **HardwareRealityCheckPanel**: full-width 3-col editorial card, localStorage-dismissible (`hardwareRealityCheckDismissed_v1`).

- **KnownLeasesCard**: OWNERSHIP-only collapsible card, 6 cloud→lab bullets. localStorage: `knownLeasesCardCollapsed_v1`.

- **TruthModal** in `DataBanner.tsx` (not Nav): methodology/sources/overrides/uncertainty modal. Trigger is `ⓘ ABOUT THIS DATA` button. DataBanner is `position: sticky; top: 48px; z-index: 900`.

- **`OwnershipLabTable.tsx`**: exists but NOT rendered — kept for possible reuse. Don't delete without checking.

### Editorial framing — operator vs lab (DO NOT REVERT)

Epoch reports **operators**, not labs. The panel matches Epoch 1:1 on operator labels with integration pills for the structural difference. Only Meta and xAI are operator=consumer (`self`). The other 3 are anchor tenants (`shared`). Don't add invented self-owned percentages or framing that treats `Microsoft H100e` as `OpenAI H100e`.

### Key files for ownership work

```
src/config/labOwnershipMapping.ts     # LAB_OWNERSHIP_CONFIG + tooltip/footnote
src/services/ownershipMath.ts         # computePctOwned, computeOwnedH100e, LAB_TO_OWNER
src/services/chipOwners.ts            # ZIP fetch + parse + cache + buildTimeseries
src/store/slices/chipOwnersSlice.ts   # chipOwners, version, lastUpdated
src/store/slices/raceSlice.ts         # + highlightedOwner for panel→table jumps
src/hooks/useEpochChipOwners.ts       # StrictMode-safe fetch, refresh()
src/features/race/OwnershipTable.tsx  # operator rows + LabBadge + highlight effect
src/features/race/FrontierOutlookCard.tsx
src/features/race/HardwareRealityCheckPanel.tsx
src/features/race/KnownLeasesCard.tsx
src/features/race/RaceSection.tsx     # master toggle + mode branching
src/components/ui/OwnershipSidePanel.tsx
src/components/ui/TruthModal.tsx
src/components/layout/DataBanner.tsx  # sticky bar + TruthModal mount
```

---

## Deployment Workflow (IMPORTANT — two repos)

1. `/Users/adiwasserman/ai-arms-race` — primary source (has `node_modules`). **NOT a git repo.**
2. `/tmp/ai-arms-race-deploy` — git clone for commits + push. **No `node_modules`** — CI builds it.

### To ship a change
1. Edit files under `/Users/adiwasserman/ai-arms-race/src/...`
2. `npx tsc --noEmit` + `npm run build` (must pass)
3. **`diff -rq /Users/adiwasserman/ai-arms-race/src /tmp/ai-arms-race-deploy/src`** — catch missing files
4. `cp` changed files → `/tmp/ai-arms-race-deploy/src/...`
5. `cd /tmp/ai-arms-race-deploy && git add ... && git commit && git push`

**Known footgun:** Skipping the `diff` check has broken CI multiple times (missed `ManufacturerMixBar.tsx`, `ownershipMath.ts`, CSS modules). Always diff before committing.

---

## Epoch AI Chip Owners ZIP — data shape

Source: `https://epoch.ai/data/ai_chip_owners.zip` (CORS proxy fallback via `corsproxy.io`).
Parsed by filename suffix (not hard-coded names).

**3 CSV files:** `cumulative_by_designer.csv` (H100e per owner), `cumulative_by_chip_type.csv` (per owner+chip), `quarters_by_chip_type.csv` (quarterly deliveries).

**8 owners:** Microsoft, Meta, Amazon, Google, Oracle, xAI, China, Other.
**5 manufacturers:** Nvidia, Google, Amazon, AMD, Huawei. ~24 chip types.

**`OWNER_TO_LAB`** (in `src/types/chipOwners.ts`):
Microsoft→OpenAI, Amazon→Anthropic, Google→Gemini, Meta→Meta, xAI→xAI (approximate — includes non-lab workloads).

**`EpochChipOwnersData`** shape: `{ asOf, latestByOwner: OwnerSnapshot[], timeseries: OwnerTimeseries[], rawRowCount }`.

Diagnostic: `scripts/diagnose-epoch-chipowners.ts`.

---

## Gotchas (do NOT re-discover)

### Chart.js controllers must be explicitly registered
`BaseChart.tsx` registers all controllers. Vite tree-shakes implicit imports in prod → `"line" is not a registered controller` in prod only. Register any new chart type controller.

### StrictMode-safe data fetching
`useEpochData` and `useEpochChipOwners` use **module-level** `bootstrapStarted` flags, NOT cleanup `cancelled` flags. StrictMode's unmount/remount trips cleanup flags and prevents `setData`. Don't revert to `let cancelled = false`.

### Module-level singleton fetch dedupe
`useEpochChipOwners` stores `inflightFetch: Promise | null` at module scope — one ZIP download even if mounted from multiple components.

### `dataVersion` / `chipOwnersVersion` memo invalidation
Slices bump a version on hydrate. `useMemo` deps should use the version number, NOT the object reference (with eslint-disable for exhaustive-deps).

### Epoch CSV schema drift — facility coordinates
Epoch dropped Lat/Lng columns. `FACILITY_COORDS` in `src/data/facilities.ts` compensates with short-name aliases + `FACILITY_COORD_OVERRIDES`. If map shows <22 facilities, check for missing handles.

### vite.config.js shadowing
`tsconfig.node.json` has `outDir: ./node_modules/.cache/tsconfig-node` to prevent `tsc -b` from emitting a `.js` that shadows the `.ts`. Don't remove.

### Panel→table click-through requires rAF defer
`OwnershipSidePanel.tsx` handler: `setHighlightedOwner(null)` first (re-fire same card), then `requestAnimationFrame` for the actual set (waits for OwnershipTable mount). Without rAF, cold-jumps from ACCESS mode silently fail.

### Legacy HTML at `public/ai-arms-race.html`
Needed for old backlinks. Don't delete.

### High-res PNG exports
`useChartExport` captures at `devicePixelRatio * 2` (or 3200px width). Low-res is a regression.

### `<ol>` markers leak with `display: grid`
Use `<div role="list">` / `<div role="listitem">` for ranked lists with grid items to avoid doubled markers.

### Epoch ZIP timeseries edge cases
1. **Trailing missing quarters**: forward-fill from last known cumulative (don't collapse to 0). Real revisions ARE preserved.
2. **Leading zeros**: drop via `findIndex(v => v > 0)` so late-founded labs use full sparkline width.

### Body text: use direct rgba, not dim tokens
`--color-text-tertiary` (0.3 alpha) and `--color-text-quaternary` (0.15) are too dim for body text. Use `rgba(255,255,255, 0.55–0.85)` for readable content.

### TruthModal lives in DataBanner, not Nav
Single owner of trigger + modal. To open from elsewhere, hoist state to a `uiSlice` — don't add a duplicate trigger.

### DataBanner sticky background
Uses `rgba(4,6,16,0.88)` + `backdrop-filter`. Don't revert to translucent — content becomes unreadable when scrolling under.

### ACCESS/OWNERSHIP toggle — both setters fire
Handler always calls `setScope('fleet')` then `setRaceMode(...)` — intentional because `setScope` auto-resets `raceMode` when leaving fleet.

### localStorage preferences — synchronous useState init
Read localStorage in `useState(() => readValue())`, NOT in `useEffect`. Avoids visible flash of wrong state.
Keys: `hardwareRealityCheckDismissed_v1`, `knownLeasesCardCollapsed_v1`, `epochChipOwnersCache_v1`.

### OwnershipTable footer → Truth modal
Footer has 3 lines only. All methodology/override caveats live in TruthModal. Don't re-add inline copies.

### LabBadge `.badge` resets `text-transform: none`
Parent `.ownerLab` is `uppercase` — without the reset, pills render as "PURE OWNER" at 8px.

### `color-mix(in oklab)` per-card tinting
`OwnershipSidePanel.module.css` derives all accents from `--card-color`. Browser support fine (2023+). No fallback needed.

### OwnershipTable row order
Frontier-anchored owners first (by H100e desc), then non-frontier. Frontier = `OWNER_TO_LAB[owner] != null`.

---

## URL hash state

| Param | Values | Default |
|-------|--------|---------|
| `metric` | `h100e`, `power` | `h100e` |
| `scope` | `tracked`, `fleet` | `tracked` |
| `mode` | `effective`, `ownership` | `effective` (only when scope=fleet) |
| `proj` | `current`, `2029` | `current` |
| `scatter` | `observed`, `projected` | `observed` |
| `velocity` | `absolute`, `velocity` | `absolute` |
| `lab` | lab name | `ALL` |

`setScope` auto-resets `raceMode` → `'effective'` when leaving `'fleet'`.

---

## Tech Stack

React 18 + TypeScript, Vite, Zustand (slices), Chart.js 4 + react-chartjs-2, Leaflet + react-leaflet, PapaParse, date-fns, CSS Modules + design tokens. Deployed to GitHub Pages.

---

## Architecture Principles

1. **Feature-sliced sections** — each section (`features/race`, `map`, `intel`, `models`) is self-contained. Features never import from other features.
2. **Downward-only deps** — `features → components → services → types/config/data`. Never sideways.
3. **Config vs data separation** — `config/` = structural constants (rarely change), `data/` = updatable values (model scores, fleet estimates, coordinates).
4. **Centralized types** — all interfaces in `types/`. No inline type definitions.
5. **Pure data layer** — `services/` functions are pure (no DOM, no React, no state).
6. **Thin chart abstraction** — `BaseChart.tsx` standardizes Chart.js config. Individual charts pass only unique data/options.
7. **Store slices per feature** — each feature reads shared data from `dataSlice`, writes only to its own slice.
8. **ErrorBoundary per section** — one section crash doesn't break others.

**App-shell sticky stack** (top → bottom):
- `Nav` (fixed, top: 0, z-index: 1000, 48px)
- `DataBanner` (sticky, top: 48px, z-index: 900) — owns TruthModal
- Section content scrolls under both

---

## 2029 Projection Engine

| Lab | Today | 2029 Target | Growth | Basis |
|-----|-------|-------------|--------|-------|
| OpenAI | 1.6M | 12M | ~7.5× | Stargate + GB200 |
| Gemini | 454K | 9M | ~20× | Epoch sat + Ironwood TPU |
| Meta | 761K | 6M | ~7.9× | Epoch sat, owned infra |
| xAI | 557K | 2.2M | ~3.9× | Colossus 1+2 |
| Anthropic | 1.8M | 9M | ~5× | Epoch sat + 3-cloud fleet + Google/Broadcom TPU |

**Interpolation:** Ease-out `1-(1-t)^1.8`. **Uncertainty:** ±8% base + 6%/yr → ~±24% by Jan 2029.

## Construction Signals

| Signal | Meaning | Significance |
|--------|---------|-------------|
| 🗼 X towers | Cooling towers | Each ≈ 30MW |
| ❄️ X units | Air-cooled chillers | Alt cooling |
| 🏗️ Complete | Roof finished | ~5-7mo to operational |
| ⚡ Installed | Backup generators | Nearing power-on |
| 🔌 Connected | Grid substation live | Power flowing |
| 🔥 On-site | Gas turbines | Dedicated power |
| ⚠️ Noted | Delay/pause | Timeline risk |

---

## 6 Sections

1. **THE RACE** (#race) — H100e/Power time series, ACCESS/OWNERSHIP modes, leaderboard, 2029 projections. Export: CSV/JSON/PNG.
2. **GEO MAP** (#geomap) — Leaflet + ESRI satellite tiles, lab-colored pins, region jump, satellite preview.
3. **INTEL** (#sites) — Sortable facility table, filters, drawer with satellite + timeline, signal legend. Export: CSV.
4. **COMPUTE vs PERFORMANCE** (within #models) — Scatter: H100e × AA Index, bubbles by GW, OLS trend. Export: PNG.
5. **MODELS** (#models) — Benchmark head-to-head, 2-3 models, gold/silver/bronze. Export: CSV.
6. **METR TIME HORIZONS** (within #models) — Scatter 2019-2026, exponential trend. Export: PNG.

---

## Design Principles
- Dark space aesthetic — deep navy, monospace numbers, lab-colored accents
- Satellite-grounded — ESRI imagery for every facility
- Source transparency — every data point traceable to named source
- Graceful degradation — fetch failure never breaks the page (fallback data + error boundaries)
- Power-constrained projections — targets from Epoch + sourced fleet, not compound growth
- Type safety — all data shapes in `types/`, no `any`

---

## Known Issues
1. METR data from secondary sources (LessWrong/OfficeChai, not primary YAML)
2. ESRI API unauthenticated — rate-limited under traffic
3. METR tooltip stickiness in 2025-2026 cluster
