# AI Arms Race Dashboard — Project Context

## What This Is
A React + Vite dashboard tracking the AI infrastructure race — compute buildout, power capacity, frontier model benchmarks, and METR time horizons across the top 5 AI labs. TypeScript throughout. Deployed on GitHub Pages.

**Live URL:** https://adi-wasserman.github.io/ai-arms-race/
**Repo:** https://github.com/Adi-Wasserman/ai-arms-race

---

## Current State (post-migration)

The P1+P2 migration is **done**. All 4 sections ship and render from live
Epoch AI data with fallback. Recent feature work (post-migration):

- **Muse Spark replaces Llama 4 Maverick** (Models section, `src/data/models.ts`):
  Meta Superintelligence Labs released Muse Spark on 2026-04-08 as
  their new frontier flagship. The old Llama 4 Maverick row (which
  had all-null benchmarks) is gone. Muse Spark has: `aaIndex: 52`
  (independently measured by Artificial Analysis on release day),
  `gpqa: 89.5`, `swebench: 77.4`, `swebenchPro: 52.4`,
  `arcAgi2: 42.5`, `mmmuPro: 80.4`, `hle: 50.4` (With Tools).
  The AA Index is the only independent score; per-benchmark numbers
  are self-reported by Meta and flagged as such in the `notes` field.
  `costIn/costOut: 0` (undisclosed), `context: 0` (undisclosed),
  `speed: null`. The `notes` field includes a provenance sentence:
  *"AA Intelligence Index (52) is independently measured by
  Artificial Analysis; per-benchmark scores are self-reported by Meta
  and pending independent re-runs from AA / Epoch."* When AA or Epoch
  publish independent per-benchmark runs, update the fields and
  remove the self-reported caveat.

- **Hardware Ownership view** (Race section → scope=fleet → mode=ownership):
  new `OwnershipTable` sourced from `useEpochChipOwners` which fetches
  `https://epoch.ai/data/ai_chip_owners.zip`, parses via JSZip + PapaParse,
  caches in `localStorage` (24h TTL, key `epochChipOwnersCache_v1`).
- **Chip-mix palette**: bounded hue ranges per manufacturer (greens for
  Nvidia, blues for Google TPU, ambers for AWS Trainium, reds for AMD,
  purples for Huawei). Per-chip-type legend always visible; portal-based
  hover popover escapes the table's `overflow-x: auto` clipping.
- **Hybrid % Owned column**: structural mapping in
  `src/config/labOwnershipMapping.ts` (`LAB_OWNERSHIP_CONFIG`) with
  `selfOwned` (Epoch owner names) + optional `overridePct`. Calculation in
  `src/services/ownershipMath.ts` — `computePctOwned(lab, totalFleetH100e,
  chipOwners)` returns `{ pct, ownedH100e, isDerivedFromEpoch, footnote? }`.
  Expected values: Gemini/Meta 100%, xAI ~99%, Anthropic 25% (override, *),
  OpenAI 0% (override). Shared `PCT_OWNED_TOOLTIP` + `PCT_OWNED_FOOTNOTE`
  surfaced in both `Leaderboard` (sidebar) and `OwnershipTable` (full view).
- **"Who Owns the AI Chips?" panel**: full-width horizontal
  strip below the Race chart row, mounted in `RaceSection.tsx` between
  `chartRow` and `ProjectionPanel`. Despite the filename
  (`OwnershipSidePanel.tsx`), it is **NOT a sidebar** — it's a 5-card
  grid of frontier-anchored hyperscalers (Google, Microsoft, Amazon,
  Meta, xAI sorted by H100e desc), each with a `SELF-OPERATED` (green)
  / `SHARED HOST` (amber) integration pill. Cards are `<button>`s that
  click-through to the Hardware Ownership table — see the editorial
  framing + click-through pattern below.
- **Frontier Leadership Outlook card**: collapsible summary
  card mounted in `RaceSection.tsx` directly after `<StatCards />` and
  before the master toggle, gated on `scope === 'fleet'`. Title: *"Who
  is positioned to lead frontier models in 2027+?"*. Lives in
  `src/features/race/FrontierOutlookCard.tsx` — despite the file
  location it is NOT race-section-specific UI (no chart, no toggles),
  it's a strategic overview that ranks the 5 labs by % Owned descending
  with a per-row "data proof" line, a sparkline of Epoch's cumulative
  chip-owner timeseries since 2022 (only for the 3 self-operated labs
  Gemini/Meta/xAI — OpenAI and Anthropic show "N/A — cloud-dependent"),
  and a footnote explaining the override path. Lede paragraph reacts
  to `raceMode` via Zustand selector — different first sentence in
  ACCESS vs OWNERSHIP mode. Header has a "Data: Epoch AI Chip Owners
  (live)" badge with a green dot, a "Currently viewing" mode indicator,
  and an `ⓘ` info icon linking to Epoch's chip-owners blog post.
  **OpenAI's row is gray, not green** — its lab brand color (#10a37f)
  reads as "good/positive" but OpenAI is the 0%-owned "last place"
  row, so the row uses #7a7a7a accent + #9a9a9a name text as a local
  override. **The footnote has a dated callout block** (amber
  left-border) for breaking news that bears on the card's thesis — as
  of 2026-04-07 it surfaces the Anthropic ↔ Google + Broadcom multi-GW
  TPU deal (announced 2026-04-06) with a link to anthropic.com.

- **Master ACCESS / OWNERSHIP terminal-tab toggle**: flat mono-caps
  tab control (`max-width: 930px`, no border-radius) directly under
  the section intro. Each tab has a `01 /` / `02 /` numeric prefix
  in `--font-mono`, 15.5px / 0.23em letter-spacing label, and a
  13px sans-serif subtitle. The active tab gets a 3px accent
  underline (`linear-gradient(90deg, #00d4ff, #4d8eea)` +
  `box-shadow: 0 0 16px`) that animates in via `scaleX` over 320ms
  cubic-bezier, plus a faint cyan top-glow background. Inactive tab
  is dim (`rgba(255,255,255,0.42)`) and brightens on hover. Mobile
  (<768px) collapses to vertical with a 3px left-border accent in
  place of the underline. ACCESS = `scope='fleet' +
  raceMode='effective'`, OWNERSHIP = `scope='fleet' +
  raceMode='ownership'`. Both selections force `scope=fleet` so the
  ownership lens presupposes the cloud-lease-adjusted fleet — the
  secondary scope toggle in `toggleRow` is still available for fine-
  grained satellite-verified-only control. CSS classes:
  `.terminalTabs`, `.terminalTab`, `.terminalTabActive`,
  `.terminalTabLabel`, `.terminalTabPrefix`, `.terminalTabSub`,
  `.terminalTabsInfo`. Mode-specific headline *"Hardware Ownership —
  Who controls the silicon (Epoch AI live data)"* with a live blue
  dot is rendered above `OwnershipTable` in OWNERSHIP mode only.

- **Operator/lab badges in OwnershipTable** (OWNERSHIP mode):
  three-category taxonomy as tiny mono-font pill chips in the
  `OWNER / LAB` column:
    - `Pure Owner` (green) — Meta, xAI, Google/Alphabet
    - `Cloud Provider` (blue) — Microsoft, Oracle, Amazon
    - `Major Tenant` (gray) — OpenAI, Anthropic
  The operator badge sits next to the top-line owner name. When the
  mapped lab is a Major Tenant (Microsoft → OpenAI, Amazon →
  Anthropic), a second gray Major Tenant badge sits next to the
  "→ Lab" sub-label and the entire row gets a `.rowMajorTenant`
  background tint (`rgba(255,255,255,0.022)`). Constants live at
  the top of `OwnershipTable.tsx`:
  `PURE_OWNER_OPERATORS`, `CLOUD_PROVIDER_OPERATORS`,
  `MAJOR_TENANT_LABS`. The `LabBadge` component is local to
  `OwnershipTable.tsx`.

- **HardwareRealityCheckPanel**: full-width editorial card mounted
  in `RaceSection.tsx` between `OwnershipSidePanel` (snapshotRow)
  and `ProjectionPanel`. Visible in both modes. Internal **3-column
  grid** (1.35fr / 1fr / 1.2fr) so it fills the full content width:
    1. Top 5 owners horizontal bar chart (lab-colored where the
       operator maps to a tracked lab, neutral gray otherwise)
    2. Total cumulative ownership growth sparkline since 2022 with
       start/end captions, sums `byOwner` per quarter from
       `chipOwners.timeseries`, defensively trims leading zeros
    3. Three editorial bullets (OpenAI 0%, Gemini largest fleet,
       Anthropic 25% rising) + amber-bordered "% Owned override"
       footnote
  Dismissible — preference persists in localStorage key
  `hardwareRealityCheckDismissed_v1`, read synchronously in
  `useState`'s initializer so a dismissed panel never flashes
  visible-then-hidden on hydration. Mobile breakpoint at 900px
  collapses the 3-col grid to single-column.

- **KnownLeasesCard**: minimalist collapsible editorial card mounted
  in `RaceSection.tsx` directly after `OwnershipTable` inside the
  `isOwnership` branch. **OWNERSHIP mode only.** Surfaces the
  public cloud → lab relationships that the operator-row table
  cannot show directly because Epoch reports operator totals, not
  per-tenant allocation. Six bullets (Microsoft Azure + Stargate →
  OpenAI · Google TPU fleet → Gemini · AWS Trainium + EC2 →
  Anthropic · Google + Broadcom multi-GW TPU → Anthropic · Meta
  Hyperion + Prometheus → Meta · xAI Colossus 1+2 → xAI). Disclaimer
  block: *"Exact fractional allocation of each hyperscaler's chips
  to each lab is proprietary and not published by Epoch."* Header
  is the toggle (chevron + title + italic subtitle). localStorage
  key `knownLeasesCardCollapsed_v1`, also read synchronously on
  first render to avoid flash.

- **TruthModal** + **DataBanner sticky redesign**: methodology /
  sources / overrides / uncertainty modal. Lives at
  `src/components/ui/TruthModal.tsx`, mounted **inside DataBanner**
  (not Nav). Trigger is the new `ⓘ ABOUT THIS DATA` button in the
  DataBanner action row alongside `↻ REFRESH` and `📋 SHARE`.
  Three sections: (1) Sources with direct ZIP/CSV download links,
  (2) "Why we show cloud providers as the owners" with a methodology
  paragraph + the full `LAB_OWNERSHIP_CONFIG` table iterated from
  the source of truth (override rows get amber tint + override-pct
  badge), (3) Uncertainty notes (six structured rows). Modal is
  Escape-dismissable, backdrop-click-dismissable, locks body scroll,
  auto-focuses the close button on open. **DataBanner is now
  `position: sticky; top: 48px; z-index: 900;`** with a darker
  background + `backdrop-filter: var(--blur-nav)` so it stays
  legible when content scrolls under, and the methodology trigger
  travels with the user on scroll. Nav bar is back to plain
  navigation — no truth button.

- **`computeOwnedH100e` helper** (in `src/services/ownershipMath.ts`):
  raw lab-level owned median, propagates 5th/95th Monte Carlo
  range. Distinct from `computePctOwned`'s `ownedH100e` field —
  no override fallthrough. Returns `{ median, low, high,
  isDerivedFromEpoch, sources }`. OpenAI / Anthropic always return
  zero from this — by design — because the override path lives in
  `computePctOwned` only.

- **`OwnershipLabTable.tsx` (file exists, not currently rendered)**:
  earlier prompt experimented with a lab-row pivot (5 rows keyed
  to LAB_NAMES instead of 8 operator rows). After A/B comparison
  the user preferred the original operator-row `OwnershipTable`
  for the chip-mix bars + Monte Carlo range column + confidence
  badges. The lab-row file is left in place in case it's reused
  later — currently tree-shook out of the bundle since nothing
  imports it. Don't delete without checking with the user.

- **Footer / sources readability pass**: `OwnershipSidePanel`
  summary footer + `OwnershipTable` table footer were both set in
  `var(--color-text-tertiary)` (`rgba(255,255,255,0.3)`) — the exact
  failure mode the project's own design memory warns against. Both
  promoted to `12.5px / rgba(255,255,255,0.78)` body text. The
  `OwnershipTable` footer was also slimmed from a 4-paragraph wall
  of fine print to three readable lines (the † marker explanation,
  the editorial framing, and a pointer to the Truth modal for the
  full methodology / uncertainty / override surface area). The
  `PCT_OWNED_FOOTNOTE` import + the technical caveats paragraph
  (confidence bands / projection logic / owner→lab attribution)
  were removed because the Truth modal section 2 already has all
  of it.

### Editorial framing — operator vs lab (DO NOT REVERT)

Epoch's dataset reports **operators**, not labs — "Microsoft bought
3.4M H100e" with no breakdown of how much is OpenAI vs. Bing/Copilot/
Azure customers. Earlier iterations of the panel labeled bars directly
as "OpenAI / Anthropic / Gemini" which silently over-attributed each
hyperscaler's full chip total to its frontier partner. **The user
explicitly pushed back on this** — the panel now matches Epoch 1:1 on
the operator label and uses the integration pill to surface the
structural difference.

Only **Meta and xAI are operator = consumer** (`integration: 'self'`).
The other 3 are anchor tenants on shared infrastructure
(`integration: 'shared'`). The single defensible quantitative claim is
in the panel header: *"5 hyperscalers buy the chips — but only 2 of 5
frontier labs actually operate them. The other 3 are tenants on
shared infrastructure."* Don't add invented self-owned percentages,
sparklines that imply growth from cumulative-reporting artifacts, or
any framing that treats `Microsoft H100e` as `OpenAI H100e`.

### Click-through pattern — panel cards → OwnershipTable row highlight

The OwnershipSidePanel cards trigger a navigation flow that:

1. Sets `scope='fleet'` and `raceMode='ownership'` (the slice's
   `setScope` setter auto-resets `raceMode` when leaving fleet, but
   here we're entering it, so the order is safe).
2. Sets `highlightedOwner` in `raceSlice` to the Epoch owner name
   (e.g. "Google", "Microsoft").
3. Smooth-scrolls `#race` into view.

The `OwnershipTable` consumes `highlightedOwner` via a `useEffect`,
looks up the row in a `rowRefs: useRef<Map<string, HTMLTableRowElement>>`,
calls `scrollIntoView({ behavior: 'smooth', block: 'center' })`, and
applies a `.rowHighlight` class for a 1.8s blue flash keyframe
(`rowFlash` in `OwnershipTable.module.css`). The store value is
cleared after 1800ms via `setTimeout` so re-clicking the same card
re-fires the effect.

**Footgun:** the `setHighlightedOwner` call in the click handler is
deferred via `requestAnimationFrame` because the OwnershipTable might
not be mounted yet when scope/mode change — without the defer, the
effect runs against an empty `rowRefs` map and the highlight no-ops.
The handler also calls `setHighlightedOwner(null)` first so that
re-clicking the SAME card (where the value would otherwise be unchanged)
still re-fires the effect.

### OwnershipTable row order

`OwnershipTable` reorders `data.latestByOwner` before passing to
`deriveRows`: **frontier-anchored owners first** (sorted by H100e desc
— Google, Microsoft, Meta, Amazon, xAI), then **non-frontier**
(Other, Oracle, China, also sorted desc). Ranks are renumbered 1–8
against the new ordering, so gold/silver/bronze marks the top 3
frontier-anchored operators rather than mixing in `Other`. This
mirrors the panel's ordering so the two views read as a coherent pair.
Frontier membership is checked via `OWNER_TO_LAB[owner] != null`.

### Key files for ownership work

```
src/config/labOwnershipMapping.ts        # LAB_OWNERSHIP_CONFIG + tooltip/footnote
src/services/ownershipMath.ts            # computePctOwned, computeOwnedH100e (raw median),
                                         # computeManufacturerMix, LAB_TO_OWNER
src/services/chipOwners.ts               # ZIP fetch + parse + cache + buildTimeseries
src/store/slices/chipOwnersSlice.ts      # chipOwners, version, lastUpdated
src/store/slices/raceSlice.ts            # + highlightedOwner field for panel→table jumps
src/hooks/useEpochChipOwners.ts          # StrictMode-safe fetch, refresh()
src/features/race/OwnershipTable.tsx     # operator rows + LabBadge taxonomy +
                                         # frontier-first row reorder + highlight effect +
                                         # slimmed 3-line footer
src/features/race/OwnershipTable.module.css  # .rowHighlight + rowFlash keyframe +
                                             # .badge* + .rowMajorTenant + .footer*
src/features/race/OwnershipLabTable.tsx  # LAB-row pivot (NOT currently rendered — kept
                                         # for possible future reuse, tree-shook out)
src/features/race/Leaderboard.tsx        # sidebar — single OWNED progress bar
src/features/race/Leaderboard.module.css
src/features/race/FrontierOutlookCard.tsx       # collapsible "2027+" summary card
src/features/race/FrontierOutlookCard.module.css
src/features/race/HardwareRealityCheckPanel.tsx  # full-width 3-col editorial card,
                                                 # localStorage-dismissible
src/features/race/HardwareRealityCheckPanel.module.css
src/features/race/KnownLeasesCard.tsx    # OWNERSHIP-only collapsible "Known Major
                                         # Leases" card (public info, not in Epoch ZIP)
src/features/race/KnownLeasesCard.module.css
src/features/race/RaceSection.tsx        # master ACCESS/OWNERSHIP terminal-tab
                                         # toggle + mode-specific headline + body branch
src/features/race/RaceSection.module.css # .terminalTabs / .terminalTab* +
                                         # .modeHeadline + .modeHeadlineDot/Sub
src/components/ui/OwnershipSidePanel.tsx # "Who Owns the AI Chips?" strip (NOT a sidebar)
src/components/ui/OwnershipSidePanel.module.css  # color-mix(in oklab) per-card tints +
                                                 # readable summary footer (12.5px / 0.78)
src/components/ui/ManufacturerMixBar.tsx
src/components/ui/TruthModal.tsx         # methodology modal — sources, ownership config
                                         # table, uncertainty notes
src/components/ui/TruthModal.module.css
src/components/layout/Nav.tsx            # plain nav (truth button removed — moved to DataBanner)
src/components/layout/DataBanner.tsx     # sticky data-status bar + ⓘ ABOUT THIS DATA
                                         # button that opens TruthModal
src/components/layout/DataBanner.module.css  # position: sticky + backdrop-filter +
                                             # .buttonInfo blue variant
scripts/check-spark.ts                   # diagnostic — verify Epoch ZIP timeseries per owner
scripts/diagnose-epoch-chipowners.ts     # one-off Epoch ZIP schema diagnostic
```

---

## Deployment Workflow (IMPORTANT — two repos)

There are **two working copies** of the repo on this machine:

1. `/Users/adiwasserman/ai-arms-race` — primary source (has `node_modules`,
   used for `npm run dev`, `npm run build`, `tsc --noEmit`). **NOT a git
   repo** — no `.git`.
2. `/tmp/ai-arms-race-deploy` — git clone of
   `github.com/Adi-Wasserman/ai-arms-race`. Used for commits + push.
   **No `node_modules`** — CI builds it.

### To ship a change
1. Edit files under `/Users/adiwasserman/ai-arms-race/src/...`
2. `npx tsc --noEmit` + `npm run build` in the source repo (must pass)
3. `cp` every changed file into `/tmp/ai-arms-race-deploy/src/...`
   — **use `diff -rq` to catch missing files**, e.g.:
   ```
   diff -rq /Users/adiwasserman/ai-arms-race/src /tmp/ai-arms-race-deploy/src
   ```
4. `cd /tmp/ai-arms-race-deploy && git add ... && git commit && git push`
5. GitHub Actions `.github/workflows/deploy.yml` builds + deploys to Pages

### Known footgun
Every time I've skipped step 3's `diff` check I've missed files. Prior
incidents: `ManufacturerMixBar.tsx`, `ownershipMath.ts`, updated
`*.module.css` files — all compiled locally but broke CI because they
weren't mirrored. **Always `diff -rq` before committing.**

---

## Epoch AI Chip Owners ZIP — data shape reference

Source: `https://epoch.ai/data/ai_chip_owners.zip`
Fetched via `src/services/chipOwners.ts` with a CORS proxy fallback
(`https://corsproxy.io/?...`) because Epoch's host doesn't send CORS
headers. Parsed via JSZip + PapaParse, dispatched by **filename suffix**
(not hard-coded names) so Epoch can rename files without breaking us.

**Current contents (as of 2026-Q1):**
| File | Rows | Purpose |
|---|---|---|
| `cumulative_by_designer.csv` | 194 | Historical cumulative H100e per owner |
| `cumulative_by_chip_type.csv` | 489 | Historical cumulative per (owner, chip type) |
| `quarters_by_chip_type.csv` | 358 | Quarterly deliveries per (owner, chip type) |

**8 owners** in the dataset: `Microsoft`, `Meta`, `Amazon`, `Google`,
`Oracle`, `xAI`, `China`, `Other`. Epoch does NOT currently split
`Alphabet` from `Google` or surface `Anthropic` as a standalone owner —
hence the override path in `LAB_OWNERSHIP_CONFIG`.

**5 manufacturers**: `Nvidia`, `Google`, `Amazon`, `AMD`, `Huawei`.
**~24 chip types** across those mfrs (A100, H100/H200, B200, B300, TPU
v4/v4i/v5e/v5p/v6e/v7, Trainium1/2, Instinct MI250X/300A/300X/etc.,
Ascend 910B/C, Nvidia China variants A800/H800/H20).

**`OWNER_TO_LAB`** (in `src/types/chipOwners.ts`) — approximate
attribution, documented as such in the table footnote:
```
Microsoft → OpenAI       (includes Bing/Office workloads, not just OAI)
Amazon    → Anthropic    (includes general AWS, not just Anthropic)
Google    → Gemini       (includes all Google, not just Gemini's slice)
Meta      → Meta
xAI       → xAI
Oracle, China, Other → no lab attribution
```

**`EpochChipOwnersData`** shape (in `src/types/chipOwners.ts`):
```ts
{
  asOf: string;                    // ISO date from the newest row
  latestByOwner: OwnerSnapshot[];  // cumulative, sorted by h100e desc
  timeseries: OwnerTimeseries[];   // for future charting
  rawRowCount: number;
}

OwnerSnapshot {
  owner: string; h100e: number; h100eLow: number; h100eHigh: number;
  powerMw: number; asOf: string;
  byChipType: Array<{ chipType, manufacturer, h100e }>;
}
```

Diagnostic script if Epoch changes schema again:
`scripts/diagnose-epoch-chipowners.ts` (node-runnable) — fetches the
ZIP, lists files, parses sample rows, prints owners/mfrs/chip types.

---

## Gotchas learned the hard way (do NOT re-discover)

### Chart.js controllers must be explicitly registered
`BaseChart.tsx` registers `LineController, ScatterController,
BarController, BubbleController` alongside scales/plugins. **Required
even for `react-chartjs-2`**: Vite tree-shakes unused exports in prod,
and controllers loaded implicitly in dev get pruned, causing
`"line" is not a registered controller` to throw only in the production
build. If you add a new chart type, register the controller.

### StrictMode-safe data fetching
`useEpochData` and `useEpochChipOwners` both guard with a module-level
`bootstrapStarted` (or `startedRef`) flag — **not** the classic
`cancelled` flag in the cleanup. StrictMode's intentional
unmount/remount trips the cancelled flag during the first effect run,
preventing `setData` from ever being called. Use the module-level
flag pattern; don't revert to `let cancelled = false; return () => {
cancelled = true }`.

### Module-level singleton fetch dedupe
`useEpochChipOwners` stores an `inflightFetch: Promise | null` at
module scope so that mounting the hook from multiple places (e.g.
`App.tsx` + a future component) only triggers one ZIP download.

### `dataVersion` + `chipOwnersVersion` memo invalidation
Both slices bump a version number on hydrate. Any `useMemo` that
derives from `seriesFull` / `chipOwners` should depend on the version,
NOT the object reference — with the eslint-disable-next-line escape
so `react-hooks/exhaustive-deps` doesn't demand the object in the dep
array. Pattern already used in `Leaderboard.tsx` and `OwnershipTable.tsx`.

### Epoch CSV schema drift — facility coordinates
In early 2026 Epoch dropped `Latitude`/`Longitude` columns from their
satellite-verified CSV. `src/data/facilities.ts` compensates with:
- `FACILITY_COORDS` extended with Epoch's **short-name aliases** for
  all 22 tracked sites (not just long names).
- `FACILITY_COORD_OVERRIDES` map — hand-verified coordinates that
  beat Epoch's value when Epoch ships something off by km's (e.g.
  Microsoft Fairwater Wisconsin was in the middle of a lake).

If the map ever shows <22 facilities, first check whether new
handles need to be added to `FACILITY_COORDS`.

### vite.config.js shadowing vite.config.ts
`tsc -b` previously emitted a `vite.config.js` to project root that
Vite preferred over the `.ts` version, silently breaking the `@/`
alias. Fix is in place (`tsconfig.node.json` has `outDir:
./node_modules/.cache/tsconfig-node`) — do NOT remove.

### `color-mix(in oklab, ...)` per-card tinting

`OwnershipSidePanel.module.css` derives every per-card accent (top
glow line, background gradient, operator name color, anchor lab name
color, bar fill, hover border, focus ring) from a single CSS custom
property `--card-color` set inline by the component. The mixing uses
`color-mix(in oklab, var(--card-color) X%, transparent | white)` —
OKLab gives perceptually-uniform tints (true pastels, not muddy
darkened versions), so the saturated lab brand colors only ever
appear as low-opacity surfaces.

**Browser support is fine** — `color-mix` is in all modern browsers
since 2023 (Chrome 111+, Safari 16.2+, Firefox 113+). No fallback
needed. If you ever rip this out, the fallback would be passing 5
pre-mixed colors per lab through inline styles, which is uglier and
duplicates what the CSS already does.

### Panel→table click-through requires requestAnimationFrame defer

In `OwnershipSidePanel.tsx`, the `jumpToOwnershipRow` handler calls
`setHighlightedOwner(null)` first, then defers the actual
`setHighlightedOwner(ownerName)` inside `requestAnimationFrame`.
Both are load-bearing:

- The `null` clear lets re-clicking the SAME card re-fire the
  highlight effect (otherwise the value would be unchanged and
  the effect wouldn't run).
- The rAF defer waits for the OwnershipTable to mount after the
  scope/raceMode change. Without it, the table's effect runs against
  an empty `rowRefs.current` Map and the row scroll/highlight no-ops.

If you ever simplify this to a single synchronous setter call, the
highlight will silently break only on cold-jumps from `effective`
mode, which is the most common entry path.

### Legacy HTML at `public/ai-arms-race.html`
The original vanilla-JS single-file app lives at `public/` so Vite
copies it to `dist/` as a static asset. Needed for backlinks from old
places that still point at `/ai-arms-race.html`. Do not delete.

### High-res PNG exports
`useChartExport` captures at `window.devicePixelRatio * 2` (or a
forced 3200px target width) to produce crisp shareable images. Low-res
export is a regression, not a feature.

### `<ol>` markers leak through `list-style: none` when `<li>` is `display: grid`

The FrontierOutlookCard ranked list originally used `<ol>`/`<li>`
with `list-style: none` + `padding: 0`. On Chrome/Safari this still
rendered the browser numeric marker to the left of grid items —
`padding: 0` (physical) doesn't always reset `padding-inline-start`
(logical, default 40px on `<ol>`), and even when it does, marker
boxes interact unpredictably with grid items. Result: rows showed
"1. 1 Gemini" with the rank doubled. **Use `<div role="list">` /
`<div role="listitem">` for any "ranked list" with grid items** —
preserves semantics via aria, zero browser markers possible.

### Epoch ZIP cumulative timeseries — sparse trailing quarters + leading zeros

The `cumulative_by_chip_type.csv` ZIP entry has two real edge cases
that broke the FrontierOutlookCard sparklines until they were
specifically handled in `sparklineFor()`:

1. **Trailing quarters can be missing per owner.** As of 2026-Q1
   Epoch's release does not include xAI in the most recent quarter
   even though earlier quarters do. A naive `byOwner[owner] ?? 0`
   lookup collapses the latest point to the floor and produces a
   sparkline that spikes then crashes — visually broken. **Forward-
   fill missing values from the last known cumulative total** —
   cumulative chip totals don't go to zero between Epoch publishes.
   Real downward revisions where Epoch genuinely revises a number
   down (Meta 2025-Q4 → 2026-Q1: 2.30M → 1.95M) ARE preserved —
   only `undefined` rows are forward-filled.
2. **Leading-zero runs for late-founded labs.** xAI was founded
   2023, so a since-2022 series has 10 leading zero quarters before
   any chip acquisitions. Self-normalizing min/max compresses the
   real buildout into a squiggle in the rightmost ~15% of the chart.
   **Drop leading zeros via `findIndex(v => v > 0)`** so the line
   starts at the lab's first non-zero quarter and uses the full
   sparkline width.

Verified via `scripts/check-spark.ts` against the live ZIP — keep
that script around as a regression check if Epoch's data drifts again.

### Body text needs direct rgba, not the dim text-tertiary tokens

`tokens.css` defines `--color-text-tertiary: rgba(255,255,255,0.3)`
and `--color-text-quaternary: rgba(255,255,255,0.15)`. These are
intentionally dim — they're meant for de-emphasized metadata in
"data strip" patterns where you scan, not for body text where you
read. **For card body content (proof lines, captions, footnotes,
labels) use direct `rgba(255,255,255, 0.55–0.85)` values** — the
range that actually meets readable contrast on the dark surface.
The FrontierOutlookCard + Leaderboard + OwnershipSidePanel summary
+ OwnershipTable footer readability passes all replaced every
tertiary/quaternary use in those files with concrete rgba values
in this range and bumped the small text 1.5–3px. If a future
component reuses the dim tokens for body text, it'll fail the same
readability test.

### TruthModal lives in DataBanner, not Nav

The methodology / sources / overrides / uncertainty modal is
mounted **inside `DataBanner.tsx`** (not Nav), and the open-state
is local to DataBanner. The trigger is the `ⓘ ABOUT THIS DATA`
button in the DataBanner action row. This is intentional:

- DataBanner is the meta-data surface (status dot + last-updated
  + refresh + share). Methodology semantically belongs in the
  same row, not in the navigation bar.
- Single source of truth: one component owns both the trigger
  and the modal mount. No cross-component custom events or
  hoisted Zustand state required.
- DataBanner is `position: sticky; top: 48px; z-index: 900;` so
  the trigger travels with the user on scroll.

If you ever need to open the modal from another component, the
right move is to hoist the open-state to a `uiSlice` in the Zustand
store rather than re-introducing the trigger in Nav. Don't add a
duplicate trigger — the user previously asked us to consolidate
this to one place.

### DataBanner sticky requires darker background + backdrop-filter

When `DataBanner` became `position: sticky`, the original
translucent green tint (`rgba(0,255,135,0.04)`) made content
unreadable as it scrolled under. Fix: bumped to
`rgba(4,6,16,0.88)` + `backdrop-filter: var(--blur-nav)` so the
banner stays legible while preserving the green status accent
on the bottom border. Don't revert the background to the previous
translucent value — the page-content scroll-through will look
broken.

### Master ACCESS / OWNERSHIP terminal-tab toggle — both setters fire

In `RaceSection.tsx`, the `onAccessModeChange` handler always
calls `setScope('fleet')` followed by `setRaceMode(...)` — even
if the current scope is already `'fleet'`. This is intentional
because the slice's `setScope` setter auto-resets `raceMode` to
`'effective'` when leaving fleet, but here we're always *entering*
fleet, so the order is safe. Mobile (<768px) collapses to vertical
tabs with a 3px left-border accent (`.terminalTabActive` gets
`border-left: 3px solid #00d4ff`) instead of the bottom underline.

The toggle copy is editorial, not technical: titles `ACCESS` /
`OWNERSHIP` (mono caps, `--font-mono`, 15.5px, weight 700,
0.23em letter-spacing, with `01 /` and `02 /` numeric prefixes),
with a 13px sans-serif subtitle below ("Effective Fleet — who can
train today" / "Hardware — who controls the silicon for 2027+").
Don't shorten the subtitles — the user explicitly requested those
exact phrasings.

### LocalStorage preferences — read synchronously in useState init

Both `HardwareRealityCheckPanel` and `KnownLeasesCard` use
`localStorage` to persist their dismissed/collapsed state. The
read MUST happen synchronously inside the `useState` initializer
function, not in a `useEffect`:

```ts
const [dismissed, setDismissed] = useState<boolean>(() => readDismissed());
useEffect(() => { writeDismissed(dismissed); }, [dismissed]);
```

If you read inside `useEffect` instead, the panel renders OPEN
on first paint and then collapses after the effect runs — a
visible flash on every page load for users who previously
dismissed it. The synchronous initializer pattern is the only way
to avoid that flash. Same goes for any future card with persistent
collapse state.

Storage keys in use (don't repurpose):
- `hardwareRealityCheckDismissed_v1`
- `knownLeasesCardCollapsed_v1`
- `epochChipOwnersCache_v1` (the ZIP cache)

### OwnershipTable footer minimization — Truth modal is the canonical home

The OwnershipTable footer used to be a 4-paragraph wall of fine
print: the `† Owned H100e` marker explanation, the editorial
framing (`TOOLTIP_TEXT`), the `PCT_OWNED_FOOTNOTE` override
caveat, and a technical caveats paragraph (confidence bands /
projection logic / power-TDP note / owner→lab attribution).
Three of those four were unreadable at `font-size: var(--font-size-base)
+ color: var(--color-text-tertiary)` and the user explicitly
called it out as illegible.

Current state: the footer has just three readable lines —
`.footerLead` (the † marker explanation), `.footerNote` (the
editorial framing), and `.footerPointer` (a single line pointing
to `ⓘ ABOUT THIS DATA` in the DataBanner). The override caveat
and technical caveats now live ONLY in the Truth modal section 2.
Don't re-add inline copies — the user explicitly approved the
deletion as repetitive.

If you ever need to surface a new methodology caveat in OWNERSHIP
mode, add it to the Truth modal, not the table footer.

### LabBadge taxonomy is operator-vs-lab, not just operator

The `LabBadge` system in `OwnershipTable.tsx` has three categories:

- `pureOwner` (green) — Meta, xAI, Google, Alphabet
- `cloudProvider` (blue) — Microsoft, Oracle, Amazon
- `majorTenant` (gray) — OpenAI, Anthropic

The first two badge categories live on the operator name (top
line of the OWNER / LAB cell). The third lives on the **lab
sub-label** ("→ OpenAI", "→ Anthropic") because OpenAI/Anthropic
aren't operator rows. Rows whose mapped lab is a Major Tenant
also get `.rowMajorTenant` background tint.

The `.badge` base class resets `text-transform: none` because
its parent `.ownerLab` has `text-transform: uppercase` — without
the reset, the pill labels would be rendered as "PURE OWNER"
which looks shouty at 8px. Don't remove the reset.

---

## URL hash state (current, post-ownership-view)

| Param | Values | Default |
|-------|--------|---------|
| `metric` | `h100e`, `power` | `h100e` |
| `scope` | `tracked`, `fleet` | `tracked` |
| `mode` | `effective`, `ownership` | `effective` (only meaningful when scope=fleet; auto-resets otherwise) |
| `proj` | `current`, `2029` | `current` |
| `scatter` | `observed`, `projected` | `observed` |
| `velocity` | `absolute`, `velocity` | `absolute` |
| `lab` | lab name | `ALL` |

The `raceSlice.setScope` setter auto-resets `raceMode` → `'effective'`
when scope leaves `'fleet'`, so there's no reachable state where
`mode=ownership` with `scope=tracked`.

---

## Race section — state shape + component hierarchy

```
RaceSection (container)
├── intro paragraph
├── terminalTabs  ← MASTER TERMINAL-TAB TOGGLE [ 01/ ACCESS | 02/ OWNERSHIP ]
│     Flat mono-caps tabs, max-width 930px centered, no border-radius.
│     Active tab: cyan→blue 3px underline + faint cyan top-glow.
│     320ms cubic-bezier scaleX animation on the accent bar.
│     Both selections force scope='fleet'.
│     ACCESS    = scope='fleet', raceMode='effective'
│     OWNERSHIP = scope='fleet', raceMode='ownership'
├── StatCards
├── FrontierOutlookCard  ← only when scope === 'fleet'
│     "Who is positioned to lead frontier models in 2027+?"
│     collapsible · ranks 5 labs by % Owned · sparkline + caption
│     dated callout block surfacing breaking news (Anthropic-Google deal)
│     Lede paragraph + "Currently viewing" badge react to raceMode.
├── toggle row:   metric · scope · proj · velocity · ExportMenu
│     (the secondary modeRow that used to live here is GONE — the
│      master terminalTabs at the top has subsumed it)
├── if !isOwnership (ACCESS):
│     chartRow:
│       ├── RaceChart (Chart.js line/projection)
│       └── Leaderboard  ← sidebar with single OWNED progress bar
│                          (chip-mix bar removed — was visually
│                          redundant with OWNED for ~100% Nvidia labs)
├── if isOwnership (OWNERSHIP):
│     ├── modeHeadline  ← "● Hardware Ownership — Who controls the
│     │                    silicon (Epoch AI live data)"
│     │                    blue dot matches DataBanner status indicator
│     ├── OwnershipTable (full-width, replaces chartRow)
│     │     ↑ rowRefs + highlightedOwner effect — see click-through
│     │     ↑ LabBadge taxonomy (Pure Owner / Cloud Provider / Major Tenant)
│     │     ↑ .rowMajorTenant tint on rows whose mapped lab is OpenAI/Anthropic
│     │     ↑ slimmed 3-line footer (no inline override caveat — Truth modal has it)
│     └── KnownLeasesCard  ← OWNERSHIP-only collapsible card
│                            6 cloud→lab bullets + proprietary disclaimer
│                            localStorage: knownLeasesCardCollapsed_v1
├── snapshotRow (full width, both modes):
│     OwnershipSidePanel  ← "Who Owns the AI Chips?" 5-card strip
│       ↑ cards click-through to OwnershipTable + highlight row
│       ↑ readable 12.5px / 0.78 alpha summary footer
├── HardwareRealityCheckPanel (full width, both modes):
│     3-col editorial card — top 5 owners bars · sparkline · bullets+footnote
│     localStorage: hardwareRealityCheckDismissed_v1
├── ProjectionPanel (when proj === '2029')
└── ExportMenu lives in toggle row, items branch by mode:
      effective → exportRaceCSV/JSON/PNG
      ownership → exportOwnershipCSV/JSON
```

**Store slice** (`src/store/slices/raceSlice.ts`) owns:
`metric`, `scope`, `projMode`, `velocityMode`, `raceMode`, `hoveredLab`,
`highlightedOwner` + their setters. `setScope` auto-resets `raceMode`
when leaving fleet. `highlightedOwner` is set by OwnershipSidePanel
cards and consumed by OwnershipTable's effect (cleared after 1.8s).
The master terminal-tab toggle calls both `setScope('fleet')` and
`setRaceMode(...)` so URL hash sync (`?scope=fleet&mode=ownership`)
just works through the existing `useHashState` plumbing.

**App-shell sticky stack** (top → bottom, by z-index):
- `Nav` (`position: fixed`, `top: 0`, `z-index: 1000`, `height: 48px`)
- `DataBanner` (`position: sticky`, `top: 48px`, `z-index: 900`,
  `backdrop-filter`) — owns the `TruthModal` mount + `ⓘ ABOUT THIS DATA`
  trigger
- Section content scrolls under both

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
│   │   ├── models.ts             # MODEL_SPECS: 5 frontier models (GPT-5.4, Gemini 3.1 Pro,
│   │   │                         #   Claude Opus 4.6, Grok 4, Muse Spark) with 11 benchmark fields
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
| Anthropic | 1.8M | 9M | ~5× | Epoch satellite (~2M) + 3-cloud fleet incl. multi-GW Google/Broadcom TPU deal for 2027+ (~7M) |
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

See the authoritative table near the top of this file (under
"URL hash state (current, post-ownership-view)"). The `mode` param
was added with the Hardware Ownership view.

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
