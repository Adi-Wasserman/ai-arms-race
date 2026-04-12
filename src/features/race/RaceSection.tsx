import type { Chart as ChartJS } from 'chart.js';
import { useRef } from 'react';

import { ExportMenu, type ExportMenuItem } from '@/components/ui/ExportMenu';
import { SectionShell } from '@/components/ui/SectionShell';
import { Toggle } from '@/components/ui/Toggle';
import { useDashboard } from '@/store';
import type {
  MetricMode,
  ProjMode,
  ScopeMode,
} from '@/types';

import { ComputeBreakdownCard } from './ComputeBreakdownCard';
import { FrontierOutlookCard } from './FrontierOutlookCard';
import { KnownLeasesCard } from './KnownLeasesCard';
import { Leaderboard } from './Leaderboard';
import { OwnershipTable } from './OwnershipTable';
import { ProjectionPanel } from './ProjectionPanel';
import { RaceChart } from './RaceChart';
import styles from './RaceSection.module.css';
import { StatCards } from './StatCards';
import { useRaceExport } from './useRaceExport';

const METRIC_OPTS = [
  { value: 'h100e' as const, label: 'H100e' },
  { value: 'power' as const, label: 'POWER' },
];
const SCOPE_OPTS = [
  { value: 'fleet' as const, label: 'TOTAL CAPACITY' },
  { value: 'tracked' as const, label: 'SATELLITE ONLY' },
];
const PROJ_OPTS = [
  { value: 'current' as const, label: 'CURRENT' },
  { value: '2029' as const, label: '2029 PROJECTION ⚡' },
];

/**
 * Master view toggle — sits at the very top of the Race section,
 * directly under the page title / intro. Collapses the existing
 * scope=fleet + raceMode selectors into a single two-option pick:
 *
 *   ACCESS    = scope='fleet', raceMode='effective'
 *               ("who can train today" — total capacity w/ cloud-lease)
 *   OWNERSHIP = scope='fleet', raceMode='ownership'
 *               ("who controls the silicon for 2027+" — Epoch lab view)
 *
 * Clicking either option forces scope='fleet' so the ownership story
 * presupposes the cloud-lease-adjusted fleet (satellite-verified alone
 * excludes cloud-dependent labs entirely). The existing SCOPE toggle
 * in the secondary row still works for fine-grained control when the
 * user wants satellite-verified only.
 *
 * Keeps the URL hash at ?scope=fleet&mode=ownership (or mode=effective)
 * via the existing setScope / setRaceMode slice actions, which
 * useHashState already syncs to the hash.
 */
type AccessMode = 'access' | 'ownership';

const ACCESS_MODE_TOOLTIP =
  'Ownership = who bought the chips (Epoch live data, lab view). ' +
  'Access = total capacity available to train today.';

function RaceSectionInner(): JSX.Element {
  const metric = useDashboard((s) => s.metric);
  const scope = useDashboard((s) => s.scope);
  const projMode = useDashboard((s) => s.projMode);
  const raceMode = useDashboard((s) => s.raceMode);

  const setMetric = useDashboard((s) => s.setMetric);
  const setScope = useDashboard((s) => s.setScope);
  const setProjMode = useDashboard((s) => s.setProjMode);
  const setRaceMode = useDashboard((s) => s.setRaceMode);

  const chartRef = useRef<ChartJS<'line'> | null>(null);
  const {
    exportCSV,
    exportJSON,
    exportPNG,
    exportOwnershipCSV,
    exportOwnershipJSON,
  } = useRaceExport(chartRef);

  // Ownership is a fleet-only concept (satellite-verified alone
  // excludes cloud-dependent labs). The master toggle forces
  // scope=fleet on either selection so `isOwnership` is purely a
  // function of raceMode.
  const isOwnership = scope === 'fleet' && raceMode === 'ownership';

  // Derived "which pill is active" state for the master toggle.
  const accessMode: AccessMode = isOwnership ? 'ownership' : 'access';

  /**
   * Handler for the master ACCESS / OWNERSHIP toggle. Always sets
   * scope=fleet (the slice auto-resets raceMode when leaving fleet,
   * but here we're always entering fleet, so it's safe) and then
   * sets the target raceMode.
   */
  const onAccessModeChange = (next: AccessMode): void => {
    if (scope !== 'fleet') setScope('fleet');
    setRaceMode(next === 'ownership' ? 'ownership' : 'effective');
  };

  // Export menu items adapt to the active view.
  const exportItems: ExportMenuItem[] = isOwnership
    ? [
        {
          key: 'owner-csv',
          label: 'OWNERSHIP CSV',
          icon: '📊',
          onClick: exportOwnershipCSV,
        },
        {
          key: 'owner-json',
          label: 'OWNERSHIP JSON',
          icon: '📋',
          onClick: exportOwnershipJSON,
        },
        {
          key: 'png',
          label: 'PNG (chart view only)',
          icon: '📸',
          onClick: () => void 0,
          disabled: true,
        },
      ]
    : [
        { key: 'csv', label: 'CSV', icon: '📊', onClick: exportCSV },
        { key: 'json', label: 'JSON', icon: '📋', onClick: exportJSON },
        { key: 'png', label: 'PNG', icon: '📸', onClick: () => void exportPNG() },
      ];

  return (
    <>
      <div className={styles.insights}>
        <h2 className={styles.insightsTitle}>KEY INSIGHTS — APRIL 2026</h2>
        <div className={styles.insightsGrid}>
          <div>
            <strong>Anthropic leads compute today</strong> (2.0M H100e, 18%
            ahead) — but the gap is narrowing fast.
          </div>
          <div>
            <strong>Compute still rules</strong> — frontier training FLOPs grow
            ~5× per year and scaling laws keep delivering (see{' '}
            <a href="#models">models charts</a>).
          </div>
          <div>
            <strong>Ownership moat matters for 2027+</strong> — Gemini/Meta/xAI
            own their silicon; OpenAI/Anthropic are cloud tenants.
          </div>
          <div>
            <strong>No single model dominates</strong> — GPT-5.4, Gemini 3.1
            Pro, and Claude Opus 4.6 trade leads across benchmarks.
          </div>
        </div>
        <div className={styles.insightsMeta}>
          Satellite-verified · Epoch AI · 7 lead changes since 2024 · 3 more projected
        </div>
      </div>

      {/* ─── LIVE: Option 1 — Terminal Tabs ───
          Flat mono-caps tabs with an animated cyan→blue accent
          underline on the active segment. Wired to the real
          setScope + setRaceMode actions. */}
      <div
        className={styles.terminalTabs}
        role="radiogroup"
        aria-label="Race view: Access or Ownership"
      >
        <button
          type="button"
          role="radio"
          aria-checked={accessMode === 'access'}
          className={`${styles.terminalTab}${
            accessMode === 'access' ? ` ${styles.terminalTabActive}` : ''
          }`}
          onClick={() => onAccessModeChange('access')}
        >
          <span className={styles.terminalTabLabel}>
            <span className={styles.terminalTabPrefix}>01 /</span>
            ACCESS
          </span>
          <span className={styles.terminalTabSub}>
            Total Capacity — who can train today
          </span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={accessMode === 'ownership'}
          className={`${styles.terminalTab}${
            accessMode === 'ownership' ? ` ${styles.terminalTabActive}` : ''
          }`}
          onClick={() => onAccessModeChange('ownership')}
        >
          <span className={styles.terminalTabLabel}>
            <span className={styles.terminalTabPrefix}>02 /</span>
            OWNERSHIP
          </span>
          <span className={styles.terminalTabSub}>
            Hardware — who controls the silicon for 2027+
          </span>
        </button>
        <span
          className={styles.terminalTabsInfo}
          role="img"
          aria-label="info"
          title={ACCESS_MODE_TOOLTIP}
        >
          ⓘ
        </span>
      </div>

      <StatCards />

      {/* Frontier Leadership Outlook — only relevant when the fleet
          (cloud-lease adjusted) view is active, since the entire
          ownership question presupposes the +cloud-lease scope. */}
      {scope === 'fleet' && <FrontierOutlookCard />}

      <div className={styles.toggleRow}>
        <Toggle<MetricMode>
          value={metric}
          options={METRIC_OPTS}
          onChange={setMetric}
          ariaLabel="Metric"
        />
        <div className={styles.sep} />
        <Toggle<ScopeMode>
          value={scope}
          options={SCOPE_OPTS}
          onChange={setScope}
          ariaLabel="Scope"
        />
        <div className={styles.sep} />
        <Toggle<ProjMode>
          value={projMode}
          options={PROJ_OPTS}
          onChange={setProjMode}
          ariaLabel="Projection mode"
        />
        <div className={styles.spacer} />
        <ExportMenu items={exportItems} />
      </div>

      {/* Body — chart row OR lab-based ownership table.
          The secondary modeRow that used to live between the toggleRow
          and the body has been subsumed by the master ACCESS /
          OWNERSHIP toggle at the top of the section. */}
      {isOwnership ? (
        <>
          {/* Mode-specific headline — anchors the OwnershipTable
              with a one-line editorial framing so the user always
              knows which lens they're reading. Live blue dot
              matches the DataBanner status indicator. */}
          <h2 className={styles.modeHeadline}>
            <span className={styles.modeHeadlineDot} aria-hidden="true" />
            Hardware Ownership
            <span className={styles.modeHeadlineSub}>
              — Who controls the silicon (Epoch AI live data)
            </span>
          </h2>
          <OwnershipTable />
        </>
      ) : (
        <div className={styles.chartRow}>
          <RaceChart ref={chartRef} />
          <Leaderboard />
        </div>
      )}

      <ComputeBreakdownCard />
      <KnownLeasesCard />

      <ProjectionPanel />

      <div className={styles.fn}>
        DATA:{' '}
        <a href="https://epoch.ai/data/data-centers" target="_blank" rel="noreferrer">
          Epoch AI Frontier Data Centers
        </a>{' '}
        (CC BY 4.0, live CSV) ·{' '}
        <a
          href="https://epoch.ai/data/ai_chip_owners.zip"
          target="_blank"
          rel="noreferrer"
        >
          Epoch AI Chip Owners
        </a>{' '}
        (live ZIP, ownership view) · Satellite-Verified = satellite-confirmed sites
        · + Cloud-Lease Adj. = adds Anthropic's 3-cloud capacity + Gemini TPU fleet
        est. · 2029 Projection = power-constrained targets from Epoch satellite ramps
        + sourced cloud-lease fleet, ±20% uncertainty bands · Solid=observed ·
        Dashed=projected
      </div>

      {/* ─── Bridge to Models section ─── */}
      <div className={styles.bridge}>
        <strong>Why all this compute matters</strong>
        <br />
        Labs are pouring billions into these facilities because scaling laws
        (Kaplan 2020, Chinchilla 2022, Epoch AI) still hold: more training
        FLOPs → predictably better models <em>within each lab's lineage</em>.
        Scroll to the{' '}
        <a href="#models">Models section</a> for the visual proof — and to see
        the current three-way frontier contest.
      </div>
    </>
  );
}

export function RaceSection(): JSX.Element {
  return (
    <SectionShell
      id="race"
      title="THE AI ARMS RACE"
      subtitle="WHO HAS THE MOST COMPUTE & POWER TO WIN AI · POST-CHATGPT ERA (2024–)"
    >
      <RaceSectionInner />
    </SectionShell>
  );
}


