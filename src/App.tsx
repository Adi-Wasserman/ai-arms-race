import { Suspense, lazy } from 'react';

import { DataBanner } from '@/components/layout/DataBanner';
import { Nav } from '@/components/layout/Nav';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useEpochChipOwners } from '@/hooks/useEpochChipOwners';
import { useEpochData } from '@/hooks/useEpochData';
import { useHashState } from '@/hooks/useHashState';

/**
 * Each section is lazy-loaded so its heavy dependencies (Chart.js for
 * Race/Models, Leaflet for GeoMap) land in their own chunks instead of
 * the main bundle. Data hooks stay eager — they fetch at mount anyway.
 */
const RaceSection = lazy(() =>
  import('@/features/race/RaceSection').then((m) => ({ default: m.RaceSection })),
);
const MapSection = lazy(() =>
  import('@/features/map/MapSection').then((m) => ({ default: m.MapSection })),
);
const IntelSection = lazy(() =>
  import('@/features/intel/IntelSection').then((m) => ({ default: m.IntelSection })),
);
const ModelsSection = lazy(() =>
  import('@/features/models/ModelsSection').then((m) => ({ default: m.ModelsSection })),
);

/**
 * Holds the section's anchor id while its chunk loads — useHashState
 * resolves deep links (#models etc.) via getElementById at mount, so the
 * id must exist on first paint. min-height keeps scroll targets sane.
 */
function SectionFallback({ id }: { id: string }): JSX.Element {
  return <section id={id} style={{ minHeight: '60vh' }} aria-busy="true" />;
}

export default function App() {
  useEpochData();
  // Bootstrap the chip-owners ZIP at app mount so the Race section's
  // ownership-mode toggle is instant when the user flips to it.
  useEpochChipOwners();
  useHashState();

  return (
    <>
      <Nav />
      <DataBanner />
      <main>
        {/**
         * Each section is wrapped in its own ErrorBoundary so a crash
         * in one feature (e.g. Leaflet, Chart.js, a bad data row) can't
         * black out the whole dashboard — the other sections keep
         * rendering and the user sees a scoped fallback message.
         */}
        <ErrorBoundary name="THE RACE">
          <Suspense fallback={<SectionFallback id="race" />}>
            <RaceSection />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary name="GEO MAP">
          <Suspense fallback={<SectionFallback id="geomap" />}>
            <MapSection />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary name="INTEL">
          <Suspense fallback={<SectionFallback id="sites" />}>
            <IntelSection />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary name="MODELS">
          <Suspense fallback={<SectionFallback id="models" />}>
            <ModelsSection />
          </Suspense>
        </ErrorBoundary>
      </main>
    </>
  );
}
