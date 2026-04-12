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

- **ComputeBreakdownCard** (`src/features/race/ComputeBreakdownCard.tsx`): collapsible card below the chart showing per-lab H100e calculation breakdown. 3+2 card layout (top row: Anthropic/Gemini/OpenAI with cloud-lease legs; bottom row: Meta/xAI satellite-only). Each card shows satellite-verified facilities + cloud-lease legs with sources, H100e conversion ratios, and future ramp timelines (solid pills = past, dashed = future). Always visible in both ACCESS and OWNERSHIP modes.

- **"Who Trains on Whose Chips"** (renamed from "Known Major Leases"): `KnownLeasesCard.tsx`. Now shown in ALL modes (was OWNERSHIP-only). 4 bullets: Microsoft Azure→OpenAI, Google (owns TPUs, used internally)→Gemini, AWS Trainium→Anthropic, Google (TPUs rented via Google Cloud + Broadcom)→Anthropic. Meta/xAI bullets removed (self-operated, redundant with calculations card). localStorage: `knownLeasesCardCollapsed_v1`.

- **Claude Mythos preview** (`src/data/models.ts`): unreleased Anthropic model from Project Glasswing. `preview: true` flag on `Model` type triggers dashed borders, amber "PREVIEW" / "NOT PUBLIC" badges in `BenchmarkTable.tsx`. No `aaIndex`, excluded from scatter plot.

- **Muse Spark replaces Llama 4 Maverick** (`src/data/models.ts`): Meta's frontier flagship (2026-04-08). `aaIndex: 52` independently measured; per-benchmark scores self-reported (flagged in `notes`).

- **Hardware Ownership view** (Race → scope=fleet → mode=ownership): `OwnershipTable` sourced from `useEpochChipOwners` (Epoch ZIP, JSZip + PapaParse, localStorage 24h TTL). **Auto-refreshes every 5 minutes** (force-refreshes on mount, no manual button).

- **OwnershipTable consolidated design**: editorial lede + SELF-OPERATED/SHARED HOST pills in header and per-row. Lab-colored rows (`--row-color` + `color-mix`). Lab-colored H100e and Power values. Column "H100e MEDIAN" (range removed). Chip mix bars scaled proportionally to `maxH100e`, 12px height, per-chip legend hidden (hover only). `table-layout: fixed`. Pulsing "UPDATING…" indicator replaces old refresh button.

- **OwnershipSidePanel removed from RaceSection** — file exists but not rendered. Don't delete without checking.

- **FrontierOutlookCard**: sparklines kept, growth data inline in proof text. OpenAI row gray (#7a7a7a). No YoY badges (removed — satellite data structurally undercounts cloud tenants, making per-lab YoY unreliable).

- **Leaderboard redesigned**: single metrics line per lab: `2.0M H100e · 1.91 GW · 25% owned`. Labels ("H100e", "owned") inline so readers understand each number. No separate OWNED progress bar (folded into metrics line). No analyst estimates (SemiAnalysis/ArtAnalysis removed — stale snapshots that added noise). Wider (320px), larger fonts (lab name 15px, metrics 12px), more row padding (10px). Chart height now hero-sized: `min-height: max(560px, 65vh)`.

- **Velocity toggle removed entirely**: deleted `src/services/velocity.ts`, `VelocityMode` type, `VelocityPoint`/`VelocitySeries` types, all store/hash/UI references. The absolute chart is the only view now. The velocity mode was confusing and rarely used.

- **YoY growth feature removed**: investigated per-lab YoY accuracy and found satellite data structurally undercounts cloud tenants (OpenAI showed 28× from a 58K H100e base in April 2025 — Microsoft's vast Azure fleet is invisible to satellite tracking; Meta/Anthropic showed "NEW" because facilities weren't online yet). Not reliable enough to surface. The LEAD CHANGES stat card was also removed.

- **Analyst estimates removed from Leaderboard**: SemiAnalysis/ArtAnalysis cross-checks were stale Q1 2026 snapshots. When they agreed with our numbers they were redundant; when they disagreed they were confusing. The `ANALYST_ESTIMATES` data in `projections.ts` still exists but is no longer imported by the Leaderboard.

- **Chart starts 2024** (was 2023). The 2023 period had only one lab (OpenAI/Microsoft Goodyear at 29K H100e) — not really a "race". The multi-lab buildout begins mid-2024 when Google and xAI come online. Updated subtitle: "POST-CHATGPT ERA (2024–)".

- **Master ACCESS / OWNERSHIP terminal-tab toggle**: ACCESS = `scope='fleet', raceMode='effective'`, OWNERSHIP = `scope='fleet', raceMode='ownership'`. Both force `scope=fleet`. Tab subtitles editorial — don't change without asking.

- **FirstPrinciples explainer** (`src/features/models/FirstPrinciples.tsx`): collapsible editorial card explaining 6 drivers of frontier model quality. Lede references Training Compute Growth and Within-Lab Scaling charts (not the removed R² scatter). No max-width on lede — matches principle rows width. localStorage: `firstPrinciplesCollapsed_v1`.

- **Training Compute Growth chart** (`src/features/models/TrainingComputeChart.tsx`): replaces old lab-positioning scatter (H100e vs AA Index, which had n=5 and R²=0.10). Now plots 21 model releases across 5 labs by year vs training FLOPs (log scale) with ~5×/year exponential trend. Old `ScatterPlot.tsx` still exists but is not imported.

- **Within-Lab Scaling chart** (`src/features/models/WithinLabScaling.tsx`): dual-axis line chart below the training compute scatter. Shows GPT and Claude families each using more FLOPs and scoring higher across 4 generations. Left Y = FLOPs (log), Right Y = performance score.

- **Key Insights card** at top of Race section (`RaceSection.tsx`): 2×2 grid card with green accent border. Covers compute leadership, scaling laws, ownership moat, benchmark parity.

- **Key Takeaways card** at top of Models section (`ModelsSection.tsx`): 4-point summary card. Green title, em-dash bullets.

- **Bridge paragraph** at bottom of Race section: green-accented callout linking infrastructure story to #models with scaling-laws thesis.

- **Truth & Data Limitations modal** (`TruthModal.tsx`): Section 4 "Data Sources by Section" lists all sources by priority (PRIMARY/SECONDARY/SUPPLEMENTARY) for The Race, Geo Map, Intel, and Models. Cloud-lease sources broken into 6 individually linked announcements (Amazon Project Rainier, Anthropic GCP TPU, NVIDIA Azure partnership, Google Ironwood, SemiAnalysis multi-DC training, Fubon Securities via Investing.com). Each source has clickable link where available + one-line description.

- **ComputeBreakdownCard source bar**: inline clickable links per cloud-lease calc row + compact footer with Sources (7 links) + Ramp method explanation. Replaced large data sources section.

- **Old Compute vs Performance scatter removed from ModelsSection** — `ScatterPlot.tsx` file kept but unimported. `scatterView`/`ScatterView` store state still exists (used by the file). The observed/projected toggle was removed from ModelsSection.

### Editorial framing — operator vs lab (DO NOT REVERT)

Epoch reports **operators**, not labs. Only Meta and xAI are operator=consumer (`self`). The other 3 are anchor tenants (`shared`). Don't treat `Microsoft H100e` as `OpenAI H100e`.

### Satellite data limitations for cloud tenants (DO NOT add per-lab YoY)

Epoch tracks purpose-built AI data centers visible from satellite imagery. This structurally undercounts cloud tenants:
- **OpenAI** had ~58K satellite-visible H100e in April 2025 but was training GPT-4o on hundreds of thousands of Azure GPUs across general-purpose data centers invisible to satellite tracking.
- **Anthropic** had 0 satellite-visible compute until June 2025 (Amazon facilities) despite training Claude 3.5 on AWS Trainium + Google Cloud TPUs.
- **Meta** had 0 satellite-visible H100e until Feb 2026 despite operating Prometheus since 2023 (Epoch's timeline shows 0 operational capacity until late 2025).

There is no public dataset for historical cloud-lease compute. Announcements giving hard numbers only started in late 2025 (Project Rainier, Google/Broadcom TPU deal). Do not attempt to compute per-lab YoY growth — it will produce misleading figures.

### Key files

```
src/features/race/ComputeBreakdownCard.tsx    # per-lab H100e calculation breakdown (3+2 cards)
src/features/race/ComputeBreakdownCard.module.css
src/features/race/KnownLeasesCard.tsx         # "Who Trains on Whose Chips" (all modes)
src/features/race/OwnershipTable.tsx          # consolidated ownership view
src/features/race/FrontierOutlookCard.tsx     # "2027+" summary (sparklines, no YoY)
src/features/race/Leaderboard.tsx             # single-line per lab, no analyst estimates
src/features/race/RaceSection.tsx             # master toggle + scope default
src/features/race/RaceChart.tsx               # hero-sized chart, starts 2024
src/features/race/StatCards.tsx               # 3 cards: leader, compute, power
src/features/models/TrainingComputeChart.tsx  # 21-model FLOPs scatter (replaces old ScatterPlot)
src/features/models/WithinLabScaling.tsx      # dual-axis GPT/Claude scaling chart
src/features/models/FirstPrinciples.tsx       # 6 first-principles explainer (collapsible)
src/features/models/ScatterPlot.tsx           # OLD — exists but NOT imported
src/features/models/BenchmarkTable.tsx        # preview model support (Mythos)
src/data/models.ts                            # MODEL_SPECS incl. Mythos preview
src/data/fleet.ts                             # cloud-lease estimates with ramp schedules
src/data/facilities.ts                        # FACILITY_COORDS (coordinate fixes applied)
src/store/slices/raceSlice.ts                 # default scope='fleet', no velocityMode
src/hooks/useEpochChipOwners.ts               # 5min auto-refresh, force-refresh on mount
src/services/ownershipMath.ts                 # computePctOwned, computeOwnedH100e
src/config/labOwnershipMapping.ts             # LAB_OWNERSHIP_CONFIG
src/types/benchmark.ts                        # Model type + preview?: boolean
src/components/ui/OwnershipSidePanel.tsx       # EXISTS but NOT rendered
src/components/ui/TruthModal.tsx              # 4 sections incl. Data Sources by Section
src/components/layout/DataBanner.tsx           # sticky bar + TruthModal mount
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

**None of these H100e numbers are directly stated in announcements.** Announcements give chip counts, TPU counts, dollar amounts, or power targets. We convert using estimated ratios and interpolate ramp schedules. The calculations card makes this transparent.

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
Deleted `src/services/velocity.ts`, `VelocityMode` type, all store/hash/UI references. Showed annualized growth rate (×/yr) per lab — confusing, rarely used, replaced the main chart entirely. The absolute chart is cleaner.

### YoY growth stats
Showed per-lab year-over-year multipliers in StatCards and FrontierOutlookCard. Removed because satellite data structurally undercounts cloud tenants (see "Satellite data limitations" section above). OpenAI showed 28× from a misleadingly low base.

### Analyst estimates in Leaderboard
SemiAnalysis/ArtAnalysis cross-check numbers. Stale Q1 2026 snapshots — redundant when they agreed, confusing when they differed. `ANALYST_ESTIMATES` data still exists in `projections.ts` but is not imported.

### LEAD CHANGES stat card
Removed alongside YoY. StatCards now shows 3 cards: LEADER TODAY, TOTAL COMPUTE, TOTAL POWER.

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
`FACILITY_COORDS` in `src/data/facilities.ts` compensates with short-name aliases + `FACILITY_COORD_OVERRIDES`. Fluidstack Lake Mariner was corrected from lake water to actual site [43.358, -78.604].

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

### localStorage preferences — synchronous useState init
Keys: `hardwareRealityCheckDismissed_v1`, `knownLeasesCardCollapsed_v1`, `firstPrinciplesCollapsed_v1`, `epochChipOwnersCache_v1`.

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
| `scatter` | `observed`, `projected` | `observed` | (legacy — toggle removed from UI but state still in store)
| `lab` | lab name | `ALL` |

`setScope` auto-resets `raceMode` → `'effective'` when leaving `'fleet'`.

Note: `velocity` param was removed from hash state (velocity toggle deleted).

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

## 6 Sections

1. **THE RACE** (#race) — Key Insights card → ACCESS/OWNERSHIP tabs → stat cards (3: leader, compute, power) → FrontierOutlookCard → toggles → hero chart + leaderboard (min 65vh) → ComputeBreakdownCard (with source bar) → KnownLeasesCard → ProjectionPanel → bridge to #models.
2. **GEO MAP** (#geomap) — Leaflet + ESRI satellite tiles, lab-colored pins, region jump, satellite preview.
3. **INTEL** (#sites) — Sortable facility table, filters, drawer with satellite + timeline, signal legend.
4. **MODELS** (#models) — Key Takeaways → Training Compute Growth scatter (21 models, ~5×/yr trend) → Within-Lab Scaling (GPT + Claude dual-axis) → FirstPrinciples explainer → transition callout → BenchmarkTable (head-to-head) → METR Time Horizons.

---

## Known Issues
1. METR data from secondary sources (LessWrong/OfficeChai, not primary YAML)
2. ESRI API unauthenticated — rate-limited under traffic
3. METR tooltip stickiness in 2025-2026 cluster
4. Anthropic 25% override in `LAB_OWNERSHIP_CONFIG` may need updating as Epoch data catches up
5. `ANALYST_ESTIMATES` in `projections.ts` is stale (Q1 2026) — no longer displayed but data remains
