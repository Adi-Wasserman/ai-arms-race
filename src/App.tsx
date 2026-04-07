import { DataBanner } from '@/components/layout/DataBanner';
import { Nav } from '@/components/layout/Nav';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { IntelSection } from '@/features/intel/IntelSection';
import { MapSection } from '@/features/map/MapSection';
import { ModelsSection } from '@/features/models/ModelsSection';
import { RaceSection } from '@/features/race/RaceSection';
import { useEpochData } from '@/hooks/useEpochData';
import { useHashState } from '@/hooks/useHashState';

export default function App() {
  useEpochData();
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
          <RaceSection />
        </ErrorBoundary>

        <ErrorBoundary name="GEO MAP">
          <MapSection />
        </ErrorBoundary>

        <ErrorBoundary name="INTEL">
          <IntelSection />
        </ErrorBoundary>

        <ErrorBoundary name="MODELS">
          <ModelsSection />
        </ErrorBoundary>
      </main>
    </>
  );
}
