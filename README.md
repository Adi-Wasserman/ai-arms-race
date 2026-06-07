# AI Arms Race

A React + TypeScript dashboard tracking the AI infrastructure race — compute buildout,
power capacity, frontier model benchmarks, and METR time horizons across the top 5 AI
labs (OpenAI, Gemini, Meta, xAI, Anthropic).

**Live:** <https://adi-wasserman.github.io/ai-arms-race/>

## What it shows

| Section | Content |
|---|---|
| **THE RACE** | Per-lab H100-equivalent and power buildout 2023 → 2029, with cloud-lease overlays (Anthropic 3-cloud fleet, Gemini TPU), ACCESS/OWNERSHIP views, and power-constrained 2029 projections with uncertainty bands. Key Insights card, leaderboard, and "Who Trains on Whose Chips" editorial. |
| **GEO MAP** | ~54 tracked frontier facilities on an ESRI satellite basemap with lab-colored pins (LIVE/BUILDING/PLANNED), status + lab filtering, region jump (US/UAE), and satellite preview panel. Covers Stargate 7-site portfolio (>9 GW), Colossus 1+2 (2 GW), and 14 Google sites. |
| **INTEL** | Sortable construction-confidence table with per-facility satellite hero, 10 observation signal types (cooling towers, permits, liquid cooling, PPAs, etc.), and full milestone timeline in a slide-out drawer. Epoch's ±1.4× capacity uncertainty at ~80% CI. |
| **MODELS** | Training compute growth scatter (21 models, ~5×/yr trend), within-lab scaling (GPT + Claude families), interactive benchmark matrix (11 benchmarks, gold/silver/bronze rankings), and METR Time Horizons TH 1.1 chart (27 models, ~129-day doubling). |

Toggles, filters, and the active lab selection are all serialized to the URL hash, so
any view is shareable via a copy-paste link.

### June 2026 highlights

- **Epoch DB expanded** to 63 data centers (was ~23). All frontier lab sites mapped with coordinates.
- **Stargate multi-site**: 7 US locations with >9 GW planned capacity by Q4 2028. Abilene operational at ~510K H100e / 590 MW.
- **Colossus expansion**: SpaceXAI targeting 2 GW across Memphis campus (555K GPUs, MACROHARDRR 3rd building).
- **Models updated**: GPT-5.5 (AA 60), Claude Opus 4.8 (AA 61, #1), Grok 4.3, Muse Spark, Claude Mythos (preview).
- **METR corrected**: Official TH 1.1 data from metr.org replaces secondary-source estimates. Claude Opus 4.6 = ~30 days (was incorrectly ~14.5 hours).
- **2029 projections refreshed**: OpenAI 15M H100e / 12 GW, Gemini 10M, Meta 7M, xAI 3.5M, Anthropic 10M.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite 5 |
| State | Zustand with feature slices |
| Charting | Chart.js 4 + react-chartjs-2 + chartjs-plugin-annotation + chartjs-adapter-date-fns |
| Mapping | Leaflet + react-leaflet (ESRI World Imagery + CARTO labels) |
| CSV parsing | PapaParse, JSZip (chip owners ZIP) |
| Dates | date-fns |
| Styling | CSS Modules + global design tokens |
| Deployment | GitHub Pages via GitHub Actions |

## Architecture

Feature-sliced — each section under `src/features/` is self-contained and may import
**downward** only:

```
features/* → components/*  →  (nothing)
    ↓             ↓
   store/      services/
    ↓             ↓
   types/    config/  +  data/
```

```
src/
├── types/      # Centralized TypeScript interfaces (no inline types anywhere)
├── config/     # Structural constants (lab names, colors, benchmark metadata, …)
├── data/       # Updatable values (facility coords, raw timeline, model specs, …)
├── services/   # Pure functions — fetch, parse, classify, build series, score, export
├── store/      # Zustand store + 5 feature slices (data / race / intel / models / map)
├── hooks/      # useEpochData (live CSV fetch + fallback), useHashState (URL sync)
├── styles/     # Global tokens.css + reset.css + typography.css
├── components/
│   ├── layout/ # Nav, DataBanner (shows Epoch data vintage date)
│   ├── charts/ # BaseChart wrapper + useChartExport
│   └── ui/     # Toggle, Pill, ExportMenu, SectionShell, ErrorBoundary, LabLegend, FacilityCountLine, TruthModal
└── features/
    ├── race/   # RaceSection + chart, leaderboard, stat cards, projection panel, ownership table, exports
    ├── map/    # MapSection + GeoMap, MapPreview, LabMarker
    ├── intel/  # IntelSection + IntelTable, FacilityDrawer, SignalLegend, exports
    └── models/ # ModelsSection + TrainingComputeChart, WithinLabScaling, BenchmarkTable, MetrChart, FirstPrinciples, exports
```

Each section is wrapped in its own `<ErrorBoundary>` in `App.tsx` so a crash in one
feature can't black out the others.

## Data sources

- **[Epoch AI Frontier Data Centers](https://epoch.ai/data/data-centers)** — 63 facilities, power, H100e, capital cost, construction timeline (live CSV, CC BY 4.0, with hardcoded fallback)
- **[Epoch AI Chip Owners](https://epoch.ai/data/ai-chip-owners)** — per-owner H100e medians, chip mix, Monte Carlo ranges (live ZIP, 5-min auto-refresh)
- **[Artificial Analysis v4.0](https://artificialanalysis.ai)** — Intelligence Index, speed, pricing
- **[METR Time Horizons TH 1.1](https://metr.org/time-horizons/)** — 50% task-completion horizon (27 models, official data)
- **[BenchLM](https://benchlm.ai)** — per-benchmark scores cross-reference
- Plus per-benchmark sources: [GPQA Diamond](https://gpqa-diamond.github.io), [SWE-bench Verified](https://www.swebench.com), [ARC-AGI-2](https://arcprize.org), [HLE](https://last-exam.ai), [OSWorld](https://osworld.github.io), [BrowseComp](https://openai.com/index/browsecomp), [GDPval](https://openai.com/index/gdpval), and provider system cards

## Run locally

```bash
npm install
npm run dev
# → http://localhost:5173/ai-arms-race/
```

## Build

```bash
npm run build      # type-check + Vite build → dist/
npm run preview    # serve dist/ on a local port
```

## Deploy

Push to `main` and the [GitHub Actions workflow](.github/workflows/deploy.yml)
type-checks, builds, and deploys to GitHub Pages automatically. First-time setup:
**Settings → Pages → Source: GitHub Actions**.

## Reference

The original single-file dashboard (~228 KB of vanilla HTML/JS) is preserved at
[`public/ai-arms-race.html`](public/ai-arms-race.html) and is served alongside the React
build at <https://adi-wasserman.github.io/ai-arms-race/ai-arms-race.html>.

## License

Data is CC BY 4.0 from the upstream sources (Epoch AI, METR, Artificial Analysis).
Code is unlicensed — fork freely, attribute the data sources.
