# AI Arms Race Dashboard — Project Context

## What This Is
A standalone single-file HTML dashboard (~2,530 lines) tracking the AI infrastructure race — compute buildout, power capacity, frontier model benchmarks, and METR time horizons across the top 5 AI labs. Zero build tools. Hosted on GitHub Pages.

**Live URL:** https://adi-wasserman.github.io/ai-arms-race/
**Repo:** https://github.com/Adi-Wasserman/ai-arms-race
**File:** `index.html` (single file, GitHub Pages serves from root of `main` branch)

## Tech Stack
Single `<script>` tag with 5 CDN libraries, no frameworks, no bundler:
- **Chart.js 4.4.1** + annotation plugin — stepped-line time series chart + METR scatter chart
- **Leaflet 1.9.4** — geo map with ESRI satellite tiles + Carto dark labels
- **PapaParse 5.4.1** — CSV parsing for Epoch AI live data
- **Lodash 4.17.21** — sortBy, groupBy, uniq utilities
- **Moment.js 2.30.1** — date formatting for chart axes

## Architecture: 5-Layer IIFE Pattern
All code lives in one `<script>` tag, organized as 5 immediately-invoked function expressions:

### 1. CFG — Frozen config object
All constants. Never mutated at runtime (except nested objects like `coords` which are shallow-frozen). Top-level keys:
- `today` — dynamic via `new Date().toISOString().slice(0, 10)` (auto-updates)
- `labs` — `["OpenAI", "Gemini", "Meta", "xAI", "Anthropic"]`
- `colors` — hex color per lab
- `chips` — chip type per lab
- `labMap` — hardcoded handle→lab mapping for 22 facilities (fallback when Epoch CSV fails)
- `coords` — lat/lon per facility for map pins
- `rawTimeline` — 65 rows of hardcoded timeline data (fallback)
- `fleetEstimates` — additional capacity entries for Gemini TPU fleet (EGC) and Anthropic AWS fleet (EAI)
- `models` — 5 frontier models with 10+ benchmark scores each (snapshot data, not live)
- `benchmarks` — metadata for each benchmark
- `domains` — 7 domain groupings
- `allocations` — per-facility low/high dedication percentages
- `metrHorizons` — 21 data points for METR Time Horizons chart (TH1.1, snapshot data)

### 2. Data — Pure functions
No DOM access, no state mutation. Key functions:
- `buildTimeSeries` / `buildAllocatedTimeSeries` — converts entries into per-date per-lab cumulative series
- `detectLeadChanges` — finds dates where the leading lab changes
- `scoreConfidence` — computes 0-100 confidence score for a data center
- `extractObservations` — derives satellite observation badges from timeline text
- `classifyLab(users, owner)` — maps Epoch DC CSV fields to one of 5 labs
- `classifyByHandle(handle)` — infers lab from facility name patterns (used when DC CSV unavailable)
- `col(row, candidates, fallback)` — flexible column resolver with fuzzy matching for CSV column name changes
- `dmsToDecimal(dms)` — converts DMS coordinate strings (e.g. `32°35'25"N`) to decimal
- `fetchWithFallback(url)` — fetches with CORS proxy fallback chain + per-attempt 4s timeout
- `fetchEpoch()` — fetches both CSVs, gracefully handles partial success (DC CSV blocked, TL CSV works)
- `parseEpochData(dcRows, tlRows)` — parses CSVs into app-ready structures with flexible column names

### 3. Store — Single state object with subscriber pattern
**UI state:** metric, scope, allocView, hoveredLab, labFilter, statusFilter, sortBy, expandedDC
**Computed data:** labMap, dataCenters, timeline, series (6 variants: epoch/full × plain/low/high)

### 4. UI — DOM render functions
- `renderStats` — top stat cards
- `renderLegend` — color dots per lab
- `renderChart` — Chart.js stepped-line race chart with TODAY annotation
- `renderLeaderboard` — WHO'S WINNING panel
- `initMap` — Leaflet map (supports re-initialization for live data updates)
- `renderMapPreview` — satellite image preview panel
- `renderTable` — sortable INTEL data table
- `renderDrawer` — slide-in detail drawer
- `renderModels` — benchmark table with gold/silver/bronze ranking
- `renderMetr` — METR Time Horizons scatter chart (Chart.js)

### 5. App — Wiring
- `init()` — computes fallback data, renders immediately, then attempts live Epoch fetch
- Action functions exposed as `App.xxx()` for HTML onclick handlers

## 5 Sections

### THE RACE (#race)
Chart.js stepped-line time series. Toggles: H100e/POWER, TRACKED/+FLEET, FULL/DEDICATED.
Side leaderboard with point-in-time rankings. TODAY line. Solid=observed, dashed=projected.

### GEO MAP (#geomap)
Leaflet map with ESRI satellite tiles. Custom divIcon pins colored per lab. Pulsing animation for building sites. Region quick-jump (US/UAE). Satellite preview panel.

### INTEL (#sites)
Sortable data table. Columns: rank, status, site, lab, confidence, power, H100e, cost, observations. Lab + status filters. Click row → slide-in drawer with satellite hero, stats, timeline stepper.

### MODELS (#models)
Unified benchmark table — every benchmark as a row, every model as a column. Gold/silver/bronze ranking. Domain headers. Key finding callout. Model note cards. **Sticky header row** (pins below nav at top:48px when scrolling).

### METR TIME HORIZONS (within #models)
Chart.js scatter chart replicating the METR.org time horizons visualization. Linear Y-axis (hours), X-axis 2019-2026. 21 data points. Single green color for all dots. Model name labels on key inflection points. Task description annotations at hour marks. Dashed exponential trend line (~150-day doubling). Tooltip shows model name, release date, task length, version.

## Data Flow

### Three-Tier Graceful Degradation

| Scenario | Race Chart | Intel/Map | Status |
|---|---|---|---|
| Both Epoch CSVs load (via proxy) | Live | Live | `● LIVE` |
| Only timelines CSV loads (DC blocked by Cloudflare) | **Live** | Cached metadata | `● LIVE*` |
| Both fail | Cached | Cached | `● CACHED` |

**Current reality:** With the Vercel proxy deployed, both CSVs should load reliably → full `LIVE` mode. The proxy falls back gracefully to direct/CORS fetch if the proxy is down.

### Fallback (always available)
CFG.rawTimeline (65 rows) + CFG.labMap (22 mappings) → Data.buildTimeSeries() → Store. Renders on page load before any fetch completes.

### Live Epoch Fetch (attempted on init)
1. `fetchWithFallback` tries direct fetch, then corsproxy.io, then allorigins.win (4s timeout each)
2. 12s global timeout via `Promise.race`
3. DC CSV: usually fails (Cloudflare) → returns null
4. TL CSV: usually succeeds → 152 rows parsed
5. When DC CSV unavailable, `classifyByHandle()` builds a labMap from timeline handle names via keyword matching ("xAI Colossus..." → xAI, "Meta Prometheus..." → Meta, etc.)
6. Live entries fed to `buildTimeSeries` with the handle-derived labMap
7. Map re-initialized with updated data (supports destroy + recreate)

### Benchmark & METR Data (fully hardcoded)
CFG.models (5 models × 10+ scores) and CFG.metrHorizons (21 data points) are March 2026 snapshots. No live fetch. Must be manually updated per new model release.

## Source Attribution (per section)
Each section has a `<div class="fn">` footnote with linked sources:
- **THE RACE:** Epoch AI Frontier Data Centers (CC BY 4.0) + Methodology link
- **GEO MAP:** Epoch AI + ESRI World Imagery + CARTO Dark Labels + Leaflet
- **INTEL:** Epoch AI (data + methodology) + ESRI satellite preview
- **METR:** metr.org/time-horizons (TH1.1) + raw YAML + GitHub analysis + arXiv paper + RE-Bench + HCAST
- **MODELS:** Artificial Analysis v4.0, GPQA Diamond, SWE-bench, ARC-AGI-2, AIME, MMMU-Pro, HLE, OSWorld, BrowseComp
- **Global footer:** Epoch AI + ESRI + all benchmark sources

## Benchmark Data (March 2026 Snapshot)

| Benchmark | Domain | Leader | Source |
|-----------|--------|--------|--------|
| AA Intelligence Index | Overall | GPT-5.4 / Gemini 3.1 (tied at 57) | Artificial Analysis v4.0 |
| GPQA Diamond | Science | Gemini 3.1 Pro (94.3%) | GPQA Dataset, Epoch AI + AA |
| SWE-bench Verified | Coding | Claude Opus 4.6 (80.8%) | Princeton NLP |
| ARC-AGI-2 | Reasoning | Gemini 3.1 Pro (77.1%) | ARC Prize Foundation |
| AIME 2025 | Math | GPT-5.4 (100%) | AMC/MAA, AA |
| MMMU-Pro | Multimodal | Claude Opus 4.6 (85.1%) | mmmu-benchmark.github.io |
| OSWorld | Agents | GPT-5.4 (75.0%) | osworld.ai |
| BrowseComp | Agents | Claude Opus 4.6 (84.0%) | browsecomp.github.io |
| GDPval | Work | GPT-5.4 (83%) | OpenAI, AA verification |
| HLE | Frontier | Claude Opus 4.6 (53.0%) | CAIS (Dan Hendrycks) |

## METR Time Horizons Data (TH1.1, March 2026 Snapshot)
Source: https://metr.org/time-horizons/ — compiled from METR publications and corroborating analysis.
**Note:** Some values were compiled from secondary sources (LessWrong, OfficeChai, MIT Tech Review) rather than directly from METR's YAML data file. Key data points:
- GPT-2 (Feb 2019): ~9 seconds
- GPT-4 (Mar 2023): ~1.2 min
- o3 (Apr 2025): ~19 min
- GPT-5 (Aug 2025): ~2.3 hours
- Claude Opus 4.5 (Dec 2025): ~4.8 hours
- Claude Opus 4.6 (Feb 2026): ~14.5 hours (highest published)

## Allocation Model (EST. DEDICATED mode)
Three tiers of facility dedication:
- Tier 1 (85-100%): Purpose-built — xAI Colossus, Meta facilities, Stargate JV, Rainier
- Tier 2 (15-40%): Cloud partnerships — Azure→OpenAI, AWS→Anthropic
- Tier 3 (20-35%): General hyperscaler — Google DCs→Gemini

---

# Recent Changes (April 2026)

### Vercel Proxy for Epoch DC CSV
- New `epoch-proxy/` directory with a Vercel serverless function
- Proxies both `data_centers.csv` and `data_center_timelines.csv` past Cloudflare
- Integrated as first-attempt fetch in `fetchWithProxy()`, falls back to existing CORS chain
- 1hr cache with stale-while-revalidate for 24hr
- **Action required:** Deploy with `vercel --prod` and update `PROXY_BASE` URL in index.html

### Narrative Layer — Key Findings
- Added `.kf` callout boxes to all 5 sections (Race, Geo Map, Intel, Models, METR)
- **THE RACE** key finding is **dynamic** — updates via `renderStats()` with actual leader name, gap %, and lead change count
- Other sections have static but informative context paragraphs

### Staleness Indicators
- `.stale-badge` elements on Models and METR sections
- Computes age from snapshot date vs today: green (<30d) → amber (30-90d) → red (>90d)
- Shows "DATA AS OF 2026 03 · 19d AGO" style label
- Config in `SNAPSHOTS` array near App.init() — update dates when refreshing data

### OG Image Meta Tags
- Added `og:image` and `twitter:image` meta tags pointing to `/og-image.png`
- **Action required:** Take a 1200×630 screenshot of the Race chart and save as `og-image.png` in the repo root

### Shimmer Loading Skeleton
- Added `.skel` CSS class with shimmer animation for placeholder states
- Available for future use when adding loading states to sections

---

# Known Issues & Bugs

## Critical
1. **Epoch `data_centers.csv` blocked by Cloudflare** — ✅ ADDRESSED. A Vercel serverless proxy (`epoch-proxy/`) is now the primary fetch path. The proxy does a server-side fetch (bypassing Cloudflare's JS challenge) and returns the CSV with proper CORS headers. The app tries: Vercel proxy → direct fetch → corsproxy.io → allorigins.win, with 4s timeout per attempt. **Deploy steps:** `cd epoch-proxy && vercel --prod`, then update `PROXY_BASE` in index.html (line ~866) with the actual deployment URL. Free on Vercel Hobby tier.

2. **METR data from secondary sources** — Time horizon values compiled from LessWrong posts, OfficeChai articles, MIT Tech Review rather than directly from METR's YAML data file (which returned as binary). Some values may be imprecise. Should be validated against the actual METR data when possible.

## Moderate
3. **Sticky benchmark header may not work on all viewports** — Removed `overflow: hidden` from `.wm` to enable `position: sticky`, but the table has `min-width: 700px`. On medium-width screens, the table overflows without horizontal scroll containment.

4. **Map flash on live data** — When live data arrives, `initMap` destroys and recreates the entire Leaflet instance. If the user is viewing the map, they see a brief flash. Should use marker update instead of full re-init.

5. **METR chart tooltip stickiness** — Despite `mode: "point"` and `intersect: true`, tooltips can occasionally persist when moving between closely-spaced dots in the 2025-2026 cluster.

---

# Improvement Roadmap (Prioritized)

## P0 — Should Fix Next

### Mobile Responsiveness ← STILL P0, NEXT UP
Only one `@media` query exists (hides map panel below 900px). Everything else breaks on mobile:
- Race chart overflows
- Benchmark table (7 columns) is unusable
- Toggle buttons (10px font) aren't tappable
- 28px section padding assumes desktop
- METR chart labels overlap on small screens

**Fix:** Add responsive breakpoints at 768px and 480px. Stack layouts vertically. Make toggles larger. Hide non-essential columns on mobile. Use horizontal scroll wrappers where needed.

### ~~Add "Data as of" Staleness Indicator~~ ✅ DONE
Benchmark scores, METR data, fleet estimates, and allocations are hardcoded snapshots with no visible timestamp. A user opening this in 6 months has no way to know the data is stale.

**Fix:** Add a visible badge on each section showing "Data as of: Mar 2026" that shifts yellow→red as data ages (compare snapshot date to `CFG.today`).

### ~~Add Key Findings / Narrative Callouts~~ ✅ DONE
The dashboard shows data but never tells the viewer *what it means*. No "So what?" for someone unfamiliar with the space.

**Fix:** Add a 1-2 sentence "KEY FINDING" callout at the top of each section. Examples:
- THE RACE: "OpenAI leads with 1.6M H100e, but Anthropic's Rainier facility is the fastest-growing."
- MODELS: "No single model dominates. Three-way contest between GPT-5.4, Gemini 3.1, and Claude Opus 4.6."
- METR: "AI task completion ability has doubled every ~4 months since 2023. Claude Opus 4.6 can complete tasks that take humans 14.5 hours."

## P1 — Important Improvements

### Accessibility (Zero Currently)
0 alt attributes, 0 aria attributes, 0 role attributes, 0 heading tags. Screen readers see nothing.

**Fix:** Add semantic HTML (h1-h4 headings instead of styled spans), aria-labels on interactive elements, alt text descriptions for charts (canvas fallback), role attributes on navigation, color-blind-safe indicators alongside color-only signals.

### Reduce CDN Payload (531KB → ~300KB)
- Replace lodash (72KB) with native `Array.prototype.sort()`, `Array.from(new Set(...))`, `Array.prototype.map()`, `.reduce()` with grouping
- Replace moment.js (72KB) with `chartjs-adapter-date-fns` + `date-fns/format` (~15KB) or native `Intl.DateTimeFormat`
- Savings: ~130KB

### Fix 179 Inline Styles
JS-generated HTML builds style strings directly. Makes design changes nearly impossible.

**Fix:** Move all inline styles to CSS classes. Define `.stat-value`, `.stat-label`, `.drawer-hero`, `.drawer-stat-grid`, etc. Reference classes in JS instead of building style strings.

### CSS Class Names Are Cryptic
`.S`, `.st`, `.ss`, `.R`, `.T`, `.P`, `.fn`, `.mp`, `.dt` — single-letter classes.

**Fix:** Rename to readable names: `.section`, `.section-title`, `.section-subtitle`, `.row`, `.toggle-group`, `.pill-button`, `.footnote`, `.map-pin`, `.dot-indicator`. Can be done incrementally.

### Semantic HTML
Zero h1-h6 heading tags. Section titles are `<span class="st">`.

**Fix:** Replace with `<h2 class="st">` for section titles, `<h3>` for subsection titles. Wrap content in `<main>`. Add `<footer>` for attribution.

## P2 — Nice to Have

### METR Chart: Missing Models
Current chart has 21 data points. METR page has ~25+ (missing: Kimi K2 Thinking, gpt-oss-120b, Qwen models). Adding these would fill out the exponential curve better.

### METR Chart: Validate Against Primary Data
Download and parse `https://metr.org/assets/benchmark_results_1_1.yaml` properly (it returned as binary in our fetch). Cross-reference all 21 data points against the official values.

### METR Chart: Trend Line Calibration
Current trend line uses 150-day doubling anchored at GPT-5. METR's actual fitted trend uses 196-day doubling for full history. Should compute best-fit from actual data points rather than eyeballing.

### Benchmark Table: Too Many Nulls
Grok 4 has 10 null benchmarks. Llama 4 Maverick has ALL nulls. These rows add visual noise.

**Fix:** Either hide models with <3 benchmark scores, or add a "Limited data" indicator, or collapse null-heavy rows.

### Data Export
No way to download data as CSV, export charts as PNG, or share a specific view state.

**Fix:** Add download buttons per section. Use Chart.js `toBase64Image()` for chart export. Use URL hash for view state (`#race?metric=power&scope=fleet`).

### Compute-vs-Performance Scatter Plot
Discussed but not built. Plot H100e (X) vs benchmark score (Y) for each lab. Would answer "does more compute = better models?"

### Growth Rate / Velocity View
Show rate of change rather than absolute values on the race chart. Would highlight which lab is building fastest.

### Power/Grid Analysis Section
Break down power sources per facility. Show grid constraints. Relevant for infrastructure investors.

## P3 — Technical Debt

### ~~Server-Side Proxy for Epoch DC CSV~~ ✅ DONE
The `data_centers.csv` Cloudflare block could be fixed with a tiny Cloudflare Worker or Vercel edge function that proxies the request with proper headers. This would upgrade `LIVE*` to full `LIVE`.

### ESRI Satellite API is Unauthenticated
Satellite preview imagery uses ESRI's export API with no API key. Works for personal use but would hit rate limits under real traffic.

### Single-File Constraint
2,530 lines in one file. No minification, no tree-shaking, no code splitting. Manageable for now but increasingly unwieldy.

---

## Design Principles (Unchanged)
- **Single HTML file** — no build tools, no server, hosted on GitHub Pages
- **Dark space aesthetic** — deep navy gradients, monospace numbers, lab-colored accents
- **Satellite-grounded** — every data center has real satellite imagery from ESRI
- **Source transparency** — every data point traceable to a named source with clickable link
- **Graceful degradation** — live fetch failure never breaks the page
- **5 labs, parallel attribution** — OpenAI (Stargate+Azure), Gemini (Google DCs+TPU), Meta (owned), xAI (Colossus), Anthropic (Rainier+AWS)
