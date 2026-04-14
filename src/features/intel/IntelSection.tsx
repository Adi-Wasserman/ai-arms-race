import { FacilityCountLine } from '@/components/ui/FacilityCountLine';
import { LabLegend } from '@/components/ui/LabLegend';
import { Pill } from '@/components/ui/Pill';
import { SectionShell } from '@/components/ui/SectionShell';
import { Toggle } from '@/components/ui/Toggle';
import { useDashboard } from '@/store';
import type { StatusFilter } from '@/types';

import { FacilityDrawer } from './FacilityDrawer';
import { IntelTable } from './IntelTable';
import styles from './IntelSection.module.css';
import { SignalLegend } from './SignalLegend';
import { useIntelExport } from './useIntelExport';

const STATUS_OPTS = [
  { value: 'ALL' as const, label: 'ALL' },
  { value: 'OP' as const, label: 'LIVE' },
  { value: 'BLD' as const, label: 'BUILDING' },
  { value: 'PLN' as const, label: 'PLANNED' },
];

function IntelSectionInner(): JSX.Element {
  const statusFilter = useDashboard((s) => s.statusFilter);
  const setStatusFilter = useDashboard((s) => s.setStatusFilter);

  const { exportCSV } = useIntelExport();

  return (
    <>
      <div className={styles.intro}>
        Construction confidence is scored from{' '}
        <strong>satellite imagery, power ramp data, and observation count</strong>.
        Sites with visible cooling towers, completed roofs, and substation connections
        score highest. Timelines carry ±6 months of uncertainty; capacity estimates
        ±1.4×.
      </div>

      <LabLegend label="" />

      <FacilityCountLine />

      <div className={styles.controlRow}>
        <Toggle<StatusFilter>
          value={statusFilter}
          options={STATUS_OPTS}
          onChange={setStatusFilter}
          ariaLabel="Status filter"
        />
        <span className={styles.spacer} />
        <Pill variant="export" onClick={exportCSV}>
          📊 EXPORT CSV
        </Pill>
      </div>

      <SignalLegend />
      <IntelTable />
      <FacilityDrawer />

      <div className={styles.fn}>
        DATA:{' '}
        <a href="https://epoch.ai/data/data-centers" target="_blank" rel="noreferrer">
          Epoch AI Frontier Data Centers
        </a>{' '}
        · Confidence scoring derived from satellite observations, power ramp progress,
        and timeline density. Rows are clickable — open any facility for the satellite
        hero, observation badges, and full milestone timeline.
      </div>
    </>
  );
}

export function IntelSection(): JSX.Element {
  return (
    <SectionShell
      id="sites"
      title="INTEL"
      subtitle="SATELLITE-DERIVED CONSTRUCTION ANALYSIS · WHO'S BUILDING WHAT, AND HOW FAST"
      note="Satellite-verified facilities from Epoch AI. Lab assignment is editorial — hyperscaler sites share capacity across Azure/AWS/GCP tenants and internal products. Only Meta and xAI facilities are dedicated single-lab operations."
    >
      <IntelSectionInner />
    </SectionShell>
  );
}
