# AI Arms Race Dashboard — Project Context

## What This Is
A React + Vite dashboard tracking the AI infrastructure race — compute buildout, power capacity, frontier model benchmarks, and METR time horizons across the top 5 AI labs. TypeScript throughout. Deployed on GitHub Pages.

**Live URL:** https://adi-wasserman.github.io/ai-arms-race/
**Repo:** https://github.com/Adi-Wasserman/ai-arms-race

---

## Current State (June 2026 refresh)

All 4 sections ship and render from live Epoch AI data with fallback. Major June 2026 update: 63 Epoch facilities (was ~23), Stargate 7-site portfolio, Colossus tenant splits, GPT-5.5/Opus 4.8/Grok 4.3 models, official METR TH 1.1 data.

### Recent feature work

- **June 2026 hardening pass** (full review + fixes shipped):
  - **Code-splitting**: the 4 sections lazy-load via `React.lazy` + `Suspense` in `App.tsx` (main bundle 892 KB → ~333 KB; Chart.js and Leaflet live in lazy chunks). Suspense fallbacks carry the section anchor ids so `#models`-style deep links resolve at first paint.
  - **Data-pipeline guards**: empty Epoch parse → fallback + error (no more "Live" over a blank chart); `RaceChart` renders an explicit empty state; NaN CSV values warn once per column; dev-mode assertion that the Colossus split nets to zero (`fleet.ts`).
  - **Local-calendar dates**: all "today" comparisons use `localTodayIso()` from `src/services/dates.ts` — never `toISOString().slice(0,10)` (UTC can hide a fresh quarter-end for users behind UTC).
  - **Test suite**: 61 Vitest tests in `src/services/__tests__/` (parsers, ownership math, projections, confidence, Colossus balance). `npm test` runs them; **CI runs them between type-check and build**, so failures block deploys.
  - **Keyboard a11y**: TruthModal focus trap + restore, FacilityDrawer focus management, IntelTable sort headers/rows keyboard-operable with `aria-sort`, `:focus-visible` outlines, `role="img"` on charts.
  - **Auto-refresh pause**: the 5-min chip-owners refetch skips ticks while `document.hidden`, with a catch-up refresh on tab return.
  - **METR tooltip fix**: `interaction: { mode: 'nearest', intersect: false, axis: 'x' }` — stops flicker in the dense 2025–2026 cluster.
  - **Truth-at-first-glance pass**: estimate provenance is visible at point-of-read in the default TOTAL CAPACITY view — amber EST/ADJ badges on Leaderboard rows (Anthropic/Gemini/xAI), INCL. ESTIMATES tags + ≈ prefix on StatCards, scope-aware DataBanner label ("Live Epoch AI + cloud-lease estimates" when scope=fleet), ComputeBreakdownCard open by default. 2029 reframed from forecast to announced targets ("JAN 2029 — ANNOUNCED TARGETS" in StatCards + ProjectionPanel; "leads the announced buildouts" not "projected to lead"); projection uncertainty bands at 15% opacity (was 7%).

- **Default view is now TOTAL CAPACITY** (was Satellite Only). Scope toggle renamed: `TOTAL CAPACITY | SATELLITE ONLY`. Default `scope: 'fleet'` in both `raceSlice.ts` AND `useHashState.ts` (bug fix: hash default was previously `'tracked'`).

- **ComputeBreakdownCard** (`src/features/race/ComputeBreakdownCard.tsx`): collapsible card (**open by default** since the June 2026 truth-at-first-glance pass — it's the confidence-split explainer for the leaderboard) below the chart showing per-lab H100e calculation breakdown. 3+2 card layout (top row: Anthropic/Gemini/OpenAI with cloud-lease legs; bottom row: Meta/xAI). Each card shows satellite-verified facilities + cloud-lease legs with sources, H100e conversion ratios, and future ramp timelines (solid pills = past, dashed = future). xAI card now shows Colossus tenant subtraction (COL-XAI-ADJ). Always visible in both ACCESS and OWNERSHIP modes.

- **Colossus tenant split** (June 2026): xAI's satellite-verified Colossus capacity is now split among tenants using net-zero fleet entries:
  - `COL-ANT`: Anthropic Colossus tenant block (~230K H100e, ~300 MW). Source: [$1.25B/mo deal](https://techcrunch.com/2026/05/20/anthropic-will-pay-xai-1-25-billion-per-month-for-compute/).
  - `COL-GGL`: Google/Gemini Colossus tenant block (~110K H100e, 110K GPUs). Source: [SpaceX SEC filing](https://www.sec.gov/Archives/edgar/data/0001181412/000162828026041150/spacexagreementfwp.htm).
  - `COL-XAI-ADJ`: Negative balancing entry subtracts rented capacity from xAI. Industry total unchanged.

- **"Who Trains on Whose Chips"** (renamed from "Known Major Leases"): `KnownLeasesCard.tsx`. Now shown in ALL modes. 7 bullets: Microsoft Azure+Stargate→OpenAI, Google (owns TPUs)→Gemini, AWS Trainium→Anthropic, Microsoft Azure+NVIDIA→Anthropic, Google (TPUs rented via Google Cloud + Broadcom)→Anthropic, SpaceXAI Colossus→Anthropic ($1.25B/mo), SpaceXAI Colossus→Google ($920M/mo). localStorage: `knownLeasesCardCollapsed_v1`.

- **Frontier models** (`src/data/models.ts`): snapshot June 2026. 4 verified + 2 preview:
  - **GPT-5.5** (OpenAI, 2026-04-23): AA Index 60, ARC-AGI-2 85%, SWE-bench 82.6%. $5/$30. 922K context.
  - **Gemini 3.1 Pro** (Google, 2026-02-19): AA Index 57, GPQA 94.3%. $2/$12. 2M context.
  - **Claude Opus 4.8** (Anthropic, 2026-05-28): AA Index 61 (#1), SWE-bench 88.6%, OSWorld 83.4%. $5/$25. 1M context.
  - **Grok 4.3** (xAI, 2026-04-30): AA Index 53, fastest at 194 tok/s. $1.25/$2.50. 1M context.
  - **Muse Spark** (Meta, preview): AA Index 52, self-reported scores.
  - **Claude Mythos** (Anthropic, preview): SWE-bench 93.9%, invitation-only via Project Glasswing. Public release confirmed "coming weeks" (May 28).

- **METR Time Horizons** (`src/data/metr.ts`): Official TH 1.1 data from metr.org (27 models). Linear Y-axis (hours). Doubling time ~129 days (95% CI: 104–158). Claude Opus 4.6 = ~30 days. GPT-2 label hidden (overlaps Y-axis at linear scale).

- **Hardware Ownership view** (Race → OWNERSHIP tab): `OwnershipTable` sourced from `useEpochChipOwners` (Epoch ZIP, JSZip + PapaParse, localStorage 24h TTL). **Auto-refreshes every 5 minutes**. `asOf` date now filters to past dates only (was showing future projections like "May 2030").

- **DataBanner**: facility count filters out "Other" labs. Shows Epoch data vintage (most recent past observation date) and fetch timestamp. Both fully dynamic.

- **Training Compute Growth chart**: 23 model releases across 5 labs (GPT-3 through Opus 4.8) by year vs training FLOPs (log scale) with ~5x/year trend.

- **Within-Lab Scaling chart**: dual-axis line chart. GPT family: GPT-3→GPT-4→GPT-4o→GPT-5.5 (+38 pts). Claude family: Claude 2→3 Opus→Opus 4→Opus 4.8 (+41 pts).

- **Observation signals** (`src/services/observations.ts`): 10 signal types — cooling towers, chillers, roof, generators, substation, turbines, permits, liquid cooling, PPAs, delays.

- **TruthModal** (`src/components/ui/TruthModal.tsx`): 5 sections. Includes "Recent Major Compute Contracts (2026)" with linked sources for Anthropic/Google Colossus deals. Methodology last updated June 2026. METR uncertainty note corrected to "TH 1.1 official".

### Editorial framing — operator vs lab (DO NOT REVERT)

Epoch reports **operators**, not labs. Google/Meta are self-operated. xAI/SpaceXAI owns Colossus but rents capacity to Anthropic and Google. OpenAI and Anthropic are cloud tenants. Don't treat `Microsoft H100e` as `OpenAI H100e`.

### Satellite data limitations for cloud tenants (DO NOT add per-lab YoY)

Epoch tracks purpose-built AI data centers visible from satellite imagery. This structurally undercounts cloud tenants:
- **OpenAI** had ~58K satellite-visible H100e in April 2025 but trained on hundreds of thousands of Azure GPUs invisible to satellite tracking.
- **Anthropic** had 0 satellite-visible compute until June 2025 despite training on AWS Trainium + Google Cloud TPUs.

Do not attempt to compute per-lab YoY growth — it will produce misleading figures.

### Key files

```
src/features/race/ComputeBreakdownCard.tsx    # per-lab H100e breakdown (Colossus tenant legs)
src/features/race/KnownLeasesCard.tsx         # "Who Trains on Whose Chips" (7 bullets, all modes)
src/features/race/OwnershipTable.tsx          # ownership view, asOf filters past dates only
src/features/race/FrontierOutlookCard.tsx     # "2027+" (OWNERSHIP tab only)
src/features/race/Leaderboard.tsx             # single-line per lab, 2029 projections at 12px
src/features/race/RaceSection.tsx             # master toggle + scope default, Key Insights June 2026
src/features/race/RaceChart.tsx               # hero-sized chart, starts 2024
src/features/race/StatCards.tsx               # 3 cards: leader, compute, power
src/features/race/ProjectionPanel.tsx         # dynamic month/year label, Stargate/Colossus notes
src/features/models/TrainingComputeChart.tsx  # 23-model FLOPs scatter (through Opus 4.8)
src/features/models/WithinLabScaling.tsx      # dual-axis GPT-5.5/Opus 4.8 scaling chart
src/features/models/MetrChart.tsx             # METR TH 1.1, linear Y-axis, 27 models
src/features/models/FirstPrinciples.tsx       # 6 first-principles explainer
src/features/models/BenchmarkTable.tsx        # preview model support, linked data sources
src/data/models.ts                            # MODEL_SPECS (6 models: GPT-5.5, Opus 4.8, etc.)
src/data/metr.ts                              # METR TH 1.1 official data (27 models)
src/data/fleet.ts                             # cloud-lease + Colossus tenant entries with ramps
src/data/facilities.ts                        # FACILITY_COORDS (80+) + LAB_MAP (76 handles)
src/data/projections.ts                       # 2029 targets (June 2026 refresh)
src/store/slices/raceSlice.ts                 # default scope='fleet', no velocityMode
src/hooks/useEpochChipOwners.ts               # 5min auto-refresh (paused while tab hidden)
src/hooks/useHashState.ts                     # default scope='fleet' (was 'tracked' — fixed)
src/services/chipOwners.ts                    # asOf filters past dates only (was showing 2030)
src/services/dates.ts                         # localTodayIso() — ALWAYS use for "today" comparisons
src/services/__tests__/                       # 61 Vitest tests — npm test; CI gate
src/services/classify.ts                      # SpaceXAI owner-first check for Colossus
src/services/confidence.ts                    # ±1.4× capacity (Epoch ~80% CI)
src/services/observations.ts                  # 10 signal types incl. permit, liquid cooling, PPA
src/services/ownershipMath.ts                 # computePctOwned, computeOwnedH100e
src/config/labOwnershipMapping.ts             # LAB_OWNERSHIP_CONFIG (xAI selfOwned: ['xAI','SpaceXAI'])
src/config/labs.ts                            # LAB_CHIPS: Ironwood, GB200, Trainium2
src/config/signals.ts                         # 10 construction signals (added permit, liquid, PPA)
src/config/benchmarks.ts                      # 11 benchmarks, 7 domain groups
src/types/benchmark.ts                        # Model type + preview?: boolean
src/components/ui/TruthModal.tsx              # 5 sections, Colossus contracts, methodology June 2026
src/components/layout/DataBanner.tsx           # sticky bar, vintage filters past dates only
```

### Cloud-lease calculation transparency

The `ComputeBreakdownCard` shows how each lab's total H100e is computed:
- **Satellite-verified** = Epoch AI live CSV (high confidence)
- **Cloud-lease legs** = our estimates from public announcements with H100e conversion ratios (estimated confidence)
- **Colossus tenant legs** = capacity split from xAI to Anthropic/Google based on rental contracts (net zero)

Cloud-lease legs in `src/data/fleet.ts`:
- `EAI-AWS`: Anthropic on AWS Trainium2 (0.93 H100e/Trn2)
- `EAI-GCP`: Anthropic on Google Cloud TPUs (blended ~1.4 H100e/chip)
- `EAI-AZR`: Anthropic on Azure/NVIDIA (GB200 ≈ 2.5 H100e)
- `EGC`: Estimated Gemini internal TPU fleet (~1.2 H100e/chip)
- `COL-ANT`: Anthropic Colossus tenant block (~230K H100e from ~300 MW / 1,086 MW × 832K)
- `COL-GGL`: Google/Gemini Colossus tenant block (~110K H100e from 110K GPUs × 1.0)
- `COL-XAI-ADJ`: Negative adjustment to xAI (subtracts COL-ANT + COL-GGL to avoid double-count)

**None of these H100e numbers are directly stated in announcements.** We convert using estimated ratios and interpolate ramp schedules. The calculations card makes this transparent.

Sources for Colossus tenant deals:
- Anthropic: [TechCrunch (May 20, 2026)](https://techcrunch.com/2026/05/20/anthropic-will-pay-xai-1-25-billion-per-month-for-compute/)
- Google: [SpaceX SEC filing (Jun 5, 2026)](https://www.sec.gov/Archives/edgar/data/0001181412/000162828026041150/spacexagreementfwp.htm)

---

## Deployment Workflow (IMPORTANT — two repos)

1. `/Users/adiwasserman/ai-arms-race` — primary source (has `node_modules`). **NOT a git repo.**
2. `/tmp/ai-arms-race-deploy` — git clone for commits + push. **No `node_modules`** — CI builds it.

### To ship a change
1. Edit files under `/Users/adiwasserman/ai-arms-race/src/...`
2. `npx tsc --noEmit` + `npm test` + `npm run build` (all must pass)
3. **`diff -rq /Users/adiwasserman/ai-arms-race/src /tmp/ai-arms-race-deploy/src`** — catch missing files
4. `cp` changed files → `/tmp/ai-arms-race-deploy/src/...`
5. `cd /tmp/ai-arms-race-deploy && git add ... && git commit && git push`

CI (`deploy.yml`) runs `npm ci` → `tsc -b` → `npm test` → build → Pages deploy. A failing test blocks the deploy.

**Known footgun:** Skipping the `diff` check has broken CI multiple times. Always diff before committing.

**Known footgun #2 (lockfile):** CI runs Node 20 / npm 10; local is npm 11. The two record optional platform-dep subtrees differently, so a locally-valid `package-lock.json` can fail `npm ci` on CI. After ANY dependency change, validate with `cd /tmp/ai-arms-race-deploy && npx -y npm@10 ci --dry-run` before pushing. Prefer dev deps that dedupe against the project's vite 5 (this is why vitest is pinned to ^3, not 4).

---

## Epoch AI Chip Owners ZIP — data shape

Source: `https://epoch.ai/data/ai_chip_owners.zip` (CORS proxy fallback via `corsproxy.io`).
Parsed by filename suffix (not hard-coded names).

**3 CSV files:** `cumulative_by_designer.csv`, `cumulative_by_chip_type.csv`, `quarters_by_chip_type.csv`.

**8 owners:** Microsoft, Meta, Amazon, Google, Oracle, xAI/SpaceXAI, China, Other.
**5 manufacturers:** Nvidia, Google, Amazon, AMD, Huawei. ~24 chip types.

**`OWNER_TO_LAB`** (in `src/types/chipOwners.ts`): Microsoft→OpenAI, Amazon→Anthropic, Google→Gemini, Meta→Meta, xAI→xAI (approximate).

**IMPORTANT:** The chip owners CSV contains future quarterly projections (endDates extending to 2030+). The `asOf` computation in `chipOwners.ts` must filter to `endDate <= today` to avoid showing future dates in the UI. Same pattern in `DataBanner.tsx` for the timeline vintage date.

---

## Removed features (do NOT re-add without discussion)

### Velocity toggle
Deleted `src/services/velocity.ts`, `VelocityMode` type, all store/hash/UI references. Confusing, rarely used.

### YoY growth stats
Satellite data structurally undercounts cloud tenants. OpenAI showed 28× from a misleadingly low base.

### Analyst estimates in Leaderboard
SemiAnalysis/ArtAnalysis stale Q1 2026 snapshots. `ANALYST_ESTIMATES` and its types were **deleted entirely** (June 2026) — recover from git history if ever needed.

### LEAD CHANGES stat card
Removed alongside YoY. StatCards shows 3 cards: LEADER TODAY, TOTAL COMPUTE, TOTAL POWER.

### Dead components (deleted June 2026)
`ScatterPlot.tsx` (superseded by TrainingComputeChart) and `OwnershipSidePanel.tsx` (built but never mounted) + their CSS modules. Some comments still reference OwnershipSidePanel, and `highlightedOwner` in `raceSlice.ts` is now only read (never set) — fold that cleanup into any future OwnershipTable refactor.

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
Epoch removed `Latitude`/`Longitude` columns in early 2026. `FACILITY_COORDS` in `src/data/facilities.ts` is now the canonical source for pin placement (80+ entries covering both legacy long names and Epoch short names). `FACILITY_COORD_OVERRIDES` corrects Epoch-published points that are >2 km off.

### Epoch CSV column names
DC CSV uses `Name` (not `Handle`). Timeline CSV uses `Data center` (not `Handle`). Parser column candidates handle both. Epoch owner field changed from `xAI` to `SpaceXAI` — `classifyLab` checks owner-first for SpaceXAI.

### Future dates in Epoch data (CRITICAL)
Both the timeline CSV and chip owners ZIP contain future projections. Any `asOf` / vintage date computation MUST filter to `<= today` to avoid showing dates like "May 2030". This was a live bug fixed in June 2026.

### "Today" must be the LOCAL calendar date
Use `localTodayIso()` from `src/services/dates.ts`, never `new Date().toISOString().slice(0, 10)` — the UTC date can differ from the user's calendar date near midnight and hide a fresh quarter-end row as a "future projection".

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
Used in `OwnershipTable`, `FrontierOutlookCard`, `ComputeBreakdownCard`, and `FirstPrinciples`. Browser support fine (2023+).

### OwnershipTable row order
Frontier-anchored owners first (by H100e desc), then non-frontier.

### METR chart linear scale
User prefers linear Y-axis (not logarithmic). GPT-2 label hidden because its value (~3 min) is invisible at the 0–800 hr scale. Do not switch to log scale.

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

**IMPORTANT:** The default scope in `useHashState.ts` MUST match `raceSlice.ts` (`'fleet'`). A mismatch caused a bug where visiting `#race` showed satellite-only instead of total capacity.

---

## Tech Stack

React 18 + TypeScript, Vite, Zustand (slices), Chart.js 4 + react-chartjs-2, Leaflet + react-leaflet, PapaParse, JSZip, date-fns, CSS Modules + design tokens, Vitest (^3 — see lockfile footgun). Deployed to GitHub Pages.

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

## 2029 Projection Engine (June 2026 refresh)

| Lab | 2029 Target | Power | Basis |
|-----|-------------|-------|-------|
| OpenAI | 15M | 12 GW | Stargate 7-site (>9 GW by Q4 2028) + Azure fleet + GB200/Vera Rubin |
| Gemini | 10M | 5.5 GW | Epoch satellite (14 sites) + Ironwood TPU fleet + Colossus tenant (110K GPUs) |
| Meta | 7M | 4.2 GW | Epoch satellite only (6 owned sites). No cloud-lease. |
| xAI | 3.5M | 2.5 GW | Colossus 2 GW expansion (minus tenant allocations) |
| Anthropic | 10M | 6 GW | Epoch satellite + 3-cloud fleet + Broadcom TPU deal + Colossus tenant (~230K) |

**Interpolation:** Ease-out `1-(1-t)^1.8`. **Uncertainty:** ±8% base + 6%/yr → ~±24% by Jan 2029.

Chip efficiency improvements factored in: GB200 ~2.5× H100e, Vera Rubin ~3× (2027+), Trainium3 ~1.5× Trn2, TPU Ironwood ~2.3×. Rubin Ultra H100e conversion pending public specs.

---

## 4 Sections

1. **THE RACE** (#race) — Key Insights (June 2026) → ACCESS/OWNERSHIP tabs → stat cards (3) → hero chart + leaderboard → ComputeBreakdownCard (collapsed, with Colossus tenant legs) → KnownLeasesCard (7 bullets) → ProjectionPanel → DATA footer (9 sources linked) → bridge to #models. OWNERSHIP tab adds: FrontierOutlookCard + OwnershipTable.
2. **GEO MAP** (#geomap) — Leaflet + ESRI satellite tiles, ~46 frontier pins (of 63 Epoch total), lab-colored (LIVE/BUILDING/PLANNED), region jump (US/UAE), satellite preview. Stargate 7-site portfolio + Colossus 1+2.
3. **INTEL** (#sites) — Sortable facility table (~46 frontier facilities), 10 signal types, confidence scoring (Epoch ~80% CI ±1.4×), drawer with satellite + timeline.
4. **MODELS** (#models) — Key Takeaways (June 2026) → Training Compute Growth scatter (23 models, ~5x/yr trend) → Within-Lab Scaling (GPT-5.5 + Opus 4.8) → FirstPrinciples explainer → BenchmarkTable (4 verified + 2 preview) → linked data sources → METR Time Horizons TH 1.1 (27 models, linear scale).

---

## Known Issues
1. ESRI API unauthenticated — rate-limited under traffic
2. Anthropic 25% override in `LAB_OWNERSHIP_CONFIG` may need updating as Epoch data catches up
3. Colossus tenant split (COL-ANT/COL-GGL/COL-XAI-ADJ) assumes MW-share and 1:1 GPU ratio — actual allocation may differ. A dev-mode assertion in `fleet.ts` + tests in `fleet.test.ts` enforce that the entries stay net-zero.
4. Epoch may rename owners again (SpaceXAI → something else post-IPO) — check `classifyLab` and `LAB_OWNERSHIP_CONFIG.selfOwned`
