# AI Arms Race Dashboard — Project Context

## What This Is
A React + Vite dashboard tracking the AI infrastructure race — compute buildout, power capacity, frontier model benchmarks, and METR time horizons across the top 5 AI labs. TypeScript throughout. Deployed on GitHub Pages.

**Live URL:** https://adi-wasserman.github.io/ai-arms-race/
**Repo:** https://github.com/Adi-Wasserman/ai-arms-race

---

## Current State (post-migration)

All 4 sections ship and render from live Epoch AI data with fallback.

### Recent feature work

- **Default view is now TOTAL CAPACITY** (was Satellite Only). Scope toggle renamed: `TOTAL CAPACITY | SATELLITE ONLY`. Default `scope: 'fleet'` in `raceSlice.ts`. The ACCESS terminal-tab subtitle reads "Total Capacity — who can train today".

- **ComputeBreakdownCard** (`src/features/race/ComputeBreakdownCard.tsx`): collapsible card (collapsed by default) below the chart showing per-lab H100e calculation breakdown. 3+2 card layout (top row: Anthropic/Gemini/OpenAI with cloud-lease legs; bottom row: Meta/xAI satellite-only). Each card shows satellite-verified facilities + cloud-lease legs with sources, H100e conversion ratios, and future ramp timelines (solid pills = past, dashed = future). Always visible in both ACCESS and OWNERSHIP modes.

- **"Who Trains on Whose Chips"** (renamed from "Known Major Leases"): `KnownLeasesCard.tsx`. Now shown in ALL modes. 5 bullets: Microsoft Azure+Stargate→OpenAI, Google (owns TPUs)→Gemini, AWS Trainium→Anthropic, Microsoft Azure+NVIDIA→Anthropic, Google (TPUs rented via Google Cloud + Broadcom)→Anthropic. localStorage: `knownLeasesCardCollapsed_v1`.

- **Preview models** (`src/data/models.ts`): `preview: true` flag triggers dashed borders, amber "PREVIEW" badges in `BenchmarkTable.tsx`. Preview models excluded from benchmark leader counts (KEY FINDING). Two preview models:
  - **Claude Mythos**: unreleased Anthropic model (Project Glasswing). Benchmarks Anthropic-reported, not independently verified.
  - **Muse Spark**: Meta's frontier flagship (2026-04-08). Per-benchmark scores self-reported, pending independent verification. `aaIndex: 52` independently measured by AA.
  - Both render on a dedicated 2-column row in the notes grid, separate from verified models.

- **Hardware Ownership view** (Race → OWNERSHIP tab): `OwnershipTable` sourced from `useEpochChipOwners` (Epoch ZIP, JSZip + PapaParse, localStorage 24h TTL). **Auto-refreshes every 5 minutes**.

- **OwnershipTable**: editorial lede "3 of 5 labs self-operated, 2 tenants". SELF-OPERATED = Google, Meta, xAI. SHARED HOST = Microsoft (OpenAI), Amazon (Anthropic). Lab-colored rows, H100e MEDIAN column, chip mix bars. `table-layout: fixed`.

- **FrontierOutlookCard**: renders only under OWNERSHIP tab (not ACCESS). Shows % owned ranking with proof text. Consolidated footnote: override caveat + Broadcom deal inline link. No growth figures (redundant with OwnershipTable).

- **Leaderboard**: single metrics line per lab: `2.0M H100e · 1.91 GW · 25% owned`. No analyst estimates. Wider (320px), larger fonts. Chart height hero-sized: `min-height: max(560px, 65vh)`. 2029 projection lines at 12px font.

- **DataBanner**: facility count filters out "Other" labs to match Geo Map pin count.

- **BenchmarkTable data sources**: linked list of all 10 benchmarks below notes grid (AA v4.0, GPQA Diamond, SWE-bench Verified, ARC-AGI-2, AIME '25, MMMU-Pro, HLE, GDPval, OSWorld, BrowseComp).

- **TruthModal data sources**: all benchmarks and cloud-lease sources have clickable URLs. Includes Broadcom TPU deal (Apr 2026).

- **Race section DATA footer**: lists all 7 cloud-lease sources with links (Amazon, Anthropic GCP TPU, Anthropic Broadcom, NVIDIA, SemiAnalysis, Google Cloud, Fubon Research).

- **Key Insights card** at top of Race section: 2×2 grid, green accent border. No meta line.

- **Subtitle**: "POST-CHATGPT MOMENT (2024–)" (was ERA).

- **Training Compute Growth chart** (`src/features/models/TrainingComputeChart.tsx`): 21 model releases across 5 labs by year vs training FLOPs (log scale) with ~5x/year trend.

- **Within-Lab Scaling chart** (`src/features/models/WithinLabScaling.tsx`): dual-axis line chart (GPT + Claude families). Left Y = FLOPs (log), Right Y = performance score.

- **FirstPrinciples explainer** (`src/features/models/FirstPrinciples.tsx`): collapsible editorial card explaining 6 drivers of frontier model quality. localStorage: `firstPrinciplesCollapsed_v1`.

### Editorial framing — operator vs lab (DO NOT REVERT)

Epoch reports **operators**, not labs. Google/Meta/xAI are self-operated. OpenAI and Anthropic are cloud tenants. Don't treat `Microsoft H100e` as `OpenAI H100e`.

### Satellite data limitations for cloud tenants (DO NOT add per-lab YoY)

Epoch tracks purpose-built AI data centers visible from satellite imagery. This structurally undercounts cloud tenants:
- **OpenAI** had ~58K satellite-visible H100e in April 2025 but trained on hundreds of thousands of Azure GPUs invisible to satellite tracking.
- **Anthropic** had 0 satellite-visible compute until June 2025 despite training on AWS Trainium + Google Cloud TPUs.

Do not attempt to compute per-lab YoY growth — it will produce misleading figures.

### Key files

```
src/features/race/ComputeBreakdownCard.tsx    # per-lab H100e breakdown (collapsed by default)
src/features/race/KnownLeasesCard.tsx         # "Who Trains on Whose Chips" (5 bullets, all modes)
src/features/race/OwnershipTable.tsx          # ownership view (3 self-operated, 2 shared host)
src/features/race/FrontierOutlookCard.tsx     # "2027+" (OWNERSHIP tab only)
src/features/race/Leaderboard.tsx             # single-line per lab, 2029 projections at 12px
src/features/race/RaceSection.tsx             # master toggle + scope default
src/features/race/RaceChart.tsx               # hero-sized chart, starts 2024
src/features/race/StatCards.tsx               # 3 cards: leader, compute, power
src/features/models/TrainingComputeChart.tsx  # 21-model FLOPs scatter
src/features/models/WithinLabScaling.tsx      # dual-axis GPT/Claude scaling chart
src/features/models/FirstPrinciples.tsx       # 6 first-principles explainer
src/features/models/BenchmarkTable.tsx        # preview model support, linked data sources
src/features/models/ScatterPlot.tsx           # OLD — exists but NOT imported
src/data/models.ts                            # MODEL_SPECS (Mythos + Muse Spark = preview)
src/data/fleet.ts                             # cloud-lease estimates with ramp schedules
src/data/facilities.ts                        # FACILITY_COORDS + LAB_MAP (Coreweave=OpenAI)
src/store/slices/raceSlice.ts                 # default scope='fleet', no velocityMode
src/hooks/useEpochChipOwners.ts               # 5min auto-refresh, force-refresh on mount
src/services/ownershipMath.ts                 # computePctOwned, computeOwnedH100e
src/config/labOwnershipMapping.ts             # LAB_OWNERSHIP_CONFIG
src/types/benchmark.ts                        # Model type + preview?: boolean
src/components/ui/OwnershipSidePanel.tsx       # EXISTS but NOT rendered
src/components/ui/TruthModal.tsx              # 4 sections incl. Data Sources (all linked)
src/components/layout/DataBanner.tsx           # sticky bar, filters "Other" from count
```

### Cloud-lease calculation transparency

The `ComputeBreakdownCard` shows how each lab's total H100e is computed:
- **Satellite-verified** = Epoch AI live CSV (high confidence)
- **Cloud-lease legs** = our estimates from public announcements with H100e conversion ratios (estimated confidence)

Cloud-lease legs in `src/data/fleet.ts`:
- `EAI-AWS`: Anthropic on AWS Trainium2 (0.93 H100e/Trn2)
- `EAI-GCP`: Anthropic on Google Cloud TPUs (blended ~1.4 H100e/chip)
- `EAI-AZR`: Anthropic on Azure/NVIDIA (GB200 ≈ 2.5 H100e)
- `EGC`: Estimated Gemini internal TPU fleet (~1.2 H100e/chip)

**None of these H100e numbers are directly stated in announcements.** We convert using estimated ratios and interpolate ramp schedules. The calculations card makes this transparent.

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

**Known footgun:** Skipping the `diff` check has broken CI multiple times. Always diff before committing.

---

## Epoch AI Chip Owners ZIP — data shape

Source: `https://epoch.ai/data/ai_chip_owners.zip` (CORS proxy fallback via `corsproxy.io`).
Parsed by filename suffix (not hard-coded names).

**3 CSV files:** `cumulative_by_designer.csv`, `cumulative_by_chip_type.csv`, `quarters_by_chip_type.csv`.

**8 owners:** Microsoft, Meta, Amazon, Google, Oracle, xAI, China, Other.
**5 manufacturers:** Nvidia, Google, Amazon, AMD, Huawei. ~24 chip types.

**`OWNER_TO_LAB`** (in `src/types/chipOwners.ts`): Microsoft→OpenAI, Amazon→Anthropic, Google→Gemini, Meta→Meta, xAI→xAI (approximate).

---

## Removed features (do NOT re-add without discussion)

### Velocity toggle
Deleted `src/services/velocity.ts`, `VelocityMode` type, all store/hash/UI references. Confusing, rarely used.

### YoY growth stats
Satellite data structurally undercounts cloud tenants. OpenAI showed 28× from a misleadingly low base.

### Analyst estimates in Leaderboard
SemiAnalysis/ArtAnalysis stale Q1 2026 snapshots. `ANALYST_ESTIMATES` data still exists in `projections.ts` but is not imported.

### LEAD CHANGES stat card
Removed alongside YoY. StatCards shows 3 cards: LEADER TODAY, TOTAL COMPUTE, TOTAL POWER.

---

## Gotchas (do NOT re-discover)

### Chart.js controllers must be explicitly registered
Vite tree-shakes in prod. Register any new chart type controller in `BaseChart.tsx`.

### StrictMode-safe data fetching
Use **module-level** `bootstrapStarted` flags, NOT cleanup `cancelled` flags.

### Module-level singleton fetch dedupe
`useEpochChipOwners` stores `inflightFetch` at module scope — one ZIP download even from multiple components.

### `dataVersion` / `chipOwnersVersion` memo invalidation
`useMemo` deps should use the version number, NOT the object reference.

### Epoch CSV schema drift — facility coordinates
`FACILITY_COORDS` in `src/data/facilities.ts` compensates with short-name aliases + `FACILITY_COORD_OVERRIDES`.

### vite.config.js shadowing
`tsconfig.node.json` has `outDir: ./node_modules/.cache/tsconfig-node`. Don't remove.

### Legacy HTML at `public/ai-arms-race.html`
Needed for old backlinks. Don't delete.

### High-res PNG exports
`useChartExport` captures at `devicePixelRatio * 2`. Low-res is a regression.

### Body text: use direct rgba, not dim tokens
`--color-text-tertiary` (0.3) and `--color-text-quaternary` (0.15) are too dim for body text. Use `rgba(255,255,255, 0.55–0.85)`.

### TruthModal lives in DataBanner, not Nav
Single owner of trigger + modal. Don't add a duplicate trigger.

### DataBanner sticky background
Uses `rgba(4,6,16,0.88)` + `backdrop-filter`. Don't revert to translucent.

### ACCESS/OWNERSHIP toggle — both setters fire
Handler always calls `setScope('fleet')` then `setRaceMode(...)` — intentional.

### localStorage keys
`hardwareRealityCheckDismissed_v1`, `knownLeasesCardCollapsed_v1`, `firstPrinciplesCollapsed_v1`, `epochChipOwnersCache_v1`.

### `color-mix(in oklab)` tinting pattern
Used in `OwnershipTable`, `FrontierOutlookCard`, `ComputeBreakdownCard`, `FirstPrinciples`, and `OwnershipSidePanel`. Browser support fine (2023+).

### OwnershipTable row order
Frontier-anchored owners first (by H100e desc), then non-frontier.

---

## URL hash state

| Param | Values | Default |
|-------|--------|---------|
| `metric` | `h100e`, `power` | `h100e` |
| `scope` | `tracked`, `fleet` | `fleet` |
| `mode` | `effective`, `ownership` | `effective` (only when scope=fleet) |
| `proj` | `current`, `2029` | `current` |
| `lab` | lab name | `ALL` |

`setScope` auto-resets `raceMode` → `'effective'` when leaving `'fleet'`.

---

## Tech Stack

React 18 + TypeScript, Vite, Zustand (slices), Chart.js 4 + react-chartjs-2, Leaflet + react-leaflet, PapaParse, date-fns, CSS Modules + design tokens. Deployed to GitHub Pages.

---

## Architecture Principles

1. **Feature-sliced sections** — each section is self-contained. Features never import from other features.
2. **Downward-only deps** — `features → components → services → types/config/data`.
3. **Config vs data separation** — `config/` = structural constants, `data/` = updatable values.
4. **Centralized types** — all interfaces in `types/`.
5. **Pure data layer** — `services/` functions are pure.
6. **Thin chart abstraction** — `BaseChart.tsx` standardizes Chart.js config.
7. **Store slices per feature** — each feature reads shared data, writes only to its own slice.
8. **ErrorBoundary per section** — one crash doesn't break others.

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

---

## 4 Sections

1. **THE RACE** (#race) — Key Insights card → ACCESS/OWNERSHIP tabs → stat cards (3) → hero chart + leaderboard → ComputeBreakdownCard (collapsed) → KnownLeasesCard → ProjectionPanel → DATA footer (7 sources linked) → bridge to #models. OWNERSHIP tab adds: FrontierOutlookCard + OwnershipTable.
2. **GEO MAP** (#geomap) — Leaflet + ESRI satellite tiles, lab-colored pins, region jump, satellite preview.
3. **INTEL** (#sites) — Sortable facility table, filters, drawer with satellite + timeline, signal legend.
4. **MODELS** (#models) — Key Takeaways → Training Compute Growth scatter (21 models, ~5x/yr trend) → Within-Lab Scaling (GPT + Claude dual-axis) → FirstPrinciples explainer → BenchmarkTable (verified models + preview row) → linked data sources → METR Time Horizons.

---

## Known Issues
1. METR data from secondary sources (LessWrong/OfficeChai, not primary YAML)
2. ESRI API unauthenticated — rate-limited under traffic
3. METR tooltip stickiness in 2025-2026 cluster
4. Anthropic 25% override in `LAB_OWNERSHIP_CONFIG` may need updating as Epoch data catches up
5. `ANALYST_ESTIMATES` in `projections.ts` is stale (Q1 2026) — no longer displayed but data remains
