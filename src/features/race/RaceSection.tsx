import type { Chart as ChartJS } from 'chart.js';
import { useRef } from 'react';

import { ExportMenu, type ExportMenuItem } from '@/components/ui/ExportMenu';
import { OwnershipSidePanel } from '@/components/ui/OwnershipSidePanel';
import { SectionShell } from '@/components/ui/SectionShell';
import { Toggle } from '@/components/ui/Toggle';
import { useDashboard } from '@/store';
import type {
  MetricMode,
  ProjMode,
  RaceMode,
  ScopeMode,
  VelocityMode,
} from '@/types';

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
  { value: 'tracked' as const, label: 'SATELLITE-VERIFIED' },
  { value: 'fleet' as const, label: '+ CLOUD-LEASE ADJ. ⚠' },
];
const PROJ_OPTS = [
  { value: 'current' as const, label: 'CURRENT' },
  { value: '2029' as const, label: '2029 PROJECTION ⚡' },
];
const VELOCITY_OPTS = [
  { value: 'absolute' as const, label: 'ABSOLUTE' },
  { value: 'velocity' as const, label: 'GROWTH VELOCITY 📈' },
];

const MODE_OPTS = [
  { value: 'effective' as const, label: 'EFFECTIVE FLEET (ACCESS)' },
  { value: 'ownership' as const, label: 'HARDWARE OWNERSHIP' },
];

const MODE_TOOLTIP =
  'Ownership = who bought the chips. Access = who can use them (current view). ' +
  'Live from https://epoch.ai/data/ai_chip_owners.zip';

function RaceSectionInner(): JSX.Element {
  const metric = useDashboard((s) => s.metric);
  const scope = useDashboard((s) => s.scope);
  const projMode = useDashboard((s) => s.projMode);
  const velocityMode = useDashboard((s) => s.velocityMode);
  const raceMode = useDashboard((s) => s.raceMode);

  const setMetric = useDashboard((s) => s.setMetric);
  const setScope = useDashboard((s) => s.setScope);
  const setProjMode = useDashboard((s) => s.setProjMode);
  const setVelocityMode = useDashboard((s) => s.setVelocityMode);
  const setRaceMode = useDashboard((s) => s.setRaceMode);

  const chartRef = useRef<ChartJS<'line'> | null>(null);
  const {
    exportCSV,
    exportJSON,
    exportPNG,
    exportOwnershipCSV,
    exportOwnershipJSON,
  } = useRaceExport(chartRef);

  // Mode toggle is only visible when scope=fleet (ownership data is
  // a fleet-only concept). Toggling away from fleet automatically
  // resets raceMode → 'effective' in the slice setter.
  const showModeToggle = scope === 'fleet';
  const isOwnership = showModeToggle && raceMode === 'ownership';

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
      <div className={styles.intro}>
        Five labs are racing to build the largest AI data centers in history. The lead
        has changed hands multiple times since 2023 — and the gap between first and
        second place is narrowing. This chart tracks{' '}
        <strong>satellite-verified compute capacity</strong> across every major facility.
      </div>

      <StatCards />

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
        <div className={styles.sep} />
        <Toggle<VelocityMode>
          value={velocityMode}
          options={VELOCITY_OPTS}
          onChange={setVelocityMode}
          ariaLabel="Velocity mode"
        />
        <div className={styles.spacer} />
        <ExportMenu items={exportItems} />
      </div>

      {/* Mode toggle (only visible when scope=fleet) */}
      {showModeToggle && (
        <div className={styles.modeRow}>
          <Toggle<RaceMode>
            value={raceMode}
            options={MODE_OPTS}
            onChange={setRaceMode}
            ariaLabel="Race view mode"
          />
          <span
            className={styles.modeInfo}
            role="img"
            aria-label="info"
            title={MODE_TOOLTIP}
          >
            ⓘ
          </span>
        </div>
      )}

      {/* Body — chart row OR ownership table */}
      {isOwnership ? (
        <OwnershipTable />
      ) : (
        <div className={styles.chartRow}>
          <RaceChart ref={chartRef} />
          <Leaderboard />
        </div>
      )}

      {/* Hardware Ownership Snapshot — collapsible side panel.
          Mounted below the main row so it doesn't compete with the
          leaderboard for vertical space, but uses the live ZIP data
          via the shared `useEpochChipOwners` singleton. */}
      <div className={styles.snapshotRow}>
        <OwnershipSidePanel />
      </div>

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
    </>
  );
}

export function RaceSection(): JSX.Element {
  return (
    <SectionShell
      id="race"
      title="THE AI ARMS RACE"
      subtitle="WHO HAS THE MOST COMPUTE & POWER TO WIN AI · POST-CHATGPT ERA (2023–)"
    >
      <RaceSectionInner />
    </SectionShell>
  );
}
