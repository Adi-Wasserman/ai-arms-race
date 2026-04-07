import { FacilityCountLine } from '@/components/ui/FacilityCountLine';
import { LabLegend } from '@/components/ui/LabLegend';
import { SectionShell } from '@/components/ui/SectionShell';
import { Toggle } from '@/components/ui/Toggle';
import { useDashboard } from '@/store';
import type { RegionKey, StatusFilter } from '@/types';

import { GeoMap } from './GeoMap';
import { MapPreview } from './MapPreview';
import styles from './MapSection.module.css';

const STATUS_OPTS = [
  { value: 'ALL' as const, label: 'ALL' },
  { value: 'OP' as const, label: '● LIVE' },
  { value: 'BLD' as const, label: '◐ BUILDING' },
  { value: 'PLN' as const, label: '○ PLANNED' },
];

interface RegionDef {
  value: RegionKey;
  label: string;
}

const REGION_BUTTONS: readonly RegionDef[] = [
  { value: 'us', label: '🇺🇸 US' },
  { value: 'uae', label: '🇦🇪 UAE' },
];

function MapSectionInner(): JSX.Element {
  // Filters live in intelSlice and are shared with the Intel section so
  // both views stay in sync (matches the legacy single-filter model).
  const statusFilter = useDashboard((s) => s.statusFilter);
  const setStatusFilter = useDashboard((s) => s.setStatusFilter);

  const region = useDashboard((s) => s.region);
  const setRegion = useDashboard((s) => s.setRegion);

  return (
    <>
      <div className={styles.intro}>
        Nearly all frontier AI infrastructure is concentrated in the{' '}
        <strong>central and southern United States</strong> — driven by cheap land,
        available power, and tax incentives. Abu Dhabi is the only major international
        site, anchoring OpenAI's Stargate expansion.
      </div>

      <LabLegend label="LAB" />

      <FacilityCountLine />

      <div className={styles.controlRow}>
        <Toggle<StatusFilter>
          value={statusFilter}
          options={STATUS_OPTS}
          onChange={setStatusFilter}
          ariaLabel="Status filter"
        />
        <div className={styles.regionGroup}>
          {REGION_BUTTONS.map((r, i) => (
            <span key={r.value} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {i > 0 && <span className={styles.regionArrow}>→</span>}
              <button
                type="button"
                className={`${styles.regionButton}${region === r.value ? ` ${styles.active}` : ''}`}
                onClick={() => setRegion(r.value)}
              >
                {r.label}
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className={styles.mapRow}>
        <div>
          <GeoMap />
        </div>
        <MapPreview />
      </div>

      <div className={styles.fn}>
        DATA:{' '}
        <a href="https://epoch.ai/data/data-centers" target="_blank" rel="noreferrer">
          Epoch AI Frontier Data Centers
        </a>{' '}
        (facility locations + status) · Satellite tiles:{' '}
        <a
          href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9"
          target="_blank"
          rel="noreferrer"
        >
          ESRI World Imagery
        </a>{' '}
        · Labels:{' '}
        <a href="https://carto.com/basemaps" target="_blank" rel="noreferrer">
          CARTO Dark Labels
        </a>{' '}
        · Map:{' '}
        <a href="https://leafletjs.com" target="_blank" rel="noreferrer">
          Leaflet 1.9
        </a>
      </div>
    </>
  );
}

export function MapSection(): JSX.Element {
  return (
    <SectionShell
      id="geomap"
      title="GEO MAP"
      subtitle="WHERE AI INFRASTRUCTURE IS BEING BUILT · HOVER OR CLICK ANY PIN"
    >
      <MapSectionInner />
    </SectionShell>
  );
}
