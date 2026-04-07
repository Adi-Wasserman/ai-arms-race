# AI Arms Race

A React + TypeScript dashboard tracking the AI infrastructure race — compute buildout,
power capacity, frontier model benchmarks, and METR time horizons across the top 5 AI
labs (OpenAI, Gemini, Meta, xAI, Anthropic).

**Live:** <https://adi-wasserman.github.io/ai-arms-race/>

## What it shows

| Section | Content |
|---|---|
| **THE RACE** | Per-lab H100-equivalent and power buildout 2023 → 2028, with optional cloud-lease overlays, growth-velocity view, and a power-constrained 2029 projection with uncertainty bands |
| **GEO MAP** | All 23 tracked frontier facilities on an ESRI satellite basemap with lab-colored pins, status filtering, and a satellite preview panel for the selected facility |
| **INTEL** | Sortable construction-confidence table with per-facility satellite hero, observation badges, and full milestone timeline in a slide-out drawer |
| **MODELS** | Compute-vs-performance scatter (H100e × AA Index, bubble-sized by power), interactive head-to-head benchmark matrix with gold/silver/bronze rankings, and the METR Time Horizons chart |

Toggles, filters, and the active lab selection are all serialized to the URL hash, so
any view is shareable via a copy-paste link.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite 5 |
| State | Zustand with feature slices |
| Charting | Chart.js 4 + react-chartjs-2 + chartjs-plugin-annotation + chartjs-adapter-date-fns |
| Mapping | Leaflet + react-leaflet (ESRI World Imagery + CARTO labels) |
| CSV parsing | PapaParse |
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
│   ├── layout/ # Nav, DataBanner
│   ├── charts/ # BaseChart wrapper + useChartExport
│   └── ui/     # Toggle, Pill, ExportMenu, SectionShell, ErrorBoundary, LabLegend, FacilityCountLine
└── features/
    ├── race/   # RaceSection + chart, leaderboard, stat cards, projection panel, exports
    ├── map/    # MapSection + GeoMap, MapPreview, LabMarker
    ├── intel/  # IntelSection + IntelTable, FacilityDrawer, SignalLegend, exports
    └── models/ # ModelsSection + ScatterPlot, BenchmarkTable, MetrChart, exports
```

Each section is wrapped in its own `<ErrorBoundary>` in `App.tsx` so a crash in one
feature can't black out the others.

## Data sources

- **[Epoch AI Frontier Data Centers](https://epoch.ai/data/data-centers)** — facility list, power, H100e, capital cost, construction timeline (live CSV with hardcoded fallback)
- **[Artificial Analysis v4.0](https://artificialanalysis.ai)** — Intelligence Index, speed, pricing
- **[METR Time Horizons TH1.1](https://metr.org/time-horizons/)** — 50% task-completion horizon
- Plus per-benchmark sources: [GPQA Diamond](https://gpqa-diamond.github.io), [SWE-bench Verified](https://www.swebench.com), [ARC-AGI-2](https://arcprize.org), [HLE](https://last-exam.ai), [OSWorld](https://osworld.github.io), and provider system cards

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
